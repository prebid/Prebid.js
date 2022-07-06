import {
  deepAccess,
  deepSetValue,
  getWindowTop,
  isArray,
  isArrayOfNums,
  isBoolean,
  isEmpty,
  isInteger,
  isNumber,
  isStr,
  logError,
  parseQueryStringParameters,
  parseUrl
} from '../src/utils.js';
import {BANNER, VIDEO} from '../src/mediaTypes.js';
import {registerBidder} from '../src/adapters/bidderFactory.js';
import {Renderer} from '../src/Renderer.js';
import {find, includes} from '../src/polyfill.js';
import {createEidsArray} from './userId/eids.js';

const BIDDER_CODE = 'yieldmo';
const CURRENCY = 'USD';
const TIME_TO_LIVE = 300;
const NET_REVENUE = true;
const BANNER_SERVER_ENDPOINT = 'https://ads.yieldmo.com/exchange/prebid';
const VIDEO_SERVER_ENDPOINT = 'https://ads.yieldmo.com/exchange/prebidvideo';
const PB_COOKIE_ASSIST_SYNC_ENDPOINT = `https://ads.yieldmo.com/pbcas`;
const OUTSTREAM_VIDEO_PLAYER_URL = 'https://prebid-outstream.yieldmo.com/bundle.js';
const OPENRTB_VIDEO_BIDPARAMS = ['mimes', 'startdelay', 'placement', 'startdelay', 'skipafter', 'protocols', 'api',
  'playbackmethod', 'maxduration', 'minduration', 'pos', 'skip', 'skippable'];
const OPENRTB_VIDEO_SITEPARAMS = ['name', 'domain', 'cat', 'keywords'];
const LOCAL_WINDOW = getWindowTop();
const DEFAULT_PLAYBACK_METHOD = 2;
const DEFAULT_START_DELAY = 0;
const VAST_TIMEOUT = 15000;
const MAX_BANNER_REQUEST_URL_LENGTH = 8000;
const BANNER_REQUEST_PROPERTIES_TO_REDUCE = ['description', 'title', 'pr', 'page_url'];

