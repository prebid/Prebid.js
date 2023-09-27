import {
  deepSetValue,
  logInfo,
  deepAccess,
  logError,
  isFn,
  isPlainObject,
  isStr,
  isNumber,
  isArray, logMessage
} from '../src/utils.js';
import {registerBidder} from '../src/adapters/bidderFactory.js';
import {BANNER, VIDEO} from '../src/mediaTypes.js';

const BIDDER_CODE = 'dxkulture';
const DEFAULT_BID_TTL = 300;
const DEFAULT_CURRENCY = 'USD';
const DEFAULT_NET_REVENUE = true;
const DEFAULT_NETWORK_ID = 1;
const OPENRTB_VIDEO_PARAMS = [
  'mimes',
  'minduration',
  'maxduration',
  'placement',
  'plcmt',
  'protocols',
  'startdelay',
  'skip',
  'skipafter',
  'minbitrate',
  'maxbitrate',
  'delivery',
  'playbackmethod',
  'api',
  'linearity'
];

export const spec = {
  code: BIDDER_CODE,
  VERSION: '1.0.0',
  supportedMediaTypes: [BANNER, VIDEO],
  ENDPOINT: 'https://ads.kulture.media/pbjs',

  /**
   * Determines whether or not the given bid request is valid.
   *
   * @param {BidRequest} bidRequest The bid params to validate.
   * @return boolean True if this is a valid bid, and false otherwise.
   */
  isBidRequestValid: function (bid) {
    return (
      _validateParams(bid) &&
      _validateBanner(bid) &&
      _validateVideo(bid)
    );
  },

  /**
   * Make a server request from the list of BidRequests.
   *
   * @param {BidRequest[]} validBidRequests A non-empty list of bid requests which should be sent to the Server.
   * @param {BidderRequest} bidderRequest bidder request object.
   * @return ServerRequest Info describing the request to the server.
   */
  buildRequests: function (validBidRequests, bidderRequest) {
    if (!validBidRequests || !bidderRequest) {
      return;
    }

    // We need to refactor this to support mixed content when there are both
    // banner and video bid requests
    let openrtbRequest;
    if (hasBannerMediaType(validBidRequests[0])) {
      openrtbRequest = buildBannerRequestData(validBidRequests, bidderRequest);
    } else if (hasVideoMediaType(validBidRequests[0])) {
      openrtbRequest = buildVideoRequestData(validBidRequests[0], bidderRequest);
    }

    // adding schain object
    if (validBidRequests[0].schain) {
      deepSetValue(openrtbRequest, 'source.ext.schain', validBidRequests[0].schain);
    }

    // Attaching GDPR Consent Params
    if (bidderRequest.gdprConsent) {
      deepSetValue(openrtbRequest, 'user.ext.consent', bidderRequest.gdprConsent.consentString);
      deepSetValue(openrtbRequest, 'regs.ext.gdpr', (bidderRequest.gdprConsent.gdprApplies ? 1 : 0));
    }

    // CCPA
    if (bidderRequest.uspConsent) {
      deepSetValue(openrtbRequest, 'regs.ext.us_privacy', bidderRequest.uspConsent);
    }

    // EIDS
    const eids = deepAccess(validBidRequests[0], 'userIdAsEids');
    if (Array.isArray(eids) && eids.length > 0) {
      deepSetValue(openrtbRequest, 'user.ext.eids', eids);
    }

    let publisherId = validBidRequests[0].params.publisherId;
    let placementId = validBidRequests[0].params.placementId;
    const networkId = validBidRequests[0].params.networkId || DEFAULT_NETWORK_ID;

    if (validBidRequests[0].params.e2etest) {
      logMessage('E2E test mode enabled');
      publisherId = 'e2etest'
    }
    let baseEndpoint = spec.ENDPOINT + '?pid=' + publisherId;

    if (placementId) {
      baseEndpoint += '&placementId=' + placementId
    }
    if (networkId) {
      baseEndpoint += '&nId=' + networkId
    }

    const payloadString = JSON.stringify(openrtbRequest);
    return {
      method: 'POST',
      url: baseEndpoint,
      data: payloadString,
    };
  },

  interpretResponse: function (serverResponse) {
    const bidResponses = [];
    const response = (serverResponse || {}).body;
    // response is always one seat (exchange) with (optional) bids for each impression
    if (response && response.seatbid && response.seatbid.length === 1 && response.seatbid[0].bid && response.seatbid[0].bid.length) {
      response.seatbid[0].bid.forEach(bid => {
        if (bid.adm && bid.price) {
          bidResponses.push(_createBidResponse(bid));
        }
      })
    } else {
      logInfo('dxkulture.interpretResponse :: no valid responses to interpret');
    }
    return bidResponses;
  },

  getUserSyncs: function (syncOptions, serverResponses) {
    logInfo('dxkulture.getUserSyncs', 'syncOptions', syncOptions, 'serverResponses', serverResponses);
    let syncs = [];

    if (!syncOptions.iframeEnabled && !syncOptions.pixelEnabled) {
      return syncs;
    }

    serverResponses.forEach(resp => {
      const userSync = deepAccess(resp, 'body.ext.usersync');
      if (userSync) {
        let syncDetails = [];
        Object.keys(userSync).forEach(key => {
          const value = userSync[key];
          if (value.syncs && value.syncs.length) {
            syncDetails = syncDetails.concat(value.syncs);
          }
        });
        syncDetails.forEach(syncDetails => {
          syncs.push({
            type: syncDetails.type === 'iframe' ? 'iframe' : 'image',
            url: syncDetails.url
          });
        });

        if (!syncOptions.iframeEnabled) {
          syncs = syncs.filter(s => s.type !== 'iframe')
        }
        if (!syncOptions.pixelEnabled) {
          syncs = syncs.filter(s => s.type !== 'image')
        }
      }
    });
    logInfo('dxkulture.getUserSyncs result=%o', syncs);
    return syncs;
  },

};

