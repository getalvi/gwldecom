// Block / "plugin" registry — the WordPress-plugin equivalent.
//
// Each block type maps to:
//   - a React component (rendered by <BlockRenderer />)
//   - a Zod schema describing its props (used by the admin Page Builder editor)
//   - default props + a human label + an icon
//
// To add a new "plugin" later: create a new component in /components/blocks/,
// add ONE entry to BLOCK_REGISTRY below. No other code changes needed.

import type { ComponentType } from 'react'
import { z } from 'zod'

export interface BlockDefinition<P = Record<string, unknown>> {
  type: string
  label: string
  description: string
  icon: string // lucide icon name
  component: ComponentType<{ props: P }>
  schema: z.ZodType<P>
  defaultProps: P
}

export const BLOCK_REGISTRY: Record<string, BlockDefinition<any>> = {}

export function registerBlock<P>(def: BlockDefinition<P>) {
  BLOCK_REGISTRY[def.type] = def as BlockDefinition<any>
}

export function getBlock(type: string): BlockDefinition<any> | undefined {
  return BLOCK_REGISTRY[type]
}

export function listBlocks(): BlockDefinition<any>[] {
  return Object.values(BLOCK_REGISTRY)
}

// ---------------------------------------------------------------------------
// Schemas (centralized so the admin editor + renderer share one source of truth)
// ---------------------------------------------------------------------------

export const HeroSchema = z.object({
  title: z.string().default('Hero Title'),
  subtitle: z.string().default(''),
  ctaText: z.string().default('Shop Now'),
  ctaHref: z.string().default('#/'),
  hue: z.number().default(210),
})
export type HeroProps = z.infer<typeof HeroSchema>

export const RichTextSchema = z.object({
  content: z.string().default('## Heading\n\nYour text here...'),
})
export type RichTextProps = z.infer<typeof RichTextSchema>

export const ProductGridSchema = z.object({
  title: z.string().default('Products'),
  tag: z.string().optional(),
  category: z.string().optional(),
  limit: z.number().default(8),
})
export type ProductGridProps = z.infer<typeof ProductGridSchema>

export const BannerCarouselSchema = z.object({
  autoplay: z.boolean().default(true),
})
export type BannerCarouselProps = z.infer<typeof BannerCarouselSchema>

export const FaqSchema = z.object({
  items: z.array(z.object({ q: z.string(), a: z.string() })).default([]),
})
export type FaqProps = z.infer<typeof FaqSchema>

export const TestimonialsSchema = z.object({
  items: z
    .array(z.object({ name: z.string(), role: z.string().optional(), text: z.string() }))
    .default([]),
})
export type TestimonialsProps = z.infer<typeof TestimonialsSchema>

export const ContactFormSchema = z.object({
  title: z.string().default('Contact Us'),
  email: z.string().default('support@bdshop.com'),
})
export type ContactFormProps = z.infer<typeof ContactFormSchema>

export const SpacerSchema = z.object({
  height: z.number().default(32),
})
export type SpacerProps = z.infer<typeof SpacerSchema>

export const HtmlEmbedSchema = z.object({
  html: z.string().default('<p>Custom HTML embed</p>'),
})
export type HtmlEmbedProps = z.infer<typeof HtmlEmbedSchema>