export const spec = {
  code: BIDDER_CODE,
  supportedMediaTypes: [BANNER, VIDEO],

  /**
   * Determines whether or not the given bid request is valid.
   * @param {object} bid, bid to validate
   * @return boolean, true if valid, otherwise false
   */
  isBidRequestValid: function (bid) {
    return !!(bid && bid.adUnitCode && bid.bidId && (hasBannerMediaType(bid) || hasVideoMediaType(bid)) &&
      validateVideoParams(bid));
  },

  /**
   * Make a server request from the list of BidRequests.
   *
   * @param {BidRequest[]} bidRequests A non-empty list of bid requests which should be sent to the Server.
   * @param {BidderRequest} bidderRequest bidder request object.
   * @return ServerRequest Info describing the request to the server.
   */
  buildRequests: function (bidRequests, bidderRequest) {
    const bannerBidRequests = bidRequests.filter(request => hasBannerMediaType(request));
    const videoBidRequests = bidRequests.filter(request => hasVideoMediaType(request));
    let serverRequests = [];
    const eids = getEids(bidRequests[0]) || [];
    if (bannerBidRequests.length > 0) {
      let serverRequest = {
        pbav: '$prebid.version$',
        p: [],
        // TODO: is 'page' the right value here?
        page_url: bidderRequest.refererInfo.page,
        bust: new Date().getTime().toString(),
        dnt: getDNT(),
        description: getPageDescription(),
        userConsent: JSON.stringify({
          // case of undefined, stringify will remove param
          gdprApplies: deepAccess(bidderRequest, 'gdprConsent.gdprApplies') || '',
          cmp: deepAccess(bidderRequest, 'gdprConsent.consentString') || ''
        }),
        us_privacy: deepAccess(bidderRequest, 'uspConsent') || ''
      };

      if (canAccessTopWindow()) {
        serverRequest.pr = (LOCAL_WINDOW.document && LOCAL_WINDOW.document.referrer) || '';
        serverRequest.scrd = LOCAL_WINDOW.devicePixelRatio || 0;
        serverRequest.title = LOCAL_WINDOW.document.title || '';
        serverRequest.w = LOCAL_WINDOW.innerWidth;
        serverRequest.h = LOCAL_WINDOW.innerHeight;
      }

      const mtp = window.navigator.maxTouchPoints;
      if (mtp) {
        serverRequest.mtp = mtp;
      }

      bannerBidRequests.forEach(request => {
        serverRequest.p.push(addPlacement(request));
        const pubcid = getId(request, 'pubcid');
        if (pubcid) {
          serverRequest.pubcid = pubcid;
        } else if (request.crumbs && request.crumbs.pubcid) {
          serverRequest.pubcid = request.crumbs.pubcid;
        }
        const tdid = getId(request, 'tdid');
        if (tdid) {
          serverRequest.tdid = tdid;
        }
        const criteoId = getId(request, 'criteoId');
        if (criteoId) {
          serverRequest.cri_prebid = criteoId;
        }
        if (request.schain) {
          serverRequest.schain = JSON.stringify(request.schain);
        }
        if (deepAccess(request, 'params.lr_env')) {
          serverRequest.ats_envelope = request.params.lr_env;
        }
      });
      serverRequest.p = '[' + serverRequest.p.toString() + ']';

      if (eids.length) {
        serverRequest.eids = JSON.stringify(eids);
      };
      // check if url exceeded max length
      const url = `${BANNER_SERVER_ENDPOINT}?${parseQueryStringParameters(serverRequest)}`;
      let extraCharacters = url.length - MAX_BANNER_REQUEST_URL_LENGTH;
      if (extraCharacters > 0) {
        for (let i = 0; i < BANNER_REQUEST_PROPERTIES_TO_REDUCE.length; i++) {
          extraCharacters = shortcutProperty(extraCharacters, serverRequest, BANNER_REQUEST_PROPERTIES_TO_REDUCE[i]);

          if (extraCharacters <= 0) {
            break;
          }
        }
      }

      serverRequests.push({
        method: 'GET',
        url: BANNER_SERVER_ENDPOINT,
        data: serverRequest
      });
    }

    if (videoBidRequests.length > 0) {
      const serverRequest = openRtbRequest(videoBidRequests, bidderRequest);
      if (eids.length) {
        serverRequest.user = { eids };
      };
      serverRequests.push({
        method: 'POST',
        url: VIDEO_SERVER_ENDPOINT,
        data: serverRequest
      });
    }
    return serverRequests;
  },

  /**
   * Makes Yieldmo Ad Server response compatible to Prebid specs
   * @param {ServerResponse} serverResponse successful response from Ad Server
   * @param {ServerRequest} bidRequest
   * @return {Bid[]} an array of bids
   */
  interpretResponse: function (serverResponse, bidRequest) {
    let bids = [];
    const data = serverResponse.body;
    if (data.length > 0) {
      data.forEach(response => {
        if (response.cpm > 0) {
          bids.push(createNewBannerBid(response));
        }
      });
    }
    if (data.seatbid) {
      const seatbids = data.seatbid.reduce((acc, seatBid) => acc.concat(seatBid.bid), []);
      seatbids.forEach(bid => bids.push(createNewVideoBid(bid, bidRequest)));
    }
    return bids;
  },

  getUserSyncs: function(syncOptions, serverResponses, gdprConsent = {}, uspConsent = '') {
    const syncs = [];
    const gdprFlag = `&gdpr=${gdprConsent.gdprApplies ? 1 : 0}`;
    const gdprString = `&gdpr_consent=${encodeURIComponent((gdprConsent.consentString || ''))}`;
    const usPrivacy = `us_privacy=${encodeURIComponent(uspConsent)}`;
    const pbCookieAssistSyncUrl = `${PB_COOKIE_ASSIST_SYNC_ENDPOINT}?${usPrivacy}${gdprFlag}${gdprString}`;

    if (syncOptions.iframeEnabled) {
      syncs.push({
        type: 'iframe',
        url: pbCookieAssistSyncUrl + '&type=iframe'
      });
    } else if (syncOptions.pixelEnabled) {
      syncs.push({
        type: 'image',
        url: pbCookieAssistSyncUrl + '&type=image'
      });
    }
    return syncs;
  }
};
registerBidder(spec);

