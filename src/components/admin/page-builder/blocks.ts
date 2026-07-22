export type BlockType = "heading" | "text" | "image" | "productGrid" | "banner" | "spacer";

export interface Block {
  id: string;
  type: BlockType;
  props: Record<string, string>;
}

export const BLOCK_LIBRARY: { type: BlockType; label: string; defaultProps: Record<string, string> }[] = [
  { type: "heading", label: "Heading", defaultProps: { text: "New Heading", level: "2" } },
  { type: "text", label: "Text", defaultProps: { text: "Enter your text here..." } },
  { type: "image", label: "Image", defaultProps: { url: "", alt: "" } },
  { type: "banner", label: "Promo Banner", defaultProps: { text: "Big Sale!", href: "#", bg: "#e63946" } },
  { type: "productGrid", label: "Product Grid", defaultProps: { categorySlug: "", limit: "8" } },
  { type: "spacer", label: "Spacer", defaultProps: { height: "40" } },
];

export function createBlock(type: BlockType): Block {
  const def = BLOCK_LIBRARY.find((b) => b.type === type)!;
  return { id: crypto.randomUUID(), type, props: { ...def.defaultProps } };
}
