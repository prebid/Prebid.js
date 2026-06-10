import { isArray } from '../src/utils.js';

export function slotUnknownParams(slot, knownParams) {
  const ext = {};
  const knownParamsMap = {};
  knownParams.forEach(value => { knownParamsMap[value] = 1; });
  Object.keys(slot.params).forEach(key => {
    if (!knownParamsMap[key]) {
      ext[key] = slot.params[key];
    }
  });
  return Object.keys(ext).length > 0 ? { prebid: ext } : null;
}

export function applyCommonImpParams(imp, bidRequest, knownParams) {
  const unknownParams = slotUnknownParams(bidRequest, knownParams);
  if (imp.ext || unknownParams) {
    imp.ext = Object.assign({}, imp.ext, unknownParams);
  }
  if (bidRequest.params.battr) {
    ['banner', 'video', 'audio', 'native'].forEach(k => {
      if (imp[k]) {
        imp[k].battr = bidRequest.params.battr;
      }
    });
  }
  if (bidRequest.params.deals && isArray(bidRequest.params.deals)) {
    imp.pmp = {
      private_auction: 0,
      deals: bidRequest.params.deals
    };
  }
}
