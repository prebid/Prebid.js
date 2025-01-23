import { ortbConverter } from "../libraries/ortbConverter/converter.js";
import { registerBidder } from "../src/adapters/bidderFactory.js";
import { BANNER } from "../src/mediaTypes.js";
import { getStorageManager } from "../src/storageManager.js";
import * as utils from "../src/utils.js";
const BIDDER_CODE = "bms";
const ENDPOINT_URL =
  "https://api.prebid.int.us-east-1.bluems.com/v1/bid?exchangeId=prebid";
const GVLID = 1105;
const COOKIE_NAME = "bmsCookieId";
const DEFAULT_CURRENCY = "USD";

export const storage = getStorageManager({ bidderCode: BIDDER_CODE });

function getBidFloor(bid) {
  if (utils.isFn(bid.getFloor)) {
    let floor = bid.getFloor({
      currency: DEFAULT_CURRENCY,
      mediaType: BANNER,
      size: "*",
    });
    if (
      utils.isPlainObject(floor) &&
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
    netRevenue: true, // Default net revenue configuration
    ttl: 100, // Default time-to-live for bid responses
  },
  imp,
  request,
});

function request(buildRequest, imps, bidderRequest, context) {
  let request = buildRequest(imps, bidderRequest, context);

  // Add publisher ID
  utils.deepSetValue(request, "site.publisher.id", context.publisherId);
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
  supportedMediaTypes: [BANNER], // Supported media types

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
    utils.deepSetValue(ortbRequest, "ext.gvlid", GVLID);

    if (storage.localStorageIsEnabled()) {
      // Include user cookie ID if available
      const ckid = storage.getDataFromLocalStorage(COOKIE_NAME) || null;
      if (ckid) {
        utils.deepSetValue(ortbRequest, "user.ext.buyerid", ckid);
      }
    }

    return [
      {
        method: "POST",
        url: ENDPOINT_URL,
        data: ortbRequest,
        options: {
          contentType: "application/json",
        },
      },
    ];
  },

  interpretResponse: (serverResponse, parseNative) => {
    if (!serverResponse || utils.isEmpty(serverResponse.body)) return [];

    let bids = [];
    serverResponse.body.seatbid.forEach((response) => {
      response.bid.forEach((bid) => {
        const mediaType = bid.ext?.mediaType || "banner";

        const bidObj = {
          requestId: bid.impid,
          cpm: bid.price,
          width: bid.w,
          height: bid.h,
          ttl: 1200,
          currency: serverResponse.body.cur || "USD",
          netRevenue: true,
          creativeId: bid.crid,
          dealId: bid.dealid || null,
          mediaType,
        };

        switch (mediaType) {
          case "native":
            bidObj.native = parseNative(bid.adm);
            break;
          default:
            bidObj.ad = bid.adm;
        }

        bids.push(bidObj);
      });
    });
    return bids;
  },

  onBidWon: function (bid) {
    const { burl, nurl } = bid || {};

    if (nurl) {
      utils.triggerPixel(
        utils.replaceAuctionPrice(nurl, bid.originalCpm || bid.cpm)
      );
    }

    if (burl) {
      utils.triggerPixel(
        utils.replaceAuctionPrice(burl, bid.originalCpm || bid.cpm)
      );
    }
  },
};

registerBidder(spec);
