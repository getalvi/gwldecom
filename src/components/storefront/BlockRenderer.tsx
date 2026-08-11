import Image from "next/image";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ProductGrid } from "./ProductGrid";
import type { Block } from "@/components/admin/page-builder/blocks";

export async function BlockRenderer({ blocks }: { blocks: Block[] }) {
  return (
    <>
      {blocks.map((block) => (
        <BlockItem key={block.id} block={block} />
      ))}
    </>
  );
}

async function BlockItem({ block }: { block: Block }) {
  switch (block.type) {
    case "heading": {
      const level = Number(block.props.level) || 2;
      const Tag = (`h${level}` as unknown) as "h2";
      return <Tag className="my-4 text-2xl font-bold">{block.props.text}</Tag>;
    }
    case "text":
      return <p className="my-4 whitespace-pre-line text-sm text-muted-foreground">{block.props.text}</p>;
    case "image":
      return block.props.url ? (
        <div className="relative my-4 aspect-video w-full overflow-hidden rounded-lg">
          <Image src={block.props.url} alt={block.props.alt || ""} fill className="object-cover" loading="lazy" />
        </div>
      ) : null;
    case "banner":
      return (
        <Link
          href={block.props.href || "#"}
          className="my-4 flex items-center justify-center rounded-lg p-8 text-lg font-bold text-white"
          style={{ backgroundColor: block.props.bg || "#e63946" }}
        >
          {block.props.text}
        </Link>
      );
    case "spacer":
      return <div style={{ height: `${Number(block.props.height) || 40}px` }} />;
    case "productGrid": {
      const supabase = await createClient();
      let query = supabase
        .from("products")
        .select("id, title, slug, price, compare_at_price, currency, product_images(url, alt_text, position)")
        .eq("status", "published")
        .limit(Number(block.props.limit) || 8);
      if (block.props.categorySlug) {
        const { data: category } = await supabase
          .from("categories")
          .select("id")
          .eq("slug", block.props.categorySlug)
          .single();
        if (category) query = query.eq("category_id", category.id);
      }
      const { data: products } = await query;
      return (
        <div className="my-4">
          <ProductGrid products={products ?? []} />
        </div>
      );
    }
    default:
      return null;
  }
}
