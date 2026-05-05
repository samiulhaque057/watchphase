"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  startTransition,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  resolvePurchasableSkuForProduct,
  variationLabelForSku,
  type CatalogProduct,
} from "@/lib/catalog";
import { CART_LINE_MAX_QTY } from "@/lib/cart-types";
import { useCart } from "@/components/cart/cart-context";

/** Primary CTA — deep forest green, full-width luxury accent. */
const BUY_NOW_LUXURY_GREEN =
  "inline-flex w-full items-center justify-center border border-[#1B4332] bg-[#1B4332] px-6 py-3.5 text-xs font-semibold uppercase tracking-[0.18em] text-white transition hover:border-[#2d6a4f] hover:bg-[#2d6a4f] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1B4332] focus-visible:ring-offset-2";

function shortAck(text: string) {
  return text.length > 36 ? `${text.slice(0, 34)}…` : text;
}

type Props = {
  product: CatalogProduct;
  initialSkuQuery: string | null;
};

export function ProductPurchaseActions({
  product,
  initialSkuQuery,
}: Props) {
  const router = useRouter();
  const { addFromProductSelection } = useCart();
  const hasVariants = product.variations.length > 0;

  const initialSku = useMemo(
    () => resolvePurchasableSkuForProduct(product, initialSkuQuery),
    [product, initialSkuQuery],
  );

  const [selectedSku, setSelectedSku] = useState(initialSku);
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    startTransition(() => {
      setSelectedSku(initialSku);
    });
  }, [initialSku]);

  const syncQuery = useCallback(
    (nextSku: string) => {
      if (!hasVariants) {
        return;
      }
      router.replace(
        `/product/${product.slug}?sku=${encodeURIComponent(nextSku)}`,
        { scroll: false },
      );
    },
    [hasVariants, product.slug, router],
  );

  const onSelectVariant = useCallback(
    (sku: string) => {
      setSelectedSku(sku);
      syncQuery(sku);
    },
    [syncQuery],
  );

  const [ack, setAck] = useState<string | null>(null);
  const soldOut = product.badge === "Sold Out";
  const variationLabel = variationLabelForSku(product, selectedSku);

  function onAdd() {
    if (soldOut) {
      return;
    }
    addFromProductSelection(product, selectedSku, quantity);
    const labelSuffix = variationLabel ? ` (${variationLabel})` : "";
    setAck(`Added ${shortAck(product.name)}${labelSuffix}`);
    window.setTimeout(() => setAck(null), 3200);
  }

  const decQty = () => setQuantity((q) => Math.max(1, q - 1));
  const incQty = () =>
    setQuantity((q) => Math.min(CART_LINE_MAX_QTY, q + 1));

  const buyNowHref =
    `/buy-now?slug=${encodeURIComponent(product.slug)}` +
    (hasVariants ? `&sku=${encodeURIComponent(selectedSku)}` : "");

  const addToCartClass = soldOut
    ? "w-full cursor-not-allowed border border-neutral-300 bg-neutral-50 py-3.5 text-xs font-semibold uppercase tracking-[0.18em] text-black/35"
    : "w-full border border-black bg-white py-3.5 text-xs font-semibold uppercase tracking-[0.18em] text-black transition hover:bg-neutral-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2";

  return (
    <div className="flex w-full flex-col gap-6">
      {hasVariants ? (
        <div>
          <p
            id="product-variant-label"
            className="text-[11px] font-medium uppercase tracking-[0.2em] text-neutral-500"
          >
            Colour / option
          </p>
          <div
            className="mt-2 flex flex-wrap gap-2"
            role="listbox"
            aria-labelledby="product-variant-label"
          >
            {product.variations.map((v) => {
              const selected = v.sku === selectedSku;
              return (
                <button
                  key={v.sku}
                  type="button"
                  role="option"
                  aria-selected={selected}
                  aria-label={`${v.label}${selected ? ", selected" : ""}`}
                  onClick={() => onSelectVariant(v.sku)}
                  className={`min-h-[44px] min-w-[6.5rem] border px-4 py-2.5 text-center text-[11px] font-medium uppercase tracking-[0.12em] outline-none transition focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2 ${
                    selected
                      ? "border-black bg-white text-black"
                      : "border-neutral-300 bg-white text-neutral-700 hover:border-neutral-500"
                  }`}
                >
                  {v.label}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      <p className="text-[11px] uppercase tracking-[0.14em] text-neutral-500">
        SKU{" "}
        <span className="font-mono text-[12px] normal-case tracking-normal text-black">
          {selectedSku}
        </span>
      </p>

      <div>
        <p
          id="product-qty-label"
          className="text-[11px] font-medium uppercase tracking-[0.2em] text-neutral-500"
        >
          Quantity
        </p>
        <div
          className="mt-2 flex w-full max-w-[11rem] border border-black"
          role="group"
          aria-labelledby="product-qty-label"
        >
          <button
            type="button"
            disabled={soldOut || quantity <= 1}
            onClick={decQty}
            aria-label="Decrease quantity"
            className="flex flex-1 items-center justify-center py-3 text-lg leading-none text-black transition enabled:hover:bg-neutral-50 disabled:cursor-not-allowed disabled:text-black/25"
          >
            −
          </button>
          <span
            className="flex flex-1 items-center justify-center border-x border-black py-3 text-sm font-medium tabular-nums text-black"
            aria-live="polite"
          >
            {quantity}
          </span>
          <button
            type="button"
            disabled={soldOut || quantity >= CART_LINE_MAX_QTY}
            onClick={incQty}
            aria-label="Increase quantity"
            className="flex flex-1 items-center justify-center py-3 text-lg leading-none text-black transition enabled:hover:bg-neutral-50 disabled:cursor-not-allowed disabled:text-black/25"
          >
            +
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <button
          type="button"
          disabled={soldOut}
          aria-label={
            soldOut
              ? "Unavailable — sold out"
              : `Add ${product.name} to cart${
                  variationLabel ? `, ${variationLabel}` : ""
                }`
          }
          onClick={onAdd}
          className={addToCartClass}
        >
          {soldOut ? "Sold Out" : ack ? "Added to Cart" : "Add to cart"}
        </button>

        {soldOut ? (
          <button
            type="button"
            disabled
            className="w-full cursor-not-allowed border border-neutral-300 bg-neutral-100 py-3.5 text-xs font-semibold uppercase tracking-[0.18em] text-black/35"
          >
            Buy it now
          </button>
        ) : (
          <Link href={buyNowHref} className={BUY_NOW_LUXURY_GREEN}>
            Buy it now
          </Link>
        )}

        {ack ? (
          <p className="text-xs text-neutral-600" role="status" aria-live="polite">
            {ack}.{" "}
            <Link href="/cart" className="font-medium underline underline-offset-2 hover:text-black">
              View cart
            </Link>
          </p>
        ) : null}
      </div>
    </div>
  );
}
