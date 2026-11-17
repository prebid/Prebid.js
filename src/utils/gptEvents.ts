import { isGptPubadsDefined } from "../utils.js";

type GPTEventName = keyof googletag.events.EventTypeMap;
type GPTEvent<K extends GPTEventName> = googletag.events.EventTypeMap[K];

export function gptEventHandler<E extends GPTEventName>(event: E, handler: (event: GPTEvent<E>) => void) {
  let enabled = false;
  return {
    enable(): void {
      if (!enabled && isGptPubadsDefined()) {
        enabled = true;
        googletag.pubads().addEventListener?.(event, handler);
      }
    },
    disable() {
      if (enabled) {
        enabled = false;
        if (isGptPubadsDefined()) {
          googletag.pubads().removeEventListener?.(event, handler);
        }
      }
    }
  };
}
