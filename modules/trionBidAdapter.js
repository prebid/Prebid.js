import {getBidIdParameter, parseSizesInput} from '../src/utils.js';
import {registerBidder} from '../src/adapters/bidderFactory.js';
import { getStorageManager } from '../src/storageManager.js';
import {tryAppendQueryString} from '../libraries/urlUtils/urlUtils.js';
import {isWebdriverEnabled} from '../libraries/webdriver/webdriver.js';

const BID_REQUEST_BASE_URL = 'https://in-appadvertising.com/api/bidRequest';
const USER_SYNC_URL = 'https://in-appadvertising.com/api/userSync.html';
const BIDDER_CODE = 'trion';
const BASE_KEY = '_trion_';
const storage = getStorageManager({bidderCode: BIDDER_CODE});

export const spec = {
  code: BIDDER_CODE,
  isBidRequestValid: function (bid) {
    return !!(bid && bid.params && bid.params.pubId && bid.params.sectionId);
  },
  buildRequests: function (validBidRequests, bidderRequest) {
    var bidRequests = [];

    for (var i = 0; i < validBidRequests.length; i++) {
      var bid = validBidRequests[i];

      var trionUrlParams = buildTrionUrlParams(bid, bidderRequest);

      bidRequests.push({
        method: 'GET',
        url: BID_REQUEST_BASE_URL,
        bidRequest: bid,
        data: trionUrlParams
      });
    }
    return bidRequests;
  },

  interpretResponse: function (trionResponseObj, request) {
    var bid = {};
    var bidResponses = [];
    var bidRequest = request.bidRequest;
    var responseBody = trionResponseObj ? trionResponseObj.body : {};

    if (responseBody && responseBody.bidId && bidRequest) {
      var result = responseBody.result;

      if (result && result.cpm && result.placeBid && result.ad) {
        var cpm = parseInt(result.cpm, 10) / 100;

        bid.requestId = bidRequest.bidId;
        bid.cpm = cpm;
        bid.ad = result.ad;
        bid.width = result.width;
        bid.height = result.height;
        bid.ttl = result.ttl;
        bid.creativeId = result.creativeId;
        bid.currency = result.currency;
        bid.netRevenue = result.netRevenue;
        if (result.adomain) {
          bid.meta = {advertiserDomains: result.adomain};
        }
        bidResponses.push(bid);
      }
    }

    return bidResponses;
  },
  getUserSyncs: function getUserSyncs(syncOptions, serverResponses, gdprConsent, usPrivacy) {
    if (syncOptions.iframeEnabled) {
      handlePostMessage();
      return [{
        type: 'iframe',
        url: getSyncUrl(gdprConsent, usPrivacy)
      }];
    }
  }

};
registerBidder(spec);

function getSyncUrl(gdprConsent, usPrivacy) {
  var unParsedPubAndSection = getStorageData(BASE_KEY + 'lps') || ':';
  var pubSectionArray = unParsedPubAndSection.split(':') || [];
  var pubId = pubSectionArray[0] || -1;
  var sectionId = pubSectionArray[1] || -1;
  var url = getPublisherUrl();
  var consentParams = '';
  if (gdprConsent) {
    if (gdprConsent.consentString) {
      consentParams += '&gc=' + encodeURIComponent(gdprConsent.consentString);
    }
    consentParams += '&g=' + (gdprConsent.gdprApplies ? 1 : 0);
  }
  if (usPrivacy) {
    consentParams = '&up=' + encodeURIComponent(usPrivacy);
  }
  return USER_SYNC_URL + `?p=${pubId}&s=${sectionId}${consentParams}&u=${url}`;
}

function getPublisherUrl() {
  var url = '';
  try {
    if (window.top === window) {
      url = window.location.href;
    } else {
      try {
        url = window.top.location.href;
      } catch (e) {
        url = document.referrer;
      }
    }
  } catch (e) {
  }
  return url
}

