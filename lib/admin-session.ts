const COOKIE_NAME = "wp_admin_session";

const textEncoder = new TextEncoder();

function getSecret(): string {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error(
      "ADMIN_SESSION_SECRET must be set (at least 16 characters).",
    );
  }
  return secret;
}

function base64UrlEncode(str: string): string {
  const bytes = textEncoder.encode(str);
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  const b64 = btoa(binary);
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlDecode(str: string): string {
  const pad = str.length % 4 === 0 ? "" : "=".repeat(4 - (str.length % 4));
  const b64 = str.replace(/-/g, "+").replace(/_/g, "/") + pad;
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new TextDecoder().decode(bytes);
}

async function hmacSha256Hex(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    textEncoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    textEncoder.encode(message),
  );
  const bytes = new Uint8Array(signature);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function timingSafeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }
  let out = 0;
  for (let i = 0; i < a.length; i++) {
    out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return out === 0;
}

export async function createAdminSessionToken(): Promise<string> {
  const exp = Math.floor(Date.now() / 1000) + 60 * 60 * 12;
  const payload = `${exp}`;
  const sig = await hmacSha256Hex(getSecret(), payload);
  const body = JSON.stringify({ exp, sig });
  return base64UrlEncode(body);
}

export async function verifyAdminSessionToken(
  token: string | undefined,
): Promise<boolean> {
  if (!token) {
    return false;
  }
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret || secret.length < 16) {
    return false;
  }
  try {
    const json = base64UrlDecode(token);
    const parsed = JSON.parse(json) as { exp?: number; sig?: string };
    if (typeof parsed.exp !== "number" || typeof parsed.sig !== "string") {
      return false;
    }
    if (parsed.exp < Math.floor(Date.now() / 1000)) {
      return false;
    }
    const payload = `${parsed.exp}`;
    const expected = await hmacSha256Hex(secret, payload);
    return timingSafeEqualHex(expected.toLowerCase(), parsed.sig.toLowerCase());
  } catch {
    return false;
  }
}

export { COOKIE_NAME };

export function adminCookieOptions() {
  const isProd = process.env.NODE_ENV === "production";
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: isProd,
    path: "/",
    maxAge: 60 * 60 * 12,
  };
}
