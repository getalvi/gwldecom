import { notFound } from "next/navigation";
import Link from "next/link";
import { CheckCircle, Package, MapPin, CreditCard } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { formatBDT, formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface Props { params: Promise<{ id: string }> }
interface OrderItemRow { quantity: number; unit_price: number; products: { title: string } | null }

export default async function OrderConfirmationPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: rawOrder } = await supabase
    .from("orders")
    .select("id, total, status, payment_method, shipping_address, created_at, order_items(quantity, unit_price, products(title))")
    .eq("id", id).single();

  if (!rawOrder) notFound();

  const order = {
    ...rawOrder,
    shipping_address: rawOrder.shipping_address as Record<string, string>,
    order_items: ((rawOrder.order_items ?? []) as unknown[]).map((item: unknown) => {
      const i = item as { quantity: number; unit_price: number; products: unknown };
      return { ...i, products: Array.isArray(i.products) ? (i.products[0] ?? null) : i.products } as OrderItemRow;
    }),
  };

  const addr = order.shipping_address;

  return (
    <main className="container max-w-lg py-12 text-center animate-fade-in">
      <div className="flex justify-center mb-4"><CheckCircle size={64} className="text-success" /></div>
      <h1 className="text-2xl font-bold mb-1">Order Confirmed! 🎉</h1>
      <p className="text-muted-foreground text-sm mb-6">Order #{order.id.slice(0,8).toUpperCase()}</p>

      <div className="rounded-xl border border-border bg-background text-left p-5 space-y-4 mb-6">
        <div className="flex items-center gap-2 text-sm font-semibold border-b border-border pb-3">
          <Package size={16} className="text-primary" /> Order Details
        </div>
        <div className="space-y-2">
          {order.order_items.map((item, i) => (
            <div key={i} className="flex justify-between text-sm">
              <span>{item.products?.title ?? "Product"} × {item.quantity}</span>
              <span className="font-medium">{formatBDT(item.unit_price * item.quantity)}</span>
            </div>
          ))}
          <div className="border-t border-border pt-2 flex justify-between font-bold">
            <span>Total</span><span className="text-primary">{formatBDT(order.total)}</span>
          </div>
        </div>
        <div className="flex items-start gap-2 text-sm pt-2 border-t border-border">
          <MapPin size={16} className="text-primary shrink-0 mt-0.5" />
          <div>
            <p className="font-medium">{addr.fullName}</p>
            <p className="text-muted-foreground">{addr.addressLine1}, {addr.city}, {addr.district}</p>
            <p className="text-muted-foreground">{addr.phone}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-sm border-t border-border pt-2">
          <CreditCard size={16} className="text-primary" />
          <span className="capitalize">{order.payment_method === "cod" ? "Cash on Delivery" : order.payment_method}</span>
          <span className="ml-auto text-muted-foreground">{formatDate(order.created_at)}</span>
        </div>
      </div>
      <div className="flex gap-3">
        <Link href="/account/orders" className="flex-1"><Button variant="outline" className="w-full">My Orders</Button></Link>
        <Link href="/" className="flex-1"><Button className="w-full">Continue Shopping</Button></Link>
      </div>
    </main>
  );
}
