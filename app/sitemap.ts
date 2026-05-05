import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";
import { DEFAULT_NAV_CATEGORIES } from "@/lib/store-navigation";

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, "") ??
  "http://localhost:3000";

function url(path: string): string {
  return `${siteUrl}${path.startsWith("/") ? path : `/${path}`}`;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const stableLastModified = new Date(
    process.env.SITEMAP_LASTMOD ?? "2026-05-04T00:00:00.000Z",
  );

  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: url("/"),
      lastModified: stableLastModified,
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: url("/search"),
      lastModified: stableLastModified,
      changeFrequency: "daily",
      priority: 0.7,
    },
    {
      url: url("/blog"),
      lastModified: stableLastModified,
      changeFrequency: "daily",
      priority: 0.75,
    },
    {
      url: url("/privacy-policy"),
      lastModified: stableLastModified,
      changeFrequency: "monthly",
      priority: 0.4,
    },
    {
      url: url("/shipping-policy"),
      lastModified: stableLastModified,
      changeFrequency: "monthly",
      priority: 0.4,
    },
    {
      url: url("/terms-of-service"),
      lastModified: stableLastModified,
      changeFrequency: "monthly",
      priority: 0.4,
    },
  ];

  let categoryRows: { slug: string; updatedAt: Date }[] = [];
  try {
    categoryRows = await prisma.listingCategory.findMany({
      select: { slug: true, updatedAt: true },
      orderBy: [{ sortOrder: "asc" }, { label: "asc" }],
    });
  } catch {
    /**/
  }
  if (categoryRows.length === 0) {
    categoryRows = DEFAULT_NAV_CATEGORIES.map((c) => ({
      slug: c.slug,
      updatedAt: stableLastModified,
    }));
  }

  const categoryRoutes: MetadataRoute.Sitemap = categoryRows.map((row) => ({
    url: url(`/${row.slug}`),
    lastModified: row.updatedAt,
    changeFrequency: "daily",
    priority: 0.85,
  }));

  let productRows: { slug: string; updatedAt: Date }[] = [];
  try {
    productRows = await prisma.product.findMany({
      select: { slug: true, updatedAt: true },
      orderBy: { updatedAt: "desc" },
    });
  } catch {
    /**/
  }
  const productRoutes: MetadataRoute.Sitemap = productRows.map((row) => ({
    url: url(`/product/${row.slug}`),
    lastModified: row.updatedAt,
    changeFrequency: "daily",
    priority: 0.8,
  }));

  let blogRows: { slug: string; updatedAt: Date }[] = [];
  try {
    blogRows = await prisma.blogPost.findMany({
      select: { slug: true, updatedAt: true },
      orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
    });
  } catch {
    /**/
  }

  const blogRoutes: MetadataRoute.Sitemap = blogRows.map((row) => ({
    url: url(`/blog/${row.slug}`),
    lastModified: row.updatedAt,
    changeFrequency: "weekly",
    priority: 0.65,
  }));

  return [...staticRoutes, ...categoryRoutes, ...productRoutes, ...blogRoutes];
}

