"use client";
import { useEffect, useState } from "react";
import { TrendingUp, CheckCircle, XCircle, Clock, Globe } from "lucide-react";
interface Stats { total:number;completed:number;failed:number;running:number;importedItems:number }
export function ImportStats() {
  const [stats, setStats] = useState<Stats|null>(null);
  useEffect(() => { fetch("/api/importer/jobs").then(r=>r.json()).then(d => { const jobs=d.jobs??[]; setStats({total:jobs.length,completed:jobs.filter((j:{status:string})=>j.status==="completed").length,failed:jobs.filter((j:{status:string})=>j.status==="failed").length,running:jobs.filter((j:{status:string})=>j.status==="running").length,importedItems:jobs.reduce((s:number,j:{progress_done:number})=>s+j.progress_done,0)}); }).catch(()=>{}); }, []);
  const cards = [{label:"Total Jobs",value:stats?.total??0,icon:Globe,color:"text-blue-600",bg:"bg-blue-50"},{label:"Completed",value:stats?.completed??0,icon:CheckCircle,color:"text-success",bg:"bg-success/10"},{label:"Failed",value:stats?.failed??0,icon:XCircle,color:"text-destructive",bg:"bg-destructive/10"},{label:"Running",value:stats?.running??0,icon:Clock,color:"text-warning",bg:"bg-warning/10"},{label:"Imported",value:stats?.importedItems??0,icon:TrendingUp,color:"text-purple-600",bg:"bg-purple-50"}];
  return <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">{cards.map(({label,value,icon:Icon,color,bg}) => <div key={label} className="rounded-xl border border-border bg-background p-4"><div className={`inline-flex rounded-lg p-2 ${bg} mb-2`}><Icon size={16} className={color}/></div><p className="text-xl font-bold">{value}</p><p className="text-xs text-muted-foreground">{label}</p></div>)}</div>;
}
