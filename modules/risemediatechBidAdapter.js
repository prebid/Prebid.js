import { registerBidder } from '../src/adapters/bidderFactory.js';
import { BANNER, VIDEO } from '../src/mediaTypes.js';
import { ortbConverter } from '../libraries/ortbConverter/converter.js';
import { logInfo, logWarn } from '../src/utils.js';

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
    logInfo('Building impression object for bidRequest:', bidRequest);
    const imp = buildImp(bidRequest, context);
    const { mediaTypes } = bidRequest;

    if (mediaTypes[BANNER]) {
      logInfo('Adding banner media type to impression:', mediaTypes[BANNER]);
      imp.banner = { format: mediaTypes[BANNER].sizes.map(([w, h]) => ({ w, h })) };
    } else if (mediaTypes[VIDEO]) {
      logInfo('Adding video media type to impression:', mediaTypes[VIDEO]);
      imp.video = {
        ...mediaTypes[VIDEO],
        mimes: bidRequest.params.mimes,
        minduration: bidRequest.params.minduration,
        maxduration: bidRequest.params.maxduration,
        startdelay: bidRequest.params.startdelay,
        maxseq: bidRequest.params.maxseq,
        poddur: bidRequest.params.poddur,
        protocols: bidRequest.params.protocols
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
  bidResponse(buildBidResponse, bid, context) {
    logInfo('Building bid response for bid:', bid);
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
  logInfo('Validating bid request:', bid);
  const { mediaTypes } = bid;

  if (mediaTypes?.[VIDEO]) {
    const video = mediaTypes[VIDEO];

    // Validate required fields for Video
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
  logInfo('Interpreting server response:', serverResponse);

  if (!serverResponse || !serverResponse.body) {
    logWarn('Server response is empty or invalid.');
    return [];
  }

  const { bids } = converter.fromORTB({ response: serverResponse.body, request: request.data });

  if (!bids || !Array.isArray(bids)) {
    logWarn('No valid bids found in server response.');
    return [];
  }

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
  logInfo('Handling user syncs with options:', syncOptions);
  const type = syncOptions.iframeEnabled ? 'iframe' : 'image';
  let url = type === 'iframe' ? SYNC_URL_IFRAME : SYNC_URL_IMAGE;

  if (gdprConsent?.consentString) {
    logInfo('Adding GDPR consent information to user sync URL:', gdprConsent);
    url += `?gdpr=${Number(gdprConsent.gdprApplies || 0)}&gdpr_consent=${gdprConsent.consentString}`;
  }

  if (uspConsent) {
    logInfo('Adding USP consent information to user sync URL:', uspConsent);
    url += `&us_privacy=${uspConsent}`;
  }

  if (gppConsent?.gppString && gppConsent?.applicableSections?.length) {
    logInfo('Adding GPP consent information to user sync URL:', gppConsent);
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
