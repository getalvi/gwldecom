import Link from "next/link";
import { redirect } from "next/navigation";
import {
  LayoutDashboard, Package, Tag, Image, Percent, Users,
  ShoppingBag, Settings, Star, ChevronRight, Layers, Cpu, BarChart2
} from "lucide-react";
import { getCurrentUser } from "@/lib/rbac";

const NAV = [
  { label: "Dashboard", href: "/admin", icon: LayoutDashboard },
  { label: "Orders", href: "/admin/orders", icon: ShoppingBag },
  { label: "Products", href: "/admin/products", icon: Package },
  { label: "Categories", href: "/admin/categories", icon: Tag },
  { label: "Banners", href: "/admin/banners", icon: Image },
  { label: "Coupons", href: "/admin/coupons", icon: Percent },
  { label: "Customers", href: "/admin/customers", icon: Users },
  { label: "Reviews", href: "/admin/reviews", icon: Star },
  { label: "Page Builder", href: "/admin/pages", icon: Layers },
  { label: "AI Import", href: "/admin/ai-import", icon: Cpu },
  { label: "Analytics", href: "/admin/analytics", icon: BarChart2 },
  { label: "Settings", href: "/admin/settings", icon: Settings },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  let user;
  try { user = await getCurrentUser(); } catch { redirect("/login?redirect=/admin"); }
  if (user.role !== "admin" && user.role !== "staff") redirect("/");

  return (
    <div className="flex min-h-screen bg-secondary/20">
      {/* Sidebar */}
      <aside className="hidden md:flex w-60 shrink-0 flex-col border-r border-border bg-background">
        <div className="p-4 border-b border-border">
          <Link href="/" className="flex items-center gap-1">
            <span className="text-xl font-extrabold text-primary">Shop</span>
            <span className="text-xl font-extrabold">BD</span>
          </Link>
          <p className="text-xs text-muted-foreground mt-0.5">Admin Panel</p>
        </div>

        <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
          {NAV.map(({ label, href, icon: Icon }) => (
            <Link key={href} href={href}
              className="group flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors">
              <Icon size={16} className="shrink-0" />
              <span>{label}</span>
              <ChevronRight size={12} className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
            </Link>
          ))}
        </nav>

        <div className="p-3 border-t border-border">
          <div className="rounded-lg bg-secondary p-2.5">
            <p className="text-xs font-medium truncate">{user.fullName ?? user.email}</p>
            <p className="text-xs text-muted-foreground capitalize">{user.role}</p>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur px-6 h-14 flex items-center justify-between">
          <h1 className="text-sm font-semibold text-muted-foreground">Admin Panel</h1>
          <Link href="/" className="text-xs text-primary hover:underline">← View Store</Link>
        </header>
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
