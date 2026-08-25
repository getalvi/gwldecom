// Shared TypeScript types for the storefront + admin. These mirror the Prisma
// models but are the contract the frontend works against.

export type Role = 'admin' | 'staff' | 'customer'

export type ProductStatus = 'draft' | 'pending_review' | 'published' | 'archived'
export type OrderStatus = 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled'
export type PaymentMethod = 'cod' | 'sslcommerz' | 'bkash' | 'nagad' | 'rocket'
export type PaymentStatus = 'unpaid' | 'paid' | 'refunded'
export type PageStatus = 'draft' | 'published'
export type CouponType = 'percentage' | 'fixed'

export interface ProductImageT {
  id: string
  url: string
  altText: string | null
  position: number
}

export interface ProductT {
  id: string
  title: string
  slug: string
  description: string | null
  specifications: Record<string, string> | null
  attributes: Record<string, string[]> | null
  tags: string[] | null
  categoryId: string | null
  category?: { id: string; name: string; slug: string } | null
  brandId: string | null
  brand?: { id: string; name: string; slug: string } | null
  price: number
  compareAtPrice: number | null
  currency: string
  stockQuantity: number
  sku: string
  status: ProductStatus
  source: string
  aiConfidence: number | null
  images: ProductImageT[]
  createdAt: string
}

export interface CategoryT {
  id: string
  name: string
  slug: string
  parentId: string | null
  imageUrl: string | null
  children?: CategoryT[]
}

export interface BrandT {
  id: string
  name: string
  slug: string
  logoUrl: string | null
}

export interface ReviewT {
  id: string
  productId: string
  userId: string
  rating: number
  title: string | null
  body: string | null
  createdAt: string
  user?: { id: string; fullName: string | null } | null
}

export interface BannerT {
  id: string
  title: string
  imageUrl: string
  linkUrl: string | null
  position: number
  active: boolean
}

export interface CouponT {
  id: string
  code: string
  type: CouponType
  value: number
  minOrderAmount: number | null
  maxUses: number | null
  usedCount: number
  expiresAt: string | null
  active: boolean
}

export interface AddressT {
  id: string
  label: string | null
  fullName: string
  phone: string
  addressLine1: string
  city: string
  district: string
  postalCode: string | null
  isDefault: boolean
}

export interface OrderT {
  id: string
  customerId: string
  status: OrderStatus
  paymentMethod: PaymentMethod
  paymentStatus: PaymentStatus
  total: number
  shippingAddress: Record<string, unknown> | null
  couponCode: string | null
  createdAt: string
  items?: Array<{
    id: string
    productId: string
    quantity: number
    unitPrice: number
    product?: { id: string; title: string; slug: string } | null
  }>
}

export interface PageT {
  id: string
  title: string
  slug: string
  blocks: BlockT[] | null
  status: PageStatus
  seoTitle: string | null
  seoDescription: string | null
  createdAt: string
}

export interface BlockT {
  id: string
  type: string
  props: Record<string, unknown>
}

export interface AuditLogT {
  id: string
  actorId: string | null
  action: string
  entityType: string | null
  entityId: string | null
  metadata: Record<string, unknown> | null
  ipAddress: string | null
  createdAt: string
  actor?: { id: string; email: string; fullName: string | null } | null
}

export interface UserT {
  id: string
  email: string
  fullName: string | null
  role: Role
  phone: string | null
  createdAt: string
}

export interface ImportJobT {
  id: string
  source: string
  status: string
  total: number
  done: number
  createdAt: string
}

export interface CartItem {
  productId: string
  title: string
  slug: string
  price: number
  quantity: number
  image: string | null
  variant?: Record<string, string>
  stock: number
}
