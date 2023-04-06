import {auctionManager} from '../auctionManager.js';
import {bidderSettings} from '../bidderSettings.js';
import {getGlobal} from '../prebidGlobal.js';
import {logError} from '../utils.js';

export function adjustCpm(cpm, bidResponse, bidRequest, {index = auctionManager.index, bs = bidderSettings} = {}) {
  bidRequest = bidRequest || index.getBidRequest(bidResponse);
  const globalBidderSettings = getGlobal().bidderSettings || {};
  const adapterCode = bidResponse?.adapterCode;
  const bidderCode = bidResponse?.bidderCode || bidRequest?.bidder;
  const adjustAlternateBids = bs.get(bidResponse?.adapterCode, 'adjustAlternateBids');
  const scope = adjustAlternateBids && !globalBidderSettings.hasOwnProperty(bidderCode) ? adapterCode : bidderCode;
  const bidCpmAdjustment = bs.get(scope, 'bidCpmAdjustment');

  if (bidCpmAdjustment && typeof bidCpmAdjustment === 'function') {
    try {
      return bidCpmAdjustment(cpm, Object.assign({}, bidResponse), bidRequest);
    } catch (e) {
      logError('Error during bid adjustment', e);
    }
  }
  return cpm;
}
