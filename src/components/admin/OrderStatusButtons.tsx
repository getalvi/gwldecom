"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

const STATUS_FLOW = [
  { status: "confirmed", label: "Confirm", variant: "success" as const },
  { status: "packed", label: "Mark Packed", variant: "secondary" as const },
  { status: "shipped", label: "Mark Shipped", variant: "secondary" as const },
  { status: "delivered", label: "Mark Delivered", variant: "success" as const },
  { status: "cancelled", label: "Cancel", variant: "destructive" as const },
  { status: "refunded", label: "Refund", variant: "outline" as const },
] as const;

type OrderStatus = "pending" | "confirmed" | "packed" | "shipped" | "delivered" | "cancelled" | "refunded";

// Only show relevant next-state buttons
const ALLOWED_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["packed", "cancelled"],
  packed: ["shipped", "cancelled"],
  shipped: ["delivered"],
  delivered: ["refunded"],
  cancelled: [],
  refunded: [],
};

interface Props { orderId: string; currentStatus: string }

export function OrderStatusButtons({ orderId, currentStatus }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const allowed = ALLOWED_TRANSITIONS[currentStatus as OrderStatus] ?? [];
  const buttons = STATUS_FLOW.filter(b => allowed.includes(b.status as OrderStatus));

  if (buttons.length === 0) {
    return <p className="text-xs text-muted-foreground">No further actions available</p>;
  }

  async function updateStatus(newStatus: string) {
    setLoading(newStatus);
    setError(null);
    const res = await fetch(`/api/orders/${orderId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    setLoading(null);
    if (res.ok) {
      router.refresh();
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Failed to update");
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      {buttons.map(({ status, label, variant }) => (
        <Button
          key={status}
          size="sm"
          variant={variant}
          loading={loading === status}
          onClick={() => updateStatus(status)}
          disabled={!!loading}
        >
          {label}
        </Button>
      ))}
      {error && <p className="text-xs text-destructive mt-1 w-full">{error}</p>}
    </div>
  );
}
