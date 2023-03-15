import {auctionManager} from '../auctionManager.js';
import {bidderSettings} from '../bidderSettings.js';
import {logError} from '../utils.js';

export function adjustCpm(cpm, bidResponse, bidRequest, {index = auctionManager.index, bs = bidderSettings} = {}) {
  bidRequest = bidRequest || index.getBidRequest(bidResponse);
  const bidCpmAdjustment = bs.get(bidResponse?.bidderCode || bidRequest?.bidder, 'bidCpmAdjustment');

  if (bidCpmAdjustment && typeof bidCpmAdjustment === 'function') {
    try {
      return bidCpmAdjustment(cpm, Object.assign({}, bidResponse), bidRequest);
    } catch (e) {
      logError('Error during bid adjustment', e);
    }
  }
  return cpm;
}
