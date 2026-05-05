import path from "path";
import { mkdir, readFile, writeFile } from "fs/promises";

const HERO_IMAGES_PATH = path.join(process.cwd(), "data", "home-hero-images.json");
const HERO_IMAGE_LIMIT = 5;

const DEFAULT_HERO_IMAGES: readonly string[] = [];

function normalizeHeroImageList(input: unknown): string[] {
  const arr = Array.isArray(input) ? input : [];
  const cleaned = arr
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter((item) => item.startsWith("/") || item.startsWith("http://") || item.startsWith("https://"));

  const unique: string[] = [];
  for (const url of cleaned) {
    if (!unique.includes(url)) {
      unique.push(url);
    }
  }

  const base = unique.slice(0, HERO_IMAGE_LIMIT);
  return base;
}

export async function getHomepageHeroImages(): Promise<string[]> {
  try {
    const raw = await readFile(HERO_IMAGES_PATH, "utf8");
    const json = JSON.parse(raw) as { images?: unknown };
    return normalizeHeroImageList(json.images);
  } catch {
    return [];
  }
}

export async function saveHomepageHeroImages(urls: string[]): Promise<string[]> {
  const images = normalizeHeroImageList(urls);
  await mkdir(path.dirname(HERO_IMAGES_PATH), { recursive: true });
  await writeFile(
    HERO_IMAGES_PATH,
    JSON.stringify({ images }, null, 2),
    "utf8",
  );
  return images;
}

