import { isIP } from "node:net";

export const apiBaseUrl = (process.env.STOREFRONT_SERVER_API_BASE_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000/api").replace(/\/$/, "");

// The storefront server calls the API for every visitor. Without this the API
// rate-limits all visitors as one client. Cloudflare sets CF-Connecting-IP and
// overwrites any visitor-supplied value; the API trusts X-Client-IP only when
// TRUST_CLOUDFLARE_CLIENT_IP is enabled.
export function clientIpHeaders(cfConnectingIp: string | null | undefined): Record<string, string> {
  const ip = cfConnectingIp?.trim();
  return ip && isIP(ip) ? { "X-Client-IP": ip } : {};
}

export function requestClientIpHeaders(request: Request): Record<string, string> {
  return clientIpHeaders(request.headers.get("cf-connecting-ip"));
}
