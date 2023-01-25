import { submodule } from '../src/hook.js'
import { deepAccess, logInfo } from '../src/utils.js'

const oxxionRtdSearchFor = [ 'adUnitCode', 'auctionId', 'bidder', 'bidderCode', 'bidId', 'cpm', 'creativeId', 'currency', 'width', 'height', 'mediaType', 'netRevenue', 'originalCpm', 'originalCurrency', 'requestId', 'size', 'source', 'status', 'timeToRespond', 'transactionId', 'ttl', 'sizes', 'mediaTypes', 'src', 'userId', 'labelAny', 'adId' ];
const LOG_PREFIX = 'oxxionRtdProvider submodule: ';

const allAdUnits = [];

/** @type {RtdSubmodule} */
export const oxxionSubmodule = {
  name: 'oxxionRtd',
  init: init,
  onAuctionEndEvent: onAuctionEnd,
  getBidRequestData: getAdUnits,
};

function init(config, userConsent) {
  if (!config.params || !config.params.domain || !config.params.contexts || !Array.isArray(config.params.contexts) || config.params.contexts.length == 0) {
    return false
  }
  return true;
}

function getAdUnits(reqBidsConfigObj, callback, config, userConsent) {
  const reqAdUnits = reqBidsConfigObj.adUnits;
  if (Array.isArray(reqAdUnits)) {
    reqAdUnits.forEach(adunit => {
      if (config.params.contexts.includes(deepAccess(adunit, 'mediaTypes.video.context'))) {
        allAdUnits.push(adunit);
      }
    });
  }
}

function insertVideoTracking(bidResponse, config, maxCpm) {
  if (bidResponse.mediaType === 'video') {
    const trackingUrl = getImpUrl(config, bidResponse, maxCpm);
    if (!trackingUrl) {
      return;
    }
    // Vast Impression URL
    if (bidResponse.vastUrl) {
      bidResponse.vastImpUrl = bidResponse.vastImpUrl
        ? trackingUrl + '&url=' + encodeURI(bidResponse.vastImpUrl)
        : trackingUrl
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
  const cpmIncrement = Math.round(100000 * (data.cpm - maxCpm)) / 100000;
  return trackingImpUrl + 'cpmIncrement=' + cpmIncrement + '&context=' + context;
}

function onAuctionEnd(auctionDetails, config, userConsent) {
  const transactionsToCheck = {}
  auctionDetails.adUnits.forEach(adunit => {
    if (config.params.contexts.includes(deepAccess(adunit, 'mediaTypes.video.context'))) {
      transactionsToCheck[adunit.transactionId] = {'bids': {}, 'maxCpm': 0.0, 'secondMaxCpm': 0.0};
    }
  });
  for (const key in auctionDetails.bidsReceived) {
    if (auctionDetails.bidsReceived[key].transactionId in transactionsToCheck) {
      transactionsToCheck[auctionDetails.bidsReceived[key].transactionId]['bids'][auctionDetails.bidsReceived[key].adId] = {'key': key, 'cpm': auctionDetails.bidsReceived[key].cpm};
      if (auctionDetails.bidsReceived[key].cpm > transactionsToCheck[auctionDetails.bidsReceived[key].transactionId]['maxCpm']) {
        transactionsToCheck[auctionDetails.bidsReceived[key].transactionId]['secondMaxCpm'] = transactionsToCheck[auctionDetails.bidsReceived[key].transactionId]['maxCpm'];
        transactionsToCheck[auctionDetails.bidsReceived[key].transactionId]['maxCpm'] = auctionDetails.bidsReceived[key].cpm;
      } else if (auctionDetails.bidsReceived[key].cpm > transactionsToCheck[auctionDetails.bidsReceived[key].transactionId]['secondMaxCpm']) {
        transactionsToCheck[auctionDetails.bidsReceived[key].transactionId]['secondMaxCpm'] = auctionDetails.bidsReceived[key].cpm;
      }
    }
  };
  Object.keys(transactionsToCheck).forEach(transaction => {
    Object.keys(transactionsToCheck[transaction]['bids']).forEach(bid => {
      insertVideoTracking(auctionDetails.bidsReceived[transactionsToCheck[transaction]['bids'][bid].key], config, transactionsToCheck[transaction].secondMaxCpm);
    });
  });
}

submodule('realTimeData', oxxionSubmodule);
