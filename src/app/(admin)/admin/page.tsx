import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";

export const dynamic = "force-dynamic"; // admin data must always be fresh

export default async function AdminDashboard() {
  const supabase = await createClient();

  const [{ count: productCount }, { count: pendingReview }, { count: draftQueue }] = await Promise.all([
    supabase.from("products").select("*", { count: "exact", head: true }).eq("status", "published"),
    supabase.from("products").select("*", { count: "exact", head: true }).eq("status", "pending_review"),
    supabase.from("ai_import_drafts").select("*", { count: "exact", head: true }).eq("status", "pending_review"),
  ]);

  const stats = [
    { label: "Published Products", value: productCount ?? 0 },
    { label: "Pending Review", value: pendingReview ?? 0 },
    { label: "AI Drafts Waiting", value: draftQueue ?? 0 },
  ];

  return (
    <div>
      <h1 className="mb-6 text-xl font-bold">Dashboard</h1>
      <div className="grid grid-cols-3 gap-4">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardContent className="py-6">
              <p className="text-sm text-muted-foreground">{s.label}</p>
              <p className="text-3xl font-bold">{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
