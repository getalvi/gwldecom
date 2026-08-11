"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface Category {
  id: string;
  name: string;
  slug: string;
}

export function CategoryManager({ initialCategories }: { initialCategories: Category[] }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const res = await fetch("/api/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    setSubmitting(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Failed to add category");
      return;
    }
    setName("");
    router.refresh();
  }

  return (
    <div className="max-w-md space-y-6">
      <form onSubmit={handleAdd} className="flex gap-2">
        <Input placeholder="Category name" value={name} onChange={(e) => setName(e.target.value)} required />
        <Button type="submit" disabled={submitting}>
          {submitting ? "Adding..." : "Add"}
        </Button>
      </form>
      {error && <p className="text-sm text-destructive">{error}</p>}

      <ul className="divide-y divide-border rounded-md border border-border">
        {initialCategories.map((c) => (
          <li key={c.id} className="flex items-center justify-between px-3 py-2 text-sm">
            <span>{c.name}</span>
            <span className="text-muted-foreground">/{c.slug}</span>
          </li>
        ))}
        {initialCategories.length === 0 && (
          <li className="px-3 py-6 text-center text-sm text-muted-foreground">No categories yet.</li>
        )}
      </ul>
    </div>
  );
}
