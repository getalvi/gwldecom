"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Trash2 } from "lucide-react";
import type { Block } from "./blocks";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface Props {
  block: Block;
  onChange: (id: string, props: Record<string, string>) => void;
  onRemove: (id: string) => void;
}

export function SortableBlock({ block, onChange, onRemove }: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: block.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="rounded-md border border-border bg-background p-3">
      <div className="mb-2 flex items-center justify-between">
        <button {...attributes} {...listeners} className="cursor-grab text-muted-foreground" aria-label="Drag to reorder">
          <GripVertical size={16} />
        </button>
        <span className="text-xs font-medium uppercase text-muted-foreground">{block.type}</span>
        <Button size="icon" variant="ghost" onClick={() => onRemove(block.id)} aria-label="Remove block">
          <Trash2 size={14} />
        </Button>
      </div>

      <BlockEditor block={block} onChange={onChange} />
    </div>
  );
}

function BlockEditor({ block, onChange }: { block: Block; onChange: Props["onChange"] }) {
  const set = (key: string, value: string) => onChange(block.id, { ...block.props, [key]: value });

  switch (block.type) {
    case "heading":
      return <Input defaultValue={block.props.text} onChange={(e) => set("text", e.target.value)} placeholder="Heading text" />;
    case "text":
      return (
        <textarea
          className="w-full rounded-md border border-border p-2 text-sm"
          rows={3}
          defaultValue={block.props.text}
          onChange={(e) => set("text", e.target.value)}
        />
      );
    case "image":
      return (
        <div className="space-y-2">
          <Input defaultValue={block.props.url} onChange={(e) => set("url", e.target.value)} placeholder="Image URL" />
          <Input defaultValue={block.props.alt} onChange={(e) => set("alt", e.target.value)} placeholder="Alt text" />
        </div>
      );
    case "banner":
      return (
        <div className="space-y-2">
          <Input defaultValue={block.props.text} onChange={(e) => set("text", e.target.value)} placeholder="Banner text" />
          <Input defaultValue={block.props.href} onChange={(e) => set("href", e.target.value)} placeholder="Link URL" />
        </div>
      );
    case "productGrid":
      return (
        <div className="space-y-2">
          <Input
            defaultValue={block.props.categorySlug}
            onChange={(e) => set("categorySlug", e.target.value)}
            placeholder="Category slug (blank = all)"
          />
          <Input
            type="number"
            defaultValue={block.props.limit}
            onChange={(e) => set("limit", e.target.value)}
            placeholder="Number of products"
          />
        </div>
      );
    case "spacer":
      return (
        <Input
          type="number"
          defaultValue={block.props.height}
          onChange={(e) => set("height", e.target.value)}
          placeholder="Height (px)"
        />
      );
    default:
      return null;
  }
}
