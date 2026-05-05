import Link from "next/link";
import { BrandMark } from "@/components/layout/brand-mark";
import { HeaderCartLink } from "@/components/layout/header-cart-link";
import { HeaderPromoBar } from "@/components/layout/header-promo-bar";
import { HeaderSearch } from "@/components/layout/header-search";
import { DesktopHeaderAutoHide } from "@/components/layout/desktop-header-auto-hide";
import { MobileCategoriesNav } from "@/components/layout/mobile-categories-nav";
import { getResolvedFooterBarForSite } from "@/lib/footer-bar-settings";
import type { StoreNavCategory } from "@/lib/store-navigation";

function IconUser({ className = "h-5 w-5" }: { className?: string }) {
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
        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
      />
    </svg>
  );
}

const categoryNavGradientBtn =
  "inline-flex min-h-[2rem] shrink-0 items-center justify-center whitespace-nowrap rounded-sm bg-gradient-to-b from-neutral-700 via-neutral-900 to-black px-3.5 py-2 text-[10px] font-semibold uppercase tracking-[0.24em] text-white antialiased shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_4px_12px_rgba(0,0,0,0.18)] outline-none ring-offset-2 ring-offset-neutral-50 transition-[transform,filter,box-shadow] duration-200 hover:brightness-110 hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.14),0_6px_16px_rgba(0,0,0,0.22)] focus-visible:ring-2 focus-visible:ring-neutral-950 active:scale-[0.98] sm:min-h-[2.125rem] sm:px-4 sm:text-[11px] sm:tracking-[0.22em]";

type SiteHeaderProps = {
  categoryNavItems: StoreNavCategory[];
  /** Same list as desktop nav; shown under the burger “Categories” panel. */
  mobileCategoryCollections: StoreNavCategory[];
};

export async function SiteHeader({
  categoryNavItems,
  mobileCategoryCollections,
}: SiteHeaderProps) {
  const promoBar = await getResolvedFooterBarForSite();

  return (
    <header
      id="site-header"
      className="sticky top-0 z-50 bg-white transition-transform duration-300 ease-out will-change-transform"
    >
      <DesktopHeaderAutoHide targetId="site-header" />
      {/* Slim accent — mirrors reference */}
      <div className="h-0.5 w-full shrink-0 bg-black" aria-hidden />

      <HeaderPromoBar bar={promoBar} />

      {/* Brand row + nav */}
      <div className="border-b border-gray-200 bg-white">
        <div className="container mx-auto px-4 pt-2 pb-0.5 lg:pt-3 lg:pb-1">
          <div className="relative flex w-full flex-col items-center border-b border-gray-200 pb-2 lg:border-b-0 lg:pb-0">
            <MobileCategoriesNav
              className="absolute left-0 top-1/2 z-10 -translate-y-1/2 lg:hidden"
              categoryCollections={mobileCategoryCollections}
            />

            <div className="relative flex w-full justify-center">
              <BrandMark />

              <div className="absolute right-0 top-1/2 z-10 flex -translate-y-1/2 items-center gap-3 text-black/70 sm:gap-4">
                <HeaderSearch />
                <HeaderCartLink />
                <div className="hidden items-center gap-4 sm:gap-6 lg:flex">
                  <button
                    type="button"
                    aria-label="Account"
                    className="hover:text-black"
                  >
                    <IconUser />
                  </button>
                </div>
              </div>
            </div>

            <nav
              aria-label="Main navigation"
              className="mt-2 hidden w-full border-t border-gray-200 pt-2 pb-1 lg:mt-2 lg:block"
            >
              <ul className="mx-auto flex w-full flex-wrap content-center items-center justify-center gap-x-2.5 gap-y-2.5 px-1 py-1 sm:gap-x-3 md:gap-x-4">
                {categoryNavItems.map((item) => (
                  <li key={item.href}>
                    <Link href={item.href} className={categoryNavGradientBtn}>
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          </div>
        </div>
      </div>
    </header>
  );
}
