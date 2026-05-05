export type { StoreNavCategory } from "@/lib/store-navigation";

export {
  DEFAULT_NAV_CATEGORIES,
  storefrontCategoryHref,
  STOREFRONT_ROOT_SLUGS,
} from "@/lib/store-navigation";

export const homeNavItem = { href: "/", label: "Home" } as const;
