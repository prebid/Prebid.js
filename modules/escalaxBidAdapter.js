import { ortbConverter } from "../libraries/ortbConverter/converter.js";
import { registerBidder } from "../src/adapters/bidderFactory.js";
import { config } from "../src/config.js";
import { BANNER, NATIVE, VIDEO } from "../src/mediaTypes.js";
import { getTimeZone } from "../libraries/timezone/timezone.js";

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
  bidResponse.cur = "USD";
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
    const hasExchangeParams =
      Boolean(bid.params.sourceId) && Boolean(bid.params.accountId);
    const hasSspParams = Boolean(bid.params.supplyPlacementId);

    if (hasExchangeParams && hasSspParams) return false;
    return hasExchangeParams || hasSspParams;
  },

  buildRequests: (validBidRequests, bidderRequest) => {
    if (validBidRequests && validBidRequests.length === 0) return [];

    const firstBid = validBidRequests[0];
    let endpointURL;

    if (isSspBid(firstBid)) {
      const subdomain = getSspSubdomain();
      endpointURL = ESCALAX_SSP_URL.replace(
        ESCALAX_SUBDOMAIN_MACRO,
        subdomain || ESCALAX_DEFAULT_SSP_SUBDOMAIN,
      ).replace(
        ESCALAX_SUPPLY_PLACEMENT_ID_MACRO,
        firstBid.params.supplyPlacementId,
      );
    } else {
      const subdomain = getExchangeSubdomain();
      endpointURL = ESCALAX_EXCHANGE_URL.replace(
        ESCALAX_SUBDOMAIN_MACRO,
        subdomain || ESCALAX_DEFAULT_EXCHANGE_SUBDOMAIN,
      )
        .replace(ESCALAX_SOURCE_ID_MACRO, firstBid.params.sourceId)
        .replace(ESCALAX_ACCOUNT_ID_MACRO, firstBid.params.accountId);
    }

    const request = converter.toORTB({
      bidRequests: validBidRequests,
      bidderRequest,
    });
    return {
      method: "POST",
      url: endpointURL,
      data: request,
    };
  },

  interpretResponse: (response, request) => {
    if (response?.body) {
      const bids = converter.fromORTB({
        response: response.body,
        request: request.data,
      }).bids;
      return bids;
    }
    return [];
  },
};

registerBidder(spec);
