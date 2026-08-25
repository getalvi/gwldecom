'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import {
  Search,
  ShoppingCart,
  User,
  Heart,
  Menu,
  X,
  ChevronDown,
  ChevronRight,
  LogOut,
  Package,
  MapPin,
  LayoutDashboard,
  Store,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetClose,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useCart } from '@/lib/cart'
import { useSession } from '@/lib/session-store'
import { useUi } from '@/lib/ui-store'
import { useRoute, navigate, href } from '@/lib/router'
import { api } from '@/lib/api'
import { useToast } from '@/hooks/use-toast'
import type { CategoryT } from '@/lib/types'

export function Header() {
  const cartCount = useCart((s) => s.count())
  const { user, logout } = useSession()
  const route = useRoute()
  const [q, setQ] = useState('')
  const [cats, setCats] = useState<CategoryT[]>([])
  const [tree, setTree] = useState<CategoryT[]>([])
  const [megaOpen, setMegaOpen] = useState(false)
  const [hoveredCat, setHoveredCat] = useState<string | null>(null)
  const [mobileCats, setMobileCats] = useState(false)
  const [wishlistCount, setWishlistCount] = useState(0)
  const openCart = useUi((s) => s.openCartDrawer)
  const { toast } = useToast()
  const searchRef = useRef<HTMLInputElement>(null)
  const megaRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    api<{ flat: CategoryT[]; tree: CategoryT[] }>('/api/categories')
      .then((r) => {
        setCats(r.flat.filter((c) => !c.parentId))
        setTree(r.tree)
      })
      .catch(() => {})
  }, [])

  // close mega-menu on click outside + on route change + on Escape
  useEffect(() => {
    if (!megaOpen) return
    function onClick(e: MouseEvent) {
      if (megaRef.current && !megaRef.current.contains(e.target as Node)) {
        setMegaOpen(false)
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setMegaOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [megaOpen])

  useEffect(() => {
    setMegaOpen(false)
  }, [route])

  // refresh wishlist count whenever user or route changes
  useEffect(() => {
    if (user) {
      api<any[]>('/api/wishlist')
        .then((items) => setWishlistCount(items.length))
        .catch(() => setWishlistCount(0))
    } else {
      setWishlistCount(0)
    }
  }, [user, route])

  // sync search box with route query when on search page
  useEffect(() => {
    if (route.segments[0] === 'search' && route.query.q) {
      setQ(route.query.q)
    }
  }, [route])

  const parentCats = cats.filter((c) => !c.parentId)

  function submitSearch(e: React.FormEvent) {
    e.preventDefault()
    const term = q.trim()
    navigate(term ? `/search?q=${encodeURIComponent(term)}` : '/search')
  }

  async function handleLogout() {
    await logout()
    toast({ title: 'Logged out' })
    navigate('/')
  }

  return (
    <header className="sticky top-0 z-40 border-b border-ink-100 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80">
      {/* top bar */}
      <div className="hidden bg-ink-900 text-ink-100 md:block">
        <div className="mx-auto flex h-8 max-w-7xl items-center justify-between px-4 text-xs">
          <span className="flex items-center gap-1.5">
            <MapPin size={12} /> Deliver to Dhaka 1207
          </span>
          <div className="flex items-center gap-4">
            <Link href={href('/about-us')} className="hover:text-brand-300">
              About
            </Link>
            <Link href={href('/deals')} className="hover:text-brand-300">
              Deals
            </Link>
            <span className="text-ink-400">|</span>
            <span>📞 16263 (9am–9pm)</span>
          </div>
        </div>
      </div>

      {/* main bar */}
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4">
        {/* mobile menu */}
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="md:hidden" aria-label="Menu">
              <Menu size={22} />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-72 p-0">
            <SheetHeader className="border-b border-ink-100 px-4 py-3">
              <SheetTitle className="text-left">Browse BDShop</SheetTitle>
            </SheetHeader>
            <div className="flex flex-col p-2">
              <SheetClose asChild>
                <Link
                  href={href('/')}
                  className="rounded-md px-3 py-2 text-sm font-medium hover:bg-ink-50"
                >
                  Home
                </Link>
              </SheetClose>
              {parentCats.map((c) => (
                <SheetClose asChild key={c.id}>
                  <Link
                    href={href(`/category/${c.slug}`)}
                    className="rounded-md px-3 py-2 text-sm hover:bg-ink-50"
                  >
                    {c.name}
                  </Link>
                </SheetClose>
              ))}
              <div className="my-2 border-t border-ink-100" />
              {user ? (
                <>
                  <SheetClose asChild>
                    <Link
                      href={href('/account/orders')}
                      className="flex items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-ink-50"
                    >
                      <Package size={16} /> My Orders
                    </Link>
                  </SheetClose>
                  <SheetClose asChild>
                    <Link
                      href={href('/account/wishlist')}
                      className="flex items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-ink-50"
                    >
                      <Heart size={16} /> Wishlist
                    </Link>
                  </SheetClose>
                  {(user.role === 'admin' || user.role === 'staff') && (
                    <SheetClose asChild>
                      <Link
                        href={href('/admin')}
                        className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-brand-600 hover:bg-brand-50"
                      >
                        <LayoutDashboard size={16} /> Admin Dashboard
                      </Link>
                    </SheetClose>
                  )}
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-left text-red-600 hover:bg-red-50"
                  >
                    <LogOut size={16} /> Logout
                  </button>
                </>
              ) : (
                <>
                  <SheetClose asChild>
                    <Link
                      href={href('/login')}
                      className="rounded-md px-3 py-2 text-sm font-medium text-brand-600 hover:bg-brand-50"
                    >
                      Login / Register
                    </Link>
                  </SheetClose>
                </>
              )}
            </div>
          </SheetContent>
        </Sheet>

        {/* logo */}
        <Link href={href('/')} className="flex shrink-0 items-center gap-2">
          <div className="grid h-9 w-9 place-items-center rounded-lg bg-brand-500 text-white shadow-sm">
            <Store size={20} />
          </div>
          <span className="text-xl font-extrabold tracking-tight text-ink-900">
            BD<span className="text-brand-500">Shop</span>
          </span>
        </Link>

        {/* search */}
        <form onSubmit={submitSearch} className="relative hidden flex-1 md:block">
          <Input
            ref={searchRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search for products, brands and categories..."
            className="h-10 border-ink-200 bg-ink-50 pr-20 focus-visible:bg-white focus-visible:border-brand-400"
          />
          <Button
            type="submit"
            size="sm"
            className="absolute right-1 top-1 h-8 bg-brand-500 hover:bg-brand-600"
          >
            <Search size={16} />
          </Button>
        </form>

        {/* right actions */}
        <div className="ml-auto flex items-center gap-1 md:gap-2">
          {/* wishlist */}
          <Link
            href={href('/account/wishlist')}
            className="relative hidden items-center gap-1.5 rounded-md px-2 py-1.5 text-sm text-ink-600 hover:bg-ink-50 hover:text-brand-600 sm:flex"
            aria-label="Wishlist"
          >
            <div className="relative">
              <Heart size={20} />
              {wishlistCount > 0 ? (
                <Badge className="absolute -right-2 -top-2 h-4 min-w-4 justify-center bg-brand-500 px-1 text-[9px] text-white">
                  {wishlistCount}
                </Badge>
              ) : null}
            </div>
            <span className="hidden lg:inline">Wishlist</span>
          </Link>

          {/* account */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm text-ink-600 hover:bg-ink-50 hover:text-brand-600">
                <User size={20} />
                <span className="hidden lg:inline">
                  {user ? user.fullName?.split(' ')[0] || 'Account' : 'Account'}
                </span>
                <ChevronDown size={14} className="hidden lg:inline opacity-60" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              {user ? (
                <>
                  <DropdownMenuLabel className="text-xs text-ink-400">
                    {user.email}
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href={href('/account')}>Profile</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href={href('/account/orders')}>My Orders</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href={href('/account/wishlist')}>Wishlist</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href={href('/account/addresses')}>Addresses</Link>
                  </DropdownMenuItem>
                  {(user.role === 'admin' || user.role === 'staff') && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem asChild>
                        <Link href={href('/admin')}>
                          <LayoutDashboard size={14} className="mr-2" /> Admin
                        </Link>
                      </DropdownMenuItem>
                    </>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout} className="text-red-600">
                    <LogOut size={14} className="mr-2" /> Logout
                  </DropdownMenuItem>
                </>
              ) : (
                <>
                  <DropdownMenuItem asChild>
                    <Link href={href('/login')}>Login</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href={href('/register')}>Create Account</Link>
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* cart */}
          <button
            onClick={openCart}
            className="relative flex items-center gap-1.5 rounded-md px-2 py-1.5 text-ink-700 transition hover:bg-ink-50 hover:text-brand-600"
            aria-label="Open cart"
          >
            <div className="relative">
              <ShoppingCart size={22} />
              {cartCount > 0 ? (
                <Badge className="absolute -right-2 -top-2 grid h-5 min-w-5 place-items-center bg-brand-500 px-1 text-[10px] text-white">
                  {cartCount}
                </Badge>
              ) : null}
            </div>
            <span className="hidden lg:inline">Cart</span>
          </button>
        </div>
      </div>

      {/* mobile search */}
      <div className="px-4 pb-2 md:hidden">
        <form onSubmit={submitSearch} className="relative">
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search products..."
            className="h-9 border-ink-200 bg-ink-50 pr-10"
          />
          <Button
            type="submit"
            size="icon"
            className="absolute right-1 top-1 h-7 w-7 bg-brand-500"
          >
            <Search size={14} />
          </Button>
        </form>
      </div>

      {/* category nav with mega-menu (CSS hover-driven for reliability) */}
      <nav className="hidden border-t border-ink-100 bg-white md:block">
        <div className="mx-auto flex h-10 max-w-7xl items-center gap-1 px-4 text-sm">
          <div ref={megaRef} className="group relative">
            <button
              onClick={() => setMegaOpen((v) => !v)}
              className="flex items-center gap-1.5 rounded-md bg-brand-50 px-3 py-1.5 font-medium text-brand-700 transition hover:bg-brand-100 group-hover:bg-brand-100"
              aria-expanded={megaOpen}
              aria-haspopup="true"
            >
              <Menu size={16} /> All Categories
              <ChevronDown size={12} className="transition group-hover:rotate-180" />
            </button>
            {/* Mega panel: shows on hover (group-hover) OR when megaOpen (click) */}
            <div
              className={`absolute left-0 top-10 z-50 w-[640px] max-w-[90vw] overflow-hidden rounded-xl border border-ink-100 bg-white shadow-2xl transition-all duration-200 ${
                megaOpen ? 'visible opacity-100' : 'invisible opacity-0 group-hover:visible group-hover:opacity-100'
              }`}
            >
              <div className="flex">
                {/* left: parent categories */}
                <div className="w-48 shrink-0 border-r border-ink-100 bg-ink-50/50 py-2">
                  {tree.map((c) => (
                    <button
                      key={c.id}
                      onMouseEnter={() => setHoveredCat(c.id)}
                      onClick={() => { navigate(`/category/${c.slug}`); setMegaOpen(false) }}
                      className={`flex w-full items-center justify-between px-3 py-2 text-left text-sm transition ${
                        hoveredCat === c.id
                          ? 'bg-white font-medium text-brand-600'
                          : 'text-ink-700 hover:bg-white/60'
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        {c.imageUrl ? (
                          <img src={c.imageUrl} alt="" className="h-5 w-5 rounded object-cover" />
                        ) : null}
                        {c.name}
                      </span>
                      {c.children?.length ? <ChevronRight size={12} className="opacity-40" /> : null}
                    </button>
                  ))}
                </div>
                {/* right: subcategories of hovered parent */}
                <div className="flex-1 p-4">
                  {(() => {
                    const parent = tree.find((c) => c.id === hoveredCat) || tree[0]
                    if (!parent) return null
                    const subs = parent.children || []
                    return (
                      <div>
                        <Link
                          href={href(`/category/${parent.slug}`)}
                          onClick={() => setMegaOpen(false)}
                          className="mb-3 inline-block text-sm font-semibold text-brand-600 hover:underline"
                        >
                          All {parent.name} →
                        </Link>
                        {subs.length ? (
                          <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                            {subs.map((s) => (
                              <Link
                                key={s.id}
                                href={href(`/category/${parent.slug}/${s.slug}`)}
                                onClick={() => setMegaOpen(false)}
                                className="rounded-md px-2 py-1.5 text-sm text-ink-600 transition hover:bg-brand-50 hover:text-brand-600"
                              >
                                {s.name}
                              </Link>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-ink-400">No subcategories.</p>
                        )}
                      </div>
                    )
                  })()}
                </div>
              </div>
            </div>
          </div>
          {parentCats.slice(0, 6).map((c) => (
            <Link
              key={c.id}
              href={href(`/category/${c.slug}`)}
              className="rounded-md px-3 py-1.5 text-ink-600 hover:bg-ink-50 hover:text-brand-600"
            >
              {c.name}
            </Link>
          ))}
          <Link
            href={href('/deals')}
            className="ml-auto rounded-md px-3 py-1.5 font-medium text-brand-600 hover:bg-brand-50"
          >
            🔥 Deals
          </Link>
        </div>
      </nav>
    </header>
  )
}
