import {deepAccess, deepSetValue, isArray, isBoolean, isNumber, isStr, logWarn} from '../src/utils.js';
import {registerBidder} from '../src/adapters/bidderFactory.js';
import {BANNER, VIDEO} from '../src/mediaTypes.js';
import {config} from '../src/config.js';
import {parseDomain} from '../src/refererDetection.js';

const BIDDER_CODE = 'zeta_global_ssp';
const ENDPOINT_URL = 'https://ssp.disqus.com/bid';
const USER_SYNC_URL_IFRAME = 'https://ssp.disqus.com/sync?type=iframe';
const USER_SYNC_URL_IMAGE = 'https://ssp.disqus.com/sync?type=image';
const DEFAULT_CUR = 'USD';
const TTL = 200;
const NET_REV = true;

const VIDEO_REGEX = new RegExp(/VAST\s+version/);

const DATA_TYPES = {
  'NUMBER': 'number',
  'STRING': 'string',
  'BOOLEAN': 'boolean',
  'ARRAY': 'array',
  'OBJECT': 'object'
};
const VIDEO_CUSTOM_PARAMS = {
  'mimes': DATA_TYPES.ARRAY,
  'minduration': DATA_TYPES.NUMBER,
  'maxduration': DATA_TYPES.NUMBER,
  'startdelay': DATA_TYPES.NUMBER,
  'playbackmethod': DATA_TYPES.ARRAY,
  'api': DATA_TYPES.ARRAY,
  'protocols': DATA_TYPES.ARRAY,
  'w': DATA_TYPES.NUMBER,
  'h': DATA_TYPES.NUMBER,
  'battr': DATA_TYPES.ARRAY,
  'linearity': DATA_TYPES.NUMBER,
  'placement': DATA_TYPES.NUMBER,
  'minbitrate': DATA_TYPES.NUMBER,
  'maxbitrate': DATA_TYPES.NUMBER,
  'skip': DATA_TYPES.NUMBER
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
    // check for all required bid fields
    if (!(bid &&
      bid.bidId &&
      bid.params)) {
      logWarn('Invalid bid request - missing required bid data');
      return false;
    }
    return true;
  },

  /**
   * Make a server request from the list of BidRequests.
   *
   * @param {Bids[]} validBidRequests - an array of bidRequest objects
   * @param {BidderRequest} bidderRequest - master bidRequest object
   * @return ServerRequest Info describing the request to the server.
   */
  buildRequests: function (validBidRequests, bidderRequest) {
    const secure = 1; // treat all requests as secure
    const request = validBidRequests[0];
    const params = request.params;
    const impData = {
      id: request.bidId,
      secure: secure
    };
    if (request.mediaTypes) {
      for (const mediaType in request.mediaTypes) {
        switch (mediaType) {
          case BANNER:
            impData.banner = buildBanner(request);
            break;
          case VIDEO:
            impData.video = buildVideo(request);
            break;
        }
      }
    }
    if (!impData.banner && !impData.video) {
      impData.banner = buildBanner(request);
    }
    let payload = {
      id: bidderRequest.auctionId,
      cur: [DEFAULT_CUR],
      imp: [impData],
      site: params.site ? params.site : {},
      device: {...(bidderRequest.ortb2?.device || {}), ...params.device},
      user: params.user ? params.user : {},
      app: params.app ? params.app : {},
      ext: {
        tags: params.tags ? params.tags : {},
        sid: params.sid ? params.sid : undefined
      }
    };
    const rInfo = bidderRequest.refererInfo;
    // TODO: do the fallbacks make sense here?
    payload.site.page = rInfo.page || rInfo.topmostLocation;
    payload.site.domain = parseDomain(payload.site.page, {noLeadingWww: true});

    payload.device.ua = navigator.userAgent;
    payload.device.language = navigator.language;

    if (params.test) {
      payload.test = params.test;
    }

    // Attaching GDPR Consent Params
    if (bidderRequest && bidderRequest.gdprConsent) {
      deepSetValue(payload, 'user.ext.consent', bidderRequest.gdprConsent.consentString);
      deepSetValue(payload, 'regs.ext.gdpr', (bidderRequest.gdprConsent.gdprApplies ? 1 : 0));
    }

    // CCPA
    if (bidderRequest && bidderRequest.uspConsent) {
      deepSetValue(payload, 'regs.ext.us_privacy', bidderRequest.uspConsent);
    }

    provideEids(request, payload);
    const url = params.shortname ? ENDPOINT_URL.concat('?shortname=', params.shortname) : ENDPOINT_URL;
    return {
      method: 'POST',
      url: url,
      data: JSON.stringify(payload),
    };
  },

  /**
   * Unpack the response from the server into a list of bids.
   *
   * @param {ServerResponse} serverResponse A successful response from the server.
   * @param bidRequest The payload from the server's response.
   * @return {Bid[]} An array of bids which were nested inside the server.
   */
  interpretResponse: function (serverResponse, bidRequest) {
    let bidResponses = [];
    const response = (serverResponse || {}).body;
    if (response && response.seatbid && response.seatbid[0].bid && response.seatbid[0].bid.length) {
      response.seatbid.forEach(zetaSeatbid => {
        zetaSeatbid.bid.forEach(zetaBid => {
          let bid = {
            requestId: zetaBid.impid,
            cpm: zetaBid.price,
            currency: response.cur,
            width: zetaBid.w,
            height: zetaBid.h,
            ad: zetaBid.adm,
            ttl: TTL,
            creativeId: zetaBid.crid,
            netRevenue: NET_REV,
          };
          if (zetaBid.adomain && zetaBid.adomain.length) {
            bid.meta = {
              advertiserDomains: zetaBid.adomain
            };
          }
          provideMediaType(zetaBid, bid);
          bidResponses.push(bid);
        })
      })
    }
    return bidResponses;
  },

  /**
   * Register User Sync.
   */
  getUserSyncs: (syncOptions, responses, gdprConsent, uspConsent) => {
    let syncurl = '';

    // Attaching GDPR Consent Params in UserSync url
    if (gdprConsent) {
      syncurl += '&gdpr=' + (gdprConsent.gdprApplies ? 1 : 0);
      syncurl += '&gdpr_consent=' + encodeURIComponent(gdprConsent.consentString || '');
    }

    // CCPA
    if (uspConsent) {
      syncurl += '&us_privacy=' + encodeURIComponent(uspConsent);
    }

    // coppa compliance
    if (config.getConfig('coppa') === true) {
      syncurl += '&coppa=1';
    }

    if (syncOptions.iframeEnabled) {
      return [{
        type: 'iframe',
        url: USER_SYNC_URL_IFRAME + syncurl
      }];
    } else {
      return [{
        type: 'image',
        url: USER_SYNC_URL_IMAGE + syncurl
      }];
    }
  }
}

