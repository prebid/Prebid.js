import {
  generateUUID,
  getDNT,
  _each,
} from '../src/utils.js';
import { config } from '../src/config.js';
import { registerBidder } from '../src/adapters/bidderFactory.js';
import { convertOrtbRequestToProprietaryNative } from '../src/native.js';
import { getStorageManager } from '../src/storageManager.js';
import { ajax } from '../src/ajax.js';
import {BANNER, VIDEO, NATIVE} from '../src/mediaTypes.js';
const ENDPOINT_URL = 'https://prebid.cht.hinet.net/api/v1';
const BIDDER_CODE = 'chtnw';
const COOKIE_NAME = '__htid';
const storage = getStorageManager({bidderCode: BIDDER_CODE});

const { getConfig } = config;

function _isMobile() {
  return (/(ios|ipod|ipad|iphone|android)/i).test(navigator.userAgent);
}

export const spec = {
  code: BIDDER_CODE,
  supportedMediaTypes: [BANNER, VIDEO, NATIVE],
  isBidRequestValid: function(bid = {}) {
    return !!(bid && bid.params);
  },
  buildRequests: function(validBidRequests = [], bidderRequest = {}) {
    validBidRequests = convertOrtbRequestToProprietaryNative(validBidRequests);
    const chtnwId = (storage.getCookie(COOKIE_NAME) != undefined) ? storage.getCookie(COOKIE_NAME) : generateUUID();
    if (storage.cookiesAreEnabled()) {
      storage.setCookie(COOKIE_NAME, chtnwId);
    }
    const device = getConfig('device') || {};
    device.w = device.w || window.innerWidth;
    device.h = device.h || window.innerHeight;
    device.ua = device.ua || navigator.userAgent;
    device.dnt = getDNT() ? 1 : 0;
    device.language = (navigator && navigator.language) ? navigator.language.split('-')[0] : '';
    const bidParams = [];
    _each(validBidRequests, function(bid) {
      bidParams.push({
        bidId: bid.bidId,
        placement: bid.params.placementId,
        sizes: bid.sizes,
        adSlot: bid.adUnitCode
      });
    });
    return {
      method: 'POST',
      url: ENDPOINT_URL + '/request/prebid.json',
      data: {
        bids: bidParams,
        uuid: chtnwId,
        device: device,
        version: {
          prebid: '$prebid.version$',
          adapter: '1.0.0',
        },
        site: {
          numIframes: bidderRequest.refererInfo?.numIframes || 0,
          isAmp: bidderRequest.refererInfo?.isAmp || false,
          pageUrl: bidderRequest.refererInfo?.page || '',
          ref: bidderRequest.refererInfo?.ref || '',
        },
      },
      bids: validBidRequests
    };
  },
  interpretResponse: function(serverResponse) {
    const bidResponses = []
    _each(serverResponse.body, function(response, i) {
      bidResponses.push({
        ...response
      });
    });
    return bidResponses;
  },
  getUserSyncs: function(syncOptions, serverResponses, gdprConsent, uspConsent) {
    const syncs = [];
    if (syncOptions.pixelEnabled) {
      const chtnwId = generateUUID()
      const uuid = chtnwId
      const type = (_isMobile()) ? 'dot' : 'pixel';
      syncs.push({
        type: 'image',
        url: `https://t.ssp.hinet.net/${type}?bd=${uuid}&t=chtnw`
      })
    }
    return syncs
  },
  onTimeout: function(timeoutData) {
    if (timeoutData === null) {
      return;
    }
    ajax(ENDPOINT_URL + '/trace/timeout/bid', null, JSON.stringify(timeoutData), {
      method: 'POST',
      withCredentials: false
    });
  },
  onBidWon: function(bid) {
    if (bid.nurl) {
      ajax(bid.nurl, null);
    }
  },
  onSetTargeting: function(bid) {
  },
}
registerBidder(spec);
