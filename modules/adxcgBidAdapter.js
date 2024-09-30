// jshint esversion: 6, es3: false, node: true
import { ortbConverter } from '../libraries/ortbConverter/converter.js';
import { registerBidder } from '../src/adapters/bidderFactory.js';
import { BANNER, NATIVE, VIDEO } from '../src/mediaTypes.js';
import {
  isArray,
  replaceAuctionPrice,
  triggerPixel,
  logMessage,
  deepSetValue,
  getBidIdParameter
} from '../src/utils.js';
import { config } from '../src/config.js';

const BIDDER_CODE = 'adxcg';
const SECURE_BID_URL = 'https://pbc.adxcg.net/rtb/ortb/pbc?adExchangeId=1';

const DEFAULT_CURRENCY = 'EUR';
const KNOWN_PARAMS = ['battr', 'deals'];
const DEFAULT_TMAX = 500;

/**
 * Adxcg Bid Adapter.
 *
 */
export const spec = {

  code: BIDDER_CODE,

  aliases: ['mediaopti'],

  supportedMediaTypes: [BANNER, NATIVE, VIDEO],

  isBidRequestValid: (bid) => {
    logMessage('adxcg  - validating isBidRequestValid');
    const params = bid.params || {};
    const { adzoneid } = params;
    return !!(adzoneid);
  },

  buildRequests: (bidRequests, bidderRequest) => {
    const data = converter.toORTB({ bidRequests, bidderRequest });
    return {
      method: 'POST',
      url: SECURE_BID_URL,
      data,
      options: {
        contentType: 'application/json'
      },
      bidderRequest
    };
  },

  interpretResponse: (response, request) => {
    if (response.body) {
      const bids = converter.fromORTB({ response: response.body, request: request.data }).bids;
      return bids;
    }
    return [];
  },

  getUserSyncs: (syncOptions, responses, gdprConsent, uspConsent) => {
    const syncs = [];
    let syncUrl = config.getConfig('adxcg.usersyncUrl');

    let query = [];
    if (syncOptions.pixelEnabled && syncUrl) {
      if (gdprConsent) {
        query.push('gdpr=' + (gdprConsent.gdprApplies & 1));
        query.push('gdpr_consent=' + encodeURIComponent(gdprConsent.consentString || ''));
      }
      if (uspConsent) {
        query.push('us_privacy=' + encodeURIComponent(uspConsent));
      }

      syncs.push({
        type: 'image',
        url: syncUrl + (query.length ? '?' + query.join('&') : '')
      });
    }
    return syncs;
  },

  onBidWon: (bid) => {
    // for native requests we put the nurl as an imp tracker, otherwise if the auction takes place on prebid server
    // the server JS adapter puts the nurl in the adm as a tracking pixel and removes the attribute
    if (bid.nurl) {
      triggerPixel(replaceAuctionPrice(bid.nurl, bid.originalCpm))
    }
  }
};

const converter = ortbConverter({
  context: {
    netRevenue: true,
    ttl: 300,
    currency: 'EUR'
  },

  imp(buildImp, bidRequest, context) {
    const imp = buildImp(bidRequest, context);
    // tagid
    imp.tagid = bidRequest.params.adzoneid.toString();
    // unknown params
    const unknownParams = slotUnknownParams(bidRequest);
    if (imp.ext || unknownParams) {
      imp.ext = Object.assign({}, imp.ext, unknownParams);
    }
    // battr
    if (bidRequest.params.battr) {
      ['banner', 'video', 'audio', 'native'].forEach(k => {
        if (imp[k]) {
          imp[k].battr = bidRequest.params.battr;
        }
      });
    }
    // deals
    if (bidRequest.params.deals && isArray(bidRequest.params.deals)) {
      imp.pmp = {
        private_auction: 0,
        deals: bidRequest.params.deals
      };
    }

    imp.secure = Number(window.location.protocol === 'https:');

    if (!imp.bidfloor && bidRequest.params.bidFloor) {
      imp.bidfloor = bidRequest.params.bidFloor;
      imp.bidfloorcur = getBidIdParameter('bidFloorCur', bidRequest.params).toUpperCase() || 'USD'
    }
    return imp;
  },

  request(buildRequest, imps, bidderRequest, context) {
    const request = buildRequest(imps, bidderRequest, context);
    request.tmax = request.tmax || DEFAULT_TMAX;
    request.test = config.getConfig('debug') ? 1 : 0;
    request.at = 1;
    deepSetValue(request, 'ext.prebid.channel.name', 'pbjs');
    deepSetValue(request, 'ext.prebid.channel.version', '$prebid.version$');
    return request;
  },

  bidResponse(buildBidResponse, bid, context) {
    const bidResponse = buildBidResponse(bid, context);
    bidResponse.cur = bid.cur || DEFAULT_CURRENCY;
    return bidResponse;
  },
});

/**
 * Unknown params are captured and sent on ext
 */
function slotUnknownParams(slot) {
  const ext = {};
  const knownParamsMap = {};
  KNOWN_PARAMS.forEach(value => knownParamsMap[value] = 1);
  Object.keys(slot.params).forEach(key => {
    if (!knownParamsMap[key]) {
      ext[key] = slot.params[key];
    }
  });
  return Object.keys(ext).length > 0 ? { prebid: ext } : null;
}

registerBidder(spec);
