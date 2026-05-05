export type CartLine = {
  slug: string;
  quantity: number;
  name: string;
  brand: string;
  sku: string;
  variationLabel?: string | null;
  image: string;
  priceLabel: string;
  /** Snapshot when added; totals use server prices at checkout. */
  priceCents: number;
};

export const CART_STORAGE_KEY = "watchh-cart-v1";

export const CART_LINE_MAX_QTY = 20;

export const CART_MAX_DISTINCT_LINES = 40;
