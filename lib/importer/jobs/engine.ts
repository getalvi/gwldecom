import "server-only";
import { fetchPage, detectAntiBot } from "../crawler/fetch";
import { JsonLdExtractor } from "../extractors/jsonld";
import { OpenGraphExtractor } from "../extractors/opengraph";
import { MicrodataExtractor } from "../extractors/microdata";
import { CssExtractor } from "../extractors/css";
import { AiExtractor } from "../ai/extractor";
import { applyPriceRules } from "../utils/price";
import { checkDuplicate, normalizeImageUrl, deduplicateImages } from "../utils/dedup";
import { createServiceRoleClient } from "@/lib/supabase/server";
import type { ExtractedProduct, IExtractor, ImportConfig } from "../interfaces";

// Extractor pipeline — ordered by priority
const EXTRACTORS: IExtractor[] = [
  new JsonLdExtractor(),
  new MicrodataExtractor(),
  new OpenGraphExtractor(),
  new CssExtractor(),
  new AiExtractor(),
];

const AI_EXTRACTOR = new AiExtractor();

async function log(jobId: string, itemId: string | null, level: "info" | "warn" | "error" | "debug", message: string, meta?: Record<string, unknown>) {
  try {
    const svc = createServiceRoleClient();
    await svc.from("import_logs").insert({ job_id: jobId, item_id: itemId, level, message, meta: (meta ?? {}) as import('@/types/database').Json });
  } catch { /* log failures must never throw */ }
}

