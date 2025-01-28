import {registerBidder} from '../src/adapters/bidderFactory.js';
import {BANNER} from '../src/mediaTypes.js';
import {deepAccess, parseSizesInput} from '../src/utils.js';
import {getAdUnitSizes} from '../libraries/sizeUtils/sizeUtils.js';

/**
 * @typedef {import('../src/adapters/bidderFactory.js').BidRequest} BidRequest
 * @typedef {import('../src/adapters/bidderFactory.js').Bid} Bid
 * @typedef {import('../src/adapters/bidderFactory.js').ServerResponse} ServerResponse
 * @typedef {import('../src/adapters/bidderFactory.js').SyncOptions} SyncOptions
 * @typedef {import('../src/adapters/bidderFactory.js').UserSync} UserSync
 * @typedef {import('../src/adapters/bidderFactory.js').validBidRequests} validBidRequests
 */

const BIDDER_CODE = 'optidigital';
const GVL_ID = 915;
const ENDPOINT_URL = 'https://pbs.optidigital.com/bidder';
const USER_SYNC_URL_IFRAME = 'https://scripts.opti-digital.com/js/presync.html?endpoint=optidigital';
let CUR = 'USD';
let isSynced = false;

export const spec = {
  code: BIDDER_CODE,
  gvlid: GVL_ID,
  supportedMediaTypes: [BANNER],
  /**
   * Determines whether or not the given bid request is valid.
   *
   * @param {BidRequest} bid The bid params to validate.
   * @return boolean True if this is a valid bid, and false otherwise.
   */
  isBidRequestValid: function(bid) {
    let isValid = false;
    if (typeof bid.params !== 'undefined' && bid.params.placementId && bid.params.publisherId) {
      isValid = true;
    }

    return isValid;
  },
  /**
   * Make a server request from the list of BidRequests.
   *
   * @param {validBidRequests[]} - an array of bids
   * @return ServerRequest Info describing the request to the server.
   */
  buildRequests: function(validBidRequests, bidderRequest) {
    if (!validBidRequests || validBidRequests.length === 0 || !bidderRequest || !bidderRequest.bids) {
      return [];
    }

    const ortb2 = bidderRequest.ortb2 || {
      bcat: [],
      badv: []
    };

    const payload = {
      referrer: (bidderRequest.refererInfo && bidderRequest.refererInfo.page) ? bidderRequest.refererInfo.page : '',
      hb_version: '$prebid.version$',
      deviceWidth: document.documentElement.clientWidth,
      bidderRequestId: deepAccess(validBidRequests[0], 'bidderRequestId'),
      publisherId: deepAccess(validBidRequests[0], 'params.publisherId'),
      imp: validBidRequests.map(bidRequest => buildImp(bidRequest, ortb2)),
      badv: ortb2.badv || deepAccess(validBidRequests[0], 'params.badv') || [],
      bcat: ortb2.bcat || deepAccess(validBidRequests[0], 'params.bcat') || [],
      bapp: deepAccess(validBidRequests[0], 'params.bapp') || []
    }

    if (validBidRequests[0].auctionId) {
      payload.auctionId = validBidRequests[0].auctionId;
    }

    if (validBidRequests[0].params.pageTemplate && validBidRequests[0].params.pageTemplate !== '') {
      payload.pageTemplate = validBidRequests[0].params.pageTemplate;
    }

    if (validBidRequests[0].schain) {
      payload.schain = validBidRequests[0].schain;
    }

    const gdpr = deepAccess(bidderRequest, 'gdprConsent');
    if (bidderRequest && gdpr) {
      const isConsentString = typeof gdpr.consentString === 'string';
      payload.gdpr = {
        consent: isConsentString ? gdpr.consentString : '',
        required: true
      };
    }
    if (bidderRequest && !gdpr) {
      payload.gdpr = {
        consent: '',
        required: false
      }
    }

    if (bidderRequest?.gppConsent?.gppString) {
      payload.gpp = {
        consent: bidderRequest.gppConsent.gppString,
        sid: bidderRequest.gppConsent.applicableSections
      }
    } else if (bidderRequest?.ortb2?.regs?.gpp) {
      payload.gpp = {
        consent: bidderRequest.ortb2.regs.gpp,
        sid: bidderRequest.ortb2.regs.gpp_sid
      }
    }

    if (window.location.href.indexOf('optidigitalTestMode=true') !== -1) {
      payload.testMode = true;
    }

    if (bidderRequest && bidderRequest.uspConsent) {
      payload.us_privacy = bidderRequest.uspConsent;
    }

    if (_getEids(validBidRequests[0])) {
      payload.user = {
        eids: _getEids(validBidRequests[0])
      }
    }

    const payloadObject = JSON.stringify(payload);
    return {
      method: 'POST',
      url: ENDPOINT_URL,
      data: payloadObject
    };
  },
  /**
   * Unpack the response from the server into a list of bids.
   *
   * @param {ServerResponse} serverResponse A successful response from the server.
   * @return {Bid[]} An array of bids which were nested inside the server.
   */
  interpretResponse: function(serverResponse, bidRequest) {
    const bidResponses = [];
    serverResponse = serverResponse.body;

    if (serverResponse.bids) {
      serverResponse.bids.forEach((bid) => {
        const bidResponse = {
          placementId: bid.placementId,
          requestId: bid.bidId,
          ttl: bid.ttl,
          creativeId: bid.creativeId,
          currency: bid.cur,
          cpm: bid.cpm,
          width: bid.w,
          height: bid.h,
          ad: bid.adm,
          netRevenue: true,
          meta: {
            advertiserDomains: bid.adomain && bid.adomain.length > 0 ? bid.adomain : []
          }
        };
        bidResponses.push(bidResponse);
      });
    }
    return bidResponses;
  },

  /**
   * Register the user sync pixels which should be dropped after the auction.
   *
   * @param {SyncOptions} syncOptions Which user syncs are allowed?
   * @param {ServerResponse[]} serverResponses List of server's responses.
   * @return {UserSync[]} The user syncs which should be dropped.
   */
  getUserSyncs: function(syncOptions, serverResponses, gdprConsent, uspConsent, gppConsent) {
    let syncurl = '';
    if (!isSynced) {
      // Attaching GDPR Consent Params in UserSync url
      if (gdprConsent) {
        syncurl += '&gdpr=' + (gdprConsent.gdprApplies ? 1 : 0);
        syncurl += '&gdpr_consent=' + encodeURIComponent(gdprConsent.consentString || '');
      }
      if (uspConsent) {
        syncurl += '&us_privacy=' + encodeURIComponent(uspConsent);
      }
      if (gppConsent?.gppString && gppConsent?.applicableSections?.length) {
        syncurl += '&gpp=' + encodeURIComponent(gppConsent.gppString);
        syncurl += '&gpp_sid=' + encodeURIComponent(gppConsent?.applicableSections?.join(','));
      }

      if (syncOptions.iframeEnabled) {
        isSynced = true;
        return [{
          type: 'iframe',
          url: USER_SYNC_URL_IFRAME + syncurl
        }];
      }
    }
  },
};

