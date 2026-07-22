import { requireRole } from "@/lib/rbac";
import { AIImportPanel } from "@/components/admin/AIImportPanel";

export default async function AIImportPage() {
  await requireRole(["admin", "staff"]);

  return (
    <div>
      <h1 className="mb-1 text-xl font-bold">AI Product Import</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        Upload a product photo, a listing screenshot, or a full webpage screenshot. The AI will
        detect products and stage them below for your review — nothing publishes automatically.
      </p>
      <AIImportPanel />
    </div>
  );
}
