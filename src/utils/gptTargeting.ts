// shim for the deprecation of GPT setTargeting / getTargeting methods

function tryGetConfig(target, action, fallback) {
  if (typeof target.getConfig === 'function') {
    return action(target.getConfig('targeting').targeting ?? {})
  } else {
    return fallback();
  }
}

function trySetConfig(target, action, fallback) {
  // look for getConfig still, as setConfig was there before the deprecation
  return typeof target.getConfig === 'function' ? action() : fallback();
}

export function updateSlotTargetingFromMap(slot: googletag.Slot, map: Record<string, string | string[]>): googletag.Slot {
  return trySetConfig(slot, () => (slot as any).setConfig({ targeting: map }), () => slot.updateTargetingFromMap(map));
}

function getTargetingMap(configTarget, getTargetingTarget) {
  return tryGetConfig(configTarget, (targeting) => targeting, () => {
    const target = getTargetingTarget();
    return Object.fromEntries(target.getTargetingKeys().map(key => [key, target.getTargeting(key)]));
  })
}

export function getPageTargetingMap(gpt = googletag): Record<string, string[]> {
  return getTargetingMap(gpt, () => gpt.pubads())
}

export function getSlotTargetingMap(slot: googletag.Slot): Record<string, string[]> {
  return getTargetingMap(slot, () => slot);
}

export function getPageTargetingKeys(gpt = googletag): string[] {
  return tryGetConfig(gpt, (cfg) => Object.keys(cfg), () => gpt.pubads().getTargetingKeys())
}

export function getPageTargeting(key: string, gpt = googletag): string[] {
  return tryGetConfig(gpt, (cfg) => cfg[key] ?? [], () => gpt.pubads().getTargeting(key))
}

export function setPageTargeting(key: string, value: string | string[], gpt = googletag) {
  return trySetConfig(gpt, () => (gpt as any).setConfig({ targeting: { [key]: value } }), () => gpt.pubads().setTargeting(key, value))
}

export function setSlotTargeting(slot: googletag.Slot, key: string, value: string | string[]): googletag.Slot {
  return trySetConfig(slot, () => (slot as any).setConfig({ targeting: { [key]: value } }), () => slot.setTargeting(key, value));
}

export function getSlotTargeting(slot: googletag.Slot, key: string): string[] {
  return tryGetConfig(slot, (cfg) => cfg[key] ?? [], () => slot.getTargeting(key))
}

export function getSlotTargetingKeys(slot: googletag.Slot): string[] {
  return tryGetConfig(slot, (cfg) => Object.keys(cfg), () => slot.getTargetingKeys())
}
