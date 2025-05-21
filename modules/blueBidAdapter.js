import { ortbConverter } from '../libraries/ortbConverter/converter.js';
import { registerBidder } from '../src/adapters/bidderFactory.js';
import { BANNER } from '../src/mediaTypes.js';
import { getStorageManager } from '../src/storageManager.js';
import {
  replaceAuctionPrice,
  isFn,
  isPlainObject,
  deepSetValue,
  isEmpty,
  triggerPixel,
} from '../src/utils.js';
const BIDDER_CODE = 'blue';
const ENDPOINT_URL = 'https://bidder-us-east-1.getblue.io/engine/?src=prebid';
const GVLID = 620;
const DEFAULT_CURRENCY = 'USD';

export const storage = getStorageManager({ bidderCode: BIDDER_CODE });

function getBidFloor(bid) {
  if (isFn(bid.getFloor)) {
    let floor = bid.getFloor({
      currency: DEFAULT_CURRENCY,
      mediaType: BANNER,
      size: '*',
    });
    if (
      isPlainObject(floor) &&
      !isNaN(floor.floor) &&
      floor.currency === DEFAULT_CURRENCY
    ) {
      return floor.floor;
    }
  }
  return null;
}

const converter = ortbConverter({
  context: {
    netRevenue: true, // Default netRevenue setting
    ttl: 100, // Default time-to-live for bid responses
  },
  imp,
  request,
});

function request(buildRequest, imps, bidderRequest, context) {
  let request = buildRequest(imps, bidderRequest, context);
  deepSetValue(request, 'site.publisher.id', context.publisherId);
  return request;
}

function imp(buildImp, bidRequest, context) {
  let imp = buildImp(bidRequest, context);
  const floor = getBidFloor(bidRequest);
  imp.tagid = bidRequest.params.placementId;

  if (floor) {
    imp.bidfloor = floor;
    imp.bidfloorcur = DEFAULT_CURRENCY;
  }

  return imp;
}

export const spec = {
  code: BIDDER_CODE,
  gvlid: GVLID,
  supportedMediaTypes: [BANNER],

  // Validate bid request
  isBidRequestValid: function (bid) {
    return !!bid.params.placementId && !!bid.params.publisherId;
  },

  // Build OpenRTB requests using `ortbConverter`
  buildRequests: function (validBidRequests, bidderRequest) {
    const context = {
      publisherId: validBidRequests.find(
        (bidRequest) => bidRequest.params?.publisherId
      )?.params.publisherId,
    };

    const ortbRequest = converter.toORTB({
      bidRequests: validBidRequests,
      bidderRequest,
      context,
    });

    // Add extensions to the request
    ortbRequest.ext = ortbRequest.ext || {};
    deepSetValue(ortbRequest, 'ext.gvlid', GVLID);

    return [
      {
        method: 'POST',
        url: ENDPOINT_URL,
        data: ortbRequest,
        options: {
          contentType: 'application/json',
        },
      },
    ];
  },

  interpretResponse: (serverResponse) => {
    if (!serverResponse || isEmpty(serverResponse.body)) return [];

    let bids = [];
    serverResponse.body.seatbid.forEach((response) => {
      response.bid.forEach((bid) => {
        const mediaType = bid.ext?.mediaType || 'banner';
        bids.push({
          ad: replaceAuctionPrice(bid.adm, bid.price),
          adapterCode: BIDDER_CODE,
          cpm: bid.price,
          creativeId: bid.ext.blue.adId,
          creative_id: bid.ext.blue.adId,
          currency: serverResponse.body.cur || 'USD',
          deferBilling: false,
          deferRendering: false,
          width: bid.w,
          height: bid.h,
          mediaType,
          netRevenue: true,
          originalCpm: bid.price,
          originalCurrency: serverResponse.body.cur || 'USD',
          requestId: bid.impid,
          seatBidId: bid.id,
          ttl: 1200,
        });
      });
    });
    return bids;
  },

  onBidWon: function (bid) {
    const { burl, nurl } = bid || {};

    if (nurl) {
      triggerPixel(replaceAuctionPrice(nurl, bid.originalCpm || bid.cpm));
    }

    if (burl) {
      triggerPixel(replaceAuctionPrice(burl, bid.originalCpm || bid.cpm));
    }
  },
};

registerBidder(spec);
