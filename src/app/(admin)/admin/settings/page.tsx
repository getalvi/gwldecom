import { requireRole } from "@/lib/rbac";
export default async function AdminSettingsPage() {
  await requireRole(["admin"]);
  return (
    <div className="max-w-2xl space-y-6"><h1 className="text-2xl font-bold">Settings</h1>
    <div className="rounded-xl border border-border bg-background p-5 space-y-3"><h2 className="font-semibold">AI Configuration</h2><p className="text-sm text-muted-foreground">AI product import uses <strong>OpenRouter</strong> via the <code className="bg-secondary px-1 rounded text-xs">OP_API_KEY</code> environment variable. Model: <code className="bg-secondary px-1 rounded text-xs">google/gemini-flash-1.5</code> (configurable via <code className="bg-secondary px-1 rounded text-xs">OPENROUTER_MODEL</code>).</p></div>
    <div className="rounded-xl border border-border bg-background p-5 space-y-3"><h2 className="font-semibold">Database Migrations</h2><p className="text-sm text-muted-foreground">Run migrations in order in Supabase SQL Editor: <code className="bg-secondary px-1 rounded text-xs">schema.sql</code> → <code className="bg-secondary px-1 rounded text-xs">policies.sql</code> → <code className="bg-secondary px-1 rounded text-xs">storage.sql</code> → <code className="bg-secondary px-1 rounded text-xs">migration_v2_safe.sql</code> → <code className="bg-secondary px-1 rounded text-xs">migration_v3_safe.sql</code></p></div></div>
  );
}
