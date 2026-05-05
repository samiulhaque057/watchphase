"use client";

import { useEffect } from "react";

type Props = {
  targetId: string;
};

/**
 * Desktop-only sticky header behavior:
 * - hide on downward scroll
 * - reveal on upward scroll
 */
export function DesktopHeaderAutoHide({ targetId }: Props) {
  useEffect(() => {
    const target = document.getElementById(targetId);
    if (!target) return;

    let lastY = window.scrollY;

    const onScroll = () => {
      const y = window.scrollY;
      const desktop = window.matchMedia("(min-width: 1024px)").matches;

      if (!desktop) {
        target.style.transform = "translateY(0)";
        lastY = y;
        return;
      }

      if (y <= 24 || y < lastY - 6) {
        target.style.transform = "translateY(0)";
      } else if (y > lastY + 6) {
        target.style.transform = "translateY(-100%)";
      }

      lastY = y;
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    onScroll();

    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      target.style.transform = "translateY(0)";
    };
  }, [targetId]);

  return null;
}

