"use client";

import { useState } from "react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, arrayMove } from "@dnd-kit/sortable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BLOCK_LIBRARY, createBlock, type Block } from "./blocks";
import { SortableBlock } from "./SortableBlock";

interface Props {
  pageId?: string;
  initialTitle?: string;
  initialSlug?: string;
  initialBlocks?: Block[];
}

export function PageBuilder({ pageId, initialTitle = "", initialSlug = "", initialBlocks = [] }: Props) {
  const [title, setTitle] = useState(initialTitle);
  const [slug, setSlug] = useState(initialSlug);
  const [blocks, setBlocks] = useState<Block[]>(initialBlocks);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setBlocks((items) => {
      const oldIndex = items.findIndex((b) => b.id === active.id);
      const newIndex = items.findIndex((b) => b.id === over.id);
      return arrayMove(items, oldIndex, newIndex);
    });
  }

  function updateBlockProps(id: string, props: Record<string, string>) {
    setBlocks((items) => items.map((b) => (b.id === id ? { ...b, props } : b)));
  }

  function removeBlock(id: string) {
    setBlocks((items) => items.filter((b) => b.id !== id));
  }

  async function save(status: "draft" | "published") {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch(pageId ? `/api/pages/${pageId}` : "/api/pages", {
        method: pageId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, slug, blocks, status }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Save failed");
      setMessage(status === "published" ? "Page published." : "Draft saved.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="grid grid-cols-[220px_1fr] gap-6">
      <aside className="space-y-2">
        <p className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Add Block</p>
        {BLOCK_LIBRARY.map((b) => (
          <Button
            key={b.type}
            variant="outline"
            size="sm"
            className="w-full justify-start"
            onClick={() => setBlocks((prev) => [...prev, createBlock(b.type)])}
          >
            + {b.label}
          </Button>
        ))}
      </aside>

      <div>
        <div className="mb-4 grid grid-cols-2 gap-4">
          <Input placeholder="Page title" value={title} onChange={(e) => setTitle(e.target.value)} />
          <Input placeholder="page-slug" value={slug} onChange={(e) => setSlug(e.target.value)} />
        </div>

        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={blocks.map((b) => b.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-3">
              {blocks.length === 0 && (
                <p className="rounded-md border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
                  Add blocks from the left panel to start building the page.
                </p>
              )}
              {blocks.map((block) => (
                <SortableBlock key={block.id} block={block} onChange={updateBlockProps} onRemove={removeBlock} />
              ))}
            </div>
          </SortableContext>
        </DndContext>

        <div className="mt-6 flex items-center gap-3">
          <Button onClick={() => save("draft")} disabled={saving} variant="outline">
            Save Draft
          </Button>
          <Button onClick={() => save("published")} disabled={saving}>
            Publish
          </Button>
          {message && <span className="text-sm text-muted-foreground">{message}</span>}
        </div>
      </div>
    </div>
  );
}
