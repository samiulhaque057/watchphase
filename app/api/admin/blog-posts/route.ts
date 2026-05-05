import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createBlogPostSchema } from "@/lib/validators/admin-blog-post";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const posts = await prisma.blogPost.findMany({
    orderBy: [{ publishedAt: "desc" }, { updatedAt: "desc" }],
    select: {
      id: true,
      slug: true,
      title: true,
      excerpt: true,
      imageUrl: true,
      publishedAt: true,
      sortOrder: true,
      updatedAt: true,
    },
  });
  return NextResponse.json({ posts });
}

export async function POST(request: Request) {
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = createBlogPostSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const data = parsed.data;
  const publishedAt = new Date(`${data.publishedAt}T12:00:00`);

  try {
    const post = await prisma.blogPost.create({
      data: {
        slug: data.slug.trim().toLowerCase(),
        title: data.title.trim(),
        excerpt: data.excerpt.trim(),
        imageUrl: data.imageUrl.trim(),
        publishedAt,
      },
      select: {
        id: true,
        slug: true,
        title: true,
        excerpt: true,
        imageUrl: true,
        publishedAt: true,
        sortOrder: true,
      },
    });
    revalidatePath("/");
    revalidatePath(`/blog/${post.slug}`);
    return NextResponse.json({ post }, { status: 201 });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        { error: "Slug already exists. Pick another URL slug." },
        { status: 409 },
      );
    }
    const message =
      error instanceof Error ? error.message : "Could not create post.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
