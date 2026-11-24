// GPT targeting through the config API: getConfig('targeting') and setConfig({ targeting }) on
// googletag and on slots. Requires a GPT version that has getConfig (July 2025 or later).

import type { GptApi, GptSlot } from '../types/gpt.d.ts';

const targetedAdIdsBySlot = new WeakMap<GptSlot, Set<string>>();

export function recordSlotTargeting(slot: GptSlot, adIds: Iterable<string> = []): void {
  const recorded = new Set<string>();
  Array.from(adIds).forEach((adId) => {
    if (adId) recorded.add(String(adId));
  });
  targetedAdIdsBySlot.set(slot, recorded);
}

export function slotHasTargetedAdId(slot: GptSlot, adId: string): boolean {
  return targetedAdIdsBySlot.get(slot)?.has(adId) ?? false;
}

export function getTargetedAdIdsForSlot(slot: GptSlot): Set<string> {
  return targetedAdIdsBySlot.get(slot);
}

export function findSlotElementIdByAdId(adId: string, getSlots: () => GptSlot[] = () => (window as any).googletag.pubads().getSlots()): string | null {
  if (adId == null) return null;
  const slot = getSlots().find((s) => slotHasTargetedAdId(s, adId));
  return (slot as any)?.getSlotElementId?.() ?? null;
}

type TargetingMap = Record<string, string[]>;

function getTargetingConfig(target: GptApi | GptSlot): TargetingMap {
  const targeting = target.getConfig('targeting').targeting ?? {};
  // GPT's typings allow single values and nulls; callers expect arrays, as getTargeting() returned
  return Object.fromEntries(
    Object.entries(targeting)
      .filter(([, value]) => value != null)
      .map(([key, value]) => [key, Array.isArray(value) ? value : [value]])
  );
}

export function updateSlotTargetingFromMap(slot: GptSlot, targeting: Record<string, string | string[]>): void {
  slot.setConfig({ targeting });
}

export function getPageTargetingMap(gpt: GptApi = googletag): TargetingMap {
  return getTargetingConfig(gpt);
}

export function getSlotTargetingMap(slot: GptSlot): TargetingMap {
  return getTargetingConfig(slot);
}

export function getPageTargetingKeys(gpt: GptApi = googletag): string[] {
  return Object.keys(getTargetingConfig(gpt));
}

export function getPageTargeting(key: string, gpt: GptApi = googletag): string[] {
  return getTargetingConfig(gpt)[key] ?? [];
}

export function setPageTargeting(key: string, value: string | string[], gpt: GptApi = googletag): void {
  gpt.setConfig({ targeting: { [key]: value } });
}

export function setSlotTargeting(slot: GptSlot, key: string, value: string | string[]): void {
  slot.setConfig({ targeting: { [key]: value } });
}

export function getSlotTargeting(slot: GptSlot, key: string): string[] {
  return getTargetingConfig(slot)[key] ?? [];
}

export function getSlotTargetingKeys(slot: GptSlot): string[] {
  return Object.keys(getTargetingConfig(slot));
}
