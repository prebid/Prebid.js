import {registerBidder} from '../src/adapters/bidderFactory.js';
import {BANNER, VIDEO} from '../src/mediaTypes.js';
import {getAdUnitSizes} from '../libraries/sizeUtils/sizeUtils.js';
import { deepClone, logError, deepAccess } from '../src/utils.js';
import { config } from '../src/config.js';

/**
 * @typedef {import('../src/adapters/bidderFactory.js').BidRequest} BidRequest
 * @typedef {import('../src/adapters/bidderFactory.js').Bid} Bid
 * @typedef {import('../src/adapters/bidderFactory.js').ServerResponse} ServerResponse
 */

const BIDDER_CODE = 'vdoai';
const ENDPOINT_URL = 'https://prebid-v2.vdo.ai/auction';

function getFrameNesting() {
  let topmostFrame = window;
  let parent = window.parent;
  try {
    while (topmostFrame !== topmostFrame.parent) {
      parent = topmostFrame.parent;
      // eslint-disable-next-line no-unused-expressions
      parent.location.href;
      topmostFrame = topmostFrame.parent;
    }
  } catch (e) { }
  return topmostFrame;
}

/**
 * Returns information about the page needed by the server in an object to be converted in JSON
 *
 * @returns {{location: *, referrer: (*|string), stack: (*|Array.<String>), numIframes: (*|Number), wWidth: (*|Number), wHeight: (*|Number), sWidth, sHeight, date: string, timeOffset: number}}
 */
function getPageInfo(bidderRequest) {
  const topmostFrame = getFrameNesting();
  return {
    referrer: deepAccess(bidderRequest, 'refererInfo.ref', null),
    stack: deepAccess(bidderRequest, 'refererInfo.stack', []),
    numIframes: deepAccess(bidderRequest, 'refererInfo.numIframes', 0),
    wWidth: topmostFrame.innerWidth,
    location: deepAccess(bidderRequest, 'refererInfo.page', null),
    wHeight: topmostFrame.innerHeight,
    aWidth: topmostFrame.screen.availWidth,
    aHeight: topmostFrame.screen.availHeight,
    oWidth: topmostFrame.outerWidth,
    oHeight: topmostFrame.outerHeight,
    sWidth: topmostFrame.screen.width,
    sHeight: topmostFrame.screen.height,
    sLeft: 'screenLeft' in topmostFrame ? topmostFrame.screenLeft : topmostFrame.screenX,
    sTop: 'screenTop' in topmostFrame ? topmostFrame.screenTop : topmostFrame.screenY,
    xOffset: topmostFrame.pageXOffset,
    docHeight: topmostFrame.document.body ? topmostFrame.document.body.scrollHeight : null,
    hLength: history.length,
    yOffset: topmostFrame.pageYOffset,
    version: {
      prebid_version: '$prebid.version$',
      adapter_version: '1.0.0',
      vendor: '$$PREBID_GLOBAL$$',
    }
  };
}

export function isSchainValid(schain) {
  let isValid = false;
  const requiredFields = ['asi', 'sid', 'hp'];
  if (!schain || !schain.nodes) return isValid;
  isValid = schain.nodes.reduce((status, node) => {
    if (!status) return status;
    return requiredFields.every(field => node.hasOwnProperty(field));
  }, true);
  if (!isValid) {
    logError('VDO.AI: required schain params missing');
  }
  return isValid;
}

function parseVideoSize(bid) {
  const playerSize = bid.mediaTypes.video.playerSize;
  if (typeof playerSize !== 'undefined' && Array.isArray(playerSize) && playerSize.length > 0) {
    return getSizes(playerSize)
  }
  return [];
}

function getSizes(sizes) {
  const ret = [];
  for (let i = 0; i < sizes.length; i++) {
    const size = sizes[i];
    ret.push({ width: size[0], height: size[1] })
  }
  return ret;
}

