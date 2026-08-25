"use client";
import { useState } from "react";
import Image from "next/image";
import { CheckCircle, XCircle, AlertTriangle, Edit3, Package, Tag, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { formatBDT, getStatusColor } from "@/lib/utils";
import type { ExtractedProduct } from "@/lib/importer/interfaces";
interface Props { itemId:string;product:ExtractedProduct;onApproved?:(id:string)=>void;onRejected?:()=>void }
export function ProductPreview({ itemId, product, onApproved, onRejected }: Props) {
  const [editing, setEditing] = useState(false);
  const [overrides, setOverrides] = useState({title:product.title,price:product.price,stock:product.stock??0,sku:product.sku??"",description:product.description??""});
  const [autoPublish, setAutoPublish] = useState(false);
  const [loading, setLoading] = useState<"approve"|"reject"|null>(null);
  const [error, setError] = useState<string|null>(null);
  const [specsOpen, setSpecsOpen] = useState(false);
  const set = <K extends keyof typeof overrides>(k: K, v: typeof overrides[K]) => setOverrides(p => ({...p,[k]:v}));
  const confColor = product.confidence>=0.85?"text-success":product.confidence>=0.6?"text-warning":"text-destructive";
  async function approve() {
    setLoading("approve"); setError(null);
    const res = await fetch(`/api/importer/items/${itemId}/approve`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({overrides,config:{autoPublish}})});
    const data = await res.json(); setLoading(null);
    if (!res.ok) { setError(data.error??"Failed to import"); return; }
    onApproved?.(data.productId);
  }
  async function reject() {
    setLoading("reject");
    await fetch(`/api/importer/items/${itemId}/reject`,{method:"POST"});
    setLoading(null); onRejected?.();
  }
  return (
    <div className="rounded-xl border border-border bg-background overflow-hidden">
      <div className="flex items-center justify-between bg-secondary/30 px-4 py-3 border-b border-border">
        <div className="flex items-center gap-3"><span className={`text-sm font-bold ${confColor}`}>{Math.round(product.confidence*100)}% confidence</span><Badge variant="outline" className="text-xs capitalize">{product.extractionMethod}</Badge></div>
        <button onClick={() => setEditing(e=>!e)} className="flex items-center gap-1 text-xs text-primary hover:underline"><Edit3 size={12}/>{editing?"Done":"Edit"}</button>
      </div>
      <div className="p-4 grid gap-4 md:grid-cols-3">
        <div className="space-y-2">
          {product.images.length>0 ? <>
            <div className="relative aspect-square rounded-lg overflow-hidden bg-secondary border border-border"><Image src={product.images[0]!} alt={product.title} fill className="object-cover" sizes="200px" onError={e=>{(e.target as HTMLImageElement).style.display="none"}}/></div>
            {product.images.length>1 && <div className="flex gap-1 overflow-x-auto">{product.images.slice(1,5).map((img,i) => <div key={i} className="relative h-10 w-10 shrink-0 rounded overflow-hidden border border-border"><Image src={img} alt="" fill className="object-cover" sizes="40px" onError={e=>{(e.target as HTMLImageElement).style.display="none"}}/></div>)}{product.images.length>5 && <span className="text-xs text-muted-foreground self-center ml-1">+{product.images.length-5}</span>}</div>}
          </> : <div className="aspect-square rounded-lg bg-secondary border border-border flex items-center justify-center"><Package size={32} className="text-muted-foreground"/></div>}
          <a href={product.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline block truncate">View source →</a>
        </div>
        <div className="md:col-span-2 space-y-3">
          {editing ? <Input label="Title" value={overrides.title} onChange={e => set("title",e.target.value)}/> : <h3 className="font-semibold leading-snug">{product.title}</h3>}
          {product.brand && <p className="text-xs font-medium text-primary">{product.brand}</p>}
          <div className="flex items-end gap-3">
            {editing ? <><Input label="Price (৳)" type="number" value={overrides.price} onChange={e => set("price",Number(e.target.value))}/></> : <span className="text-xl font-bold text-primary">{formatBDT(product.price)}</span>}
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div><span className="text-muted-foreground">Stock: </span>{editing?<input type="number" value={overrides.stock} onChange={e=>set("stock",Number(e.target.value))} className="w-16 border border-border rounded px-1 text-sm ml-1"/>:<span>{product.stock??"?"}</span>}</div>
            <div><span className="text-muted-foreground">SKU: </span>{editing?<input value={overrides.sku} onChange={e=>set("sku",e.target.value)} className="border border-border rounded px-1 text-sm ml-1 w-24"/>:<span className="font-mono text-xs">{product.sku||"—"}</span>}</div>
            {product.category && <div><Tag size={12} className="inline text-muted-foreground mr-1"/><span className="text-xs">{product.category}</span></div>}
          </div>
          {product.tags.length>0 && <div className="flex flex-wrap gap-1">{product.tags.map(t=><span key={t} className="text-xs bg-secondary rounded-full px-2 py-0.5">{t}</span>)}</div>}
          {Object.keys(product.specifications).length>0 && <div><button onClick={()=>setSpecsOpen(o=>!o)} className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground">Specs ({Object.keys(product.specifications).length}) {specsOpen?<ChevronUp size={12}/>:<ChevronDown size={12}/>}</button>{specsOpen && <table className="w-full text-xs mt-2"><tbody>{Object.entries(product.specifications).slice(0,20).map(([k,v])=><tr key={k} className="border-b border-border"><td className="py-1 pr-2 text-muted-foreground font-medium w-2/5 capitalize">{k}</td><td className="py-1">{v}</td></tr>)}</tbody></table>}</div>}
          {product.warnings.length>0 && <div className="space-y-1">{product.warnings.map((w,i)=><div key={i} className="flex items-start gap-1.5 text-xs text-warning bg-warning/5 rounded px-2 py-1.5"><AlertTriangle size={12} className="shrink-0 mt-0.5"/>{w}</div>)}</div>}
        </div>
      </div>
      <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-secondary/20">
        <label className="flex items-center gap-2 text-xs cursor-pointer"><input type="checkbox" checked={autoPublish} onChange={e=>setAutoPublish(e.target.checked)}/>Auto-publish after import</label>
        <div className="flex gap-2">
          {error && <p className="text-xs text-destructive">{error}</p>}
          <Button size="sm" variant="outline" onClick={reject} loading={loading==="reject"} disabled={!!loading}><XCircle size={14}/>Reject</Button>
          <Button size="sm" onClick={approve} loading={loading==="approve"} disabled={!!loading}><CheckCircle size={14}/>Import Product</Button>
        </div>
      </div>
    </div>
  );
}
