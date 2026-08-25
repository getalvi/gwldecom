'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  LayoutDashboard,
  Package,
  FolderTree,
  FileText,
  Image as ImageIcon,
  Ticket,
  ShoppingCart,
  Star,
  MessageCircleQuestion,
  Users,
  ScrollText,
  Bot,
  Store,
  LogOut,
  Menu,
  X,
  ChevronRight,
  Clock,
  UserCircle2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { useSession } from '@/lib/session-store'
import { useRoute, navigate } from '@/lib/router'

const NAV = [
  { id: '', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'products', label: 'Products', icon: Package },
  { id: 'categories', label: 'Categories & Brands', icon: FolderTree },
  { id: 'pages', label: 'Pages (Builder)', icon: FileText },
  { id: 'banners', label: 'Banners', icon: ImageIcon },
  { id: 'coupons', label: 'Coupons', icon: Ticket },
  { id: 'orders', label: 'Orders', icon: ShoppingCart },
  { id: 'abandoned-carts', label: 'Abandoned Carts', icon: ShoppingCart },
  { id: 'reviews', label: 'Reviews', icon: Star },
  { id: 'qa', label: 'Q&A Moderation', icon: MessageCircleQuestion },
  { id: 'segments', label: 'Customer Segments', icon: UserCircle2 },
  { id: 'scheduled-updates', label: 'Scheduled Updates', icon: Clock },
  { id: 'users', label: 'Users', icon: Users, adminOnly: true },
  { id: 'audit', label: 'Audit Log', icon: ScrollText, adminOnly: true },
  { id: 'ai-import', label: 'AI Import', icon: Bot },
]

export function AdminShell({ children }: { children: React.ReactNode }) {
  const { user, logout, loading: sessionLoading } = useSession()
  const route = useRoute()
  const adminSeg = route.segments.slice(1) // strip 'admin'
  const active = adminSeg[0] || ''
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!sessionLoading && !user) {
      navigate('/login')
    } else if (user && user.role !== 'admin' && user.role !== 'staff') {
      navigate('/')
    }
  }, [user, sessionLoading])

  if (sessionLoading || !user) {
    return (
      <div className="grid min-h-screen place-items-center text-sm text-ink-400">Loading admin...</div>
    )
  }

  if (user.role !== 'admin' && user.role !== 'staff') {
    return (
      <div className="grid min-h-screen place-items-center px-4 text-center">
        <div>
          <h1 className="text-xl font-bold text-ink-900">Access Denied</h1>
          <p className="mt-1 text-sm text-ink-400">You don’t have permission to access the admin panel.</p>
          <Button className="mt-4 bg-brand-500 hover:bg-brand-600" onClick={() => navigate('/')}>
            Back to Store
          </Button>
        </div>
      </div>
    )
  }

  const navItems = NAV.filter((n) => !n.adminOnly || user.role === 'admin')

  const sidebar = (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b border-ink-800 px-4 py-4">
        <div className="grid h-8 w-8 place-items-center rounded-lg bg-brand-500 text-white">
          <Store size={18} />
        </div>
        <div>
          <p className="text-sm font-bold text-white">BDShop Admin</p>
          <p className="text-[10px] text-ink-400">Content Management</p>
        </div>
      </div>
      <nav className="flex-1 space-y-0.5 overflow-y-auto p-2 scroll-thin">
        {navItems.map((item) => {
          const isActive = active === item.id
          return (
            <Link
              key={item.id}
              href={`#/admin/${item.id}`}
              onClick={() => setOpen(false)}
              className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition ${
                isActive
                  ? 'bg-brand-500 font-medium text-white'
                  : 'text-ink-300 hover:bg-ink-800 hover:text-white'
              }`}
            >
              <item.icon size={16} /> {item.label}
            </Link>
          )
        })}
      </nav>
      <div className="border-t border-ink-800 p-3">
        <div className="mb-2 flex items-center gap-2 px-1">
          <div className="grid h-8 w-8 place-items-center rounded-full bg-ink-700 text-xs font-bold text-white">
            {user.fullName?.charAt(0) || user.email.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-medium text-white">{user.fullName || 'User'}</p>
            <Badge className="bg-ink-700 text-[10px] capitalize text-ink-200">{user.role}</Badge>
          </div>
        </div>
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="flex-1 justify-start text-ink-300 hover:bg-ink-800 hover:text-white"
            onClick={() => navigate('/')}
          >
            <Store size={14} className="mr-1" /> View Store
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-ink-300 hover:bg-ink-800 hover:text-red-400"
            onClick={async () => { await logout(); navigate('/') }}
          >
            <LogOut size={14} />
          </Button>
        </div>
      </div>
    </div>
  )

  return (
    <div className="flex min-h-screen bg-ink-50">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 bg-ink-900 lg:block">
        {sidebar}
      </aside>

      {/* Mobile sidebar */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left" className="w-60 border-0 bg-ink-900 p-0">
          <SheetHeader className="sr-only">
            <SheetTitle>Admin navigation</SheetTitle>
          </SheetHeader>
          {sidebar}
        </SheetContent>
      </Sheet>

      {/* Main */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* topbar */}
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-ink-200 bg-white px-4">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setOpen(true)}
          >
            <Menu size={20} />
          </Button>
          <div className="flex items-center gap-1.5 text-sm">
            <span className="text-ink-400">Admin</span>
            <ChevronRight size={14} className="text-ink-300" />
            <span className="font-medium capitalize text-ink-800">
              {active || 'dashboard'}
            </span>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => navigate('/')}>
              <Store size={14} className="mr-1" /> Store
            </Button>
          </div>
        </header>

        {/* content */}
        <main className="flex-1 p-4 sm:p-6">{children}</main>
      </div>
    </div>
  )
}
