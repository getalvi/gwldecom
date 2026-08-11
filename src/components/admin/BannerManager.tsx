"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Plus, Trash2, Upload } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface Banner { id: string; title: string; image_url: string; link_url: string | null; position: number; active: boolean }

export function BannerManager({ initialBanners }: { initialBanners: Banner[] }) {
  const router = useRouter();
  const [form, setForm] = useState({ title: "", link_url: "", image_url: "" });
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function uploadImage(file: File) {
    setUploading(true);
    const fd = new FormData(); fd.append("file", file);
    const res = await fetch("/api/upload", { method: "POST", body: fd });
    const data = await res.json();
    setUploading(false);
    if (!res.ok) { setError(data.error ?? "Upload failed"); return; }
    setForm(p => ({ ...p, image_url: data.url }));
  }

  async function addBanner() {
    if (!form.title || !form.image_url) { setError("Title and image required"); return; }
    setError(null);
    const res = await fetch("/api/banners", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, position: initialBanners.length }),
    });
    if (!res.ok) { const d = await res.json(); setError(d.error ?? "Failed"); return; }
    setForm({ title: "", link_url: "", image_url: "" });
    router.refresh();
  }

  async function deleteBanner(id: string) {
    if (!confirm("Delete this banner?")) return;
    await fetch(`/api/banners/${id}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="rounded-xl border border-border bg-background p-5 space-y-4">
        <h2 className="font-semibold">Add New Banner</h2>
        <Input label="Title" value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="Summer Sale Banner" />
        <Input label="Link URL (optional)" value={form.link_url} onChange={e => setForm(p => ({ ...p, link_url: e.target.value }))} placeholder="https://..." />
        <div>
          <label className="mb-1.5 block text-sm font-medium">Banner Image</label>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 cursor-pointer rounded-md border border-border px-3 py-2 text-sm hover:bg-secondary transition-colors">
              <Upload size={16} />
              {uploading ? "Uploading..." : "Choose Image"}
              <input type="file" accept="image/*" className="hidden" onChange={e => e.target.files?.[0] && uploadImage(e.target.files[0])} />
            </label>
            {form.image_url && <span className="text-xs text-success">Image uploaded ✓</span>}
          </div>
          {form.image_url && (
            <div className="mt-2 relative h-24 w-48 rounded-lg overflow-hidden border border-border">
              <Image src={form.image_url} alt="Preview" fill className="object-cover" />
            </div>
          )}
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button onClick={addBanner} disabled={uploading}><Plus size={16} /> Add Banner</Button>
      </div>

      <div className="space-y-3">
        {initialBanners.map(banner => (
          <div key={banner.id} className="flex items-center gap-3 rounded-xl border border-border bg-background p-3">
            <div className="relative h-14 w-24 shrink-0 rounded-md overflow-hidden bg-secondary">
              <Image src={banner.image_url} alt={banner.title} fill className="object-cover" sizes="96px" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{banner.title}</p>
              {banner.link_url && <p className="text-xs text-muted-foreground truncate">{banner.link_url}</p>}
            </div>
            <Button variant="destructive" size="icon-sm" onClick={() => deleteBanner(banner.id)}>
              <Trash2 size={14} />
            </Button>
          </div>
        ))}
        {initialBanners.length === 0 && <p className="text-sm text-muted-foreground">No banners yet.</p>}
      </div>
    </div>
  );
}
