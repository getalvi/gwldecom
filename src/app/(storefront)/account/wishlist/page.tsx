import Link from "next/link";
import { Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
export default function WishlistPage() {
  return (
    <main className="container max-w-2xl py-8 text-center">
      <Heart size={48} className="mx-auto text-muted-foreground mb-4"/>
      <h1 className="text-2xl font-bold mb-2">Your Wishlist</h1>
      <p className="text-muted-foreground mb-6">Save products you love by clicking the heart icon on any product.</p>
      <Link href="/search"><Button>Browse Products</Button></Link>
    </main>
  );
}
