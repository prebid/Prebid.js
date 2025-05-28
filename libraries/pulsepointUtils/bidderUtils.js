export const DEFAULT_TMAX = 500;

export function slotUnknownParams(slot, KNOWN_PARAMS) {
  const ext = {};
  const knownParamsMap = {};
  KNOWN_PARAMS.forEach(value => knownParamsMap[value] = 1);
  Object.keys(slot.params).forEach(key => {
    if (!knownParamsMap[key]) {
      ext[key] = slot.params[key];
    }
  });
  return Object.keys(ext).length > 0 ? { prebid: ext } : null;
}

export function processImp(buildImp, bidRequest, context, KNOWN_PARAMS) {
  const imp = buildImp(bidRequest, context);
  // tagid
  imp.tagid = bidRequest.params.ct?.toString() || bidRequest.params.adzoneid?.toString();
  // unknown params
  const unknownParams = slotUnknownParams(bidRequest, KNOWN_PARAMS);
  if (imp.ext || unknownParams) {
    imp.ext = Object.assign({}, imp.ext, unknownParams);
  }
  // battr
  if (bidRequest.params.battr) {
    ['banner', 'video', 'audio', 'native'].forEach(k => {
      if (imp[k]) {
        imp[k].battr = bidRequest.params.battr;
      }
    });
  }
  // deals
  if (bidRequest.params.deals && Array.isArray(bidRequest.params.deals)) {
    imp.pmp = {
      private_auction: 0,
      deals: bidRequest.params.deals
    };
  }
  return imp;
}

export function processBidResponse(buildBidResponse, bid, context, DEFAULT_CURRENCY) {
  const bidResponse = buildBidResponse(bid, context);
  bidResponse.cur = bid.cur || DEFAULT_CURRENCY;
  return bidResponse;
}
