import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { access } from "fs/promises";
import { z } from "zod";
import {
  getHomepageHeroImages,
  saveHomepageHeroImages,
} from "@/lib/hero-images";
import { parseSafeProductUploadPublicUrl } from "@/lib/admin-product-upload-files";

const bodySchema = z.object({
  images: z.array(z.string().min(1).max(2048)).max(20),
});

export async function GET() {
  const images = await getHomepageHeroImages();
  return NextResponse.json({ images });
}

export async function PATCH(request: Request) {
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  for (const rawUrl of parsed.data.images) {
    const url = rawUrl.trim();
    if (url.startsWith("/uploads/")) {
      const resolved = parseSafeProductUploadPublicUrl(url);
      if (!resolved) {
        return NextResponse.json(
          { error: `Invalid uploads path in hero slides: ${url}` },
          { status: 400 },
        );
      }
      try {
        await access(resolved.absoluteFsPath);
      } catch {
        return NextResponse.json(
          { error: `Hero image does not exist on disk: ${url}` },
          { status: 400 },
        );
      }
    }
  }

  const images = await saveHomepageHeroImages(parsed.data.images);
  revalidatePath("/");
  return NextResponse.json({ ok: true, images });
}

