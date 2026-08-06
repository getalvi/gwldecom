import dns from "node:dns/promises";
import net from "node:net";

const MAX_HTML_BYTES = 4 * 1024 * 1024; // 4MB — plenty for a product page, keeps memory bounded
const FETCH_TIMEOUT_MS = 10_000;
const USER_AGENTS = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15",
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
];

function pickUserAgent(): string {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

/**
 * Blocks loopback, private, and link-local ranges so an admin can't be
 * tricked into having the server fetch internal infrastructure
 * (SSRF via a "product URL" pointing at 169.254.169.254, localhost, etc).
 */
function isBlockedIp(ip: string): boolean {
  if (net.isIP(ip) === 4) {
    const [a, b] = ip.split(".").map(Number);
    if (a === 127) return true; // loopback
    if (a === 10) return true; // private
    if (a === 169 && b === 254) return true; // link-local / cloud metadata
    if (a === 172 && b >= 16 && b <= 31) return true; // private
    if (a === 192 && b === 168) return true; // private
    if (a === 0) return true;
    return false;
  }
  if (net.isIP(ip) === 6) {
    const lower = ip.toLowerCase();
    if (lower === "::1") return true; // loopback
    if (lower.startsWith("fe80")) return true; // link-local
    if (lower.startsWith("fc") || lower.startsWith("fd")) return true; // unique local
    return false;
  }
  return true; // couldn't parse — fail closed
}

export class BlockedUrlError extends Error {
  constructor(message: string) {
    super(`BLOCKED_URL: ${message}`);
    this.name = "BlockedUrlError";
  }
}

export interface FetchedPage {
  html: string;
  finalUrl: string;
  status: number;
}

/**
 * Validates and fetches a product-page URL. Throws BlockedUrlError for
 * anything that looks like SSRF; throws a plain Error for network/HTTP
 * failures (caller decides how to surface those).
 */
export async function safeFetchHtml(rawUrl: string): Promise<FetchedPage> {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new BlockedUrlError("not a valid URL");
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new BlockedUrlError("only http/https URLs are supported");
  }
  if (url.hostname === "localhost" || url.hostname.endsWith(".local")) {
    throw new BlockedUrlError("local hostnames are not allowed");
  }

  // Resolve DNS ourselves so we can reject private/loopback targets even
  // when the hostname isn't a literal IP (rebinding-style SSRF).
  let addresses: string[];
  try {
    const looked = await dns.lookup(url.hostname, { all: true });
    addresses = looked.map((a) => a.address);
  } catch {
    throw new BlockedUrlError("could not resolve hostname");
  }
  if (addresses.length === 0 || addresses.some(isBlockedIp)) {
    throw new BlockedUrlError("URL resolves to a disallowed address");
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const res = await fetch(url.toString(), {
      signal: controller.signal,
      redirect: "follow",
      headers: {
        "User-Agent": pickUserAgent(),
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
      },
    });

    if (!res.ok) {
      throw new Error(`Upstream returned HTTP ${res.status}`);
    }

    const contentType = res.headers.get("content-type") ?? "";
    if (!contentType.includes("html") && !contentType.includes("xml") && contentType !== "") {
      throw new Error(`Unsupported content-type: ${contentType}`);
    }

    // Stream with a hard byte cap instead of res.text() so a malicious/huge
    // page can't blow up function memory.
    const reader = res.body?.getReader();
    if (!reader) throw new Error("Response had no body");

    const chunks: Uint8Array[] = [];
    let total = 0;
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) {
        total += value.byteLength;
        if (total > MAX_HTML_BYTES) {
          await reader.cancel();
          throw new Error("Page exceeded max size (4MB)");
        }
        chunks.push(value);
      }
    }

    const html = Buffer.concat(chunks.map((c) => Buffer.from(c))).toString("utf-8");
    return { html, finalUrl: res.url || url.toString(), status: res.status };
  } finally {
    clearTimeout(timeout);
  }
}
