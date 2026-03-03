import { getBoundingClientRect } from '../libraries/boundingClientRect/boundingClientRect.js';
import { registerBidder } from '../src/adapters/bidderFactory.js';
import { config } from '../src/config.js';
import { BANNER, VIDEO } from '../src/mediaTypes.js';
import { _map, getWinDimensions, isArray, triggerPixel } from '../src/utils.js';
import { getViewportCoordinates } from '../libraries/viewport/viewport.js';
import { getConnectionInfo } from '../libraries/connectionInfo/connectionUtils.js';

/**
 * @typedef {import('../src/adapters/bidderFactory.js').BidRequest} BidRequest
 * @typedef {import('../src/adapters/bidderFactory.js').Bid} Bid
 * @typedef {import('../src/adapters/bidderFactory.js').ServerResponse} ServerResponse
 * @typedef {import('../src/adapters/bidderFactory.js').SyncOptions} SyncOptions
 * @typedef {import('../src/adapters/bidderFactory.js').UserSync} UserSync
 * @typedef {import('../src/adapters/bidderFactory.js').validBidRequests} validBidRequests
 * @typedef {import('../src/adapters/bidderFactory.js').bidderRequest} bidderRequest
 * @typedef {import('../src/adapters/bidderFactory.js').TimedOutBid} TimedOutBid
 */

const BIDDER_CODE = 'seedtag';
const SEEDTAG_ALIAS = 'st';
const SEEDTAG_SSP_ENDPOINT = 'https://s.seedtag.com/c/hb/bid';
const SEEDTAG_SSP_ONTIMEOUT_ENDPOINT = 'https://s.seedtag.com/se/hb/timeout';

// Global Vendor List Id
// https://iabeurope.eu/vendor-list-tcf-v2-0/
const GVLID = 157;

const mediaTypesMap = {
  [BANNER]: 'display',
  [VIDEO]: 'video',
};

const deviceConnection = {
  FIXED: 'fixed',
  MOBILE: 'mobile',
  UNKNOWN: 'unknown',
};

export const BIDFLOOR_CURRENCY = 'USD'

function getBidFloor(bidRequest) {
  let floorInfo = {};

  if (typeof bidRequest.getFloor === 'function') {
    floorInfo = bidRequest.getFloor({
      currency: BIDFLOOR_CURRENCY,
      mediaType: '*',
      size: '*'
    });
  }

  return floorInfo?.floor;
}

const getConnectionType = () => {
  const connection = getConnectionInfo();
  const connectionType = connection?.type || connection?.effectiveType;
  switch (connectionType) {
    case 'wifi':
    case 'ethernet':
      return deviceConnection.FIXED;
    case 'cellular':
    case 'wimax':
      return deviceConnection.MOBILE;
    default:
      const isMobile =
        /iPad|iPhone|iPod/.test(navigator.userAgent) ||
        /android/i.test(navigator.userAgent);
      return isMobile ? deviceConnection.UNKNOWN : deviceConnection.FIXED;
  }
};

function mapMediaType(seedtagMediaType) {
  if (seedtagMediaType === 'display') return BANNER;
  if (seedtagMediaType === 'video') return VIDEO;
  else return seedtagMediaType;
}

function hasVideoMediaType(bid) {
  return !!bid.mediaTypes && !!bid.mediaTypes.video;
}

function hasBannerMediaType(bid) {
  return !!bid.mediaTypes && !!bid.mediaTypes.banner;
}

function hasMandatoryDisplayParams(bid) {
  const p = bid.params;
  return (
    !!p.publisherId &&
    !!p.adUnitId
  );
}

function hasMandatoryVideoParams(bid) {
  const videoParams = getVideoParams(bid);

  const isValid =
    !!bid.params.publisherId &&
    !!bid.params.adUnitId &&
    hasVideoMediaType(bid) &&
    !!videoParams.playerSize &&
    isArray(videoParams.playerSize) &&
    videoParams.playerSize.length > 0;

  return isValid
}

function buildBidRequest(validBidRequest) {
  const params = validBidRequest.params;
  const mediaTypes = _map(
    Object.keys(validBidRequest.mediaTypes),
    function (pbjsType) {
      return mediaTypesMap[pbjsType];
    }
  );
  const bidRequest = {
    id: validBidRequest.bidId,
    transactionId: validBidRequest.ortb2Imp?.ext?.tid,
    gpid: validBidRequest.ortb2Imp?.ext?.gpid,
    sizes: validBidRequest.sizes,
    supplyTypes: mediaTypes,
    adUnitId: params.adUnitId,
    adUnitCode: validBidRequest.adUnitCode,
    geom: geom(validBidRequest.adUnitCode),
    placement: params.placement,
    requestCount: validBidRequest.bidderRequestsCount || 1,
  };

  if (hasVideoMediaType(validBidRequest) && hasMandatoryVideoParams(validBidRequest)) {
    bidRequest.videoParams = getVideoParams(validBidRequest);
  }

  const bidFloor = getBidFloor(validBidRequest)
  if (bidFloor) {
    bidRequest.bidFloor = bidFloor;
  }

  return bidRequest;
}

