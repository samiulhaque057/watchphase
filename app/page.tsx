import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { HeroSlideshow } from "@/components/home/hero-slideshow";
import { AddToCartMiniButton } from "@/components/product/add-to-cart-button";
import { getHomepageBlogPosts } from "@/lib/blog-posts";
import { getCatalogProducts } from "@/lib/catalog";
import { getResolvedFooterBarForSite } from "@/lib/footer-bar-settings";
import { getHomepageHeroImages } from "@/lib/hero-images";

const brands = [
  "ROLEX",
  "PATEK PHILIPPE",
  "AUDEMARS PIGUET",
  "HUBLOT",
  "OMEGA",
  "CARTIER",
  "RICHARD MILLE",
  "PANERAI",
];

export const metadata: Metadata = {
  title: "Watch Phase | Premium Authentic Watches in Bangladesh",
  description:
    "Shop authentic luxury and premium watches in Bangladesh. Explore new arrivals, top brands, and curated timepieces from Watch Phase.",
  alternates: { canonical: "/" },
  openGraph: {
    title: "Watch Phase | Premium Authentic Watches in Bangladesh",
    description:
      "Shop authentic luxury and premium watches in Bangladesh. Explore new arrivals, top brands, and curated timepieces from Watch Phase.",
    url: "/",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Watch Phase | Premium Authentic Watches in Bangladesh",
    description:
      "Shop authentic luxury and premium watches in Bangladesh. Explore new arrivals, top brands, and curated timepieces from Watch Phase.",
  },
};

