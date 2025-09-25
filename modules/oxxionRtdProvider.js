import { submodule } from '../src/hook.js'
import { logInfo, logError } from '../src/utils.js'
import { ajax } from '../src/ajax.js';
import adapterManager from '../src/adapterManager.js';

/**
 * @typedef {import('../modules/rtdModule/index.js').RtdSubmodule} RtdSubmodule
 */

const LOG_PREFIX = 'oxxionRtdProvider submodule: ';

const bidderAliasRegistry = adapterManager.aliasRegistry || {};

/** @type {RtdSubmodule} */
export const oxxionSubmodule = {
  name: 'oxxionRtd',
  init: init,
  getBidRequestData: getAdUnits,
  getRequestsList: getRequestsList,
  getFilteredAdUnitsOnBidRates: getFilteredAdUnitsOnBidRates,
};

function init(config, userConsent) {
  if (!config.params || !config.params.domain) { return false }
  if (typeof config.params.threshold !== 'undefined' && typeof config.params.samplingRate === 'number') { return true }
  return false;
}

function getAdUnits(reqBidsConfigObj, callback, config, userConsent) {
  const moduleStarted = new Date();
  logInfo(LOG_PREFIX + 'started with ', config);
  if (typeof config.params.threshold !== 'undefined' && typeof config.params.samplingRate === 'number') {
    let filteredBids;
    const requests = getRequestsList(reqBidsConfigObj);
    const gdpr = userConsent && userConsent.gdpr ? userConsent.gdpr.consentString : null;
    const payload = {
      gdpr,
      requests
    };
    const endpoint = 'https://' + config.params.domain + '.oxxion.io/analytics/bid_rate_interests';
    getPromisifiedAjax(endpoint, JSON.stringify(payload), {
      method: 'POST',
      withCredentials: true
    }).then(bidsRateInterests => {
      if (bidsRateInterests.length) {
        [reqBidsConfigObj.adUnits, filteredBids] = getFilteredAdUnitsOnBidRates(bidsRateInterests, reqBidsConfigObj.adUnits, config.params, true);
      }
      if (filteredBids.length > 0) {
        getPromisifiedAjax('https://' + config.params.domain + '.oxxion.io/analytics/request_rejecteds', JSON.stringify({'bids': filteredBids, 'gdpr': gdpr}), {
          method: 'POST',
          withCredentials: true
        });
      }
      if (typeof callback === 'function') { callback(); }
      const timeToRun = new Date() - moduleStarted;
      logInfo(LOG_PREFIX + ' time to run: ' + timeToRun);
      if (getRandomNumber(50) === 1) {
        ajax('https://' + config.params.domain + '.oxxion.io/ova/time', null, JSON.stringify({'duration': timeToRun, 'auctionId': reqBidsConfigObj.auctionId}), {method: 'POST', withCredentials: true});
      }
    }).catch(error => logError(LOG_PREFIX, 'bidInterestError', error));
  }
}

function getPromisifiedAjax (url, data = {}, options = {}) {
  return new Promise((resolve, reject) => {
    const callbacks = {
      success(responseText, { response }) {
        resolve(JSON.parse(response));
      },
      error(error) {
        reject(error);
      }
    };
    ajax(url, callbacks, data, options);
  })
}

function getFilteredAdUnitsOnBidRates (bidsRateInterests, adUnits, params, useSampling) {
  const { threshold, samplingRate } = params;
  const sampling = getRandomNumber(100) < samplingRate && useSampling;
  const filteredBids = [];
  // Separate bidsRateInterests in two groups against threshold & samplingRate
  const { interestingBidsRates, uninterestingBidsRates, sampledBidsRates } = bidsRateInterests.reduce((acc, interestingBid) => {
    const isBidRateUpper = typeof threshold === 'number' ? interestingBid.rate === true || interestingBid.rate > threshold : interestingBid.suggestion;
    const isBidInteresting = isBidRateUpper || sampling;
    const key = isBidInteresting ? 'interestingBidsRates' : 'uninterestingBidsRates';
    acc[key].push(interestingBid);
    if (!isBidRateUpper && sampling) {
      acc['sampledBidsRates'].push(interestingBid);
    }
    return acc;
  }, {
    interestingBidsRates: [],
    uninterestingBidsRates: [], // Do something with later
    sampledBidsRates: []
  });
  logInfo(LOG_PREFIX, 'getFilteredAdUnitsOnBidRates()', interestingBidsRates, uninterestingBidsRates);
  // Filter bids and adUnits against interesting bids rates
  const newAdUnits = adUnits.filter(({ bids = [] }, adUnitIndex) => {
    adUnits[adUnitIndex].bids = bids.filter((bid, bidIndex) => {
      if (!params.bidders || params.bidders.includes(bid.bidder)) {
        const index = interestingBidsRates.findIndex(({ id }) => id === bid._id);
        if (index === -1) {
          const tmpBid = bid;
          tmpBid['code'] = adUnits[adUnitIndex].code;
          tmpBid['mediaTypes'] = adUnits[adUnitIndex].mediaTypes;
          tmpBid['originalBidder'] = bidderAliasRegistry[bid.bidder] || bid.bidder;
          if (tmpBid.floorData) {
            delete tmpBid.floorData;
          }
          filteredBids.push(tmpBid);
          adUnits[adUnitIndex].bids[bidIndex]['ova'] = 'filtered';
        } else {
          if (sampledBidsRates.findIndex(({ id }) => id === bid._id) === -1) {
            adUnits[adUnitIndex].bids[bidIndex]['ova'] = 'cleared';
          } else {
            adUnits[adUnitIndex].bids[bidIndex]['ova'] = 'sampled';
            logInfo(LOG_PREFIX + ' sampled ! ');
          }
        }
        delete bid._id;
        return index !== -1;
      } else {
        adUnits[adUnitIndex].bids[bidIndex]['ova'] = 'protected';
        return true;
      }
    });
    return !!adUnits[adUnitIndex].bids.length;
  });
  return [newAdUnits, filteredBids];
}

function getRandomNumber (max = 10) {
  return Math.round(Math.random() * max);
}

function getRequestsList(reqBidsConfigObj) {
  let count = 0;
  return reqBidsConfigObj.adUnits.flatMap(({
    bids = [],
    mediaTypes = {},
    code = ''
  }) => bids.reduce((acc, { bidder = '', params = {} }, index) => {
    const id = count++;
    bids[index]._id = id;
    return acc.concat({
      id,
      adUnit: code,
      bidder,
      mediaTypes,
    });
  }, []));
}

submodule('realTimeData', oxxionSubmodule);
