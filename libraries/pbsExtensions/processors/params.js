import {auctionManager} from '../../../src/auctionManager.js';
import adapterManager from '../../../src/adapterManager.js';
import {deepSetValue} from '../../../src/utils.js';

export function setImpBidParams(
  imp, bidRequest, context,
  {adUnit, bidderRequests, index = auctionManager.index, bidderRegistry = adapterManager.bidderRegistry} = {}) {
  let params = bidRequest.params;
  const adapter = bidderRegistry[bidRequest.bidder];
  let owAliases;

  if (adapter && adapter.getSpec().transformBidParams) {
    adUnit = adUnit || index.getAdUnit(bidRequest);
    bidderRequests = bidderRequests || [context.bidderRequest];
    params = adapter.getSpec().transformBidParams(params, true, adUnit, bidderRequests);
  }
  // init OWAlias
  if (context && context.s2sBidRequest && context.s2sBidRequest.s2sConfig && context.s2sBidRequest.s2sConfig.extPrebid) {
    owAliases = context.s2sBidRequest.s2sConfig.extPrebid.aliases;
  }

  // checking if a partner is pubmatic alias or pubmatic itself
  var checkPubMaticAlias = function checkPubMaticAlias(bidder) {
    if (bidder == 'pubmatic' || bidder == 'pubmatic2' || (owAliases && owAliases[bidder] && owAliases[bidder].includes('pubmatic'))) {
      return true;
    }
    return false;
  };
  // passing bid.bidViewability to pubmatic params, only when present
  var addBidViewabilityDataS2S = function addBidViewabilityDataS2S() {
    if (checkPubMaticAlias(bidRequest.bidder) && bidRequest.bidViewability) {
      params.bidViewability = bidRequest.bidViewability
    }
  };
  addBidViewabilityDataS2S();

  if (params) {
    deepSetValue(
      imp,
      `ext.prebid.bidder.${bidRequest.bidder}`,
      params
    );
  }
}
