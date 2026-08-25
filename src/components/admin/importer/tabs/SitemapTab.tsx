"use client";
import { useState } from "react";
import { FileText } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ConfigPanel } from "../ConfigPanel";
import type { ImportConfig } from "@/lib/importer/interfaces";
interface Props { config:ImportConfig;onConfigChange:(c:ImportConfig)=>void;onJobCreated:(id:string)=>void }
export function SitemapTab({ config, onConfigChange, onJobCreated }: Props) {
  const [url, setUrl] = useState("");
  const [maxUrls, setMaxUrls] = useState(50);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string|null>(null);
  async function handleImport() {
    if (!url.trim()) { setError("Please enter a sitemap URL"); return; }
    setLoading(true); setError(null);
    const res = await fetch("/api/importer/jobs",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({type:"sitemap",sitemapUrl:url.trim(),config:{...config,maxPages:maxUrls}})});
    const data = await res.json(); setLoading(false);
    if (!res.ok) { setError(data.error??"Failed"); return; }
    onJobCreated(data.jobId); setUrl("");
  }
  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border bg-background p-5 space-y-4">
        <div className="flex items-center gap-2"><FileText size={18} className="text-primary"/><h2 className="font-semibold">Sitemap Import</h2></div>
        <p className="text-sm text-muted-foreground">Paste a sitemap.xml URL. The system identifies product pages and imports them. Supports sitemap indexes.</p>
        <Input label="Sitemap URL" value={url} onChange={e=>setUrl(e.target.value)} placeholder="https://example.com/sitemap.xml" icon={<FileText size={14}/>}/>
        <div><label className="mb-1.5 block text-sm font-medium">Max Products to Import</label><input type="range" min={10} max={500} step={10} value={maxUrls} onChange={e=>setMaxUrls(Number(e.target.value))} className="w-full"/><div className="flex justify-between text-xs text-muted-foreground mt-1"><span>10</span><span className="font-medium text-foreground">{maxUrls} products</span><span>500</span></div></div>
        <div className="text-sm text-muted-foreground space-y-1"><p><span className="text-success">✓</span> Supports sitemap indexes</p><p><span className="text-success">✓</span> Auto-detects product URLs</p><p><span className="text-success">✓</span> Skips non-product pages</p></div>
        {error && <p className="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">{error}</p>}
        <Button onClick={handleImport} loading={loading}><FileText size={15}/>Parse & Import</Button>
      </div>
      <ConfigPanel config={config} onChange={onConfigChange}/>
    </div>
  );
}
