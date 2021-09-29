import {registerBidder} from '../src/adapters/bidderFactory.js';
import { getStorageManager } from '../src/storageManager.js';
import { BANNER, NATIVE } from '../src/mediaTypes.js';
import * as utils from '../src/utils.js';

const storageManager = getStorageManager();

/**
 * Determines whether or not the given bid response is valid.
 *
 * @param {object} bidResponse The bid response to validate.
 * @return boolean True if this is a valid bid response, and false if it is not valid.
 */
function isBidResponseValid(bidResponse) {
  let requiredKeys = ['requestId', 'cpm', 'ttl', 'creativeId', 'netRevenue', 'currency'];

  switch (bidResponse.mediaType) {
    case BANNER:
      requiredKeys = requiredKeys.concat(['width', 'height', 'ad']);
      break;
    case NATIVE:
      if (!bidResponse.native.hasOwnProperty('impressionTrackers')) {
        return false
      }
      break;
    default:
      return false
  }

  for (const key of requiredKeys) {
    if (!bidResponse.hasOwnProperty(key)) {
      return false
    }
  }

  return true
}

export const spec = {
  code: 'orbidder',
  gvlid: 559,
  hostname: 'https://orbidder.otto.de',
  supportedMediaTypes: [BANNER, NATIVE],

  /**
   * Returns a customzied hostname if 'ov_orbidder_host' is set in the browser's local storage.
   * This is only used for integration testing.
   *
   * @return The hostname bid requests should be sent to.
   */
  getHostname() {
    let ret = this.hostname;
    try {
      ret = storageManager.getDataFromLocalStorage('ov_orbidder_host') || ret;
    } catch (e) {
    }
    return ret;
  },

  /**
   * Determines whether or not the given bid request is valid.
   *
   * @param {object} bid The bid to validate.
   * @return boolean True if this is a valid bid, and false if it is not valid.
   */
  isBidRequestValid(bid) {
    return !!(bid.sizes && bid.bidId && bid.params &&
      (bid.params.accountId && (typeof bid.params.accountId === 'string')) &&
      (bid.params.placementId && (typeof bid.params.placementId === 'string')) &&
      ((typeof bid.params.profile === 'undefined') || (typeof bid.params.profile === 'object')));
  },

  /**
   * Build a request from the list of valid BidRequests that will be sent by prebid to the orbidder /bid endpoint, i.e. the server.
   *
   * @param {BidRequest[]} validBidRequests A non-empty list of valid bid requests that should be sent to the orbidder /bid endpoint,
   * i.e. the server.
   * @return The requests for the orbidder /bid endpoint, i.e. the server.
   */
  buildRequests(validBidRequests, bidderRequest) {
    const hostname = this.getHostname();
    return validBidRequests.map((bidRequest) => {
      let referer = '';
      if (bidderRequest && bidderRequest.refererInfo) {
        referer = bidderRequest.refererInfo.referer || '';
      }

      bidRequest.params.bidfloor = getBidFloor(bidRequest);

      let bannerVisibilityScore;
      if (bidRequest.mediaTypes.banner) {
        try {
          const maxAreaSize = bidRequest.sizes.reduce((p, v) => p[0] * p[1] < v[0] * v[1] ? v : p)
          bannerVisibilityScore = estimateVisibility(bidRequest.adUnitCode, maxAreaSize[0], maxAreaSize[1]);
        } catch (e) {
          bannerVisibilityScore = -1;
          utils.logWarn('error while estimating visibility, ', e);
        }
      }

      let httpReq = {
        url: `${hostname}/bid`,
        method: 'POST',
        options: { withCredentials: true },
        data: {
          v: $$PREBID_GLOBAL$$.version,
          pageUrl: referer,
          bidId: bidRequest.bidId,
          auctionId: bidRequest.auctionId,
          transactionId: bidRequest.transactionId,
          adUnitCode: bidRequest.adUnitCode,
          bidRequestCount: bidRequest.bidRequestCount,
          params: bidRequest.params,
          sizes: bidRequest.sizes,
          mediaTypes: bidRequest.mediaTypes
        }
      };

      if (typeof bannerVisibilityScore !== 'undefined') {
        httpReq.data.visibilityScore = bannerVisibilityScore
      }

      if (bidderRequest && bidderRequest.gdprConsent) {
        httpReq.data.gdprConsent = {
          consentString: bidderRequest.gdprConsent.consentString,
          consentRequired: (typeof bidderRequest.gdprConsent.gdprApplies === 'boolean') && bidderRequest.gdprConsent.gdprApplies
        };
      }
      return httpReq;
    });
  },

  /**
   * Unpack the response from the orbidder /bid endpoint into a list of bids.
   *
   * @param {*} serverResponse A successful response from the orbidder /bid endpoint, i.e. the server.
   * @return {Bid[]} An array of bids from orbidder.
   */
  interpretResponse(serverResponse) {
    const bidResponses = [];
    serverResponse = serverResponse.body;
    if (serverResponse && (serverResponse.length > 0)) {
      serverResponse.forEach((bidResponse) => {
        if (isBidResponseValid(bidResponse)) {
          if (Array.isArray(bidResponse.advertiserDomains)) {
            bidResponse.meta = {
              advertiserDomains: bidResponse.advertiserDomains
            }
          }
          bidResponses.push(bidResponse);
        }
      });
    }
    return bidResponses;
  },
};

/**
 * Get bid floor from Price Floors Module
 * @param {Object} bid
 * @returns {float||undefined}
 */
