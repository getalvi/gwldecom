// GET /api/orders/[id]/invoice — generates a PDF invoice for an order.
// Auth required; customers can fetch their own invoices, staff/admin any.
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireSession } from '@/lib/auth'
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  let user
  try {
    user = await requireSession()
  } catch {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }
  const order = await db.order.findUnique({
    where: { id },
    include: {
      items: { include: { product: { select: { title: true } } } },
      customer: { select: { email: true, fullName: true } },
    },
  })
  if (!order) return NextResponse.json({ error: 'not found' }, { status: 404 })
  if (user.role !== 'admin' && user.role !== 'staff' && order.customerId !== user.id) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  try {
    const pdf = await buildInvoicePdf(order)
    return new NextResponse(Buffer.from(pdf), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="invoice-${order.id.slice(-8).toUpperCase()}.pdf"`,
        'Cache-Control': 'private, no-cache',
      },
    })
  } catch (e: any) {
    console.error('Invoice PDF generation failed:', e)
    return NextResponse.json({ error: 'Failed to generate invoice', detail: e?.message }, { status: 500 })
  }
}

async function buildInvoicePdf(order: any): Promise<Uint8Array> {
  const doc = await PDFDocument.create()
  const font = await doc.embedFont(StandardFonts.Helvetica)
  const bold = await doc.embedFont(StandardFonts.HelveticaBold)
  const page = doc.addPage([595, 842]) // A4
  const { width, height } = page.getSize()
  const BRAND: [number, number, number] = [0.969, 0.373, 0.102] // #f75f1a
  const INK: [number, number, number] = [0.122, 0.137, 0.169]
  const MUTED: [number, number, number] = [0.408, 0.439, 0.565]

  let y = height - 60

  // Header band
  page.drawRectangle({ x: 0, y: y - 50, width, height: 70, color: rgb(...INK) })
  page.drawText('BDShop', { x: 50, y: y - 10, size: 24, font: bold, color: rgb(1, 1, 1) })
  page.drawText('Bangladesh Online Marketplace', { x: 50, y: y - 32, size: 9, font, color: rgb(0.75, 0.75, 0.78) })
  page.drawText('INVOICE', { x: width - 140, y: y - 18, size: 18, font: bold, color: rgb(...BRAND) })
  y -= 80

  // Order meta
  const orderNo = `#${order.id.slice(-8).toUpperCase()}`
  const date = new Date(order.createdAt).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })
  page.drawText(`Invoice #: ${orderNo}`, { x: 50, y, size: 11, font: bold, color: rgb(...INK) })
  page.drawText(`Date: ${date}`, { x: width - 250, y, size: 10, font, color: rgb(...MUTED) })
  y -= 20
  page.drawText(`Payment: ${order.paymentMethod.toUpperCase()} (${order.paymentStatus})`, { x: 50, y, size: 10, font, color: rgb(...MUTED) })
  page.drawText(`Status: ${order.status}`, { x: width - 250, y, size: 10, font, color: rgb(...MUTED) })
  y -= 30

  // Bill to
  const addr = (order.shippingAddress as Record<string, any>) || {}
  page.drawText('BILL TO', { x: 50, y, size: 9, font: bold, color: rgb(...BRAND) })
  y -= 14
  page.drawText(addr.fullName || order.customer?.fullName || 'Customer', { x: 50, y, size: 11, font: bold, color: rgb(...INK) })
  if (addr.addressLine1) { y -= 13; page.drawText(addr.addressLine1, { x: 50, y, size: 10, font, color: rgb(...MUTED) }) }
  if (addr.city || addr.district) { y -= 13; page.drawText(`${addr.city || ''}, ${addr.district || ''} ${addr.postalCode || ''}`.trim(), { x: 50, y, size: 10, font, color: rgb(...MUTED) }) }
  if (addr.phone) { y -= 13; page.drawText(`Phone: ${addr.phone}`, { x: 50, y, size: 10, font, color: rgb(...MUTED) }) }
  if (order.customer?.email) { y -= 13; page.drawText(`Email: ${order.customer.email}`, { x: 50, y, size: 10, font, color: rgb(...MUTED) }) }
  y -= 25

  // Table header
  const tableX = 50
  const colItem = tableX
  const colQty = 340
  const colPrice = 410
  const colTotal = 500
  page.drawRectangle({ x: tableX, y: y - 16, width: width - 100, height: 20, color: rgb(0.965, 0.969, 0.976) })
  page.drawText('ITEM', { x: colItem, y: y - 11, size: 9, font: bold, color: rgb(...INK) })
  page.drawText('QTY', { x: colQty, y: y - 11, size: 9, font: bold, color: rgb(...INK) })
  page.drawText('UNIT PRICE', { x: colPrice, y: y - 11, size: 9, font: bold, color: rgb(...INK) })
  page.drawText('TOTAL', { x: colTotal, y: y - 11, size: 9, font: bold, color: rgb(...INK) })
  y -= 24

  // Line items
  const fmt = (n: number) => `Tk. ${n.toLocaleString('en-BD', { maximumFractionDigits: 0 })}`
  for (const it of order.items) {
    const title = (it.product?.title || 'Product').slice(0, 52)
    page.drawText(title, { x: colItem, y, size: 10, font, color: rgb(...INK) })
    page.drawText(String(it.quantity), { x: colQty, y, size: 10, font, color: rgb(...MUTED) })
    page.drawText(fmt(it.unitPrice), { x: colPrice, y, size: 10, font, color: rgb(...MUTED) })
    page.drawText(fmt(it.unitPrice * it.quantity), { x: colTotal, y, size: 10, font, color: rgb(...INK) })
    y -= 20
    // divider
    page.drawLine({ start: { x: tableX, y: y + 6 }, end: { x: width - 50, y: y + 6 }, thickness: 0.5, color: rgb(0.92, 0.93, 0.95) })
  }

  y -= 10
  // Totals
  page.drawText('Subtotal', { x: colPrice - 30, y, size: 10, font, color: rgb(...MUTED) })
  page.drawText(fmt(order.total), { x: colTotal, y, size: 10, font: bold, color: rgb(...INK) })
  y -= 18
  if (order.couponCode) {
    page.drawText(`Coupon (${order.couponCode})`, { x: colPrice - 30, y, size: 10, font, color: rgb(...MUTED) })
    y -= 18
  }
  page.drawText('Shipping', { x: colPrice - 30, y, size: 10, font, color: rgb(...MUTED) })
  page.drawText('Included', { x: colTotal, y, size: 10, font, color: rgb(...MUTED) })
  y -= 22
  // Grand total band
  page.drawRectangle({ x: colPrice - 40, y: y - 6, width: width - (colPrice - 40) - 50, height: 26, color: rgb(...BRAND) })
  page.drawText('GRAND TOTAL', { x: colPrice - 30, y: y + 3, size: 11, font: bold, color: rgb(1, 1, 1) })
  page.drawText(fmt(order.total), { x: colTotal, y: y + 3, size: 12, font: bold, color: rgb(1, 1, 1) })

  // Footer
  y = 70
  page.drawLine({ start: { x: 50, y: y + 10 }, end: { x: width - 50, y: y + 10 }, thickness: 0.5, color: rgb(0.92, 0.93, 0.95) })
  page.drawText('Thank you for shopping with BDShop!', { x: 50, y, size: 10, font: bold, color: rgb(...INK) })
  page.drawText('Questions? support@bdshop.com | 16263', { x: 50, y: y - 14, size: 9, font, color: rgb(...MUTED) })
  page.drawText(`Generated ${new Date().toLocaleString('en-GB')}`, { x: width - 200, y: y - 14, size: 8, font, color: rgb(...MUTED) })

  return doc.save()
}
