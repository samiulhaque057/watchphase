import type { Metadata } from "next";
import { CartPageClient } from "@/components/cart/cart-page-client";

export const metadata: Metadata = {
  title: "Cart | Watch Phase",
  description: "Review your watches and proceed to checkout at Watch Phase.",
  robots: { index: false, follow: false },
  alternates: { canonical: "/cart" },
};

export default function CartPage() {
  return (
    <main className="min-h-[60vh] bg-white pb-24">
      <section className="border-b border-gray-200 bg-[#fafafa] py-4">
        <div className="container mx-auto px-4 text-center">
          <p className="text-xs uppercase tracking-[0.28em] text-black/55">
            Shopping cart
          </p>
        </div>
      </section>
      <CartPageClient />
    </main>
  );
}
