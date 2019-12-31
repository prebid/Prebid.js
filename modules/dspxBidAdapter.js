import * as utils from '../src/utils';
import {config} from '../src/config';
import {registerBidder} from '../src/adapters/bidderFactory';

const BIDDER_CODE = 'dspx';
const ENDPOINT_URL = 'https://buyer.dspx.tv/request/';

export const spec = {
  code: BIDDER_CODE,
  aliases: ['dspx'],
  isBidRequestValid: function(bid) {
    return !!(bid.params.placement);
  },
  buildRequests: function(validBidRequests, bidderRequest) {
    return validBidRequests.map(bidRequest => {
      const params = bidRequest.params;
      const sizes = utils.parseSizesInput(bidRequest.sizes)[0];
      const width = sizes.split('x')[0];
      const height = sizes.split('x')[1];
      const placementId = params.placement;

      const rnd = Math.floor(Math.random() * 99999999999);
      const referrer = bidderRequest.refererInfo.referer;
      const bidId = bidRequest.bidId;
      const payload = {
        _f: 'html',
        alternative: 'prebid_js',
        inventory_item_id: placementId,
        srw: width,
        srh: height,
        idt: 100,
        rnd: rnd,
        ref: referrer,
        bid_id: bidId,
      };
      if (params.pfilter !== undefined) {
        payload.pfilter = params.pfilter;
      }
      if (params.bcat !== undefined) {
        payload.bcat = params.bcat;
      }
      if (params.dvt !== undefined) {
        payload.dvt = params.dvt;
      }
      return {
        method: 'GET',
        url: ENDPOINT_URL,
        data: objectToQueryString(payload),
      }
    });
  },
  interpretResponse: function(serverResponse, bidRequest) {
    const bidResponses = [];
    const response = serverResponse.body;
    const crid = response.crid || 0;
    const cpm = response.cpm / 1000000 || 0;
    if (cpm !== 0 && crid !== 0) {
      const dealId = response.dealid || '';
      const currency = response.currency || 'EUR';
      const netRevenue = (response.netRevenue === undefined) ? true : response.netRevenue;
      const referrer = utils.getTopWindowUrl();
      const bidResponse = {
        requestId: response.bid_id,
        cpm: cpm,
        width: response.width,
        height: response.height,
        creativeId: crid,
        dealId: dealId,
        currency: currency,
        netRevenue: netRevenue,
        ttl: config.getConfig('_bidderTimeout'),
        referrer: referrer,
        ad: response.adTag
      };
      bidResponses.push(bidResponse);
    }
    return bidResponses;
  }
}

function objectToQueryString(obj, prefix) {
  let str = [];
  let p;
  for (p in obj) {
    if (obj.hasOwnProperty(p)) {
      let k = prefix ? prefix + '[' + p + ']' : p;
      let v = obj[p];
      str.push((v !== null && typeof v === 'object')
        ? objectToQueryString(v, k)
        : encodeURIComponent(k) + '=' + encodeURIComponent(v));
    }
  }
  return str.join('&');
}

registerBidder(spec);
