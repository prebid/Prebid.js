import { ortbConverter } from '../libraries/ortbConverter/converter.js';
import { processImp, processBidResponse, DEFAULT_TMAX as SHARED_DEFAULT_TMAX } from '../libraries/pulsepointUtils/bidderUtils.js';
import {registerBidder} from '../src/adapters/bidderFactory.js';

const DEFAULT_CURRENCY = 'USD'; // This will be passed to processBidResponse

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
  }
};

const converter = ortbConverter({
  context: {
    netRevenue: true,
    ttl: 300,
    currency: 'USD'
  },

  imp(buildImp, bidRequest, context) {
    const PULSEPOINT_KNOWN_PARAMS = ['cp', 'ct', 'cf', 'battr', 'deals'];
    return processImp(buildImp, bidRequest, context, PULSEPOINT_KNOWN_PARAMS);
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
    request.tmax = request.tmax || SHARED_DEFAULT_TMAX;
    return request;
  },

  bidResponse(buildBidResponse, bid, context) {
    return processBidResponse(buildBidResponse, bid, context, DEFAULT_CURRENCY);
  },
});

registerBidder(spec);
