import { registerBidder } from '../src/adapters/bidderFactory.js';
import { BANNER, VIDEO } from '../src/mediaTypes.js';
import { ortbConverter } from '../libraries/ortbConverter/converter.js';

const BIDDER_CODE = 'risemediatech';
const ENDPOINT_URL = 'http://localhost:8082/ads/rtb/prebid/js';
const SYNC_URL_IFRAME = 'https://sync.risemediatech.com/iframe';
const SYNC_URL_IMAGE = 'https://sync.risemediatech.com/image';
const DEFAULT_CURRENCY = 'USD';
const DEFAULT_TTL = 300;

const converter = ortbConverter({
  context: {
    netRevenue: true,
    ttl: DEFAULT_TTL,
    currency: DEFAULT_CURRENCY,
  },
  imp(buildImp, bidRequest, context) {
    const imp = buildImp(bidRequest, context);
    const { mediaTypes } = bidRequest;

    if (mediaTypes[BANNER]) {
      imp.banner = { format: mediaTypes[BANNER].sizes.map(([w, h]) => ({ w, h })) };
    } else if (mediaTypes[VIDEO]) {
      imp.video = { ...mediaTypes[VIDEO] };
    }

    return imp;
  },
  request(buildRequest, imps, bidderRequest, context) {
    const request = buildRequest(imps, bidderRequest, context);
    request.cur = [DEFAULT_CURRENCY];
    request.tmax = bidderRequest.timeout;
    request.test = bidderRequest.test || 0;

    if (bidderRequest.gdprConsent) {
      request.regs = { ext: { gdpr: bidderRequest.gdprConsent.gdprApplies ? 1 : 0 } };
      request.user = { ext: { consent: bidderRequest.gdprConsent.consentString } };
    }

    if (bidderRequest.uspConsent) {
      request.regs = request.regs || {};
      request.regs.ext = request.regs.ext || {};
      request.regs.ext.us_privacy = bidderRequest.uspConsent;
    }

    return request;
  },
  bidResponse(buildBidResponse, bid, context) {
    const bidResponse = buildBidResponse(bid, context);
    bidResponse.meta = bidResponse.meta || {};
    bidResponse.meta.advertiserDomains = bid.adomain || [];
    return bidResponse;
  },
});

/**
 * Validates the bid request.
 * @param {Object} bid - The bid request object.
 * @returns {boolean} True if the bid request is valid.
 */
const isBidRequestValid = (bid) => {
  return !!bid.params?.placementId;
};

/**
 * Builds the server request for the bid.
 * @param {Array} validBidRequests - Array of valid bid requests.
 * @param {Object} bidderRequest - Additional information about the bid request.
 * @returns {Object} Server request object.
 */
const buildRequests = (validBidRequests, bidderRequest) => {
  const request = converter.toORTB({ bidRequests: validBidRequests, bidderRequest });
  return {
    method: 'POST',
    url: ENDPOINT_URL,
    data: request,
  };
};

/**
 * Interprets the server response and extracts bid information.
 * @param {Object} serverResponse - The response from the server.
 * @param {Object} request - The original request sent to the server.
 * @returns {Array} Array of bid objects.
 */
const interpretResponse = (serverResponse, request) => {
  const { bids } = converter.fromORTB({ response: serverResponse.body, request: request.data });
  return bids;
};

/**
 * Handles user syncs for GDPR, CCPA, and GPP compliance.
 * @param {Object} syncOptions - Options for user sync.
 * @param {Array} serverResponses - Server responses.
 * @param {Object} gdprConsent - GDPR consent information.
 * @param {Object} uspConsent - CCPA consent information.
 * @param {Object} gppConsent - GPP consent information.
 * @returns {Array} Array of user sync objects.
 */
const getUserSyncs = (syncOptions, serverResponses, gdprConsent, uspConsent, gppConsent) => {
  const type = syncOptions.iframeEnabled ? 'iframe' : 'image';
  let url = type === 'iframe' ? SYNC_URL_IFRAME : SYNC_URL_IMAGE;

  if (gdprConsent?.consentString) {
    url += `?gdpr=${Number(gdprConsent.gdprApplies || 0)}&gdpr_consent=${gdprConsent.consentString}`;
  }

  if (uspConsent) {
    url += `&us_privacy=${uspConsent}`;
  }

  if (gppConsent?.gppString && gppConsent?.applicableSections?.length) {
    url += `&gpp=${gppConsent.gppString}&gpp_sid=${gppConsent.applicableSections.join(',')}`;
  }

  return [{ type, url }];
};

export const spec = {
  code: BIDDER_CODE,
  supportedMediaTypes: [BANNER, VIDEO],
  isBidRequestValid,
  buildRequests,
  interpretResponse,
  getUserSyncs,
};

registerBidder(spec);