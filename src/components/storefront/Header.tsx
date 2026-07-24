"use client";

import Link from "next/link";
import { useState } from "react";
import { ShoppingCart, Search, User, Heart, Menu, X, ChevronRight } from "lucide-react";
import { useCart } from "@/lib/cart";
import { formatBDT } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import Image from "next/image";

export function Header() {
  const { count, items, subtotal, removeItem, isEmpty } = useCart();
  const [cartOpen, setCartOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        {/* Top bar */}
        <div className="bg-primary text-primary-foreground py-1 text-center text-xs">
          🚀 Free delivery on orders over ৳999 across Bangladesh
        </div>
        {/* Main nav */}
        <div className="container flex h-16 items-center gap-4">
          <button className="md:hidden" onClick={() => setMobileMenuOpen(true)}>
            <Menu size={22} />
          </button>

          <Link href="/" className="shrink-0 flex items-center gap-1">
            <span className="text-2xl font-extrabold text-primary tracking-tight">Shop</span>
            <span className="text-2xl font-extrabold tracking-tight">BD</span>
          </Link>

          {/* Search */}
          <form action="/search" method="GET" className="hidden md:flex flex-1 max-w-xl">
            <div className="relative w-full">
              <input
                name="q"
                type="search"
                placeholder="Search products, brands..."
                className="w-full h-10 rounded-l-md border border-border bg-secondary px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <button type="submit" className="absolute right-0 top-0 h-10 px-4 bg-primary text-white rounded-r-md hover:opacity-90 transition-opacity">
                <Search size={16} />
              </button>
            </div>
          </form>

          <nav className="ml-auto flex items-center gap-1">
            <Link href="/account" className="hidden md:flex flex-col items-center px-3 py-1 text-xs hover:text-primary transition-colors">
              <User size={20} />
              <span>Account</span>
            </Link>
            <Link href="/account/wishlist" className="hidden md:flex flex-col items-center px-3 py-1 text-xs hover:text-primary transition-colors">
              <Heart size={20} />
              <span>Wishlist</span>
            </Link>
            <button
              onClick={() => setCartOpen(true)}
              className="relative flex flex-col items-center px-3 py-1 text-xs hover:text-primary transition-colors"
            >
              <div className="relative">
                <ShoppingCart size={20} />
                {count > 0 && (
                  <span className="absolute -right-2 -top-2 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-white animate-bounce-in">
                    {count > 99 ? "99+" : count}
                  </span>
                )}
              </div>
              <span>Cart</span>
            </button>
          </nav>
        </div>

        {/* Category nav */}
        <div className="border-t border-border hidden md:block">
          <div className="container flex h-10 items-center gap-6 text-sm">
            {["Electronics", "Fashion", "Home & Garden", "Sports", "Grocery", "Beauty", "Toys", "Books"].map((cat) => (
              <Link key={cat} href={`/search?category=${cat.toLowerCase()}`} className="whitespace-nowrap hover:text-primary transition-colors">
                {cat}
              </Link>
            ))}
          </div>
        </div>
      </header>

      {/* Mobile search */}
      <div className="md:hidden border-b border-border bg-background px-4 py-2">
        <form action="/search" method="GET" className="flex">
          <input
            name="q"
            type="search"
            placeholder="Search..."
            className="flex-1 h-9 rounded-l-md border border-border bg-secondary px-3 text-sm focus:outline-none"
          />
          <button type="submit" className="h-9 px-3 bg-primary text-white rounded-r-md">
            <Search size={14} />
          </button>
        </form>
      </div>

      {/* Cart Drawer */}
      {cartOpen && (
        <div className="fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/50" onClick={() => setCartOpen(false)} />
          <div className="relative ml-auto h-full w-full max-w-md bg-background shadow-xl flex flex-col animate-slide-up">
            <div className="flex items-center justify-between border-b border-border p-4">
              <h2 className="text-lg font-semibold">Shopping Cart ({count})</h2>
              <button onClick={() => setCartOpen(false)} className="rounded-md p-1 hover:bg-secondary">
                <X size={20} />
              </button>
            </div>

            {isEmpty ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
                <ShoppingCart size={48} className="text-muted-foreground" />
                <p className="text-muted-foreground">Your cart is empty</p>
                <Button onClick={() => setCartOpen(false)} variant="outline">Continue Shopping</Button>
              </div>
            ) : (
              <>
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {items.map((item) => (
                    <div key={item.productId} className="flex gap-3 rounded-lg border border-border p-3">
                      <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-md bg-secondary">
                        {item.imageUrl && <Image src={item.imageUrl} alt={item.title} fill className="object-cover" sizes="64px" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium line-clamp-2">{item.title}</p>
                        <p className="text-sm text-primary font-semibold">{formatBDT(item.price)}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-muted-foreground">Qty: {item.quantity}</span>
                          <button onClick={() => removeItem(item.productId)} className="text-xs text-destructive hover:underline ml-auto">Remove</button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="border-t border-border p-4 space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span className="font-semibold">{formatBDT(subtotal)}</span>
                  </div>
                  <Link href="/checkout" onClick={() => setCartOpen(false)}>
                    <Button className="w-full" size="lg">
                      Checkout <ChevronRight size={16} />
                    </Button>
                  </Link>
                  <Link href="/cart" onClick={() => setCartOpen(false)}>
                    <Button variant="outline" className="w-full">View Cart</Button>
                  </Link>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileMenuOpen(false)} />
          <div className="relative w-72 bg-background h-full shadow-xl flex flex-col p-4">
            <button onClick={() => setMobileMenuOpen(false)} className="self-end mb-4"><X size={20} /></button>
            <nav className="space-y-1">
              {["Electronics", "Fashion", "Home & Garden", "Sports", "Grocery", "Beauty", "Toys", "Books"].map((cat) => (
                <Link key={cat} href={`/search?category=${cat.toLowerCase()}`} onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center justify-between rounded-md px-3 py-2 text-sm hover:bg-secondary">
                  {cat} <ChevronRight size={14} />
                </Link>
              ))}
            </nav>
          </div>
        </div>
      )}
    </>
  );
}
