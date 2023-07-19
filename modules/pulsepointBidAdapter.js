import { ortbConverter } from '../libraries/ortbConverter/converter.js';
import {convertTypes, isArray} from '../src/utils.js';
import {registerBidder} from '../src/adapters/bidderFactory.js';

const DEFAULT_CURRENCY = 'USD';
const KNOWN_PARAMS = ['cp', 'ct', 'cf', 'battr', 'deals'];
const DEFAULT_TMAX = 500;

/**
 * PulsePoint Bid Adapter.
 * Contact: ExchangeTeam@pulsepoint.com
 *
 * Aliases - pulseLite and pulsepointLite are supported for backwards compatibility.
 * Formats - Display/Native/Video formats supported.
 *
 */
export const spec = {

  code: 'pulsepoint',

  gvlid: 81,

  aliases: ['pulseLite', 'pulsepointLite'],

  supportedMediaTypes: ['banner', 'native', 'video'],

  isBidRequestValid: bid => (
    !!(bid && bid.params && bid.params.cp && bid.params.ct)
  ),

  buildRequests: (bidRequests, bidderRequest) => {
    const data = converter.toORTB({bidRequests, bidderRequest});
    return {
      method: 'POST',
      url: 'https://bid.contextweb.com/header/ortb?src=prebid',
      data,
      bidderRequest
    };
  },

  interpretResponse: (response, request) => {
    if (response.body) {
      return converter.fromORTB({response: response.body, request: request.data}).bids;
    }
    return [];
  },

  getUserSyncs: syncOptions => {
    if (syncOptions.iframeEnabled) {
      return [{
        type: 'iframe',
        url: 'https://bh.contextweb.com/visitormatch'
      }];
    } else if (syncOptions.pixelEnabled) {
      return [{
        type: 'image',
        url: 'https://bh.contextweb.com/visitormatch/prebid'
      }];
    }
  },
  transformBidParams: function(params) {
    return convertTypes({
      'cf': 'string',
      'cp': 'number',
      'ct': 'number'
    }, params);
  }
};

const converter = ortbConverter({
  context: {
    netRevenue: true,
    ttl: 300,
    currency: 'USD'
  },

  imp(buildImp, bidRequest, context) {
    const imp = buildImp(bidRequest, context);
    // tagid
    imp.tagid = bidRequest.params.ct.toString();
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
    return imp;
  },

  request(buildRequest, imps, bidderRequest, context) {
    const request = buildRequest(imps, bidderRequest, context);
    // publisher id
    const siteOrApp = request.site || request.app;
    const pubId = context.bidRequests && context.bidRequests.length > 0 ? context.bidRequests[0].params.cp : '0';
    if (siteOrApp) {
      siteOrApp.publisher = Object.assign({}, siteOrApp.publisher, {
        id: pubId.toString()
      });
    }
    // tmax
    request.tmax = request.tmax || DEFAULT_TMAX;
    return request;
  },

  bidResponse(buildBidResponse, bid, context) {
    const bidResponse = buildBidResponse(bid, context);
    bidResponse.cur = bidResponse.cur || DEFAULT_CURRENCY;
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
