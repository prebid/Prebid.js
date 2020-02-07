import * as utils from '../src/utils';
import * as url from '../src/url';
import { registerBidder } from '../src/adapters/bidderFactory';
import { BANNER } from '../src/mediaTypes';
import { config } from '../src/config';

const BIDDER_CODE = 'nafdigital';
const URL = 'https://nafdigitalbidder.com/hb';

export const spec = {
  code: BIDDER_CODE,
  supportedMediaTypes: [BANNER],
  isBidRequestValid,
  buildRequests,
  interpretResponse,
  getUserSyncs
};

function buildRequests(bidReqs, bidderRequest) {
  try {
    let referrer = '';
    if (bidderRequest && bidderRequest.refererInfo) {
      referrer = bidderRequest.refererInfo.referer;
    }
    const nafdigitalImps = [];
    const publisherId = utils.getBidIdParameter('publisherId', bidReqs[0].params);
    utils._each(bidReqs, function (bid) {
      bid.sizes = ((utils.isArray(bid.sizes) && utils.isArray(bid.sizes[0])) ? bid.sizes : [bid.sizes]);
      bid.sizes = bid.sizes.filter(size => utils.isArray(size));
      const processedSizes = bid.sizes.map(size => ({w: parseInt(size[0], 10), h: parseInt(size[1], 10)}));

      const element = document.getElementById(bid.adUnitCode);
      const minSize = _getMinSize(processedSizes);
      const viewabilityAmount = _isViewabilityMeasurable(element)
        ? _getViewability(element, utils.getWindowTop(), minSize)
        : 'na';
      const viewabilityAmountRounded = isNaN(viewabilityAmount) ? viewabilityAmount : Math.round(viewabilityAmount);

      const imp = {
        id: bid.bidId,
        banner: {
          format: processedSizes,
          ext: {
            viewability: viewabilityAmountRounded
          }
        },
        tagid: String(bid.adUnitCode)
      };
      const bidFloor = utils.getBidIdParameter('bidFloor', bid.params);
      if (bidFloor) {
        imp.bidfloor = bidFloor;
      }
      nafdigitalImps.push(imp);
    });
    const nafdigitalBidReq = {
      id: utils.getUniqueIdentifierStr(),
      imp: nafdigitalImps,
      site: {
        domain: url.parse(referrer).host,
        page: referrer,
        publisher: {
          id: publisherId
        }
      },
      device: {
        devicetype: _getDeviceType(),
        w: screen.width,
        h: screen.height
      },
      tmax: config.getConfig('bidderTimeout')
    };

    return {
      method: 'POST',
      url: URL,
      data: JSON.stringify(nafdigitalBidReq),
      options: {contentType: 'text/plain', withCredentials: false}
    };
  } catch (e) {
    utils.logError(e, {bidReqs, bidderRequest});
  }
}

function isBidRequestValid(bid) {
  if (bid.bidder !== BIDDER_CODE || typeof bid.params === 'undefined') {
    return false;
  }

  if (typeof bid.params.publisherId === 'undefined') {
    return false;
  }

  return true;
}

function interpretResponse(serverResponse) {
  if (!serverResponse.body || typeof serverResponse.body != 'object') {
    utils.logWarn('NAF digital server returned empty/non-json response: ' + JSON.stringify(serverResponse.body));
    return [];
  }
  const { body: {id, seatbid} } = serverResponse;
  try {
    const nafdigitalBidResponses = [];
    if (id &&
      seatbid &&
      seatbid.length > 0 &&
      seatbid[0].bid &&
      seatbid[0].bid.length > 0) {
      seatbid[0].bid.map(nafdigitalBid => {
        nafdigitalBidResponses.push({
          requestId: nafdigitalBid.impid,
          cpm: parseFloat(nafdigitalBid.price),
          width: parseInt(nafdigitalBid.w),
          height: parseInt(nafdigitalBid.h),
          creativeId: nafdigitalBid.crid || nafdigitalBid.id,
          currency: 'USD',
          netRevenue: true,
          mediaType: BANNER,
          ad: _getAdMarkup(nafdigitalBid),
          ttl: 60
        });
      });
    }
    return nafdigitalBidResponses;
  } catch (e) {
    utils.logError(e, {id, seatbid});
  }
}

// Don't do user sync for now
function getUserSyncs(syncOptions, responses, gdprConsent) {
  return [];
}

function _isMobile() {
  return (/(ios|ipod|ipad|iphone|android)/i).test(navigator.userAgent);
}

function _isConnectedTV() {
  return (/(smart[-]?tv|hbbtv|appletv|googletv|hdmi|netcast\.tv|viera|nettv|roku|\bdtv\b|sonydtv|inettvbrowser|\btv\b)/i).test(navigator.userAgent);
}

function _getDeviceType() {
  return _isMobile() ? 1 : _isConnectedTV() ? 3 : 2;
}

function _getAdMarkup(bid) {
  let adm = bid.adm;
  if ('nurl' in bid) {
    adm += utils.createTrackPixelHtml(bid.nurl);
  }
  return adm;
}

function _isViewabilityMeasurable(element) {
  return !_isIframe() && element !== null;
}

function _getViewability(element, topWin, { w, h } = {}) {
  return utils.getWindowTop().document.visibilityState === 'visible'
    ? _getPercentInView(element, topWin, { w, h })
    : 0;
}

function _isIframe() {
  try {
    return utils.getWindowSelf() !== utils.getWindowTop();
  } catch (e) {
    return true;
  }
}

function _getMinSize(sizes) {
  return sizes.reduce((min, size) => size.h * size.w < min.h * min.w ? size : min);
}

function _getBoundingBox(element, { w, h } = {}) {
  let { width, height, left, top, right, bottom } = element.getBoundingClientRect();

  if ((width === 0 || height === 0) && w && h) {
    width = w;
    height = h;
    right = left + w;
    bottom = top + h;
  }

  return { width, height, left, top, right, bottom };
}

function _getIntersectionOfRects(rects) {
  const bbox = {
    left: rects[0].left,
    right: rects[0].right,
    top: rects[0].top,
    bottom: rects[0].bottom
  };

  for (let i = 1; i < rects.length; ++i) {
    bbox.left = Math.max(bbox.left, rects[i].left);
    bbox.right = Math.min(bbox.right, rects[i].right);

    if (bbox.left >= bbox.right) {
      return null;
    }

    bbox.top = Math.max(bbox.top, rects[i].top);
    bbox.bottom = Math.min(bbox.bottom, rects[i].bottom);

    if (bbox.top >= bbox.bottom) {
      return null;
    }
  }

  bbox.width = bbox.right - bbox.left;
  bbox.height = bbox.bottom - bbox.top;

  return bbox;
}

function _getPercentInView(element, topWin, { w, h } = {}) {
  const elementBoundingBox = _getBoundingBox(element, { w, h });

  // Obtain the intersection of the element and the viewport
  const elementInViewBoundingBox = _getIntersectionOfRects([ {
    left: 0,
    top: 0,
    right: topWin.innerWidth,
    bottom: topWin.innerHeight
  }, elementBoundingBox ]);

  let elementInViewArea, elementTotalArea;

  if (elementInViewBoundingBox !== null) {
    // Some or all of the element is in view
    elementInViewArea = elementInViewBoundingBox.width * elementInViewBoundingBox.height;
    elementTotalArea = elementBoundingBox.width * elementBoundingBox.height;

    return ((elementInViewArea / elementTotalArea) * 100);
  }

  // No overlap between element and the viewport; therefore, the element
  // lies completely out of view
  return 0;
}

registerBidder(spec);
