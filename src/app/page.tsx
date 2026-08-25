'use client'

import { useRoute } from '@/lib/router'
import { StorefrontShell } from '@/components/storefront/StorefrontShell'
import { AdminApp } from '@/components/admin/AdminApp'

export default function Home() {
  const route = useRoute()
  const isAdmin = route.segments[0] === 'admin'

  if (isAdmin) {
    return <AdminApp />
  }
  return <StorefrontShell />
}
