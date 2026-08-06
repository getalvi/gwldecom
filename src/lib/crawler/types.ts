/**
 * Shared contracts for the modular product-crawling engine.
 *
 * Design: each extractor is a pure function (html, url) -> RawExtraction | null.
 * The orchestrator (./index.ts) runs them in priority order and merges results,
 * so adding a new site-specific extractor never requires touching the others.
 */

export type ExtractionTier = "json-ld" | "open-graph" | "microdata" | "ai-extraction";

export type Availability = "in_stock" | "out_of_stock" | "preorder" | "unknown";

/** Loosely-typed intermediate shape every extractor fills in partially. */
export interface RawExtraction {
  title?: string;
  description?: string;
  brand?: string;
  sku?: string;
  category?: string;
  price?: number;
  currency?: string;
  availability?: Availability;
  images?: string[];
  specifications?: Record<string, string>;
  attributes?: Record<string, string[]>;
  tags?: string[];
  ratingValue?: number;
  ratingCount?: number;
  breadcrumb?: string[];
}

export interface TierResult {
  tier: ExtractionTier;
  data: RawExtraction;
}

export interface Extractor {
  tier: ExtractionTier;
  /** Returns null (never throws) when this tier finds nothing useful. */
  extract(html: string, url: string): RawExtraction | null;
}

export interface CrawlResult {
  data: Required<Pick<RawExtraction, "title" | "description" | "category" | "images" | "specifications" | "attributes" | "tags">> &
    Omit<RawExtraction, "title" | "description" | "category" | "images" | "specifications" | "attributes" | "tags">;
  tiersUsed: ExtractionTier[];
  confidence: number;
  warnings: string[];
}
