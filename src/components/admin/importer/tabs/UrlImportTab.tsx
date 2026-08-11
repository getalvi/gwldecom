"use client";

import { useState } from "react";
import { Link2, Sparkles } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ConfigPanel } from "../ConfigPanel";
import type { ImportConfig } from "@/lib/importer/interfaces";

const EXAMPLE_URLS = [
  "https://www.daraz.com.bd/products/...",
  "https://www.amazon.com/dp/...",
  "https://www.aliexpress.com/item/...",
  "https://store.myshopify.com/products/...",
];

interface Props {
  config: ImportConfig;
  onConfigChange: (c: ImportConfig) => void;
  onJobCreated: (jobId: string) => void;
}

export function UrlImportTab({ config, onConfigChange, onJobCreated }: Props) {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleImport() {
    if (!url.trim()) { setError("Please enter a URL"); return; }
    let parsed: URL;
    try { parsed = new URL(url.trim()); } catch { setError("Invalid URL — must start with http:// or https://"); return; }

    setLoading(true); setError(null);
    const res = await fetch("/api/importer/jobs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "url", urls: [parsed.href], config }),
    });
    const data = await res.json();
    setLoading(false);

    if (!res.ok) { setError(data.error ?? "Import failed"); return; }
    onJobCreated(data.jobId);
    setUrl("");
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border bg-background p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Link2 size={18} className="text-primary" />
          <h2 className="font-semibold">Single URL Import</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          Paste any product page URL. Our engine will automatically detect the platform and extract all product data.
        </p>

        <div className="flex gap-2">
          <Input
            value={url}
            onChange={e => setUrl(e.target.value)}
            placeholder="https://www.amazon.com/dp/B08N5WRWNW"
            onKeyDown={e => e.key === "Enter" && handleImport()}
            icon={<Link2 size={14} />}
          />
          <Button onClick={handleImport} loading={loading} disabled={!url.trim()} className="shrink-0">
            <Sparkles size={15} /> Import
          </Button>
        </div>

        {error && <p className="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">{error}</p>}

        <div>
          <p className="text-xs font-medium text-muted-foreground mb-2">Supported platforms:</p>
          <div className="flex flex-wrap gap-2">
            {["Amazon", "AliExpress", "Daraz", "eBay", "Shopify", "WooCommerce", "Alibaba", "Etsy", "Walmart", "BestBuy", "Temu", "Any site"].map(p => (
              <span key={p} className="text-xs bg-secondary px-2 py-0.5 rounded-full">{p}</span>
            ))}
          </div>
        </div>

        <div>
          <p className="text-xs font-medium text-muted-foreground mb-2">Example URLs:</p>
          <div className="space-y-1">
            {EXAMPLE_URLS.map(u => (
              <button key={u} onClick={() => setUrl(u)} className="block text-xs text-muted-foreground hover:text-primary transition-colors font-mono truncate w-full text-left">{u}</button>
            ))}
          </div>
        </div>
      </div>
      <ConfigPanel config={config} onChange={onConfigChange} />
    </div>
  );
}
