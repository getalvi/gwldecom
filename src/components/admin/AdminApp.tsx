'use client'

import { AdminShell } from '@/components/admin/AdminShell'
import { useRoute } from '@/lib/router'
import { DashboardView } from '@/components/admin/views/DashboardView'
import { ProductsView } from '@/components/admin/views/ProductsView'
import { ProductFormView } from '@/components/admin/views/ProductFormView'
import { CategoriesView } from '@/components/admin/views/CategoriesView'
import { PagesView } from '@/components/admin/views/PagesView'
import { PageBuilderView } from '@/components/admin/views/PageBuilderView'
import { BannersView } from '@/components/admin/views/BannersView'
import { CouponsView } from '@/components/admin/views/CouponsView'
import { OrdersView } from '@/components/admin/views/OrdersView'
import { ReviewsView } from '@/components/admin/views/ReviewsView'
import { UsersView } from '@/components/admin/views/UsersView'
import { AuditView } from '@/components/admin/views/AuditView'
import { AiImportView } from '@/components/admin/views/AiImportView'
import { ImportCsvView } from '@/components/admin/views/ImportCsvView'
import { QaModerationView } from '@/components/admin/views/QaModerationView'
import { AbandonedCartsView } from '@/components/admin/views/AbandonedCartsView'
import { CustomerSegmentsView } from '@/components/admin/views/CustomerSegmentsView'
import { ScheduledUpdatesView } from '@/components/admin/views/ScheduledUpdatesView'

export function AdminApp() {
  const route = useRoute()
  const seg = route.segments.slice(1) // strip 'admin'
  const section = seg[0] || ''
  const param = seg[1]

  return (
    <AdminShell>
      {section === '' && <DashboardView />}
      {section === 'products' && param === 'import'
        ? <ImportCsvView />
        : section === 'products' && (param === 'new' || param === 'edit')
        ? <ProductFormView mode={param} slug={seg[2]} />
        : section === 'products'
        ? <ProductsView />
        : null}
      {section === 'categories' && <CategoriesView />}
      {section === 'pages' && (param === 'edit' ? <PageBuilderView slug={seg[2]} /> : <PagesView />)}
      {section === 'banners' && <BannersView />}
      {section === 'coupons' && <CouponsView />}
      {section === 'orders' && <OrdersView />}
      {section === 'reviews' && <ReviewsView />}
      {section === 'qa' && <QaModerationView />}
      {section === 'abandoned-carts' && <AbandonedCartsView />}
      {section === 'segments' && <CustomerSegmentsView />}
      {section === 'scheduled-updates' && <ScheduledUpdatesView />}
      {section === 'users' && <UsersView />}
      {section === 'audit' && <AuditView />}
      {section === 'ai-import' && <AiImportView />}
    </AdminShell>
  )
}
