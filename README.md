# ShopBD — Daraz-style eCommerce Platform

A production-grade, Vercel-free-tier-optimized eCommerce platform: Next.js 14 (App
Router) + TypeScript + Tailwind + shadcn-style UI, Supabase (Postgres + Auth +
Storage, RLS everywhere), an AI product-import pipeline (image → catalog entry),
and a WordPress-style drag-and-drop page builder.

This README is the map: what's built, how it fits together, how to run it, and
what's intentionally left for you to finish.

## 1. Quick start

```bash
npm install
cp .env.example .env.local   # fill in the values below
npm run dev
```

### 1a. Supabase project (free tier)
1. Create a project at supabase.com.
2. In the SQL editor, run in order: `supabase/schema.sql` → `supabase/policies.sql` → `supabase/storage.sql`.
3. Project Settings → API: copy the URL, anon key, and service_role key into `.env.local`.
4. To make yourself an admin: sign up through `/login` normally (or Supabase Auth UI), then in the SQL editor:
   ```sql
   update public.profiles set role = 'admin' where id = '<your-user-uuid>';
   ```

### 1b. AI (Groq — free tier, vision-capable)
1. Get a free key at https://console.groq.com.
2. Set `GROQ_API_KEY` in `.env.local`. `GROQ_VISION_MODEL` defaults to a Llama
   4 Scout vision model — check Groq's model list if it's been renamed/retired.
3. Optional: Google Programmable Search (`GOOGLE_CSE_API_KEY` / `GOOGLE_CSE_ENGINE_ID`,
   100 free queries/day) improves price-estimate accuracy on AI imports. The
   feature works without it, just with less-informed price guesses.

### 1c. Rate limiting (optional but recommended for prod)
Free Upstash Redis instance → `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN`.
Without it, rate limiting falls back to in-memory (fine for local dev, **not**
safe across multiple serverless instances in production — set this before
going live).

### 1d. Deploy to Vercel
```bash
vercel
```
Set the same env vars in the Vercel dashboard. `next.config.mjs` is already
tuned for the free tier (aggressive image caching, small function bodies,
`maxDuration: 30` on the AI route to stay under the free tier's 60s cap).

## 2. Architecture at a glance

```
src/
  app/
    (storefront)/        # public site: home, product pages, cart, checkout, custom pages
    (admin)/admin/        # staff/admin console, gated by requireRole()
    (auth)/login/
    api/                   # Route Handlers: products, categories, pages, orders, AI
  components/
    ui/                    # shadcn-style primitives (Button, Input, Card, Badge)
    storefront/            # ProductCard, ProductGrid, Header, cart, block renderer
    admin/                 # ProductForm, AIImportPanel, page-builder/*
  lib/
    supabase/              # browser / server / middleware Supabase clients
    ai/                    # vlm.ts (Groq call), schema.ts (Zod contract for AI output)
    rbac.ts                # requireRole() / getCurrentUser() — the app-level auth gate
    rateLimit.ts            audit.ts             image.ts (sharp compression)
    validation/product.ts  # Zod schema, single source of truth for product shape
supabase/
  schema.sql   policies.sql (RLS)   storage.sql (bucket policies)
```

**Two-gate security model**: every privileged action is checked twice —
once in application code (`requireRole()` in `src/lib/rbac.ts`) and again by
Postgres Row Level Security (`supabase/policies.sql`). If a route handler
ever has a bug and forgets the check, RLS still blocks the query.

**AI import is human-in-the-loop by design**: `/api/ai/extract-product`
never writes to the `products` table. It stages results in
`ai_import_drafts`; only `/api/ai/drafts/[id]` (triggered by an admin
clicking Approve in the UI) creates a real product, and admin edits made in
the review panel override the raw AI output before that happens.

## 3. What's fully implemented and verified

- ✅ Product CRUD (create, edit, delete, list) — admin UI + API, Zod-validated
- ✅ AI image-to-product pipeline — upload → sharp/WebP compression → Groq
  vision extraction → staged draft → admin review/edit → approve/reject
- ✅ Drag-and-drop page builder (dnd-kit) — heading/text/image/banner/product-grid/spacer
  blocks, saved as JSON, rendered on the public site
- ✅ Auth (Supabase, email/password) + RBAC (admin/staff/customer) enforced at
  middleware, layout, API, and database (RLS) layers
- ✅ Cart (client-side, localStorage-persisted) → checkout → order creation,
  with **server-side re-validation of price and stock** (never trusts the client cart)
- ✅ Categories management
- ✅ Audit logging (immutable, service-role-only writes)
- ✅ Rate limiting on write/AI endpoints
- ✅ SEO: dynamic metadata, ISR on storefront pages
- ✅ Image pipeline: automatic WebP conversion + resize before every upload
- **Verified**: `npm run typecheck` and `npm run build` both pass clean against this codebase.

## 4. What's intentionally not built yet

This is a real gap list, not a disclaimer — pick these up next:

- **Payment gateway integration.** Checkout currently creates an order as
  Cash-on-Delivery only. Bangladesh-market options to look at: bKash,
  Nagad, SSLCommerz (aggregator covering cards + mobile banking).
- **Atomic stock decrement.** The current order flow reads-then-writes stock
  quantity from the Node runtime; under concurrent orders on the same SKU
  this has a small race window. Fix: a Postgres function
  (`decrement_stock(product_id, qty)`) called via `.rpc()`, which does the
  check-and-decrement in one atomic statement.
  - Also intentionally not built: an admin "AI drafts inbox" list page (the
  API exists at `/api/ai/drafts/[id]`, only the individual review UI is wired up
  in `/admin/ai-import`; a queue/list view would help when many drafts pile up.
- **Existing-page editing** in the page builder (currently only supports
  creating new pages; loading an existing page's blocks into the builder for
  editing is a small addition to `/admin/pages`).
- **Order management UI** for staff (view/update order status, shipping labels).
- **Product variants** (size/color combinations with independent stock/SKUs)
  — the schema has an `attributes` JSONB field ready for this, UI isn't built.
- **Email notifications** (order confirmation, etc.) — free-tier option to
  investigate: Resend's free tier (100 emails/day).
- **Full-text search UI** — the Postgres GIN index for search exists in
  `schema.sql`; there's no search bar wired to it yet.

## 5. Vercel free-tier cost notes

- ISR (`revalidate = 300`) on storefront pages keeps serverless invocations low.
- Images are capped at 1600px and re-encoded to WebP server-side before
  upload, so Vercel's Image Optimization quota is barely touched (most
  images arrive already-optimized).
- `next.config.mjs` sets `minimumCacheTTL: 31536000` on the image loader —
  once a size/format variant is generated, it's cached for a year.
- The AI route sets `maxDuration = 30` to stay comfortably under the Hobby
  plan's 60s function limit even on a slow Groq response.
