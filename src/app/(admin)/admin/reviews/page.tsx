import { requireRole } from "@/lib/rbac";
import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

interface ReviewRow {
  id: string; rating: number; title: string | null; body: string | null; created_at: string;
  profiles: { full_name: string | null; email: string | null } | null;
  products: { title: string } | null;
}

export default async function AdminReviewsPage() {
  await requireRole(["admin", "staff"]);
  const supabase = await createClient();
  const { data: rawReviews } = await supabase
    .from("reviews")
    .select("id, rating, title, body, created_at, profiles!user_id(full_name, email), products!product_id(title)")
    .order("created_at", { ascending: false });

  const reviews: ReviewRow[] = (rawReviews ?? []).map(r => ({
    ...r,
    profiles: Array.isArray(r.profiles) ? (r.profiles[0] ?? null) : (r.profiles as ReviewRow["profiles"]),
    products: Array.isArray(r.products) ? (r.products[0] ?? null) : (r.products as ReviewRow["products"]),
  }));

  return (
    <div className="space-y-4 animate-fade-in">
      <h1 className="text-2xl font-bold">Reviews</h1>
      <div className="space-y-3">
        {reviews.map(r => (
          <div key={r.id} className="rounded-xl border border-border bg-background p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <div className="flex">{[1,2,3,4,5].map(s => <span key={s} className={s <= r.rating ? "text-warning" : "text-muted-foreground"}>★</span>)}</div>
                  {r.title && <span className="text-sm font-medium">{r.title}</span>}
                </div>
                {r.body && <p className="text-sm text-muted-foreground">{r.body}</p>}
                <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                  <span>{r.profiles?.full_name ?? r.profiles?.email ?? "User"}</span>
                  <span>on</span>
                  <span className="font-medium text-foreground">{r.products?.title ?? "Product"}</span>
                  <span>{formatDate(r.created_at)}</span>
                </div>
              </div>
            </div>
          </div>
        ))}
        {reviews.length === 0 && <p className="py-8 text-center text-sm text-muted-foreground">No reviews yet</p>}
      </div>
    </div>
  );
}
