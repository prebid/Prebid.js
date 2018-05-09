import * as utils from 'src/utils';
import {registerBidder} from 'src/adapters/bidderFactory';

const BID_REQUEST_BASE_URL = 'https://in-appadvertising.com/api/bidRequest';
const USER_SYNC_URL = 'https://in-appadvertising.com/api/userSync.html';
const BIDDER_CODE = 'trion';
const BASE_KEY = '_trion_';

export const spec = {
  code: BIDDER_CODE,
  isBidRequestValid: function (bid) {
    return !!(bid && bid.params && bid.params.pubId && bid.params.sectionId);
  },
  buildRequests: function (validBidRequests) {
    var bidRequests = [];

    for (var i = 0; i < validBidRequests.length; i++) {
      var bid = validBidRequests[i];

      var trionUrlParams = buildTrionUrlParams(bid);

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
        bidResponses.push(bid);
      }
    }

    return bidResponses;
  },
  getUserSyncs: function getUserSyncs(syncOptions) {
    if (syncOptions.iframeEnabled) {
      handlePostMessage();
      return [{
        type: 'iframe',
        url: getSyncUrl()
      }];
    }
  }

};
registerBidder(spec);

function getSyncUrl() {
  var unParsedPubAndSection = getStorageData(BASE_KEY + 'lps') || ':';
  var pubSectionArray = unParsedPubAndSection.split(':') || [];
  var pubId = pubSectionArray[0] || -1;
  var sectionId = pubSectionArray[1] || -1;
  var url = utils.getTopWindowUrl();
  return USER_SYNC_URL + `?p=${pubId}&s=${sectionId}&u=${url}`;
}

function buildTrionUrlParams(bid) {
  var pubId = utils.getBidIdParameter('pubId', bid.params);
  var sectionId = utils.getBidIdParameter('sectionId', bid.params);
  var re = utils.getBidIdParameter('re', bid.params);
  var url = utils.getTopWindowUrl();
  var sizes = utils.parseSizesInput(bid.sizes).join(',');

  var int_t = window.TR_INT_T && window.TR_INT_T != -1 ? window.TR_INT_T : null;
  if (!int_t) {
    int_t = getStorageData(BASE_KEY + 'int_t');
  }
  if (int_t) {
    setStorageData(BASE_KEY + 'int_t', int_t)
  }
  setStorageData(BASE_KEY + 'lps', pubId + ':' + sectionId);
  var trionUrl = '';

  trionUrl = utils.tryAppendQueryString(trionUrl, 'bidId', bid.bidId);
  trionUrl = utils.tryAppendQueryString(trionUrl, 'pubId', pubId);
  trionUrl = utils.tryAppendQueryString(trionUrl, 'sectionId', sectionId);
  trionUrl = utils.tryAppendQueryString(trionUrl, 're', re);
  if (url) {
    trionUrl += 'url=' + url + '&';
  }
  if (sizes) {
    trionUrl += 'sizes=' + sizes + '&';
  }
  if (int_t) {
    trionUrl = utils.tryAppendQueryString(trionUrl, 'int_t', encodeURIComponent(int_t));
  }

  // remove the trailing "&"
  if (trionUrl.lastIndexOf('&') === trionUrl.length - 1) {
    trionUrl = trionUrl.substring(0, trionUrl.length - 1);
  }
  return trionUrl;
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
    if (window.localStorage) {
      item = window.localStorage.getItem(key);
    }
  } catch (e) {
  }
  return item;
}

export function setStorageData(key, item) {
  try {
    if (window.localStorage) {
      window.localStorage.setItem(key, item);
    }
  } catch (e) {
  }
}

export function acceptPostMessage(e) {
  var message = e.data || '';
  if (message.indexOf(BASE_KEY + 'userId') !== 0) {
    return;
  }
  var int_t = message.split(BASE_KEY + 'userId=')[1];
  if (int_t) {
    setStorageData(BASE_KEY + 'int_t', int_t);
  }
}
