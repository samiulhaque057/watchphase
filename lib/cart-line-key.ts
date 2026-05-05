/** Stable identity for cart lines across slug + SKU (variant-aware). */
export function cartLineKey(slug: string, sku: string): string {
  return `${slug}::${sku.trim()}`;
}
