# Task 3: Backend API Routes & Auth Configuration

**Date:** 2025-06-18
**Status:** Completed

## Files Created

| # | File | Description |
|---|------|-------------|
| 1 | `src/lib/auth.ts` | NextAuth v4 config with Credentials provider, JWT strategy, role/userId in session |
| 2 | `src/types/next-auth.d.ts` | TypeScript type augmentations for NextAuth session/JWT |
| 3 | `src/app/api/auth/[...nextauth]/route.ts` | NextAuth handler exports (GET/POST) |
| 4 | `src/app/api/auth/register/route.ts` | User registration with zod validation, bcrypt hashing |
| 5 | `src/app/api/products/route.ts` | Product listing (filtered, paginated, with avgRating) + product creation (admin) |
| 6 | `src/app/api/products/[id]/route.ts` | Product detail (by id/slug) + update (images/variants) + delete |
| 7 | `src/app/api/categories/route.ts` | Category listing (with hierarchy) + creation (admin) |
| 8 | `src/app/api/brands/route.ts` | Brand listing (with product count) + creation (admin) |
| 9 | `src/app/api/cart/route.ts` | Cart: list (auth/guest), add to cart (stock validation), clear cart |
| 10 | `src/app/api/cart/[id]/route.ts` | Cart item: update quantity (stock check), remove item |
| 11 | `src/app/api/wishlist/route.ts` | Wishlist: list, add, remove (auth required) |
| 12 | `src/app/api/orders/route.ts` | Orders: list (customer/admin), create from cart (server-side price calc, coupon, stock decrement) |
| 13 | `src/app/api/orders/[id]/route.ts` | Order: detail, status update with inventory restore on cancel |
| 14 | `src/app/api/coupons/route.ts` | Coupons: list (admin), create, update, delete, validate for checkout |
| 15 | `src/app/api/reviews/route.ts` | Reviews: list by product, create (verified purchase check) |
| 16 | `src/app/api/settings/route.ts` | Store settings: get all as key-value, upsert (admin) |
| 17 | `src/app/api/homepage/route.ts` | Homepage sections: list active, create, reorder, delete (admin) |
| 18 | `src/app/api/notifications/route.ts` | Notifications: list, unread count, mark read (auth) |
| 19 | `src/app/api/addresses/route.ts` | Addresses: CRUD with default management (auth) |
| 20 | `src/app/api/analytics/route.ts` | Analytics: track events (no auth), dashboard stats (admin) |
| 21 | `src/app/api/search/route.ts` | Product search with filters and pagination |
| 22 | `src/app/api/admin/users/route.ts` | Admin: list users (with order count/total spent), suspend/role update |
| 23 | `src/app/api/admin/import/route.ts` | Admin: start AI import job (web-reader + LLM extraction) |
| 24 | `src/app/api/admin/import/[id]/route.ts` | Admin: get import job, approve/reject items, bulk actions |

## Key Design Decisions

- **Auth**: JWT strategy, role (admin/staff/customer) and userId injected into session via callbacks
- **Error responses**: `{ error: string, code?: string }` pattern with proper HTTP status codes
- **Input validation**: Zod v4 for all request bodies
- **Price security**: All order price calculations are server-side (recalculated from DB, not from client)
- **Stock management**: Atomic decrement on order create, restore on cancel/return
- **Coupon validation**: Checks active, expiry, min order, per-user limits, max uses
- **Guest cart**: Supports sessionId (header or query param) for unauthenticated users
- **Audit logging**: Product CRUD, order status changes, user updates, settings changes
- **AI Import**: Uses z-ai-web-dev-sdk web-reader + LLM to extract product data from URLs
- **No 'use server'** in route.ts files (routes are server-side by default)
