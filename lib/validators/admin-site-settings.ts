import { z } from "zod";

const optionalHttpUrlField = z.preprocess((val: unknown) => {
  if (val === undefined || val === null || val === "") {
    return null;
  }
  if (typeof val !== "string") {
    return val;
  }
  const t = val.trim();
  return t === "" ? null : t;
}, z.union([z.null(), z.string().max(2048)])).refine(
  (s) =>
    s == null ||
    /^https?:\/\//i.test(s) ||
    s.startsWith("mailto:") ||
    s.startsWith("tel:"),
  { message: "URLs must start with http:// or https://" },
);

export const patchSiteFooterBarSchema = z.object({
  footerTagline: z.string().max(500),
  footerWhatsAppUrl: optionalHttpUrlField,
  footerInstagramUrl: optionalHttpUrlField,
  footerFacebookUrl: optionalHttpUrlField,
  footerBarDisplayMode: z.enum(["TEXT_ONLY", "ICONS_ONLY", "BOTH"]),
});

export type PatchSiteFooterBarInput = z.infer<typeof patchSiteFooterBarSchema>;
