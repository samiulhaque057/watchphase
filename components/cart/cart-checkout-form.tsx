"use client";

import { useState } from "react";
import { CheckoutContactDeliveryFields } from "@/components/checkout/checkout-contact-delivery-fields";
import { ShippingMethodFields } from "@/components/checkout/shipping-method-fields";
import type { CartLine } from "@/lib/cart-types";
import { useCart } from "@/components/cart/cart-context";
import {
  DEFAULT_SHIPPING_METHOD,
  type ShippingMethod,
} from "@/lib/shipping-method";

type Props = {
  lines: CartLine[];
  onOrderPlaced?: (payload: {
    orderNumber: number;
    referenceNumber: number;
    shippingMethod: ShippingMethod;
  }) => void;
};

export function CartCheckoutForm({ lines, onOrderPlaced }: Props) {
  const { clear } = useCart();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shippingMethod, setShippingMethod] =
    useState<ShippingMethod>(DEFAULT_SHIPPING_METHOD);

  const disabled = lines.length === 0;

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (lines.length === 0) {
      return;
    }

    const form = event.currentTarget;
    const fd = new FormData(form);

    const fullName = String(fd.get("fullName") ?? "").trim();
    const [firstNameToken, ...restNameTokens] = fullName.split(/\s+/).filter(Boolean);
    const firstName = firstNameToken ?? "";
    const lastName = restNameTokens.join(" ") || firstName;
    const email = String(fd.get("email") ?? "").trim();
    const phone = String(fd.get("phone") ?? "").trim();
    const address1 = String(fd.get("address1") ?? "").trim();
    const city = String(fd.get("city") ?? "").trim();
    const postcode = String(fd.get("postcode") ?? "").trim() || "N/A";
    const shippingMethodRaw = String(
      fd.get("shippingMethod") ?? DEFAULT_SHIPPING_METHOD,
    );
    const shippingMethodSelected =
      shippingMethodRaw === "OUTSIDE_DHAKA"
        ? "OUTSIDE_DHAKA"
        : "INSIDE_DHAKA";
    const instructionsRaw = String(fd.get("instructions") ?? "");

    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: lines.map((l) => ({
            productSlug: l.slug,
            sku: l.sku,
            quantity: l.quantity,
          })),
          firstName,
          lastName,
          email,
          phone,
          address1,
          city,
          postcode,
          shippingMethod: shippingMethodSelected,
          instructions: instructionsRaw.trim() || undefined,
        }),
      });

      const data = (await response.json().catch(() => ({}))) as {
        error?: string;
        orderNumber?: number;
        referenceNumber?: number;
      };

      if (!response.ok) {
        setError(
          typeof data.error === "string" ? data.error : "Checkout failed.",
        );
        return;
      }

      if (typeof data.orderNumber === "number") {
        const referenceNumber =
          typeof data.referenceNumber === "number"
            ? data.referenceNumber
            : data.orderNumber;
        onOrderPlaced?.({
          orderNumber: data.orderNumber,
          referenceNumber,
          shippingMethod: shippingMethodSelected,
        });
        clear();
        form.reset();
      } else {
        setError("Order placed but reference was missing.");
      }
    } catch {
      setError("Checkout failed.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="mt-10 space-y-8" onSubmit={submit} aria-busy={submitting}>
      {disabled ? (
        <p className="text-sm text-black/65" role="note">
          Add watches to your cart to check out here.
        </p>
      ) : null}

      <CheckoutContactDeliveryFields
        idPrefix="cart"
        disabled={disabled || submitting}
        requireFields={!disabled}
        showPostcode={false}
      />
      <ShippingMethodFields
        disabled={disabled || submitting}
        value={shippingMethod}
        onChange={setShippingMethod}
      />

      {error ? (
        <p className="text-sm text-black/75" role="alert">
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={disabled || submitting}
        className="w-full border border-emerald-800 bg-emerald-800 py-4 text-xs font-bold uppercase tracking-[0.28em] text-white transition hover:border-emerald-900 hover:bg-emerald-900 disabled:cursor-not-allowed disabled:border-emerald-800/35 disabled:bg-emerald-800/35 disabled:text-white/80"
        aria-label="Place order from cart"
      >
        {submitting ? "Submitting…" : "Place order"}
      </button>

      {!disabled ? (
        <p className="text-xs leading-relaxed text-black/55">
          By submitting, you authorize us to contact you about this order.
          Final prices are confirmed from our catalogue at checkout time.
        </p>
      ) : null}
    </form>
  );
}
