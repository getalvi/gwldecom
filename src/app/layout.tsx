import type { Metadata } from "next";
import "./globals.css";
import { CartProvider } from "@/lib/cart";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"),
  title: { default: "ShopBD — Online Shopping in Bangladesh", template: "%s | ShopBD" },
  description: "Shop electronics, fashion, home goods and more with fast delivery across Bangladesh.",
  robots: { index: true, follow: true },
  openGraph: { type: "website", locale: "en_BD", siteName: "ShopBD" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <CartProvider>{children}</CartProvider>
      </body>
    </html>
  );
}
