import { deepAccess, generateUUID, isArray, logWarn } from '../src/utils.js';
import { registerBidder } from '../src/adapters/bidderFactory.js';
// import { config } from 'src/config.js';
import { BANNER } from '../src/mediaTypes.js';
import { ortbConverter } from '../libraries/ortbConverter/converter.js'
// import { config } from '../src/config.js';

const BIDDER_CODE = 'brainx';
const METHOD = 'POST';
const TTL = 200;
const NET_REV = true;
let ENDPOINT = 'https://dsp.brainx.tech/bid'
// let ENDPOINT = 'http://adx-engine-gray.tec-do.cn/bid'

const converter = ortbConverter({
  context: {
    // `netRevenue` and `ttl` are required properties of bid responses - provide a default for them
    netRevenue: NET_REV, // or false if your adapter should set bidResponse.netRevenue = false
    ttl: TTL // default bidResponse.ttl (when not specified in ORTB response.seatbid[].bid[].exp)
  }
});

export const spec = {
  code: BIDDER_CODE,
  // gvlid: IAB_GVL_ID,
  // aliases: [
  //   { code: "myalias", gvlid: IAB_GVL_ID_IF_DIFFERENT }
  // ],
  isBidRequestValid: function (bid) {
    if (!(hasBanner(bid) || hasVideo(bid))) {
      logWarn('Invalid bid request - missing required mediaTypes');
      return false;
    }
    if (!(bid && bid.params)) {
      logWarn('Invalid bid request - missing required bid data');
      return false;
    }

    if (!(bid.params.pubId)) {
      logWarn('Invalid bid request - missing required field pubId');
      return false;
    }
    return true;
  },
  buildRequests(bidRequests, bidderRequest) {
    const data = converter.toORTB({ bidRequests, bidderRequest })
    ENDPOINT = String(deepAccess(bidRequests[0], 'params.endpoint')) ? deepAccess(bidRequests[0], 'params.endpoint') : ENDPOINT
    data.user = {
      buyeruid: generateUUID()
    }
    return {
      method: METHOD,
      url: `${ENDPOINT}?token=${String(deepAccess(bidRequests[0], 'params.pubId'))}`,
      data
    }
  },
  interpretResponse(response, request) {
    const bids = [];
    if (response.body && response.body.seatbid && isArray(response.body.seatbid)) {
      response.body.seatbid.forEach(function (bidder) {
        if (isArray(bidder.bid)) {
          bidder.bid.forEach((bid) => {
            const serverBody = response.body;
            // bidRequest = request.originalBidRequest,
            const mediaType = BANNER;
            const currency = serverBody.cur || 'USD'

            const cpm = (parseFloat(bid.price) || 0).toFixed(2);
            const categories = deepAccess(bid, 'cat', []);

            const bidRes = {
              ad: bid.adm,
              width: bid.w,
              height: bid.h,
              requestId: bid.impid,
              cpm: cpm,
              currency: currency,
              mediaType: mediaType,
              ttl: TTL,
              creativeId: bid.crid || bid.id,
              netRevenue: NET_REV,
              nurl: bid.nurl,
              lurl: bid.lurl,
              meta: {
                mediaType: mediaType,
                primaryCatId: categories[0],
                secondaryCatIds: categories.slice(1),
              }
            };
            if (bid.adomain && isArray(bid.adomain) && bid.adomain.length > 0) {
              bidRes.meta.advertiserDomains = bid.adomain;
              bidRes.meta.clickUrl = bid.adomain[0];
            }
            bids.push(bidRes);
          })
        }
      });
    }

    return bids;
  },
  // getUserSyncs: function (syncOptions, serverResponses, gdprConsent, uspConsent) { },
  // onTimeout: function (timeoutData) { },
  // onBidWon: function (bid) { },
  // onSetTargeting: function (bid) { },
  // onBidderError: function ({ error, bidderRequest }) { },
  // onAdRenderSucceeded: function (bid) { },
  supportedMediaTypes: [BANNER]
}
function hasBanner(bidRequest) {
  return !!deepAccess(bidRequest, 'mediaTypes.banner');
}
function hasVideo(bidRequest) {
  return !!deepAccess(bidRequest, 'mediaTypes.video');
}

registerBidder(spec);
