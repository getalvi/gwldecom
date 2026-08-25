export interface ExtractedVariant { name: string; value: string; price?: number; stock?: number; sku?: string; imageUrl?: string; }
export interface ExtractedProduct {
  title: string; description: string; htmlDescription?: string; price: number; compareAtPrice?: number;
  currency: string; stock?: number; sku?: string; barcode?: string; brand?: string; category?: string;
  breadcrumb?: string[]; images: string[]; variants: ExtractedVariant[];
  specifications: Record<string, string>; attributes: Record<string, string[]>; tags: string[];
  rating?: number; reviewCount?: number; weight?: string; dimensions?: string; warranty?: string;
  shipping?: string; seller?: string; sourceUrl: string; extractionMethod: ExtractionMethod;
  confidence: number; warnings: string[];
}
export type ExtractionMethod = 'jsonld' | 'opengraph' | 'microdata' | 'css' | 'ai' | 'fallback';
export type JobType = 'url' | 'bulk' | 'crawl' | 'search' | 'sitemap' | 'api';
export type JobStatus = 'pending' | 'running' | 'paused' | 'completed' | 'failed' | 'cancelled';
export type ItemStatus = 'pending' | 'extracting' | 'preview' | 'approved' | 'rejected' | 'imported' | 'failed' | 'skipped';
export interface ImportConfig {
  markupPercent?: number; fixedIncrease?: number; autoRound?: boolean; minimumPrice?: number;
  aiRewrite?: boolean; aiTranslate?: boolean; translateTo?: string; overwriteExisting?: boolean;
  autoPublish?: boolean; defaultCategoryId?: string; maxDepth?: number; maxPages?: number;
  delayMs?: number; timeout?: number;
}
export interface IExtractor {
  name: ExtractionMethod; priority: number;
  canExtract(html: string, url: string): boolean;
  extract(html: string, url: string): Promise<Partial<ExtractedProduct>>;
}
