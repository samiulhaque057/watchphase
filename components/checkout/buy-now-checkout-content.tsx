"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { BuyNowCheckoutForm } from "@/components/checkout/buy-now-checkout-form";
import { formatTakaFromCents } from "@/lib/format-taka";
import {
  DEFAULT_SHIPPING_METHOD,
  SHIPPING_METHODS,
  type ShippingMethod,
} from "@/lib/shipping-method";

type BuyNowProductSummary = {
  slug: string;
  image: string;
  name: string;
  brand: string;
  sku: string;
  price: string;
  priceCents: number;
  oldPrice: string | null;
};

type Props = {
  productSlug?: string;
  checkoutSku: string;
  variantLabel: string | null;
  product?: BuyNowProductSummary;
};

export function BuyNowCheckoutContent({
  productSlug,
  checkoutSku,
  variantLabel,
  product,
}: Props) {
  const [shippingMethod, setShippingMethod] = useState<ShippingMethod>(
    DEFAULT_SHIPPING_METHOD,
  );

  const shippingFee = SHIPPING_METHODS[shippingMethod].feeCents;
  const dueToday = useMemo(() => {
    if (!product) return null;
    return product.priceCents + shippingFee;
  }, [product, shippingFee]);

  return (
    <div className="container mx-auto flex flex-col px-4 py-10 lg:grid lg:grid-cols-12 lg:gap-12">
      <section
        aria-label="Checkout form"
        className="order-1 border border-gray-200 bg-white p-6 md:p-8 lg:order-none lg:col-span-7"
      >
        <BuyNowCheckoutForm
          productSlug={productSlug}
          checkoutSku={checkoutSku}
          shippingMethod={shippingMethod}
          onShippingMethodChange={setShippingMethod}
        />
      </section>

      <aside
        aria-label="Order summary"
        className="order-2 mt-8 border border-gray-200 bg-[#fafafa] p-6 md:p-8 lg:order-none lg:col-span-5 lg:mb-0 lg:mt-0"
      >
        <h2 className="text-xs font-semibold uppercase tracking-[0.2em]">
          Order Summary
        </h2>

        {product ? (
          <div className="mt-6 flex gap-4 border-b border-gray-200 pb-6">
            <div className="relative h-24 w-24 shrink-0 border border-gray-200 bg-white">
              <Image
                src={product.image}
                alt={product.name}
                fill
                sizes="96px"
                className="object-contain p-2"
              />
            </div>
            <div className="min-w-0 flex-1">
              <Link
                href={`/product/${product.slug}`}
                className="text-sm font-medium leading-snug hover:underline"
              >
                {product.name}
              </Link>
              <p className="mt-1 text-xs uppercase tracking-[0.12em] text-black/55">
                {product.brand}
                {variantLabel ? (
                  <>
                    {" "}
                    · <span className="normal-case">{variantLabel}</span>
                  </>
                ) : null}{" "}
                · SKU <span className="font-mono lowercase">{checkoutSku}</span>
              </p>
              <div className="mt-3">
                <p className="text-lg font-semibold">{product.price}</p>
                {product.oldPrice ? (
                  <p className="text-sm text-black/45 line-through">
                    {product.oldPrice}
                  </p>
                ) : null}
              </div>
            </div>
          </div>
        ) : (
          <div className="mt-6 border-b border-gray-200 pb-6 text-sm leading-relaxed text-black/65">
            <p>Select a watch from the shop and choose Buy Now, or browse</p>
            <Link href="/mens-watch" className="mt-3 inline-block underline">
              Mens Watch
            </Link>
            <span aria-hidden className="text-black/30">
              {" "}
              ·{" "}
            </span>
            <Link href="/womens-watch" className="inline-block underline">
              Womens Watch
            </Link>
          </div>
        )}

        <dl className="mt-6 space-y-3 text-sm">
          <div className="flex justify-between">
            <dt className="text-black/60">Subtotal</dt>
            <dd>{product?.price ?? "—"}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-black/60">Estimated shipping</dt>
            <dd>{formatTakaFromCents(shippingFee)}</dd>
          </div>
          <div className="flex justify-between border-t border-gray-200 pt-4 text-base font-semibold">
            <dt>Due today</dt>
            <dd>{dueToday != null ? formatTakaFromCents(dueToday) : "—"}</dd>
          </div>
        </dl>

        <div className="mt-8 space-y-2 text-xs uppercase tracking-[0.15em] text-black/55">
          <p>Secure SSL checkout</p>
          <p>100% Quality Checked</p>
        </div>
      </aside>
    </div>
  );
}
