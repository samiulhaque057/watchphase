"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

type Props = {
  images: string[];
};

export function HeroSlideshow({ images }: Props) {
  const [activeIdx, setActiveIdx] = useState(0);
  const slides = images;

  useEffect(() => {
    if (slides.length <= 1) {
      return;
    }
    const timer = window.setInterval(() => {
      setActiveIdx((prev) => (prev + 1) % slides.length);
    }, 3800);
    return () => window.clearInterval(timer);
  }, [slides.length]);

  useEffect(() => {
    if (activeIdx >= slides.length) {
      setActiveIdx(0);
    }
  }, [activeIdx, slides.length]);

  return (
    <section className="relative h-[62svh] min-h-[460px] max-h-[700px] sm:h-[68svh] sm:min-h-[560px] md:h-[74svh] md:min-h-[680px] overflow-hidden bg-black">
      <div className="absolute inset-0">
        {slides.map((src, idx) => (
          <Image
            key={`${src}-${idx}`}
            src={src}
            alt={`Hero slide ${idx + 1}`}
            fill
            priority={idx === 0}
            className={`object-cover object-center transition-opacity duration-700 ${
              idx === activeIdx ? "opacity-100" : "opacity-0"
            }`}
          />
        ))}
      </div>
      <div className="relative z-10 mx-auto flex h-full max-w-6xl items-end justify-center px-4 pb-6 sm:pb-8 md:pb-10 lg:pb-12">
        <Link
          href="/mens-watch"
          className="bg-white px-8 py-3 text-sm font-bold uppercase tracking-[0.2em] text-black shadow-md transition hover:bg-gray-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/40 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
          aria-label="Explore collection — Mens watches"
        >
          Explore Collection
        </Link>
      </div>
    </section>
  );
}

