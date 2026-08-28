import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
export function cn(...inputs: ClassValue[]) { return twMerge(clsx(inputs)) }

export function formatBDT(amount: number | string): string {
  const n = typeof amount === "string" ? parseFloat(amount) : amount
  if (Number.isNaN(n)) return "৳0"
  return "৳" + new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(Math.round(n))
}
export function discountPercent(price: number, compareAt?: number | null): number {
  if (!compareAt || compareAt <= price) return 0
  return Math.round(((compareAt - price) / compareAt) * 100)
}
export function formatDate(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d) : d
  return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
}
export function formatDateTime(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d) : d
  return date.toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })
}
export function slugify(input: string): string {
  return input.toString().toLowerCase().trim().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "")
}
export function parseTags(tags: string): string[] {
  return tags ? tags.split(",").map((t) => t.trim()).filter(Boolean) : []
}
export function safeJsonParse<T>(raw: string | null | undefined, fallback: T): T {
  if (!raw) return fallback
  try { return JSON.parse(raw) as T } catch { return fallback }
}
