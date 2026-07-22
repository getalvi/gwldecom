import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatBDT } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function OrderConfirmationPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();
  // RLS ensures customers can only fetch their own order (see supabase/policies.sql)
  const { data: order } = await supabase.from("orders").select("id, total, status, created_at").eq("id", id).single();

  if (!order) notFound();

  return (
    <main className="container max-w-md py-16 text-center">
      <h1 className="mb-2 text-2xl font-bold">Order Placed 🎉</h1>
      <p className="mb-6 text-muted-foreground">
        Order #{order.id.slice(0, 8)} — {formatBDT(order.total)}
      </p>
      <Link href="/">
        <Button>Continue Shopping</Button>
      </Link>
    </main>
  );
}
