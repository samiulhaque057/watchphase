import { timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import {
  adminCookieOptions,
  COOKIE_NAME,
  createAdminSessionToken,
} from "@/lib/admin-session";

const bodySchema = z.object({
  password: z.string().min(1),
});

function verifyPassword(password: string) {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) {
    return false;
  }
  const a = Buffer.from(password, "utf8");
  const b = Buffer.from(expected, "utf8");
  if (a.length !== b.length) {
    return false;
  }
  return timingSafeEqual(a, b);
}

export async function POST(request: Request) {
  try {
    const json = (await request.json()) as unknown;
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    if (!verifyPassword(parsed.data.password)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    let token: string;
    try {
      token = await createAdminSessionToken();
    } catch {
      return NextResponse.json(
        { error: "Server misconfigured (ADMIN_SESSION_SECRET)" },
        { status: 500 },
      );
    }

    const cookieStore = await cookies();
    cookieStore.set(COOKIE_NAME, token, adminCookieOptions());
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
}
