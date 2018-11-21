import * as utils from 'src/utils';
import {config} from 'src/config';
import {registerBidder} from 'src/adapters/bidderFactory';
import { BANNER, VIDEO } from 'src/mediaTypes';

const BIDDER_CODE = 'yieldone';
const ENDPOINT_URL = '//y.one.impact-ad.jp/h_bid';
const USER_SYNC_URL = '//y.one.impact-ad.jp/push_sync';

export const spec = {
  code: BIDDER_CODE,
  aliases: ['y1'],
  supportedMediaTypes: [BANNER, VIDEO],
  isBidRequestValid: function(bid) {
    return !!(bid.params.placementId);
  },
  buildRequests: function(validBidRequests) {
    return validBidRequests.map(bidRequest => {
      const params = bidRequest.params;
      const placementId = params.placementId;
      const cb = Math.floor(Math.random() * 99999999999);
      const referrer = encodeURIComponent(utils.getTopWindowUrl());
      const bidId = bidRequest.bidId;
      const payload = {
        v: 'hb1',
        p: placementId,
        cb: cb,
        r: referrer,
        uid: bidId,
        t: 'i'
      };

      const videoMediaType = utils.deepAccess(bidRequest, 'mediaTypes.video');
      if (bidRequest.mediaType === VIDEO || videoMediaType) {
        const sizes = utils.deepAccess(bidRequest, 'mediaTypes.video.playerSize') || bidRequest.sizes;
        const size = utils.parseSizesInput(sizes)[0];
        payload.w = size.split('x')[0];
        payload.h = size.split('x')[1];
      } else if ((utils.isEmpty(bidRequest.mediaType) && utils.isEmpty(bidRequest.mediaTypes)) ||
      (bidRequest.mediaType === BANNER || (bidRequest.mediaTypes && bidRequest.mediaTypes[BANNER]))) {
        const sizes = utils.deepAccess(bidRequest, 'mediaTypes.banner.sizes') || bidRequest.sizes;
        payload.sz = utils.parseSizesInput(sizes).join(',');
      }

      return {
        method: 'GET',
        url: ENDPOINT_URL,
        data: payload,
      }
    });
  },
  interpretResponse: function(serverResponse, bidRequest) {
    const bidResponses = [];
    const response = serverResponse.body;
    const crid = response.crid || 0;
    const width = response.width || 0;
    const height = response.height || 0;
    const cpm = response.cpm * 1000 || 0;
    if (width !== 0 && height !== 0 && cpm !== 0 && crid !== 0) {
      const dealId = response.dealId || '';
      const currency = response.currency || 'JPY';
      const netRevenue = (response.netRevenue === undefined) ? true : response.netRevenue;
      const referrer = utils.getTopWindowUrl();
      const bidResponse = {
        requestId: response.uid,
        cpm: cpm,
        width: response.width,
        height: response.height,
        creativeId: crid,
        dealId: dealId,
        currency: currency,
        netRevenue: netRevenue,
        ttl: config.getConfig('_bidderTimeout'),
        referrer: referrer
      };

      if (response.adTag) {
        bidResponse.mediaType = BANNER;
        bidResponse.ad = response.adTag;
      } else if (response.adm) {
        bidResponse.mediaType = VIDEO;
        bidResponse.vastXml = response.adm;
      }

      bidResponses.push(bidResponse);
    }
    return bidResponses;
  },
  getUserSyncs: function(syncOptions) {
    if (syncOptions.iframeEnabled) {
      return [{
        type: 'iframe',
        url: USER_SYNC_URL
      }];
    }
  }
}
registerBidder(spec);