/* =======================================
 * Util Functions
 *======================================= */

/**
 * @param {BidRequest} bidRequest bid request
 */
function hasBannerMediaType(bidRequest) {
  return !!deepAccess(bidRequest, 'mediaTypes.banner');
}

/**
 * @param {BidRequest} bidRequest bid request
 */
function hasVideoMediaType(bidRequest) {
  return !!deepAccess(bidRequest, 'mediaTypes.video');
}

function _validateParams(bidRequest) {
  if (!bidRequest.params) {
    return false;
  }

  if (bidRequest.params.e2etest) {
    return true;
  }

  if (!bidRequest.params.publisherId) {
    logError('Validation failed: publisherId not declared');
    return false;
  }

  if (!bidRequest.params.placementId) {
    logError('Validation failed: placementId not declared');
    return false;
  }

  const mediaTypesExists = hasVideoMediaType(bidRequest) || hasBannerMediaType(bidRequest);
  if (!mediaTypesExists) {
    return false;
  }

  return true;
}

/**
 * Validates banner bid request. If it is not banner media type returns true.
 * @param {object} bid, bid to validate
 * @return boolean, true if valid, otherwise false
 */
function _validateBanner(bidRequest) {
  // If there's no banner no need to validate
  if (!hasBannerMediaType(bidRequest)) {
    return true;
  }
  const banner = deepAccess(bidRequest, 'mediaTypes.banner');
  if (!Array.isArray(banner.sizes)) {
    return false;
  }

  return true;
}

/**
 * Validates video bid request. If it is not video media type returns true.
 * @param {object} bid, bid to validate
 * @return boolean, true if valid, otherwise false
 */
function _validateVideo(bidRequest) {
  // If there's no video no need to validate
  if (!hasVideoMediaType(bidRequest)) {
    return true;
  }

  const videoPlacement = deepAccess(bidRequest, 'mediaTypes.video', {});
  const videoBidderParams = deepAccess(bidRequest, 'params.video', {});
  const params = deepAccess(bidRequest, 'params', {});

  if (params && params.e2etest) {
    return true;
  }

  const videoParams = {
    ...videoPlacement,
    ...videoBidderParams // Bidder Specific overrides
  };

  if (!Array.isArray(videoParams.mimes) || videoParams.mimes.length === 0) {
    logError('Validation failed: mimes are invalid');
    return false;
  }

  if (!Array.isArray(videoParams.protocols) || videoParams.protocols.length === 0) {
    logError('Validation failed: protocols are invalid');
    return false;
  }

  if (!videoParams.context) {
    logError('Validation failed: context id not declared');
    return false;
  }

  if (videoParams.context !== 'instream') {
    logError('Validation failed: only context instream is supported ');
    return false;
  }

  if (typeof videoParams.playerSize === 'undefined' || !Array.isArray(videoParams.playerSize) || !Array.isArray(videoParams.playerSize[0])) {
    logError('Validation failed: player size not declared or is not in format [[w,h]]');
    return false;
  }

  return true;
}

/**
 * Prepares video request data.
 *
 * @param bidRequest
 * @param bidderRequest
 * @returns openrtbRequest
 */