export default async function Home() {
  const newArrivals = (await getCatalogProducts()).slice(0, 4);
  const heroImages = await getHomepageHeroImages();
  const blogPosts = await getHomepageBlogPosts();
  const promoBar = await getResolvedFooterBarForSite();
  const whatsappUrl = promoBar.whatsappUrl;

  return (
    <main>
      <HeroSlideshow images={heroImages} />

      <section className="bg-white py-16">
        <div className="container mx-auto px-4">
          <div className="mb-10 text-center">
            <p className="mb-2 text-xs uppercase tracking-[0.25em] text-black">
              New Drops!
            </p>
            <h2 className="text-xl font-bold uppercase tracking-[0.12em] sm:text-2xl sm:tracking-[0.2em]">
              Shop For New Arrival Watches!
            </h2>
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-4">
            {newArrivals.map((item) => (
              <article key={item.slug} className="group">
                <Link href={`/product/${item.slug}`}>
                  <div className="relative mb-4 aspect-square overflow-hidden bg-gray-50">
                    <Image
                      src={item.image}
                      alt={item.name}
                      fill
                      sizes="(max-width: 768px) 50vw, 25vw"
                      className="object-contain p-2 sm:p-4 md:p-5 transition duration-300 group-hover:scale-105"
                    />
                  </div>
                </Link>
                <div className="text-center">
                  <Link href={`/product/${item.slug}`}>
                    <h3 className="mb-1 text-xs font-bold uppercase tracking-wide hover:underline">
                      {item.name}
                    </h3>
                  </Link>
                  <p className="text-sm font-bold">
                    {item.price}
                    {item.oldPrice ? (
                      <span className="ml-1 text-xs font-normal text-black/60 line-through">
                        {item.oldPrice}
                      </span>
                    ) : null}
                  </p>
                  <div className="mt-3">
                    <AddToCartMiniButton product={item} />
                  </div>
                </div>
              </article>
            ))}
          </div>
          <div className="mt-12 text-center">
            <Link
              href="/mens-watch"
              className="inline-flex bg-[#1a1a1a] px-7 py-3 text-xs font-bold uppercase tracking-[0.16em] text-white transition hover:bg-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2 sm:px-10 sm:tracking-[0.24em]"
            >
              View All
            </Link>
          </div>
        </div>
      </section>

      <section className="bg-white py-20">
        <div className="container mx-auto px-4">
          <div className="mb-12 text-center">
            <p className="text-xs uppercase tracking-[0.24em] text-black">
              Popular Brands Around the Globe!
            </p>
          </div>
          <div className="mx-auto grid max-w-4xl grid-cols-2 gap-6 md:grid-cols-4">
            {brands.map((brand) => (
              <div
                key={brand}
                className="flex h-20 items-center justify-center border border-gray-200 bg-white text-xs font-bold uppercase tracking-[0.2em] text-black transition hover:bg-black hover:text-white"
              >
                {brand}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-black py-4 text-white">
        <div className="container mx-auto flex flex-wrap justify-center gap-x-12 gap-y-2 px-4 text-[10px] font-bold uppercase tracking-widest">
          <div>YOUR NEXT FAVORITE WATCH? ONE SCROLL AWAY!</div>
          <div>100% QUALITY CHECKED WATCHES</div>
          <div>SHOP WITH CONFIDENCE</div>
        </div>
      </section>

      <section
        id="blog-posts"
        aria-label="Blog posts"
        className="scroll-mt-24 bg-gray-50 py-20"
      >
        <div className="container mx-auto px-4">
          <h2 className="mb-16 text-center text-xl font-bold uppercase tracking-[0.12em] sm:text-2xl sm:tracking-[0.2em]">
            Blog Posts
          </h2>
          {blogPosts.length === 0 ? (
            <p className="text-center text-sm text-black/55">
              New stories will appear here when published from the admin panel.
            </p>
          ) : (
            <div className="grid gap-8 md:grid-cols-3">
              {blogPosts.map((post) => (
                <article key={post.slug} className="group">
                  <Link href={`/blog/${post.slug}`} className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2">
                    <div className="mb-4 overflow-hidden">
                      <Image
                        src={post.imageUrl}
                        alt={post.title}
                        width={640}
                        height={320}
                        className="h-56 w-full object-cover transition duration-500 group-hover:scale-105"
                      />
                    </div>
                  </Link>
                  <p className="mb-2 text-[10px] font-bold uppercase text-black">
                    {post.dateLabel}
                  </p>
                  <h3 className="mb-3 text-base font-bold uppercase tracking-wide">
                    <Link
                      href={`/blog/${post.slug}`}
                      className="hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2"
                    >
                      {post.title}
                    </Link>
                  </h3>
                  <p className="mb-4 text-sm leading-relaxed text-black">
                    {post.excerpt}
                  </p>
                  <Link
                    href={`/blog/${post.slug}`}
                    className="inline-block border-b border-black pb-0.5 text-xs font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2"
                  >
                    Read more
                  </Link>
                </article>
              ))}
            </div>
          )}
          <div className="mt-12 text-center">
            <Link
              href="/blog"
              className="inline-flex bg-[#1a1a1a] px-7 py-3 text-xs font-bold uppercase tracking-[0.16em] text-white transition hover:bg-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2 sm:px-10 sm:tracking-[0.24em]"
            >
              View All
            </Link>
          </div>
        </div>
      </section>

      <section className="bg-white py-20">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-4xl border border-gray-200 bg-[#f8f8f8] p-10 text-center md:p-14">
            <p className="text-xs uppercase tracking-[0.24em] text-black/70">
              Private Assistance
            </p>
            <h2 className="mt-3 text-3xl font-semibold uppercase tracking-[0.12em]">
              Need Help Choosing the Perfect Watch?
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-black/80">
              Our specialists can guide you through movement, case size, style,
              and budget to help you invest in the perfect timepiece.
            </p>
            <div className="mt-8 flex justify-center">
              {whatsappUrl ? (
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex border border-black px-6 py-3 text-xs font-bold uppercase tracking-[0.14em] text-black transition hover:bg-black hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2 sm:px-8 sm:tracking-[0.24em]"
                >
                  WhatsApp Support
                </a>
              ) : (
                <span
                  className="inline-flex cursor-not-allowed border border-black/25 px-6 py-3 text-xs font-bold uppercase tracking-[0.14em] text-black/40 select-none sm:px-8 sm:tracking-[0.24em]"
                  aria-label="WhatsApp — link not configured yet"
                >
                  WhatsApp Support
                </span>
              )}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
