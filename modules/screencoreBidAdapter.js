import { registerBidder } from "../src/adapters/bidderFactory.js";
import { BANNER, NATIVE, VIDEO } from "../src/mediaTypes.js";
import { ortbConverter } from "../libraries/ortbConverter/converter.js";
import { getTimeZone } from "../libraries/timezone/timezone.js";
import { config } from "../src/config.js";
import { logError, logWarn } from "../src/utils.js";

const DEFAULT_CURRENCY = "USD";
const BIDDER_CODE = "screencore";
const GVLID = 1473;
const BIDDER_VERSION = "2.0.0";

const SSP_REGION_SUBDOMAIN_SUFFIX = {
  US: "ssp-us",
  EU: "ssp-eu",
  APAC: "ssp-asia",
};

/**
 * @return {string}
 */
function getRegionSubdomainSuffix() {
  try {
    const tz = getTimeZone();
    const region = tz.split("/")[0];

    switch (region) {
      case "Asia":
      case "Australia":
      case "Antarctica":
      case "Pacific":
      case "Indian":
        return SSP_REGION_SUBDOMAIN_SUFFIX["APAC"];
      case "Europe":
      case "Africa":
      case "Atlantic":
      case "Arctic":
        return SSP_REGION_SUBDOMAIN_SUFFIX["EU"];
      case "America":
      case "US":
      case "Canada":
      default:
        return SSP_REGION_SUBDOMAIN_SUFFIX["US"];
    }
  } catch (err) {
    return SSP_REGION_SUBDOMAIN_SUFFIX["US"];
  }
}

/**
 * @param { { sspPlacementId?: string; } } params
 * @returns { string | undefined }
 */
export const createEndpoint = (params) => {
  if (!params?.sspPlacementId) return undefined;

  const subdomain = getRegionSubdomainSuffix();
  return `https://${subdomain}.screencore.io/pbjs-bid?pId=${encodeURIComponent(params.sspPlacementId)}`;
};

const sspConverter = ortbConverter({
  context: {
    netRevenue: true,
    ttl: 20,
  },
  imp(buildImp, bidRequest, context) {
    const imp = buildImp(bidRequest, context);
    if (!imp.bidfloor) {
      imp.bidfloor = bidRequest.params.bidfloor || 0;
    }

    imp.ext = {
      [BIDDER_CODE]: {
        sspPlacementId: bidRequest.params.sspPlacementId,
      },
    };
    return imp;
  },
  request(buildRequest, imps, bidderRequest, context) {
    const request = buildRequest(imps, bidderRequest, context);
    const bid = context.bidRequests[0];
    request.test = config.getConfig("debug") ? 1 : 0;
    if (!request.cur) request.cur = [bid.params.currency || DEFAULT_CURRENCY];
    return request;
  },
  bidResponse(buildBidResponse, bid, context) {
    const bidResponse = buildBidResponse(bid, context);
    if (!bidResponse.currency) {
      bidResponse.currency = context.ortbRequest?.cur?.[0] || DEFAULT_CURRENCY;
    }
    return bidResponse;
  },
});

export const spec = {
  code: BIDDER_CODE,
  version: BIDDER_VERSION,
  gvlid: GVLID,
  supportedMediaTypes: [BANNER, VIDEO, NATIVE],

  isBidRequestValid: (bid) => {
    if (!bid?.params?.sspPlacementId) {
      logWarn(
        `${BIDDER_CODE}: adUnit ${bid?.adUnitCode}: sspPlacementId is required`,
      );
      return false;
    }
    return true;
  },

  buildRequests: (validBidRequests = [], bidderRequest = {}) => {
    if (!validBidRequests.length) return [];

    const bidsByURL = new Map();
    validBidRequests.forEach((bid) => {
      const url = createEndpoint(bid.params);
      if (!url) return;
      if (!bidsByURL.has(url)) bidsByURL.set(url, []);
      bidsByURL.get(url).push(bid);
    });

    const requests = [];
    bidsByURL.forEach((bids, url) => {
      try {
        requests.push({
          method: "POST",
          url,
          data: sspConverter.toORTB({ bidRequests: bids, bidderRequest }),
        });
      } catch (err) {
        logError(`${BIDDER_CODE}: failed to build request for ${url}`, err);
      }
    });

    return requests;
  },

  interpretResponse: (response, request) => {
    if (!response?.body) return [];

    try {
      return (
        sspConverter.fromORTB({
          response: response.body,
          request: request.data,
        })?.bids || []
      );
    } catch (err) {
      logError(`${BIDDER_CODE}: failed to interpret response`, err);
      return [];
    }
  },

  getUserSyncs: () => [],
};

registerBidder(spec);
