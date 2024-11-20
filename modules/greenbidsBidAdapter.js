import { getValue, logError, deepAccess, parseSizesInput, getBidIdParameter, logInfo } from '../src/utils.js';
import { registerBidder } from '../src/adapters/bidderFactory.js';
import { getStorageManager } from '../src/storageManager.js';
import { getDM, getHC, getHLen } from '../libraries/navigatorData/navigatorData.js';

/**
 * @typedef {import('../src/adapters/bidderFactory.js').BidRequest} BidRequest
 * @typedef {import('../src/adapters/bidderFactory.js').Bid} Bid
 */

const BIDDER_CODE = 'greenbids';
const GVL_ID = 1232;
const ENDPOINT_URL = 'https://d.greenbids.ai/hb/bid-request';
export const storage = getStorageManager({ bidderCode: BIDDER_CODE });

export const spec = {
  code: BIDDER_CODE,
  gvlid: GVL_ID,
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
    const bids = validBidRequests.map(cleanBidsInfo);
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
      screenOrientation: screen.orientation?.type,
      historyLength: getHLen(),
      viewportHeight: topWindow.visualViewport?.height,
      viewportWidth: topWindow.visualViewport?.width,
      hardwareConcurrency: getHC(),
      deviceMemory: getDM(),
      prebid_version: '$prebid.version$',
    };

    const firstBidRequest = validBidRequests[0];

    if (firstBidRequest.schain) {
      payload.schain = firstBidRequest.schain;
    }

    hydratePayloadWithGppData(payload, bidderRequest.gppConsent);
    hydratePayloadWithGdprData(payload, bidderRequest.gdprConsent);
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

// Page info retrival
function getReferrerInfo(bidderRequest) {
  let ref = '';
  if (bidderRequest && bidderRequest.refererInfo && bidderRequest.refererInfo.page) {
    ref = bidderRequest.refererInfo.page;
  }
  return ref;
}

function getPageTitle() {
  try {
    const ogTitle = window.top.document.querySelector('meta[property="og:title"]');
    return window.top.document.title || (ogTitle && ogTitle.content) || '';
  } catch (e) {
    const ogTitle = document.querySelector('meta[property="og:title"]');
    return document.title || (ogTitle && ogTitle.content) || '';
  }
}

function getPageDescription() {
  try {
    const element = window.top.document.querySelector('meta[name="description"]') ||
      window.top.document.querySelector('meta[property="og:description"]');
    return (element && element.content) || '';
  } catch (e) {
    const element = document.querySelector('meta[name="description"]') ||
      document.querySelector('meta[property="og:description"]');
    return (element && element.content) || '';
  }
}

function getConnectionDownLink(nav) {
  return nav && nav.connection && nav.connection.downlink >= 0 ? nav.connection.downlink.toString() : '';
}

function getTimeToFirstByte(win) {
  const performance = win.performance || win.webkitPerformance || win.msPerformance || win.mozPerformance;

  const ttfbWithTimingV2 = performance &&
    typeof performance.getEntriesByType === 'function' &&
    Object.prototype.toString.call(performance.getEntriesByType) === '[object Function]' &&
    performance.getEntriesByType('navigation')[0] &&
    performance.getEntriesByType('navigation')[0].responseStart &&
    performance.getEntriesByType('navigation')[0].requestStart &&
    performance.getEntriesByType('navigation')[0].responseStart > 0 &&
    performance.getEntriesByType('navigation')[0].requestStart > 0 &&
    Math.round(
      performance.getEntriesByType('navigation')[0].responseStart - performance.getEntriesByType('navigation')[0].requestStart
    );

  if (ttfbWithTimingV2) {
    return ttfbWithTimingV2.toString();
  }

  const ttfbWithTimingV1 = performance &&
    performance.timing.responseStart &&
    performance.timing.requestStart &&
    performance.timing.responseStart > 0 &&
    performance.timing.requestStart > 0 &&
    performance.timing.responseStart - performance.timing.requestStart;

  return ttfbWithTimingV1 ? ttfbWithTimingV1.toString() : '';
}

function cleanBidsInfo(bids) {
  const reqObj = {};
  let placementId = getValue(bids.params, 'placementId');
  const gpid = deepAccess(bids, 'ortb2Imp.ext.gpid');
  reqObj.sizes = getSizes(bids);
  reqObj.bidId = getBidIdParameter('bidId', bids);
  reqObj.bidderRequestId = getBidIdParameter('bidderRequestId', bids);
  reqObj.placementId = parseInt(placementId, 10);
  reqObj.adUnitCode = getBidIdParameter('adUnitCode', bids);
  reqObj.transactionId = bids.ortb2Imp?.ext?.tid || '';
  if (gpid) { reqObj.gpid = gpid; }
  return reqObj;
}

function getSizes(bid) {
  return parseSizesInput(bid.sizes);
}

// Privacy handling

export function hydratePayloadWithGppData(payload, gppData) {
  if (gppData) {
    let isValidConsentString = typeof gppData.gppString === 'string';
    let validateApplicableSections =
      Array.isArray(gppData.applicableSections) &&
      gppData.applicableSections.every((section) => typeof (section) === 'number')
    payload.gpp = {
      consentString: isValidConsentString ? gppData.gppString : '',
      applicableSectionIds: validateApplicableSections ? gppData.applicableSections : [],
    };
  }
}

export function hydratePayloadWithGdprData(payload, gdprData) {
  if (!gdprData) { return; }
  let isCmp = typeof gdprData.gdprApplies === 'boolean';
  let isConsentString = typeof gdprData.consentString === 'string';
  let status = isCmp
    ? findGdprStatus(gdprData.gdprApplies, gdprData.vendorData)
    : gdprStatus.CMP_NOT_FOUND_OR_ERROR;
  payload.gdpr_iab = {
    consent: isConsentString ? gdprData.consentString : '',
    status: status,
    apiVersion: gdprData.apiVersion
  };
}

export function hydratePayloadWithUspConsentData(payload, uspConsentData) {
  if (uspConsentData) {
    payload.us_privacy = uspConsentData;
  }
}

const gdprStatus = {
  GDPR_APPLIES_PUBLISHER: 12,
  GDPR_APPLIES_GLOBAL: 11,
  GDPR_DOESNT_APPLY: 0,
  CMP_NOT_FOUND_OR_ERROR: 22
};

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
