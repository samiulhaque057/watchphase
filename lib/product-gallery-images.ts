export const MAX_PRODUCT_GALLERY_IMAGES = 24;

/** Trim, drop consecutive empties; preserve first occurrence order; cap gallery size. */
export function normalizeGalleryUrls(urls: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of urls) {
    const t = raw.trim();
    if (!t || seen.has(t)) {
      continue;
    }
    seen.add(t);
    out.push(t);
    if (out.length >= MAX_PRODUCT_GALLERY_IMAGES) {
      break;
    }
  }
  return out;
}
