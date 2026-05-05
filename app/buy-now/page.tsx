import type { Metadata } from "next";
import { BuyNowCheckoutContent } from "@/components/checkout/buy-now-checkout-content";
import {
  getProductBySlug,
  resolvePurchasableSkuForProduct,
  variationLabelForSku,
} from "@/lib/catalog";

export const metadata: Metadata = {
  title: "Buy Now | Watch Phase",
  description: "Complete your Watch Phase purchase securely.",
  robots: { index: false, follow: false },
  alternates: { canonical: "/buy-now" },
};

export const revalidate = 60;

type BuyNowPageProps = {
  searchParams: Promise<{ slug?: string | string[]; sku?: string | string[] }>;
};

export default async function BuyNowPage({ searchParams }: BuyNowPageProps) {
  const params = await searchParams;
  const slugRaw = params.slug;
  const skuRaw = params.sku;
  const slug =
    typeof slugRaw === "string" ? slugRaw : slugRaw != null ? slugRaw[0] : undefined;
  const skuParam =
    typeof skuRaw === "string" ? skuRaw : skuRaw != null ? skuRaw[0] : undefined;

  const product = slug ? await getProductBySlug(slug) : undefined;
  const checkoutSku = product
    ? resolvePurchasableSkuForProduct(product, skuParam ?? null)
    : "";
  const variantLabel =
    product && checkoutSku ? variationLabelForSku(product, checkoutSku) : null;

  return (
    <main className="min-h-[60vh] bg-white pb-24">
      <section className="border-b border-gray-200 bg-[#fafafa] py-4">
        <div className="container mx-auto flex flex-wrap items-center justify-center gap-4 px-4 text-center md:justify-between">
          <p className="text-xs uppercase tracking-[0.28em] text-black/55">
            Secure checkout{" "}
            <span aria-hidden className="text-black/30">
              ·
            </span>{" "}
            Verified authentic
          </p>
          <p className="text-xs uppercase tracking-[0.28em] text-black">
            Checkout
          </p>
        </div>
      </section>

      <BuyNowCheckoutContent
        productSlug={slug}
        checkoutSku={checkoutSku}
        variantLabel={variantLabel}
        product={
          product
            ? {
                slug: product.slug,
                image: product.image,
                name: product.name,
                brand: product.brand,
                sku: product.sku,
                price: product.price,
                priceCents: product.priceCents,
                oldPrice: product.oldPrice,
              }
            : undefined
        }
      />
    </main>
  );
}
