import Link from "next/link";
import { requireRole } from "@/lib/rbac";
import { createClient } from "@/lib/supabase/server";
import { formatBDT } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { DeleteProductButton } from "@/components/admin/DeleteProductButton";

export const dynamic = "force-dynamic";

export default async function AdminProductsPage() {
  const user = await requireRole(["admin", "staff"]);
  const supabase = await createClient();
  const { data: products } = await supabase
    .from("products")
    .select("id, title, price, status, source, created_at")
    .order("created_at", { ascending: false })
    .limit(100);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-bold">Products</h1>
        <Link href="/admin/products/new" className="text-sm text-primary underline">
          + Add Product
        </Link>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left text-muted-foreground">
            <th className="py-2">Title</th>
            <th>Price</th>
            <th>Status</th>
            <th>Source</th>
            <th className="text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {(products ?? []).map((p) => (
            <tr key={p.id} className="border-b border-border">
              <td className="py-2">{p.title}</td>
              <td>{formatBDT(p.price)}</td>
              <td>
                <Badge>{p.status}</Badge>
              </td>
              <td className="text-muted-foreground">{p.source}</td>
              <td className="flex justify-end gap-3 py-2">
                <Link href={`/admin/products/${p.id}/edit`} className="text-primary underline">
                  Edit
                </Link>
                {user.role === "admin" && <DeleteProductButton productId={p.id} />}
              </td>
            </tr>
          ))}
          {(products ?? []).length === 0 && (
            <tr>
              <td colSpan={5} className="py-8 text-center text-muted-foreground">
                No products yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