/***************************************
 * Helper Functions
 ***************************************/

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

/**
 * Adds placement information to array
 * @param request bid request
 */
function addPlacement(request) {
  const gpid = deepAccess(request, 'ortb2Imp.ext.data.pbadslot');
  const placementInfo = {
    placement_id: request.adUnitCode,
    callback_id: request.bidId,
    sizes: request.mediaTypes.banner.sizes
  };
  if (request.params) {
    if (request.params.placementId) {
      placementInfo.ym_placement_id = request.params.placementId;
    }
    const bidfloor = getBidFloor(request, BANNER);
    if (bidfloor) {
      placementInfo.bidFloor = bidfloor;
    }
  }
  if (gpid) {
    placementInfo.gpid = gpid;
  }
  return JSON.stringify(placementInfo);
}

/**
 * creates a new banner bid with response information
 * @param response server response
 */
function createNewBannerBid(response) {
  return {
    dealId: response.publisherDealId,
    requestId: response['callback_id'],
    cpm: response.cpm,
    width: response.width,
    height: response.height,
    creativeId: response.creative_id,
    currency: CURRENCY,
    netRevenue: NET_REVENUE,
    ttl: TIME_TO_LIVE,
    ad: response.ad,
    meta: {
      advertiserDomains: response.adomain || [],
      mediaType: BANNER,
    },
  };
}

/**
 * creates a new video bid with response information
 * @param response openRTB server response
 * @param bidRequest server request
 */
function createNewVideoBid(response, bidRequest) {
  const imp = find((deepAccess(bidRequest, 'data.imp') || []), imp => imp.id === response.impid);

  let result = {
    dealId: response.dealid,
    requestId: imp.id,
    cpm: response.price,
    width: imp.video.w,
    height: imp.video.h,
    creativeId: response.crid || response.adid,
    currency: CURRENCY,
    netRevenue: NET_REVENUE,
    mediaType: VIDEO,
    ttl: TIME_TO_LIVE,
    vastXml: response.adm,
    meta: {
      advertiserDomains: response.adomain || [],
      mediaType: VIDEO,
    },
  };

  if (imp.video.placement && imp.video.placement !== 1) {
    const renderer = Renderer.install({
      url: OUTSTREAM_VIDEO_PLAYER_URL,
      config: {
        width: result.width,
        height: result.height,
        vastTimeout: VAST_TIMEOUT,
        maxAllowedVastTagRedirects: 5,
        allowVpaid: true,
        autoPlay: true,
        preload: true,
        mute: true
      },
      id: imp.tagid,
      loaded: false,
    });

    renderer.setRender(function (bid) {
      bid.renderer.push(() => {
        const { id, config } = bid.renderer;
        window.YMoutstreamPlayer(bid, id, config);
      });
    });

    result.renderer = renderer;
  }

  return result;
}

/**
 * Detects whether dnt is true
 * @returns true if user enabled dnt
 */
function getDNT() {
  return (
    window.doNotTrack === '1' || window.navigator.doNotTrack === '1' || false
  );
}

/**
 * get page description
 */
function getPageDescription() {
  if (document.querySelector('meta[name="description"]')) {
    return document
      .querySelector('meta[name="description"]')
      .getAttribute('content') || ''; // Value of the description metadata from the publisher's page.
  } else {
    return '';
  }
}

