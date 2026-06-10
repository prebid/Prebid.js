// shim for the deprecation of GPT setTargeting / getTargeting methods

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

export function updateSlotTargetingFromMap(slot: googletag.Slot, targeting: Record<string, string | string[]>): void {
  if (hasConfigApi(slot)) {
    slot.setConfig({ targeting });
  } else {
    slot.updateTargetingFromMap(targeting);
  }
}

export function getPageTargetingMap(gpt = googletag): Record<string, string[]> {
  if (hasConfigApi(gpt)) return getTargetingConfig(gpt);
  const pubads = gpt.pubads();
  return Object.fromEntries(pubads.getTargetingKeys().map(key => [key, pubads.getTargeting(key)]));
}

export function getSlotTargetingMap(slot: googletag.Slot): Record<string, string[]> {
  if (hasConfigApi(slot)) return getTargetingConfig(slot);
  return Object.fromEntries(slot.getTargetingKeys().map(key => [key, slot.getTargeting(key)]));
}

export function getPageTargetingKeys(gpt = googletag): string[] {
  if (hasConfigApi(gpt)) return Object.keys(getTargetingConfig(gpt));
  return gpt.pubads().getTargetingKeys();
}

export function getPageTargeting(key: string, gpt = googletag): string[] {
  if (hasConfigApi(gpt)) return getTargetingConfig(gpt)[key] ?? [];
  return gpt.pubads().getTargeting(key);
}

export function setPageTargeting(key: string, value: string | string[], gpt = googletag) {
  if (hasConfigApi(gpt)) {
    gpt.setConfig({ targeting: { [key]: value } });
  } else {
    gpt.pubads().setTargeting(key, value);
  }
}

export function setSlotTargeting(slot: googletag.Slot, key: string, value: string | string[]): void {
  if (hasConfigApi(slot)) {
    slot.setConfig({ targeting: { [key]: value } });
  } else {
    slot.setTargeting(key, value);
  }
}

export function getSlotTargeting(slot: googletag.Slot, key: string): string[] {
  if (hasConfigApi(slot)) return getTargetingConfig(slot)[key] ?? [];
  return slot.getTargeting(key);
}

export function getSlotTargetingKeys(slot: googletag.Slot): string[] {
  if (hasConfigApi(slot)) return Object.keys(getTargetingConfig(slot));
  return slot.getTargetingKeys();
}
