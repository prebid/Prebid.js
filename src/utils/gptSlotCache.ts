import { ttlCollection } from './ttlCollection.js';

const DEFAULT_TTL_MS = 60_000;

const slotElementIdByAdId = new Map<string, string>();
const expiryTracker = ttlCollection<string>({
  monotonic: true,
  ttl: () => DEFAULT_TTL_MS,
  slack: 0,
});

expiryTracker.onExpiry((adId) => {
  slotElementIdByAdId.delete(adId);
});

export function cacheGptSlotElementId(adId: string, slotElementId: string) {
  if (adId == null || slotElementId == null) return;
  slotElementIdByAdId.set(adId, slotElementId);
  expiryTracker.add(adId);
}

export function getCachedGptSlotElementId(adId: string): string | null {
  if (adId == null || !expiryTracker.has(adId)) return null;
  return slotElementIdByAdId.get(adId) ?? null;
}

export function clearGptSlotElementIdCache() {
  slotElementIdByAdId.clear();
  expiryTracker.clear();
}
