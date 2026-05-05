"use client";

import Link from "next/link";
import { useState } from "react";
import type { CatalogProduct } from "@/lib/catalog";
import { useCart } from "@/components/cart/cart-context";

type Props = {
  product: CatalogProduct;
};

function shortAck(text: string) {
  return text.length > 36 ? `${text.slice(0, 34)}…` : text;
}

export function AddToCartButton({ product }: Props) {
  const { addFromProduct } = useCart();
  const [ack, setAck] = useState<string | null>(null);
  const soldOut = product.badge === "Sold Out";

  function onAdd() {
    if (soldOut) {
      return;
    }
    addFromProduct(product, 1);
    setAck(`Added ${shortAck(product.name)}`);
    window.setTimeout(() => setAck(null), 3200);
  }

  const base =
    "px-8 py-3 text-xs font-bold uppercase tracking-[0.2em] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2";

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        disabled={soldOut}
        aria-label={
          soldOut ? "Unavailable — sold out" : `Add ${product.name} to cart`
        }
        onClick={onAdd}
        className={
          soldOut
            ? `${base} cursor-not-allowed border border-gray-300 text-black/40`
            : `${base} bg-black text-white hover:bg-black/85`
        }
      >
        {soldOut ? "Sold Out" : ack ? "Added to Cart" : "Add to Cart"}
      </button>
      {ack ? (
        <p className="text-xs text-black/65" role="status" aria-live="polite">
          {ack}.{" "}
          <a href="/cart" className="font-medium underline hover:text-black">
            View cart
          </a>
        </p>
      ) : null}
    </div>
  );
}

type MiniProps = {
  product: CatalogProduct;
  className?: string;
};

export function AddToCartMiniButton({ product, className = "" }: MiniProps) {
  const { addFromProduct } = useCart();
  const [added, setAdded] = useState(false);
  const soldOut = product.badge === "Sold Out";
  const hasVariants = product.variations.length > 0;

  if (hasVariants && !soldOut) {
    return (
      <Link
        href={`/product/${encodeURIComponent(product.slug)}`}
        className={`block w-full border py-3 text-center text-xs font-bold uppercase tracking-[0.2em] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2 border-black text-black hover:bg-black hover:text-white ${className}`}
        aria-label={`Choose colour or option for ${product.name}`}
      >
        Choose option
      </Link>
    );
  }

  function onAdd() {
    if (soldOut) {
      return;
    }
    addFromProduct(product, 1);
    setAdded(true);
    window.setTimeout(() => setAdded(false), 2500);
  }

  return (
    <button
      type="button"
      disabled={soldOut}
      onClick={onAdd}
      aria-label={soldOut ? "Unavailable — sold out" : `Add ${product.name} to cart`}
      className={`w-full border py-3 text-center text-xs font-bold uppercase tracking-[0.2em] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2 ${
        soldOut
          ? "cursor-not-allowed border-gray-300 text-black/35"
          : added
            ? "border-black bg-black text-white"
            : "border-black text-black hover:bg-black hover:text-white"
      } ${className}`}
    >
      {soldOut ? "Sold Out" : added ? "Added to Cart" : "Add to Cart"}
    </button>
  );
}