function getBidFloor(bid) {
  if (!utils.isFn(bid.getFloor)) {
    return bid.params.bidfloor;
  }

  const floor = bid.getFloor({
    currency: 'EUR',
    mediaType: '*',
    size: '*'
  });
  if (utils.isPlainObject(floor) && !isNaN(floor.floor) && floor.currency === 'EUR') {
    return floor.floor;
  }
  return undefined;
}

registerBidder(spec);

/**
 * Tries to measure the visibility of an adUnit.
 *
 * @param {string} adUnitCode the adUnit's unique code.
 * @param {number} w the adUnit's with.
 * @param {number} h the adUnit's height.
 * @return {number} visibilityScore between 0 and 100. Higher values indicate a better visibility. Negative values indicate that
 * the googletag is not ready (-2) or that the visibility is not measurable (-3).
 */
function estimateVisibility(adUnitCode, w, h) {
  if (!window.googletag.apiReady && !utils.isGptPubadsDefined()) {
    return -2
  }

  const adElementId = getGptSlotElementIdAdUnitCode(adUnitCode);
  const adElement = document.getElementById(adElementId)

  if (!isVisibilityMeasurable(adElement)) {
    return -3
  }

  return estimatePercentInView(adElement, w, h)
}

/**
 * Determines if the visibility is measureable.
 *
 * @param {object} element the adUnit element
 * @return boolean True if the visibility is measurable.
 */
function isVisibilityMeasurable(element) {
  return !windowIsNotVisible() && !inIframe() && (typeof element !== 'undefined');
}

/**
 * Determines if the customers window is visible or not.
 *
 * @return boolean True if the window is not visible.
 */
function windowIsNotVisible() {
  try {
    if (typeof window.document.hidden !== 'undefined') {
      return window.document.hidden;
    } else if (typeof window.document['msHidden'] !== 'undefined') {
      return window.document['msHidden'];
    } else if (typeof window.document['webkitHidden'] !== 'undefined') {
      return window.document['webkitHidden'];
    } else {
      return true;
    }
  } catch (e) {
    return true;
  }
}

/**
 * Estimates how much percent of the adUnit's area are in the visible area of the screen.
 *
 * @param {object} element the adUnit element.
 * @param {number} element the adUnit's width.
 * @param {number} element the adUnit's height.
 * @return {number} estimate how much percent of the element is in the visible area of the screen.
 */
function estimatePercentInView(element, w, h) {
  if (w == 0 || h == 0) {
    return 0
  }

  const elementRect = getRect(element, w, h);

  const overlappingRect = elementOverlapWithViewport(elementRect);

  let elementInViewArea, elementTotalArea;

  if (overlappingRect !== null) {
    // element is inside viewport
    elementInViewArea = overlappingRect.width * overlappingRect.height;
    elementTotalArea = elementRect.width * elementRect.height;

    return (elementInViewArea / elementTotalArea) * 100;
  }

  // no overlap between rect and the viewport
  return 0;
}

/**
 * Returns the elements bounding rectangle.
 *
 * @param {object} element the adUnit element.
 * @param {number} element the adUnit's width.
 * @param {number} element the adUnit's height.
 * @return {object} width, height, left, top, right, bottom of the elements bounding rectangle.
 */
function getRect(element, w, h) {
  let { width, height, left, top, right, bottom } = element.getBoundingClientRect();

  if ((width === 0 || height === 0) && w && h) {
    width = w;
    height = h;
    right = left + w;
    bottom = top + h;
  }

  return { width, height, left, top, right, bottom };
}

/**
 * Returns the rectangle of the overlap between adUnit element and viewport.
 *
 * @param {object} elementRect the adUnit element bounding rectangle.
 * @return {object} width, height, left, top, right, bottom of the overlapping rectangle.
 */
function elementOverlapWithViewport(elementRect) {
  const viewport = {
    left: 0,
    top: 0,
    right: Math.max(window.innerWidth || 0, document.documentElement.clientWidth || 0),
    bottom: Math.max(window.innerHeight || 0, document.documentElement.clientHeight || 0),
  };

  let overlapingRect = {};

  overlapingRect.left = Math.max(viewport.left, elementRect.left);
  overlapingRect.right = Math.min(viewport.right, elementRect.right);

  if (overlapingRect.left >= overlapingRect.right || overlapingRect.right < 0) {
    return null;
  }

  overlapingRect.top = Math.max(viewport.top, elementRect.top);
  overlapingRect.bottom = Math.min(viewport.bottom, elementRect.bottom);

  if (
    overlapingRect.top >= overlapingRect.bottom ||
    overlapingRect.bottom < 0
  ) {
    return null;
  }

  overlapingRect.width = overlapingRect.right - overlapingRect.left;
  overlapingRect.height = overlapingRect.bottom - overlapingRect.top;

  return overlapingRect;
}

/**
 * Returns the elements bounding rectangle.
 *
 * @return {boolean} True if view is inside an iframe.
 */
function inIframe() {
  try {
    return window.self !== window.top;
  } catch (e) {
    return true;
  }
}

/**
 * Returns the adUnit's element id.
 *
 * @param {string} element the adUnit's code.
 * @return {string} id of the adUnit element.
 */
function getGptSlotElementIdAdUnitCode(adUnitCode) {
  for (let slot of window.googletag.pubads().getSlots()) {
    if (slot.getAdUnitPath().includes(adUnitCode) || slot.getSlotElementId().includes(adUnitCode)) {
      return slot.getSlotElementId()
    }
  }
}
