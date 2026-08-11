import "server-only";

// Rotating user agents for anti-bot evasion
const USER_AGENTS = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0",
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
];

function randomUA(): string {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)]!;
}

function randomDelay(min = 500, max = 2000): Promise<void> {
  const ms = Math.floor(Math.random() * (max - min) + min);
  return new Promise(res => setTimeout(res, ms));
}

export interface FetchOptions {
  timeout?: number;
  delay?: boolean;
  retries?: number;
  headers?: Record<string, string>;
}

export interface FetchResult {
  html: string;
  url: string;
  statusCode: number;
  headers: Record<string, string>;
  durationMs: number;
  error?: string;
}

export async function fetchPage(url: string, options: FetchOptions = {}): Promise<FetchResult> {
  const { timeout = 15000, delay = true, retries = 2, headers: extraHeaders = {} } = options;
  if (delay) await randomDelay(300, 1200);

  const start = Date.now();
  let lastError = "";

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeout);

      const res = await fetch(url, {
        signal: controller.signal,
        headers: {
          "User-Agent": randomUA(),
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.5",
          "Accept-Encoding": "gzip, deflate, br",
          "Cache-Control": "no-cache",
          "Pragma": "no-cache",
          "Sec-Fetch-Dest": "document",
          "Sec-Fetch-Mode": "navigate",
          "Sec-Fetch-Site": "none",
          "Upgrade-Insecure-Requests": "1",
          ...extraHeaders,
        },
        redirect: "follow",
      });

      clearTimeout(timer);
      const html = await res.text();
      const resHeaders: Record<string, string> = {};
      res.headers.forEach((v, k) => { resHeaders[k] = v; });

      return {
        html,
        url: res.url,
        statusCode: res.status,
        headers: resHeaders,
        durationMs: Date.now() - start,
      };
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
      if (attempt < retries) await randomDelay(1000, 3000);
    }
  }

  return { html: "", url, statusCode: 0, headers: {}, durationMs: Date.now() - start, error: lastError };
}

export function detectAntiBot(html: string, statusCode: number): string | null {
  if (statusCode === 403 || statusCode === 429) return `HTTP ${statusCode} — rate limited or blocked`;
  if (statusCode === 503) return "HTTP 503 — possible Cloudflare protection";
  if (html.includes("cf-browser-verification") || html.includes("cf_chl_prog")) return "Cloudflare challenge detected";
  if (html.includes("captcha") && html.includes("solve")) return "CAPTCHA detected";
  if (html.includes("robot") && html.includes("check") && html.length < 5000) return "Bot check page detected";
  return null;
}

export function isProductUrl(url: string): boolean {
  const u = url.toLowerCase();
  const productPatterns = [
    /\/p\//, /\/product\//, /\/item\//, /\/dp\//, /\/itm\//, /\/ip\//,
    /\/products\//, /\/pd\//, /\/listing\//, /\/buy\//,
    /-p-\d+/, /\?pid=/, /\?sku=/, /product_id/, /item_id/,
  ];
  const excludePatterns = [/\/category\//, /\/search/, /\/account/, /\/cart/, /\/checkout/, /sitemap/];
  if (excludePatterns.some(p => p.test(u))) return false;
  return productPatterns.some(p => p.test(u));
}
