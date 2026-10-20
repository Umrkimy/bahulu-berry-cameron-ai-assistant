export function productMediaUrl(path: string | null): string | null {
  const match = path?.match(/^\/api\/storefront\/products\/([1-9]\d*)\/images\/([1-9]\d*)\/content(?:\?v=([0-9a-f]{12}))?$/);
  if (!match) return null;
  return `/product-media/${match[1]}/${match[2]}${match[3] ? `?v=${match[3]}` : ""}`;
}
