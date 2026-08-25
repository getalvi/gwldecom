"use client";
import { useState, useRef } from "react";
import { List, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfigPanel } from "../ConfigPanel";
import type { ImportConfig } from "@/lib/importer/interfaces";
interface Props { config:ImportConfig;onConfigChange:(c:ImportConfig)=>void;onJobCreated:(id:string)=>void }
export function BulkImportTab({ config, onConfigChange, onJobCreated }: Props) {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string|null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  function handleFile(file: File) { const r=new FileReader(); r.onload=e=>setText(String(e.target?.result??"")); r.readAsText(file); }
  function extractUrls(raw: string): string[] {
    try { const j=JSON.parse(raw); if (Array.isArray(j)) return j.map(String).filter(u=>u.startsWith("http")); } catch {}
    return raw.split(/[\n,\r\t ]+/).map(l=>l.trim()).filter(l=>l.startsWith("http")).slice(0,200);
  }
  async function handleImport() {
    const urls = extractUrls(text); if (!urls.length) { setError("No valid URLs found"); return; }
    setLoading(true); setError(null);
    const res = await fetch("/api/importer/jobs",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({type:"bulk",urls,config})});
    const data = await res.json(); setLoading(false);
    if (!res.ok) { setError(data.error??"Failed"); return; }
    onJobCreated(data.jobId); setText("");
  }
  const urls = extractUrls(text);
  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border bg-background p-5 space-y-4">
        <div className="flex items-center gap-2"><List size={18} className="text-primary"/><h2 className="font-semibold">Bulk Import</h2></div>
        <p className="text-sm text-muted-foreground">Paste multiple URLs (one per line), or upload CSV/TXT/JSON. Max 200 URLs per job.</p>
        <div className="border-2 border-dashed border-border rounded-lg p-4 text-center cursor-pointer hover:border-primary transition-colors" onClick={()=>fileRef.current?.click()} onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();const f=e.dataTransfer.files[0];if(f)handleFile(f);}}>
          <Upload size={24} className="mx-auto text-muted-foreground mb-2"/><p className="text-sm font-medium">Drop file or click to upload</p><p className="text-xs text-muted-foreground">CSV, TXT, JSON supported</p>
          <input ref={fileRef} type="file" accept=".csv,.txt,.json" className="hidden" onChange={e=>{const f=e.target.files?.[0];if(f)handleFile(f);}}/>
        </div>
        <div className="relative"><textarea className="w-full rounded-lg border border-border bg-secondary/20 p-3 text-xs font-mono h-40 resize-none focus:outline-none focus:ring-2 focus:ring-primary" placeholder={"https://amazon.com/dp/B08N5WRWNW\nhttps://aliexpress.com/item/123456.html"} value={text} onChange={e=>setText(e.target.value)}/>{text&&<button onClick={()=>setText("")} className="absolute top-2 right-2 p-1 hover:bg-secondary rounded"><X size={12}/></button>}</div>
        {text && <div className="flex items-center gap-2 text-sm"><span className="text-success font-medium">{urls.length} valid URLs detected</span>{urls.length>200&&<span className="text-warning text-xs">(first 200 will be processed)</span>}</div>}
        {error && <p className="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">{error}</p>}
        <Button onClick={handleImport} loading={loading} disabled={!urls.length}>Import {urls.length>0?`${Math.min(urls.length,200)} Products`:""}</Button>
      </div>
      <ConfigPanel config={config} onChange={onConfigChange}/>
    </div>
  );
}
