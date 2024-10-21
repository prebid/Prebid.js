import { auctionManager } from '../../src/auctionManager.js';
import { config } from '../../src/config.js';
import { getHook } from '../../src/hook.js';

export const MODULE_NAME = 'bidResponseFilter';
export const BID_CATEGORY_REJECTION_REASON = 'Category is not allowed';
export const BID_ADV_DOMAINS_REJECTION_REASON = 'Adv domain is not allowed';
export const BID_ATTR_REJECTION_REASON = 'Attr is not allowed';

function init() {
  getHook('addBidResponse').before(addBidResponseHook);
};

export function addBidResponseHook(next, adUnitCode, bid, reject, index = auctionManager.index) {
  const {bcat = [], badv = []} = index.getOrtb2(bid) || {};
  const battr = index.getBidRequest(bid)?.ortb2Imp[bid.mediaType]?.battr || index.getAdUnit(bid)?.ortb2Imp[bid.mediaType]?.battr || [];
  const moduleConfig = config.getConfig(MODULE_NAME);

  const catConfig = {enforce: true, blockUnknown: true, ...(moduleConfig?.cat || {})};
  const advConfig = {enforce: true, blockUnknown: true, ...(moduleConfig?.adv || {})};
  const attrConfig = {enforce: true, blockUnknown: true, ...(moduleConfig?.attr || {})};

  const { primaryCatId, secondaryCatIds = [], advertiserDomains = [], attr: metaAttr } = bid.meta || {};

  // checking if bid fulfills ortb2 fields rules
  if ((catConfig.enforce && bcat.some(category => [primaryCatId, ...secondaryCatIds].includes(category))) ||
    (catConfig.blockUnknown && !primaryCatId)) {
    reject(BID_CATEGORY_REJECTION_REASON);
  } else if ((advConfig.enforce && badv.some(domain => advertiserDomains.includes(domain))) ||
    (advConfig.blockUnknown && !advertiserDomains.length)) {
    reject(BID_ADV_DOMAINS_REJECTION_REASON);
  } else if ((attrConfig.enforce && battr.includes(metaAttr)) ||
    (attrConfig.blockUnknown && !metaAttr)) {
    reject(BID_ATTR_REJECTION_REASON);
  } else {
    return next(adUnitCode, bid, reject);
  }
}

init();
