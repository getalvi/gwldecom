"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function DeleteProductButton({ productId }: { productId: string }) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (!confirm("Permanently delete this product? This cannot be undone.")) return;
    setDeleting(true);
    const res = await fetch(`/api/products/${productId}`, { method: "DELETE" });
    setDeleting(false);
    if (res.ok) {
      router.refresh();
    } else {
      const data = await res.json().catch(() => ({}));
      alert(data.error ?? "Failed to delete product");
    }
  }

  return (
    <Button size="sm" variant="destructive" onClick={handleDelete} disabled={deleting}>
      {deleting ? "Deleting..." : "Delete"}
    </Button>
  );
}
