import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { Providers } from "@/components/providers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "BDShop — Bangladesh Online Marketplace",
    template: "%s | BDShop",
  },
  description:
    "BDShop is Bangladesh’s trusted online marketplace. Shop electronics, fashion, home & kitchen, and beauty with cash on delivery nationwide.",
  keywords: [
    "Bangladesh online shop",
    "Daraz alternative",
    "electronics Bangladesh",
    "online shopping BD",
    "cash on delivery",
  ],
  authors: [{ name: "BDShop" }],
  openGraph: {
    title: "BDShop — Bangladesh Online Marketplace",
    description: "Shop electronics, fashion, home & kitchen, and beauty with COD nationwide.",
    siteName: "BDShop",
    type: "website",
    locale: "en_BD",
  },
  twitter: {
    card: "summary_large_image",
    title: "BDShop — Bangladesh Online Marketplace",
    description: "Shop electronics, fashion, home & kitchen, and beauty with COD nationwide.",
  },
  metadataBase: new URL("https://bdshop.example"),
  alternates: { canonical: "/" },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} antialiased bg-background text-foreground`}
      >
        <Providers>{children}</Providers>
        <Toaster />
      </body>
    </html>
  );
}
