import { config } from '../../src/config.js';
import { getHook } from '../../src/hook.js';

export const MODULE_NAME = 'bidResponseFilter';
export const PUBLISHER_FILTER_REJECTION_REASON = 'PUBLISHER_FILTER_REJECTION_REASON';
export const BID_CATEGORY_REJECTION_REASON = 'BID_CATEGORY_REJECTION_REASON';
export const BID_ADV_DOMAINS_REJECTION_REASON = 'BID_ADV_DOMAINS_REJECTION_REASON';
export const BID_ATTR_REJECTION_REASON = 'BID_ATTR_REJECTION_REASON';

function init() {
  getHook('addBidResponse').before(addBidResponseHook);
};

export function addBidResponseHook(next, adUnitCode, bid, reject) {
  const { bcat = [], badv = [], battr = [] } = config.getAnyConfig('ortb2') || {};
  const moduleConfig = config.getConfig(MODULE_NAME);
  
  const catConfig = moduleConfig?.cat || { enforce: true, block_unknown_cat: true };
  const advConfig = moduleConfig?.adv || { enforce: true, block_unknown_adomain: true };
  const attrConfig = moduleConfig?.attr || { enforce: true, block_unknown_attr: true };

  const { primaryCatId, secondaryCatIds = [], advertiserDomains = [], attr: metaAttr } = bid.meta || {};

 // checking if bid fulfills ortb2 fields rules
 if ((catConfig.enforce && bcat.some(category => [primaryCatId, ...secondaryCatIds].includes(category))) || 
    (catConfig.block_unknown_cat && !primaryCatId)) {
    reject(BID_CATEGORY_REJECTION_REASON);
  } else if ((advConfig.enforce && badv.some(domain => advertiserDomains.includes(domain))) || 
    (advConfig.block_unknown_adomain && !advertiserDomains.length)) {
    reject(BID_ADV_DOMAINS_REJECTION_REASON);
  } else if ((attrConfig.enforce && battr.includes(metaAttr)) || 
    (attrConfig.block_unknown_attr && !metaAttr)) {
    reject(BID_ATTR_REJECTION_REASON);
  } else {
    return next(adUnitCode, bid, reject);
  }
}

init();
