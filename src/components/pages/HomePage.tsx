'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { ArrowRight, ChevronLeft, ChevronRight, Clock, Quote, Star, Zap, TrendingUp, Sparkles, Truck, Shield, Headphones } from 'lucide-react';
import ProductCard from '@/components/shared/ProductCard';
import { useNavigationStore } from '@/lib/store';
import { Button } from '@/components/ui/button';

interface Category {
  id: string;
  name: string;
  slug: string;
  image?: string | null;
  _count: { products: number; children: number };
}

interface Product {
  id: string;
  title: string;
  slug: string;
  price: number;
  compareAtPrice?: number;
  images: { url: string; altText?: string; position: number }[];
  category?: { id: string; name: string; slug: string } | null;
  avgRating: number;
  reviewCount: number;
  stockQuantity: number;
  isFeatured?: boolean;
  isBestSeller?: boolean;
  isNewArrival?: boolean;
  isTrending?: boolean;
}

interface Section {
  id: string;
  type: string;
  title?: string | null;
  config: string;
  position: number;
}

const TESTIMONIALS = [
  {
    name: 'Sarah Ahmed',
    role: 'Verified Buyer',
    text: 'Absolutely love the quality of products from ShopNova. Fast delivery and excellent customer service. Will definitely shop again!',
    rating: 5,
  },
  {
    name: 'Rahim Uddin',
    role: 'Repeat Customer',
    text: 'The electronics section has amazing deals. Got my wireless earbuds at half price during the flash sale. Highly recommended!',
    rating: 5,
  },
  {
    name: 'Nusrat Jahan',
    role: 'Verified Buyer',
    text: 'ShopNova has become my go-to online store. The product range is fantastic and shipping is always on time. Great experience overall!',
    rating: 4,
  },
];

