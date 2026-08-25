'use client'

import { Header } from '@/components/storefront/Header'
import { Footer } from '@/components/storefront/Footer'
import { CartDrawer } from '@/components/storefront/CartDrawer'
import { QuickViewModal } from '@/components/storefront/QuickViewModal'
import { BackToTop } from '@/components/storefront/BackToTop'
import { CompareBar } from '@/components/storefront/CompareBar'
import { useRoute } from '@/lib/router'
import { HomeView } from '@/components/storefront/views/HomeView'
import { CategoryView } from '@/components/storefront/views/CategoryView'
import { ProductView } from '@/components/storefront/views/ProductView'
import { SearchView } from '@/components/storefront/views/SearchView'
import { CartView } from '@/components/storefront/views/CartView'
import { CheckoutView } from '@/components/storefront/views/CheckoutView'
import { OrderSuccessView } from '@/components/storefront/views/OrderSuccessView'
import { AuthView } from '@/components/storefront/views/AuthView'
import { AccountView } from '@/components/storefront/views/AccountView'
import { CmsPageView } from '@/components/storefront/views/CmsPageView'
import { CompareView } from '@/components/storefront/views/CompareView'

export function StorefrontShell() {
  const route = useRoute()
  const seg = route.segments

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      <main className="flex-1">
        <RouterOutlet seg={seg} query={route.query} />
      </main>
      <Footer />
      {/* Global overlays — always mounted */}
      <CartDrawer />
      <QuickViewModal />
      <CompareBar />
      <BackToTop />
    </div>
  )
}

function RouterOutlet({ seg, query }: { seg: string[]; query: Record<string, string> }) {
  // Home
  if (seg.length === 0) return <HomeView />

  const root = seg[0]

  // Category / product / order (single-param views)
  if (root === 'category' && seg[1]) {
    return <CategoryView slug={seg[1]} sub={seg[2]} />
  }
  if (root === 'product' && seg[1]) {
    return <ProductView slug={seg[1]} />
  }
  if (root === 'search') {
    return <SearchView q={query.q} tag={query.tag} featured={query.featured} />
  }
  if (root === 'cart') return <CartView />
  if (root === 'compare') return <CompareView />
  if (root === 'checkout') return <CheckoutView />
  if (root === 'order' && seg[1]) return <OrderSuccessView id={seg[1]} />
  if (root === 'login') return <AuthView mode="login" />
  if (root === 'register') return <AuthView mode="register" />

  // Account area
  if (root === 'account') {
    return <AccountView tab={seg[1] || 'profile'} />
  }

  // CMS catch-all (single slug) — keep LAST so it doesn't shadow other routes
  if (seg.length === 1) {
    return <CmsPageView slug={seg[0]} />
  }

  // 404
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 text-center">
      <h1 className="text-2xl font-bold text-ink-900">404 — Page Not Found</h1>
      <p className="mt-2 text-sm text-ink-400">The page you’re looking for doesn’t exist.</p>
      <a href="#/" className="mt-4 inline-block text-sm font-semibold text-brand-600 hover:underline">
        Back to home
      </a>
    </div>
  )
}
