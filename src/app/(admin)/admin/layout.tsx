import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/rbac";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  let user;
  try {
    user = await getCurrentUser();
  } catch {
    redirect("/login?redirect=/admin");
  }

  if (user.role !== "admin" && user.role !== "staff") {
    redirect("/"); // customers never see the admin shell, even if they hit the URL directly
  }

  return (
    <div className="flex min-h-screen">
      <aside className="w-56 shrink-0 border-r border-border bg-secondary/40 p-4">
        <p className="mb-6 text-sm text-muted-foreground">Signed in as {user.fullName ?? user.email}</p>
        <nav className="space-y-1 text-sm">
          <Link className="block rounded px-3 py-2 hover:bg-secondary" href="/admin">
            Dashboard
          </Link>
          <Link className="block rounded px-3 py-2 hover:bg-secondary" href="/admin/products">
            Products
          </Link>
          <Link className="block rounded px-3 py-2 hover:bg-secondary" href="/admin/products/new">
            Add Product
          </Link>
          <Link className="block rounded px-3 py-2 hover:bg-secondary" href="/admin/categories">
            Categories
          </Link>
          <Link className="block rounded px-3 py-2 hover:bg-secondary" href="/admin/ai-import">
            AI Import
          </Link>
          <Link className="block rounded px-3 py-2 hover:bg-secondary" href="/admin/pages">
            Page Builder
          </Link>
        </nav>
      </aside>
      <div className="flex-1 p-6">{children}</div>
    </div>
  );
}
