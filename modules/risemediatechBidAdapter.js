import { registerBidder } from '../src/adapters/bidderFactory.js';
import { BANNER, VIDEO } from '../src/mediaTypes.js';
import { ortbConverter } from '../libraries/ortbConverter/converter.js';
import { logInfo, logWarn } from '../src/utils.js';

const BIDDER_CODE = 'risemediatech';
const ENDPOINT_URL = 'https://dev-ads.risemediatech.com/ads/rtb/prebid/js';
const DEFAULT_CURRENCY = 'USD';
const DEFAULT_TTL = 60;

const converter = ortbConverter({
  context: {
    netRevenue: true,
    ttl: DEFAULT_TTL,
    currency: DEFAULT_CURRENCY,
  },
  imp(buildImp, bidRequest, context) {
    logInfo('Building impression object for bidRequest:', bidRequest);
    const imp = buildImp(bidRequest, context);
    const { mediaTypes } = bidRequest;
    if (bidRequest.params) {
      if (bidRequest.params.bidfloor) {
        logInfo('Setting bid floor for impression:', bidRequest.params.bidfloor);
        imp.bidfloor = bidRequest.params.bidfloor;
      }
    }
    if (mediaTypes[BANNER]) {
      logInfo('Adding banner media type to impression:', mediaTypes[BANNER]);
      imp.banner = { format: mediaTypes[BANNER].sizes.map(([w, h]) => ({ w, h })) };
    } else if (mediaTypes[VIDEO]) {
      logInfo('Adding video media type to impression:', mediaTypes[VIDEO]);
      imp.video = {
        ...mediaTypes[VIDEO],
        // all video parameters are mapped.
      };
    }

    return imp;
  },
  request(buildRequest, imps, bidderRequest, context) {
    logInfo('Building server request with impressions:', imps);
    const request = buildRequest(imps, bidderRequest, context);
    request.cur = [DEFAULT_CURRENCY];
    request.tmax = bidderRequest.timeout;
    request.test = bidderRequest.test || 0;

    if (Array.isArray(bidderRequest.bids)) {
      const hasTestMode = bidderRequest.bids.some(bid => bid.params && bid.params.testMode === 1);
      if (hasTestMode) {
        request.ext = request.ext || {};
        request.ext.test = 1;
        logInfo('Test mode detected in bid params, setting test flag in request:', request.ext.test);
      }
    }

    if (bidderRequest.gdprConsent) {
      logInfo('Adding GDPR consent information to request:', bidderRequest.gdprConsent);
      request.regs = { ext: { gdpr: bidderRequest.gdprConsent.gdprApplies ? 1 : 0 } };
      request.user = { ext: { consent: bidderRequest.gdprConsent.consentString } };
    }

    if (bidderRequest.uspConsent) {
      logInfo('Adding USP consent information to request:', bidderRequest.uspConsent);
      request.regs = request.regs || {};
      request.regs.ext = request.regs.ext || {};
      request.regs.ext.us_privacy = bidderRequest.uspConsent;
    }

    return request;
  },
});

/**
 * Validates the bid request.
 * @param {Object} bid - The bid request object.
 * @returns {boolean} True if the bid request is valid.
 */
const isBidRequestValid = (bid) => {
  logInfo('Validating bid request:', bid);

  const { mediaTypes } = bid;

  // Validate video-specific fields if mediaTypes includes VIDEO
  if (mediaTypes?.[VIDEO]) {
    const video = mediaTypes[VIDEO];

    if (!video.mimes || !Array.isArray(video.mimes) || video.mimes.length === 0) {
      logWarn('Invalid video bid request: Missing or invalid mimes.');
      return false;
    }
    if (video.w != null && video.w <= 0) {
      logWarn('Invalid video bid request: Invalid width.');
      return false;
    }
    if (video.h != null && video.h <= 0) {
      logWarn('Invalid video bid request: Invalid height.');
      return false;
    }
  }

  return true;
};

/**
 * Builds the server request for the bid.
 * @param {Array} validBidRequests - Array of valid bid requests.
 * @param {Object} bidderRequest - Additional information about the bid request.
 * @returns {Object} Server request object.
 */
const buildRequests = (validBidRequests, bidderRequest) => {
  logInfo('Building server request for valid bid requests:', validBidRequests);
  const request = converter.toORTB({ bidRequests: validBidRequests, bidderRequest });
  logInfo('Converted to ORTB request:', request);
  return {
    method: 'POST',
    url: ENDPOINT_URL,
    data: request,
    options: {
      endpointCompression: true
    },
  };
};

/**
 * Interprets the server response and extracts bid information.
 * @param {Object} serverResponse - The response from the server.
 * @param {Object} request - The original request sent to the server.
 * @returns {Array} Array of bid objects.
 */
const interpretResponse = (serverResponse, request) => {
  logInfo('Interpreting server response:', serverResponse);

  const bidResp = serverResponse && serverResponse.body;
  if (!bidResp || !Array.isArray(bidResp.seatbid)) {
    logWarn('Server response is empty, invalid, or does not contain seatbid array.');
    return [];
  }

  const responses = [];
  bidResp.seatbid.forEach(seatbid => {
    if (Array.isArray(seatbid.bid) && seatbid.bid.length > 0) {
      const bid = seatbid.bid[0];
      logInfo('Processing bid response:', bid);
      const bidResponse = {
        requestId: bid.impid,
        cpm: bid.price,
        currency: bidResp.cur || DEFAULT_CURRENCY,
        width: bid.w,
        height: bid.h,
        ad: bid.adm,
        creativeId: bid.crid,
        netRevenue: true,
        ttl: DEFAULT_TTL,
        meta: {
          advertiserDomains: bid.adomain || [],
        }
      }

      // Set media type based on bid.mtype
      if (bid.mtype == null) {
        logWarn('Bid response does not contain media type for bidId: ', bid.id);
        bidResponse.mediaType = BANNER;
      }
      switch (bid.mtype) {
        case 1:
          bidResponse.mediaType = BANNER;
          break;
        case 2:
          bidResponse.mediaType = VIDEO;
          bidResponse.vastXml = bid.adm;
          break;
        default:
          logWarn('Unknown media type: ', bid.mtype, ' for bidId: ', bid.id);
          break;
      }

      // set dealId if present
      if (bid.dealid) {
        bidResponse.dealId = bid.dealid;
      }
      logInfo('Interpreted response:', bidResponse, ' for bidId: ', bid.id);
      responses.push(bidResponse);
    }
  });

  logInfo('Interpreted bid responses:', responses);
  return responses;
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
  // return [{ type, url }];
  logInfo('User syncs are not implemented in this adapter yet.');
  return null;
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
