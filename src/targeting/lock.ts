import type {TargetingMap} from "../targeting.ts";
import {config} from "../config.ts";
import {ttlCollection} from "../utils/ttlCollection.ts";
import {isGptPubadsDefined} from "../utils.js";
import SlotRenderEndedEvent = googletag.events.SlotRenderEndedEvent;

const DEFAULT_LOCK_TIMEOUT = 3000;

declare module '../targeting.ts' {
  interface TargetingControlsConfig {
    /**
     * Targeting key(s) to lock.
     *
     * When set, targeting set through `setTargetingForGPTAsync` or `setTargetingForAst`
     * will prevent bids with the same targeting on the given keys from being used until rendering is complete or
     * `lockTimeout` milliseconds have passed.
     *
     * For example, when using standard targeting setting this to 'hb_adid' will prevent the same ad ID
     * (or equivalently, the same bid) from being used on multiple slots simultaneously.
     */
    lock?: string | string[];
    /**
     * Targeting lock timeout in milliseconds.
     */
    lockTimeout?: number;
  }
}

export function targetingLock() {
  let timeout, keys;
  let locked = ttlCollection<unknown>({
    monotonic: true,
    ttl: () => timeout,
    slack: 0,
  });
  config.getConfig('targetingControls', (cfg) => {
    ({lock: keys, lockTimeout: timeout = DEFAULT_LOCK_TIMEOUT} = cfg.targetingControls ?? {});
    if (keys != null && !Array.isArray(keys)) {
      keys = [keys];
    } else if (keys == null) {
      tearDownGpt();
    }
    locked.clear();
  })
  const [setupGpt, tearDownGpt] = (() => {
    let enabled = false;
    function onGptRender({slot}: SlotRenderEndedEvent) {
      keys?.forEach(key => slot.getTargeting(key)?.forEach(locked.delete));
    }
    return [
      () => {
        if (keys != null && !enabled && isGptPubadsDefined()) {
          googletag.pubads().addEventListener?.('slotRenderEnded', onGptRender)
          enabled = true;
        }
      },
      () => {
        if (enabled && isGptPubadsDefined()) {
          googletag.pubads().removeEventListener?.('slotRenderEnded', onGptRender)
          enabled = false;
        }
      }
    ]
  })();

  return {
    isLocked(targeting: TargetingMap<unknown>) {
      return keys?.some(key => targeting[key] != null && locked.has(targeting[key])) ?? false;
    },
    lock(targeting: TargetingMap<unknown>) {
      setupGpt();
      keys?.forEach(key => targeting[key] != null && locked.add(targeting[key]))
    }
  }
}

export const lock = targetingLock();
