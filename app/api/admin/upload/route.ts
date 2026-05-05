import { randomUUID } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";
import sharp from "sharp";

const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_BYTES = 12 * 1024 * 1024;
const MAX_MEGA_PIXELS = 40_000_000;
const OUTPUT_MAX_WIDTH = 2400;
const OUTPUT_QUALITY = 90;

export async function POST(request: Request) {
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Missing file field" }, { status: 400 });
  }

  if (!ALLOWED.has(file.type)) {
    return NextResponse.json({ error: "Unsupported file type" }, { status: 400 });
  }

  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: "File too large (max 12MB)" },
      { status: 400 },
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  let optimized: Buffer;
  try {
    const base = sharp(buffer, { failOn: "error" }).rotate();
    const meta = await base.metadata();
    const pixels = (meta.width ?? 0) * (meta.height ?? 0);
    if (pixels > MAX_MEGA_PIXELS) {
      return NextResponse.json(
        { error: "Image dimensions are too large." },
        { status: 400 },
      );
    }

    optimized = await base
      .resize({
        width: OUTPUT_MAX_WIDTH,
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({
        quality: OUTPUT_QUALITY,
        effort: 5,
        smartSubsample: true,
      })
      .toBuffer();
  } catch {
    return NextResponse.json(
      { error: "Could not process image." },
      { status: 400 },
    );
  }

  const uploadDir = path.join(process.cwd(), "public", "uploads", "products");
  await mkdir(uploadDir, { recursive: true });
  const filename = `${randomUUID()}.webp`;
  const diskPath = path.join(uploadDir, filename);
  await writeFile(diskPath, optimized);

  const publicUrl = `/uploads/products/${filename}`;
  return NextResponse.json({ url: publicUrl });
}
