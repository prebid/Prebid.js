/**
 * DNT was deprecated by W3C; Prebid no longer supports DNT signals.
 * Keep this helper for backwards compatibility with adapters that still invoke getDNT().
 */
export function getDNT() {
  return false;
}