export default function HomePage() {
  const navigate = useNavigationStore((s) => s.navigate);
  const [sections, setSections] = useState<Section[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [productSections, setProductSections] = useState<Record<string, Product[]>>({});
  const [loading, setLoading] = useState(true);
  const [flashSaleEnd, setFlashSaleEnd] = useState<number>(0);

  useEffect(() => {
    const now = Date.now();
    const midnight = new Date();
    midnight.setHours(23, 59, 59, 999);
    setFlashSaleEnd(midnight.getTime());

    async function fetchData() {
      try {
        const [sectionsRes, categoriesRes] = await Promise.all([
          fetch('/api/homepage'),
          fetch('/api/categories'),
        ]);
        const sectionsData = await sectionsRes.json();
        const categoriesData = await categoriesRes.json();

        const fetchedSections: Section[] = sectionsData.sections || [];
        setSections(fetchedSections);
        const cats: Category[] = categoriesData.categories || [];
        setCategories(cats);

        // Determine which product sections we need to fetch
        const productFetches: Promise<void>[] = [];
        const neededSections = ['featured_products', 'best_sellers', 'new_arrivals', 'trending_products', 'flash_sale'];

        for (const section of fetchedSections) {
          if (neededSections.includes(section.type)) {
            let url = '/api/products?limit=8&status=published';
            if (section.type === 'featured_products') url += '&featured=true';
            else if (section.type === 'best_sellers') url += '&bestSeller=true';
            else if (section.type === 'new_arrivals') url += '&newArrival=true';
            else if (section.type === 'trending_products') url += '&trending=true';
            else if (section.type === 'flash_sale') url += '&sort=price_asc';

            productFetches.push(
              fetch(url)
                .then(r => r.json())
                .then(data => {
                  let products = data.products || [];
                  if (section.type === 'flash_sale') {
                    products = products.filter((p: Product) => p.compareAtPrice && p.compareAtPrice > p.price);
                  }
                  setProductSections(prev => ({ ...prev, [section.type]: products }));
                })
                .catch(() => {})
            );
          }
        }

        await Promise.all(productFetches);
      } catch (err) {
        console.error('Homepage fetch error:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  // Flash sale countdown
  const [timeLeft, setTimeLeft] = useState({ hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    if (!flashSaleEnd) return;
    const timer = setInterval(() => {
      const diff = Math.max(0, flashSaleEnd - Date.now());
      setTimeLeft({
        hours: Math.floor(diff / 3600000),
        minutes: Math.floor((diff % 3600000) / 60000),
        seconds: Math.floor((diff % 60000) / 1000),
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [flashSaleEnd]);

  const flashSaleRef = useCallback((node: HTMLDivElement | null) => {
    if (node) {
      const interval = setInterval(() => {
        if (node.scrollLeft + node.clientWidth >= node.scrollWidth - 10) {
          node.scrollTo({ left: 0, behavior: 'smooth' });
        } else {
          node.scrollBy({ left: 300, behavior: 'smooth' });
        }
      }, 4000);
      node.addEventListener('mouseenter', () => clearInterval(interval));
      return () => clearInterval(interval);
    }
  }, []);

  const renderSection = (section: Section) => {
    switch (section.type) {
      case 'hero_banner':
        return <HeroBanner key={section.id} section={section} />;
      case 'featured_categories':
        return <FeaturedCategories key={section.id} categories={categories} />;
      case 'flash_sale':
        return (
          <FlashSaleSection
            key={section.id}
            products={productSections.flash_sale || []}
            timeLeft={timeLeft}
            scrollRef={flashSaleRef}
          />
        );
      case 'featured_products':
        return (
          <ProductSection
            key={section.id}
            title={section.title || 'Featured Products'}
            products={productSections.featured_products || []}
            icon={<Sparkles className="h-6 w-6" />}
          />
        );
      case 'best_sellers':
        return (
          <ProductSection
            key={section.id}
            title={section.title || 'Best Sellers'}
            products={productSections.best_sellers || []}
            icon={<TrendingUp className="h-6 w-6" />}
          />
        );
      case 'new_arrivals':
        return (
          <ProductSection
            key={section.id}
            title={section.title || 'New Arrivals'}
            products={productSections.new_arrivals || []}
            icon={<Zap className="h-6 w-6" />}
          />
        );
      case 'promotional_banner':
        return <PromoBanner key={section.id} section={section} />;
      case 'trending_products':
        return (
          <ProductSection
            key={section.id}
            title={section.title || 'Trending Now'}
            products={productSections.trending_products || []}
            icon={<TrendingUp className="h-6 w-6" />}
          />
        );
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-20 py-8">
        <div className="h-80 bg-gray-200 rounded-2xl" />
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-16">
          <div className="h-6 w-48 bg-gray-200 rounded" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-48 bg-gray-200 rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="pb-0">
      {/* Render dynamic sections */}
      {sections.map(renderSection)}

      {/* Features Bar */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {[
            { icon: Truck, title: 'Free Shipping', desc: 'On orders over ৳2,000' },
            { icon: Shield, title: 'Secure Payment', desc: '100% protected checkout' },
            { icon: Headphones, title: '24/7 Support', desc: 'Dedicated customer service' },
          ].map((f) => (
            <div
              key={f.title}
              className="flex items-center gap-4 p-5 rounded-xl border bg-white"
            >
              <div className="h-12 w-12 rounded-lg bg-emerald-50 flex items-center justify-center shrink-0">
                <f.icon className="h-6 w-6 text-emerald-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 text-sm">{f.title}</h3>
                <p className="text-sm text-gray-500">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Testimonials */}
      <div className="bg-gray-50 py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">What Our Customers Say</h2>
            <p className="text-gray-500 mt-2">Real reviews from real buyers</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {TESTIMONIALS.map((t) => (
              <div
                key={t.name}
                className="bg-white rounded-xl border p-6 relative"
              >
                <Quote className="h-8 w-8 text-emerald-200 mb-4" />
                <p className="text-gray-600 text-sm leading-relaxed mb-6">&ldquo;{t.text}&rdquo;</p>
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-emerald-100 flex items-center justify-center">
                    <span className="text-emerald-700 font-semibold text-sm">
                      {t.name.split(' ').map(n => n[0]).join('')}
                    </span>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 text-sm">{t.name}</p>
                    <p className="text-xs text-gray-400">{t.role}</p>
                  </div>
                  <div className="ml-auto flex gap-0.5">
                    {Array.from({ length: t.rating }).map((_, i) => (
                      <Star key={i} className="h-3.5 w-3.5 text-amber-400 fill-amber-400" />
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Hero Banner ─────────────────────────────────────────

function HeroBanner({ section }: { section: Section }) {
  const navigate = useNavigationStore((s) => s.navigate);
  let config: Record<string, string> = {};
  try { config = JSON.parse(section.config); } catch { /* empty */ }

  const subtitle = config.subtitle || config.title || 'Discover Premium Products';
  const ctaText = config.ctaText || 'Shop Now';
  const ctaLink = config.ctaLink || '';

  return (
    <div className="relative overflow-hidden bg-gradient-to-br from-emerald-600 via-emerald-700 to-teal-800">
      {/* Decorative shapes */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-24 -right-24 h-96 w-96 rounded-full bg-white/5" />
        <div className="absolute top-1/2 -left-16 h-64 w-64 rounded-full bg-white/5" />
        <div className="absolute bottom-0 right-1/4 h-48 w-48 rounded-full bg-white/5" />
        <div className="absolute top-20 right-1/3 h-24 w-24 rounded-full bg-white/10" />
        {/* Grid pattern overlay */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}
        />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20 sm:py-28 lg:py-36">
        <div className="max-w-2xl">
          <span className="inline-block bg-white/20 text-white text-sm font-medium px-4 py-1.5 rounded-full mb-6 backdrop-blur-sm">
            Welcome to ShopNova
          </span>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white leading-tight">
            {subtitle}
          </h1>
          <p className="mt-4 text-lg text-emerald-100 max-w-lg">
            Explore our curated collection of electronics, fashion, home essentials, and beauty products at unbeatable prices.
          </p>
          <div className="mt-8 flex flex-wrap gap-4">
            <Button
              size="lg"
              className="bg-white text-emerald-700 hover:bg-emerald-50 rounded-lg font-semibold"
              onClick={() => {
                if (ctaLink) navigate('shop', {});
                else navigate('shop', {});
              }}
            >
              {ctaText}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="border-white/30 text-white hover:bg-white/10 rounded-lg"
              onClick={() => navigate('categories')}
            >
              Browse Categories
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Featured Categories ──────────────────────────────────

function FeaturedCategories({ categories }: { categories: Category[] }) {
  const navigate = useNavigationStore((s) => s.navigate);
  const parentCats = categories.filter(c => !c.parentId && c._count.products > 0);

  const categoryColors = [
    'bg-emerald-50 text-emerald-700',
    'bg-orange-50 text-orange-700',
    'bg-violet-50 text-violet-700',
    'bg-rose-50 text-rose-700',
  ];

  const categoryIcons = ['💻', '👗', '🏠', '💄'];

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16 sm:py-20">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">Shop by Category</h2>
          <p className="text-gray-500 mt-1">Find what you&apos;re looking for</p>
        </div>
        <Button
          variant="ghost"
          className="hidden sm:flex items-center gap-1 text-emerald-600 hover:text-emerald-700"
          onClick={() => navigate('categories')}
        >
          View All <ArrowRight className="h-4 w-4" />
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
        {parentCats.slice(0, 8).map((cat, idx) => (
          <button
            key={cat.id}
            onClick={() => navigate('shop', { category: cat.slug })}
            className="group bg-white rounded-xl border p-6 text-center hover:shadow-md transition-all duration-300 hover:-translate-y-0.5"
          >
            <div className={`h-16 w-16 rounded-2xl ${categoryColors[idx % categoryColors.length]} flex items-center justify-center mx-auto mb-4 text-2xl`}>
              {categoryIcons[idx % categoryIcons.length]}
            </div>
            <h3 className="font-semibold text-gray-900 text-sm">{cat.name}</h3>
            <p className="text-xs text-gray-500 mt-1">{cat._count.products} Products</p>
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Flash Sale Section ──────────────────────────────────

function FlashSaleSection({
  products,
  timeLeft,
  scrollRef,
}: {
  products: Product[];
  timeLeft: { hours: number; minutes: number; seconds: number };
  scrollRef: (node: HTMLDivElement | null) => void;
}) {
  const navigate = useNavigationStore((s) => s.navigate);

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Clock className="h-5 w-5 text-red-500" />
            Flash Sale
          </h2>
          <p className="text-gray-500 mt-1 text-sm">Hurry up! Deals end soon.</p>
        </div>
        <div className="flex items-center gap-2">
          {[
            { val: timeLeft.hours, label: 'Hrs' },
            { val: timeLeft.minutes, label: 'Min' },
            { val: timeLeft.seconds, label: 'Sec' },
          ].map((t) => (
            <div key={t.label} className="bg-gray-900 text-white rounded-lg px-3 py-1.5 text-center min-w-[48px]">
              <span className="text-lg font-bold">
                {String(t.val).padStart(2, '0')}
              </span>
              <span className="text-[10px] text-gray-400 block">{t.label}</span>
            </div>
          ))}
        </div>
      </div>

      {products.length > 0 ? (
        <div ref={scrollRef} className="flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory scrollbar-hide">
          {products.map((product) => (
            <div key={product.id} className="snap-start shrink-0 w-48 sm:w-56">
              <ProductCard
                id={product.id}
                title={product.title}
                price={product.price}
                compareAtPrice={product.compareAtPrice}
                images={product.images?.map((img) => img.url)}
                category={product.category?.name}
                avgRating={product.avgRating}
                reviewCount={product.reviewCount}
                stockQuantity={product.stockQuantity}
                isFeatured={product.isFeatured}
              />
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 text-gray-400">
          <p className="text-sm">No flash sale items right now.</p>
        </div>
      )}
    </div>
  );
}

// ─── Product Section ────────────────────────────────────

function ProductSection({
  title,
  products,
  icon,
}: {
  title: string;
  products: Product[];
  icon: React.ReactNode;
}) {
  const navigate = useNavigationStore((s) => s.navigate);

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
            {icon}
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900">{title}</h2>
        </div>
        <Button
          variant="ghost"
          className="hidden sm:flex items-center gap-1 text-emerald-600 hover:text-emerald-700"
          onClick={() => navigate('shop')}
        >
          View All <ArrowRight className="h-4 w-4" />
        </Button>
      </div>

      {products.length > 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {products.slice(0, 8).map((product) => (
            <ProductCard
              key={product.id}
              id={product.id}
              title={product.title}
              price={product.price}
              compareAtPrice={product.compareAtPrice}
              images={product.images?.map((img) => img.url)}
              category={product.category?.name}
              avgRating={product.avgRating}
              reviewCount={product.reviewCount}
              stockQuantity={product.stockQuantity}
              isFeatured={product.isFeatured}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-12 text-gray-400">
          <p className="text-sm">No products available in this section.</p>
        </div>
      )}
    </div>
  );
}

// ─── Promo Banner ────────────────────────────────────────

function PromoBanner({ section }: { section: Section }) {
  const navigate = useNavigationStore((s) => s.navigate);
  let config: Record<string, string> = {};
  try { config = JSON.parse(section.config); } catch { /* empty */ }

  const title = config.title || 'Special Offer';
  const subtitle = config.subtitle || config.description || 'Shop our latest deals and offers.';
  const bgClass = config.bgColor || 'bg-gradient-to-r from-orange-500 to-rose-500';

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
      <div
        className={`${bgClass} rounded-2xl p-8 sm:p-12 text-white cursor-pointer hover:opacity-95 transition-opacity`}
        onClick={() => navigate('shop')}
      >
        <div className="max-w-lg">
          <h2 className="text-2xl sm:text-3xl font-bold">{title}</h2>
          <p className="text-white/80 mt-2">{subtitle}</p>
          <Button
            className="mt-6 bg-white text-gray-900 hover:bg-gray-100 rounded-lg font-semibold"
          >
            Shop Now <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