/**
 * Gets an id from the userId object if it exists
 * @param {*} request
 * @param {*} idType
 * @returns an id if there is one, or undefined
 */
function getId(request, idType) {
  return (typeof deepAccess(request, 'userId') === 'object') ? request.userId[idType] : undefined;
}

/**
 * @param {BidRequest[]} bidRequests bid request object
 * @param {BidderRequest} bidderRequest bidder request object
 * @return Object OpenRTB request object
 */
function openRtbRequest(bidRequests, bidderRequest) {
  const schain = bidRequests[0].schain;
  let openRtbRequest = {
    id: bidRequests[0].bidderRequestId,
    at: 1,
    imp: bidRequests.map(bidRequest => openRtbImpression(bidRequest)),
    site: openRtbSite(bidRequests[0], bidderRequest),
    device: openRtbDevice(bidRequests[0]),
    badv: bidRequests[0].params.badv || [],
    bcat: deepAccess(bidderRequest, 'bcat') || bidRequests[0].params.bcat || [],
    ext: {
      prebid: '$prebid.version$',
    },
    ats_envelope: bidRequests[0].params.lr_env,
  };

  if (schain) {
    openRtbRequest.schain = schain;
  }

  populateOpenRtbGdpr(openRtbRequest, bidderRequest);

  return openRtbRequest;
}

/**
 * @param {BidRequest} bidRequest bidder request object.
 * @return Object OpenRTB's 'imp' (impression) object
 */
function openRtbImpression(bidRequest) {
  const gpid = deepAccess(bidRequest, 'ortb2Imp.ext.data.pbadslot');
  const size = extractPlayerSize(bidRequest);
  const imp = {
    id: bidRequest.bidId,
    tagid: bidRequest.adUnitCode,
    bidfloor: getBidFloor(bidRequest, VIDEO),
    ext: {
      placement_id: bidRequest.params.placementId
    },
    video: {
      w: size[0],
      h: size[1],
      linearity: 1
    }
  };

  const mediaTypesParams = deepAccess(bidRequest, 'mediaTypes.video');
  Object.keys(mediaTypesParams)
    .filter(param => includes(OPENRTB_VIDEO_BIDPARAMS, param))
    .forEach(param => imp.video[param] = mediaTypesParams[param]);

  const videoParams = deepAccess(bidRequest, 'params.video');
  Object.keys(videoParams)
    .filter(param => includes(OPENRTB_VIDEO_BIDPARAMS, param))
    .forEach(param => imp.video[param] = videoParams[param]);

  if (imp.video.skippable) {
    imp.video.skip = 1;
    delete imp.video.skippable;
  }
  if (imp.video.placement !== 1) {
    imp.video.startdelay = DEFAULT_START_DELAY;
    imp.video.playbackmethod = [ DEFAULT_PLAYBACK_METHOD ];
  }
  if (gpid) {
    imp.ext.gpid = gpid;
  }
  return imp;
}

function getBidFloor(bidRequest, mediaType) {
  let floorInfo = {};

  if (typeof bidRequest.getFloor === 'function') {
    floorInfo = bidRequest.getFloor({ currency: CURRENCY, mediaType, size: '*' });
  }

  return floorInfo.floor || bidRequest.params.bidfloor || bidRequest.params.bidFloor || 0;
}

/**
 * @param {BidRequest} bidRequest bidder request object.
 * @return [number, number] || null Player's width and height, or undefined otherwise.
 */
function extractPlayerSize(bidRequest) {
  const sizeArr = deepAccess(bidRequest, 'mediaTypes.video.playerSize');
  if (isArrayOfNums(sizeArr, 2)) {
    return sizeArr;
  } else if (isArray(sizeArr) && isArrayOfNums(sizeArr[0], 2)) {
    return sizeArr[0];
  }
  return null;
}

/**
 * @param {BidRequest} bidRequest bid request object
 * @param {BidderRequest} bidderRequest bidder request object
 * @return Object OpenRTB's 'site' object
 */
