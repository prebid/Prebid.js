import { getValue, logError, deepAccess, parseSizesInput, getBidIdParameter, logInfo, getWinDimensions, getScreenOrientation } from '../src/utils.js';
import { registerBidder } from '../src/adapters/bidderFactory.js';
import { getStorageManager } from '../src/storageManager.js';
import { getHLen } from '../libraries/navigatorData/navigatorData.js';
import { getTimeToFirstByte } from '../libraries/timeToFirstBytesUtils/timeToFirstBytesUtils.js';
import { getReferrerInfo, getPageTitle, getPageDescription, getConnectionDownLink } from '../libraries/pageInfosUtils/pageInfosUtils.js';
/**
 * @typedef {import('../src/adapters/bidderFactory.js').BidRequest} BidRequest
 * @typedef {import('../src/adapters/bidderFactory.js').Bid} Bid
 */

const BIDDER_CODE = 'greenbids';
export const ENDPOINT_URL = 'https://hb.greenbids.ai';
export const storage = getStorageManager({ bidderCode: BIDDER_CODE });

export const spec = {
  code: BIDDER_CODE,
  supportedMediaTypes: ['banner', 'video'],
  /**
   * Determines whether or not the given bid request is valid.
   *
   * @param {BidRequest} bid The bid params to validate.
   * @return boolean True if this is a valid bid, and false otherwise.
   */
  isBidRequestValid: function (bid) {
    if (typeof bid.params !== 'undefined' && parseInt(getValue(bid.params, 'placementId')) > 0) {
      logInfo('Greenbids bidder adapter valid bid request');
      return true;
    } else {
      logError('Greenbids bidder adapter requires placementId to be defined and a positive number');
      return false;
    }
  },
  /**
   * Make a server request from the list of BidRequests.
   *
   * @param {validBidRequests[]} validBidRequests array of bids
   * @param bidderRequest bidder request object
   * @return ServerRequest Info describing the request to the server.
   */
  buildRequests: function (validBidRequests, bidderRequest) {
    const bids = validBidRequests.map(bids => {
      const reqObj = {};
      const placementId = getValue(bids.params, 'placementId');
      const gpid = deepAccess(bids, 'ortb2Imp.ext.gpid');
      reqObj.sizes = getSizes(bids);
      reqObj.bidId = getBidIdParameter('bidId', bids);
      reqObj.bidderRequestId = getBidIdParameter('bidderRequestId', bids);
      reqObj.placementId = parseInt(placementId, 10);
      reqObj.adUnitCode = getBidIdParameter('adUnitCode', bids);
      reqObj.transactionId = bids.ortb2Imp?.ext?.tid || '';
      if (gpid) { reqObj.gpid = gpid; }
      return reqObj;
    });
    const topWindow = window.top;

    const payload = {
      referrer: getReferrerInfo(bidderRequest),
      pageReferrer: document.referrer,
      pageTitle: getPageTitle().slice(0, 300),
      pageDescription: getPageDescription().slice(0, 300),
      networkBandwidth: getConnectionDownLink(window.navigator),
      timeToFirstByte: getTimeToFirstByte(window),
      data: bids,
      device: bidderRequest?.ortb2?.device || {},
      deviceWidth: screen.width,
      deviceHeight: screen.height,
      devicePixelRatio: topWindow.devicePixelRatio,
      screenOrientation: getScreenOrientation(),
      historyLength: getHLen(),
      viewportHeight: getWinDimensions().visualViewport.height,
      viewportWidth: getWinDimensions().visualViewport.width,
      prebid_version: '$prebid.version$',
    };

    const firstBidRequest = validBidRequests[0];

    const schain = firstBidRequest?.ortb2?.source?.ext?.schain;
    if (schain) {
      payload.schain = schain;
    }

    hydratePayloadWithGppConsentData(payload, bidderRequest.gppConsent);
    hydratePayloadWithGdprConsentData(payload, bidderRequest.gdprConsent);
    hydratePayloadWithUspConsentData(payload, bidderRequest.uspConsent);

    const userAgentClientHints = deepAccess(firstBidRequest, 'ortb2.device.sua');
    if (userAgentClientHints) {
      payload.userAgentClientHints = userAgentClientHints;
    }

    const dsa = deepAccess(bidderRequest, 'ortb2.regs.ext.dsa');
    if (dsa) {
      payload.dsa = dsa;
    }

    const payloadString = JSON.stringify(payload);
    return {
      method: 'POST',
      url: ENDPOINT_URL,
      data: payloadString,
    };
  },
  /**
   * Unpack the response from the server into a list of bids.
   *
   * @param {*} serverResponse A successful response from the server.
   * @return {Bid[]} An array of bids which were nested inside the server response.
   */
  interpretResponse: function (serverResponse) {
    serverResponse = serverResponse.body;
    if (!serverResponse.responses) {
      return [];
    }
    return serverResponse.responses.map((bid) => {
      const bidResponse = {
        cpm: bid.cpm,
        width: bid.width,
        height: bid.height,
        currency: bid.currency,
        netRevenue: true,
        size: bid.size,
        ttl: bid.ttl,
        meta: {
          advertiserDomains: bid && bid.adomain ? bid.adomain : [],
        },
        ad: bid.ad,
        requestId: bid.bidId,
        creativeId: bid.creativeId,
        placementId: bid.placementId,
      };
      if (bid.dealId) {
        bidResponse.dealId = bid.dealId
      }
      if (bid?.ext?.dsa) {
        bidResponse.meta.dsa = bid.ext.dsa;
      }
      return bidResponse;
    });
  }
};