function buildTrionUrlParams(bid, bidderRequest) {
  var pubId = getBidIdParameter('pubId', bid.params);
  var sectionId = getBidIdParameter('sectionId', bid.params);
  var url = getPublisherUrl();
  var bidSizes = getBidSizesFromBidRequest(bid);
  var sizes = parseSizesInput(bidSizes).join(',');
  // Warning: accessing navigator.webdriver may impact fingerprinting scores when this API is included in the built script.
  var isAutomated = isWebdriverEnabled() ? '1' : '0';
  var isHidden = (document.hidden) ? '1' : '0';
  var visibilityState = encodeURIComponent(document.visibilityState);

  var intT = window.TR_INT_T && window.TR_INT_T !== -1 ? window.TR_INT_T : null;
  if (!intT) {
    intT = getStorageData(BASE_KEY + 'int_t');
  }
  if (intT) {
    setStorageData(BASE_KEY + 'int_t', intT);
  }
  setStorageData(BASE_KEY + 'lps', pubId + ':' + sectionId);
  var trionUrl = '';

  trionUrl = tryAppendQueryString(trionUrl, 'bidId', bid.bidId);
  trionUrl = tryAppendQueryString(trionUrl, 'pubId', pubId);
  trionUrl = tryAppendQueryString(trionUrl, 'sectionId', sectionId);
  trionUrl = tryAppendQueryString(trionUrl, 'vers', '$prebid.version$');
  if (url) {
    trionUrl += 'url=' + url + '&';
  }
  if (sizes) {
    trionUrl += 'sizes=' + sizes + '&';
  }
  if (intT) {
    trionUrl = tryAppendQueryString(trionUrl, 'int_t', encodeURIComponent(intT));
  }
  trionUrl = tryAppendQueryString(trionUrl, 'tr_wd', isAutomated);
  trionUrl = tryAppendQueryString(trionUrl, 'tr_hd', isHidden);
  trionUrl = tryAppendQueryString(trionUrl, 'tr_vs', visibilityState);
  if (bidderRequest && bidderRequest.gdprConsent) {
    var gdpr = bidderRequest.gdprConsent;
    if (gdpr) {
      if (gdpr.consentString) {
        trionUrl = tryAppendQueryString(trionUrl, 'gdprc', encodeURIComponent(gdpr.consentString));
      }
      trionUrl = tryAppendQueryString(trionUrl, 'gdpr', (gdpr.gdprApplies ? 1 : 0));
    }
  }
  if (bidderRequest && bidderRequest.uspConsent) {
    trionUrl = tryAppendQueryString(trionUrl, 'usp', encodeURIComponent(bidderRequest.uspConsent));
  }
  // remove the trailing "&"
  if (trionUrl.lastIndexOf('&') === trionUrl.length - 1) {
    trionUrl = trionUrl.substring(0, trionUrl.length - 1);
  }
  return trionUrl;
}

function getBidSizesFromBidRequest(bid) {
  return (bid.mediaTypes && bid.mediaTypes.banner && bid.mediaTypes.banner.sizes) ? bid.mediaTypes.banner.sizes : bid.sizes;
}

function handlePostMessage() {
  try {
    if (window.addEventListener) {
      window.addEventListener('message', acceptPostMessage);
    }
  } catch (e) {
  }
}

export function getStorageData(key) {
  var item = null;
  try {
    if (storage.hasLocalStorage()) {
      item = storage.getDataFromLocalStorage(key);
    }
  } catch (e) {
  }
  return item;
}

export function setStorageData(key, item) {
  try {
    if (storage.hasLocalStorage()) {
      storage.setDataInLocalStorage(key, item);
    }
  } catch (e) {
  }
}

export function acceptPostMessage(e) {
  var message = e.data || '';
  if (!message.indexOf || !message.split || message.indexOf(BASE_KEY + 'userId') !== 0) {
    return;
  }
  var intT = message.split(BASE_KEY + 'userId=')[1];
  if (intT) {
    setStorageData(BASE_KEY + 'int_t', intT);
  }
}
