import { registerBidder } from '../src/adapters/bidderFactory.js';
import { BANNER } from '../src/mediaTypes.js';
import { getStorageManager } from '../src/storageManager.js';
import { ajax } from '../src/ajax.js';
import { config } from '../src/config.js';

const BIDDER_CODE = 'lasso';
const ENDPOINT_URL = 'https://trc.lhmos.com/prebid';
const GET_IUD_URL = 'https://secure.adnxs.com/getuid?';
const COOKIE_NAME = 'aim-xr';
const storage = getStorageManager({bidderCode: BIDDER_CODE});

export const spec = {
  code: BIDDER_CODE,
  isBidRequestValid: function(bid) {
    return !!(bid.params && bid.params.adUnitId);
  },

  buildRequests: function(validBidRequests, bidderRequest) {
    if (validBidRequests.length === 0) {
      return [];
    }

    let aimXR = '';
    if (storage.cookiesAreEnabled) {
      aimXR = storage.getCookie(COOKIE_NAME, undefined);
    }

    return validBidRequests.map(bidRequest => {
      let sizes = []
      if (bidRequest.mediaTypes && bidRequest.mediaTypes[BANNER] && bidRequest.mediaTypes[BANNER].sizes) {
        sizes = bidRequest.mediaTypes[BANNER].sizes;
      }

      const payload = {
        auctionStart: bidderRequest.auctionStart,
        url: encodeURIComponent(window.location.href),
        bidderRequestId: bidRequest.bidderRequestId,
        adUnitCode: bidRequest.adUnitCode,
        auctionId: bidRequest.auctionId,
        bidId: bidRequest.bidId,
        transactionId: bidRequest.transactionId,
        device: JSON.stringify(getDeviceData()),
        sizes,
        aimXR,
        uid: '$UID',
        params: JSON.stringify(bidRequest.params),
        crumbs: JSON.stringify(bidRequest.crumbs),
        prebidVersion: '$prebid.version$',
        version: 1,
        coppa: config.getConfig('coppa') == true ? 1 : 0,
        ccpa: bidderRequest.uspConsent || undefined
      }

      return {
        method: 'GET',
        url: getBidRequestUrl(aimXR),
        data: payload,
        options: {
          withCredentials: false
        },
      };
    });
  },

  interpretResponse: function(serverResponse) {
    const response = serverResponse && serverResponse.body;
    const bidResponses = [];

    if (!response) {
      return bidResponses;
    }

    const bidResponse = {
      requestId: response.bidid,
      cpm: response.bid.price,
      currency: response.cur,
      width: response.bid.w,
      height: response.bid.h,
      creativeId: response.bid.crid,
      netRevenue: response.netRevenue,
      ttl: response.ttl,
      ad: response.bid.ad,
      mediaType: response.bid.mediaType,
      meta: {
        secondaryCatIds: response.bid.cat,
        advertiserDomains: response.bid.advertiserDomains,
        advertiserName: response.meta.advertiserName,
        mediaType: response.bid.mediaType
      }
    };
    bidResponses.push(bidResponse);
    return bidResponses;
  },

  onTimeout: function(timeoutData) {
    if (timeoutData === null) {
      return;
    }
    ajax(ENDPOINT_URL + '/timeout', null, JSON.stringify(timeoutData), {
      method: 'POST',
      withCredentials: false
    });
  },

  onBidWon: function(bid) {
    ajax(ENDPOINT_URL + '/won', null, JSON.stringify(bid), {
      method: 'POST',
      withCredentials: false
    });
  },

  supportedMediaTypes: [BANNER]
}

function getBidRequestUrl(aimXR) {
  if (!aimXR) {
    return GET_IUD_URL + ENDPOINT_URL + '/request';
  }
  return ENDPOINT_URL + '/request'
}

function getDeviceData() {
  const win = window.top;
  return {
    ua: navigator.userAgent,
    width: win.innerWidth || win.document.documentElement.clientWidth || win.document.body.clientWidth,
    height: win.innerHeight || win.document.documentElement.clientHeight || win.document.body.clientHeight,
    browserLanguage: navigator.language,
  }
}

registerBidder(spec);
