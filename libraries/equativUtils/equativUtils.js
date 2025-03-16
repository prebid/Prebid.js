import { VIDEO } from '../../src/mediaTypes.js';
import { deepAccess, isFn } from '../../src/utils.js';

const DEFAULT_FLOOR = 0.0;

/**
 * Get floors from Prebid Price Floors module
 *
 * @param {object} bid Bid request object
 * @param {string} currency Ad server currency
 * @param {string} mediaType Bid media type
 * @return {number} Floor price
 */
export function getBidFloor (bid, currency, mediaType) {
  const floors = [];

  if (isFn(bid.getFloor)) {
    (deepAccess(bid, `mediaTypes.${mediaType}.${mediaType === VIDEO ? 'playerSize' : 'sizes'}`) || []).forEach(size => {
      const floor = bid.getFloor({
        currency: currency || 'USD',
        mediaType,
        size
      }).floor;

      floors.push(!isNaN(floor) ? floor : DEFAULT_FLOOR);
    });
  }

  return floors.length ? Math.min(...floors) : DEFAULT_FLOOR;
}
