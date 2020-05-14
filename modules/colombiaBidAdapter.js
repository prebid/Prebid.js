import * as utils from '../src/utils.js';
import {config} from '../src/config.js';
import {registerBidder} from '../src/adapters/bidderFactory.js';
import { BANNER } from '../src/mediaTypes.js';
const BIDDER_CODE = 'colombia';
const ENDPOINT_URL = 'https://ade.clmbtech.com/cde/prebid.htm';
const HOST_NAME = document.location.protocol + '//' + window.location.host;

export const spec = {
  code: BIDDER_CODE,
  aliases: ['clmb'],
  supportedMediaTypes: [BANNER],
  isBidRequestValid: function(bid) {
    return !!(bid.params.placementId);
  },
  buildRequests: function(validBidRequests, bidderRequest) {
    return validBidRequests.map(bidRequest => {
      const params = bidRequest.params;
      const sizes = utils.parseSizesInput(bidRequest.sizes)[0];
      const width = sizes.split('x')[0];
      const height = sizes.split('x')[1];
      const placementId = params.placementId;
      const cb = Math.floor(Math.random() * 99999999999);
      const bidId = bidRequest.bidId;
      const referrer = (bidderRequest && bidderRequest.refererInfo) ? bidderRequest.refererInfo.referer : '';
      const payload = {
        v: 'hb1',
        p: placementId,
        w: width,
        h: height,
        cb: cb,
        r: referrer,
        uid: bidId,
        t: 'i',
        d: HOST_NAME,
      };
      return {
        method: 'POST',
        url: ENDPOINT_URL,
        data: payload,
      }
    });
  },
  interpretResponse: function(serverResponse, bidRequest) {
    const bidResponses = [];
    const response = serverResponse.body;
    const crid = response.creativeId || 0;
    const width = response.width || 0;
    const height = response.height || 0;
    let cpm = response.cpm || 0;
    if (width == 300 && height == 250) {
      cpm = cpm * 0.2;
    }
    if (width == 320 && height == 50) {
      cpm = cpm * 0.55;
    }
    if (cpm < 1) {
      return bidResponses;
    }
    if (width !== 0 && height !== 0 && cpm !== 0 && crid !== 0) {
      const dealId = response.dealid || '';
      const currency = response.currency || 'USD';
      const netRevenue = (response.netRevenue === undefined) ? true : response.netRevenue;
      const bidResponse = {
        requestId: bidRequest.data.uid,
        cpm: cpm,
        width: response.width,
        height: response.height,
        creativeId: crid,
        dealId: dealId,
        currency: currency,
        netRevenue: netRevenue,
        ttl: config.getConfig('_bidderTimeout'),
        referrer: bidRequest.data.r,
        ad: response.ad
      };
      bidResponses.push(bidResponse);
    }
    return bidResponses;
  }
}
registerBidder(spec);
