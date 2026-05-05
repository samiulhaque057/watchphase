import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { patchBlogPostSchema } from "@/lib/validators/admin-blog-post";
import { prisma } from "@/lib/prisma";

type RouteCtx = {
  params: Promise<{ postId: string }>;
};

export async function PATCH(request: Request, { params }: RouteCtx) {
  const { postId } = await params;

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = patchBlogPostSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const body = parsed.data;
  if (Object.keys(body).length === 0) {
    return NextResponse.json({ error: "No fields to update." }, { status: 400 });
  }

  const existing = await prisma.blogPost.findUnique({
    where: { id: postId },
    select: { slug: true },
  });
  if (!existing) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const data: {
    slug?: string;
    title?: string;
    excerpt?: string;
    imageUrl?: string;
    publishedAt?: Date;
  } = {};

  if (body.slug !== undefined) {
    data.slug = body.slug.trim().toLowerCase();
  }
  if (body.title !== undefined) {
    data.title = body.title.trim();
  }
  if (body.excerpt !== undefined) {
    data.excerpt = body.excerpt.trim();
  }
  if (body.imageUrl !== undefined) {
    data.imageUrl = body.imageUrl.trim();
  }
  if (body.publishedAt !== undefined) {
    data.publishedAt = new Date(`${body.publishedAt}T12:00:00`);
  }

  try {
    const post = await prisma.blogPost.update({
      where: { id: postId },
      data,
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
    revalidatePath(`/blog/${existing.slug}`);
    if (post.slug !== existing.slug) {
      revalidatePath(`/blog/${post.slug}`);
    }
    return NextResponse.json({ post });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        { error: "Slug already taken." },
        { status: 409 },
      );
    }
    throw error;
  }
}

export async function DELETE(_request: Request, { params }: RouteCtx) {
  const { postId } = await params;

  const existing = await prisma.blogPost.findUnique({
    where: { id: postId },
    select: { slug: true },
  });
  if (!existing) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  await prisma.blogPost.delete({
    where: { id: postId },
  });
  revalidatePath("/");
  revalidatePath(`/blog/${existing.slug}`);
  return NextResponse.json({ ok: true });
}
