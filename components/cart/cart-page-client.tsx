"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

import { CartCheckoutForm } from "@/components/cart/cart-checkout-form";
import { formatTakaFromCents } from "@/lib/format-taka";
import { useCart } from "@/components/cart/cart-context";
import { cartLineKey } from "@/lib/cart-line-key";
import { CART_LINE_MAX_QTY } from "@/lib/cart-types";
import type { CartLine } from "@/lib/cart-types";
import { SHIPPING_METHODS, type ShippingMethod } from "@/lib/shipping-method";

export function CartPageClient() {
  const { lines, setLineQuantity, removeLine } = useCart();
  const [orderPlaced, setOrderPlaced] = useState<{
    referenceNumber: number;
    shippingMethod: ShippingMethod;
    lines: CartLine[];
  } | null>(null);

  const activeLines = orderPlaced?.lines ?? lines;

  const subtotalCents = activeLines.reduce(
    (sum, row) => sum + row.priceCents * row.quantity,
    0,
  );
  const shippingCents = orderPlaced
    ? SHIPPING_METHODS[orderPlaced.shippingMethod].feeCents
    : 0;
  const dueTodayCents = subtotalCents + shippingCents;

  useEffect(() => {
    if (!orderPlaced) return;
    requestAnimationFrame(() => {
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }, [orderPlaced]);

  return (
    <div className="container mx-auto px-4 py-10 lg:grid lg:grid-cols-12 lg:gap-12">
      <section
        aria-label={orderPlaced ? "Order placed" : "Cart items"}
        className="lg:col-span-7"
      >
        {orderPlaced ? (
          <div className="border border-gray-200 bg-white px-6 py-10 md:px-8 md:py-12">
            <div
              className="border border-black bg-[#f8f8f8] px-5 py-5 text-sm leading-relaxed"
              role="status"
            >
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em]">
                Order placed
              </p>
              <p className="mt-3 text-black/80">
                Thank you — we received your order. Your reference number is{" "}
                <span className="font-mono font-semibold text-black">
                  #{orderPlaced.referenceNumber}
                </span>
                . Our team may contact you to confirm shipping and payment.
              </p>
            </div>
            <button
              type="button"
              className="mt-5 w-full border border-black bg-white py-4 text-xs font-bold uppercase tracking-[0.28em] hover:bg-black hover:text-white"
              onClick={() => setOrderPlaced(null)}
            >
              Place another order
            </button>
          </div>
        ) : (
          <>
            <h1 className="text-2xl font-semibold uppercase tracking-[0.08em]">
              Cart
            </h1>
            <p className="mt-2 text-sm text-black/60">
              Adjust quantities or remove items before placing your order.
            </p>
          </>
        )}

        {!orderPlaced && lines.length === 0 ? (
          <p className="mt-10 text-sm leading-relaxed text-black/70">
            Your cart is empty.{" "}
            <Link href="/mens-watch" className="font-medium underline">
              Browse collections
            </Link>
          </p>
        ) : null}

        {!orderPlaced && lines.length > 0 ? (
          <ul className="mt-8 divide-y divide-gray-200 border border-gray-200">
            {lines.map((line) => {
              const lineTotal = line.priceCents * line.quantity;
              const rowKey = cartLineKey(line.slug, line.sku);
              return (
                <li
                  key={rowKey}
                  className="flex flex-wrap gap-4 p-4 sm:flex-nowrap sm:items-start"
                >
                  <Link
                    href={`/product/${line.slug}`}
                    className="relative h-24 w-24 shrink-0 overflow-hidden border border-gray-200 bg-white"
                  >
                    <Image
                      src={line.image}
                      alt={line.name}
                      fill
                      className="object-contain p-2"
                      sizes="96px"
                    />
                  </Link>
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/product/${line.slug}`}
                      className="text-sm font-medium leading-snug hover:underline"
                    >
                      {line.name}
                    </Link>
                    <p className="mt-1 text-xs uppercase tracking-[0.12em] text-black/55">
                      {line.brand} · {line.priceLabel}
                      {line.variationLabel ? (
                        <>
                          {" "}
                          ·{" "}
                          <span className="normal-case">
                            {line.variationLabel}
                          </span>
                        </>
                      ) : null}
                      {" "}
                      ·{" "}
                      <span className="font-mono lowercase">SKU {line.sku}</span>
                    </p>
                    <div className="mt-3 flex flex-wrap items-center gap-3">
                      <label
                        htmlFor={`qty-${rowKey}`}
                        className="text-xs uppercase tracking-[0.14em] text-black/55"
                      >
                        Qty
                      </label>
                      <select
                        id={`qty-${rowKey}`}
                        aria-label={`Quantity for ${line.name}`}
                        value={line.quantity}
                        onChange={(e) =>
                          setLineQuantity(
                            rowKey,
                            Number.parseInt(e.target.value, 10),
                          )
                        }
                        className="border border-gray-300 bg-white px-2 py-1.5 text-sm outline-none focus:border-black"
                      >
                        {Array.from({ length: CART_LINE_MAX_QTY }, (_, i) => (
                          <option key={i + 1} value={i + 1}>
                            {i + 1}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        className="text-xs font-medium uppercase tracking-[0.12em] text-black/55 underline-offset-4 hover:text-black hover:underline"
                        onClick={() => removeLine(rowKey)}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                  <p className="w-full shrink-0 text-sm font-semibold sm:w-auto sm:text-right md:min-w-[7rem]">
                    {formatTakaFromCents(lineTotal)}
                  </p>
                </li>
              );
            })}
          </ul>
        ) : null}
      </section>

      <aside
        aria-label="Order summary & checkout"
        className="mt-10 border border-gray-200 bg-[#fafafa] p-6 md:p-8 lg:col-span-5 lg:mt-0"
      >
        <h2 className="text-xs font-semibold uppercase tracking-[0.2em]">
          Order summary
        </h2>
        {activeLines.length === 0 ? (
          <p className="mt-6 text-sm text-black/60">No items in summary yet.</p>
        ) : (
          <div className="mt-5 space-y-4">
            {activeLines.slice(0, 1).map((line) => (
              <div key={cartLineKey(line.slug, line.sku)} className="flex gap-3">
                <div className="relative h-20 w-16 shrink-0 overflow-hidden border border-gray-200 bg-white">
                  <Image
                    src={line.image}
                    alt={line.name}
                    fill
                    className="object-contain p-1.5"
                    sizes="64px"
                  />
                </div>
                <div className="min-w-0">
                  <p className="line-clamp-2 text-sm font-medium leading-snug">
                    {line.name}
                  </p>
                  <p className="mt-1 text-[10px] uppercase tracking-[0.12em] text-black/55">
                    {line.brand} · SKU {line.sku}
                  </p>
                  <p className="mt-2 text-xl font-semibold">
                    {formatTakaFromCents(line.priceCents * line.quantity)}
                  </p>
                </div>
              </div>
            ))}
            {activeLines.length > 1 ? (
              <p className="text-xs text-black/55">
                +{activeLines.length - 1} more item
                {activeLines.length - 1 === 1 ? "" : "s"}
              </p>
            ) : null}
          </div>
        )}

        <dl className="mt-6 space-y-3 border-t border-gray-200 pt-5 text-sm">
          <div className="flex justify-between">
            <dt className="text-black/60">Subtotal</dt>
            <dd>
              {activeLines.length === 0 ? "—" : formatTakaFromCents(subtotalCents)}
            </dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-black/60">Estimated shipping</dt>
            <dd>
              {activeLines.length === 0
                ? "—"
                : orderPlaced
                  ? formatTakaFromCents(shippingCents)
                  : "Tk 70.00+"}
            </dd>
          </div>
          <div className="flex justify-between border-t border-gray-200 pt-4 text-base font-semibold">
            <dt>Due today</dt>
            <dd>
              {activeLines.length === 0
                ? "—"
                : orderPlaced
                  ? formatTakaFromCents(dueTodayCents)
                  : formatTakaFromCents(subtotalCents)}
            </dd>
          </div>
        </dl>

        {!orderPlaced ? (
          <div className="mt-10 border-t border-gray-300 pt-8">
            <h3 className="text-xs font-semibold uppercase tracking-[0.2em]">
              Checkout
            </h3>
            <CartCheckoutForm
              lines={lines}
              onOrderPlaced={({ referenceNumber, shippingMethod }) => {
                setOrderPlaced({
                  referenceNumber,
                  shippingMethod,
                  lines: [...lines],
                });
              }}
            />
          </div>
        ) : (
          <div className="mt-8 border-t border-gray-200 pt-6 text-[11px] font-semibold uppercase tracking-[0.18em] text-black/45">
            Secure SSL checkout
            <p className="mt-2 text-[10px] tracking-[0.2em] text-black/40">
              100% Quality Checked
            </p>
          </div>
        )}
      </aside>
    </div>
  );
}
