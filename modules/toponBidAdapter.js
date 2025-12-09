import { logWarn, generateUUID } from "../src/utils.js";
import { registerBidder } from "../src/adapters/bidderFactory.js";
import { BANNER } from "../src/mediaTypes.js";
import { ortbConverter } from "../libraries/ortbConverter/converter.js";

const PREBID_VERSION = "$prebid.version$";
const BIDDER_CODE = "topon";
const LOG_PREFIX = "TopOn";
const GVLID = 1305;
const ENDPOINT = "https://web-rtb.anyrtb.com/ortb/prebid";
const DEFAULT_TTL = 360;

const converter = ortbConverter({
  context: {
    netRevenue: true,
    ttl: DEFAULT_TTL,
    currency: "USD",
  },
  imp(buildImp, bidRequest, context) {
    const mediaType =
      bidRequest.mediaType || Object.keys(bidRequest.mediaTypes || {})[0];

    if (mediaType === "banner") {
      const sizes = bidRequest.mediaTypes.banner.sizes;
      return {
        id: bidRequest.bidId,
        banner: {
          format: sizes.map(([w, h]) => ({ w, h })),
        },
        tagid: bidRequest.adUnitCode,
      };
    }

    return null;
  },
  request(buildRequest, imps, bidderRequest, context) {
    const requestId =
      bidderRequest.bidderRequestId ||
      bidderRequest.auctionId ||
      generateUUID();
    const ortb2 = bidderRequest.ortb2 || {};

    return {
      id: requestId,
      imp: imps,
      site: {
        page: ortb2.site?.page || bidderRequest.refererInfo?.page,
        domain: ortb2.site?.domain || location.hostname,
      },
      device: ortb2.device || {},
      ext: {
        prebid: {
          channel: {
            version: PREBID_VERSION,
            source: "pbjs",
          },
        },
      },
      source: {
        ext: {
          prebid: 1,
        },
      },
    };
  },
  bidResponse(buildBidResponse, bid, context) {
    return buildBidResponse(bid, context);
  },
  response(buildResponse, bidResponses, ortbResponse, context) {
    return buildResponse(bidResponses, ortbResponse, context);
  },
  overrides: {
    imp: {
      bidfloor: false,
      extBidfloor: false,
    },
    bidResponse: {
      native: false,
    },
  },
});

export const spec = {
  code: BIDDER_CODE,
  gvlid: GVLID,
  supportedMediaTypes: [BANNER],
  isBidRequestValid: (bid) => {
    if (!(bid && bid.params)) {
      return false;
    }
    const { pubid } = bid.params || {};
    if (!pubid) {
      return false;
    } else if (typeof pubid !== "string") {
      return false;
    }
    return true;
  },
  buildRequests: (validBidRequests, bidderRequest) => {
    const { pubid } = bidderRequest?.bids?.[0]?.params || {};
    const ortbRequest = converter.toORTB({ validBidRequests, bidderRequest });

    const url = ENDPOINT + "?pubid=" + pubid;
    return {
      method: "POST",
      url,
      data: ortbRequest,
    };
  },
  interpretResponse: (response, request) => {
    if (!response.body || typeof response.body !== "object") {
      return;
    }

    const { id, seatbid: seatbids } = response.body;
    if (id && seatbids) {
      seatbids.forEach((seatbid) => {
        seatbid.bid.forEach((bid) => {
          let height = bid.h;
          let width = bid.w;
          const isBanner = bid.mtype === 1;
          if (
            (!height || !width) &&
            request.data &&
            request.data.imp &&
            request.data.imp.length > 0
          ) {
            request.data.imp.forEach((req) => {
              if (bid.impid === req.id) {
                if (isBanner) {
                  let bannerHeight = 1;
                  let bannerWidth = 1;
                  if (req.banner.format && req.banner.format.length > 0) {
                    bannerHeight = req.banner.format[0].h;
                    bannerWidth = req.banner.format[0].w;
                  }
                  height = bannerHeight;
                  width = bannerWidth;
                } else {
                  height = 1;
                  width = 1;
                }
              }
            });
            bid.w = width;
            bid.h = height;
          }
        });
      });
    }

    const { bids } = converter.fromORTB({
      response: response.body,
      request: request.data,
    });

    return bids;
  },
  getUserSyncs: (
    syncOptions,
    responses,
    gdprConsent,
    uspConsent,
    gppConsent
  ) => {},
  onBidWon: (bid) => {
    logWarn(`[${LOG_PREFIX}] Bid won: ${JSON.stringify(bid)}`);
  },
};
registerBidder(spec);
