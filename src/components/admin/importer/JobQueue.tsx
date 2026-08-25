"use client";
import { useEffect, useState, useCallback } from "react";
import { RefreshCw, Play, Pause, XCircle, ChevronRight } from "lucide-react";
import { formatDate, getStatusColor } from "@/lib/utils";
interface Job { id:string;type:string;status:string;progress_total:number;progress_done:number;progress_failed:number;created_at:string;completed_at:string|null;error_message:string|null }
interface Props { onSelectJob:(id:string)=>void;selectedJobId?:string }
export function JobQueue({ onSelectJob, selectedJobId }: Props) {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const refresh = useCallback(() => { fetch("/api/importer/jobs").then(r=>r.json()).then(d=>{setJobs(d.jobs??[]);setLoading(false);}).catch(()=>setLoading(false)); }, []);
  useEffect(() => { refresh(); const t = setInterval(refresh, 5000); return () => clearInterval(t); }, [refresh]);
  async function action(jobId: string, act: string) { await fetch(`/api/importer/jobs/${jobId}`,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:act})}); refresh(); }
  if (loading) return <div className="space-y-2">{[1,2,3].map(i=><div key={i} className="h-14 shimmer rounded-lg"/>)}</div>;
  if (!jobs.length) return <p className="text-sm text-muted-foreground text-center py-8">No import jobs yet</p>;
  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center mb-3"><p className="text-sm font-medium">{jobs.length} jobs</p><button onClick={refresh} className="text-muted-foreground hover:text-foreground"><RefreshCw size={14}/></button></div>
      {jobs.map(job => {
        const pct = job.progress_total>0 ? Math.round((job.progress_done/job.progress_total)*100) : 0;
        const isSelected = selectedJobId===job.id;
        return (
          <div key={job.id} onClick={()=>onSelectJob(job.id)} className={`rounded-lg border p-3 cursor-pointer transition-all ${isSelected?"border-primary bg-primary/5":"border-border hover:border-primary/40 bg-background"}`}>
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium capitalize ${getStatusColor(job.status)}`}>{job.status}</span>
                <span className="text-xs font-medium capitalize truncate">{job.type} — {job.progress_total} URLs</span>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {job.status==="running" && <button onClick={e=>{e.stopPropagation();action(job.id,"pause");}} className="p-1 hover:bg-secondary rounded"><Pause size={12}/></button>}
                {job.status==="paused" && <button onClick={e=>{e.stopPropagation();action(job.id,"resume");}} className="p-1 hover:bg-secondary rounded"><Play size={12}/></button>}
                {["running","paused"].includes(job.status) && <button onClick={e=>{e.stopPropagation();action(job.id,"cancel");}} className="p-1 hover:bg-secondary rounded text-destructive"><XCircle size={12}/></button>}
                <ChevronRight size={12} className="text-muted-foreground"/>
              </div>
            </div>
            {job.progress_total>0 && <div className="mt-2"><div className="flex justify-between text-xs text-muted-foreground mb-1"><span>{job.progress_done} done · {job.progress_failed} failed</span><span>{pct}%</span></div><div className="h-1 bg-secondary rounded-full overflow-hidden"><div className="h-full bg-primary rounded-full transition-all" style={{width:`${pct}%`}}/></div></div>}
            <p className="text-xs text-muted-foreground mt-1">{formatDate(job.created_at)}</p>
            {job.error_message && <p className="text-xs text-destructive mt-1 truncate">{job.error_message}</p>}
          </div>
        );
      })}
    </div>
  );
}
