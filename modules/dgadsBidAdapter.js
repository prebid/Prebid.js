import {registerBidder} from 'src/adapters/bidderFactory';
import * as utils from 'src/utils';
import { BANNER, NATIVE } from 'src/mediaTypes';

const BIDDER_CODE = 'dgads';
const UID_NAME = 'dgads_uid';
const ENDPOINT = 'https://ads-tr.bigmining.com/ad/p/bid';

export const spec = {
  code: BIDDER_CODE,
  supportedMediaTypes: [ BANNER, NATIVE ],
  isBidRequestValid: function(bid) {
    const params = bid.params;
    if (!/^\d+$/.test(params.location_id)) {
      return false;
    }
    if (!/^\d+$/.test(params.site_id)) {
      return false;
    }
    return true;
  },
  buildRequests: function(bidRequests) {
    if (bidRequests.length === 0) {
      return {};
    }

    return bidRequests.map(bidRequest => {
      const params = bidRequest.params;
      const data = {};

      data['_loc'] = params.location_id;
      data['_medium'] = params.site_id;
      data['transaction_id'] = bidRequest.transactionId;
      data['bid_id'] = bidRequest.bidId;
      data['referer'] = utils.getTopWindowUrl();
      data['_uid'] = getCookieUid(UID_NAME);

      return {
        method: 'GET',
        url: ENDPOINT,
        data,
      };
    });
  },
  interpretResponse: function(serverResponse, bidRequest) {
    const bidResponses = [];
    const responseObj = serverResponse.body;
    const ads = responseObj.bids;
    let bidResponse = {};
    if (utils.isEmpty(ads)) {
      return [];
    }
    utils._each(ads, function(ad) {
      bidResponse.requestId = ad.bidId;
      bidResponse.bidderCode = BIDDER_CODE;
      bidResponse.cpm = ad.cpm;
      bidResponse.creativeId = ad.creativeId;
      bidResponse.currency = 'JPY';
      bidResponse.netRevenue = true;
      bidResponse.ttl = ad.ttl;
      bidResponse.referrer = utils.getTopWindowUrl();
      if (ad.isNative == 1) {
        bidResponse.mediaType = NATIVE;
        bidResponse.native = setNativeResponse(ad);
      } else {
        bidResponse.width = parseInt(ad.w);
        bidResponse.height = parseInt(ad.h);
        bidResponse.ad = ad.ad;
      }
      bidResponses.push(bidResponse);
    });
    return bidResponses;
  }
};
function setNativeResponse(ad) {
  let nativeResponce = {};
  nativeResponce.image = {
    url: ad.image,
    width: parseInt(ad.w),
    height: parseInt(ad.h)
  }
  nativeResponce.title = ad.title;
  nativeResponce.body = ad.desc;
  nativeResponce.sponsoredBy = ad.sponsoredBy;
  nativeResponce.clickUrl = ad.clickUrl;
  nativeResponce.clickTrackers = ad.clickTrackers || [];
  nativeResponce.impressionTrackers = ad.impressionTrackers || [];
  return nativeResponce;
}
export function getCookieUid(uidName) {
  if (utils.cookiesAreEnabled()) {
    let cookies = document.cookie.split(';');
    for (let i = 0; i < cookies.length; i++) {
      let value = cookies[i].split('=');
      if (value[0].indexOf(uidName) > -1) {
        return value[1];
      }
    }
  }
  return '';
}

registerBidder(spec);
