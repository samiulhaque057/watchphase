import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import {
  getFooterBarSettingsForAdmin,
  upsertFooterBarSettings,
} from "@/lib/footer-bar-settings";
import { patchSiteFooterBarSchema } from "@/lib/validators/admin-site-settings";

export async function GET() {
  try {
    const settings = await getFooterBarSettingsForAdmin();
    return NextResponse.json({ settings });
  } catch {
    return NextResponse.json(
      { error: "Could not load site settings." },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request) {
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = patchSiteFooterBarSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  try {
    const settings = await upsertFooterBarSettings({
      footerTagline: parsed.data.footerTagline,
      footerWhatsAppUrl: parsed.data.footerWhatsAppUrl,
      footerInstagramUrl: parsed.data.footerInstagramUrl,
      footerFacebookUrl: parsed.data.footerFacebookUrl,
      footerBarDisplayMode: parsed.data.footerBarDisplayMode,
    });
    revalidatePath("/", "layout");
    return NextResponse.json({ ok: true, settings });
  } catch {
    return NextResponse.json(
      { error: "Could not save site settings." },
      { status: 500 },
    );
  }
}
