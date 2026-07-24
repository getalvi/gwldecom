import { requireRole } from "@/lib/rbac";
import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

export default async function AdminCustomersPage() {
  await requireRole(["admin", "staff"]);
  const supabase = await createClient();
  const { data: customers } = await supabase
    .from("profiles")
    .select("id, full_name, email, phone, role, created_at")
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-4 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold">Customers</h1>
        <p className="text-sm text-muted-foreground">{customers?.length ?? 0} registered users</p>
      </div>
      <div className="rounded-xl border border-border bg-background overflow-hidden">
        <table className="w-full text-sm">
          <thead className="border-b border-border bg-secondary/30">
            <tr>
              {["Name", "Email", "Phone", "Role", "Joined"].map(h => (
                <th key={h} className="px-4 py-3 text-left font-semibold text-muted-foreground">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {(customers ?? []).map(c => (
              <tr key={c.id} className="hover:bg-secondary/20 transition-colors">
                <td className="px-4 py-3 font-medium">{c.full_name ?? "—"}</td>
                <td className="px-4 py-3 text-muted-foreground">{c.email ?? "—"}</td>
                <td className="px-4 py-3 text-muted-foreground">{c.phone ?? "—"}</td>
                <td className="px-4 py-3">
                  <Badge variant={c.role === "admin" ? "destructive" : c.role === "staff" ? "warning" : "default"}>
                    {c.role}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-muted-foreground text-xs">{formatDate(c.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {(customers ?? []).length === 0 && <p className="py-8 text-center text-sm text-muted-foreground">No customers yet</p>}
      </div>
    </div>
  );
}
