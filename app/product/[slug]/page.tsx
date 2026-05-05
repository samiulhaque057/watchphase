import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ProductImageGallery } from "@/components/product/product-image-gallery";
import { ProductPurchaseActions } from "@/components/product/product-purchase-actions";
import { getCatalogProducts, getProductBySlug } from "@/lib/catalog";
import { storefrontCategoryHref } from "@/lib/store-navigation";

type ProductDetailPageProps = {
  params: Promise<{
    slug: string;
  }>;
  searchParams: Promise<{ sku?: string | string[] }>;
};

export const revalidate = 300;
const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, "") ??
  "http://localhost:3000";

export async function generateMetadata({
  params,
}: ProductDetailPageProps): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);

  if (!product) {
    return {
      title: "Product Not Found | Watch Phase",
      description: "The requested product could not be found.",
    };
  }

  return {
    title: `${product.name} | Watch Phase`,
    description: product.description,
    alternates: { canonical: `/product/${product.slug}` },
    openGraph: {
      title: `${product.name} | Watch Phase`,
      description: product.description,
      url: `/product/${product.slug}`,
      type: "website",
      images: [{ url: product.image }],
    },
    twitter: {
      card: "summary_large_image",
      title: `${product.name} | Watch Phase`,
      description: product.description,
      images: [product.image],
    },
  };
}

export default async function ProductDetailPage({
  params,
  searchParams,
}: ProductDetailPageProps) {
  const { slug } = await params;
  const sp = await searchParams;
  const skuRaw = sp.sku;
  const skuQuery =
    typeof skuRaw === "string"
      ? skuRaw
      : skuRaw != null
        ? skuRaw[0]
        : undefined;
  const product = await getProductBySlug(slug);

  if (!product) {
    notFound();
  }

  const catalog = await getCatalogProducts(product.listingCategory.slug);
  const relatedProducts = catalog
    .filter((item) => item.slug !== product.slug)
    .slice(0, 4);
  const productJsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    image: product.images.map((img) =>
      img.startsWith("http") ? img : `${siteUrl}${img}`,
    ),
    description: product.description,
    sku: product.sku,
    brand: {
      "@type": "Brand",
      name: product.brand,
    },
    offers: {
      "@type": "Offer",
      priceCurrency: "BDT",
      price: (product.priceCents / 100).toFixed(2),
      availability:
        product.badge === "Sold Out"
          ? "https://schema.org/OutOfStock"
          : "https://schema.org/InStock",
      url: `${siteUrl}/product/${product.slug}`,
    },
  };

  return (
    <main className="bg-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd) }}
      />
      {/* Mobile: narrow strip · Desktop: full-width bar like before */}
      <section className="border-b border-neutral-200 bg-white md:border-gray-200 md:bg-[#fafafa]">
        <div className="mx-auto max-w-2xl px-4 py-2 text-[10px] uppercase leading-tight tracking-[0.16em] text-neutral-500 md:container md:max-w-none md:py-2 md:text-[11px] md:tracking-[0.18em] md:text-black/60">
          <Link
            href={storefrontCategoryHref(product.listingCategory.slug)}
            className="hover:text-black"
          >
            {product.listingCategory.label}
          </Link>
          <span className="mx-2 text-neutral-300 md:text-black/40" aria-hidden>
            /
          </span>
          <span className="text-neutral-700 md:text-black">{product.name}</span>
        </div>
      </section>

      <section className="mx-auto max-w-2xl px-4 pb-8 pt-0 sm:pb-10 sm:pt-0 md:container md:max-w-none md:px-4 md:py-12">
        <div className="flex flex-col gap-8 md:grid md:grid-cols-2 md:items-start md:gap-10">
          <div className="md:min-w-0">
            <ProductImageGallery
              productSlug={product.slug}
              images={product.images}
              productName={product.name}
              badge={product.badge}
            />
          </div>

          <div className="flex min-w-0 flex-col md:justify-start">
            <p className="order-1 text-[11px] font-medium uppercase tracking-[0.22em] text-neutral-500 md:text-xs md:tracking-[0.24em] md:text-black/60">
              {product.brand}
            </p>
            <h1 className="order-2 mt-2 text-2xl font-semibold leading-snug text-black sm:text-[1.65rem] sm:leading-tight md:mt-3 md:text-3xl md:font-semibold md:uppercase md:leading-tight md:tracking-[0.06em]">
              {product.name}
            </h1>

            <div className="order-3 mt-4 md:mt-6">
              <p className="text-lg font-medium text-black sm:text-xl md:text-2xl md:font-semibold">
                {product.price}{" "}
                <span className="text-sm font-normal text-neutral-600 md:hidden">
                  BDT
                </span>
              </p>
              {product.oldPrice ? (
                <p className="mt-1 text-sm text-neutral-500 line-through md:text-black/50">
                  {product.oldPrice}
                </p>
              ) : null}
            </div>

            <p className="order-4 mt-3 text-sm text-neutral-500 md:hidden">
              <span className="underline decoration-neutral-400 underline-offset-2">
                Shipping
              </span>{" "}
              calculated at checkout.
            </p>

            <div className="order-6 mt-10 border-t border-neutral-200 pt-8 md:order-5 md:mt-6 md:border-0 md:pt-0">
              <h2 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-neutral-500 md:hidden">
                Details
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-neutral-700 sm:text-base md:mt-0 md:max-w-xl md:text-base md:leading-relaxed md:text-black/80">
                {product.description}
              </p>
            </div>

            <div className="order-5 mt-8 md:order-6 md:mt-8">
              <ProductPurchaseActions
                product={product}
                initialSkuQuery={skuQuery ?? null}
              />
            </div>
          </div>
        </div>
      </section>

      <section className="border-t border-neutral-200 bg-neutral-50 py-14 sm:py-16">
        <div className="mx-auto max-w-6xl px-4">
          <h2 className="mb-8 text-xs font-semibold uppercase tracking-[0.22em] text-neutral-500">
            You may also like
          </h2>
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {relatedProducts.map((item) => (
              <article key={item.slug} className="group">
                <Link href={`/product/${item.slug}`}>
                  <div className="relative aspect-square overflow-hidden bg-white">
                    <Image
                      src={item.image}
                      alt={item.name}
                      fill
                      sizes="(max-width: 1024px) 50vw, 25vw"
                      className="object-contain p-6 transition duration-300 group-hover:scale-105"
                    />
                  </div>
                  <h3 className="mt-3 text-sm font-medium leading-snug group-hover:underline">
                    {item.name}
                  </h3>
                  <p className="mt-1 text-sm font-semibold">{item.price}</p>
                </Link>
              </article>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
