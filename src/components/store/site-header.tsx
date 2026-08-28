import { db } from "@/lib/db"
import { HeaderInner } from "@/components/store/header-inner"
export async function SiteHeader() {
  const categories = await db.category.findMany({ where: { parentId: null }, orderBy: { name: "asc" }, select: { id: true, name: true, slug: true, imageUrl: true } })
  return <HeaderInner categories={categories} />
}
