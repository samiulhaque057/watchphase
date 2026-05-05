export const SHIPPING_METHODS = {
  INSIDE_DHAKA: {
    label: "Inside Dhaka City",
    feeCents: 7000,
  },
  OUTSIDE_DHAKA: {
    label: "Outside Dhaka City",
    feeCents: 13000,
  },
} as const;

export type ShippingMethod = keyof typeof SHIPPING_METHODS;

export const DEFAULT_SHIPPING_METHOD: ShippingMethod = "INSIDE_DHAKA";
