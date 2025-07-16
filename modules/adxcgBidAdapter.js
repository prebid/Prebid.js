// jshint esversion: 6, es3: false, node: true
import { ortbConverter } from '../libraries/ortbConverter/converter.js';
import { registerBidder } from '../src/adapters/bidderFactory.js';
import { BANNER, NATIVE, VIDEO } from '../src/mediaTypes.js';
import {
  replaceAuctionPrice,
  triggerPixel,
  logMessage,
  deepSetValue,
  getBidIdParameter
} from '../src/utils.js';
import { config } from '../src/config.js';
import { applyCommonImpParams } from '../libraries/impUtils.js';

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
    const syncUrl = config.getConfig('adxcg.usersyncUrl');

    const query = [];
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
    applyCommonImpParams(imp, bidRequest, KNOWN_PARAMS);

    imp.secure = bidRequest.ortb2Imp?.secure ?? 1;

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

registerBidder(spec);
