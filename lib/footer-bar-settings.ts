import { prisma } from "@/lib/prisma";
import { getPublicSocialUrls } from "@/lib/site-social";

const SETTINGS_ID = "default";

export const DEFAULT_FOOTER_TAGLINE = "A PLACE FOR AUTHENTIC WATCHES..";

export type FooterBarDisplayMode = "TEXT_ONLY" | "ICONS_ONLY" | "BOTH";

type SiteSettingsRow = {
  footerTagline: string;
  footerBarDisplayMode: FooterBarDisplayMode;
  footerWhatsAppUrl: string | null;
  footerInstagramUrl: string | null;
  footerFacebookUrl: string | null;
};

export type FooterBarPayload = {
  footerTagline: string;
  footerWhatsAppUrl: string | null;
  footerInstagramUrl: string | null;
  footerFacebookUrl: string | null;
  footerBarDisplayMode: FooterBarDisplayMode;
};

export type ResolvedFooterBar = {
  tagline: string;
  displayMode: FooterBarDisplayMode;
  whatsappUrl: string | null;
  instagramUrl: string | null;
  facebookUrl: string | null;
};

function normalizeUrl(value: string | null | undefined): string | null {
  const t = typeof value === "string" ? value.trim() : "";
  return t.length > 0 ? t : null;
}

function mergeWithEnv(row: SiteSettingsRow | null): ResolvedFooterBar {
  const env = getPublicSocialUrls();
  const wa = normalizeUrl(row?.footerWhatsAppUrl) ?? env.whatsapp;
  const ig = normalizeUrl(row?.footerInstagramUrl) ?? env.instagram;
  const fb = normalizeUrl(row?.footerFacebookUrl) ?? env.facebook;

  return {
    tagline:
      row == null ? DEFAULT_FOOTER_TAGLINE : row.footerTagline.trim(),
    displayMode: row?.footerBarDisplayMode ?? "BOTH",
    whatsappUrl: wa,
    instagramUrl: ig,
    facebookUrl: fb,
  };
}

/** Public promo strip for the header — env URLs fill gaps when DB fields are empty. */
export async function getResolvedFooterBarForSite(): Promise<ResolvedFooterBar> {
  try {
    const row = await prisma.siteSettings.findUnique({
      where: { id: SETTINGS_ID },
      select: {
        footerTagline: true,
        footerBarDisplayMode: true,
        footerWhatsAppUrl: true,
        footerInstagramUrl: true,
        footerFacebookUrl: true,
      },
    });
    return mergeWithEnv(row);
  } catch {
    return mergeWithEnv(null);
  }
}

/** Stored values for admin (DB only; null = inherit / empty field in form). */
export async function getFooterBarSettingsForAdmin(): Promise<FooterBarPayload> {
  const row = await prisma.siteSettings.findUnique({
    where: { id: SETTINGS_ID },
    select: {
      footerTagline: true,
      footerBarDisplayMode: true,
      footerWhatsAppUrl: true,
      footerInstagramUrl: true,
      footerFacebookUrl: true,
    },
  });

  if (!row) {
    return {
      footerTagline: DEFAULT_FOOTER_TAGLINE,
      footerWhatsAppUrl: null,
      footerInstagramUrl: null,
      footerFacebookUrl: null,
      footerBarDisplayMode: "BOTH",
    };
  }

  return {
    footerTagline: row.footerTagline,
    footerWhatsAppUrl: row.footerWhatsAppUrl,
    footerInstagramUrl: row.footerInstagramUrl,
    footerFacebookUrl: row.footerFacebookUrl,
    footerBarDisplayMode: row.footerBarDisplayMode,
  };
}

export async function upsertFooterBarSettings(
  data: FooterBarPayload,
): Promise<FooterBarPayload> {
  const row = await prisma.siteSettings.upsert({
    where: { id: SETTINGS_ID },
    create: {
      id: SETTINGS_ID,
      footerTagline: data.footerTagline,
      footerWhatsAppUrl: data.footerWhatsAppUrl,
      footerInstagramUrl: data.footerInstagramUrl,
      footerFacebookUrl: data.footerFacebookUrl,
      footerBarDisplayMode: data.footerBarDisplayMode,
    },
    update: {
      footerTagline: data.footerTagline,
      footerWhatsAppUrl: data.footerWhatsAppUrl,
      footerInstagramUrl: data.footerInstagramUrl,
      footerFacebookUrl: data.footerFacebookUrl,
      footerBarDisplayMode: data.footerBarDisplayMode,
    },
    select: {
      footerTagline: true,
      footerBarDisplayMode: true,
      footerWhatsAppUrl: true,
      footerInstagramUrl: true,
      footerFacebookUrl: true,
    },
  });

  return {
    footerTagline: row.footerTagline,
    footerWhatsAppUrl: row.footerWhatsAppUrl,
    footerInstagramUrl: row.footerInstagramUrl,
    footerFacebookUrl: row.footerFacebookUrl,
    footerBarDisplayMode: row.footerBarDisplayMode,
  };
}
