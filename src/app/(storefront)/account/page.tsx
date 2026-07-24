import { redirect } from "next/navigation";
import Link from "next/link";
import { User, ShoppingBag, MapPin, Heart, Shield, ChevronRight } from "lucide-react";
import { getCurrentUser } from "@/lib/rbac";
import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  let user;
  try { user = await getCurrentUser(); } catch { redirect("/login?redirect=/account"); }

  const supabase = await createClient();
  const [{ count: orderCount }, { data: profile }] = await Promise.all([
    supabase.from("orders").select("*", { count: "exact", head: true }).eq("customer_id", user.id),
    supabase.from("profiles").select("full_name, email, phone, created_at").eq("id", user.id).single(),
  ]);

  const MENU = [
    { href: "/account/orders", icon: ShoppingBag, label: "My Orders", desc: `${orderCount ?? 0} orders` },
    { href: "/account/wishlist", icon: Heart, label: "Wishlist", desc: "Saved products" },
    { href: "/account/addresses", icon: MapPin, label: "Addresses", desc: "Manage delivery addresses" },
    { href: "/account/security", icon: Shield, label: "Security", desc: "Password & account settings" },
  ];

  return (
    <main className="container max-w-2xl py-8 animate-fade-in">
      <h1 className="text-2xl font-bold mb-6">My Account</h1>

      <div className="rounded-xl border border-border bg-background p-5 mb-5">
        <div className="flex items-center gap-4">
          <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center">
            <User size={24} className="text-primary" />
          </div>
          <div>
            <p className="font-semibold text-lg">{profile?.full_name ?? "Customer"}</p>
            <p className="text-sm text-muted-foreground">{profile?.email}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Member since {profile?.created_at ? formatDate(profile.created_at) : "—"}</p>
          </div>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {MENU.map(({ href, icon: Icon, label, desc }) => (
          <Link key={href} href={href} className="flex items-center gap-4 rounded-xl border border-border bg-background p-4 hover:border-primary hover:bg-primary/5 transition-all group">
            <div className="rounded-lg bg-primary/10 p-2.5">
              <Icon size={20} className="text-primary" />
            </div>
            <div className="flex-1">
              <p className="font-medium">{label}</p>
              <p className="text-xs text-muted-foreground">{desc}</p>
            </div>
            <ChevronRight size={16} className="text-muted-foreground group-hover:text-primary transition-colors" />
          </Link>
        ))}
      </div>
    </main>
  );
}
