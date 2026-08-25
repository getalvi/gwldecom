"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
const STATUS_FLOW = [{status:"confirmed",label:"Confirm",variant:"success" as const},{status:"packed",label:"Mark Packed",variant:"secondary" as const},{status:"shipped",label:"Mark Shipped",variant:"secondary" as const},{status:"delivered",label:"Mark Delivered",variant:"success" as const},{status:"cancelled",label:"Cancel",variant:"destructive" as const},{status:"refunded",label:"Refund",variant:"outline" as const}] as const;
type OrderStatus = "pending"|"confirmed"|"packed"|"shipped"|"delivered"|"cancelled"|"refunded";
const ALLOWED: Record<OrderStatus,OrderStatus[]> = {pending:["confirmed","cancelled"],confirmed:["packed","cancelled"],packed:["shipped","cancelled"],shipped:["delivered"],delivered:["refunded"],cancelled:[],refunded:[]};
export function OrderStatusButtons({ orderId, currentStatus }: { orderId: string; currentStatus: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState<string|null>(null);
  const [error, setError] = useState<string|null>(null);
  const allowed = ALLOWED[currentStatus as OrderStatus] ?? [];
  const buttons = STATUS_FLOW.filter(b => allowed.includes(b.status as OrderStatus));
  if (!buttons.length) return <p className="text-xs text-muted-foreground">No further actions available</p>;
  async function update(status: string) {
    setLoading(status); setError(null);
    const res = await fetch(`/api/orders/${orderId}`,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({status})});
    setLoading(null);
    if (res.ok) router.refresh();
    else { const d = await res.json().catch(()=>({})); setError(d.error ?? "Failed"); }
  }
  return <div className="flex flex-wrap gap-2">{buttons.map(({status,label,variant}) => <Button key={status} size="sm" variant={variant} loading={loading===status} onClick={() => update(status)} disabled={!!loading}>{label}</Button>)}{error && <p className="text-xs text-destructive mt-1 w-full">{error}</p>}</div>;
}
