"use client";

import { useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

/** Shape produced by the image (Groq vision) pipeline — unchanged from before. */
interface ImageExtracted {
  title: string;
  description: string;
  category: string;
  estimatedPriceBDT: number | null;
  specifications: Record<string, string>;
  tags: string[];
}

/** Shape produced by the URL-crawl pipeline (tiers 1-4 in lib/crawler). */
interface UrlExtracted {
  title: string;
  description: string;
  brand: string | null;
  sku: string | null;
  category: string;
  price: number | null;
  currency: string | null;
  images: string[];
  specifications: Record<string, string>;
  attributes: Record<string, string[]>;
  tags: string[];
}

interface Draft {
  id: string;
  source_type?: "image" | "url"; // absent on rows created before URL import existed -> treat as "image"
  source_url?: string | null;
  source_image_url: string | null;
  confidence: number;
  extracted: ImageExtracted | UrlExtracted;
}

function isUrlDraft(draft: Draft): draft is Draft & { extracted: UrlExtracted } {
  return draft.source_type === "url";
}

type EditableFields = Partial<ImageExtracted & UrlExtracted>;

export function AIImportPanel() {
  const [tab, setTab] = useState<"image" | "url">("image");

  // --- Image-import state (unchanged behavior) ---
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  // --- URL-import state ---
  const [url, setUrl] = useState("");
  const [crawling, setCrawling] = useState(false);
  const [urlWarnings, setUrlWarnings] = useState<string[]>([]);

  // --- Shared draft/review state ---
  const [error, setError] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [editing, setEditing] = useState<Record<string, EditableFields>>({});

  async function handleUpload() {
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("image", file);
      const res = await fetch("/api/ai/extract-product", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Extraction failed");
      setDrafts((prev) => [...data.drafts, ...prev]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setUploading(false);
    }
  }

  async function handleUrlImport() {
    if (!url.trim()) return;
    setCrawling(true);
    setError(null);
    setUrlWarnings([]);
    try {
      const res = await fetch("/api/ai/extract-product-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Import failed");
      setDrafts((prev) => [{ ...data.draft, source_type: "url" }, ...prev]);
      setUrlWarnings(data.warnings ?? []);
      setUrl("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setCrawling(false);
    }
  }

  async function handleDecision(draft: Draft, decision: "approve" | "reject") {
    const overrides = editing[draft.id];
    const fromUrl = isUrlDraft(draft);
    const res = await fetch(`/api/ai/drafts/${draft.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        decision,
        overrides: overrides
          ? {
              title: overrides.title,
              description: overrides.description,
              price: fromUrl ? overrides.price : overrides.estimatedPriceBDT,
              ...(fromUrl ? { currency: overrides.currency, sku: overrides.sku } : {}),
            }
          : undefined,
      }),
    });
    if (res.ok) {
      setDrafts((prev) => prev.filter((d) => d.id !== draft.id));
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Review action failed");
    }
  }

  function updateField<K extends keyof EditableFields>(id: string, field: K, value: EditableFields[K]) {
    setEditing((prev) => ({ ...prev, [id]: { ...prev[id], [field]: value } }));
  }

  return (
    <div className="space-y-6">
      <div className="flex gap-2 border-b border-border">
        <button
          type="button"
          onClick={() => setTab("image")}
          className={`px-4 py-2 text-sm font-medium ${
            tab === "image" ? "border-b-2 border-primary text-foreground" : "text-muted-foreground"
          }`}
        >
          Image Import
        </button>
        <button
          type="button"
          onClick={() => setTab("url")}
          className={`px-4 py-2 text-sm font-medium ${
            tab === "url" ? "border-b-2 border-primary text-foreground" : "text-muted-foreground"
          }`}
        >
          URL Import
        </button>
      </div>

      {tab === "image" && (
        <Card>
          <CardContent className="flex items-center gap-4 py-6">
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="text-sm"
            />
            <Button onClick={handleUpload} disabled={!file || uploading}>
              {uploading ? "Analyzing image..." : "Extract Products with AI"}
            </Button>
          </CardContent>
        </Card>
      )}

      {tab === "url" && (
        <Card>
          <CardContent className="space-y-3 py-6">
            <div className="flex items-center gap-4">
              <Input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://example.com/product/123"
                className="flex-1"
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleUrlImport();
                }}
              />
              <Button onClick={handleUrlImport} disabled={!url.trim() || crawling}>
                {crawling ? "Importing..." : "Import from URL"}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Paste a single product page URL. The importer tries structured data (JSON-LD, OpenGraph,
              Microdata) first and only falls back to AI extraction when needed.
            </p>
            {urlWarnings.length > 0 && (
              <ul className="list-disc pl-5 text-xs text-amber-600">
                {urlWarnings.map((w) => (
                  <li key={w}>{w}</li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="grid gap-4 md:grid-cols-2">
        {drafts.map((draft) => {
          const e = draft.extracted;
          const urlDraft = isUrlDraft(draft);
          const gallery = urlDraft ? (e as UrlExtracted).images : draft.source_image_url ? [draft.source_image_url] : [];

          return (
            <Card key={draft.id}>
              <CardContent className="space-y-3 py-4">
                {gallery.length > 0 ? (
                  <div className="flex gap-2 overflow-x-auto">
                    {gallery.slice(0, 4).map((src) => (
                      <div key={src} className="relative h-40 w-40 shrink-0 overflow-hidden rounded bg-secondary">
                        <Image src={src} alt={e.title} fill className="object-contain" sizes="160px" />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex h-40 w-full items-center justify-center rounded bg-secondary text-xs text-muted-foreground">
                    No image found
                  </div>
                )}

                <div className="flex flex-wrap items-center gap-2">
                  <Badge>{Math.round(draft.confidence * 100)}% confidence</Badge>
                  {urlDraft && draft.source_url && (
                    <Badge>
                      <a href={draft.source_url} target="_blank" rel="noopener noreferrer" className="underline">
                        source
                      </a>
                    </Badge>
                  )}
                </div>

                <Input
                  defaultValue={e.title}
                  onChange={(ev) => updateField(draft.id, "title", ev.target.value)}
                  placeholder="Title"
                />
                <textarea
                  defaultValue={e.description}
                  onChange={(ev) => updateField(draft.id, "description", ev.target.value)}
                  className="w-full rounded-md border border-border p-2 text-sm"
                  rows={3}
                  placeholder="Description"
                />

                {urlDraft ? (
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      defaultValue={(e as UrlExtracted).price ?? undefined}
                      onChange={(ev) => updateField(draft.id, "price", Number(ev.target.value))}
                      placeholder="Price"
                      className="flex-1"
                    />
                    <Input
                      defaultValue={(e as UrlExtracted).currency ?? "BDT"}
                      onChange={(ev) => updateField(draft.id, "currency", ev.target.value)}
                      placeholder="Currency"
                      className="w-24"
                    />
                  </div>
                ) : (
                  <Input
                    type="number"
                    defaultValue={(e as ImageExtracted).estimatedPriceBDT ?? undefined}
                    onChange={(ev) => updateField(draft.id, "estimatedPriceBDT", Number(ev.target.value))}
                    placeholder="Price (BDT)"
                  />
                )}

                {urlDraft && (e as UrlExtracted).brand && (
                  <p className="text-xs text-muted-foreground">Brand: {(e as UrlExtracted).brand}</p>
                )}
                {urlDraft && (e as UrlExtracted).sku && (
                  <Input
                    defaultValue={(e as UrlExtracted).sku ?? ""}
                    onChange={(ev) => updateField(draft.id, "sku", ev.target.value)}
                    placeholder="SKU"
                  />
                )}

                <p className="text-xs text-muted-foreground">Category: {e.category}</p>
                <div className="flex flex-wrap gap-1">
                  {e.tags.map((tag) => (
                    <Badge key={tag}>{tag}</Badge>
                  ))}
                </div>

                <div className="flex gap-2 pt-2">
                  <Button size="sm" onClick={() => handleDecision(draft, "approve")}>
                    Approve &amp; Create
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => handleDecision(draft, "reject")}>
                    Reject
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
