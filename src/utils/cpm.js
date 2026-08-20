import { auctionManager } from '../auctionManager.js';
import { bidderSettings } from '../bidderSettings.js';
import { logError } from '../utils.js';

/**
 * Resolve a bidder-scoped hook (`bidCpmAdjustment`, `bidDesirabilityAdjustment`, …) using the same
 * precedence as publisher settings: `getOwn(bidderCode)` wins, otherwise adapter vs bidder depending on
 * `adjustAlternateBids` on the adapter scope.
 */
export function getBidAdjustmentFn(bid, bs, key, bidRequest) {
  const adapterCode = bid?.adapterCode;
  const bidderCode = bid?.bidderCode || bidRequest?.bidder;
  const adjustAlternateBids = bs.get(bid?.adapterCode, 'adjustAlternateBids');
  return bs.getOwn(bidderCode, key) || bs.get(adjustAlternateBids ? adapterCode : bidderCode, key);
}

export function adjustCpm(cpm, bidResponse, bidRequest, { index = auctionManager.index, bs = bidderSettings } = {}) {
  bidRequest = bidRequest || index.getBidRequest(bidResponse);
  const bidCpmAdjustment = getBidAdjustmentFn(bidResponse, bs, 'bidCpmAdjustment', bidRequest);
  if (bidCpmAdjustment && typeof bidCpmAdjustment === 'function') {
    try {
      return bidCpmAdjustment(cpm, Object.assign({}, bidResponse), bidRequest);
    } catch (e) {
      logError('Error during bid adjustment', e);
    }
  }
  return cpm;
}
