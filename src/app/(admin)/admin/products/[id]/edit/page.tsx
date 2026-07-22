import { notFound } from "next/navigation";
import { requireRole } from "@/lib/rbac";
import { createClient } from "@/lib/supabase/server";
import { ProductForm } from "@/components/admin/ProductForm";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function EditProductPage({ params }: Props) {
  await requireRole(["admin", "staff"]);
  const { id } = await params;

  const supabase = await createClient();
  const { data: product } = await supabase
    .from("products")
    .select("id, title, description, price, stock_quantity, status")
    .eq("id", id)
    .single();

  if (!product) notFound();

  return (
    <div>
      <h1 className="mb-6 text-xl font-bold">Edit Product</h1>
      <ProductForm
        productId={product.id}
        initialValues={{
          title: product.title,
          description: product.description ?? "",
          price: product.price,
          stockQuantity: product.stock_quantity,
          status: product.status as "draft" | "pending_review" | "published" | "archived",
        }}
      />
    </div>
  );
}
