import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

import type { ResolvedFooterBar } from "@/lib/footer-bar-settings";

import fbIcon from "@/icons/fb.png";
import instaIcon from "@/icons/insta.png";
import whatsappIcon from "@/icons/whatsapp.png";

/** Inner graphic size inside the circular button */
const SOCIAL_ICON_PX = 20;

type IconLinkProps = {
  href: string;
  label: string;
  children: ReactNode;
};

function IconLink({ href, label, children }: IconLinkProps) {
  return (
    <Link
      href={href}
      className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-neutral-400 bg-transparent p-1.5 outline-none transition-colors hover:border-neutral-500 hover:opacity-95 focus-visible:ring-2 focus-visible:ring-neutral-400 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
      aria-label={label}
      target="_blank"
      rel="noopener noreferrer"
    >
      {children}
    </Link>
  );
}

type Props = {
  bar: ResolvedFooterBar;
};

/** Tagline + social row under the slim black accent—matches header reference layout. */
export function HeaderPromoBar({ bar }: Props) {
  const trimmedTagline = bar.tagline.trim();
  const showText =
    trimmedTagline.length > 0 &&
    (bar.displayMode === "TEXT_ONLY" || bar.displayMode === "BOTH");

  const iconDefs = [
    {
      url: bar.whatsappUrl,
      label: "WhatsApp" as const,
      src: whatsappIcon,
    },
    {
      url: bar.instagramUrl,
      label: "Instagram" as const,
      src: instaIcon,
    },
    {
      url: bar.facebookUrl,
      label: "Facebook" as const,
      src: fbIcon,
    },
  ];

  const withUrls = iconDefs.filter((s) => s.url != null && s.url.length > 0);
  const showIcons =
    withUrls.length > 0 &&
    (bar.displayMode === "ICONS_ONLY" || bar.displayMode === "BOTH");

  if (!showText && !showIcons) {
    return null;
  }

  return (
    <section
      aria-label="Store tagline and social channels"
      className="border-b border-gray-200 bg-white"
    >
      <div className="container mx-auto flex flex-col items-center justify-center gap-2 px-4 py-1.5 sm:flex-row sm:gap-6 sm:py-2">
        {showText ? (
          <p className="text-center text-[11px] font-light uppercase tracking-[0.28em] text-gray-500 sm:text-xs">
            {trimmedTagline}
          </p>
        ) : null}
        {showText && showIcons ? (
          <span className="hidden h-4 w-px bg-gray-300 sm:block" aria-hidden />
        ) : null}
        {showIcons ? (
          <ul className="flex items-center gap-6" role="list">
            {withUrls.map((slot) => (
              <li key={slot.label}>
                <IconLink href={slot.url!} label={slot.label}>
                  <Image
                    src={slot.src}
                    alt=""
                    width={SOCIAL_ICON_PX}
                    height={SOCIAL_ICON_PX}
                    className="h-5 w-5 shrink-0 object-contain"
                    aria-hidden
                  />
                </IconLink>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </section>
  );
}
