import { registerBidder } from "../src/adapters/bidderFactory.js";
import { BANNER } from "../src/mediaTypes.js";
import {
  generateUUID,
  getWinDimensions,
  mergeDeep,
  replaceAuctionPrice,
  triggerPixel,
} from "../src/utils.js";
import { getBoundingClientRect } from "../libraries/boundingClientRect/boundingClientRect.js";
import {
  getWalletPresence,
  getWalletProviderFlags,
} from "../libraries/hypelabUtils/hypelabUtils.js";
import { ortbConverter } from "../libraries/ortbConverter/converter.js";

export const BIDDER_CODE = "hypelab";
export const ENDPOINT_URL = "https://api.hypelab.com/v1/rtb_requests";

const PREBID_VERSION = "$prebid.version$";
const PROVIDER_VERSION = "0.0.4";

const converter = ortbConverter({
  context: {
    netRevenue: true,
    ttl: 360,
    mediaType: BANNER,
  },
  imp(buildImp, bidRequest, context) {
    const imp = buildImp(bidRequest, context);
    mergeDeep(imp, {
      ext: {
        bidder: {
          property_slug: bidRequest.params.property_slug,
          placement_slug: bidRequest.params.placement_slug,
          pp: getPosition(bidRequest.adUnitCode),
        },
      },
    });
    return imp;
  },
  request(buildRequest, imps, bidderRequest, context) {
    const request = buildRequest(imps, bidderRequest, context);
    request.at = 1;
    if (!request.cur) request.cur = ["USD"];

    const userId = getUserId(context.bidRequests);

    mergeDeep(request, {
      ext: {
        source: "prebid",
        sdk_version: PREBID_VERSION,
        provider_version: PROVIDER_VERSION,
        dpr: typeof window !== "undefined" ? window.devicePixelRatio : 1,
        vp: getViewport(),
      },
      user: {
        buyeruid: userId,
        id: userId,
        ext: {
          wids: [],
          wp: getWalletPresence(),
          wpfs: getWalletProviderFlags(),
        },
      },
    });

    return request;
  },
});

function isBidRequestValid(bidRequest) {
  return (
    !!bidRequest.params?.property_slug && !!bidRequest.params?.placement_slug
  );
}

function buildRequests(bidRequests, bidderRequest) {
  return bidRequests.map((bidRequest) => ({
    method: "POST",
    url: ENDPOINT_URL,
    data: converter.toORTB({ bidRequests: [bidRequest], bidderRequest }),
    options: { contentType: "application/json", withCredentials: true },
  }));
}

function interpretResponse(response, request) {
  if (!response.body) return [];
  const result = converter.fromORTB({
    request: request.data,
    response: response.body,
  });
  return result.bids || [];
}

function onBidWon(bid) {
  if (bid.burl) {
    triggerPixel(replaceAuctionPrice(bid.burl, bid.originalCpm || bid.cpm));
  }
}

function getPosition(adUnitCode) {
  const element = document.getElementById(adUnitCode);
  if (!element) return null;
  const rect = getBoundingClientRect(element);
  return [rect.left, rect.top];
}

function getUserId(bidRequests) {
  const eids = bidRequests?.[0]?.userIdAsEids || [];
  const uids = eids.flatMap((eid) => eid.uids.map((uid) => uid.id));
  return uids[0] || "tmp_" + generateUUID();
}

function getViewport() {
  const win = getWinDimensions();
  return [
    Math.max(
      win?.document.documentElement.clientWidth || 0,
      win?.innerWidth || 0
    ),
    Math.max(
      win?.document.documentElement.clientHeight || 0,
      win?.innerHeight || 0
    ),
  ];
}

export const spec = {
  code: BIDDER_CODE,
  supportedMediaTypes: [BANNER],
  aliases: ["hype"],
  isBidRequestValid,
  buildRequests,
  interpretResponse,
  onBidWon,
};

registerBidder(spec);
