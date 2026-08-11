"use client";

import { useState } from "react";
import { Search, ExternalLink } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ConfigPanel } from "../ConfigPanel";
import type { ImportConfig } from "@/lib/importer/interfaces";

interface Props { config: ImportConfig; onConfigChange: (c: ImportConfig) => void; onJobCreated: (id: string) => void }

const SEARCH_PLATFORMS = [
  { id: "daraz", label: "Daraz BD", urlFn: (q: string) => `https://www.daraz.com.bd/catalog/?q=${encodeURIComponent(q)}` },
  { id: "aliexpress", label: "AliExpress", urlFn: (q: string) => `https://www.aliexpress.com/wholesale?SearchText=${encodeURIComponent(q)}` },
];

export function SearchImportTab({ config, onConfigChange, onJobCreated }: Props) {
  const [query, setQuery] = useState("");
  const [platform, setPlatform] = useState("daraz");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedPlatform = SEARCH_PLATFORMS.find(p => p.id === platform)!;
  const searchUrl = query ? selectedPlatform.urlFn(query) : "";

  async function handleSearch() {
    if (!query.trim()) { setError("Enter a search query"); return; }
    setLoading(true); setError(null);
    const res = await fetch("/api/importer/jobs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "crawl", categoryUrl: searchUrl, config: { ...config, maxPages: 3 } }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) { setError(data.error ?? "Failed"); return; }
    onJobCreated(data.jobId);
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border bg-background p-5 space-y-4">
        <div className="flex items-center gap-2"><Search size={18} className="text-primary" /><h2 className="font-semibold">Search & Import</h2></div>
        <p className="text-sm text-muted-foreground">Search a product name on a supported platform and import results automatically.</p>

        <div className="flex gap-2">
          {SEARCH_PLATFORMS.map(p => (
            <button key={p.id} onClick={() => setPlatform(p.id)}
              className={`flex-1 rounded-lg border py-2 text-sm font-medium transition-all ${platform === p.id ? "border-primary bg-primary/10 text-primary" : "border-border hover:border-primary/40"}`}>
              {p.label}
            </button>
          ))}
        </div>

        <Input label="Search Query" value={query} onChange={e => setQuery(e.target.value)}
          placeholder='e.g. "Samsung Galaxy A55" or "Nike Air Max"' icon={<Search size={14} />}
          onKeyDown={e => e.key === "Enter" && handleSearch()} />

        {searchUrl && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground bg-secondary rounded-lg p-2">
            <span className="truncate flex-1">{searchUrl}</span>
            <a href={searchUrl} target="_blank" rel="noopener noreferrer" className="shrink-0 hover:text-primary"><ExternalLink size={12} /></a>
          </div>
        )}

        <div className="bg-secondary/50 rounded-lg p-3 text-xs text-muted-foreground space-y-1">
          <p className="font-medium text-foreground">How it works:</p>
          <p>1. We crawl the search results page for the query above</p>
          <p>2. Product links are discovered automatically</p>
          <p>3. Each product is extracted and staged for your review</p>
        </div>

        {error && <p className="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">{error}</p>}
        <Button onClick={handleSearch} loading={loading} disabled={!query.trim()}><Search size={15} /> Search & Import</Button>
      </div>
      <ConfigPanel config={config} onChange={onConfigChange} />
    </div>
  );
}
