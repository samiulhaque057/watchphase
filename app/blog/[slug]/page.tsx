import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  formatBlogPublishedLabel,
  getBlogPostBySlug,
} from "@/lib/blog-posts";

type Props = {
  params: Promise<{ slug: string }>;
};

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, "") ??
  "http://localhost:3000";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = await getBlogPostBySlug(slug);
  if (!post) {
    return { title: "Blog" };
  }
  return {
    title: `${post.title} | Watch Phase`,
    description: post.excerpt.slice(0, 155),
    alternates: { canonical: `/blog/${post.slug}` },
    openGraph: {
      title: `${post.title} | Watch Phase`,
      description: post.excerpt.slice(0, 155),
      url: `/blog/${post.slug}`,
      type: "article",
      images: [{ url: post.imageUrl }],
    },
    twitter: {
      card: "summary_large_image",
      title: `${post.title} | Watch Phase`,
      description: post.excerpt.slice(0, 155),
      images: [post.imageUrl],
    },
  };
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;
  const post = await getBlogPostBySlug(slug);
  if (!post) {
    notFound();
  }

  const dateLabel = formatBlogPublishedLabel(post.publishedAt);
  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    datePublished: post.publishedAt.toISOString(),
    dateModified: post.updatedAt.toISOString(),
    image: [post.imageUrl.startsWith("http") ? post.imageUrl : `${siteUrl}${post.imageUrl}`],
    description: post.excerpt.slice(0, 155),
    mainEntityOfPage: `${siteUrl}/blog/${post.slug}`,
    author: {
      "@type": "Organization",
      name: "Watch Phase",
    },
    publisher: {
      "@type": "Organization",
      name: "Watch Phase",
    },
  };

  return (
    <main>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }}
      />
      <article className="border-b border-gray-200 bg-white">
        <div className="container mx-auto max-w-3xl px-4 py-12 md:py-16">
          <p className="text-xs uppercase tracking-[0.24em] text-black/55">
            <Link href="/" className="hover:underline">
              Home
            </Link>
            <span className="mx-2 text-black/35" aria-hidden>
              /
            </span>
            Blog
          </p>
          <h1 className="mt-4 text-3xl font-bold uppercase leading-tight tracking-[0.08em] md:text-4xl">
            {post.title}
          </h1>
          <p className="mt-3 text-[10px] font-bold uppercase tracking-[0.2em] text-black/55">
            {dateLabel}
          </p>
        </div>
        <div className="relative mx-auto aspect-[2/1] max-h-[min(70vh,520px)] w-full max-w-5xl md:aspect-[21/9]">
          <Image
            src={post.imageUrl}
            alt={post.title}
            fill
            priority
            sizes="(max-width: 1024px) 100vw, 1024px"
            className="object-cover"
          />
        </div>
        <div className="container mx-auto max-w-3xl px-4 py-12 md:py-14">
          <div className="max-w-none">
            <p className="whitespace-pre-wrap text-base leading-relaxed text-black/85 md:text-lg">
              {post.excerpt}
            </p>
          </div>
          <Link
            href="/#blog-posts"
            className="mt-10 inline-block border-b border-black pb-0.5 text-xs font-bold uppercase tracking-[0.18em] text-black"
          >
            Back to blog
          </Link>
        </div>
      </article>
    </main>
  );
}
