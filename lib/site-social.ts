export type SocialPlatform = "facebook" | "instagram" | "whatsapp";

/** Optional public URLs — set in .env (available in client bundles). */

export function getPublicSocialUrls(): Record<SocialPlatform, string | null> {

  return {

    facebook: trimUrl(process.env.NEXT_PUBLIC_SOCIAL_FACEBOOK_URL),

    instagram: trimUrl(process.env.NEXT_PUBLIC_SOCIAL_INSTAGRAM_URL),

    whatsapp: trimUrl(process.env.NEXT_PUBLIC_SOCIAL_WHATSAPP_URL),

  };

}



/** Customer “Log in” target — fallback keeps the row usable until you wire auth. */

export function getPublicLoginUrl(): string {

  const u = trimUrl(process.env.NEXT_PUBLIC_LOGIN_URL);

  return u ?? "/swiss-grade";

}



function trimUrl(value?: string): string | null {

  const t = value?.trim();

  return t || null;

}