registerBidder(spec);

/**
 * Converts the sizes from the bid object to the required format.
 *
 * @param {Object} bid - The bid object containing size information.
 * @param {Array} bid.sizes - The sizes array from the bid object.
 * @returns {Array} - The parsed sizes in the required format.
 */
function getSizes(bid) {
  return parseSizesInput(bid.sizes);
}

// Privacy handling

/**
 * Hydrates the given payload with GPP consent data if available.
 *
 * @param {Object} payload - The payload object to be hydrated.
 * @param {Object} gppData - The GPP consent data object.
 * @param {string} gppData.gppString - The GPP consent string.
 * @param {number[]} gppData.applicableSections - An array of applicable section IDs.
 */
function hydratePayloadWithGppConsentData(payload, gppData) {
  if (!gppData) { return; }
  const isValidConsentString = typeof gppData.gppString === 'string';
  const validateApplicableSections =
      Array.isArray(gppData.applicableSections) &&
      gppData.applicableSections.every((section) => typeof (section) === 'number')
  payload.gpp = {
    consentString: isValidConsentString ? gppData.gppString : '',
    applicableSectionIds: validateApplicableSections ? gppData.applicableSections : [],
  };
}

/**
 * Hydrates the given payload with GDPR consent data if available.
 *
 * @param {Object} payload - The payload object to be hydrated with GDPR consent data.
 * @param {Object} gdprData - The GDPR data object containing consent information.
 * @param {boolean} gdprData.gdprApplies - Indicates if GDPR applies.
 * @param {string} gdprData.consentString - The GDPR consent string.
 * @param {number} gdprData.apiVersion - The version of the GDPR API being used.
 * @param {Object} gdprData.vendorData - Additional vendor data related to GDPR.
 */
function hydratePayloadWithGdprConsentData(payload, gdprData) {
  if (!gdprData) { return; }
  const isCmp = typeof gdprData.gdprApplies === 'boolean';
  const isConsentString = typeof gdprData.consentString === 'string';
  const status = isCmp
    ? findGdprStatus(gdprData.gdprApplies, gdprData.vendorData)
    : gdprStatus.CMP_NOT_FOUND_OR_ERROR;
  payload.gdpr_iab = {
    consent: isConsentString ? gdprData.consentString : '',
    status: status,
    apiVersion: gdprData.apiVersion
  };
}

/**
 * Adds USP (CCPA) consent data to the payload if available.
 *
 * @param {Object} payload - The payload object to be hydrated with USP consent data.
 * @param {string} uspConsentData - The USP consent string to be added to the payload.
 */
function hydratePayloadWithUspConsentData(payload, uspConsentData) {
  if (!uspConsentData) { return; }
  payload.us_privacy = uspConsentData;
}

const gdprStatus = {
  GDPR_APPLIES_PUBLISHER: 12,
  GDPR_APPLIES_GLOBAL: 11,
  GDPR_DOESNT_APPLY: 0,
  CMP_NOT_FOUND_OR_ERROR: 22
};

/**
 * Determines the GDPR status based on whether GDPR applies and the provided GDPR data.
 *
 * @param {boolean} gdprApplies - Indicates if GDPR applies.
 * @param {Object} gdprData - The GDPR data object.
 * @param {boolean} gdprData.isServiceSpecific - Indicates if the GDPR data is service-specific.
 * @returns {string} The GDPR status.
 */
function findGdprStatus(gdprApplies, gdprData) {
  let status = gdprStatus.GDPR_APPLIES_PUBLISHER;
  if (gdprApplies) {
    if (gdprData && !gdprData.isServiceSpecific) {
      status = gdprStatus.GDPR_APPLIES_GLOBAL;
    }
  } else {
    status = gdprStatus.GDPR_DOESNT_APPLY;
  }
  return status;
}
