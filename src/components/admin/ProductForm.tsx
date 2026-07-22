"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toSlug } from "@/lib/validation/product";

const formSchema = z.object({
  title: z.string().min(3),
  description: z.string().optional(),
  price: z.coerce.number().nonnegative(),
  stockQuantity: z.coerce.number().int().nonnegative(),
  status: z.enum(["draft", "pending_review", "published", "archived"]),
});
type FormValues = z.infer<typeof formSchema>;

interface ProductFormProps {
  productId?: string;
  initialValues?: Partial<FormValues>;
}

export function ProductForm({ productId, initialValues }: ProductFormProps) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const isEdit = !!productId;
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { status: "draft", stockQuantity: 0, ...initialValues },
  });

  async function onSubmit(values: FormValues) {
    setServerError(null);
    const res = await fetch(isEdit ? `/api/products/${productId}` : "/api/products", {
      method: isEdit ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(
        isEdit ? values : { ...values, slug: toSlug(values.title), currency: "BDT" }
      ),
    });
    const data = await res.json();
    if (!res.ok) {
      setServerError(data.error ?? `Failed to ${isEdit ? "update" : "create"} product`);
      return;
    }
    router.push("/admin/products");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="max-w-lg space-y-4">
      <div>
        <label className="mb-1 block text-sm font-medium">Title</label>
        <Input {...register("title")} />
        {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">Description</label>
        <textarea className="w-full rounded-md border border-border p-2 text-sm" rows={4} {...register("description")} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="mb-1 block text-sm font-medium">Price (BDT)</label>
          <Input type="number" step="0.01" {...register("price")} />
          {errors.price && <p className="text-xs text-destructive">{errors.price.message}</p>}
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Stock Quantity</label>
          <Input type="number" {...register("stockQuantity")} />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">Status</label>
        <select className="w-full rounded-md border border-border p-2 text-sm" {...register("status")}>
          <option value="draft">Draft</option>
          <option value="pending_review">Pending Review</option>
          <option value="published">Published</option>
          <option value="archived">Archived</option>
        </select>
      </div>

      {serverError && <p className="text-sm text-destructive">{serverError}</p>}

      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Saving..." : isEdit ? "Update Product" : "Save Product"}
      </Button>
    </form>
  );
}
