import { requireRole } from "@/lib/rbac";

export default async function AdminSettingsPage() {
  await requireRole(["admin"]);
  return (
    <div className="animate-fade-in max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold">Settings</h1>
      <div className="rounded-xl border border-border bg-background p-5 space-y-3">
        <h2 className="font-semibold">AI Configuration</h2>
        <p className="text-sm text-muted-foreground">
          AI product import uses <strong>OpenRouter</strong> via the <code className="bg-secondary px-1 rounded text-xs">OP_API_KEY</code> environment variable.
          Model: <code className="bg-secondary px-1 rounded text-xs">google/gemini-flash-1.5</code> (configurable via <code className="bg-secondary px-1 rounded text-xs">OPENROUTER_MODEL</code>).
        </p>
        <p className="text-sm text-muted-foreground">
          Configure environment variables in your <a href="https://vercel.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Vercel dashboard</a>.
        </p>
      </div>
      <div className="rounded-xl border border-border bg-background p-5 space-y-3">
        <h2 className="font-semibold">Store Information</h2>
        <p className="text-sm text-muted-foreground">Store name, contact, and SEO settings will be configurable in a future update.</p>
      </div>
    </div>
  );
}
