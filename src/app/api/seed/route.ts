// POST /api/seed — idempotent seeding of demo catalog, banners, coupons, a CMS
// page, and an admin + customer account. Safe to call multiple times.
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { hashPassword } from '@/lib/auth'
import { apiSlug } from '@/lib/server-utils'

// Deterministic placeholder image using a colored SVG data URI — fully offline,
// no external requests needed. Variants by index for visual variety.
function placeholder(label: string, hue: number): string {
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='600' height='600'>
    <defs>
      <linearGradient id='g' x1='0' y1='0' x2='1' y2='1'>
        <stop offset='0%' stop-color='hsl(${hue},70%,55%)'/>
        <stop offset='100%' stop-color='hsl(${(hue + 40) % 360},70%,35%)'/>
      </linearGradient>
    </defs>
    <rect width='600' height='600' fill='url(#g)'/>
    <text x='300' y='320' font-family='sans-serif' font-size='38' font-weight='700' fill='white' text-anchor='middle'>${label}</text>
  </svg>`
  return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg)
}

const PRODUCT_DEFS: Array<{
  title: string
  description: string
  price: number
  compareAt?: number
  stock: number
  categoryName: string
  brandName: string
  tags: string[]
  specs: Record<string, string>
  attrs?: Record<string, string[]>
  hue: number
}> = [
  {
    title: 'Samsung Galaxy A55 5G (8GB/128GB)',
    description:
      'Samsung Galaxy A55 5G with a 6.6" Super AMOLED display, Exynos 1480 processor, 50MP OIS camera, and 5000mAh battery. Built for premium mid-range performance with Gorilla Glass Victus+ protection.',
    price: 42999,
    compareAt: 49999,
    stock: 24,
    categoryName: 'Electronics',
    brandName: 'Samsung',
    tags: ['smartphone', '5g', 'featured'],
    specs: { Display: '6.6" Super AMOLED', Processor: 'Exynos 1480', RAM: '8GB', Storage: '128GB', Battery: '5000mAh', Camera: '50MP OIS' },
    attrs: { Color: ['Navy Blue', 'Iceblue', 'Lilac'] },
    hue: 210,
  },
  {
    title: 'Apple iPhone 15 (128GB)',
    description:
      'iPhone 15 features the A16 Bionic chip, a 6.1" Super Retina XDR display, 48MP main camera with 2x telephoto, and USB-C. Dynamic Island brings alerts and Live Activities front and center.',
    price: 134999,
    compareAt: 144999,
    stock: 15,
    categoryName: 'Electronics',
    brandName: 'Apple',
    tags: ['smartphone', 'featured'],
    specs: { Display: '6.1" Super Retina XDR', Chip: 'A16 Bionic', Storage: '128GB', Camera: '48MP', Connectivity: '5G, USB-C' },
    attrs: { Color: ['Pink', 'Blue', 'Green', 'Yellow', 'Black'] },
    hue: 340,
  },
  {
    title: 'Xiaomi Redmi Note 13 Pro',
    description:
      'Redmi Note 13 Pro with 200MP camera, 6.67" AMOLED 120Hz display, and 67W turbo charging. Stunning photography and all-day battery life at an unbeatable price.',
    price: 28999,
    stock: 40,
    categoryName: 'Electronics',
    brandName: 'Xiaomi',
    tags: ['smartphone', '5g'],
    specs: { Display: '6.67" AMOLED 120Hz', Camera: '200MP', Battery: '5100mAh', Charging: '67W' },
    hue: 12,
  },
  {
    title: 'Sony WH-1000XM5 Wireless Headphones',
    description:
      'Industry-leading noise cancellation with two processors and eight microphones. 30-hour battery life, crystal-clear hands-free calling, and multipoint connection.',
    price: 39900,
    compareAt: 44900,
    stock: 18,
    categoryName: 'Electronics',
    brandName: 'Sony',
    tags: ['audio', 'featured'],
    specs: { Type: 'Over-ear', 'Noise Cancelling': 'Yes (Adaptive)', Battery: '30 hours', Connectivity: 'Bluetooth 5.2' },
    hue: 260,
  },
  {
    title: 'Nike Air Force 1 Sneakers',
    description:
      'The Nike Air Force 1 — a classic since 1982. Genuine leather upper, Nike Air cushioning, and a rubber outsole for durable comfort. Iconic style that goes with everything.',
    price: 8990,
    compareAt: 10990,
    stock: 50,
    categoryName: 'Fashion',
    brandName: 'Nike',
    tags: ['shoes', 'featured'],
    specs: { Material: 'Genuine Leather', Sole: 'Rubber', Cushioning: 'Nike Air' },
    attrs: { Size: ['40', '41', '42', '43', '44'], Color: ['White', 'Black'] },
    hue: 0,
  },
  {
    title: "Levi's 511 Slim Fit Jeans",
    description:
      "Levi's 511 slim fit jeans crafted from stretch denim for all-day comfort. A modern slim silhouette that sits below the waist with a slim leg.",
    price: 3499,
    compareAt: 4999,
    stock: 35,
    categoryName: 'Fashion',
    brandName: "Levi's",
    tags: ['clothing'],
    specs: { Fit: 'Slim', Material: '98% Cotton, 2% Elastane', Rise: 'Mid' },
    attrs: { Size: ['30', '32', '34', '36'], Color: ['Dark Indigo', 'Black'] },
    hue: 220,
  },
  {
    title: 'Instant Pot Duo 7-in-1 Pressure Cooker',
    description:
      '7 appliances in 1: pressure cooker, slow cooker, rice cooker, steamer, sauté pan, yogurt maker, and warmer. 13 quick one-touch programs for effortless meals.',
    price: 9990,
    compareAt: 12990,
    stock: 28,
    categoryName: 'Home & Kitchen',
    brandName: 'Instant Pot',
    tags: ['appliance', 'featured'],
    specs: { Capacity: '6 Liters', Programs: '13 one-touch', Material: 'Stainless Steel' },
    hue: 30,
  },
  {
    title: 'Philips Air Fryer HD9252 (4.1L)',
    description:
      'Philips Air Fryer with Rapid Air technology cooks food with little to no added oil. 4.1L capacity feeds up to 4 people. Easy to clean dishwasher-safe parts.',
    price: 12990,
    stock: 22,
    categoryName: 'Home & Kitchen',
    brandName: 'Philips',
    tags: ['appliance'],
    specs: { Capacity: '4.1L', Technology: 'Rapid Air', Power: '1400W' },
    hue: 200,
  },
  {
    title: 'Nivea Body Lotion (400ml)',
    description:
      'Nivea Nourishing Body Milk with almond oil provides 48h deep moisture for dry skin. Dermatologically tested, fast-absorbing, non-greasy formula.',
    price: 540,
    compareAt: 690,
    stock: 120,
    categoryName: 'Beauty',
    brandName: 'Nivea',
    tags: ['skincare'],
    specs: { Volume: '400ml', Skin: 'Dry', Fragrance: 'Almond' },
    hue: 320,
  },
  {
    title: 'Maybelline Fit Me Foundation',
    description:
      'Maybelline Fit Me Matte + Poreless foundation normalizes oily skin and refines pores for a natural matte finish. Lightweight, breathable coverage.',
    price: 720,
    compareAt: 890,
    stock: 80,
    categoryName: 'Beauty',
    brandName: 'Maybelline',
    tags: ['makeup'],
    specs: { Shade: '220 Natural Beige', Finish: 'Matte', Volume: '30ml' },
    attrs: { Shade: ['115 Ivory', '220 Natural Beige', '330 Toffee', '355 Coconut'] },
    hue: 25,
  },
  {
    title: 'Logitech MX Master 3S Wireless Mouse',
    description:
      'Logitech MX Master 3S — ultra-quiet clicks, 8000 DPI sensor, MagSpeed scrolling, and cross-computer control across 3 devices. 70-day battery on a single charge.',
    price: 8990,
    compareAt: 9990,
    stock: 30,
    categoryName: 'Electronics',
    brandName: 'Logitech',
    tags: ['accessory', 'featured'],
    specs: { DPI: '8000', Buttons: '7', Battery: '70 days', Connectivity: 'Bluetooth + USB' },
    hue: 150,
  },
  {
    title: 'TCL 43" 4K UHD Smart Android TV',
    description:
      'TCL 43-inch 4K UHD HDR Smart TV with Android TV. Built-in Google Assistant, Dolby Audio, and access to thousands of apps via Google Play.',
    price: 38990,
    compareAt: 44990,
    stock: 12,
    categoryName: 'Electronics',
    brandName: 'TCL',
    tags: ['tv'],
    specs: { Size: '43 inch', Resolution: '4K UHD', 'Smart TV': 'Android', HDR: 'HDR10+' },
    hue: 195,
  },
  {
    title: 'Adidas Ultraboost Running Shoes',
    description:
      'Adidas Ultraboost with responsive BOOST cushioning, Primeknit upper, and Continental rubber outsole for grip in all conditions. Energy return with every step.',
    price: 15990,
    compareAt: 18990,
    stock: 25,
    categoryName: 'Fashion',
    brandName: 'Adidas',
    tags: ['shoes', 'featured'],
    specs: { Cushioning: 'BOOST', Upper: 'Primeknit', Outsole: 'Continental Rubber' },
    attrs: { Size: ['40', '41', '42', '43', '44', '45'], Color: ['Core Black', 'Cloud White'] },
    hue: 280,
  },
  {
    title: 'Prestige Non-Stick Cookware Set (8pcs)',
    description:
      'Prestige 8-piece non-stick cookware set — durable, healthy cooking with minimal oil. Includes frying pan, saucepan, kadhai with lid, and more.',
    price: 4990,
    compareAt: 6990,
    stock: 33,
    categoryName: 'Home & Kitchen',
    brandName: 'Prestige',
    tags: ['cookware'],
    specs: { Pieces: '8', Coating: 'Non-stick', Compatible: 'Gas + Induction' },
    hue: 15,
  },
  {
    title: 'JBL Flip 6 Portable Bluetooth Speaker',
    description:
      'JBL Flip 6 — bold JBL Original Pro Sound in a portable IP67 waterproof design. 12 hours of playtime, PartyBoost to pair multiple speakers.',
    price: 12990,
    compareAt: 14990,
    stock: 27,
    categoryName: 'Electronics',
    brandName: 'JBL',
    tags: ['audio'],
    specs: { Battery: '12 hours', Waterproof: 'IP67', Output: '30W' },
    hue: 175,
  },
  {
    title: 'Garnier Men Face Wash (100ml)',
    description:
      'Garnier Men Powerlight Charcoal face wash deeply cleanses, removes excess oil, and detoxifies for clear, fresh skin in one wash.',
    price: 290,
    compareAt: 390,
    stock: 200,
    categoryName: 'Beauty',
    brandName: 'Garnier',
    tags: ['grooming'],
    specs: { Volume: '100ml', 'Skin Type': 'Oily', Key: 'Charcoal' },
    hue: 95,
  },
]

const CATEGORIES = [
  { name: 'Electronics', hue: 210, subs: ['Smartphones', 'Audio', 'TVs', 'Accessories'] },
  { name: 'Fashion', hue: 0, subs: ['Men', 'Women', 'Shoes'] },
  { name: 'Home & Kitchen', hue: 30, subs: ['Appliances', 'Cookware'] },
  { name: 'Beauty', hue: 320, subs: ['Skincare', 'Makeup', 'Grooming'] },
]

export async function POST() {
  // Idempotency: skip if products already exist.
  const existingCount = await db.product.count()
  if (existingCount > 0) {
    return NextResponse.json({ ok: true, message: 'already seeded', count: existingCount })
  }

  // 1. Users — admin + demo customer
  const admin = await db.user.upsert({
    where: { email: 'admin@bdshop.com' },
    update: {},
    create: {
      email: 'admin@bdshop.com',
      passwordHash: await hashPassword('admin123'),
      fullName: 'Store Admin',
      role: 'admin',
      profile: { create: { email: 'admin@bdshop.com', fullName: 'Store Admin', role: 'admin' } },
    },
  })
  const customer = await db.user.upsert({
    where: { email: 'customer@bdshop.com' },
    update: {},
    create: {
      email: 'customer@bdshop.com',
      passwordHash: await hashPassword('customer123'),
      fullName: 'Demo Customer',
      role: 'customer',
      profile: { create: { email: 'customer@bdshop.com', fullName: 'Demo Customer', role: 'customer' } },
    },
  })

  // 2. Categories (with subcategories)
  const catMap = new Map<string, string>()
  for (const c of CATEGORIES) {
    const cat = await db.category.create({
      data: { name: c.name, slug: apiSlug(c.name), imageUrl: placeholder(c.name, c.hue) },
    })
    catMap.set(c.name, cat.id)
    for (const sub of c.subs) {
      const subCat = await db.category.create({
        data: { name: sub, slug: apiSlug(sub), parentId: cat.id, imageUrl: placeholder(sub, (c.hue + 20) % 360) },
      })
      catMap.set(`${c.name}/${sub}`, subCat.id)
    }
  }

  // 3. Brands
  const brandNames = Array.from(new Set(PRODUCT_DEFS.map((p) => p.brandName)))
  const brandMap = new Map<string, string>()
  for (const name of brandNames) {
    const b = await db.brand.create({
      data: { name, slug: apiSlug(name), logoUrl: placeholder(name, 0) },
    })
    brandMap.set(name, b.id)
  }

  // 4. Products
  for (const p of PRODUCT_DEFS) {
    const slug = apiSlug(p.title)
    const product = await db.product.create({
      data: {
        title: p.title,
        slug,
        description: p.description,
        specifications: p.specs,
        attributes: p.attrs || null,
        tags: p.tags,
        categoryId: catMap.get(p.categoryName)!,
        brandId: brandMap.get(p.brandName)!,
        price: p.price,
        compareAtPrice: p.compareAt ?? null,
        stockQuantity: p.stock,
        sku: slug.toUpperCase().replace(/-/g, '').slice(0, 12),
        status: 'published',
        source: 'manual',
        createdBy: admin.id,
        images: {
          create: [
            { url: placeholder(p.title.split(' ').slice(0, 2).join(' '), p.hue), altText: p.title, position: 0 },
            { url: placeholder('View 2', (p.hue + 60) % 360), altText: `${p.title} view 2`, position: 1 },
          ],
        },
      },
    })
    void product
  }

  // 5. Banners (hero carousel)
  const banners = [
    { title: 'Mega Electronics Sale', position: 0, hue: 210, link: '#/category/electronics' },
    { title: 'New Fashion Arrivals', position: 1, hue: 340, link: '#/category/fashion' },
    { title: 'Home & Kitchen Deals', position: 2, hue: 30, link: '#/category/home-kitchen' },
  ]
  for (const b of banners) {
    await db.banner.create({
      data: {
        title: b.title,
        imageUrl: placeholder(b.title, b.hue),
        linkUrl: b.link,
        position: b.position,
        active: true,
      },
    })
  }

  // 6. Coupons
  await db.coupon.createMany({
    data: [
      { code: 'WELCOME10', type: 'percentage', value: 10, minOrderAmount: 1000, active: true },
      { code: 'FLAT200', type: 'fixed', value: 200, minOrderAmount: 3000, active: true },
    ],
  })

  // 7. CMS page — "About Us" with a few blocks
  await db.page.create({
    data: {
      title: 'About Us',
      slug: 'about-us',
      status: 'published',
      seoTitle: 'About BDShop — Bangladesh Online Store',
      seoDescription: 'Learn about BDShop, Bangladesh’s trusted online marketplace.',
      createdBy: admin.id,
      blocks: [
        {
          id: 'b1',
          type: 'hero',
          props: {
            title: 'About BDShop',
            subtitle: 'Bangladesh’s trusted online marketplace since 2024.',
            ctaText: 'Shop Now',
            ctaHref: '#/',
            hue: 200,
          },
        },
        {
          id: 'b2',
          type: 'richtext',
          props: {
            content:
              '## Our Story\n\nBDShop was founded to make online shopping simple, affordable, and reliable for every Bangladeshi household. From the latest smartphones to everyday essentials, we deliver quality products to your doorstep across all 64 districts.\n\n## Why Shop With Us\n\n- Genuine products with warranty\n- Cash on delivery available nationwide\n- Fast delivery in Dhaka within 24 hours\n- Easy returns within 7 days',
          },
        },
        {
          id: 'b3',
          type: 'faq',
          props: {
            items: [
              { q: 'How long does delivery take?', a: 'Dhaka: 24-48 hours. Other districts: 2-5 days.' },
              { q: 'What payment methods are supported?', a: 'Cash on Delivery, bKash, Nagad, Rocket, and SSLCommerz cards.' },
              { q: 'Can I return a product?', a: 'Yes, within 7 days of delivery for eligible items.' },
            ],
          },
        },
      ],
    },
  })

  // 8. A second CMS page using product grid + testimonials
  await db.page.create({
    data: {
      title: 'Deals',
      slug: 'deals',
      status: 'published',
      seoTitle: 'Best Deals — BDShop',
      seoDescription: 'Today’s best deals and discounts on BDShop.',
      createdBy: admin.id,
      blocks: [
        {
          id: 'd1',
          type: 'hero',
          props: { title: 'Today’s Deals', subtitle: 'Save big on top brands.', ctaText: 'Browse', ctaHref: '#/', hue: 12 },
        },
        {
          id: 'd2',
          type: 'product_grid',
          props: { tag: 'featured', limit: 8, title: 'Featured Deals' },
        },
        {
          id: 'd3',
          type: 'testimonials',
          props: {
            items: [
              { name: 'Rahim Uddin', text: 'Fast delivery and genuine products. Highly recommended!', role: 'Dhaka' },
              { name: 'Sadia Islam', text: 'Best prices I found anywhere. Will shop again.', role: 'Chattogram' },
              { name: 'Karim Ahmed', text: 'Easy returns and great customer support.', role: 'Sylhet' },
            ],
          },
        },
      ],
    },
  })

  // 9. A sample review on the first product
  const firstProduct = await db.product.findFirst()
  if (firstProduct) {
    await db.review.create({
      data: {
        productId: firstProduct.id,
        userId: customer.id,
        rating: 5,
        title: 'Excellent product!',
        body: 'Exactly as described, fast delivery. Very happy with the purchase.',
      },
    })
  }

  // 10. A demo AI import draft for the admin review UI
  await db.aiImportDraft.create({
    data: {
      imageUrl: placeholder('AI Draft', 260),
      extractedData: {
        title: 'AI-Imported Wireless Earbuds Pro',
        description: 'AI-extracted: True wireless earbuds with ANC, 30h battery, USB-C charging.',
        price: 3490,
        stock: 50,
        confidence: 0.92,
      },
      status: 'pending',
      createdBy: admin.id,
    },
  })

  return NextResponse.json({
    ok: true,
    message: 'seeded',
    counts: {
      categories: catMap.size,
      brands: brandMap.size,
      products: PRODUCT_DEFS.length,
      banners: banners.length,
    },
    accounts: {
      admin: { email: 'admin@bdshop.com', password: 'admin123' },
      customer: { email: 'customer@bdshop.com', password: 'customer123' },
    },
  })
}
