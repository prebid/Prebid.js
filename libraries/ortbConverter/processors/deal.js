import { isPlainObject } from '../../../src/utils.js';

// ORTB `ext.prebid.deal.type` values, indexed by their numeric code
export const DEAL_TYPES = ['unknown', 'sponsorship', 'reservation', 'non-reservation', 'house'];

function isNonNegativeNumber(value) {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}

/**
 * Normalize ORTB `bid.ext.prebid.deal` into the shape used for `bidResponse.meta.deal`.
 * Only known, correctly typed fields are copied. Deal metadata is ignored unless the bid has a `dealid`.
 * @param {Object} bid - ORTB bid object.
 * @returns {Object|undefined} the normalized deal metadata, or undefined if there is none.
 */
export function getDealMeta(bid) {
  const deal = bid.ext?.prebid?.deal;
  if (!bid.dealid || !isPlainObject(deal)) {
    return;
  }
  const dealMeta = {
    type: (Number.isInteger(deal.type) && DEAL_TYPES[deal.type]) || 'unknown'
  };
  if (isNonNegativeNumber(deal.cpm)) {
    dealMeta.cpm = deal.cpm;
  }
  if (isNonNegativeNumber(deal.pacing_adjusted_cpm)) {
    dealMeta.pacingAdjustedCpm = deal.pacing_adjusted_cpm;
  }
  if (isNonNegativeNumber(deal.on_schedule)) {
    dealMeta.onSchedule = deal.on_schedule;
  }
  if (Number.isInteger(deal.priority)) {
    dealMeta.priority = deal.priority;
  }
  return dealMeta;
}
