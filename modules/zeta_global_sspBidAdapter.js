import {deepAccess, deepSetValue, isArray, isBoolean, isNumber, isStr, logWarn} from '../src/utils.js';
import {registerBidder} from '../src/adapters/bidderFactory.js';
import {BANNER, VIDEO} from '../src/mediaTypes.js';
import {config} from '../src/config.js';
import {parseDomain} from '../src/refererDetection.js';
import {ajax} from '../src/ajax.js';

/**
 * @typedef {import('../src/adapters/bidderFactory.js').BidRequest} BidRequest
 * @typedef {import('../src/adapters/bidderFactory.js').Bid} Bid
 * @typedef {import('../src/adapters/bidderFactory.js').ServerResponse} ServerResponse
 * @typedef {import('../src/adapters/bidderFactory.js').Bids} Bids
 * @typedef {import('../src/adapters/bidderFactory.js').BidderRequest} BidderRequest
 */

const BIDDER_CODE = 'zeta_global_ssp';
const ENDPOINT_URL = 'https://ssp.disqus.com/bid/prebid';
const TIMEOUT_URL = 'https://ssp.disqus.com/timeout/prebid';
const USER_SYNC_URL_IFRAME = 'https://ssp.disqus.com/sync?type=iframe';
const USER_SYNC_URL_IMAGE = 'https://ssp.disqus.com/sync?type=image';
const DEFAULT_CUR = 'USD';
const TTL = 300;
const NET_REV = true;

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
  'plcmt': DATA_TYPES.NUMBER,
  'minbitrate': DATA_TYPES.NUMBER,
  'maxbitrate': DATA_TYPES.NUMBER,
  'skip': DATA_TYPES.NUMBER
}

export const spec = {
  code: BIDDER_CODE,
  gvlid: 469,
  supportedMediaTypes: [BANNER, VIDEO],

  /**
   * Determines whether the given bid request is valid.
   *
   * @param {BidRequest} bid The bid params to validate.
   * @return boolean True if this is a valid bid, and false otherwise.
   */
  isBidRequestValid: function (bid) {
    // check for all required bid fields
    if (!(bid &&
      bid.bidId &&
      bid.params &&
      bid.params.sid)) {
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
    const params = validBidRequests[0].params;
    const imps = validBidRequests.map(request => {
      const impData = {
        id: request.bidId,
        secure: secure
      };
      const tagid = request.params?.tagid;
      if (tagid) {
        impData.tagid = tagid;
      }
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

      if (typeof request.getFloor === 'function') {
        const floorInfo = request.getFloor({
          currency: 'USD',
          mediaType: impData.video ? 'video' : 'banner',
          size: [ impData.video ? impData.video.w : impData.banner.w, impData.video ? impData.video.h : impData.banner.h ]
        });
        if (floorInfo && floorInfo.floor) {
          impData.bidfloor = floorInfo.floor;
        }
      }
      if (!impData.bidfloor) {
        const bidfloor = request.params?.bidfloor;
        if (bidfloor) {
          impData.bidfloor = bidfloor;
        }
      }

      return impData;
    });

    let payload = {
      id: bidderRequest.bidderRequestId,
      cur: [DEFAULT_CUR],
      imp: imps,
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
    payload.site.page = cropPage(rInfo.page || rInfo.topmostLocation);
    payload.site.domain = parseDomain(payload.site.page, {noLeadingWww: true});

    payload.device.ua = navigator.userAgent;
    payload.device.language = navigator.language;
    payload.device.w = screen.width;
    payload.device.h = screen.height;

    if (bidderRequest?.ortb2?.device?.sua) {
      payload.device.sua = bidderRequest.ortb2.device.sua;
    }

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

    // schain
    if (validBidRequests[0].schain) {
      payload.source = {
        ext: {
          schain: validBidRequests[0].schain
        }
      }
    }

    if (bidderRequest?.timeout) {
      payload.tmax = bidderRequest.timeout;
    }

    provideEids(validBidRequests[0], payload);
    provideSegments(bidderRequest, payload);
    const url = params.sid ? ENDPOINT_URL.concat('?sid=', params.sid) : ENDPOINT_URL;
    return {
      method: 'POST',
      url: url,
      data: JSON.stringify(clearEmpties(payload)),
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
        const seat = zetaSeatbid.seat;
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
          provideMediaType(zetaBid, bid, bidRequest.data);
          if (bid.mediaType === VIDEO) {
            bid.vastXml = bid.ad;
          }
          if (seat) {
            bid.dspId = seat;
          }
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
  },

  onTimeout: function(timeoutData) {
    if (timeoutData) {
      const payload = timeoutData.map(d => ({
        bidder: d?.bidder,
        shortname: d?.params?.map(p => p?.tags?.shortname).find(p => p),
        sid: d?.params?.map(p => p?.sid).find(p => p),
        country: d?.ortb2?.device?.geo?.country,
        devicetype: d?.ortb2?.device?.devicetype
      }));
      ajax(TIMEOUT_URL, null, JSON.stringify(payload), {
        method: 'POST',
        options: {
          withCredentials: false,
          contentType: 'application/json'
        }
      });
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
  if (sizes.length > 1) {
    const format = sizes.map(s => {
      return {
        w: s[0],
        h: s[1]
      }
    });
    return {
      w: sizes[0][0],
      h: sizes[0][1],
      format: format
    }
  } else {
    return {
      w: sizes[0][0],
      h: sizes[0][1]
    }
  }
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

function provideSegments(bidderRequest, payload) {
  const data = bidderRequest.ortb2?.user?.data;
  if (isArray(data)) {
    const segments = data.filter(d => d?.segment).map(d => d.segment).filter(s => isArray(s)).flatMap(s => s).filter(s => s?.id);
    if (segments.length > 0) {
      if (!payload.user) {
        payload.user = {};
      }
      if (!isArray(payload.user.data)) {
        payload.user.data = [];
      }
      const payloadData = {
        segment: segments
      };
      payload.user.data.push(payloadData);
    }
  }
}

function provideMediaType(zetaBid, bid, bidRequest) {
  if (zetaBid.ext && zetaBid.ext.prebid && zetaBid.ext.prebid.type) {
    bid.mediaType = zetaBid.ext.prebid.type === VIDEO ? VIDEO : BANNER;
  } else {
    bid.mediaType = bidRequest.imp[0].video ? VIDEO : BANNER;
  }
}

function cropPage(page) {
  if (page) {
    if (page.length > 100) {
      page = page.substring(0, 100);
    }
    if (page.startsWith('https://')) {
      page = page.substring(8);
    } else if (page.startsWith('http://')) {
      page = page.substring(7);
    }
    if (page.startsWith('www.')) {
      page = page.substring(4);
    }
    for (let i = 3; i < page.length; i++) {
      const c = page[i];
      if (c === '#' || c === '?') {
        return page.substring(0, i);
      }
    }
    return page;
  }
  return '';
}

function clearEmpties(o) {
  for (let k in o) {
    if (o[k] === null) {
      delete o[k];
      continue;
    }
    if (!o[k] || typeof o[k] !== 'object') {
      continue;
    }
    clearEmpties(o[k]);
    if (Object.keys(o[k]).length === 0) {
      delete o[k];
    }
  }
  return o;
}

registerBidder(spec);
