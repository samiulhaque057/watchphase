import type { Metadata } from "next";
import type { Prisma } from "@prisma/client";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  COOKIE_NAME,
  verifyAdminSessionToken,
} from "@/lib/admin-session";
import type { AdminOrderPayload } from "@/lib/get-orders-for-admin";
import {
  getOrdersForAdmin,
  serializeAdminOrders,
} from "@/lib/get-orders-for-admin";
import { getFooterBarSettingsForAdmin } from "@/lib/footer-bar-settings";
import { getHomepageHeroImages } from "@/lib/hero-images";
import { prisma } from "@/lib/prisma";
import { StockAdminPanel } from "@/app/internal/stock/[secret]/stock-admin-panel";

const productListSelect = {
  id: true,
  slug: true,
  name: true,
  brand: true,
  sku: true,
  description: true,
  priceCents: true,
  compareAtPriceCents: true,
  listingCategoryId: true,
  listingCategory: { select: { slug: true, label: true } },
  badge: true,
  imageUrl: true,
  galleryImages: {
    select: { id: true, url: true, sortOrder: true },
    orderBy: { sortOrder: "asc" as const },
  },
  variations: {
    select: { id: true, sku: true, label: true, sortOrder: true },
    orderBy: { sortOrder: "asc" as const },
  },
} as const;

const listingCategoryListSelect = {
  id: true,
  slug: true,
  label: true,
  listingTag: true,
  sortOrder: true,
  _count: { select: { products: true } },
} as const;

type AdminListedProduct = Prisma.ProductGetPayload<{
  select: typeof productListSelect;
}>;

type AdminListedListingCategory = {
  id: string;
  slug: string;
  label: string;
  listingTag: string;
  sortOrder: number;
  productCount: number;
};

export const metadata: Metadata = {
  title: "Admin | Watch Phase",
  description: "Internal admin tooling.",
  robots: { index: false, follow: false },
};

type PageProps = {
  searchParams: Promise<{ password?: string | string[] }>;
};

export default async function AdminPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  if (sp.password != null) {
    redirect("/admin");
  }

  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  const initialAuthed = await verifyAdminSessionToken(token);

  let initialProducts: AdminListedProduct[] = [];
  let initialListingCategories: AdminListedListingCategory[] = [];
  let initialProductsLoadError: string | null = null;
  let initialOrders: AdminOrderPayload[] = [];
  let initialOrdersLoadError: string | null = null;
  let initialHeroImages: string[] = await getHomepageHeroImages();
  let initialFooterBarSettings: Awaited<
    ReturnType<typeof getFooterBarSettingsForAdmin>
  > | null = null;

  if (initialAuthed) {
    try {
      initialProducts = await prisma.product.findMany({
        orderBy: { updatedAt: "desc" },
        select: productListSelect,
      });
      const listingRows = await prisma.listingCategory.findMany({
        orderBy: [{ sortOrder: "asc" }, { label: "asc" }],
        select: listingCategoryListSelect,
      });
      initialListingCategories = listingRows.map((row) => ({
        id: row.id,
        slug: row.slug,
        label: row.label,
        listingTag: row.listingTag,
        sortOrder: row.sortOrder,
        productCount: row._count.products,
      }));
      initialOrders = await getOrdersForAdmin();
      initialHeroImages = await getHomepageHeroImages();
      initialFooterBarSettings = await getFooterBarSettingsForAdmin();
    } catch {
      initialProductsLoadError =
        "Cannot reach PostgreSQL. From the watchh folder run: docker compose up -d, then npx prisma migrate dev and npx prisma db seed";
      initialOrdersLoadError = initialProductsLoadError;
    }
  }

  const initialOrdersSerializable = serializeAdminOrders(initialOrders);

  return (
    <StockAdminPanel
      secret="admin"
      initialAuthed={initialAuthed}
      initialProducts={initialProducts}
      initialListingCategories={initialListingCategories}
      initialProductsLoadError={initialProductsLoadError}
      initialOrders={initialOrdersSerializable}
      initialOrdersLoadError={initialOrdersLoadError}
      initialHeroImages={initialHeroImages}
      initialFooterBarSettings={initialFooterBarSettings}
    />
  );
}

