import type { Metadata } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import "./globals.css";
import { CartProvider } from "@/components/cart/cart-context";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { loadStoreNavigationCategories } from "@/lib/store-navigation";

/** Cache shell briefly for faster TTFB while keeping nav reasonably fresh. */
export const revalidate = 300;

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, "") ??
  "http://localhost:3000";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair-display",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Watch Phase | Timeless Precision",
    template: "%s",
  },
  description:
    "Discover premium watches crafted for everyday elegance and precision.",
  alternates: { canonical: "/" },
  openGraph: {
    title: "Watch Phase | Timeless Precision",
    description:
      "Discover premium watches crafted for everyday elegance and precision.",
    url: "/",
    siteName: "Watch Phase",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Watch Phase | Timeless Precision",
    description:
      "Discover premium watches crafted for everyday elegance and precision.",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const navigationCategories = await loadStoreNavigationCategories();

  return (
    <html
      lang="en"
      className={`${inter.variable} ${playfair.variable} ${inter.className} h-full`}
      suppressHydrationWarning
    >
      <body
        className="min-h-full flex flex-col antialiased"
        suppressHydrationWarning
      >
        <CartProvider>
          <SiteHeader
            categoryNavItems={navigationCategories}
            mobileCategoryCollections={navigationCategories}
          />
          <div className="flex-1">{children}</div>
          <SiteFooter />
        </CartProvider>
      </body>
    </html>
  );
}