/**
 * return video param (global or overrided per bidder)
 */
function getVideoParams(validBidRequest) {
  const videoParams = validBidRequest.mediaTypes.video || {};
  if (videoParams.playerSize && isArray(videoParams.playerSize) && videoParams.playerSize.length > 0) {
    videoParams.w = videoParams.playerSize[0][0];
    videoParams.h = videoParams.playerSize[0][1];
  }

  return videoParams;
}

function isVideoOutstream(validBidRequest) {
  return getVideoParams(validBidRequest).context === 'outstream';
}

function buildBidResponse(seedtagBid) {
  const mediaType = mapMediaType(seedtagBid.mediaType);
  const bid = {
    requestId: seedtagBid.bidId,
    cpm: seedtagBid.price,
    width: seedtagBid.width,
    height: seedtagBid.height,
    creativeId: seedtagBid.creativeId,
    currency: seedtagBid.currency,
    netRevenue: true,
    mediaType: mediaType,
    ttl: seedtagBid.ttl,
    nurl: seedtagBid.nurl,
    meta: {
      advertiserDomains:
        seedtagBid && seedtagBid.adomain && seedtagBid.adomain.length > 0
          ? seedtagBid.adomain
          : [],
      mediaType: seedtagBid.realMediaType,
    },
  };

  if (mediaType === VIDEO) {
    bid.vastXml = seedtagBid.content;
  } else {
    bid.ad = seedtagBid.content;
  }
  return bid;
}

/**
 *
 * @returns Measure time to first byte implementation
 * @see https://web.dev/ttfb/
 *      https://developer.mozilla.org/en-US/docs/Web/API/Navigation_timing_API
 */
function ttfb() {
  const ttfb = (() => {
    // Timing API V2
    try {
      const entry = performance.getEntriesByType('navigation')[0];
      return Math.round(entry.responseStart - entry.startTime);
    } catch (e) {
      // Timing API V1
      try {
        const entry = performance.timing;
        return Math.round(entry.responseStart - entry.fetchStart);
      } catch (e) {
        // Timing API not available
        return 0;
      }
    }
  })();

  // prevent negative or excessive value
  // @see https://github.com/googleChrome/web-vitals/issues/162
  //      https://github.com/googleChrome/web-vitals/issues/137
  return ttfb >= 0 && ttfb <= performance.now() ? ttfb : 0;
}

function geom(adunitCode) {
  const slot = document.getElementById(adunitCode);
  if (slot) {
    const { top, left, width, height } = getBoundingClientRect(slot);
    const viewport = {
      width: getWinDimensions().innerWidth,
      height: getWinDimensions().innerHeight,
    };
    const scrollY = getViewportCoordinates().top || 0;

    return {
      scrollY,
      top,
      left,
      width,
      height,
      viewport,
    };
  }
}

export function getTimeoutUrl(data) {
  let queryParams = '';
  if (
    isArray(data) &&
    data[0] &&
    isArray(data[0].params) &&
    data[0].params[0]
  ) {
    const params = data[0].params[0];
    const timeout = data[0].timeout;

    queryParams =
      '?publisherToken=' +
      params.publisherId +
      '&adUnitId=' +
      params.adUnitId +
      '&timeout=' +
      timeout;
  }
  return SEEDTAG_SSP_ONTIMEOUT_ENDPOINT + queryParams;
}

