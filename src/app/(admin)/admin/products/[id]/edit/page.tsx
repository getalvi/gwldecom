import { notFound } from "next/navigation";
import { requireRole } from "@/lib/rbac";
import { createClient } from "@/lib/supabase/server";
import { ProductForm } from "@/components/admin/ProductForm";

export const dynamic = "force-dynamic";
interface Props { params: Promise<{ id: string }> }

export default async function EditProductPage({ params }: Props) {
  await requireRole(["admin", "staff"]);
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: product }, { data: categories }, { data: brands }] = await Promise.all([
    supabase.from("products").select("*, product_images(url, alt_text, position)").eq("id", id).single(),
    supabase.from("categories").select("id, name").order("name"),
    supabase.from("brands").select("id, name").order("name"),
  ]);

  if (!product) notFound();

  const images = [...(product.product_images ?? [])].sort((a, b) => a.position - b.position)
    .map(img => ({ url: img.url, altText: img.alt_text ?? "" }));

  return (
    <div className="animate-fade-in">
      <h1 className="text-2xl font-bold mb-6">Edit Product</h1>
      <ProductForm
        productId={product.id}
        initialImages={images}
        categories={categories ?? []}
        brands={brands ?? []}
        initialValues={{
          title: product.title,
          description: product.description ?? "",
          price: product.price,
          compareAtPrice: product.compare_at_price ?? undefined,
          stockQuantity: product.stock_quantity,
          sku: product.sku ?? "",
          status: product.status as "draft" | "pending_review" | "published" | "archived",
          categoryId: product.category_id ?? "",
          brandId: product.brand_id ?? "",
        }}
      />
    </div>
  );
}
