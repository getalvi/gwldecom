import { requireRole } from "@/lib/rbac";
import { createClient } from "@/lib/supabase/server";
import { CategoryManager } from "@/components/admin/CategoryManager";
export const dynamic = "force-dynamic";
export default async function CategoriesPage() {
  await requireRole(["admin","staff"]);
  const supabase = await createClient();
  const { data: categories } = await supabase.from("categories").select("id, name, slug").order("name");
  return <div><h1 className="text-2xl font-bold mb-6">Categories</h1><CategoryManager initialCategories={categories ?? []}/></div>;
}
