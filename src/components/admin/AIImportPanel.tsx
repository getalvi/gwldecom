"use client";

import { useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface Draft {
  id: string;
  extracted: {
    title: string;
    description: string;
    category: string;
    estimatedPriceBDT: number | null;
    specifications: Record<string, string>;
    tags: string[];
    confidence: number;
  };
  confidence: number;
  source_image_url: string;
}

export function AIImportPanel() {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [editing, setEditing] = useState<Record<string, Partial<Draft["extracted"]>>>({});

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

  async function handleDecision(draft: Draft, decision: "approve" | "reject") {
    const overrides = editing[draft.id];
    const res = await fetch(`/api/ai/drafts/${draft.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        decision,
        overrides: overrides
          ? {
              title: overrides.title,
              description: overrides.description,
              price: overrides.estimatedPriceBDT,
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

  function updateField<K extends keyof Draft["extracted"]>(id: string, field: K, value: Draft["extracted"][K]) {
    setEditing((prev) => ({ ...prev, [id]: { ...prev[id], [field]: value } }));
  }

  return (
    <div className="space-y-6">
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

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="grid gap-4 md:grid-cols-2">
        {drafts.map((draft) => {
          const edited = editing[draft.id] ?? {};
          const e = draft.extracted;
          return (
            <Card key={draft.id}>
              <CardContent className="space-y-3 py-4">
                <div className="relative h-40 w-full overflow-hidden rounded bg-secondary">
                  <Image src={draft.source_image_url} alt={e.title} fill className="object-contain" />
                </div>
                <Badge>{Math.round(draft.confidence * 100)}% confidence</Badge>

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
                <Input
                  type="number"
                  defaultValue={e.estimatedPriceBDT ?? undefined}
                  onChange={(ev) => updateField(draft.id, "estimatedPriceBDT", Number(ev.target.value))}
                  placeholder="Price (BDT)"
                />
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