function buildVideoRequestData(bidRequest, bidderRequest) {
  const {params} = bidRequest;

  const videoAdUnit = deepAccess(bidRequest, 'mediaTypes.video', {});
  const videoBidderParams = deepAccess(bidRequest, 'params.video', {});

  const videoParams = {
    ...videoAdUnit,
    ...videoBidderParams // Bidder Specific overrides
  };

  if (bidRequest.params && bidRequest.params.e2etest) {
    videoParams.playerSize = [[640, 480]]
    videoParams.conext = 'instream'
  }

  const video = {
    w: parseInt(videoParams.playerSize[0][0], 10),
    h: parseInt(videoParams.playerSize[0][1], 10),
  }

  // Obtain all ORTB params related video from Ad Unit
  OPENRTB_VIDEO_PARAMS.forEach((param) => {
    if (videoParams.hasOwnProperty(param)) {
      video[param] = videoParams[param];
    }
  });

  // - If product is instream (for instream context) then override placement to 1
  if (params.context === 'instream') {
    video.startdelay = video.startdelay || 0;
    video.placement = 1;
  }

  // bid floor
  const bidFloorRequest = {
    currency: bidRequest.params.cur || 'USD',
    mediaType: 'video',
    size: '*'
  };
  let floorData = bidRequest.params
  if (isFn(bidRequest.getFloor)) {
    floorData = bidRequest.getFloor(bidFloorRequest);
  } else {
    if (params.bidfloor) {
      floorData = {floor: params.bidfloor, currency: params.currency || 'USD'};
    }
  }

  const openrtbRequest = {
    id: bidRequest.bidId,
    imp: [
      {
        id: '1',
        video: video,
        secure: isSecure() ? 1 : 0,
        bidfloor: floorData.floor,
        bidfloorcur: floorData.currency
      }
    ],
    site: {
      domain: bidderRequest.refererInfo.domain,
      page: bidderRequest.refererInfo.page,
      ref: bidderRequest.refererInfo.ref,
    },
    ext: {
      hb: 1,
      prebidver: '$prebid.version$',
      adapterver: spec.VERSION,
    },
  };

  // content
  if (videoParams.content && isPlainObject(videoParams.content)) {
    openrtbRequest.site.content = {};
    const contentStringKeys = ['id', 'title', 'series', 'season', 'genre', 'contentrating', 'language', 'url'];
    const contentNumberkeys = ['episode', 'prodq', 'context', 'livestream', 'len'];
    const contentArrayKeys = ['cat'];
    const contentObjectKeys = ['ext'];
    for (const contentKey in videoBidderParams.content) {
      if (
        (contentStringKeys.indexOf(contentKey) > -1 && isStr(videoParams.content[contentKey])) ||
        (contentNumberkeys.indexOf(contentKey) > -1 && isNumber(videoParams.content[contentKey])) ||
        (contentObjectKeys.indexOf(contentKey) > -1 && isPlainObject(videoParams.content[contentKey])) ||
        (contentArrayKeys.indexOf(contentKey) > -1 && isArray(videoParams.content[contentKey]) &&
          videoParams.content[contentKey].every(catStr => isStr(catStr)))) {
        openrtbRequest.site.content[contentKey] = videoParams.content[contentKey];
      } else {
        logMessage('DXKulture bid adapter validation error: ', contentKey, ' is either not supported is OpenRTB V2.5 or value is undefined');
      }
    }
  }

  return openrtbRequest;
}

/**
 * Prepares video request data.
 *
 * @param bidRequest
 * @param bidderRequest
 * @returns openrtbRequest
 */
function buildBannerRequestData(bidRequests, bidderRequest) {
  const impr = bidRequests.map(bidRequest => ({
    id: bidRequest.bidId,
    banner: {
      format: bidRequest.mediaTypes.banner.sizes.map(sizeArr => ({
        w: sizeArr[0],
        h: sizeArr[1]
      }))
    },
    ext: {
      exchange: {
        placementId: bidRequest.params.placementId
      }
    }
  }));

  const openrtbRequest = {
    id: bidderRequest.auctionId,
    imp: impr,
    site: {
      domain: bidderRequest.refererInfo?.domain,
      page: bidderRequest.refererInfo?.page,
      ref: bidderRequest.refererInfo?.ref,
    },
    ext: {}
  };
  return openrtbRequest;
}

function _createBidResponse(bid) {
  const isADomainPresent =
    bid.adomain && bid.adomain.length;
  const bidResponse = {
    requestId: bid.impid,
    bidderCode: spec.code,
    cpm: bid.price,
    width: bid.w,
    height: bid.h,
    ad: bid.adm,
    ttl: typeof bid.exp === 'number' ? bid.exp : DEFAULT_BID_TTL,
    creativeId: bid.crid,
    netRevenue: DEFAULT_NET_REVENUE,
    currency: DEFAULT_CURRENCY,
    mediaType: deepAccess(bid, 'ext.prebid.type', BANNER)
  }

  if (isADomainPresent) {
    bidResponse.meta = {
      advertiserDomains: bid.adomain
    };
  }

  if (bidResponse.mediaType === VIDEO) {
    bidResponse.vastXml = bid.adm;
  }

  return bidResponse;
}

function isSecure() {
  return document.location.protocol === 'https:';
}

registerBidder(spec);