export async function extractFromUrl(
  url: string,
  jobId: string,
  itemId: string,
  config: ImportConfig = {}
): Promise<{ product: ExtractedProduct | null; error?: string }> {
  const svc = createServiceRoleClient();
  const start = Date.now();

  await svc.from("import_items").update({ status: "extracting" }).eq("id", itemId);
  await log(jobId, itemId, "info", `Fetching: ${url}`);

  // 1. Fetch page
  const fetchResult = await fetchPage(url, { timeout: config.timeout ?? 15000, delay: true });

  if (fetchResult.error) {
    await log(jobId, itemId, "error", `Fetch failed: ${fetchResult.error}`);
    return { product: null, error: fetchResult.error };
  }

  await svc.from("import_items").update({ raw_html_length: fetchResult.html.length }).eq("id", itemId);

  // 2. Anti-bot check
  const antiBot = detectAntiBot(fetchResult.html, fetchResult.statusCode);
  if (antiBot) {
    await log(jobId, itemId, "warn", antiBot);
    // Fall through — AI might still extract something from partial HTML
  }

  // 3. Run extractor pipeline
  let extracted: Partial<ExtractedProduct> = {};
  let usedMethod = "fallback";

  for (const extractor of EXTRACTORS) {
    if (!extractor.canExtract(fetchResult.html, url)) continue;
    await log(jobId, itemId, "debug", `Trying extractor: ${extractor.name}`);

    try {
      const result = await extractor.extract(fetchResult.html, url);
      if (result.title && (result.price ?? 0) >= 0) {
        extracted = result;
        usedMethod = extractor.name;
        await log(jobId, itemId, "info", `Extracted via ${extractor.name} (confidence: ${result.confidence})`);
        break;
      }
    } catch (err) {
      await log(jobId, itemId, "warn", `Extractor ${extractor.name} failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  if (!extracted.title) {
    await log(jobId, itemId, "error", "All extractors failed — no product title found");
    return { product: null, error: "Could not extract product data from this page" };
  }

  // 4. AI rewrite if enabled
  if (config.aiRewrite && extracted.title) {
    const rewritten = await AI_EXTRACTOR.rewriteForSeo(extracted);
    extracted.title = rewritten.title || extracted.title;
    extracted.description = rewritten.description || extracted.description;
    extracted.tags = rewritten.tags.length ? rewritten.tags : extracted.tags;
    await log(jobId, itemId, "info", "Applied AI SEO rewrite");
  }

  // 5. AI translate if enabled
  if (config.aiTranslate && config.translateTo && extracted.title) {
    const translated = await AI_EXTRACTOR.translate(extracted, config.translateTo);
    extracted.title = translated.title || extracted.title;
    extracted.description = translated.description || extracted.description;
    await log(jobId, itemId, "info", `Translated to ${config.translateTo}`);
  }

  // 6. Apply price rules
  const finalPrice = applyPriceRules(extracted.price ?? 0, extracted.currency ?? "BDT", config);

  // 7. Normalize & deduplicate images
  const normalizedImages = deduplicateImages(
    (extracted.images ?? []).map(img => normalizeImageUrl(img, url))
  );

  // 8. Build final product
  const product: ExtractedProduct = {
    title: extracted.title ?? "",
    description: extracted.description ?? "",
    htmlDescription: extracted.htmlDescription,
    price: finalPrice,
    compareAtPrice: extracted.compareAtPrice ? applyPriceRules(extracted.compareAtPrice, extracted.currency ?? "BDT", config) : undefined,
    currency: "BDT",
    stock: extracted.stock ?? 0,
    sku: extracted.sku ?? "",
    barcode: extracted.barcode ?? "",
    brand: extracted.brand ?? "",
    category: extracted.category ?? "",
    breadcrumb: extracted.breadcrumb ?? [],
    images: normalizedImages,
    variants: extracted.variants ?? [],
    specifications: extracted.specifications ?? {},
    attributes: extracted.attributes ?? {},
    tags: extracted.tags ?? [],
    rating: extracted.rating,
    reviewCount: extracted.reviewCount,
    weight: extracted.weight ?? "",
    dimensions: extracted.dimensions ?? "",
    warranty: extracted.warranty ?? "",
    shipping: extracted.shipping ?? "",
    seller: extracted.seller ?? "",
    sourceUrl: url,
    extractionMethod: usedMethod as ExtractedProduct["extractionMethod"],
    confidence: extracted.confidence ?? 0.5,
    warnings: [
      ...(extracted.warnings ?? []),
      ...(antiBot ? [antiBot] : []),
    ],
  };

  // 9. Duplicate check
  const dupCheck = await checkDuplicate(product);
  if (dupCheck.isDuplicate) {
    product.warnings.push(`Possible duplicate: ${dupCheck.reason}`);
    await log(jobId, itemId, "warn", `Duplicate detected: ${dupCheck.reason}`);
  }

  const duration = Date.now() - start;
  await svc.from("import_items").update({
    status: "preview",
    extracted: product as unknown as import('@/types/database').Json,
    extraction_method: usedMethod,
    confidence: product.confidence,
    warnings: product.warnings,
    duration_ms: duration,
  }).eq("id", itemId);

  await log(jobId, itemId, "info", `Extraction complete in ${duration}ms`);
  return { product };
}

export async function saveProductFromExtraction(
  itemId: string,
  jobId: string,
  overrides: Partial<ExtractedProduct> = {},
  config: ImportConfig = {}
): Promise<{ productId: string | null; error?: string }> {
  const svc = createServiceRoleClient();

  const { data: item } = await svc.from("import_items").select("extracted, url").eq("id", itemId).single();
  if (!item?.extracted) return { productId: null, error: "No extracted data found" };

  const extracted = { ...(item.extracted as unknown as ExtractedProduct), ...overrides };

  // Find or create category
  let categoryId: string | null = config.defaultCategoryId ?? null;
  if (extracted.category && !categoryId) {
    const { data: existingCat } = await svc.from("categories").select("id").ilike("name", extracted.category).maybeSingle();
    if (existingCat) {
      categoryId = existingCat.id;
    } else {
      const slug = extracted.category.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
      const { data: newCat } = await svc.from("categories").insert({ name: extracted.category, slug }).select("id").single();
      if (newCat) categoryId = newCat.id;
    }
  }

  // Find or create brand
  let brandId: string | null = null;
  if (extracted.brand) {
    const { data: existingBrand } = await svc.from("brands").select("id").ilike("name", extracted.brand).maybeSingle();
    if (existingBrand) {
      brandId = existingBrand.id;
    } else {
      const slug = extracted.brand.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
      const { data: newBrand } = await svc.from("brands").insert({ name: extracted.brand, slug }).select("id").single();
      if (newBrand) brandId = newBrand.id;
    }
  }

  // Generate slug
  const baseSlug = extracted.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 180);
  const uniqueSlug = `${baseSlug}-${Date.now().toString(36)}`;

  const { data: product, error: productError } = await svc.from("products").insert({
    title: extracted.title,
    slug: uniqueSlug,
    description: extracted.description,
    price: extracted.price,
    compare_at_price: extracted.compareAtPrice ?? null,
    currency: "BDT",
    stock_quantity: extracted.stock ?? 0,
    sku: extracted.sku || null,
    specifications: extracted.specifications,
    attributes: extracted.attributes,
    tags: extracted.tags,
    category_id: categoryId,
    brand_id: brandId,
    status: config.autoPublish ? "published" : "draft",
    source: "ai_import",
    ai_confidence: extracted.confidence,
  }).select("id").single();

  if (productError || !product) {
    await log(jobId, itemId, "error", `Failed to save product: ${productError?.message}`);
    return { productId: null, error: productError?.message ?? "Insert failed" };
  }

  // Save images
  if (extracted.images.length) {
    await svc.from("product_images").insert(
      extracted.images.slice(0, 12).map((url, i) => ({
        product_id: product.id, url, alt_text: extracted.title, position: i,
      }))
    );
  }

  // Update item status
  await svc.from("import_items").update({ status: "imported", resulting_product_id: product.id }).eq("id", itemId);
  await log(jobId, itemId, "info", `Product saved: ${product.id}`);

  return { productId: product.id };
}
