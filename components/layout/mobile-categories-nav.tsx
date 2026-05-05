"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { StoreNavCategory } from "@/lib/store-navigation";

const SHEET_MS = 320;

function IconMenu({ className = "h-6 w-6" }: { className?: string }) {
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
        strokeWidth={1.75}
        d="M4 7h16M4 12h16M4 17h16"
      />
    </svg>
  );
}

function IconClose({ className = "h-6 w-6" }: { className?: string }) {
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
        strokeWidth={1.75}
        d="M6 18L18 6M6 6l12 12"
      />
    </svg>
  );
}

function rowClass(active?: boolean) {
  return [
    "flex w-full items-center py-5 pl-6 pr-5 text-left text-[17px] font-normal leading-snug tracking-normal text-neutral-900 outline-none",
    active ? "bg-neutral-100" : "hover:bg-neutral-50",
    "focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-neutral-900 focus-visible:bg-neutral-50",
  ].join(" ");
}

type Props = {
  className?: string;
  /** Listing categories from the database (synced with admin). */
  categoryCollections: StoreNavCategory[];
};

export function MobileCategoriesNav({
  className,
  categoryCollections,
}: Props) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [portalOpen, setPortalOpen] = useState(false);
  const [sheetEnter, setSheetEnter] = useState(false);
  const [chromeBottomPx, setChromeBottomPx] = useState(96);
  const drawerId = useId().replace(/:/g, "");
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const close = useCallback(() => {
    setOpen(false);
  }, []);

  const measureChrome = useCallback(() => {
    const el = document.getElementById("site-header");
    if (!el) {
      return;
    }
    const bottom = Math.round(el.getBoundingClientRect().bottom);
    setChromeBottomPx(Math.max(bottom, 64));
  }, []);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (open) {
      if (closeTimerRef.current) {
        clearTimeout(closeTimerRef.current);
        closeTimerRef.current = null;
      }
      setPortalOpen(true);
      measureChrome();
      let nestedRaf = 0;
      const outerRaf = requestAnimationFrame(() => {
        nestedRaf = requestAnimationFrame(() => setSheetEnter(true));
      });
      return () => {
        cancelAnimationFrame(outerRaf);
        cancelAnimationFrame(nestedRaf);
      };
    }

    setSheetEnter(false);
    closeTimerRef.current = setTimeout(() => {
      setPortalOpen(false);
      closeTimerRef.current = null;
    }, SHEET_MS);
    return () => {
      if (closeTimerRef.current) {
        clearTimeout(closeTimerRef.current);
        closeTimerRef.current = null;
      }
    };
  }, [open, measureChrome]);

  useEffect(() => {
    if (!portalOpen) {
      return;
    }
    measureChrome();
    window.addEventListener("resize", measureChrome);
    window.addEventListener("scroll", measureChrome, { passive: true });
    const el = document.getElementById("site-header");
    const ro =
      typeof ResizeObserver !== "undefined" && el
        ? new ResizeObserver(measureChrome)
        : null;
    ro?.observe(el as Element);
    return () => {
      window.removeEventListener("resize", measureChrome);
      window.removeEventListener("scroll", measureChrome);
      ro?.disconnect();
    };
  }, [portalOpen, measureChrome]);

  useEffect(() => {
    const header = document.getElementById("site-header");
    if (!header) {
      return;
    }
    if (open || portalOpen) {
      header.dataset.mobileMenuOpen = "true";
      header.style.zIndex = "210";
    } else {
      header.style.removeProperty("z-index");
      delete header.dataset.mobileMenuOpen;
    }
  }, [open, portalOpen]);

  useEffect(() => {
    const locked = open || portalOpen;
    if (!locked) {
      return;
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        close();
      }
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, portalOpen, close]);

  const belowChrome = { top: chromeBottomPx, bottom: 0 };

  const transitionSheet =
    "transition-transform duration-300 motion-reduce:duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] motion-reduce:transition-none will-change-transform";
  const transitionBackdrop =
    "transition-opacity duration-300 motion-reduce:duration-150 ease-out motion-reduce:transition-none";

  const overlay =
    mounted && portalOpen
      ? createPortal(
          <>
            <button
              type="button"
              className={`fixed inset-x-0 bottom-0 z-[190] bg-black/30 ${transitionBackdrop} touch-manipulation ${
                sheetEnter ? "opacity-100" : "pointer-events-none opacity-0"
              }`}
              style={belowChrome}
              aria-label="Close menu"
              onClick={close}
            />

            <div
              id={`drawer-${drawerId}`}
              role="dialog"
              aria-modal="true"
              aria-label="Navigation"
              style={belowChrome}
              className={`fixed inset-x-0 z-[195] flex flex-col overflow-hidden bg-white shadow-[6px_0_32px_rgba(15,23,42,0.08)] motion-reduce:shadow-none ${transitionSheet} motion-reduce:transform-none ${
                sheetEnter ? "translate-x-0" : "-translate-x-full"
              }`}
            >
              <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
                <nav
                  aria-label="Store categories"
                  className="min-h-0 flex-1 overflow-y-auto overscroll-contain divide-y divide-neutral-100 pb-8"
                >
                  {categoryCollections.length === 0 ? (
                    <div className="px-6 py-8 text-sm text-neutral-600">
                      Categories are being updated. Please check back shortly.
                    </div>
                  ) : (
                    categoryCollections.map((item) => {
                      const active =
                        pathname === item.href ||
                        pathname.startsWith(`${item.href}/`);
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          className={rowClass(active)}
                          aria-current={active ? "page" : undefined}
                          onClick={close}
                        >
                          {item.label}
                        </Link>
                      );
                    })
                  )}
                </nav>
              </div>

            </div>
          </>,
          document.body,
        )
      : null;

  return (
    <div className={className}>
      <button
        type="button"
        className="relative z-[220] -m-2 flex touch-manipulation items-center justify-center rounded p-2 text-black hover:bg-black/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black"
        aria-expanded={open}
        aria-controls={`drawer-${drawerId}`}
        aria-haspopup="dialog"
        aria-label={open ? "Close menu" : "Open menu"}
        onClick={() => setOpen((v) => !v)}
      >
        {open ? <IconClose aria-hidden /> : <IconMenu aria-hidden />}
      </button>

      {overlay}
    </div>
  );
}