export const spec = {
  code: BIDDER_CODE,
  gvlid: GVLID,
  aliases: [SEEDTAG_ALIAS],
  supportedMediaTypes: [BANNER, VIDEO],
  /**
   * Determines whether or not the given bid request is valid.
   *
   * @param {BidRequest} bid The bid params to validate.
   * @return boolean True if this is a valid bid, and false otherwise.
   */
  isBidRequestValid(bid) {
    const hasVideo = hasVideoMediaType(bid);
    const hasBanner = hasBannerMediaType(bid);

    // when accept both mediatype but it must be outstream
    if (hasVideo && hasBanner) {
      return hasMandatoryVideoParams(bid) && isVideoOutstream(bid) && hasMandatoryDisplayParams(bid);
    } else if (hasVideo) {
      return hasMandatoryVideoParams(bid);
    } else if (hasBanner) {
      return hasMandatoryDisplayParams(bid);
    } else {
      return false;
    }
  },

  /**
   * Make a server request from the list of BidRequests.
   *
   * @param {validBidRequests[]} validBidRequests an array of bids
   * @param {bidderRequest} bidderRequest an array of bids
   * @return ServerRequest Info describing the request to the server.
   */
  buildRequests(validBidRequests, bidderRequest) {
    const payload = {
      url: bidderRequest.refererInfo.page,
      publisherToken: validBidRequests[0].params.publisherId,
      cmp: !!bidderRequest.gdprConsent,
      timeout: bidderRequest.timeout,
      version: '$prebid.version$',
      connectionType: getConnectionType(),
      auctionStart: bidderRequest.auctionStart || Date.now(),
      ttfb: ttfb(),
      bidRequests: _map(validBidRequests, buildBidRequest),
      user: { topics: [], eids: [] },
      site: {}
    };

    if (payload.cmp) {
      const gdprApplies = bidderRequest.gdprConsent.gdprApplies;
      if (gdprApplies !== undefined) payload['ga'] = gdprApplies;
      payload['cd'] = bidderRequest.gdprConsent.consentString;
    }
    if (bidderRequest.uspConsent) {
      payload['uspConsent'] = bidderRequest.uspConsent;
    }

    const schain = validBidRequests[0]?.ortb2?.source?.ext?.schain;
    if (schain) {
      payload.schain = schain;
    }

    const coppa = config.getConfig('coppa');
    if (coppa) {
      payload.coppa = coppa;
    }

    if (bidderRequest.gppConsent) {
      payload.gppConsent = {
        gppString: bidderRequest.gppConsent.gppString,
        applicableSections: bidderRequest.gppConsent.applicableSections
      }
    } else if (bidderRequest.ortb2?.regs?.gpp) {
      payload.gppConsent = {
        gppString: bidderRequest.ortb2.regs.gpp,
        applicableSections: bidderRequest.ortb2.regs.gpp_sid
      }
    }

    if (bidderRequest.ortb2?.user?.data) {
      payload.user.topics = bidderRequest.ortb2.user.data
    }
    if (validBidRequests[0] && validBidRequests[0].userIdAsEids) {
      payload.user.eids = validBidRequests[0].userIdAsEids
    }

    if (bidderRequest.ortb2?.bcat) {
      payload.bcat = bidderRequest.ortb2?.bcat
    }

    if (bidderRequest.ortb2?.badv) {
      payload.badv = bidderRequest.ortb2?.badv
    }

    if (bidderRequest.ortb2?.device?.sua) {
      payload.sua = bidderRequest.ortb2.device.sua
    }

    if (bidderRequest.ortb2?.site?.cat) {
      payload.site.cat = bidderRequest.ortb2.site.cat
    }

    if (bidderRequest.ortb2?.site?.cattax) {
      payload.site.cattax = bidderRequest.ortb2.site.cattax
    }

    if (bidderRequest.ortb2?.site?.pagecat) {
      payload.site.pagecat = bidderRequest.ortb2.site.pagecat
    }

    const payloadString = JSON.stringify(payload);

    return {
      method: 'POST',
      url: SEEDTAG_SSP_ENDPOINT,
      data: payloadString,
    };
  },

  /**
   * Unpack the response from the server into a list of bids.
   *
   * @param {ServerResponse} serverResponse A successful response from the server.
   * @return {Bid[]} An array of bids which were nested inside the server.
   */
  interpretResponse: function (serverResponse) {
    const serverBody = serverResponse.body;
    if (serverBody && serverBody.bids && isArray(serverBody.bids)) {
      return _map(serverBody.bids, function (bid) {
        return buildBidResponse(bid);
      });
    } else {
      return [];
    }
  },

  /**
   * Register the user sync pixels which should be dropped after the auction.
   *
   * @param {SyncOptions} syncOptions Which user syncs are allowed?
   * @param {ServerResponse[]} serverResponses List of server's responses.
   * @return {UserSync[]} The user syncs which should be dropped.
   */
  getUserSyncs(syncOptions, serverResponses) {
    const serverResponse = serverResponses[0];
    if (syncOptions.iframeEnabled && serverResponse) {
      const cookieSyncUrl = serverResponse.body.cookieSync;
      return cookieSyncUrl ? [{ type: 'iframe', url: cookieSyncUrl }] : [];
    } else {
      return [];
    }
  },

  /**
   * Register bidder specific code, which will execute if bidder timed out after an auction
   * @param {TimedOutBid} data Containing timeout specific data
   */
  onTimeout(data) {
    const url = getTimeoutUrl(data);
    triggerPixel(url);
  },

  /**
   * Function to call when the adapter wins the auction
   * @param {Bid} bid The bid information received from the server
   */
  onBidWon: function (bid) {
    if (bid && bid.nurl) {
      triggerPixel(bid.nurl);
    }
  },
};
registerBidder(spec);
