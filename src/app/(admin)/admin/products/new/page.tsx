import { requireRole } from "@/lib/rbac";
import { ProductForm } from "@/components/admin/ProductForm";

export default async function NewProductPage() {
  await requireRole(["admin", "staff"]);
  return (
    <div>
      <h1 className="mb-6 text-xl font-bold">Add Product</h1>
      <ProductForm />
    </div>
  );
}
