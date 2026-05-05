"use client";

import type { ReactNode } from "react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { CatalogProduct } from "@/lib/catalog";
import {
  resolvePurchasableSkuForProduct,
  variationLabelForSku,
} from "@/lib/catalog";
import type { CartLine } from "@/lib/cart-types";
import {
  CART_LINE_MAX_QTY,
  CART_MAX_DISTINCT_LINES,
  CART_STORAGE_KEY,
} from "@/lib/cart-types";
import { cartLineKey } from "@/lib/cart-line-key";
import { safeReadStoredCart, safeWriteStoredCart } from "@/lib/cart-storage";

type CartContextValue = {
  lines: CartLine[];
  hydrated: boolean;
  itemCount: number;
  addFromProduct: (product: CatalogProduct, quantity?: number) => void;
  addFromProductSelection: (
    product: CatalogProduct,
    sku: string,
    quantity?: number,
  ) => void;
  setLineQuantity: (cartKey: string, quantity: number) => void;
  removeLine: (cartKey: string) => void;
  clear: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);

function mergeSelectionIntoLines(
  lines: CartLine[],
  product: CatalogProduct,
  sku: string,
  addQty: number,
): CartLine[] {
  const skuTrim = sku.trim();
  const key = cartLineKey(product.slug, skuTrim);
  const idx = lines.findIndex(
    (l) => cartLineKey(l.slug, l.sku) === key,
  );
  const variationLabel = variationLabelForSku(product, skuTrim);

  if (idx === -1) {
    if (lines.length >= CART_MAX_DISTINCT_LINES) {
      return lines;
    }
    const nextQty = Math.min(addQty, CART_LINE_MAX_QTY);
    return [
      ...lines,
      {
        slug: product.slug,
        quantity: nextQty,
        name: product.name,
        brand: product.brand,
        sku: skuTrim,
        variationLabel: variationLabel ?? null,
        image: product.image,
        priceLabel: product.price,
        priceCents: product.priceCents,
      },
    ];
  }

  const next = [...lines];
  const merged = Math.min(CART_LINE_MAX_QTY, next[idx].quantity + addQty);
  next[idx] = {
    ...next[idx],
    quantity: merged,
    name: product.name,
    brand: product.brand,
    sku: skuTrim,
    variationLabel: variationLabel ?? next[idx].variationLabel ?? null,
    image: product.image,
    priceLabel: product.price,
    priceCents: product.priceCents,
  };
  return next;
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setLines(safeReadStoredCart());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) {
      return;
    }
    safeWriteStoredCart(lines);
  }, [lines, hydrated]);

  useEffect(() => {
    function onStorage(e: StorageEvent) {
      if (e.key !== CART_STORAGE_KEY) {
        return;
      }
      setLines(safeReadStoredCart());
    }
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  const itemCount = useMemo(
    () => lines.reduce((sum, line) => sum + line.quantity, 0),
    [lines],
  );

  const addFromProductSelection = useCallback(
    (product: CatalogProduct, sku: string, quantity = 1) => {
      if (product.badge === "Sold Out") {
        return;
      }
      const effective = sku.trim()
        ? sku.trim()
        : resolvePurchasableSkuForProduct(product, null);
      const qty = Number.isFinite(quantity)
        ? Math.max(1, Math.min(Math.floor(quantity), CART_LINE_MAX_QTY))
        : 1;
      setLines((prev) =>
        mergeSelectionIntoLines(prev, product, effective, qty),
      );
    },
    [],
  );

  const addFromProduct = useCallback(
    (product: CatalogProduct, quantity = 1) => {
      const sku =
        product.variations.length > 0
          ? resolvePurchasableSkuForProduct(product, null)
          : product.sku;
      addFromProductSelection(product, sku, quantity);
    },
    [addFromProductSelection],
  );

  const setLineQuantity = useCallback((cartKey: string, quantity: number) => {
    const q = Math.max(0, Math.min(Math.floor(quantity), CART_LINE_MAX_QTY));
    setLines((prev) => {
      if (q <= 0) {
        return prev.filter((l) => cartLineKey(l.slug, l.sku) !== cartKey);
      }
      const idx = prev.findIndex(
        (l) => cartLineKey(l.slug, l.sku) === cartKey,
      );
      if (idx === -1) {
        return prev;
      }
      const next = [...prev];
      next[idx] = { ...next[idx], quantity: q };
      return next;
    });
  }, []);

  const removeLine = useCallback((cartKey: string) => {
    setLines((prev) =>
      prev.filter((l) => cartLineKey(l.slug, l.sku) !== cartKey),
    );
  }, []);

  const clear = useCallback(() => {
    setLines([]);
    try {
      localStorage.removeItem(CART_STORAGE_KEY);
    } catch {
      /**/
    }
  }, []);

  const value = useMemo(
    () => ({
      lines,
      hydrated,
      itemCount,
      addFromProduct,
      addFromProductSelection,
      setLineQuantity,
      removeLine,
      clear,
    }),
    [
      lines,
      hydrated,
      itemCount,
      addFromProduct,
      addFromProductSelection,
      setLineQuantity,
      removeLine,
      clear,
    ],
  );

  return (
    <CartContext.Provider value={value}>{children}</CartContext.Provider>
  );
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) {
    throw new Error("useCart must be used within CartProvider");
  }
  return ctx;
}
