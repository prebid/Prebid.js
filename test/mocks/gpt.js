/**
 * GPT's config API for targeting: getConfig('targeting') and setConfig({ targeting }), backed by
 * `store`. As in GPT, setConfig updates only the keys it is given, a null value clears a key and a
 * null map clears them all; getConfig returns a copy with every value as an array. `onSet(key, value)`
 * is called for each key setConfig is given.
 */
export function targetingConfigApi(store = {}, onSet = () => {}) {
  return {
    getConfig(key) {
      return key === 'targeting' ? { targeting: { ...store } } : {};
    },
    setConfig({ targeting } = {}) {
      if (targeting === undefined) return;
      if (targeting === null) {
        Object.keys(store).forEach(key => delete store[key]);
        return;
      }
      Object.entries(targeting).forEach(([key, value]) => {
        onSet(key, value);
        if (value == null) {
          delete store[key];
        } else {
          store[key] = Array.isArray(value) ? [...value] : [value];
        }
      });
    }
  };
}

/**
 * A GPT slot stand-in with the given targeting and any other properties (getSlotElementId etc).
 */
export function mockGptSlot(targeting = {}, props = {}) {
  const slot = { ...props, ...targetingConfigApi() };
  slot.setConfig({ targeting });
  return slot;
}
