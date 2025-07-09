import { startAuction } from '../../src/prebid.js';

const cache = new Map();

startAuction.before((next, auctionConfig) => {
  clearCache();
  next(auctionConfig);
});

export function clearCache() {
  cache.clear();
}

export function getBoundingClientRect(element) {
  let clientRect;
  if (cache.has(element)) {
    clientRect = cache.get(element);
  } else {
    // eslint-disable-next-line no-restricted-properties
    clientRect = element.getBoundingClientRect();
    cache.set(element, clientRect);
  }

  return clientRect;
}
