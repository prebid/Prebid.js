import { endLayoutEpoch, onLayoutEpochEnd, startLayoutEpoch } from '../../src/utils/layoutEpoch.js';

// rects are cached for the current layout epoch, together with getWinDimensions(), so the two can be
// combined; see src/utils/layoutEpoch.js
let cache = new WeakMap();
let dimensionCache = new WeakMap();

onLayoutEpochEnd(() => {
  cache = new WeakMap();
  dimensionCache = new WeakMap();
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

// Preserve the untransformed, integer border-box dimensions of offsetWidth/offsetHeight.
export function getElementDimensions(element) {
  if (!dimensionCache.has(element)) {
    startLayoutEpoch();
    dimensionCache.set(element, { width: element.offsetWidth, height: element.offsetHeight });
  }
  return dimensionCache.get(element);
}
