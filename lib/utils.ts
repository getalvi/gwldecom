import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatBDT(amount: number): string {
  return new Intl.NumberFormat("en-BD", {
    style: "currency",
    currency: "BDT",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat("en-BD", {
    year: "numeric", month: "short", day: "numeric",
    hour: "2-digit", minute: "2-digit",
  }).format(new Date(date));
}

export function toSlug(title: string): string {
  return title
    .toLowerCase().trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 220);
}

export function getStatusColor(status: string): string {
  const map: Record<string, string> = {
    pending: "bg-warning/10 text-warning border-warning/20",
    confirmed: "bg-blue-50 text-blue-700 border-blue-200",
    packed: "bg-purple-50 text-purple-700 border-purple-200",
    shipped: "bg-indigo-50 text-indigo-700 border-indigo-200",
    delivered: "bg-success/10 text-success border-success/20",
    cancelled: "bg-destructive/10 text-destructive border-destructive/20",
    refunded: "bg-gray-100 text-gray-600 border-gray-200",
    published: "bg-success/10 text-success border-success/20",
    draft: "bg-gray-100 text-gray-600 border-gray-200",
    archived: "bg-orange-50 text-orange-600 border-orange-200",
    pending_review: "bg-warning/10 text-warning border-warning/20",
  };
  return map[status] ?? "bg-gray-100 text-gray-600 border-gray-200";
}
