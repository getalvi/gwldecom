"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { formatBDT, formatDate } from "@/lib/utils";

interface Coupon { id: string; code: string; type: "percentage" | "fixed"; value: number; min_order_amount: number | null; max_uses: number | null; used_count: number; expires_at: string | null; active: boolean; created_at: string }

export function CouponManager({ initialCoupons }: { initialCoupons: Coupon[] }) {
  const router = useRouter();
  const [form, setForm] = useState({ code: "", type: "percentage" as "percentage" | "fixed", value: "", min_order_amount: "", max_uses: "", expires_at: "" });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const set = (k: keyof typeof form, v: string) => setForm(p => ({ ...p, [k]: v }));

  async function addCoupon() {
    if (!form.code || !form.value) { setError("Code and value required"); return; }
    setSaving(true); setError(null);
    const res = await fetch("/api/coupons", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: form.code.toUpperCase(), type: form.type, value: Number(form.value), min_order_amount: form.min_order_amount ? Number(form.min_order_amount) : null, max_uses: form.max_uses ? Number(form.max_uses) : null, expires_at: form.expires_at || null }),
    });
    setSaving(false);
    if (!res.ok) { const d = await res.json(); setError(d.error ?? "Failed"); return; }
    setForm({ code: "", type: "percentage", value: "", min_order_amount: "", max_uses: "", expires_at: "" });
    router.refresh();
  }

  async function deleteCoupon(id: string) {
    if (!confirm("Delete this coupon?")) return;
    await fetch(`/api/coupons/${id}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="rounded-xl border border-border bg-background p-5 space-y-4">
        <h2 className="font-semibold">Create Coupon</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <Input label="Coupon Code" value={form.code} onChange={e => set("code", e.target.value.toUpperCase())} placeholder="SAVE20" />
          <Select label="Discount Type" value={form.type} onChange={e => set("type", e.target.value as "percentage" | "fixed")}>
            <option value="percentage">Percentage (%)</option>
            <option value="fixed">Fixed Amount (৳)</option>
          </Select>
          <Input label={form.type === "percentage" ? "Discount %" : "Discount Amount (৳)"} type="number" value={form.value} onChange={e => set("value", e.target.value)} placeholder="20" />
          <Input label="Min Order Amount (optional)" type="number" value={form.min_order_amount} onChange={e => set("min_order_amount", e.target.value)} placeholder="500" />
          <Input label="Max Uses (optional)" type="number" value={form.max_uses} onChange={e => set("max_uses", e.target.value)} placeholder="100" />
          <Input label="Expires At (optional)" type="datetime-local" value={form.expires_at} onChange={e => set("expires_at", e.target.value)} />
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button onClick={addCoupon} loading={saving}><Plus size={16} /> Create Coupon</Button>
      </div>

      <div className="rounded-xl border border-border bg-background overflow-hidden">
        <table className="w-full text-sm">
          <thead className="border-b border-border bg-secondary/30">
            <tr>{["Code", "Discount", "Min Order", "Used", "Expires", "Status", ""].map(h => <th key={h} className="px-4 py-3 text-left font-semibold text-muted-foreground">{h}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-border">
            {initialCoupons.map(c => (
              <tr key={c.id} className="hover:bg-secondary/20">
                <td className="px-4 py-3 font-mono font-semibold">{c.code}</td>
                <td className="px-4 py-3">{c.type === "percentage" ? `${c.value}%` : formatBDT(c.value)}</td>
                <td className="px-4 py-3 text-muted-foreground">{c.min_order_amount ? formatBDT(c.min_order_amount) : "—"}</td>
                <td className="px-4 py-3">{c.used_count}{c.max_uses ? `/${c.max_uses}` : ""}</td>
                <td className="px-4 py-3 text-muted-foreground text-xs">{c.expires_at ? formatDate(c.expires_at) : "Never"}</td>
                <td className="px-4 py-3"><Badge variant={c.active ? "success" : "outline"}>{c.active ? "Active" : "Inactive"}</Badge></td>
                <td className="px-4 py-3">
                  <Button variant="destructive" size="icon-sm" onClick={() => deleteCoupon(c.id)}><Trash2 size={14} /></Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {initialCoupons.length === 0 && <p className="py-8 text-center text-sm text-muted-foreground">No coupons yet</p>}
      </div>
    </div>
  );
}
