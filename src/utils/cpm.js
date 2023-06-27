import {auctionManager} from '../auctionManager.js';
import {bidderSettings} from '../bidderSettings.js';
import {logError} from '../utils.js';

export function adjustCpm(cpm, bidResponse, bidRequest, {index = auctionManager.index, bs = bidderSettings} = {}) {
  bidRequest = bidRequest || index.getBidRequest(bidResponse);
  const adapterCode = bidResponse?.adapterCode;
  const bidderCode = bidResponse?.bidderCode || bidRequest?.bidder;
  const adjustAlternateBids = bs.get(bidResponse?.adapterCode, 'adjustAlternateBids');
  const bidCpmAdjustment = bs.getOwn(bidderCode, 'bidCpmAdjustment') || bs.get(adjustAlternateBids ? adapterCode : bidderCode, 'bidCpmAdjustment');

  if (bidCpmAdjustment && typeof bidCpmAdjustment === 'function') {
    try {
      return bidCpmAdjustment(cpm, Object.assign({}, bidResponse), bidRequest);
    } catch (e) {
      logError('Error during bid adjustment', e);
    }
  }
  return cpm;
}
