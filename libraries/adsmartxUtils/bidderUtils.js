import { BANNER, VIDEO } from '../../src/mediaTypes.js';
import { ortbConverter } from '../ortbConverter/converter.js';
import { deepAccess, logInfo, logWarn } from '../../src/utils.js';

const DEFAULT_CURRENCY = 'USD';
const DEFAULT_TTL = 60;

/**
 * Get publisher user ID with priority:
 * 1. Bid params (sspUserId)
 * 2. ORTB2 first party data (ortb2.user.id)
 * @param {Object} bidParams - Bid parameters from first bid
 * @param {Object} bidderRequest - Bidder request object containing ortb2
 * @returns {string|null} Publisher user ID if found, null otherwise
 */
export function getPublisherUserId(bidParams, bidderRequest) {
  if (bidParams?.sspUserId) {
    logInfo('Using SSP user ID from bid params:', bidParams.sspUserId);
    return bidParams.sspUserId;
  }
  const ortb2UserId = deepAccess(bidderRequest, 'ortb2.user.id');
  if (ortb2UserId) {
    logInfo('Using SSP user ID from ORTB2 user.id:', ortb2UserId);
    return ortb2UserId;
  }
  logInfo('No SSP user ID found in bid params or ORTB2');
  return null;
}

/**
 * Creates ORTB converter with shared imp/request logic.
 * @param {Object} config - { defaultCurrency, defaultTtl }
 * @returns {Object} ortbConverter instance
 */
export function createConverter(config = {}) {
  const currency = config.defaultCurrency ?? DEFAULT_CURRENCY;
  const ttl = config.defaultTtl ?? DEFAULT_TTL;

  return ortbConverter({
    context: {
      netRevenue: true,
      ttl,
      currency,
    },
    imp(buildImp, bidRequest, context) {
      logInfo('Building impression object for bidRequest:', bidRequest);
      const imp = buildImp(bidRequest, context);
      const { mediaTypes } = bidRequest;
      if (bidRequest.params?.bidfloor) {
        logInfo('Setting bid floor for impression:', bidRequest.params.bidfloor);
        imp.bidfloor = bidRequest.params.bidfloor;
      }
      if (mediaTypes[BANNER]) {
        logInfo('Adding banner media type to impression:', mediaTypes[BANNER]);
        imp.banner = { ...(imp.banner || {}), format: mediaTypes[BANNER].sizes.map(([w, h]) => ({ w, h })) };
      } else if (mediaTypes[VIDEO]) {
        logInfo('Adding video media type to impression:', mediaTypes[VIDEO]);
        imp.video = { ...(imp.video || {}), ...mediaTypes[VIDEO] };
      }
      return imp;
    },
    request(buildRequest, imps, bidderRequest, context) {
      logInfo('Building server request with impressions:', imps);
      const request = buildRequest(imps, bidderRequest, context);
      request.cur = [currency];
      request.tmax = bidderRequest.timeout;
      request.test = bidderRequest.test || 0;

      if (Array.isArray(bidderRequest.bids)) {
        const hasTestMode = bidderRequest.bids.some(bid => bid.params?.testMode === 1);
        if (hasTestMode) {
          request.ext = request.ext || {};
          request.ext.test = 1;
          logInfo('Test mode detected in bid params, setting test flag in request:', request.ext.test);
        }
        const sspIdBid = bidderRequest.bids.find(bid => bid.params?.sspId);
        if (sspIdBid) {
          request.ext = request.ext || {};
          request.ext.sspId = sspIdBid.params.sspId;
          logInfo('sspId detected in bid params, setting sspId in request:', request.ext.sspId);
        }
        const siteIdBid = bidderRequest.bids.find(bid => bid.params?.siteId);
        if (siteIdBid) {
          request.ext = request.ext || {};
          request.ext.siteId = siteIdBid.params.siteId;
          logInfo('siteId detected in bid params, setting siteId in request:', request.ext.siteId);
        }
      }

      if (bidderRequest.gdprConsent || bidderRequest.uspConsent) {
        request.regs = request.regs || {};
        request.user = request.user || {};
      }
      if (bidderRequest.gdprConsent) {
        logInfo('Adding GDPR consent information to request:', bidderRequest.gdprConsent);
        request.regs.gdpr = bidderRequest.gdprConsent.gdprApplies ? 1 : 0;
        request.user.consent = bidderRequest.gdprConsent.consentString;
      }
      if (bidderRequest.uspConsent) {
        logInfo('Adding USP consent information to request:', bidderRequest.uspConsent);
        request.regs.ext = request.regs.ext || {};
        request.regs.ext.us_privacy = bidderRequest.uspConsent;
      }
      return request;
    },
  });
}

/**
 * Validates the bid request (video mimes/sizes, etc.).
 * @param {Object} bid - The bid request object.
 * @returns {boolean} True if the bid request is valid.
 */
