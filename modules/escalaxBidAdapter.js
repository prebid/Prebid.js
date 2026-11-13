import { ortbConverter } from "../libraries/ortbConverter/converter.js";
import { registerBidder } from "../src/adapters/bidderFactory.js";
import { config } from "../src/config.js";
import { BANNER, NATIVE, VIDEO } from "../src/mediaTypes.js";
import { getTimeZone } from "../libraries/timezone/timezone.js";
import { logError, logWarn } from "../src/utils.js";

/**
 * @typedef {import('./escalaxBidAdapter.d.ts').EscalaxBidderParams} EscalaxBidderParams
 * @typedef {{ exchange: string, ssp: string }} EscalaxSubdomains
 */

const BIDDER_CODE = "escalax";
const GVLID = 1435;

const ESCALAX_SOURCE_ID_MACRO = "[sourceId]";
const ESCALAX_ACCOUNT_ID_MACRO = "[accountId]";
const ESCALAX_SUBDOMAIN_MACRO = "[subdomain]";
const ESCALAX_EXCHANGE_URL = `https://${ESCALAX_SUBDOMAIN_MACRO}.escalax.io/bid?type=pjs&partner=${ESCALAX_SOURCE_ID_MACRO}&token=${ESCALAX_ACCOUNT_ID_MACRO}`;

const ESCALAX_SUPPLY_PLACEMENT_ID_MACRO = "[supplyPlacementId]";
const ESCALAX_SSP_URL = `https://${ESCALAX_SUBDOMAIN_MACRO}.escalax.io/pbb?placementId=${ESCALAX_SUPPLY_PLACEMENT_ID_MACRO}`;

const ESCALAX_DEFAULT_CURRENCY = "USD";

const REGION_SUBDOMAINS = {
  US: { exchange: "bidder_us", ssp: "s-us" },
  EU: { exchange: "bidder_eu", ssp: "s-eu" },
  APAC: { exchange: "bidder_apac", ssp: "s-as" },
};
const DEFAULT_REGION = "US";

const TIMEZONE_REGIONS = {
  America: "US",
  Europe: "EU",
  Africa: "EU",
  Atlantic: "EU",
  Arctic: "EU",
  Asia: "APAC",
  Australia: "APAC",
  Antarctica: "APAC",
  Pacific: "APAC",
  Indian: "APAC",
};

/**
 * @returns {EscalaxSubdomains}
 */
function getRegionSubdomains() {
  try {
    const region = TIMEZONE_REGIONS[getTimeZone().split("/")[0]];
    return REGION_SUBDOMAINS[region] || REGION_SUBDOMAINS[DEFAULT_REGION];
  } catch (err) {
    return REGION_SUBDOMAINS[DEFAULT_REGION];
  }
}

/**
 * @param {{ params: EscalaxBidderParams }} bid
 * @returns {boolean}
 */
function isSspBid(bid) {
  return Boolean(bid.params.supplyPlacementId);
}

function createImp(buildImp, bidRequest, context) {
  const imp = buildImp(bidRequest, context);

  const bidderParams = isSspBid(bidRequest)
    ? { supplyPlacementId: bidRequest.params.supplyPlacementId }
    : {
        sourceId: bidRequest.params.sourceId,
        accountId: bidRequest.params.accountId,
      };

  imp.ext = { ...imp.ext, [BIDDER_CODE]: bidderParams };

  if (!imp.bidfloor && bidRequest.params.bidfloor) {
    imp.bidfloor = bidRequest.params.bidfloor;
    imp.bidfloorcur = bidRequest.params.currency || ESCALAX_DEFAULT_CURRENCY;
  }

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

/**
 * @param {{ params: EscalaxBidderParams }} bid
 * @param {EscalaxSubdomains} subdomains
 * @returns {string}
 */
function buildEndpointURL(bid, subdomains) {
  if (isSspBid(bid)) {
    return ESCALAX_SSP_URL.replace(
      ESCALAX_SUBDOMAIN_MACRO,
      subdomains.ssp,
    ).replace(
      ESCALAX_SUPPLY_PLACEMENT_ID_MACRO,
      encodeURIComponent(bid.params.supplyPlacementId),
    );
  }

  return ESCALAX_EXCHANGE_URL.replace(
    ESCALAX_SUBDOMAIN_MACRO,
    subdomains.exchange,
  )
    .replace(ESCALAX_SOURCE_ID_MACRO, encodeURIComponent(bid.params.sourceId))
    .replace(ESCALAX_ACCOUNT_ID_MACRO, encodeURIComponent(bid.params.accountId));
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
  gvlid: GVLID,
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

    const subdomains = getRegionSubdomains();

    const requests = [];
    validBidRequests.forEach((bid) => {
      const url = buildEndpointURL(bid, subdomains);
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