function openRtbSite(bidRequest, bidderRequest) {
  let result = {};

  const loc = parseUrl(deepAccess(bidderRequest, 'refererInfo.page'));
  if (!isEmpty(loc)) {
    result.page = `${loc.protocol}://${loc.hostname}${loc.pathname}`;
  }

  if (bidderRequest.refererInfo?.ref) {
    result.ref = bidderRequest.refererInfo.ref;
  }

  const keywords = document.getElementsByTagName('meta')['keywords'];
  if (keywords && keywords.content) {
    result.keywords = keywords.content;
  }

  const siteParams = deepAccess(bidRequest, 'params.site');
  if (siteParams) {
    Object.keys(siteParams)
      .filter(param => includes(OPENRTB_VIDEO_SITEPARAMS, param))
      .forEach(param => result[param] = siteParams[param]);
  }
  return result;
}

/**
 * @return Object OpenRTB's 'device' object
 */
function openRtbDevice(bidRequest) {
  const deviceObj = {
    ua: navigator.userAgent,
    language: (navigator.language || navigator.browserLanguage || navigator.userLanguage || navigator.systemLanguage),
  };
  return deviceObj;
}

/**
 * Updates openRtbRequest with GDPR info from bidderRequest, if present.
 * @param {Object} openRtbRequest OpenRTB's request to update.
 * @param {BidderRequest} bidderRequest bidder request object.
 */
function populateOpenRtbGdpr(openRtbRequest, bidderRequest) {
  const gdpr = bidderRequest.gdprConsent;
  if (gdpr && 'gdprApplies' in gdpr) {
    deepSetValue(openRtbRequest, 'regs.ext.gdpr', gdpr.gdprApplies ? 1 : 0);
    deepSetValue(openRtbRequest, 'user.ext.consent', gdpr.consentString);
  }
  const uspConsent = deepAccess(bidderRequest, 'uspConsent');
  if (uspConsent) {
    deepSetValue(openRtbRequest, 'regs.ext.us_privacy', uspConsent);
  }
}

/**
 * Determines whether or not the given video bid request is valid. If it's not a video bid, returns true.
 * @param {object} bid, bid to validate
 * @return boolean, true if valid, otherwise false
 */
