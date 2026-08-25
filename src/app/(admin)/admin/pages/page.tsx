import { requireRole } from "@/lib/rbac";
export default async function AdminPagesPage() {
  await requireRole(["admin","staff"]);
  return <div><h1 className="text-2xl font-bold mb-6">Page Builder</h1><p className="text-sm text-muted-foreground">Page builder coming soon.</p></div>;
}
