import { submodule } from '../src/hook.js'
import { deepAccess, logInfo, logError } from '../src/utils.js'
import { ajax } from '../src/ajax.js';
import adapterManager from '../src/adapterManager.js';

const oxxionRtdSearchFor = [ 'adUnitCode', 'auctionId', 'bidder', 'bidderCode', 'bidId', 'cpm', 'creativeId', 'currency', 'width', 'height', 'mediaType', 'netRevenue', 'originalCpm', 'originalCurrency', 'requestId', 'size', 'source', 'status', 'timeToRespond', 'transactionId', 'ttl', 'sizes', 'mediaTypes', 'src', 'userId', 'labelAny', 'adId' ];
const LOG_PREFIX = 'oxxionRtdProvider submodule: ';

const allAdUnits = [];
const bidderAliasRegistry = adapterManager.aliasRegistry || {};

/** @type {RtdSubmodule} */
export const oxxionSubmodule = {
  name: 'oxxionRtd',
  init: init,
  getBidRequestData: getAdUnits,
  onBidResponseEvent: insertVideoTracking,
  getRequestsList: getRequestsList,
  getFilteredAdUnitsOnBidRates: getFilteredAdUnitsOnBidRates,
};

function init(config, userConsent) {
  if (!config.params || !config.params.domain) { return false }
  if (config.params.contexts && Array.isArray(config.params.contexts) && config.params.contexts.length > 0) { return true; }
  if (typeof config.params.threshold != 'undefined' && typeof config.params.samplingRate == 'number') { return true }
  return false;
}

function getAdUnits(reqBidsConfigObj, callback, config, userConsent) {
  logInfo(LOG_PREFIX + 'started with ', config);
  if (typeof config.params.threshold != 'undefined' && typeof config.params.samplingRate == 'number') {
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
      if (typeof callback == 'function') { callback(); }
    }).catch(error => logError(LOG_PREFIX, 'bidInterestError', error));
  }
  if (config.params.contexts && Array.isArray(config.params.contexts) && config.params.contexts.length > 0) {
    const reqAdUnits = reqBidsConfigObj.adUnits;
    if (Array.isArray(reqAdUnits)) {
      reqAdUnits.forEach(adunit => {
        if (config.params.contexts.includes(deepAccess(adunit, 'mediaTypes.video.context'))) {
          allAdUnits.push(adunit);
        }
      });
    }
    if (!(typeof config.params.threshold != 'undefined' && typeof config.params.samplingRate == 'number') && typeof callback == 'function') {
      callback();
    }
  }
}

function insertVideoTracking(bidResponse, config, userConsent) {
  // this should only be do for video bids
  if (bidResponse.mediaType === 'video') {
    let maxCpm = 0;
    const trackingUrl = getImpUrl(config, bidResponse, maxCpm);
    if (!trackingUrl) {
      return;
    }
    // Vast Impression URL
    if (bidResponse.vastUrl) {
      bidResponse.vastImpUrl = bidResponse.vastImpUrl
        ? trackingUrl + '&url=' + encodeURI(bidResponse.vastImpUrl)
        : trackingUrl;
      logInfo(LOG_PREFIX + 'insert into vastImpUrl for adId ' + bidResponse.adId);
    }
    // Vast XML document
    if (bidResponse.vastXml !== undefined) {
      const doc = new DOMParser().parseFromString(bidResponse.vastXml, 'text/xml');
      const wrappers = doc.querySelectorAll('VAST Ad Wrapper, VAST Ad InLine');
      let hasAltered = false;
      if (wrappers.length) {
        wrappers.forEach(wrapper => {
          const impression = doc.createElement('Impression');
          impression.appendChild(doc.createCDATASection(trackingUrl));
          wrapper.appendChild(impression)
        });
        bidResponse.vastXml = new XMLSerializer().serializeToString(doc);
        hasAltered = true;
      }
      if (hasAltered) {
        logInfo(LOG_PREFIX + 'insert into vastXml for adId ' + bidResponse.adId);
      }
    }
  }
}

function getImpUrl(config, data, maxCpm) {
  const adUnitCode = data.adUnitCode;
  const adUnits = allAdUnits.find(adunit => adunit.code === adUnitCode &&
  'mediaTypes' in adunit &&
  'video' in adunit.mediaTypes &&
  typeof adunit.mediaTypes.video.context === 'string');
  const context = adUnits !== undefined
    ? adUnits.mediaTypes.video.context
    : 'unknown';
  if (!config.params.contexts.includes(context)) {
    return false;
  }
  let trackingImpUrl = 'https://' + config.params.domain + '.oxxion.io/analytics/vast_imp?';
  trackingImpUrl += oxxionRtdSearchFor.reduce((acc, param) => {
    switch (typeof data[param]) {
      case 'string':
      case 'number':
        acc += param + '=' + data[param] + '&'
        break;
    }
    return acc;
  }, '');
  const cpmIncrement = 0.0;
  return trackingImpUrl + 'cpmIncrement=' + cpmIncrement + '&context=' + context;
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
  const filteredBids = [];
  // Separate bidsRateInterests in two groups against threshold & samplingRate
  const { interestingBidsRates, uninterestingBidsRates } = bidsRateInterests.reduce((acc, interestingBid) => {
    const isBidRateUpper = typeof threshold == 'number' ? interestingBid.rate === true || interestingBid.rate > threshold : interestingBid.suggestion;
    const isBidInteresting = isBidRateUpper || (getRandomNumber(100) < samplingRate && useSampling);
    const key = isBidInteresting ? 'interestingBidsRates' : 'uninterestingBidsRates';
    acc[key].push(interestingBid);
    return acc;
  }, {
    interestingBidsRates: [],
    uninterestingBidsRates: [] // Do something with later
  });
  logInfo(LOG_PREFIX, 'getFilteredAdUnitsOnBidRates()', interestingBidsRates, uninterestingBidsRates);
  // Filter bids and adUnits against interesting bids rates
  const newAdUnits = adUnits.filter(({ bids = [] }, adUnitIndex) => {
    adUnits[adUnitIndex].bids = bids.filter(bid => {
      if (!params.bidders || params.bidders.includes(bid.bidder)) {
        const index = interestingBidsRates.findIndex(({ id }) => id === bid._id);
        if (index == -1) {
          let tmpBid = bid;
          tmpBid['code'] = adUnits[adUnitIndex].code;
          tmpBid['mediaTypes'] = adUnits[adUnitIndex].mediaTypes;
          tmpBid['originalBidder'] = bidderAliasRegistry[bid.bidder] || bid.bidder;
          if (tmpBid.floorData) {
            delete tmpBid.floorData;
          }
          filteredBids.push(tmpBid);
        }
        delete bid._id;
        return index !== -1;
      } else {
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
