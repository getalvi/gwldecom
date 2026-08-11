import { requireRole } from "@/lib/rbac";
import { PageBuilder } from "@/components/admin/page-builder/PageBuilder";

export default async function NewPageBuilderPage() {
  await requireRole(["admin", "staff"]);
  return (
    <div>
      <h1 className="mb-6 text-xl font-bold">Page Builder</h1>
      <PageBuilder />
    </div>
  );
}
