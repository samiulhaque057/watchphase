import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProductCategoryPage } from "@/components/category/product-category-page";
import { getCatalogProductsPage } from "@/lib/catalog";
import { findListingCategoryBySlug } from "@/lib/listing-category-queries";
import { RESERVED_LISTING_SLUG_SET } from "@/lib/validators/admin-listing-category";

type PageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ page?: string | string[] }>;
};

export const revalidate = 300;

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  if (RESERVED_LISTING_SLUG_SET.has(slug)) {
    return { title: "Collection | Watch Phase" };
  }
  const category = await findListingCategoryBySlug(slug);
  if (!category) {
    return { title: "Collection | Watch Phase" };
  }
  return {
    title: `${category.label} | Watch Phase`,
    description: `Browse ${category.label} at Watch Phase.`,
    alternates: { canonical: `/${slug}` },
    openGraph: {
      title: `${category.label} | Watch Phase`,
      description: `Browse ${category.label} at Watch Phase.`,
      url: `/${slug}`,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: `${category.label} | Watch Phase`,
      description: `Browse ${category.label} at Watch Phase.`,
    },
  };
}

function hrefForListingCategory(slug: string, page: number): string {
  if (page <= 1) {
    return `/${slug}`;
  }
  return `/${slug}?page=${page}`;
}

export default async function StoreListingCategoryPage({
  params,
  searchParams,
}: PageProps) {
  const { slug } = await params;
  if (RESERVED_LISTING_SLUG_SET.has(slug)) {
    notFound();
  }

  const category = await findListingCategoryBySlug(slug);
  if (!category) {
    notFound();
  }

  const sp = await searchParams;
  const paged = await getCatalogProductsPage(slug, sp.page);

  return (
    <ProductCategoryPage
      categoryTitle={category.label}
      categoryTag={category.listingTag}
      products={paged.products}
      pagination={{
        totalProducts: paged.total,
        currentPage: paged.page,
        totalPages: paged.totalPages,
        hrefForPage: (page) => hrefForListingCategory(slug, page),
      }}
    />
  );
}
