import { requireRole } from "@/lib/rbac";
import { createClient } from "@/lib/supabase/server";
import { ProductForm } from "@/components/admin/ProductForm";

export default async function NewProductPage() {
  await requireRole(["admin", "staff"]);
  const supabase = await createClient();
  const [{ data: categories }, { data: brands }] = await Promise.all([
    supabase.from("categories").select("id, name").order("name"),
    supabase.from("brands").select("id, name").order("name"),
  ]);

  return (
    <div className="animate-fade-in">
      <h1 className="text-2xl font-bold mb-6">Add New Product</h1>
      <ProductForm categories={categories ?? []} brands={brands ?? []} />
    </div>
  );
}
