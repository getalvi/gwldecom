import { requireRole } from "@/lib/rbac";
import { createClient } from "@/lib/supabase/server";
import { ProductForm } from "@/components/admin/ProductForm";

export default async function NewProductPage() {
  await requireRole(["admin", "staff"]);
  const supabase = await createClient();

  const [{ data: categories }, brandsResult] = await Promise.all([
    supabase.from("categories").select("id, name").order("name"),
    supabase.from("brands").select("id, name").order("name"),
  ]);

  const brands = brandsResult.data ?? [];

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Add New Product</h1>
      <ProductForm
        categories={categories ?? []}
        brands={brands as { id: string; name: string }[]}
      />
    </div>
  );
}
