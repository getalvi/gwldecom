"use client";
import { useEffect, useState, useCallback } from "react";
import { RefreshCw, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProductPreview } from "./ProductPreview";
import { getStatusColor } from "@/lib/utils";
import type { ExtractedProduct } from "@/lib/importer/interfaces";
interface ImportItem { id:string;url:string;status:string;extraction_method:string|null;confidence:number|null;warnings:string[]|null;error_message:string|null;extracted:ExtractedProduct|null;duration_ms:number|null;resulting_product_id:string|null }
interface Job { id:string;type:string;status:string;progress_total:number;progress_done:number;progress_failed:number }
interface Props { jobId:string }
export function JobDetail({ jobId }: Props) {
  const [job, setJob] = useState<Job|null>(null);
  const [items, setItems] = useState<ImportItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [processing, setProcessing] = useState(false);
  const refresh = useCallback(() => { fetch(`/api/importer/jobs/${jobId}`).then(r=>r.json()).then(d=>{setJob(d.job);setItems(d.items??[]);setLoading(false);}).catch(()=>setLoading(false)); }, [jobId]);
  useEffect(() => { setLoading(true); refresh(); }, [refresh]);
  async function processMore() { setProcessing(true); await fetch(`/api/importer/jobs/${jobId}`,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"process"})}); setProcessing(false); refresh(); }
  function exportCsv() {
    const rows = [["URL","Title","Price","Brand","Category","Status","Confidence","Method"]];
    for (const item of items) { const p=item.extracted; rows.push([item.url,p?.title??"",String(p?.price??""),p?.brand??"",p?.category??"",item.status,String(item.confidence??""),item.extraction_method??""]); }
    const csv = rows.map(r=>r.map(v=>`"${String(v).replace(/"/g,'""')}"`).join(",")).join("\n");
    const blob = new Blob([csv],{type:"text/csv"}); const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href=url; a.download=`import-${jobId.slice(0,8)}.csv`; a.click(); URL.revokeObjectURL(url);
  }
  if (loading) return <div className="space-y-3">{[1,2,3].map(i=><div key={i} className="h-32 shimmer rounded-xl"/>)}</div>;
  if (!job) return <p className="text-sm text-muted-foreground">Job not found</p>;
  const filtered = filterStatus==="all" ? items : items.filter(i=>i.status===filterStatus);
  const pendingCount = items.filter(i=>i.status==="pending").length;
  const statusCounts = items.reduce((acc: Record<string,number>,i)=>{acc[i.status]=(acc[i.status]??0)+1;return acc;},{});
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div><h3 className="font-semibold capitalize">{job.type} Import</h3><p className="text-xs text-muted-foreground">{job.progress_done}/{job.progress_total} processed · {job.progress_failed} failed</p></div>
        <div className="flex gap-2"><button onClick={refresh} className="p-2 hover:bg-secondary rounded-md"><RefreshCw size={14}/></button><button onClick={exportCsv} className="p-2 hover:bg-secondary rounded-md"><Download size={14}/></button></div>
      </div>
      {job.progress_total>0 && <div><div className="h-2 bg-secondary rounded-full overflow-hidden"><div className="h-full bg-primary rounded-full transition-all" style={{width:`${Math.round((job.progress_done/job.progress_total)*100)}%`}}/></div><p className="text-xs text-muted-foreground mt-1">{Math.round((job.progress_done/job.progress_total)*100)}% complete</p></div>}
      {pendingCount>0 && job.status!=="cancelled" && <Button onClick={processMore} loading={processing} variant="outline" size="sm" className="w-full">Process Next Batch ({pendingCount} remaining)</Button>}
      <div className="flex flex-wrap gap-2">
        <button onClick={()=>setFilterStatus("all")} className={`text-xs px-3 py-1 rounded-full border transition-colors ${filterStatus==="all"?"bg-primary text-white border-primary":"border-border hover:border-primary"}`}>All ({items.length})</button>
        {Object.entries(statusCounts).map(([status,count])=><button key={status} onClick={()=>setFilterStatus(status)} className={`text-xs px-3 py-1 rounded-full border transition-colors capitalize ${filterStatus===status?"bg-primary text-white border-primary":"border-border hover:border-primary"}`}>{status} ({count})</button>)}
      </div>
      <div className="space-y-4">
        {filtered.map(item => (
          <div key={item.id}>
            {item.status==="preview"&&item.extracted ? <ProductPreview itemId={item.id} product={item.extracted} onApproved={()=>refresh()} onRejected={()=>refresh()}/>
            : <div className={`rounded-xl border p-3 ${item.status==="failed"?"border-destructive/40 bg-destructive/5":item.status==="imported"?"border-success/40 bg-success/5":"border-border bg-background"}`}>
                <div className="flex items-center justify-between gap-2"><p className="text-xs font-mono truncate flex-1 text-muted-foreground">{item.url}</p><span className={`shrink-0 inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium capitalize ${getStatusColor(item.status)}`}>{item.status}</span></div>
                {item.error_message && <p className="text-xs text-destructive mt-1">{item.error_message}</p>}
                {item.resulting_product_id && <a href={`/admin/products/${item.resulting_product_id}/edit`} className="text-xs text-primary hover:underline mt-1 block">View product →</a>}
              </div>}
          </div>
        ))}
        {filtered.length===0 && <p className="text-sm text-center text-muted-foreground py-6">No items matching this filter</p>}
      </div>
    </div>
  );
}
