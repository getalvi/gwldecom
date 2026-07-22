import { z } from "zod";

/**
 * Strict contract for what the VLM must return. We ask the model to emit
 * exactly this JSON shape and validate it before it ever touches the DB —
 * never trust model output as-is.
 */
export const aiExtractionSchema = z.object({
  products: z
    .array(
      z.object({
        title: z.string().min(1).max(200),
        description: z.string().max(4000).default(""),
        category: z.string().max(100).default("Uncategorized"),
        estimatedPriceBDT: z.number().nonnegative().nullable().default(null),
        specifications: z.record(z.string(), z.string()).default({}),
        attributes: z.record(z.string(), z.array(z.string())).default({}),
        tags: z.array(z.string()).max(20).default([]),
        confidence: z.number().min(0).max(1).default(0.5),
      })
    )
    .min(1)
    .max(10),
});

export type AIExtraction = z.infer<typeof aiExtractionSchema>;
