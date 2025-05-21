import {deepAccess, isEmpty, deepSetValue, isStr, logWarn} from '../src/utils.js';
import {registerBidder} from '../src/adapters/bidderFactory.js';
import {BANNER, VIDEO} from "../src/mediaTypes.js";
import {ortbConverter} from '../libraries/ortbConverter/converter.js';

const BIDDER_CODE = 'tadvertising';
const GVL_ID = 213;
const ENDPOINT_URL = 'https://prebid.tads.xplosion.de/bid';
const BID_TTL = 360;

const MEDIA_TYPES = {
  [BANNER]: 1,
  [VIDEO]: 2,
};

const converter = ortbConverter({
  bidResponse: (buildBidResponse, bid, context) => {
    let mediaType = BANNER;
    if (bid.adm && bid.adm.startsWith('<VAST')) {
      mediaType = VIDEO;
    }
    bid.mtype = MEDIA_TYPES[mediaType];

    return buildBidResponse(bid, context);
  },
});

export const spec = {
  code: BIDDER_CODE,
  gvlid: GVL_ID,
  supportedMediaTypes: [BANNER, VIDEO],

  isBidRequestValid: function (bid) {
    if (!bid.params.publisherId) {
      logWarn(BIDDER_CODE + ': Missing required parameter params.publisherId');
      return false;
    }
    if (bid.params.publisherId.length > 32) {
      logWarn(BIDDER_CODE + ': params.publisherId must be 32 characters or less');
      return false;
    }
    if (!bid.params.placementId) {
      logWarn(BIDDER_CODE + ': Missing required parameter params.placementId');
      return false;
    }
    return true;
  },


  buildRequests: function (validBidRequests, bidderRequest) {
    let data = converter.toORTB({validBidRequests, bidderRequest})
    deepSetValue(data, 'site.publisher.id', bidderRequest.bids[0].params.publisherId)
    deepSetValue(data, 'imp.0.ext.gpid', bidderRequest.bids[0].params.placementId)

    if (isStr(deepAccess(bidderRequest, 'bids.0.userId.tdid'))) {
      data.user = data.user || {};
      data.user.buyeruid = bidderRequest.bids[0].userId.tdid;
    }

    return {
      method: 'POST',
      url: ENDPOINT_URL,
      data: data,
    };
  },


  interpretResponse: function (response, serverRequest) {
    if (isEmpty(response.body)) {
      return [];
    }

    deepSetValue(response, 'body.impid', deepAccess(serverRequest, 'data.imp.0.id')) // TODO: Remove before flight (launch)
    deepSetValue(response, 'body.seatbid.0.bid.0.impid', deepAccess(serverRequest, 'data.imp.0.id')) // TODO: Remove before flight (launch)

    const bids = converter.fromORTB({response: response.body, request: serverRequest.data}).bids;

    bids.forEach(bid => {
      bid.ttl = BID_TTL;
      bid.netRevenue = true;
      bid.currency = bid.currency || 'USD';
      bid.dealId = bid.dealId || null;
    })

    return bids;
  }
}

registerBidder(spec);
