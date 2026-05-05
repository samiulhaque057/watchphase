"use client";

import { useEffect, useState } from "react";
import { CheckoutContactDeliveryFields } from "@/components/checkout/checkout-contact-delivery-fields";
import { ShippingMethodFields } from "@/components/checkout/shipping-method-fields";
import {
  DEFAULT_SHIPPING_METHOD,
  type ShippingMethod,
} from "@/lib/shipping-method";

type Props = {
  productSlug: string | undefined;
  checkoutSku: string;
  shippingMethod?: ShippingMethod;
  onShippingMethodChange?: (method: ShippingMethod) => void;
};

export function BuyNowCheckoutForm({
  productSlug,
  checkoutSku,
  shippingMethod,
  onShippingMethodChange,
}: Props) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successOrderNumber, setSuccessOrderNumber] = useState<number | null>(
    null,
  );
  const [successReference, setSuccessReference] = useState<number | null>(null);
  const [shippingMethodLocal, setShippingMethodLocal] =
    useState<ShippingMethod>(DEFAULT_SHIPPING_METHOD);
  const shippingMethodSelected = shippingMethod ?? shippingMethodLocal;

  const disabled = !productSlug || checkoutSku.trim() === "";

  useEffect(() => {
    if (successOrderNumber == null) return;
    requestAnimationFrame(() => {
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }, [successOrderNumber]);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!productSlug || checkoutSku.trim() === "") {
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
    const instructionsRaw = String(fd.get("instructions") ?? "");
    const shippingMethodRaw = String(
      fd.get("shippingMethod") ?? shippingMethodSelected,
    );
    const shippingMethodPayload =
      shippingMethodRaw === "OUTSIDE_DHAKA"
        ? "OUTSIDE_DHAKA"
        : "INSIDE_DHAKA";

    const quantityRaw = String(fd.get("quantity") ?? "1");
    const quantity = Number.parseInt(quantityRaw, 10);
    const quantitySafe = Number.isFinite(quantity) ? quantity : 1;

    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productSlug,
          sku: checkoutSku.trim(),
          quantity: quantitySafe,
          firstName,
          lastName,
          email,
          phone,
          address1,
          city,
          postcode,
          shippingMethod: shippingMethodPayload,
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
        setSuccessOrderNumber(data.orderNumber);
        setSuccessReference(
          typeof data.referenceNumber === "number"
            ? data.referenceNumber
            : data.orderNumber,
        );
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

  if (successOrderNumber !== null) {
    return (
      <div className="mt-20 space-y-6 md:mt-24">
        <div
          className="border border-black bg-[#f8f8f8] px-5 py-5 text-sm leading-relaxed"
          role="status"
        >
          <p className="text-xs font-semibold uppercase tracking-[0.2em]">
            Order placed
          </p>
          <p className="mt-3 text-black/80">
            Thank you — we received your order. Your reference number is{" "}
            <span className="font-mono font-semibold text-black">
              #{successReference ?? successOrderNumber}
            </span>
            . Our team may contact you to confirm shipping and payment.
          </p>
        </div>
        <button
          type="button"
          className="w-full border border-black py-4 text-xs font-bold uppercase tracking-[0.28em] hover:bg-black hover:text-white"
          onClick={() => {
            setSuccessOrderNumber(null);
            setSuccessReference(null);
          }}
        >
          Place another order
        </button>
      </div>
    );
  }

  return (
    <>
      <div>
        <h1 className="text-2xl font-semibold uppercase tracking-[0.08em]">
          Buy Now
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-black/65">
          Enter your details to place your order. We&apos;ll confirm payment and
          shipping with you afterward.
        </p>
      </div>
      <form className="mt-10 space-y-8" onSubmit={submit} aria-busy={submitting}>
        {disabled ? (
          <p className="text-sm text-black/65" role="note">
            Open Buy Now from a product page so we know which watch you are
            ordering.
          </p>
        ) : null}

        <input type="hidden" name="quantity" value={1} />

        <CheckoutContactDeliveryFields
          idPrefix="buy"
          disabled={disabled || submitting}
          requireFields={!disabled}
          showPostcode={false}
        />
        <ShippingMethodFields
          disabled={disabled || submitting}
          value={shippingMethodSelected}
          onChange={(next) => {
            setShippingMethodLocal(next);
            onShippingMethodChange?.(next);
          }}
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
          aria-label="Confirm order"
        >
          {submitting ? "Submitting…" : "Place order"}
        </button>

        {!disabled ? (
          <p className="text-xs leading-relaxed text-black/55">
            By submitting, you authorize us to contact you about this order.
            Payments and shipping confirmations can be finalized separately.
          </p>
        ) : null}
      </form>
    </>
  );
}
