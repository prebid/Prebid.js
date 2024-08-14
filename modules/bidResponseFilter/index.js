import { config } from '../../src/config.js';
import { getHook } from '../../src/hook.js';

const MODULE_NAME = 'bidResponseFilter';
export const PUBLISHER_FILTER_REJECTION_REASON = 'PUBLISHER_FILTER_REJECTION_REASON';
export const BID_CATEGORY_REJECTION_REASON = 'BID_CATEGORY_REJECTION_REASON';
export const BID_ADV_DOMAINS_REJECTION_REASON = 'BID_ADV_DOMAINS_REJECTION_REASON';
export const BID_ATTR_REJECTION_REASON = 'BID_ATTR_REJECTION_REASON';

function init() {
  getHook('addBidResponse').before(addBidResponseHook);
};

export function addBidResponseHook(next, adUnitCode, bid, reject) {
  const filterFn = config.getConfig(`${MODULE_NAME}.filterFn`)
  const filter = typeof filterFn == 'function' ? filterFn : () => true;
  const { bcat = [], badv = [], battr = [] } = config.getAnyConfig('ortb2') || {};
  const { primaryCatId, advertiserDomains = [], attr } = bid.meta || {};

  // checking if bid fulfills validation rule set by publisher
  if (!filter(bid)) {
    reject(PUBLISHER_FILTER_REJECTION_REASON);
  } else {
    // checking if bid fulfills ortb2 fields rules
    if (bcat.includes(primaryCatId)) {
      reject(BID_CATEGORY_REJECTION_REASON);
    } else if (badv.some(domain => advertiserDomains.includes(domain))) {
      reject(BID_ADV_DOMAINS_REJECTION_REASON);
    } else if (battr.includes(attr)) {
      reject(BID_ATTR_REJECTION_REASON);
    } else {
      return next(adUnitCode, bid, reject);
    }
  }
}

init();
