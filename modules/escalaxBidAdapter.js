import { ortbConverter } from "../libraries/ortbConverter/converter.js";
import { registerBidder } from "../src/adapters/bidderFactory.js";
import { config } from "../src/config.js";
import { BANNER, NATIVE, VIDEO } from "../src/mediaTypes.js";
import { getTimeZone } from "../libraries/timezone/timezone.js";
import { logError, logWarn } from "../src/utils.js";

const BIDDER_CODE = "escalax";

const ESCALAX_SOURCE_ID_MACRO = "[sourceId]";
const ESCALAX_ACCOUNT_ID_MACRO = "[accountId]";
const ESCALAX_SUBDOMAIN_MACRO = "[subdomain]";
const ESCALAX_EXCHANGE_URL = `https://${ESCALAX_SUBDOMAIN_MACRO}.escalax.io/bid?type=pjs&partner=${ESCALAX_SOURCE_ID_MACRO}&token=${ESCALAX_ACCOUNT_ID_MACRO}`;

const ESCALAX_SUPPLY_PLACEMENT_ID_MACRO = "[supplyPlacementId]";
const ESCALAX_SSP_URL = `https://${ESCALAX_SUBDOMAIN_MACRO}.escalax.io/pbb?placementId=${ESCALAX_SUPPLY_PLACEMENT_ID_MACRO}`;

const ESCALAX_DEFAULT_CURRENCY = "USD";
const ESCALAX_DEFAULT_EXCHANGE_SUBDOMAIN = "bidder_us";
const ESCALAX_DEFAULT_SSP_SUBDOMAIN = "s-us";

function isSspBid(bid) {
  return Boolean(bid.params.supplyPlacementId);
}

function createImp(buildImp, bidRequest, context) {
  const imp = buildImp(bidRequest, context);

  imp.ext = isSspBid(bidRequest)
    ? {
        [BIDDER_CODE]: {
          supplyPlacementId: bidRequest.params.supplyPlacementId,
        },
      }
    : {
        [BIDDER_CODE]: {
          sourceId: bidRequest.params.sourceId,
          accountId: bidRequest.params.accountId,
        },
      };

  if (!imp.bidfloor) imp.bidfloor = bidRequest.params.bidfloor;
  return imp;
}

function createRequest(buildRequest, imps, bidderRequest, context) {
  const request = buildRequest(imps, bidderRequest, context);
  const bid = context.bidRequests[0];
  request.test = config.getConfig("debug") ? 1 : 0;
  if (!request.cur) {
    request.cur = [bid.params.currency || ESCALAX_DEFAULT_CURRENCY];
  }
  return request;
}

function createBidResponse(buildBidResponse, bid, context) {
  const bidResponse = buildBidResponse(bid, context);
  if (!bidResponse.currency) {
    bidResponse.currency =
      context.ortbRequest?.cur?.[0] || ESCALAX_DEFAULT_CURRENCY;
  }
  return bidResponse;
}

function getExchangeSubdomain() {
  const regionMap = {
    Europe: "bidder_eu",
    Africa: "bidder_eu",
    Atlantic: "bidder_eu",
    Arctic: "bidder_eu",
    Asia: "bidder_apac",
    Australia: "bidder_apac",
    Antarctica: "bidder_apac",
    Pacific: "bidder_apac",
    Indian: "bidder_apac",
    America: "bidder_us",
  };

  try {
    const region = getTimeZone().split("/")[0];
    return regionMap[region] || ESCALAX_DEFAULT_EXCHANGE_SUBDOMAIN;
  } catch (err) {
    return ESCALAX_DEFAULT_EXCHANGE_SUBDOMAIN;
  }
}

function getSspSubdomain() {
  const regionMap = {
    Europe: "s-eu",
    Africa: "s-eu",
    Atlantic: "s-eu",
    Arctic: "s-eu",
    Asia: "s-as",
    Australia: "s-as",
    Antarctica: "s-as",
    Pacific: "s-as",
    Indian: "s-as",
    America: "s-us",
  };

  try {
    const region = getTimeZone().split("/")[0];
    return regionMap[region] || ESCALAX_DEFAULT_SSP_SUBDOMAIN;
  } catch (err) {
    return ESCALAX_DEFAULT_SSP_SUBDOMAIN;
  }
}

function buildEndpointURL(bid) {
  if (isSspBid(bid)) {
    return ESCALAX_SSP_URL.replace(
      ESCALAX_SUBDOMAIN_MACRO,
      getSspSubdomain(),
    ).replace(
      ESCALAX_SUPPLY_PLACEMENT_ID_MACRO,
      encodeURIComponent(bid.params.supplyPlacementId),
    );
  }

  return ESCALAX_EXCHANGE_URL.replace(
    ESCALAX_SUBDOMAIN_MACRO,
    getExchangeSubdomain(),
  )
    .replace(ESCALAX_SOURCE_ID_MACRO, encodeURIComponent(bid.params.sourceId))
    .replace(
      ESCALAX_ACCOUNT_ID_MACRO,
      encodeURIComponent(bid.params.accountId),
    );
}

const converter = ortbConverter({
  context: {
    netRevenue: true,
    ttl: 20,
  },
  imp: createImp,
  request: createRequest,
  bidResponse: createBidResponse,
});

export const spec = {
  code: BIDDER_CODE,
  supportedMediaTypes: [BANNER, VIDEO, NATIVE],

  isBidRequestValid: (bid) => {
    const { sourceId, accountId, supplyPlacementId } = bid?.params || {};
    const hasAnyExchangeParam = Boolean(sourceId) || Boolean(accountId);
    const hasExchangeParams = Boolean(sourceId) && Boolean(accountId);
    const hasSspParams = Boolean(supplyPlacementId);

    if (hasAnyExchangeParam && hasSspParams) {
      logWarn(
        `${BIDDER_CODE}: adUnit ${bid?.adUnitCode}: provide either accountId and sourceId, or supplyPlacementId, not both`,
      );
      return false;
    }

    if (hasExchangeParams || hasSspParams) return true;

    logWarn(
      hasAnyExchangeParam
        ? `${BIDDER_CODE}: adUnit ${bid?.adUnitCode}: accountId and sourceId must be provided together`
        : `${BIDDER_CODE}: adUnit ${bid?.adUnitCode}: either accountId and sourceId, or supplyPlacementId is required`,
    );
    return false;
  },

  buildRequests: (validBidRequests, bidderRequest) => {
    if (!validBidRequests?.length) return [];

    const bidsByURL = new Map();
    validBidRequests.forEach((bid) => {
      const url = buildEndpointURL(bid);
      if (!bidsByURL.has(url)) bidsByURL.set(url, []);
      bidsByURL.get(url).push(bid);
    });

    const requests = [];
    bidsByURL.forEach((bids, url) => {
      try {
        requests.push({
          method: "POST",
          url,
          data: converter.toORTB({ bidRequests: bids, bidderRequest }),
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
