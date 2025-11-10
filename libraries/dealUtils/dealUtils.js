import { isStr, isArray, logWarn } from '../../src/utils.js';

export const addDealCustomTargetings = (imp, dctr, logPrefix = "") => {
  if (isStr(dctr) && dctr.length > 0) {
    const arr = dctr.split('|').filter(val => val.trim().length > 0);
    dctr = arr.map(val => val.trim()).join('|');
    imp.ext['key_val'] = dctr;
  } else {
    logWarn(logPrefix + 'Ignoring param : dctr with value : ' + dctr + ', expects string-value, found empty or non-string value');
  }
}

export const addPMPDeals = (imp, deals, logPrefix = "") => {
  if (!isArray(deals)) {
    logWarn(`${logPrefix}Error: bid.params.deals should be an array of strings.`);
    return;
  }
  deals.forEach(deal => {
    if (typeof deal === 'string' && deal.length > 3) {
      if (!imp.pmp) {
        imp.pmp = { private_auction: 0, deals: [] };
      }
      imp.pmp.deals.push({ id: deal });
    } else {
      logWarn(`${logPrefix}Error: deal-id present in array bid.params.deals should be a string with more than 3 characters length, deal-id ignored: ${deal}`);
    }
  });
}