function buildImp(bidRequest, ortb2) {
  let imp = {};
  imp = {
    sizes: parseSizesInput(deepAccess(bidRequest, 'mediaTypes.banner.sizes')),
    bidId: deepAccess(bidRequest, 'bidId'),
    adUnitCode: deepAccess(bidRequest, 'adUnitCode'),
    transactionId: deepAccess(bidRequest, 'ortb2Imp.ext.tid'),
    placementId: deepAccess(bidRequest, 'params.placementId')
  };

  if (bidRequest.params.divId && bidRequest.params.divId !== '') {
    if (getAdContainer(bidRequest.params.divId)) {
      imp.adContainerWidth = getAdContainer(bidRequest.params.divId).offsetWidth;
      imp.adContainerHeight = getAdContainer(bidRequest.params.divId).offsetHeight;
    }
  }

  let floorSizes = [];
  if (deepAccess(bidRequest, 'mediaTypes.banner')) {
    floorSizes = getAdUnitSizes(bidRequest);
  }

  if (bidRequest.params.currency && bidRequest.params.currency !== '') {
    CUR = bidRequest.params.currency;
  }

  let bidFloor = _getFloor(bidRequest, floorSizes, CUR);
  if (bidFloor) {
    imp.bidFloor = bidFloor;
  }

  let battr = ortb2.battr || deepAccess(bidRequest, 'params.battr');
  if (battr && Array.isArray(battr) && battr.length) {
    imp.battr = battr;
  }

  return imp;
}

function getAdContainer(container) {
  if (document.getElementById(container)) {
    return document.getElementById(container);
  }
}

function _getFloor (bid, sizes, currency) {
  let floor = null;
  let size = sizes.length === 1 ? sizes[0] : '*';
  if (typeof bid.getFloor === 'function') {
    try {
      const floorInfo = bid.getFloor({
        currency: currency,
        mediaType: 'banner',
        size: size
      });
      if (typeof floorInfo === 'object' && floorInfo.currency === CUR && !isNaN(parseFloat(floorInfo.floor))) {
        floor = parseFloat(floorInfo.floor);
      }
    } catch (err) {}
  }
  return floor !== null ? floor : bid.params.floor;
}

function _getEids(bidRequest) {
  if (deepAccess(bidRequest, 'userIdAsEids')) {
    return bidRequest.userIdAsEids;
  }
}

export function resetSync() {
  isSynced = false;
}

registerBidder(spec);
