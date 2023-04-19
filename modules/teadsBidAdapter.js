import { getValue, logError, deepAccess, getBidIdParameter, parseSizesInput, isArray } from '../src/utils.js';
import {registerBidder} from '../src/adapters/bidderFactory.js';
import {getStorageManager} from '../src/storageManager.js';

const BIDDER_CODE = 'teads';
const GVL_ID = 132;
const ENDPOINT_URL = 'https://a.teads.tv/hb/bid-request';
const gdprStatus = {
  GDPR_APPLIES_PUBLISHER: 12,
  GDPR_APPLIES_GLOBAL: 11,
  GDPR_DOESNT_APPLY: 0,
  CMP_NOT_FOUND_OR_ERROR: 22
};
const FP_TEADS_ID_COOKIE_NAME = '_tfpvi';
export const storage = getStorageManager({bidderCode: BIDDER_CODE});

export const spec = {
  code: BIDDER_CODE,
  gvlid: GVL_ID,
  supportedMediaTypes: ['video', 'banner'],
  /**
   * Determines whether or not the given bid request is valid.
   *
   * @param {BidRequest} bid The bid params to validate.
   * @return boolean True if this is a valid bid, and false otherwise.
   */
  isBidRequestValid: function(bid) {
    let isValid = false;
    if (typeof bid.params !== 'undefined') {
      let isValidPlacementId = _validateId(getValue(bid.params, 'placementId'));
      let isValidPageId = _validateId(getValue(bid.params, 'pageId'));
      isValid = isValidPlacementId && isValidPageId;
    }

    if (!isValid) {
      logError('Teads placementId and pageId parameters are required. Bid aborted.');
    }
    return isValid;
  },
  /**
   * Make a server request from the list of BidRequests.
   *
   * @param {validBidRequests[]} an array of bids
   * @return ServerRequest Info describing the request to the server.
   */
  buildRequests: function(validBidRequests, bidderRequest) {
    const bids = validBidRequests.map(buildRequestObject);

    const payload = {
      referrer: getReferrerInfo(bidderRequest),
      pageReferrer: document.referrer,
      networkBandwidth: getConnectionDownLink(window.navigator),
      timeToFirstByte: getTimeToFirstByte(window),
      data: bids,
      deviceWidth: screen.width,
      hb_version: '$prebid.version$',
      ...getSharedViewerIdParameters(validBidRequests),
      ...getFirstPartyTeadsIdParameter(validBidRequests)
    };

    const firstBidRequest = validBidRequests[0];

    if (firstBidRequest.schain) {
      payload.schain = firstBidRequest.schain;
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
  interpretResponse: function(serverResponse, bidderRequest) {
    const bidResponses = [];
    serverResponse = serverResponse.body;

    if (serverResponse.responses) {
      serverResponse.responses.forEach(function (bid) {
        const bidResponse = {
          cpm: bid.cpm,
          width: bid.width,
          height: bid.height,
          currency: bid.currency,
          netRevenue: true,
          ttl: bid.ttl,
          meta: {
            advertiserDomains: bid && bid.adomain ? bid.adomain : []
          },
          ad: bid.ad,
          requestId: bid.bidId,
          creativeId: bid.creativeId,
          placementId: bid.placementId
        };
        if (bid.dealId) {
          bidResponse.dealId = bid.dealId
        }
        bidResponses.push(bidResponse);
      });
    }
    return bidResponses;
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
  let placementId = getValue(bid.params, 'placementId');
  let pageId = getValue(bid.params, 'pageId');
  const gpid = deepAccess(bid, 'ortb2Imp.ext.gpid');

  reqObj.sizes = getSizes(bid);
  reqObj.bidId = getBidIdParameter('bidId', bid);
  reqObj.bidderRequestId = getBidIdParameter('bidderRequestId', bid);
  reqObj.placementId = parseInt(placementId, 10);
  reqObj.pageId = parseInt(pageId, 10);
  reqObj.adUnitCode = getBidIdParameter('adUnitCode', bid);
  reqObj.auctionId = getBidIdParameter('auctionId', bid);
  reqObj.transactionId = getBidIdParameter('transactionId', bid);
  if (gpid) { reqObj.gpid = gpid; }
  return reqObj;
}

function getSizes(bid) {
  return parseSizesInput(concatSizes(bid));
}

function concatSizes(bid) {
  let playerSize = deepAccess(bid, 'mediaTypes.video.playerSize');
  let videoSizes = deepAccess(bid, 'mediaTypes.video.sizes');
  let bannerSizes = deepAccess(bid, 'mediaTypes.banner.sizes');

  if (isArray(bannerSizes) || isArray(playerSize) || isArray(videoSizes)) {
    let mediaTypesSizes = [bannerSizes, videoSizes, playerSize];
    return mediaTypesSizes
      .reduce(function(acc, currSize) {
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

/**
 * Get the first-party cookie Teads ID parameter to be sent in bid request.
 * @param validBidRequests an array of bids
 * @returns `{} | {firstPartyCookieTeadsId: string}`
 */
function getFirstPartyTeadsIdParameter(validBidRequests) {
  const firstPartyTeadsIdFromUserIdModule = deepAccess(validBidRequests, '0.userId.teadsId');

  if (firstPartyTeadsIdFromUserIdModule) {
    return {firstPartyCookieTeadsId: firstPartyTeadsIdFromUserIdModule};
  }

  if (storage.cookiesAreEnabled(null)) {
    const firstPartyTeadsIdFromCookie = storage.getCookie(FP_TEADS_ID_COOKIE_NAME, null);

    if (firstPartyTeadsIdFromCookie) {
      return {firstPartyCookieTeadsId: firstPartyTeadsIdFromCookie};
    }
  }

  return {};
}

registerBidder(spec);
