import "server-only";
import { fetchPage, isProductUrl } from "../crawler/fetch";

export async function parseSitemap(sitemapUrl: string, maxUrls = 500): Promise<string[]> {
  const result = await fetchPage(sitemapUrl, { delay: false });
  if (result.error || !result.html) return [];
  if (result.html.includes("<sitemapindex")) {
    const urls: string[] = [];
    const matches = [...result.html.matchAll(/<loc>\s*([^<]+)\s*<\/loc>/gi)];
    for (const m of matches.slice(0, 10)) {
      const sub = m[1]?.trim(); if (!sub) continue;
      const subUrls = await parseSingleSitemap(sub, maxUrls - urls.length);
      urls.push(...subUrls);
      if (urls.length >= maxUrls) break;
    }
    return urls;
  }
  return parseSingleSitemap(sitemapUrl, maxUrls, result.html);
}

async function parseSingleSitemap(url: string, maxUrls: number, html?: string): Promise<string[]> {
  const content = html ?? (await fetchPage(url, { delay: false })).html;
  const urls: string[] = [];
  for (const m of [...content.matchAll(/<loc>\s*([^<]+)\s*<\/loc>/gi)]) {
    const u = m[1]?.trim(); if (u && isProductUrl(u)) urls.push(u);
    if (urls.length >= maxUrls) break;
  }
  return urls;
}

export async function discoverProductUrls(categoryUrl: string, maxPages = 5): Promise<string[]> {
  const urls = new Set<string>();
  const visited = new Set<string>();
  const queue = [categoryUrl];
  while (queue.length > 0 && visited.size < maxPages) {
    const current = queue.shift()!;
    if (visited.has(current)) continue;
    visited.add(current);
    const result = await fetchPage(current, { delay: true });
    if (result.error || !result.html) continue;
    const base = new URL(categoryUrl).origin;
    for (const m of [...result.html.matchAll(/href=["']([^"']+)["']/gi)]) {
      let href = m[1]?.trim() ?? "";
      if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("javascript:")) continue;
      if (href.startsWith("/")) href = base + href;
      if (!href.startsWith("http")) continue;
      try { new URL(href); } catch { continue; }
      if (isProductUrl(href) && !urls.has(href)) urls.add(href);
      else if (!visited.has(href) && href.includes(new URL(categoryUrl).hostname) && (href.includes("page=") || href.match(/\/page\/\d+/))) queue.push(href);
    }
  }
  return [...urls];
}
