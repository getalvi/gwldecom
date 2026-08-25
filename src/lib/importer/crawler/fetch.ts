import "server-only";
const USER_AGENTS = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0",
];
function randomUA() { return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)]!; }
function randomDelay(min = 300, max = 1200) { return new Promise<void>(res => setTimeout(res, Math.floor(Math.random() * (max - min) + min))); }

export interface FetchResult { html: string; url: string; statusCode: number; headers: Record<string, string>; durationMs: number; error?: string; }

export async function fetchPage(url: string, options: { timeout?: number; delay?: boolean; retries?: number } = {}): Promise<FetchResult> {
  const { timeout = 15000, delay = true, retries = 2 } = options;
  if (delay) await randomDelay();
  const start = Date.now();
  let lastError = "";
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), timeout);
      const res = await fetch(url, {
        signal: ctrl.signal,
        headers: { "User-Agent": randomUA(), "Accept": "text/html,*/*;q=0.8", "Accept-Language": "en-US,en;q=0.5", "Cache-Control": "no-cache" },
        redirect: "follow",
      });
      clearTimeout(timer);
      const html = await res.text();
      const headers: Record<string, string> = {};
      res.headers.forEach((v, k) => { headers[k] = v; });
      return { html, url: res.url, statusCode: res.status, headers, durationMs: Date.now() - start };
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
      if (attempt < retries) await randomDelay(1000, 2000);
    }
  }
  return { html: "", url, statusCode: 0, headers: {}, durationMs: Date.now() - start, error: lastError };
}

export function detectAntiBot(html: string, statusCode: number): string | null {
  if (statusCode === 403) return "HTTP 403 — blocked";
  if (statusCode === 429) return "HTTP 429 — rate limited";
  if (html.includes("cf-browser-verification") || html.includes("cf_chl_prog")) return "Cloudflare challenge detected";
  if (html.includes("captcha") && html.length < 10000) return "CAPTCHA page detected";
  return null;
}

export function isProductUrl(url: string): boolean {
  const u = url.toLowerCase();
  const ok = [/\/p\//, /\/product\//, /\/item\//, /\/dp\//, /\/itm\//, /\/ip\//, /\/products\//, /\/pd\//, /\/listing\//].some(p => p.test(u));
  const exclude = [/\/category\//, /\/search/, /\/account/, /\/cart/, /\/checkout/, /sitemap/, /\?s=/, /\/tag\//].some(p => p.test(u));
  return ok && !exclude;
}
