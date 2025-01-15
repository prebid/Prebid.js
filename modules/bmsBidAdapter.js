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

    return {
      method: "POST",
      url: ENDPOINT_URL,
      data: ortbRequest,
      options: {
        contentType: "application/json",
      },
    };
  },

  // Interpret OpenRTB responses using `ortbConverter`
  interpretResponse: function (serverResponse, bidRequest) {
    if (!serverResponse || !serverResponse.body) return [];
    const parsedSeatbid = serverResponse.body.seatbid.map((seatbidItem) => {
      const parsedBid = seatbidItem.bid.map((bidItem) => ({
        ...bidItem,
        adm: utils.replaceAuctionPrice(bidItem.adm, bidItem.price),
        nurl: utils.replaceAuctionPrice(bidItem.nurl, bidItem.price),
      }));
      return { ...seatbidItem, bid: parsedBid };
    });
    const responseBody = { ...serverResponse.body, seatbid: parsedSeatbid };
    return converter.fromORTB({
      response: responseBody,
      request: bidRequest.data,
    }).bids;
  },

  onBidWon: function (bid) {
    // eslint-disable-next-line no-console
    console.log("🚀 ~ bid:", bid);
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
