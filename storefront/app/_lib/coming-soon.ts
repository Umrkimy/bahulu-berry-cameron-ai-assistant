export const previewCookieName = "bbc_preview";
export const previewCookieMaxAge = 60 * 60 * 24 * 30;
export const comingSoonHeader = "x-bbc-coming-soon";

export function isComingSoonEnabled(environment: NodeJS.ProcessEnv = process.env) {
  return environment.STOREFRONT_COMING_SOON === "true";
}

// A short key is treated as unset, so nobody can be let in with a guessable link.
export function previewKey(environment: NodeJS.ProcessEnv = process.env): string | null {
  const key = (environment.STOREFRONT_PREVIEW_KEY ?? "").trim();
  return key.length >= 24 ? key : null;
}

// The cookie holds a hash, never the key, and changing the key signs everyone out.
export async function previewToken(key: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`bbc-preview:${key}`));
  return Buffer.from(digest).toString("hex");
}

export function sameToken(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let difference = 0;
  for (let index = 0; index < a.length; index += 1) difference |= a.charCodeAt(index) ^ b.charCodeAt(index);
  return difference === 0;
}

export type GateDecision = "allow" | "grant" | "coming-soon" | "not-found";

export async function decideGate(pathname: string, keyParam: string | null, cookie: string | undefined, key: string | null): Promise<GateDecision> {
  const token = key ? await previewToken(key) : null;
  if (pathname === "/preview") {
    return token && keyParam && sameToken(await previewToken(keyParam), token) ? "grant" : "coming-soon";
  }
  if (token && cookie && sameToken(cookie, token)) return "allow";
  if (pathname.startsWith("/storefront-data") || pathname === "/sitemap.xml") return "not-found";
  return "coming-soon";
}
