import { requireRole } from "@/lib/rbac";
import { AIImportClient } from "@/components/admin/importer/AIImportClient";

export const dynamic = "force-dynamic";

export default async function AIImportPage() {
  await requireRole(["admin", "staff"]);
  return <AIImportClient />;
}
