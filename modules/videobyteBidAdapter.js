import { logMessage, logError, deepAccess, isFn, isPlainObject, isStr, isNumber, isArray, deepSetValue } from '../src/utils.js';
import {registerBidder} from '../src/adapters/bidderFactory.js';
import {VIDEO} from '../src/mediaTypes.js';

const BIDDER_CODE = 'videobyte';
const DEFAULT_BID_TTL = 300;
const DEFAULT_CURRENCY = 'USD';
const DEFAULT_NET_REVENUE = true;
const VIDEO_ORTB_PARAMS = [
  'mimes',
  'minduration',
  'maxduration',
  'placement',
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
  supportedMediaTypes: [VIDEO],
  VERSION: '1.0.0',
  ENDPOINT: 'https://x.videobyte.com/ortbhb',

  /**
   * Determines whether or not the given bid request is valid.
   *
   * @param {BidRequest} bidRequest The bid params to validate.
   * @return boolean True if this is a valid bid, and false otherwise.
   */
  isBidRequestValid: function (bidRequest) {
    return validateVideo(bidRequest);
  },

  /**
   * Make a server request from the list of BidRequests.
   *
   * @param bidRequests - an array of bid requests
   * @param bidderRequest
   * @return ServerRequest Info describing the request to the server.
   */
  buildRequests: function (bidRequests, bidderRequest) {
    if (!bidRequests) {
      return;
    }
    return bidRequests.map(bidRequest => {
      const {params} = bidRequest;
      let pubId = params.pubId;
      const placementId = params.placementId;
      const nId = params.nid;
      if (bidRequest.params.video && bidRequest.params.video.e2etest) {
        logMessage('E2E test mode enabled');
        pubId = 'e2etest'
      }
      let baseEndpoint = spec.ENDPOINT + '?pid=' + pubId;
      if (placementId) {
        baseEndpoint += '&placementId=' + placementId
      }
      if (nId) {
        baseEndpoint += '&nid=' + nId
      }
      return {
        method: 'POST',
        url: baseEndpoint,
        data: JSON.stringify(buildRequestData(bidRequest, bidderRequest)),
      }
    });
  },

  /**
   * Unpack the response from the server into a list of bids.
   *
   * @param {ServerResponse} serverResponse A successful response from the server.
   * @param bidRequest
   * @return {Bid[]} An array of bids which were nested inside the server.
   */
  interpretResponse: function (serverResponse) {
    const bidResponses = [];
    const response = (serverResponse || {}).body;
    // one seat  with (optional) bids for each impression
    if (response && response.seatbid && response.seatbid.length === 1 && response.seatbid[0].bid && response.seatbid[0].bid.length === 1) {
      const bid = response.seatbid[0].bid[0]
      if (bid.adm && bid.price) {
        let bidResponse = {
          requestId: response.id,
          bidderCode: spec.code,
          cpm: bid.price,
          width: bid.w,
          height: bid.h,
          ttl: DEFAULT_BID_TTL,
          creativeId: bid.crid,
          netRevenue: DEFAULT_NET_REVENUE,
          currency: DEFAULT_CURRENCY,
          mediaType: 'video',
          vastXml: bid.adm,
          meta: {
            advertiserDomains: bid.adomain
          }
        };
        bidResponses.push(bidResponse)
      }
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
  getUserSyncs: function(syncOptions, serverResponses) {
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

        // if iframe is enabled return only iframe (videobyte)
        // if iframe is disabled, we can proceed to pixels if any
        if (syncOptions.iframeEnabled) {
          syncs = syncs.filter(s => s.type === 'iframe')
        } else if (syncOptions.pixelEnabled) {
          syncs = syncs.filter(s => s.type === 'image')
        }
      }
    });
    return syncs;
  }

}

// BUILD REQUESTS: VIDEO
function buildRequestData(bidRequest, bidderRequest) {
  const {params} = bidRequest;

  const videoAdUnit = deepAccess(bidRequest, 'mediaTypes.video', {});
  const videoBidderParams = deepAccess(bidRequest, 'params.video', {});

  const videoParams = {
    ...videoAdUnit,
    ...videoBidderParams // Bidder Specific overrides
  };

  if (bidRequest.params.video && bidRequest.params.video.e2etest) {
    videoParams.playerSize = [[640, 480]]
    videoParams.conext = 'instream'
  }

  const video = {
    w: parseInt(videoParams.playerSize[0][0], 10),
    h: parseInt(videoParams.playerSize[0][1], 10),
  }

  // Obtain all ORTB params related video from Ad Unit
  VIDEO_ORTB_PARAMS.forEach((param) => {
    if (videoParams.hasOwnProperty(param)) {
      video[param] = videoParams[param];
    }
  });

  // Placement Inference Rules:
  // - If no placement is defined then default to 1 (In Stream)
  video.placement = video.placement || 2;

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
      domain: window.location.hostname,
      page: window.location.href,
      ref: bidRequest.refererInfo ? bidRequest.refererInfo.referer || null : null
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
        logMessage('videobyte bid adapter validation error: ', contentKey, ' is either not supported is OpenRTB V2.5 or value is undefined');
      }
    }
  }

  // adding schain object
  if (bidRequest.schain) {
    deepSetValue(openrtbRequest, 'source.ext.schain', bidRequest.schain);
    openrtbRequest.source.ext.schain.nodes[0].rid = openrtbRequest.id;
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
  return openrtbRequest;
}

function validateVideo(bidRequest) {
  if (!bidRequest.params) {
    return false;
  }

  if (!bidRequest.params.pubId) {
    logError('failed validation: pubId not declared');
    return false;
  }

  const videoAdUnit = deepAccess(bidRequest, 'mediaTypes.video', {});
  const videoBidderParams = deepAccess(bidRequest, 'params.video', {});

  if (videoBidderParams && videoBidderParams.e2etest) {
    return true;
  }

  const videoParams = {
    ...videoAdUnit,
    ...videoBidderParams // Bidder Specific overrides
  };

  if (!videoParams.context) {
    logError('failed validation: context id not declared');
    return false;
  }
  if (videoParams.context !== 'instream') {
    logError('failed validation: only context instream is supported ');
    return false;
  }

  if (typeof videoParams.playerSize === 'undefined' || !Array.isArray(videoParams.playerSize) || !Array.isArray(videoParams.playerSize[0])) {
    logError('failed validation: player size not declared or is not in format [[w,h]]');
    return false;
  }

  return true;
}

function isSecure() {
  return document.location.protocol === 'https:';
}

registerBidder(spec);
