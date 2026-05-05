"use client";

import { formatTakaFromCents } from "@/lib/format-taka";
import {
  DEFAULT_SHIPPING_METHOD,
  SHIPPING_METHODS,
  type ShippingMethod,
} from "@/lib/shipping-method";

type Props = {
  disabled?: boolean;
  value: ShippingMethod;
  onChange: (next: ShippingMethod) => void;
};

export function ShippingMethodFields({
  disabled = false,
  value,
  onChange,
}: Props) {
  const methods = Object.entries(SHIPPING_METHODS) as Array<
    [ShippingMethod, (typeof SHIPPING_METHODS)[ShippingMethod]]
  >;

  return (
    <fieldset className="space-y-3" disabled={disabled}>
      <legend className="text-xs font-semibold uppercase tracking-[0.2em] text-black/75">
        Shipping method
      </legend>
      <input
        type="hidden"
        name="shippingMethod"
        value={value || DEFAULT_SHIPPING_METHOD}
      />
      <div className="overflow-hidden rounded-md border border-gray-300 bg-white">
        {methods.map(([key, row], index) => {
          const checked = value === key;
          return (
            <label
              key={key}
              className={`flex cursor-pointer items-center justify-between gap-3 px-4 py-3 ${
                index > 0 ? "border-t border-gray-200" : ""
              } ${checked ? "bg-black/[0.03]" : "bg-white"} ${
                disabled ? "cursor-not-allowed opacity-60" : ""
              }`}
            >
              <span className="flex items-center gap-3">
                <input
                  type="radio"
                  name="_shippingMethodVisual"
                  checked={checked}
                  onChange={() => onChange(key)}
                  disabled={disabled}
                  className="h-4 w-4 accent-black"
                />
                <span className="text-sm text-black">{row.label}</span>
              </span>
              <span className="text-sm font-semibold text-black">
                {formatTakaFromCents(row.feeCents)}
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
