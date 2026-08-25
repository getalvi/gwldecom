import type { Metadata, Viewport } from "next";
import "./globals.css";
import { CartProvider } from "@/lib/cart";
export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"),
  title: { default: "ShopBD — Online Shopping in Bangladesh", template: "%s | ShopBD" },
  description: "Shop electronics, fashion, home goods and more with fast delivery across Bangladesh.",
  openGraph: { type: "website", locale: "en_BD", siteName: "ShopBD" },
};
export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#e3133d" };
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body><CartProvider>{children}</CartProvider></body>
    </html>
  );
}
