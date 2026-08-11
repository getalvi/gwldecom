import { z } from "zod";
import { toSlug } from "@/lib/utils";

export { toSlug };

export const productStatusEnum = z.enum(["draft", "pending_review", "published", "archived"]);

export const productSchema = z.object({
  title: z.string().trim().min(3, "Title too short").max(200),
  slug: z.string().trim().min(3).max(220).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug must be lowercase, hyphen-separated"),
  description: z.string().trim().max(20_000).optional().default(""),
  specifications: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).default({}),
  attributes: z.record(z.string(), z.array(z.string())).default({}),
  tags: z.array(z.string().trim().min(1).max(40)).max(30).default([]),
  categoryId: z.string().uuid().nullable().optional(),
  brandId: z.string().uuid().nullable().optional(),
  price: z.number().nonnegative().max(100_000_000),
  compareAtPrice: z.number().nonnegative().max(100_000_000).nullable().optional(),
  currency: z.string().length(3).default("BDT"),
  stockQuantity: z.number().int().nonnegative().max(1_000_000).default(0),
  sku: z.string().trim().max(64).optional(),
  status: productStatusEnum.default("draft"),
  images: z.array(z.object({ url: z.string().url(), altText: z.string().max(200).optional() })).max(12).default([]),
});

export type ProductInput = z.infer<typeof productSchema>;

export const productUpdateSchema = productSchema.partial().extend({ id: z.string().uuid() });
