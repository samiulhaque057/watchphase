"use client";

import Link from "next/link";
import { useCart } from "@/components/cart/cart-context";

function IconCart({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
      />
    </svg>
  );
}

export function HeaderCartLink() {
  const { itemCount, hydrated } = useCart();
  const showBadge = hydrated && itemCount > 0;

  return (
    <Link
      href="/cart"
      className="relative inline-flex items-center justify-center text-black/70 transition hover:text-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2"
      aria-label={
        showBadge
          ? `Shopping cart, ${itemCount} items`
          : "Shopping cart, empty"
      }
    >
      <IconCart />
      {showBadge ? (
        <span className="absolute -right-1.5 -top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-black px-0.5 text-[9px] font-bold text-white">
          {itemCount > 99 ? "99+" : itemCount}
        </span>
      ) : null}
    </Link>
  );
}