export function isBidRequestValid(bid) {
  logInfo('Validating bid request:', bid);
  const { mediaTypes } = bid;

  if (mediaTypes?.[VIDEO]) {
    const video = mediaTypes[VIDEO];
    if (!video.mimes || !Array.isArray(video.mimes) || video.mimes.length === 0) {
      logWarn('Invalid video bid request: Missing or invalid mimes.');
      return false;
    }
    // w and h are optional; if provided they must be positive
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
}

/**
 * Builds buildRequests function that uses the given converter and endpoint.
 * @param {Object} config - { converter, endpointUrl }
 * @returns {function(Array, Object): Object}
 */
export function createBuildRequests(config) {
  const { converter, endpointUrl } = config;

  return function buildRequests(validBidRequests, bidderRequest) {
    logInfo('Building server request for valid bid requests:', validBidRequests);

    const request = converter.toORTB({ bidRequests: validBidRequests, bidderRequest });
    logInfo('Converted to ORTB request:', request);
    return {
      method: 'POST',
      url: endpointUrl,
      data: request,
      options: { endpointCompression: true },
    };
  };
}

/**
 * Interprets the server response and extracts bid information.
 * @param {Object} serverResponse - The response from the server.
 * @param {Object} request - The original request sent to the server.
 * @param {Object} config - { defaultCurrency, defaultTtl }
 * @returns {Array} Array of bid objects.
 */
export function interpretResponse(serverResponse, request, config = {}) {
  const defaultCurrency = config.defaultCurrency ?? DEFAULT_CURRENCY;
  const defaultTtl = config.defaultTtl ?? DEFAULT_TTL;

  logInfo('Interpreting server response:', serverResponse);
  const bidResp = serverResponse?.body;
  if (!bidResp || !Array.isArray(bidResp.seatbid)) {
    logWarn('Server response is empty, invalid, or does not contain seatbid array.');
    return [];
  }

  const responses = [];
  bidResp.seatbid.forEach(seatbid => {
    if (!Array.isArray(seatbid.bid) || seatbid.bid.length === 0) return;
    const bid = seatbid.bid[0];
    if (!bid.impid || bid.price == null) {
      logWarn('Skipping bid with missing impid or price, bidId:', bid.id);
      return;
    }
    logInfo('Processing bid response:', bid);
    const bidResponse = {
      requestId: bid.impid,
      cpm: bid.price,
      currency: bidResp.cur || defaultCurrency,
      width: bid.w,
      height: bid.h,
      ad: bid.adm,
      creativeId: bid.crid,
      netRevenue: true,
      ttl: defaultTtl,
      meta: { advertiserDomains: bid.adomain || [] },
    };

    switch (bid.mtype) {
      case 1:
        bidResponse.mediaType = BANNER;
        break;
      case 2:
        bidResponse.mediaType = VIDEO;
        bidResponse.vastXml = bid.adm;
        break;
      default:
        if (bid.mtype != null) {
          logWarn('Unknown media type: ', bid.mtype, ' for bidId: ', bid.id);
        } else {
          logWarn('Bid response does not contain media type for bidId: ', bid.id);
        }
        bidResponse.mediaType = BANNER;
        break;
    }

    if (bid.dealid) bidResponse.dealId = bid.dealid;
    logInfo('Interpreted response:', bidResponse, ' for bidId: ', bid.id);
    responses.push(bidResponse);
  });

  logInfo('Interpreted bid responses:', responses);
  return responses;
}

/**
 * Creates getUserSyncs function that builds sync URL with privacy params.
 * @param {string} syncUrl - Base sync URL (e.g. 'https://sync.adsmartx.com/sync')
 * @returns {function(Object, Array, Object, string, Object): Array}
 */
export function createGetUserSyncs(syncUrl) {
  return function getUserSyncs(syncOptions, serverResponses, gdprConsent, uspConsent, gppConsent) {
    logInfo('getUserSyncs called with options:', syncOptions);
    if (!syncOptions.iframeEnabled && !syncOptions.pixelEnabled) {
      logWarn('User sync disabled: neither iframe nor pixel is enabled');
      return [];
    }

    const params = [];
    if (gdprConsent) {
      params.push('gdpr=' + (gdprConsent.gdprApplies ? 1 : 0));
      params.push('gdpr_consent=' + encodeURIComponent(gdprConsent.consentString || ''));
    }
    if (uspConsent) {
      params.push('us_privacy=' + encodeURIComponent(uspConsent));
    }
    if (gppConsent?.gppString && gppConsent?.applicableSections?.length) {
      params.push('gpp=' + encodeURIComponent(gppConsent.gppString));
      params.push('gpp_sid=' + encodeURIComponent(gppConsent.applicableSections.join(',')));
    }

    params.push('ssp_id=630141');
    params.push('iframe_enabled=' + (syncOptions.iframeEnabled ? 'true' : 'false'));

    const queryString = params.length ? '?' + params.join('&') : '';
    const syncs = [{
      type: syncOptions.iframeEnabled ? 'iframe' : 'image',
      url: syncUrl + queryString,
    }];
    logInfo('Returning user syncs, type:', syncs[0]?.type);
    return syncs;
  };
}
