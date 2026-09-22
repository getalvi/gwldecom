"use client"

import { useState, useTransition, useRef } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { toast } from "sonner"
import { Plus, Trash2, Save, ArrowLeft, UploadCloud, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { slugify } from "@/lib/utils"

export type ProductImageInput = { url: string; altText?: string | null; position: number }
export type SpecInput = { k: string; v: string }
export type AttrInput = { key: string; values: string }

export type ProductFormData = {
  title: string
  slug: string
  description: string
  price: number | string
  compareAtPrice: number | string | null
  stockQuantity: number | string
  sku: string
  status: string
  categoryId: string | null
  brandId: string | null
  tags: string
  images: ProductImageInput[]
  specifications: SpecInput[]
  attributes: AttrInput[]
}

export type CategoryOption = { id: string; name: string; parentId: string | null }
export type BrandOption = { id: string; name: string }

const STATUSES = [
  { value: "draft", label: "Draft" },
  { value: "published", label: "Published" },
  { value: "archived", label: "Archived" },
]

export function ProductForm({
  mode,
  initial,
  categories,
  brands,
}: {
  mode: "create" | "edit"
  initial?: Partial<ProductFormData>
  categories: CategoryOption[]
  brands: BrandOption[]
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  const [title, setTitle] = useState(initial?.title ?? "")
  const [slug, setSlug] = useState(initial?.slug ?? "")
  const [slugTouched, setSlugTouched] = useState(mode === "edit")
  const [description, setDescription] = useState(initial?.description ?? "")
  const [price, setPrice] = useState<string>(String(initial?.price ?? ""))
  const [compareAtPrice, setCompareAtPrice] = useState<string>(
    initial?.compareAtPrice == null ? "" : String(initial.compareAtPrice)
  )
  const [stockQuantity, setStockQuantity] = useState<string>(String(initial?.stockQuantity ?? "0"))
  const [sku, setSku] = useState(initial?.sku ?? "")
  const [status, setStatus] = useState(initial?.status ?? "draft")
  const [categoryId, setCategoryId] = useState<string>(initial?.categoryId ?? "__none__")
  const [brandId, setBrandId] = useState<string>(initial?.brandId ?? "__none__")
  const [tags, setTags] = useState(initial?.tags ?? "")
  const [images, setImages] = useState<ProductImageInput[]>(initial?.images ?? [])
  const [imageUrl, setImageUrl] = useState("")
  const [isDraggingImage, setIsDraggingImage] = useState(false)
  const [isProcessingImages, setIsProcessingImages] = useState(false)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [specifications, setSpecifications] = useState<SpecInput[]>(initial?.specifications ?? [])
  const [attributes, setAttributes] = useState<AttrInput[]>(initial?.attributes ?? [])

  function onTitleChange(v: string) {
    setTitle(v)
    if (!slugTouched) setSlug(slugify(v))
  }

  function addImage() {
    const url = imageUrl.trim()
    if (!url) return
    setImages((prev) => [...prev, { url, position: prev.length }])
    setImageUrl("")
  }

  /**
   * Downscales + compresses a dropped image file client-side and returns it
   * as a data URL. There's no object-storage backend (S3/Cloudinary/etc.)
   * wired up yet, and the `images.url` column just stores a string, so this
   * is the zero-infrastructure way to support real drag-and-drop upload —
   * the resize keeps each image a reasonable size instead of stuffing a
   * multi-MB original straight into the database.
   */
  async function fileToImageUrl(file: File, maxDim = 1600, quality = 0.82): Promise<string> {
    const bitmap = await createImageBitmap(file)
    const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height))
    const w = Math.max(1, Math.round(bitmap.width * scale))
    const h = Math.max(1, Math.round(bitmap.height * scale))
    const canvas = document.createElement("canvas")
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext("2d")
    if (!ctx) throw new Error("Canvas not supported")
    ctx.drawImage(bitmap, 0, 0, w, h)
    const mime = file.type === "image/png" ? "image/png" : "image/jpeg"
    return canvas.toDataURL(mime, quality)
  }

  async function handleImageFiles(fileList: FileList | File[]) {
    const files = Array.from(fileList).filter((f) => f.type.startsWith("image/"))
    if (!files.length) return
    setIsProcessingImages(true)
    try {
      const results = await Promise.allSettled(files.map((f) => fileToImageUrl(f)))
      const urls = results.filter((r): r is PromiseFulfilledResult<string> => r.status === "fulfilled").map((r) => r.value)
      if (urls.length) {
        setImages((prev) => [...prev, ...urls.map((url, idx) => ({ url, position: prev.length + idx }))])
      }
      if (urls.length < files.length) toast.error("Couldn't process one or more images")
    } finally {
      setIsProcessingImages(false)
    }
  }

  function buildPayload() {
    return {
      title: title.trim(),
      slug: slug.trim() || slugify(title),
      description,
      price: price === "" ? 0 : Number(price),
      compareAtPrice: compareAtPrice === "" ? null : Number(compareAtPrice),
      stockQuantity: stockQuantity === "" ? 0 : Number(stockQuantity),
      sku: sku.trim(),
      status,
      categoryId: categoryId === "__none__" ? null : categoryId,
      brandId: brandId === "__none__" ? null : brandId,
      tags,
      images,
      specifications: specifications.filter((s) => s.k.trim() || s.v.trim()),
      attributes: attributes
        .filter((a) => a.key.trim())
        .reduce<Record<string, string[]>>((acc, a) => {
          acc[a.key.trim()] = a.values
            .split(",")
            .map((v) => v.trim())
            .filter(Boolean)
          return acc
        }, {}),
    }
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) return toast.error("Title is required")
    if (!sku.trim()) return toast.error("SKU is required")

    const payload = buildPayload()
    const url = mode === "create" ? "/api/admin/products" : `/api/admin/products/${initial?.id ?? ""}`
    const method = mode === "create" ? "POST" : "PUT"

    startTransition(async () => {
      try {
        const res = await fetch(url, {
          method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })
        const data = await res.json()
        if (!res.ok) {
          toast.error(data?.error ?? "Failed to save product")
          return
        }
        toast.success(mode === "create" ? "Product created" : "Product updated")
        router.push("/admin/products")
        router.refresh()
      } catch {
        toast.error("Network error — please try again")
      }
    })
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-6 lg:grid-cols-3">
      {/* Main column */}
      <div className="space-y-6 lg:col-span-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Basic information</CardTitle>
            <CardDescription>Title, slug and description shown to shoppers.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input id="title" value={title} onChange={(e) => onTitleChange(e.target.value)} placeholder="e.g. Samsung Galaxy A55 5G" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="slug">Slug *</Label>
              <Input
                id="slug"
                value={slug}
                onChange={(e) => {
                  setSlug(e.target.value)
                  setSlugTouched(true)
                }}
                placeholder="auto-generated-from-title"
              />
              <p className="text-xs text-muted-foreground">Used in the product URL: /product/&lt;slug&gt;</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={6}
                placeholder="Detailed product description…"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tags">Tags</Label>
              <Input id="tags" value={tags} onChange={(e) => setTags(e.target.value)} placeholder="comma, separated, tags" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Images</CardTitle>
            <CardDescription>Drag & drop image files, or paste a URL. The first image is used as the primary image.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => {
                if (e.target.files?.length) handleImageFiles(e.target.files)
                e.target.value = ""
              }}
            />
            <div
              role="button"
              tabIndex={0}
              onClick={() => fileInputRef.current?.click()}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") fileInputRef.current?.click()
              }}
              onDragOver={(e) => {
                e.preventDefault()
                setIsDraggingImage(true)
              }}
              onDragLeave={() => setIsDraggingImage(false)}
              onDrop={(e) => {
                e.preventDefault()
                setIsDraggingImage(false)
                if (e.dataTransfer.files?.length) handleImageFiles(e.dataTransfer.files)
              }}
              className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed py-8 text-center text-sm transition-colors ${
                isDraggingImage
                  ? "border-primary bg-primary/5 text-primary"
                  : "border-muted-foreground/25 text-muted-foreground hover:border-muted-foreground/40 hover:bg-muted/40"
              }`}
            >
              {isProcessingImages ? (
                <>
                  <Loader2 className="size-6 animate-spin" />
                  Processing image…
                </>
              ) : (
                <>
                  <UploadCloud className="size-6" />
                  <span>
                    <span className="font-medium text-foreground">Drag & drop images</span> here, or click to browse
                  </span>
                  <span className="text-xs">PNG, JPG or WEBP</span>
                </>
              )}
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault()
                    addImage()
                  }
                }}
                placeholder="…or paste an image URL: https://…/image.jpg"
              />
              <Button type="button" variant="outline" onClick={addImage} className="shrink-0">
                <Plus className="size-4" /> Add
              </Button>
            </div>
            {images.length > 0 ? (
              <ul className="space-y-2">
                {images.map((img, i) => (
                  <li key={`${img.url}-${i}`} className="flex items-center gap-3 rounded-md border p-2">
                    <div className="size-12 shrink-0 overflow-hidden rounded-md bg-muted">
                      <img src={img.url} alt={img.altText ?? ""} className="size-full object-cover" />
                    </div>
                    <Input
                      value={img.url}
                      onChange={(e) =>
                        setImages((prev) => prev.map((p, idx) => (idx === i ? { ...p, url: e.target.value } : p)))
                      }
                      className="flex-1"
                    />
                    {i === 0 ? (
                      <span className="hidden shrink-0 rounded bg-primary/10 px-1.5 py-0.5 text-xs font-medium text-primary sm:inline">
                        Primary
                      </span>
                    ) : null}
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => setImages((prev) => prev.filter((_, idx) => idx !== i))}
                      aria-label="Remove image"
                    >
                      <Trash2 className="size-4 text-destructive" />
                    </Button>
                  </li>
                ))}
              </ul>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Specifications</CardTitle>
            <CardDescription>Key-value pairs shown in the spec table.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {specifications.map((s, i) => (
              <div key={i} className="flex gap-2">
                <Input
                  value={s.k}
                  onChange={(e) =>
                    setSpecifications((prev) => prev.map((p, idx) => (idx === i ? { ...p, k: e.target.value } : p)))
                  }
                  placeholder="Key (e.g. Display)"
                  className="flex-1"
                />
                <Input
                  value={s.v}
                  onChange={(e) =>
                    setSpecifications((prev) => prev.map((p, idx) => (idx === i ? { ...p, v: e.target.value } : p)))
                  }
                  placeholder='Value (e.g. 6.6" AMOLED)'
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => setSpecifications((prev) => prev.filter((_, idx) => idx !== i))}
                  aria-label="Remove specification"
                >
                  <Trash2 className="size-4 text-destructive" />
                </Button>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setSpecifications((prev) => [...prev, { k: "", v: "" }])}
            >
              <Plus className="size-4" /> Add specification
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Attributes</CardTitle>
            <CardDescription>Variants like Color or Size. Values are comma separated.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {attributes.map((a, i) => (
              <div key={i} className="flex gap-2">
                <Input
                  value={a.key}
                  onChange={(e) =>
                    setAttributes((prev) => prev.map((p, idx) => (idx === i ? { ...p, key: e.target.value } : p)))
                  }
                  placeholder="Name (e.g. Color)"
                  className="flex-1"
                />
                <Input
                  value={a.values}
                  onChange={(e) =>
                    setAttributes((prev) => prev.map((p, idx) => (idx === i ? { ...p, values: e.target.value } : p)))
                  }
                  placeholder="Values (e.g. Black, Silver)"
                  className="flex-[2]"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => setAttributes((prev) => prev.filter((_, idx) => idx !== i))}
                  aria-label="Remove attribute"
                >
                  <Trash2 className="size-4 text-destructive" />
                </Button>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setAttributes((prev) => [...prev, { key: "", values: "" }])}
            >
              <Plus className="size-4" /> Add attribute
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Side column */}
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Publish</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger id="status" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUSES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Separator />
            <div className="flex flex-col gap-2">
              <Button type="submit" disabled={pending} className="w-full">
                <Save className="size-4" />
                {pending ? "Saving…" : mode === "create" ? "Create product" : "Save changes"}
              </Button>
              <Button asChild variant="outline" className="w-full">
                <Link href="/admin/products">
                  <ArrowLeft className="size-4" /> Cancel
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Pricing & inventory</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="price">Price (৳) *</Label>
              <Input id="price" type="number" min={0} step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="compareAtPrice">Compare-at price (৳)</Label>
              <Input id="compareAtPrice" type="number" min={0} step="0.01" value={compareAtPrice} onChange={(e) => setCompareAtPrice(e.target.value)} placeholder="optional" />
              <p className="text-xs text-muted-foreground">Original price before discount.</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="stock">Stock quantity</Label>
              <Input id="stock" type="number" min={0} step="1" value={stockQuantity} onChange={(e) => setStockQuantity(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sku">SKU *</Label>
              <Input id="sku" value={sku} onChange={(e) => setSku(e.target.value)} placeholder="e.g. SM-A55-256" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Organization</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger id="category" className="w-full">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">— None —</SelectItem>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.parentId ? "  ↳ " : ""}
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="brand">Brand</Label>
              <Select value={brandId} onValueChange={setBrandId}>
                <SelectTrigger id="brand" className="w-full">
                  <SelectValue placeholder="Select brand" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">— None —</SelectItem>
                  {brands.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      </div>
    </form>
  )
}
