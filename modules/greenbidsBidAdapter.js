import { getValue, logError, deepAccess, parseSizesInput, isArray, getBidIdParameter } from '../src/utils.js';
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
const gdprStatus = {
  GDPR_APPLIES_PUBLISHER: 12,
  GDPR_APPLIES_GLOBAL: 11,
  GDPR_DOESNT_APPLY: 0,
  CMP_NOT_FOUND_OR_ERROR: 22
};
export const storage = getStorageManager({ bidderCode: BIDDER_CODE });

export const spec = {
  code: BIDDER_CODE,
  gvlid: GVL_ID,
  supportedMediaTypes: ['banner'],
  /**
   * Determines whether or not the given bid request is valid.
   *
   * @param {BidRequest} bid The bid params to validate.
   * @return boolean True if this is a valid bid, and false otherwise.
   */
  isBidRequestValid: function (bid) {
    let isValid = false;
    if (typeof bid.params !== 'undefined') {
      let isValidgbPlacementId = _validateId(getValue(bid.params, 'gbPlacementId'));
      isValid = isValidgbPlacementId;
    }

    if (!isValid) {
      logError(' parameters are required. Bid aborted.');
    }
    return isValid;
  },
  /**
   * Make a server request from the list of BidRequests.
   *
   * @param {validBidRequests[]} an array of bids
   * @return ServerRequest Info describing the request to the server.
   */
  buildRequests: function (validBidRequests, bidderRequest) {
    const bids = validBidRequests.map(buildRequestObject);
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
      hb_version: '$prebid.version$',
      ...getSharedViewerIdParameters(validBidRequests),
    };

    const firstBidRequest = validBidRequests[0];

    if (firstBidRequest.schain) {
      payload.schain = firstBidRequest.schain;
    }

    let gpp = bidderRequest.gppConsent;
    if (bidderRequest && gpp) {
      let isValidConsentString = typeof gpp.gppString === 'string';
      let validateApplicableSections =
        Array.isArray(gpp.applicableSections) &&
        gpp.applicableSections.every((section) => typeof (section) === 'number')
      payload.gpp = {
        consentString: isValidConsentString ? gpp.gppString : '',
        applicableSectionIds: validateApplicableSections ? gpp.applicableSections : [],
      };
    }

    let gdpr = bidderRequest.gdprConsent;
    if (bidderRequest && gdpr) {
      let isCmp = typeof gdpr.gdprApplies === 'boolean';
      let isConsentString = typeof gdpr.consentString === 'string';
      let status = isCmp
        ? findGdprStatus(gdpr.gdprApplies, gdpr.vendorData)
        : gdprStatus.CMP_NOT_FOUND_OR_ERROR;
      payload.gdpr_iab = {
        consent: isConsentString ? gdpr.consentString : '',
        status: status,
        apiVersion: gdpr.apiVersion
      };
    }

    if (bidderRequest && bidderRequest.uspConsent) {
      payload.us_privacy = bidderRequest.uspConsent;
    }

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
      data: payloadString
    };
  },
  /**
   * Unpack the response from the server into a list of bids.
   *
   * @param {*} serverResponse A successful response from the server.
   * @return {Bid[]} An array of bids which were nested inside the server.
   */
  interpretResponse: function (serverResponse, bidderRequest) {
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
        ttl: bid.ttl,
        meta: {
          advertiserDomains: bid && bid.adomain ? bid.adomain : [],
        },
        ad: bid.ad,
        requestId: bid.bidId,
        creativeId: bid.creativeId,
        gbPlacementId: bid.gbPlacementId,
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

/**
 *
 * @param validBidRequests an array of bids
 * @returns {{sharedViewerIdKey : 'sharedViewerIdValue'}} object with all sharedviewerids
 */
function getSharedViewerIdParameters(validBidRequests) {
  const sharedViewerIdMapping = {
    unifiedId2: 'uid2.id', // uid2IdSystem
    liveRampId: 'idl_env', // identityLinkIdSystem
    lotamePanoramaId: 'lotamePanoramaId', // lotamePanoramaIdSystem
    id5Id: 'id5id.uid', // id5IdSystem
    criteoId: 'criteoId', // criteoIdSystem
    yahooConnectId: 'connectId', // connectIdSystem
    quantcastId: 'quantcastId', // quantcastIdSystem
    epsilonPublisherLinkId: 'publinkId', // publinkIdSystem
    publisherFirstPartyViewerId: 'pubcid', // sharedIdSystem
    merkleId: 'merkleId.id', // merkleIdSystem
    kinessoId: 'kpuid' // kinessoIdSystem
  }

  let sharedViewerIdObject = {};
  for (const sharedViewerId in sharedViewerIdMapping) {
    const key = sharedViewerIdMapping[sharedViewerId];
    const value = deepAccess(validBidRequests, `0.userId.${key}`);
    if (value) {
      sharedViewerIdObject[sharedViewerId] = value;
    }
  }
  return sharedViewerIdObject;
}

function getReferrerInfo(bidderRequest) {
  let ref = '';
  if (bidderRequest && bidderRequest.refererInfo && bidderRequest.refererInfo.page) {
    ref = bidderRequest.refererInfo.page;
  }
  return ref;
}

function getPageTitle() {
  try {
    const ogTitle = window.top.document.querySelector('meta[property="og:title"]')

    return window.top.document.title || (ogTitle && ogTitle.content) || '';
  } catch (e) {
    const ogTitle = document.querySelector('meta[property="og:title"]')

    return document.title || (ogTitle && ogTitle.content) || '';
  }
}

function getPageDescription() {
  let element;

  try {
    element = window.top.document.querySelector('meta[name="description"]') ||
      window.top.document.querySelector('meta[property="og:description"]')
  } catch (e) {
    element = document.querySelector('meta[name="description"]') ||
      document.querySelector('meta[property="og:description"]')
  }

  return (element && element.content) || '';
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

function buildRequestObject(bid) {
  const reqObj = {};
  let gbPlacementId = getValue(bid.params, 'gbPlacementId');
  const gpid = deepAccess(bid, 'ortb2Imp.ext.gpid');
  reqObj.sizes = getSizes(bid);
  reqObj.bidId = getBidIdParameter('bidId', bid);
  reqObj.bidderRequestId = getBidIdParameter('bidderRequestId', bid);
  reqObj.gbPlacementId = parseInt(gbPlacementId, 10);
  reqObj.adUnitCode = getBidIdParameter('adUnitCode', bid);
  reqObj.transactionId = bid.ortb2Imp?.ext?.tid || '';
  if (gpid) { reqObj.gpid = gpid; }
  return reqObj;
}

function getSizes(bid) {
  return parseSizesInput(concatSizes(bid));
}

function concatSizes(bid) {
  let bannerSizes = deepAccess(bid, 'mediaTypes.banner.sizes');

  if (isArray(bannerSizes)) {
    let mediaTypesSizes = [bannerSizes];
    return mediaTypesSizes
      .reduce(function (acc, currSize) {
        if (isArray(currSize)) {
          if (isArray(currSize[0])) {
            currSize.forEach(function (childSize) {
              acc.push(childSize);
            })
          } else {
            acc.push(currSize);
          }
        }
        return acc;
      }, []);
  } else {
    return bid.sizes;
  }
}

function _validateId(id) {
  return (parseInt(id) > 0);
}

registerBidder(spec);
