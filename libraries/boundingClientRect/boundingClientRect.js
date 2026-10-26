import { endLayoutEpoch, onLayoutEpochEnd, startLayoutEpoch } from '../../src/utils/layoutEpoch.js';

// rects are cached for the current layout epoch, together with getWinDimensions(), so the two can be
// combined; see src/utils/layoutEpoch.js
let cache = new WeakMap();

onLayoutEpochEnd(() => {
  cache = new WeakMap();
});

export function clearCache() {
  endLayoutEpoch();
}

export function getBoundingClientRect(element) {
  let clientRect;
  if (cache.has(element)) {
    clientRect = cache.get(element);
  } else {
    startLayoutEpoch();
    // eslint-disable-next-line no-restricted-properties
    clientRect = element.getBoundingClientRect();
    cache.set(element, clientRect);
  }

  return clientRect;
}
