import { registerBidder } from "../src/adapters/bidderFactory.js";
import { ortbConverter } from "../libraries/ortbConverter/converter.js";
import { BANNER, NATIVE, VIDEO } from "../src/mediaTypes.js";
import { config } from "../src/config.js";
import { logError, logWarn } from "../src/utils.js";
import { getTimeZone } from "../libraries/timezone/timezone.js";

const BIDDER_CODE = "intenze";
const GVLID = 1457;
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

const getRegion = () => {
  try {
    const region = (getTimeZone() || "").split("/")[0];
    return exchangeSubdomainsRegions[region] ? region : DEFAULT_REGION;
  } catch (err) {
    return DEFAULT_REGION;
  }
};

export const buildEndpointURL = (params, region = getRegion()) => {
  if (params?.accountId) {
    const subdomain =
      exchangeSubdomainsRegions[region] ||
      exchangeSubdomainsRegions[DEFAULT_REGION];
    return `https://${subdomain}.intenze.co/?pass=${encodeURIComponent(params.accountId)}&integration=prebidjs`;
  }

  if (params?.placementId) {
    const subdomain =
      sspSubdomainsRegions[region] || sspSubdomainsRegions[DEFAULT_REGION];
    return `https://${subdomain}.intenze.co/pbjs-serve?placementId=${encodeURIComponent(params.placementId)}`;
  }

  return "";
};

const converter = ortbConverter({
  context: {
    netRevenue: true,
    ttl: 20,
  },
  imp(buildImp, bidRequest, context) {
    const imp = buildImp(bidRequest, context);

    if (imp.bidfloor == null && bidRequest.params.bidfloor != null) {
      imp.bidfloor = bidRequest.params.bidfloor;
      imp.bidfloorcur = bidRequest.params.currency || DEFAULT_CURRENCY;
    }

    const bidderParams = {};
    if (bidRequest.params.accountId) {
      bidderParams.accountId = bidRequest.params.accountId;
    }
    if (bidRequest.params.placementId) {
      bidderParams.placementId = bidRequest.params.placementId;
    }

    imp.ext = {
      ...imp.ext,
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
    if (!bidResponse.currency) {
      bidResponse.currency = context.ortbRequest?.cur?.[0] || DEFAULT_CURRENCY;
    }
    return bidResponse;
  },
});

export const spec = {
  code: BIDDER_CODE,
  gvlid: GVLID,
  supportedMediaTypes: [BANNER, VIDEO, NATIVE],

  isBidRequestValid: (bid) => {
    const { accountId, placementId } = bid?.params || {};

    if (accountId && placementId) {
      logWarn(
        `${BIDDER_CODE}: adUnit ${bid.adUnitCode}: accountId and placementId cannot be used together`,
      );
      return false;
    }

    if (!accountId && !placementId) {
      logWarn(
        `${BIDDER_CODE}: adUnit ${bid?.adUnitCode}: either accountId or placementId expected`,
      );
      return false;
    }

    return true;
  },

  buildRequests: (validBidRequests, bidderRequest) => {
    if (!validBidRequests?.length) return [];

    const region = getRegion();
    const requests = [];

    validBidRequests.forEach((bid) => {
      const url = buildEndpointURL(bid.params, region);
      if (!url) return;
      try {
        requests.push({
          method: "POST",
          url,
          data: converter.toORTB({ bidRequests: [bid], bidderRequest }),
        });
      } catch (err) {
        logError(
          `${BIDDER_CODE}: adUnit ${bid.adUnitCode}: failed to build request for ${url}`,
          err,
        );
      }
    });

    return requests;
  },

  interpretResponse: (response, request) => {
    if (!response?.body) return [];

    try {
      return (
        converter.fromORTB({
          response: response.body,
          request: request.data,
        })?.bids || []
      );
    } catch (err) {
      logError(`${BIDDER_CODE}: failed to interpret response`, err);
      return [];
    }
  },
};

registerBidder(spec);
