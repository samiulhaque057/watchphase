import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { getHomepageBlogPosts } from "@/lib/blog-posts";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Blog | Watch Phase",
  description: "Latest watch insights, drops, and stories from Watch Phase.",
  alternates: { canonical: "/blog" },
  openGraph: {
    title: "Blog | Watch Phase",
    description: "Latest watch insights, drops, and stories from Watch Phase.",
    url: "/blog",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Blog | Watch Phase",
    description: "Latest watch insights, drops, and stories from Watch Phase.",
  },
};

export default async function BlogIndexPage() {
  const posts = await getHomepageBlogPosts(48);

  return (
    <main className="bg-white">
      <section className="border-b border-gray-200 bg-[#fafafa]">
        <div className="container mx-auto px-4 py-10">
          <p className="text-xs uppercase tracking-[0.24em] text-black/60">
            Journal
          </p>
          <h1 className="mt-3 text-3xl font-semibold uppercase tracking-[0.1em]">
            Blog Posts
          </h1>
          <p className="mt-2 text-sm text-black/60">
            News, releases, and watch stories from the Watch Phase team.
          </p>
        </div>
      </section>

      <section className="py-16">
        <div className="container mx-auto px-4">
          {posts.length === 0 ? (
            <p className="text-sm text-black/55">
              No blog posts yet. Check back soon.
            </p>
          ) : (
            <div className="grid gap-8 md:grid-cols-3">
              {posts.map((post) => (
                <article key={post.slug} className="group">
                  <Link
                    href={`/blog/${post.slug}`}
                    className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2"
                  >
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
                  <h2 className="mb-3 text-base font-bold uppercase tracking-wide">
                    <Link
                      href={`/blog/${post.slug}`}
                      className="hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2"
                    >
                      {post.title}
                    </Link>
                  </h2>
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
        </div>
      </section>
    </main>
  );
}

