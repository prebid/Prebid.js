import { submodule } from '../src/hook.js'
import { deepAccess, logInfo } from '../src/utils.js'

const oxxionRtdSearchFor = [ 'adUnitCode', 'auctionId', 'bidder', 'bidderCode', 'bidId', 'cpm', 'creativeId', 'currency', 'width', 'height', 'mediaType', 'netRevenue', 'originalCpm', 'originalCurrency', 'requestId', 'size', 'source', 'status', 'timeToRespond', 'transactionId', 'ttl', 'sizes', 'mediaTypes', 'src', 'userId', 'labelAny', 'adId' ];
const LOG_PREFIX = 'oxxionRtdProvider submodule: ';

const allAdUnits = [];

/** @type {RtdSubmodule} */
export const oxxionSubmodule = {
  name: 'oxxionRtd',
  init: init,
  getBidRequestData: getAdUnits,
  onBidResponseEvent: insertVideoTracking,
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

submodule('realTimeData', oxxionSubmodule);