function validateVideoParams(bid) {
  if (!hasVideoMediaType(bid)) {
    return true;
  }

  const paramRequired = (paramStr, value, conditionStr) => {
    let error = `"${paramStr}" is required`;
    if (conditionStr) {
      error += ' when ' + conditionStr;
    }
    throw new Error(error);
  }

  const paramInvalid = (paramStr, value, expectedStr) => {
    expectedStr = expectedStr ? ', expected: ' + expectedStr : '';
    value = JSON.stringify(value);
    throw new Error(`"${paramStr}"=${value} is invalid${expectedStr}`);
  }

  const isDefined = val => typeof val !== 'undefined';
  const validate = (fieldPath, validateCb, errorCb, errorCbParam) => {
    if (fieldPath.indexOf('video') === 0) {
      const valueFieldPath = 'params.' + fieldPath;
      const mediaFieldPath = 'mediaTypes.' + fieldPath;
      const valueParams = deepAccess(bid, valueFieldPath);
      const mediaTypesParams = deepAccess(bid, mediaFieldPath);
      const hasValidValueParams = validateCb(valueParams);
      const hasValidMediaTypesParams = validateCb(mediaTypesParams);

      if (hasValidValueParams) return valueParams;
      else if (hasValidMediaTypesParams) return hasValidMediaTypesParams;
      else {
        if (!hasValidValueParams) errorCb(valueFieldPath, valueParams, errorCbParam);
        else if (!hasValidMediaTypesParams) errorCb(mediaFieldPath, mediaTypesParams, errorCbParam);
      }
      return valueParams || mediaTypesParams;
    } else {
      const value = deepAccess(bid, fieldPath);
      if (!validateCb(value)) {
        errorCb(fieldPath, value, errorCbParam);
      }
      return value;
    }
  }

  try {
    validate('video.context', val => !isEmpty(val), paramRequired);

    validate('params.placementId', val => !isEmpty(val), paramRequired);

    validate('video.playerSize', val => isArrayOfNums(val, 2) ||
      (isArray(val) && val.every(v => isArrayOfNums(v, 2))),
    paramInvalid, 'array of 2 integers, ex: [640,480] or [[640,480]]');

    validate('video.mimes', val => isDefined(val), paramRequired);
    validate('video.mimes', val => isArray(val) && val.every(v => isStr(v)), paramInvalid,
      'array of strings, ex: ["video/mp4"]');

    const placement = validate('video.placement', val => isDefined(val), paramRequired);
    validate('video.placement', val => val >= 1 && val <= 5, paramInvalid);
    if (placement === 1) {
      validate('video.startdelay', val => isDefined(val),
        (field, v) => paramRequired(field, v, 'placement == 1'));
      validate('video.startdelay', val => isNumber(val), paramInvalid, 'number, ex: 5');
    }

    validate('video.protocols', val => isDefined(val), paramRequired);
    validate('video.protocols', val => isArrayOfNums(val) && val.every(v => (v >= 1 && v <= 6)),
      paramInvalid, 'array of numbers, ex: [2,3]');

    validate('video.api', val => isDefined(val), paramRequired);
    validate('video.api', val => isArrayOfNums(val) && val.every(v => (v >= 1 && v <= 6)),
      paramInvalid, 'array of numbers, ex: [2,3]');

    validate('video.playbackmethod', val => !isDefined(val) || isArrayOfNums(val), paramInvalid,
      'array of integers, ex: [2,6]');

    validate('video.maxduration', val => isDefined(val), paramRequired);
    validate('video.maxduration', val => isInteger(val), paramInvalid);
    validate('video.minduration', val => !isDefined(val) || isNumber(val), paramInvalid);
    validate('video.skippable', val => !isDefined(val) || isBoolean(val), paramInvalid);
    validate('video.skipafter', val => !isDefined(val) || isNumber(val), paramInvalid);
    validate('video.pos', val => !isDefined(val) || isNumber(val), paramInvalid);
    validate('params.badv', val => !isDefined(val) || isArray(val), paramInvalid,
      'array of strings, ex: ["ford.com","pepsi.com"]');
    validate('params.bcat', val => !isDefined(val) || isArray(val), paramInvalid,
      'array of strings, ex: ["IAB1-5","IAB1-6"]');
    return true;
  } catch (e) {
    logError(e.message);
    return false;
  }
}

/**
 * Shortcut object property and check if required characters count was deleted
 *
 * @param {number} extraCharacters, count of characters to remove
 * @param {object} target, object on which string property length should be reduced
 * @param {string} propertyName, name of property to reduce
 * @return {number} 0 if required characters count was removed otherwise count of how many left
 */
function shortcutProperty(extraCharacters, target, propertyName) {
  if (target[propertyName].length > extraCharacters) {
    target[propertyName] = target[propertyName].substring(0, target[propertyName].length - extraCharacters);

    return 0
  }

  const charactersLeft = extraCharacters - target[propertyName].length;

  target[propertyName] = '';

  return charactersLeft;
}

/**
 * Creates and returnes eids arr using createEidsArray from './userId/eids.js' module;
 * @param {Object} openRtbRequest OpenRTB's request as a cource of userId.
 * @return array of eids objects
 */
function getEids(bidRequest) {
  if (deepAccess(bidRequest, 'userId')) {
    return createEidsArray(bidRequest.userId) || [];
  }
};

/**
 * Check if top window can be accessed
 *
 * @return {boolean} true if can access top window otherwise false
 */
function canAccessTopWindow() {
  try {
    if (getWindowTop().location.href) {
      return true;
    }
  } catch (error) {
    return false;
  }
}