function buildBanner(request) {
  let sizes = request.sizes;
  if (request.mediaTypes &&
    request.mediaTypes.banner &&
    request.mediaTypes.banner.sizes) {
    sizes = request.mediaTypes.banner.sizes;
  }
  return {
    w: sizes[0][0],
    h: sizes[0][1]
  };
}

function buildVideo(request) {
  let video = {};
  const videoParams = deepAccess(request, 'mediaTypes.video', {});
  for (const key in VIDEO_CUSTOM_PARAMS) {
    if (videoParams.hasOwnProperty(key)) {
      video[key] = checkParamDataType(key, videoParams[key], VIDEO_CUSTOM_PARAMS[key]);
    }
  }
  if (videoParams.playerSize) {
    if (isArray(videoParams.playerSize[0])) {
      video.w = parseInt(videoParams.playerSize[0][0], 10);
      video.h = parseInt(videoParams.playerSize[0][1], 10);
    } else if (isNumber(videoParams.playerSize[0])) {
      video.w = parseInt(videoParams.playerSize[0], 10);
      video.h = parseInt(videoParams.playerSize[1], 10);
    }
  }
  return video;
}

function checkParamDataType(key, value, datatype) {
  let functionToExecute;
  switch (datatype) {
    case DATA_TYPES.BOOLEAN:
      functionToExecute = isBoolean;
      break;
    case DATA_TYPES.NUMBER:
      functionToExecute = isNumber;
      break;
    case DATA_TYPES.STRING:
      functionToExecute = isStr;
      break;
    case DATA_TYPES.ARRAY:
      functionToExecute = isArray;
      break;
  }
  if (functionToExecute(value)) {
    return value;
  }
  logWarn('Ignoring param key: ' + key + ', expects ' + datatype + ', found ' + typeof value);
  return undefined;
}

function provideEids(request, payload) {
  if (Array.isArray(request.userIdAsEids) && request.userIdAsEids.length > 0) {
    deepSetValue(payload, 'user.ext.eids', request.userIdAsEids);
  }
}

function provideMediaType(zetaBid, bid) {
  if (zetaBid.ext && zetaBid.ext.bidtype) {
    if (zetaBid.ext.bidtype === VIDEO) {
      bid.mediaType = VIDEO;
      bid.vastXml = bid.ad;
    } else {
      bid.mediaType = BANNER;
    }
  } else {
    if (VIDEO_REGEX.test(bid.ad)) {
      bid.mediaType = VIDEO;
      bid.vastXml = bid.ad;
    } else {
      bid.mediaType = BANNER;
    }
  }
}

registerBidder(spec);
