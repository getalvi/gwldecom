"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Image from "next/image";
import { Upload, X, Plus, ImageIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { toSlug } from "@/lib/utils";

const formSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters"),
  description: z.string().optional(),
  price: z.coerce.number().nonnegative("Price must be positive"),
  compareAtPrice: z.coerce.number().nonnegative().optional().or(z.literal("")),
  stockQuantity: z.coerce.number().int().nonnegative(),
  sku: z.string().optional(),
  status: z.enum(["draft", "pending_review", "published", "archived"]),
  categoryId: z.string().optional(),
  brandId: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface Category { id: string; name: string }
interface Brand { id: string; name: string }
interface ProductImage { url: string; altText?: string }

interface ProductFormProps {
  productId?: string;
  initialValues?: Partial<FormValues>;
  initialImages?: ProductImage[];
  categories?: Category[];
  brands?: Brand[];
}

export function ProductForm({ productId, initialValues, initialImages = [], categories = [], brands = [] }: ProductFormProps) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [images, setImages] = useState<ProductImage[]>(initialImages);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isEdit = !!productId;

  const { register, handleSubmit, watch, setValue, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { status: "draft", stockQuantity: 0, ...initialValues },
  });

  const title = watch("title");

  async function handleImageUpload(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploading(true);
    setUploadError(null);

    for (const file of Array.from(files)) {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) {
        setUploadError(data.error ?? "Upload failed");
        break;
      }
      setImages(prev => [...prev, { url: data.url, altText: file.name.replace(/\.[^/.]+$/, "") }]);
    }
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function onSubmit(values: FormValues) {
    setServerError(null);

    const slug = isEdit ? undefined : toSlug(values.title);
    const payload = {
      ...values,
      ...(slug ? { slug } : {}),
      currency: "BDT",
      compareAtPrice: values.compareAtPrice === "" ? null : values.compareAtPrice,
      categoryId: values.categoryId || null,
      brandId: values.brandId || null,
      images,
    };

    const res = await fetch(isEdit ? `/api/products/${productId}` : "/api/products", {
      method: isEdit ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    if (!res.ok) { setServerError(data.error ?? "Failed to save product"); return; }
    router.push("/admin/products");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-w-3xl">
      {/* Basic info */}
      <div className="rounded-xl border border-border bg-background p-5 space-y-4">
        <h2 className="font-semibold">Basic Information</h2>
        <Input label="Product Title" {...register("title")} error={errors.title?.message}
          onBlur={e => { if (!isEdit && !watch("title")) setValue("title", e.target.value); }} />
        {title && !isEdit && (
          <p className="text-xs text-muted-foreground">Slug: <code className="bg-secondary px-1 rounded">{toSlug(title)}</code></p>
        )}
        <Textarea label="Description" rows={5} {...register("description")} placeholder="Describe the product..." />

        <div className="grid gap-4 sm:grid-cols-2">
          <Select label="Category" {...register("categoryId")}>
            <option value="">— Select Category —</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>
          <Select label="Brand" {...register("brandId")}>
            <option value="">— Select Brand —</option>
            {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </Select>
        </div>
      </div>

      {/* Pricing */}
      <div className="rounded-xl border border-border bg-background p-5 space-y-4">
        <h2 className="font-semibold">Pricing & Inventory</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Price (BDT)" type="number" step="0.01" min="0" {...register("price")} error={errors.price?.message} />
          <Input label="Compare-at Price (optional)" type="number" step="0.01" min="0" {...register("compareAtPrice")} placeholder="Original price for strikethrough" />
          <Input label="Stock Quantity" type="number" min="0" {...register("stockQuantity")} />
          <Input label="SKU (optional)" {...register("sku")} placeholder="e.g. PROD-001" />
        </div>
      </div>

      {/* Images */}
      <div className="rounded-xl border border-border bg-background p-5 space-y-4">
        <h2 className="font-semibold">Product Images</h2>

        {/* Upload area */}
        <div
          className="border-2 border-dashed border-border rounded-lg p-6 text-center cursor-pointer hover:border-primary transition-colors"
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            multiple
            className="hidden"
            onChange={e => handleImageUpload(e.target.files)}
          />
          {uploading ? (
            <div className="flex items-center justify-center gap-2">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              <span className="text-sm text-muted-foreground">Uploading & compressing...</span>
            </div>
          ) : (
            <>
              <Upload size={32} className="mx-auto text-muted-foreground mb-2" />
              <p className="text-sm font-medium">Click to upload images</p>
              <p className="text-xs text-muted-foreground mt-1">JPEG, PNG, WebP up to 10MB each. Auto-compressed to WebP.</p>
            </>
          )}
        </div>

        {uploadError && <p className="text-sm text-destructive">{uploadError}</p>}

        {/* Image previews */}
        {images.length > 0 && (
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
            {images.map((img, i) => (
              <div key={i} className="relative group aspect-square rounded-lg overflow-hidden border border-border bg-secondary">
                <Image src={img.url} alt={img.altText ?? "Product"} fill className="object-cover" sizes="150px" />
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <button type="button" onClick={() => setImages(prev => prev.filter((_, j) => j !== i))}
                    className="rounded-full bg-white/90 p-1.5 hover:bg-white">
                    <X size={14} className="text-destructive" />
                  </button>
                </div>
                {i === 0 && <span className="absolute bottom-1 left-1 text-[10px] bg-primary text-white rounded px-1">Cover</span>}
              </div>
            ))}
            <button type="button" onClick={() => fileInputRef.current?.click()}
              className="aspect-square rounded-lg border-2 border-dashed border-border flex items-center justify-center hover:border-primary transition-colors">
              <Plus size={20} className="text-muted-foreground" />
            </button>
          </div>
        )}

        {images.length === 0 && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <ImageIcon size={16} />
            <span>No images uploaded yet</span>
          </div>
        )}
      </div>

      {/* Status */}
      <div className="rounded-xl border border-border bg-background p-5">
        <Select label="Status" {...register("status")}>
          <option value="draft">Draft — Not visible to customers</option>
          <option value="pending_review">Pending Review</option>
          <option value="published">Published — Live on store</option>
          <option value="archived">Archived — Hidden</option>
        </Select>
      </div>

      {serverError && (
        <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3">
          <p className="text-sm text-destructive">{serverError}</p>
        </div>
      )}

      <div className="flex gap-3">
        <Button type="submit" loading={isSubmitting} size="lg">
          {isEdit ? "Update Product" : "Create Product"}
        </Button>
        <Button type="button" variant="outline" size="lg" onClick={() => router.back()}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
