/**
 * Resolve the canonical URL for the current page.
 * Prefers <link rel="canonical">, falls back to location.href stripped of hash/query.
 */
export function getCanonicalUrl(): string {
  const link = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
  if (link && link.href) return link.href;
  return window.location.href.split('#')[0].split('?')[0];
}

/**
 * djb2 hash. Returns a hex string suitable for use as a cache key.
 */
export function hashUrl(url: string): string {
  let h = 0;
  for (let i = 0; i < url.length; i++) {
    h = ((h << 5) - h + url.charCodeAt(i)) | 0;
  }
  return (h >>> 0).toString(16);
}
