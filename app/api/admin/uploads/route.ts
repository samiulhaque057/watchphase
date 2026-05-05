import { unlink } from "fs/promises";
import { NextResponse } from "next/server";
import { z } from "zod";
import {
  listProductUploadFiles,
  parseSafeProductUploadPublicUrl,
} from "@/lib/admin-product-upload-files";
import { prisma } from "@/lib/prisma";

const deleteBodySchema = z.object({
  url: z.string().min(1).max(2048),
});

export async function GET() {
  const files = await listProductUploadFiles();
  const products = await prisma.product.findMany({
    select: { imageUrl: true },
  });
  const galleryRows = await prisma.productImage.findMany({
    select: { url: true },
  });
  const inUseUrls = new Set<string>([
    ...products.map((p) => p.imageUrl),
    ...galleryRows.map((g) => g.url),
  ]);

  return NextResponse.json({
    files: files.map((f) => ({
      ...f,
      inUse: inUseUrls.has(f.publicUrl),
    })),
  });
}

export async function DELETE(request: Request) {
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = deleteBodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const resolved = parseSafeProductUploadPublicUrl(parsed.data.url);
  if (!resolved) {
    return NextResponse.json({ error: "Invalid or unsafe upload path." }, { status: 400 });
  }

  const linked = await prisma.product.count({
    where: {
      OR: [
        { imageUrl: resolved.publicUrl },
        { galleryImages: { some: { url: resolved.publicUrl } } },
      ],
    },
  });
  if (linked > 0) {
    return NextResponse.json(
      {
        error:
          "This file is attached to one or more listings. Delete or edit those listings first.",
      },
      { status: 409 },
    );
  }

  try {
    await unlink(resolved.absoluteFsPath);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "File not found or could not delete." }, { status: 404 });
  }
}
