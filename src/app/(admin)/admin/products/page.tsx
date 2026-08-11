import Link from "next/link";
import Image from "next/image";
import { Plus } from "lucide-react";
import { requireRole } from "@/lib/rbac";
import { createClient } from "@/lib/supabase/server";
import { formatBDT, getStatusColor } from "@/lib/utils";
import { DeleteProductButton } from "@/components/admin/DeleteProductButton";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default async function AdminProductsPage() {
  const user = await requireRole(["admin", "staff"]);
  const supabase = await createClient();
  const { data: products } = await supabase
    .from("products")
    .select("id, title, price, stock_quantity, status, source, created_at, product_images(url, position)")
    .order("created_at", { ascending: false })
    .limit(100);

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Products</h1>
          <p className="text-sm text-muted-foreground">{products?.length ?? 0} products</p>
        </div>
        <Link href="/admin/products/new">
          <Button><Plus size={16} /> Add Product</Button>
        </Link>
      </div>

      <div className="rounded-xl border border-border bg-background overflow-hidden">
        <table className="w-full text-sm">
          <thead className="border-b border-border bg-secondary/30">
            <tr>
              <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Product</th>
              <th className="px-4 py-3 text-left font-semibold text-muted-foreground hidden sm:table-cell">Price</th>
              <th className="px-4 py-3 text-left font-semibold text-muted-foreground hidden md:table-cell">Stock</th>
              <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Status</th>
              <th className="px-4 py-3 text-right font-semibold text-muted-foreground">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {(products ?? []).map((p) => {
              const cover = [...(p.product_images ?? [])].sort((a, b) => a.position - b.position)[0];
              return (
                <tr key={p.id} className="hover:bg-secondary/20 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-md bg-secondary border border-border">
                        {cover
                          ? <Image src={cover.url} alt={p.title} fill className="object-cover" sizes="40px" />
                          : <div className="h-full w-full bg-secondary" />}
                      </div>
                      <span className="font-medium line-clamp-1 max-w-[200px]">{p.title}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell font-semibold text-primary">{formatBDT(p.price)}</td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <span className={p.stock_quantity === 0 ? "text-destructive font-medium" : p.stock_quantity < 5 ? "text-warning font-medium" : ""}>
                      {p.stock_quantity}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize ${getStatusColor(p.status)}`}>
                      {p.status.replace("_", " ")}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <Link href={`/admin/products/${p.id}/edit`}>
                        <Button variant="outline" size="sm">Edit</Button>
                      </Link>
                      {user.role === "admin" && <DeleteProductButton productId={p.id} />}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {(products ?? []).length === 0 && (
          <div className="py-12 text-center text-muted-foreground">
            <p>No products yet.</p>
            <Link href="/admin/products/new" className="text-primary hover:underline text-sm mt-2 inline-block">Add your first product</Link>
          </div>
        )}
      </div>
    </div>
  );
}
