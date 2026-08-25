"use client";
import { useState } from "react";
import { Link2, Sparkles } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ConfigPanel } from "../ConfigPanel";
import type { ImportConfig } from "@/lib/importer/interfaces";
interface Props { config:ImportConfig;onConfigChange:(c:ImportConfig)=>void;onJobCreated:(id:string)=>void }
export function UrlImportTab({ config, onConfigChange, onJobCreated }: Props) {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string|null>(null);
  async function handleImport() {
    if (!url.trim()) { setError("Please enter a URL"); return; }
    try { new URL(url.trim()); } catch { setError("Invalid URL — must start with http:// or https://"); return; }
    setLoading(true); setError(null);
    const res = await fetch("/api/importer/jobs",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({type:"url",urls:[url.trim()],config})});
    const data = await res.json(); setLoading(false);
    if (!res.ok) { setError(data.error??"Import failed"); return; }
    onJobCreated(data.jobId); setUrl("");
  }
  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border bg-background p-5 space-y-4">
        <div className="flex items-center gap-2"><Link2 size={18} className="text-primary"/><h2 className="font-semibold">Single URL Import</h2></div>
        <p className="text-sm text-muted-foreground">Paste any product page URL. The engine auto-detects the platform and extracts all data.</p>
        <div className="flex gap-2">
          <Input value={url} onChange={e=>setUrl(e.target.value)} placeholder="https://www.amazon.com/dp/B08N5WRWNW" onKeyDown={e=>e.key==="Enter"&&handleImport()} icon={<Link2 size={14}/>}/>
          <Button onClick={handleImport} loading={loading} disabled={!url.trim()} className="shrink-0"><Sparkles size={15}/>Import</Button>
        </div>
        {error && <p className="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">{error}</p>}
        <div><p className="text-xs font-medium text-muted-foreground mb-2">Supported platforms:</p><div className="flex flex-wrap gap-2">{["Amazon","AliExpress","Daraz","eBay","Shopify","WooCommerce","Alibaba","Etsy","Walmart","BestBuy","Temu","Any site"].map(p=><span key={p} className="text-xs bg-secondary px-2 py-0.5 rounded-full">{p}</span>)}</div></div>
      </div>
      <ConfigPanel config={config} onChange={onConfigChange}/>
    </div>
  );
}
