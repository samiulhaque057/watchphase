import path from "path";
import { stat } from "fs/promises";

export const PRODUCT_UPLOAD_PUBLIC_PREFIX = "/uploads/products/";

/** Filenames produced by admin upload (UUID + ext). Rejects path tricks. */
const SAFE_UPLOAD_NAME =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(jpg|jpeg|png|webp)$/i;

export type ParsedProductUploadPath = {
  fileName: string;
  absoluteFsPath: string;
  publicUrl: string;
};

export function productUploadAbsDir(): string {
  return path.join(process.cwd(), "public", "uploads", "products");
}

/** Returns null if the URL is not an allowed on-disk product upload path. */
export function parseSafeProductUploadPublicUrl(
  raw: string | undefined | null,
): ParsedProductUploadPath | null {
  if (typeof raw !== "string" || !raw.startsWith(PRODUCT_UPLOAD_PUBLIC_PREFIX)) {
    return null;
  }
  const name = raw.slice(PRODUCT_UPLOAD_PUBLIC_PREFIX.length);
  if (
    !name ||
    name !== path.basename(name) ||
    name.includes("..") ||
    name.includes("/") ||
    name.includes("\\")
  ) {
    return null;
  }
  if (!SAFE_UPLOAD_NAME.test(name)) {
    return null;
  }

  const baseDir = path.normalize(productUploadAbsDir()) + path.sep;
  const absoluteFsPath = path.normalize(path.join(productUploadAbsDir(), name));
  if (!absoluteFsPath.startsWith(baseDir)) {
    return null;
  }

  return {
    fileName: name,
    absoluteFsPath,
    publicUrl: `${PRODUCT_UPLOAD_PUBLIC_PREFIX}${name}`,
  };
}

export type ListedProductUploadFile = {
  filename: string;
  publicUrl: string;
  sizeBytes: number;
};

export async function listProductUploadFiles(): Promise<
  ListedProductUploadFile[]
> {
  const fs = await import("fs/promises");
  const baseDir = productUploadAbsDir();
  let names: string[] = [];
  try {
    names = await fs.readdir(baseDir);
  } catch {
    return [];
  }

  const out: ListedProductUploadFile[] = [];
  for (const file of names) {
    const parsed = parseSafeProductUploadPublicUrl(
      `${PRODUCT_UPLOAD_PUBLIC_PREFIX}${file}`,
    );
    if (!parsed) {
      continue;
    }
    try {
      const st = await stat(parsed.absoluteFsPath);
      if (!st.isFile()) {
        continue;
      }
      out.push({
        filename: parsed.fileName,
        publicUrl: parsed.publicUrl,
        sizeBytes: st.size,
      });
    } catch {
      /* skip */
    }
  }

  out.sort((a, b) => a.filename.localeCompare(b.filename));
  return out;
}
