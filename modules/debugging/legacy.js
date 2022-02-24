export let addBidResponseBound;
export let addBidderRequestsBound;

export function addHooks(overrides, {hook, logger}) {
  addBidResponseBound = addBidResponseHook.bind({overrides, logger});
  hook.get('addBidResponse').before(addBidResponseBound, 5);

  addBidderRequestsBound = addBidderRequestsHook.bind({overrides, logger});
  hook.get('addBidderRequests').before(addBidderRequestsBound, 5);
}

export function removeHooks({hook}) {
  hook.get('addBidResponse').getHooks({hook: addBidResponseBound}).remove();
  hook.get('addBidderRequests').getHooks({hook: addBidderRequestsBound}).remove();
}

/**
 * @param {{bidder:string, adUnitCode:string}} overrideObj
 * @param {string} bidderCode
 * @param {string} adUnitCode
 * @returns {boolean}
 */
export function bidExcluded(overrideObj, bidderCode, adUnitCode) {
  if (overrideObj.bidder && overrideObj.bidder !== bidderCode) {
    return true;
  }
  if (overrideObj.adUnitCode && overrideObj.adUnitCode !== adUnitCode) {
    return true;
  }
  return false;
}

/**
 * @param {string[]} bidders
 * @param {string} bidderCode
 * @returns {boolean}
 */
export function bidderExcluded(bidders, bidderCode) {
  return (Array.isArray(bidders) && bidders.indexOf(bidderCode) === -1);
}

/**
 * @param {Object} overrideObj
 * @param {Object} bidObj
 * @param {Object} bidType
 * @returns {Object} bidObj with overridden properties
 */
export function applyBidOverrides(overrideObj, bidObj, bidType, logger) {
  return Object.keys(overrideObj).filter(key => (['adUnitCode', 'bidder'].indexOf(key) === -1)).reduce(function(result, key) {
    logger.logMessage(`bidder overrides changed '${result.adUnitCode}/${result.bidderCode}' ${bidType}.${key} from '${result[key]}.js' to '${overrideObj[key]}'`);
    result[key] = overrideObj[key];
    result.isDebug = true;
    return result;
  }, bidObj);
}

export function addBidResponseHook(next, adUnitCode, bid) {
  const {overrides, logger} = this;

  if (bidderExcluded(overrides.bidders, bid.bidderCode)) {
    logger.logWarn(`bidder '${bid.bidderCode}' excluded from auction by bidder overrides`);
    return;
  }

  if (Array.isArray(overrides.bids)) {
    overrides.bids.forEach(function(overrideBid) {
      if (!bidExcluded(overrideBid, bid.bidderCode, adUnitCode)) {
        applyBidOverrides(overrideBid, bid, 'bidder', logger);
      }
    });
  }

  next(adUnitCode, bid);
}

export function addBidderRequestsHook(next, bidderRequests) {
  const {overrides, logger} = this;

  const includedBidderRequests = bidderRequests.filter(function (bidderRequest) {
    if (bidderExcluded(overrides.bidders, bidderRequest.bidderCode)) {
      logger.logWarn(`bidRequest '${bidderRequest.bidderCode}' excluded from auction by bidder overrides`);
      return false;
    }
    return true;
  });

  if (Array.isArray(overrides.bidRequests)) {
    includedBidderRequests.forEach(function(bidderRequest) {
      overrides.bidRequests.forEach(function(overrideBid) {
        bidderRequest.bids.forEach(function(bid) {
          if (!bidExcluded(overrideBid, bidderRequest.bidderCode, bid.adUnitCode)) {
            applyBidOverrides(overrideBid, bid, 'bidRequest', logger);
          }
        });
      });
    });
  }

  next(includedBidderRequests);
}
