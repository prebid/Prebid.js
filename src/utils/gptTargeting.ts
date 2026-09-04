// shim for the deprecation of GPT setTargeting / getTargeting methods

import { TARGETING_KEYS } from '../constants.js';
import type { GptApi, GptSlot } from '../types/gpt.d.ts';

const targetedAdIdsBySlot = new WeakMap<GptSlot, Set<string>>();

function collectTargetedAdIds(targeting: Record<string, string | string[]>): Set<string> {
  const adIds = new Set<string>();
  Object.entries(targeting).forEach(([key, value]) => {
    if (!key.startsWith(TARGETING_KEYS.AD_ID)) return;
    (Array.isArray(value) ? value : [value]).forEach((v) => {
      if (v) adIds.add(String(v));
    });
  });
  return adIds;
}

export function recordSlotTargeting(slot: GptSlot, targeting: Record<string, string | string[]>): void {
  targetedAdIdsBySlot.set(slot, collectTargetedAdIds(targeting));
}

export function slotHasTargetedAdId(slot: GptSlot, adId: string): boolean {
  return targetedAdIdsBySlot.get(slot)?.has(adId) ?? false;
}

export function findSlotElementIdByAdId(adId: string, getSlots: () => GptSlot[] = () => (window as any).googletag.pubads().getSlots()): string | null {
  if (adId == null) return null;
  const slot = getSlots().find((s) => slotHasTargetedAdId(s, adId));
  return (slot as any)?.getSlotElementId?.() ?? null;
}

/**
 * The new config API on gpt and Slot we assume with the hasConfigApi typeguard.
 */
interface ConfigApi {
  getConfig(key: string): { targeting?: Record<string, string[]> };
  setConfig(config: { targeting: Record<string, string | string[]> }): void;
}

/**
 * Typeguard to check if the target has the new GPT config API (getConfig/setConfig).
 */
function hasConfigApi(target: unknown): target is ConfigApi {
  // look for getConfig still, as setConfig was there before the deprecation
  return typeof (target as ConfigApi).getConfig === 'function';
}

function getTargetingConfig(target: ConfigApi): Record<string, string[]> {
  return target.getConfig('targeting').targeting ?? {};
}

export function updateSlotTargetingFromMap(slot: GptSlot, targeting: Record<string, string | string[]>): void {
  if (hasConfigApi(slot)) {
    slot.setConfig({ targeting });
  } else {
    slot.updateTargetingFromMap(targeting);
  }
}

export function getPageTargetingMap(gpt: GptApi = googletag): Record<string, string[]> {
  if (hasConfigApi(gpt)) return getTargetingConfig(gpt);
  const pubads = gpt.pubads();
  return Object.fromEntries(pubads.getTargetingKeys().map(key => [key, pubads.getTargeting(key)]));
}

export function getSlotTargetingMap(slot: GptSlot): Record<string, string[]> {
  if (hasConfigApi(slot)) return getTargetingConfig(slot);
  return Object.fromEntries(slot.getTargetingKeys().map(key => [key, slot.getTargeting(key)]));
}

export function getPageTargetingKeys(gpt: GptApi = googletag): string[] {
  if (hasConfigApi(gpt)) return Object.keys(getTargetingConfig(gpt));
  return gpt.pubads().getTargetingKeys();
}

export function getPageTargeting(key: string, gpt: GptApi = googletag): string[] {
  if (hasConfigApi(gpt)) return getTargetingConfig(gpt)[key] ?? [];
  return gpt.pubads().getTargeting(key);
}

export function setPageTargeting(key: string, value: string | string[], gpt: GptApi = googletag) {
  if (hasConfigApi(gpt)) {
    gpt.setConfig({ targeting: { [key]: value } });
  } else {
    gpt.pubads().setTargeting(key, value);
  }
}

export function setSlotTargeting(slot: GptSlot, key: string, value: string | string[]): void {
  if (hasConfigApi(slot)) {
    slot.setConfig({ targeting: { [key]: value } });
  } else {
    slot.setTargeting(key, value);
  }
}

export function getSlotTargeting(slot: GptSlot, key: string): string[] {
  if (hasConfigApi(slot)) return getTargetingConfig(slot)[key] ?? [];
  return slot.getTargeting(key);
}

export function getSlotTargetingKeys(slot: GptSlot): string[] {
  if (hasConfigApi(slot)) return Object.keys(getTargetingConfig(slot));
  return slot.getTargetingKeys();
}
