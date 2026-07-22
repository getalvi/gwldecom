import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { BlockRenderer } from "@/components/storefront/BlockRenderer";
import type { Block } from "@/components/admin/page-builder/blocks";

export const revalidate = 300;

interface Props {
  params: Promise<{ slug: string }>;
}

async function getPage(slug: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("pages")
    .select("*")
    .eq("slug", slug)
    .eq("status", "published")
    .single();
  return data;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const page = await getPage(slug);
  if (!page) return {};
  return { title: page.seo_title || page.title, description: page.seo_description ?? undefined };
}

export default async function CustomPage({ params }: Props) {
  const { slug } = await params;
  const page = await getPage(slug);
  if (!page) notFound();

  return (
    <main className="container py-6">
      <BlockRenderer blocks={(page.blocks as unknown as Block[]) ?? []} />
    </main>
  );
}
