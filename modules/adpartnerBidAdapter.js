import {registerBidder} from '../src/adapters/bidderFactory.js';
import * as utils from '../src/utils.js'
import {ajax} from '../src/ajax.js';

const BIDDER_CODE = 'adpartner';
export const ENDPOINT_PROTOCOL = 'https';
export const ENDPOINT_DOMAIN = 'a4p.adpartner.pro';
export const ENDPOINT_PATH = '/hb/bid';

export const spec = {
  code: BIDDER_CODE,

  isBidRequestValid: function (bidRequest) {
    return !!parseInt(bidRequest.params.unitId);
  },

  buildRequests: function (validBidRequests, bidderRequest) {
    let referer = window.location.href;
    try {
      referer = typeof bidderRequest.refererInfo === 'undefined'
        ? window.top.location.href
        : bidderRequest.refererInfo.referer;
    } catch (e) {}

    let bidRequests = [];
    let beaconParams = {
      tag: [],
      sizes: [],
      referer: ''
    };

    validBidRequests.forEach(function(validBidRequest) {
      bidRequests.push({
        unitId: parseInt(validBidRequest.params.unitId),
        adUnitCode: validBidRequest.adUnitCode,
        sizes: validBidRequest.sizes,
        bidId: validBidRequest.bidId,
        referer: referer
      });

      beaconParams.tag.push(validBidRequest.params.unitId);
      beaconParams.sizes.push(spec.joinSizesToString(validBidRequest.sizes));
      beaconParams.referer = encodeURIComponent(referer);
    });

    beaconParams.tag = beaconParams.tag.join(',');
    beaconParams.sizes = beaconParams.sizes.join(',');

    let adPartnerRequestUrl = utils.buildUrl({
      protocol: ENDPOINT_PROTOCOL,
      hostname: ENDPOINT_DOMAIN,
      pathname: ENDPOINT_PATH,
      search: beaconParams
    });

    return {
      method: 'POST',
      url: adPartnerRequestUrl,
      data: JSON.stringify(bidRequests)
    };
  },

  joinSizesToString: function(sizes) {
    let res = [];
    sizes.forEach(function(size) {
      res.push(size.join('x'));
    });

    return res.join('|');
  },

  interpretResponse: function (serverResponse, bidRequest) {
    const validBids = JSON.parse(bidRequest.data);

    if (typeof serverResponse.body === 'undefined') {
      return [];
    }

    return validBids
      .map(bid => ({
        bid: bid,
        ad: serverResponse.body[bid.adUnitCode]
      }))
      .filter(item => item.ad)
      .map(item => spec.adResponse(item.bid, item.ad));
  },

  adResponse: function(bid, ad) {
    return {
      requestId: bid.bidId,
      ad: ad.ad,
      cpm: ad.cpm,
      width: ad.width,
      height: ad.height,
      ttl: 60,
      creativeId: ad.creativeId,
      netRevenue: ad.netRevenue,
      currency: ad.currency,
      winNotification: ad.winNotification
    };
  },

  onBidWon: function(data) {
    data.winNotification.forEach(function(unitWon) {
      let adPartnerBidWonUrl = utils.buildUrl({
        protocol: ENDPOINT_PROTOCOL,
        hostname: ENDPOINT_DOMAIN,
        pathname: unitWon.path
      });

      if (unitWon.method === 'POST') {
        spec.postRequest(adPartnerBidWonUrl, JSON.stringify(unitWon.data));
      }
    });

    return true;
  },

  postRequest(endpoint, data) {
    ajax(endpoint, null, data, {method: 'POST'});
  }
}

registerBidder(spec);
