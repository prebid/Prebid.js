import { isArray, _map, triggerPixel } from '../src/utils.js';
import { registerBidder } from '../src/adapters/bidderFactory.js'
import { VIDEO, BANNER } from '../src/mediaTypes.js'

const BIDDER_CODE = 'seedtag';
const SEEDTAG_ALIAS = 'st';
const SEEDTAG_SSP_ENDPOINT = 'https://s.seedtag.com/c/hb/bid';
const SEEDTAG_SSP_ONTIMEOUT_ENDPOINT = 'https://s.seedtag.com/se/hb/timeout';
const ALLOWED_PLACEMENTS = {
  inImage: true,
  inScreen: true,
  inArticle: true,
  banner: true,
  video: true
}

// Global Vendor List Id
// https://iabeurope.eu/vendor-list-tcf-v2-0/
const GVLID = 157;

const mediaTypesMap = {
  [BANNER]: 'display',
  [VIDEO]: 'video'
};

const deviceConnection = {
  FIXED: 'fixed',
  MOBILE: 'mobile',
  UNKNOWN: 'unknown'
};

const getConnectionType = () => {
  const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection || {}
  switch (connection.type || connection.effectiveType) {
    case 'wifi':
    case 'ethernet':
      return deviceConnection.FIXED
    case 'cellular':
    case 'wimax':
      return deviceConnection.MOBILE
    default:
      const isMobile = /iPad|iPhone|iPod/.test(navigator.userAgent) || /android/i.test(navigator.userAgent)
      return isMobile ? deviceConnection.UNKNOWN : deviceConnection.FIXED
  }
};

function mapMediaType(seedtagMediaType) {
  if (seedtagMediaType === 'display') return BANNER;
  if (seedtagMediaType === 'video') return VIDEO;
  else return seedtagMediaType;
}

function hasVideoMediaType(bid) {
  return (!!bid.mediaTypes && !!bid.mediaTypes.video) || (!!bid.params && !!bid.params.video)
}

function hasMandatoryParams(params) {
  return (
    !!params.publisherId &&
    !!params.adUnitId &&
    !!params.placement &&
    !!ALLOWED_PLACEMENTS[params.placement]
  );
}

function hasMandatoryVideoParams(bid) {
  const videoParams = getVideoParams(bid)

  return hasVideoMediaType(bid) && !!videoParams.playerSize &&
    isArray(videoParams.playerSize) &&
    videoParams.playerSize.length > 0;
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
    transactionId: validBidRequest.transactionId,
    sizes: validBidRequest.sizes,
    supplyTypes: mediaTypes,
    adUnitId: params.adUnitId,
    adUnitCode: validBidRequest.adUnitCode,
    placement: params.placement,
    requestCount: validBidRequest.bidderRequestsCount || 1 // FIXME : in unit test the parameter bidderRequestsCount is undefined
  };

  if (params.adPosition) {
    bidRequest.adPosition = params.adPosition;
  }

  if (hasVideoMediaType(validBidRequest)) {
    bidRequest.videoParams = getVideoParams(validBidRequest)
  }

  return bidRequest;
}

/**
 * return video param (global or overrided per bidder)
 */
function getVideoParams(validBidRequest) {
  const videoParams = validBidRequest.mediaTypes.video || {};
  if (videoParams.playerSize) {
    videoParams.w = videoParams.playerSize[0][0];
    videoParams.h = videoParams.playerSize[0][1];
  }

  const bidderVideoParams = (validBidRequest.params && validBidRequest.params.video) || {}
  // override video params from seedtag bidder params
  Object.keys(bidderVideoParams).forEach(key => {
    videoParams[key] = validBidRequest.params.video[key]
  })

  return videoParams
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
      advertiserDomains: seedtagBid && seedtagBid.adomain && seedtagBid.adomain.length > 0 ? seedtagBid.adomain : []
    }
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

export function getTimeoutUrl (data) {
  let queryParams = '';
  if (
    isArray(data) && data[0] &&
    isArray(data[0].params) && data[0].params[0]
  ) {
    const params = data[0].params[0];
    const timeout = data[0].timeout

    queryParams =
      '?publisherToken=' + params.publisherId +
      '&adUnitId=' + params.adUnitId +
      '&timeout=' + timeout;
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
    return hasVideoMediaType(bid)
      ? hasMandatoryParams(bid.params) && hasMandatoryVideoParams(bid)
      : hasMandatoryParams(bid.params);
  },

  /**
   * Make a server request from the list of BidRequests.
   *
   * @param {validBidRequests[]} - an array of bids
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
    };

    if (payload.cmp) {
      const gdprApplies = bidderRequest.gdprConsent.gdprApplies;
      if (gdprApplies !== undefined) payload['ga'] = gdprApplies;
      payload['cd'] = bidderRequest.gdprConsent.consentString;
    }

    if (bidderRequest.uspConsent) {
      payload['uspConsent'] = bidderRequest.uspConsent
    }

    const payloadString = JSON.stringify(payload)
    return {
      method: 'POST',
      url: SEEDTAG_SSP_ENDPOINT,
      data: payloadString
    }
  },

  /**
   * Unpack the response from the server into a list of bids.
   *
   * @param {ServerResponse} serverResponse A successful response from the server.
   * @return {Bid[]} An array of bids which were nested inside the server.
   */
  interpretResponse: function(serverResponse) {
    const serverBody = serverResponse.body;
    if (serverBody && serverBody.bids && isArray(serverBody.bids)) {
      return _map(serverBody.bids, function(bid) {
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
   * @param {data} Containing timeout specific data
   */
  onTimeout(data) {
    const url = getTimeoutUrl(data);
    triggerPixel(url);
  },

  /**
   * Function to call when the adapter wins the auction
   * @param {bid} Bid information received from the server
   */
  onBidWon: function (bid) {
    if (bid && bid.nurl) {
      triggerPixel(bid.nurl);
    }
  }
}
registerBidder(spec);
