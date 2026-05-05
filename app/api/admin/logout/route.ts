import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { COOKIE_NAME } from "@/lib/admin-session";

export async function POST() {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, "", { path: "/", maxAge: 0 });
  return NextResponse.json({ ok: true });
}
