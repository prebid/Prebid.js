import { registerBidder } from "../src/adapters/bidderFactory.js";
import { ortbConverter } from "../libraries/ortbConverter/converter.js";
import { BANNER, NATIVE, VIDEO } from "../src/mediaTypes.js";
import { config } from "../src/config.js";
import { getTimeZone } from "../libraries/timezone/timezone.js";

const BIDDER_CODE = "intenze";
const DEFAULT_CURRENCY = "USD";
const DEFAULT_REGION = "America";

const exchangeSubdomainsRegions = {
  America: "lb-east",
  Europe: "n2",
  Asia: "lb-apac",
};
const sspSubdomainsRegions = {
  America: "us-east-ssp",
  Europe: "eu-ssp",
  Asia: "apac-ssp",
};

/**
 * @param { { accountId?: string; placementId?: string } } params
 *
 * @returns { string }
 */
const buildEndpointURL = (params) => {
  let endpoint = "";
  const timezone = getTimeZone() || "";
  const region = timezone.split("/")[0] || DEFAULT_REGION;

  if (params?.accountId) {
    const subdomain =
      exchangeSubdomainsRegions[region] ||
      exchangeSubdomainsRegions[DEFAULT_REGION];
    endpoint = `https://${subdomain}.intenze.co/?pass=${params.accountId}&integration=prebidjs`;
  } else if (params?.placementId) {
    const subdomain =
      sspSubdomainsRegions[region] || sspSubdomainsRegions[DEFAULT_REGION];
    endpoint = `https://${subdomain}.intenze.co/pbjs-serve?placementId=${params.placementId}`;
  }

  return endpoint;
};

const converter = ortbConverter({
  context: {
    netRevenue: true,
    ttl: 20,
  },
  imp(buildImp, bidRequest, context) {
    const imp = buildImp(bidRequest, context);
    if (!imp.bidfloor) {
      imp.bidfloor = bidRequest.params.bidfloor || 0;
    }

    const bidderParams = {};

    if (bidRequest?.params?.accountId) {
      bidderParams.accountId = bidRequest.params.accountId;
    }

    if (bidRequest?.params?.placementId) {
      bidderParams.placementId = bidRequest.params.placementId;
    }

    imp.ext = {
      [BIDDER_CODE]: bidderParams,
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
    bidResponse.cur = bid.cur || DEFAULT_CURRENCY;
    return bidResponse;
  },
});

export const spec = {
  code: BIDDER_CODE,
  supportedMediaTypes: [BANNER, VIDEO, NATIVE],

  isBidRequestValid: (bid) => {
    return Boolean(bid.params?.accountId) || Boolean(bid.params?.placementId);
  },

  buildRequests: (validBidRequests, bidderRequest) => {
    if (validBidRequests && validBidRequests.length === 0) return [];

    const endpointURL = buildEndpointURL(validBidRequests[0].params);
    if (!endpointURL) return [];

    try {
      const request = converter.toORTB({
        bidRequests: validBidRequests,
        bidderRequest,
      });

      return {
        method: "POST",
        url: endpointURL,
        data: request,
      };
    } catch (error) {
      return [];
    }
  },

  interpretResponse: (response, request) => {
    if (response?.body) {
      try {
        const bids = converter.fromORTB({
          response: response.body,
          request: request.data,
        })?.bids;
        return bids;
      } catch (err) {}
    }
    return [];
  },
};

registerBidder(spec);
