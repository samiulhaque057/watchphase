import { prisma } from "@/lib/prisma";

const cardDate = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

/** e.g. OCT 21, 2024 */
export function formatBlogPublishedLabel(d: Date): string {
  return cardDate.format(d).toUpperCase();
}

export type HomepageBlogPost = {
  slug: string;
  title: string;
  excerpt: string;
  imageUrl: string;
  dateLabel: string;
};

export async function getHomepageBlogPosts(
  limit = 12,
): Promise<HomepageBlogPost[]> {
  const rows = await prisma.blogPost.findMany({
    orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
    take: limit,
    select: {
      slug: true,
      title: true,
      excerpt: true,
      imageUrl: true,
      publishedAt: true,
    },
  });
  return rows.map((row) => ({
    slug: row.slug,
    title: row.title,
    excerpt: row.excerpt,
    imageUrl: row.imageUrl,
    dateLabel: formatBlogPublishedLabel(row.publishedAt),
  }));
}

export async function getBlogPostBySlug(slug: string) {
  return prisma.blogPost.findUnique({
    where: { slug },
    select: {
      id: true,
      slug: true,
      title: true,
      excerpt: true,
      imageUrl: true,
      publishedAt: true,
      updatedAt: true,
    },
  });
}
