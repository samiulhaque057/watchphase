import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  getHomepageHeroImages,
  saveHomepageHeroImages,
} from "@/lib/hero-images";

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

  const images = await saveHomepageHeroImages(parsed.data.images);
  revalidatePath("/");
  return NextResponse.json({ ok: true, images });
}

