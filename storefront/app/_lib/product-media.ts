export function productMediaUrl(path: string | null): string | null {
  const match = path?.match(/^\/api\/storefront\/products\/([1-9]\d*)\/images\/([1-9]\d*)\/content$/);
  return match ? `/product-media/${match[1]}/${match[2]}` : null;
}
