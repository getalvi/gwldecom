import { notFound } from "next/navigation"
import Link from "next/link"
import type { Metadata } from "next"
import { db } from "@/lib/db"
import { safeJsonParse, parseTags, formatBDT } from "@/lib/utils"
import { ProductGallery } from "@/components/store/product-gallery"
import { ProductOptions, type ProductOption } from "@/components/store/product-options"
import { ProductCard } from "@/components/store/product-card"
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Check, Star } from "lucide-react"

export const revalidate = 60

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const product = await db.product.findUnique({ where: { slug }, include: { images: { orderBy: { position: "asc" } }, category: true, brand: true } })
  if (!product) return { title: "Product not found" }
  return { title: product.title, description: product.description.slice(0, 155) || `Buy ${product.title} on ShopHaat.`, alternates: { canonical: `/product/${product.slug}` } }
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const product = await db.product.findUnique({ where: { slug }, include: { images: { orderBy: { position: "asc" } }, category: { include: { parent: true } }, brand: true, reviews: { include: { user: { select: { fullName: true } } }, orderBy: { createdAt: "desc" } } } })
  if (!product || product.status !== "published") notFound()
  const specs = safeJsonParse<{ k: string; v: string }[]>(product.specifications, [])
  const attributes = safeJsonParse<Record<string, string[]>>(product.attributes, {})
  const tags = parseTags(product.tags)
  const avgRating = product.reviews.length ? product.reviews.reduce((s, r) => s + r.rating, 0) / product.reviews.length : 0
  const relatedRaw = await db.product.findMany({ where: { status: "published", categoryId: product.categoryId, id: { not: product.id } }, take: 5, include: { images: { orderBy: { position: "asc" }, take: 1 }, reviews: { select: { rating: true } } } })
  const related = relatedRaw.map((p) => ({ id: p.id, title: p.title, slug: p.slug, price: Number(p.price), compareAtPrice: p.compareAtPrice ? Number(p.compareAtPrice) : null, imageUrl: p.images[0]?.url ?? null, stockQuantity: p.stockQuantity }))

  return (
    <div className="mx-auto max-w-7xl px-3 py-4 sm:px-6 sm:py-6">
      <Breadcrumb className="mb-4">
        <BreadcrumbList>
          <BreadcrumbItem><BreadcrumbLink asChild><Link href="/">Home</Link></BreadcrumbLink></BreadcrumbItem>
          <BreadcrumbSeparator />
          {product.category?.parent && (<><BreadcrumbItem><BreadcrumbLink asChild><Link href={`/category/${product.category.parent.slug}`}>{product.category.parent.name}</Link></BreadcrumbLink></BreadcrumbItem><BreadcrumbSeparator /></>)}
          {product.category && (<><BreadcrumbItem><BreadcrumbLink asChild><Link href={`/category/${product.category.slug}`}>{product.category.name}</Link></BreadcrumbLink></BreadcrumbItem><BreadcrumbSeparator /></>)}
          <BreadcrumbItem><BreadcrumbPage className="line-clamp-1 max-w-[200px]">{product.title}</BreadcrumbPage></BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
      <div className="grid gap-8 lg:grid-cols-2">
        <ProductGallery images={product.images.map((i) => ({ id: i.id, url: i.url, altText: i.altText }))} title={product.title} />
        <div>
          {product.brand && <Link href={`/search?q=${encodeURIComponent(product.brand.name)}`} className="text-sm font-medium text-primary hover:underline">{product.brand.name}</Link>}
          <h1 className="mt-1 text-2xl font-bold leading-tight sm:text-3xl">{product.title}</h1>
          {product.reviews.length > 0 && (
            <div className="mt-2 flex items-center gap-3">
              <div className="flex">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className={`h-4 w-4 ${i < Math.round(avgRating) ? "fill-amber-400 text-amber-400" : "fill-muted text-muted-foreground/40"}`} />
                ))}
              </div>
              <span className="text-sm text-muted-foreground">{avgRating.toFixed(1)} ({product.reviews.length} reviews)</span>
            </div>
          )}
          <div className="my-5">
            <ProductOptions p={{ id: product.id, title: product.title, slug: product.slug, price: Number(product.price), compareAtPrice: product.compareAtPrice ? Number(product.compareAtPrice) : null, stockQuantity: product.stockQuantity, attributes, rating: avgRating || undefined, reviewCount: product.reviews.length } as ProductOption} />
          </div>
          {specs.length > 0 && (<div className="rounded-xl border bg-card p-4"><h3 className="mb-2 text-sm font-semibold">Key Features</h3><ul className="grid grid-cols-1 gap-1.5 text-sm sm:grid-cols-2">{specs.slice(0, 6).map((s, i) => <li key={i} className="flex items-start gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" /><span><span className="font-medium">{s.k}:</span> <span className="text-muted-foreground">{s.v}</span></span></li>)}</ul></div>)}
        </div>
      </div>
      <div className="mt-10">
        <Tabs defaultValue="description">
          <TabsList className="w-full justify-start overflow-x-auto"><TabsTrigger value="description">Description</TabsTrigger><TabsTrigger value="specs">Specifications</TabsTrigger><TabsTrigger value="reviews">Reviews ({product.reviews.length})</TabsTrigger></TabsList>
          <TabsContent value="description"><div className="rounded-xl border bg-card p-5"><p className="whitespace-pre-line text-sm leading-relaxed text-muted-foreground">{product.description}</p>{tags.length > 0 && (<div className="mt-4 flex flex-wrap gap-2">{tags.map((t) => <Link key={t} href={`/search?q=${encodeURIComponent(t)}`}><Badge variant="secondary" className="cursor-pointer">#{t}</Badge></Link>)}</div>)}</div></TabsContent>
          <TabsContent value="specs"><div className="rounded-xl border bg-card p-5">{specs.length === 0 ? <p className="text-sm text-muted-foreground">No specifications available.</p> : <table className="w-full text-sm"><tbody>{specs.map((s, i) => <tr key={i} className="border-b last:border-0"><td className="w-1/3 py-2.5 font-medium">{s.k}</td><td className="py-2.5 text-muted-foreground">{s.v}</td></tr>)}</tbody></table>}</div></TabsContent>
          <TabsContent value="reviews">
            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <h3 className="mb-4 text-lg font-semibold">Customer Reviews</h3>
                {product.reviews.length === 0 ? (
                  <div className="rounded-xl border border-dashed p-6 text-center"><p className="text-sm text-muted-foreground">No reviews yet.</p></div>
                ) : (
                  <div className="space-y-4">
                    {product.reviews.map((r) => (
                      <div key={r.id} className="rounded-xl border bg-card p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="grid h-9 w-9 place-items-center rounded-full bg-primary/10 font-bold text-primary">{(r.user?.fullName || "U")[0]}</div>
                            <div>
                              <p className="text-sm font-medium">{r.user?.fullName || "Anonymous"}</p>
                              <p className="text-xs text-muted-foreground">{new Date(r.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}</p>
                            </div>
                          </div>
                          <div className="flex">
                            {Array.from({ length: 5 }).map((_, i) => (
                              <Star key={i} className={`h-3.5 w-3.5 ${i < r.rating ? "fill-amber-400 text-amber-400" : "fill-muted text-muted-foreground/40"}`} />
                            ))}
                          </div>
                        </div>
                        {r.title && <p className="mt-2 text-sm font-medium">{r.title}</p>}
                        <p className="mt-1 text-sm text-muted-foreground">{r.body}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
      {related.length > 0 && (<div className="mt-12"><h2 className="mb-4 text-xl font-bold">You may also like</h2><div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">{related.map((p) => <ProductCard key={p.id} p={p} />)}</div></div>)}
    </div>
  )
}
