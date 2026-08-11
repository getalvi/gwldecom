"use client";

import { useState } from "react";
import { Globe, AlertCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ConfigPanel } from "../ConfigPanel";
import type { ImportConfig } from "@/lib/importer/interfaces";

interface Props { config: ImportConfig; onConfigChange: (c: ImportConfig) => void; onJobCreated: (id: string) => void }

export function CrawlTab({ config, onConfigChange, onJobCreated }: Props) {
  const [url, setUrl] = useState("");
  const [maxPages, setMaxPages] = useState(10);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCrawl() {
    if (!url.trim()) { setError("Please enter a category URL"); return; }
    try { new URL(url.trim()); } catch { setError("Invalid URL"); return; }
    setLoading(true); setError(null);
    const res = await fetch("/api/importer/jobs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "crawl", categoryUrl: url.trim(), config: { ...config, maxPages } }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) { setError(data.error ?? "Crawl failed"); return; }
    onJobCreated(data.jobId);
    setUrl("");
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border bg-background p-5 space-y-4">
        <div className="flex items-center gap-2"><Globe size={18} className="text-primary" /><h2 className="font-semibold">Crawl Category Page</h2></div>
        <p className="text-sm text-muted-foreground">
          Paste a category or collection URL. The crawler will discover all product links, follow pagination, and import every product.
        </p>

        <div className="rounded-lg bg-warning/5 border border-warning/20 p-3 flex gap-2">
          <AlertCircle size={15} className="text-warning shrink-0 mt-0.5" />
          <p className="text-xs text-muted-foreground">
            Crawling respects rate limits with automatic delays. Some sites block crawlers — if blocked, use URL or Bulk import instead.
          </p>
        </div>

        <Input label="Category / Collection URL" value={url} onChange={e => setUrl(e.target.value)}
          placeholder="https://www.daraz.com.bd/electronics-phones-tablets/" icon={<Globe size={14} />} />

        <div>
          <label className="mb-1.5 block text-sm font-medium">Max Pages to Crawl</label>
          <input type="range" min={1} max={50} value={maxPages} onChange={e => setMaxPages(Number(e.target.value))} className="w-full" />
          <div className="flex justify-between text-xs text-muted-foreground mt-1"><span>1</span><span className="font-medium text-foreground">{maxPages} pages</span><span>50</span></div>
        </div>

        <div className="grid grid-cols-2 gap-3 text-sm">
          {["Auto-detect pagination", "Infinite scroll support", "Handles lazy loading", "Follows redirects", "Rotating user agents", "Anti-bot detection"].map(f => (
            <div key={f} className="flex items-center gap-2 text-muted-foreground"><span className="text-success">✓</span> {f}</div>
          ))}
        </div>

        {error && <p className="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">{error}</p>}
        <Button onClick={handleCrawl} loading={loading}><Globe size={15} /> Start Crawling</Button>
      </div>
      <ConfigPanel config={config} onChange={onConfigChange} />
    </div>
  );
}