export const spec = {
  code: BIDDER_CODE,
  supportedMediaTypes: [BANNER, VIDEO],
  /**
   * Determines whether or not the given bid request is valid.
   *
   * @param {BidRequest} bid The bid params to validate.
   * @return boolean True if this is a valid bid, and false otherwise.
   */
  isBidRequestValid: function (bid) {
    return !!(bid.params.placementId) && typeof bid.params.placementId === 'string';
  },

  /**
   * Make a server request from the list of BidRequests.
   *
   * @return Array Info describing the request to the server.
   * @param validBidRequests
   * @param bidderRequest
   */

  buildRequests: function (validBidRequests, bidderRequest) {
    if (validBidRequests.length === 0) {
      return [];
    }
    return validBidRequests.map(bidRequest => {
      const sizes = getAdUnitSizes(bidRequest);
      let payload = {
        placementId: bidRequest.params.placementId,
        sizes: sizes,
        bidId: bidRequest.bidId,
        mediaType: bidRequest.mediaTypes.video ? 'video' : 'banner',
        domain: bidderRequest.ortb2.site.domain,
        publisherDomain: bidderRequest.ortb2.site.publisher.domain,
        adUnitCode: bidRequest.adUnitCode,
        bidder: bidRequest.bidder,
        tmax: bidderRequest.timeout
      };

      payload.bidderRequestId = bidRequest.bidderRequestId;
      payload.auctionId = deepAccess(bidRequest, 'ortb2.source.tid');
      payload.transactionId = deepAccess(bidRequest, 'ortb2Imp.ext.tid');
      payload.gpid = deepAccess(bidRequest, 'ortb2Imp.ext.gpid') || deepAccess(bidRequest, 'ortb2Imp.ext.data.pbadslot');
      payload.ortb2Imp = deepAccess(bidRequest, 'ortb2Imp');

      if (payload.mediaType === 'video') {
        payload.context = bidRequest.mediaTypes.video.context;
        payload.playerSize = parseVideoSize(bidRequest);
        payload.mediaTypeInfo = deepClone(bidRequest.mediaTypes.video);
      }

      if (typeof bidRequest.getFloor === 'function') {
        let floor = bidRequest.getFloor({
          currency: 'USD',
          mediaType: '*',
          size: '*'
        });
        if (floor && floor.floor && floor.currency === 'USD') {
          payload.bidFloor = floor.floor;
        }
      } else if (bidRequest.params.bidFloor) {
        payload.bidFloor = bidRequest.params.bidFloor;
      }

      payload.pageInfo = getPageInfo(bidderRequest);

      if (bidderRequest && bidderRequest.gdprConsent) {
        payload.gdprConsent = {
          consentRequired: bidderRequest.gdprConsent.gdprApplies,
          consentString: bidderRequest.gdprConsent.consentString,
          addtlConsent: bidderRequest.gdprConsent.addtlConsent
        };
      }
      if (bidderRequest && bidderRequest.gppConsent) {
        payload.gppConsent = {
          applicableSections: bidderRequest.gppConsent.applicableSections,
          consentString: bidderRequest.gppConsent.gppString,
        }
      }
      if (bidderRequest && bidderRequest.ortb2) {
        payload.ortb2 = bidderRequest.ortb2;
      }
      if (bidderRequest && bidderRequest.uspConsent) {
        payload.usPrivacy = bidderRequest.uspConsent;
      }
      if (validBidRequests && validBidRequests.length !== 0 && validBidRequests[0].schain && isSchainValid(validBidRequests[0].schain)) {
        payload.schain = validBidRequests[0].schain;
      }
      if (validBidRequests && validBidRequests.length !== 0 && validBidRequests[0].userIdAsEids) {
        payload.userId = validBidRequests[0].userIdAsEids;
      }
      let coppaOrtb2 = !!deepAccess(bidderRequest, 'ortb2.regs.coppa');
      let coppaConfig = config.getConfig('coppa');
      if (coppaOrtb2 === true || coppaConfig === true) {
        payload.coppa = true;
      }
      return {
        method: 'POST',
        url: ENDPOINT_URL,
        data: payload
      };
    });
  },

  /**
   * Unpack the response from the server into a list of bids.
   *
   * @param {ServerResponse} serverResponse A successful response from the server.
   * @param bidRequest
   * @return {Bid[]} An array of bids which were nested inside the server.
   */
  interpretResponse: function (serverResponse, bidRequest) {
    const bidResponses = [];
    const response = serverResponse.body;
    const creativeId = response.adid || 0;
    const width = response.w;
    const height = response.h;
    const cpm = response.price || 0;

    const adCreative = response.vdoCreative;

    if (width !== 0 && height !== 0 && cpm !== 0 && creativeId !== 0) {
      const currency = response.cur || 'USD';
      const netRevenue = true;
      const bidResponse = {
        requestId: response.bidId,
        cpm: cpm,
        width: width,
        height: height,
        creativeId: creativeId,
        currency: currency,
        netRevenue: netRevenue,
        ttl: 60,
        mediaType: response.mediaType
      };

      if (response.mediaType == 'video') {
        bidResponse.vastXml = adCreative;
      } else {
        bidResponse.ad = adCreative;
      }
      if (response.adomain) {
        bidResponse.meta = {
          advertiserDomains: response.adomain
        };
      }
      bidResponses.push(bidResponse);
    }

    return bidResponses;
  },

  getUserSyncs: function(syncOptions, serverResponse) {
    let syncUrls = serverResponse[0] && serverResponse[0].body && serverResponse[0].body.cookiesync && serverResponse[0].body.cookiesync.bidder_status;

    if (syncOptions.iframeEnabled && syncUrls && syncUrls.length > 0) {
      let prebidSyncUrls = syncUrls.map(syncObj => {
        return {
          url: syncObj.usersync.url,
          type: 'iframe'
        }
      })
      return prebidSyncUrls;
    }
    return [];
  },

  onTimeout: function(data) {},
  onBidWon: function(bid) {},
  onSetTargeting: function(bid) {}
};
registerBidder(spec);
