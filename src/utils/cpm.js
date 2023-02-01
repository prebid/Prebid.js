import {auctionManager} from '../auctionManager.js';
import {bidderSettings} from '../bidderSettings.js';
import {logError} from '../utils.js';

export function adjustCpm(cpm, bidResponse, bidRequest, {index = auctionManager.index, bs = bidderSettings} = {}, gba = getBidAdjustment) {
  bidRequest = bidRequest || index.getBidRequest(bidResponse);

  const adapterAllowAlternateBidderCodes = bs.get(bidResponse?.adapterCode || bidRequest?.bidder, 'allowAlternateBidderCodes');
  const catchUnknownBidderCodesWithAdapterBidAdjustment = bs.get(bidResponse?.adapterCode || bidRequest?.bidder, 'catchUnknownBidderCodesWithAdapterBidAdjustment');
  const scope = adapterAllowAlternateBidderCodes && catchUnknownBidderCodesWithAdapterBidAdjustment
    ? bidResponse?.adapterCode || bidRequest?.bidder
    : bidResponse?.bidderCode || bidRequest?.bidder;
  const bidCpmAdjustment = gba(bs, scope);

  if (bidCpmAdjustment && typeof bidCpmAdjustment === 'function') {
    try {
      return bidCpmAdjustment(cpm, Object.assign({}, bidResponse), bidRequest);
    } catch (e) {
      logError('Error during bid adjustment', e);
    }
  }
  return cpm;
}

function getBidAdjustment(bs, scope) {
  return bs.get(scope, 'bidCpmAdjustment');
}
