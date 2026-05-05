"use client";

import Image from "next/image";
import { useCallback, useEffect, useState } from "react";

type ProductImageGalleryProps = {
  productSlug: string;
  images: string[];
  productName: string;
  badge: "Sale" | "Sold Out" | null;
};

export function ProductImageGallery({
  productSlug,
  images,
  productName,
  badge,
}: ProductImageGalleryProps) {
  const list = images.filter(Boolean);
  const [selected, setSelected] = useState(0);

  useEffect(() => {
    setSelected(0);
  }, [productSlug]);

  const goPrev = useCallback(() => {
    setSelected((i) => Math.max(0, i - 1));
  }, []);

  const goNext = useCallback(() => {
    setSelected((i) => Math.min(list.length - 1, i + 1));
  }, [list.length]);

  if (list.length === 0) {
    return null;
  }

  const safeIndex =
    selected >= 0 && selected < list.length ? selected : 0;
  const mainSrc = list[safeIndex]!;
  const atStart = safeIndex <= 0;
  const atEnd = safeIndex >= list.length - 1;

  return (
    <div className="w-full">
      <div className="relative aspect-square w-full overflow-hidden border border-neutral-200 bg-white">
        <Image
          src={mainSrc}
          alt={productName}
          fill
          sizes="(max-width: 768px) 100vw, min(42rem, 50vw)"
          className="object-contain p-4 sm:p-6 md:p-10"
          priority
        />
        {badge ? (
          <span
            className={`absolute left-3 top-3 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-white ${
              badge === "Sold Out" ? "bg-black" : "bg-neutral-800"
            }`}
          >
            {badge}
          </span>
        ) : null}
      </div>

      {list.length > 1 ? (
        <div
          className="mt-4 flex items-center justify-center gap-6 border-b border-neutral-200 pb-4"
          role="group"
          aria-label="Product photo gallery"
        >
          <button
            type="button"
            onClick={goPrev}
            disabled={atStart}
            aria-label="Previous image"
            className="min-h-[44px] min-w-[44px] text-2xl leading-none text-black transition enabled:hover:text-black/60 disabled:cursor-not-allowed disabled:text-black/25"
          >
            ‹
          </button>
          <p
            className="min-w-[3.5rem] text-center text-sm tabular-nums tracking-wide text-neutral-600"
            aria-live="polite"
          >
            {safeIndex + 1}/{list.length}
          </p>
          <button
            type="button"
            onClick={goNext}
            disabled={atEnd}
            aria-label="Next image"
            className="min-h-[44px] min-w-[44px] text-2xl leading-none text-black transition enabled:hover:text-black/60 disabled:cursor-not-allowed disabled:text-black/25"
          >
            ›
          </button>
        </div>
      ) : null}
    </div>
  );
}
