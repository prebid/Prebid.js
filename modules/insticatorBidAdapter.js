import {config} from '../src/config.js';
import {BANNER, VIDEO} from '../src/mediaTypes.js';
import {registerBidder} from '../src/adapters/bidderFactory.js';
import {deepAccess, generateUUID, logError, isArray, isInteger, isArrayOfNums, deepSetValue, isFn, logWarn} from '../src/utils.js';
import {getStorageManager} from '../src/storageManager.js';
import {find} from '../src/polyfill.js';

const BIDDER_CODE = 'insticator';
const ENDPOINT = 'https://ex.ingage.tech/v1/openrtb'; // production endpoint
const USER_ID_KEY = 'hb_insticator_uid';
const USER_ID_COOKIE_EXP = 2592000000; // 30 days
const BID_TTL = 300; // 5 minutes
const GVLID = 910;

export const OPTIONAL_VIDEO_PARAMS = {
  'minduration': (value) => isInteger(value),
  'maxduration': (value) => isInteger(value),
  'protocols': (value) => isArrayOfNums(value), // protocols values supported by Inticator, according to the OpenRTB spec
  'startdelay': (value) => isInteger(value),
  'linearity': (value) => isInteger(value) && [1].includes(value),
  'skip': (value) => isInteger(value) && [1, 0].includes(value),
  'skipmin': (value) => isInteger(value),
  'skipafter': (value) => isInteger(value),
  'sequence': (value) => isInteger(value),
  'battr': (value) => isArrayOfNums(value),
  'maxextended': (value) => isInteger(value),
  'minbitrate': (value) => isInteger(value),
  'maxbitrate': (value) => isInteger(value),
  'playbackmethod': (value) => isArrayOfNums(value),
  'playbackend': (value) => isInteger(value) && [1, 2, 3].includes(value),
  'delivery': (value) => isArrayOfNums(value),
  'pos': (value) => isInteger(value) && [0, 1, 2, 3, 4, 5, 6, 7].includes(value),
  'api': (value) => isArrayOfNums(value),
};

const ORTB_SITE_FIRST_PARTY_DATA = {
  'cat': v => Array.isArray(v) && v.every(c => typeof c === 'string'),
  'sectioncat': v => Array.isArray(v) && v.every(c => typeof c === 'string'),
  'pagecat': v => Array.isArray(v) && v.every(c => typeof c === 'string'),
  'search': v => typeof v === 'string',
  'mobile': v => isInteger(),
  'content': v => typeof v === 'object',
  'keywords': v => typeof v === 'string',
}

export const storage = getStorageManager({bidderCode: BIDDER_CODE});

config.setDefaults({
  insticator: {
    endpointUrl: ENDPOINT,
    bidTTL: BID_TTL,
  },
});

function getUserId() {
  let uid;

  if (storage.localStorageIsEnabled()) {
    uid = storage.getDataFromLocalStorage(USER_ID_KEY);
  } else {
    uid = storage.getCookie(USER_ID_KEY);
  }

  if (uid && uid.length !== 36) {
    uid = undefined;
  }

  return uid;
}

function setUserId(userId) {
  if (storage.localStorageIsEnabled()) {
    storage.setDataInLocalStorage(USER_ID_KEY, userId);
  }

  if (storage.cookiesAreEnabled()) {
    const expires = new Date(Date.now() + USER_ID_COOKIE_EXP).toUTCString();
    storage.setCookie(USER_ID_KEY, userId, expires);
  }
}

function buildBanner(bidRequest) {
  const format = [];
  const pos = deepAccess(bidRequest, 'mediaTypes.banner.pos');
  const sizes =
    deepAccess(bidRequest, 'mediaTypes.banner.sizes') || bidRequest.sizes;

  for (const size of sizes) {
    format.push({
      w: size[0],
      h: size[1],
    });
  }

  return {
    format,
    pos,
  }
}

function buildVideo(bidRequest) {
  let w = deepAccess(bidRequest, 'mediaTypes.video.w');
  let h = deepAccess(bidRequest, 'mediaTypes.video.h');
  const mimes = deepAccess(bidRequest, 'mediaTypes.video.mimes');
  const placement = deepAccess(bidRequest, 'mediaTypes.video.placement');
  const plcmt = deepAccess(bidRequest, 'mediaTypes.video.plcmt') || undefined;
  const playerSize = deepAccess(bidRequest, 'mediaTypes.video.playerSize');
  const context = deepAccess(bidRequest, 'mediaTypes.video.context');

  if (!w && playerSize) {
    if (Array.isArray(playerSize[0])) {
      w = parseInt(playerSize[0][0], 10);
    } else if (typeof playerSize[0] === 'number' && !isNaN(playerSize[0])) {
      w = parseInt(playerSize[0], 10);
    }
  }
  if (!h && playerSize) {
    if (Array.isArray(playerSize[0])) {
      h = parseInt(playerSize[0][1], 10);
    } else if (typeof playerSize[1] === 'number' && !isNaN(playerSize[1])) {
      h = parseInt(playerSize[1], 10);
    }
  }

  const bidRequestVideo = deepAccess(bidRequest, 'mediaTypes.video');
  const videoBidderParams = deepAccess(bidRequest, 'params.video', {});

  let optionalParams = {};
  for (const param in OPTIONAL_VIDEO_PARAMS) {
    if (bidRequestVideo[param] && OPTIONAL_VIDEO_PARAMS[param](bidRequestVideo[param])) {
      optionalParams[param] = bidRequestVideo[param];
    }
    // remove invalid optional params from bidder specific overrides
    if (videoBidderParams[param] && !OPTIONAL_VIDEO_PARAMS[param](videoBidderParams[param])) {
      delete videoBidderParams[param];
    }
  }

  if (placement && typeof placement !== 'undefined' && typeof placement === 'number') {
    optionalParams['placement'] = placement;
  }

  if (plcmt) {
    optionalParams['plcmt'] = plcmt;
  }

  if (context !== undefined) {
    optionalParams['context'] = context;
  }

  let videoObj = {
    mimes,
    w,
    h,
    ...optionalParams,
    ...videoBidderParams // bidder specific overrides for video
  }

  return videoObj
}

function buildImpression(bidRequest) {
  const imp = {
    id: bidRequest.bidId,
    tagid: bidRequest.adUnitCode,
    instl: deepAccess(bidRequest, 'ortb2Imp.instl'),
    secure: location.protocol === 'https:' ? 1 : 0,
    ext: {
      gpid: deepAccess(bidRequest, 'ortb2Imp.ext.gpid'),
      insticator: {
        adUnitId: bidRequest.params.adUnitId,
      },
    },
  }

  let bidFloor = parseFloat(deepAccess(bidRequest, 'params.floor'));

  if (!isNaN(bidFloor)) {
    imp.bidfloor = deepAccess(bidRequest, 'params.floor');
    imp.bidfloorcur = 'USD';
    const bidfloorcur = deepAccess(bidRequest, 'params.bidfloorcur')
    if (bidfloorcur && bidfloorcur !== 'USD') {
      delete imp.bidfloor;
      delete imp.bidfloorcur;
      logWarn('insticator: bidfloorcur supported by insticator is USD only. ignoring bidfloor and bidfloorcur params');
    }
  }

  if (deepAccess(bidRequest, 'mediaTypes.banner')) {
    imp.banner = buildBanner(bidRequest);
  }

  if (deepAccess(bidRequest, 'mediaTypes.video')) {
    imp.video = buildVideo(bidRequest);
  }

  if (isFn(bidRequest.getFloor)) {
    let moduleBidFloor;

    const mediaType = deepAccess(bidRequest, 'mediaTypes.banner') ? 'banner' : deepAccess(bidRequest, 'mediaTypes.video') ? 'video' : undefined;

    let _mediaType = mediaType;
    let _size = '*';

    if (mediaType && ['banner', 'video'].includes(mediaType)) {
      if (mediaType === 'banner') {
        const { w: width, h: height } = imp[mediaType];
        if (width && height) {
          _size = [width, height];
        } else {
          const sizes = deepAccess(bidRequest, 'mediaTypes.banner.format');
          if (sizes && sizes.length > 0) {
            const {w: width, h: height} = sizes[0];
            _size = [width, height];
          }
        }
      } else if (mediaType === 'video') {
        const { w: width, h: height } = imp[mediaType];
        _mediaType = mediaType;
        _size = [width, height];
      }
    }
    try {
      moduleBidFloor = bidRequest.getFloor({
        currency: 'USD',
        mediaType: _mediaType,
        size: _size
      });
    } catch (err) {
      // continue with no module floors
      logWarn('priceFloors module call getFloor failed, error : ', err);
    }

    if (moduleBidFloor) {
      imp.bidfloor = moduleBidFloor.floor;
      imp.bidfloorcur = moduleBidFloor.currency;
    }
  }

  return imp;
}

function buildDevice(bidRequest) {
  const ortb2Data = bidRequest?.ortb2 || {};
  const deviceConfig = ortb2Data?.device || {}

  const device = {
    w: window.innerWidth,
    h: window.innerHeight,
    js: true,
    ext: {
      localStorage: storage.localStorageIsEnabled(),
      cookies: storage.cookiesAreEnabled(),
    },
  };

  if (typeof deviceConfig === 'object') {
    Object.assign(device, deviceConfig);
  }

  return device;
}

function _getCoppa(bidderRequest) {
  const coppa = deepAccess(bidderRequest, 'ortb2.regs.coppa');

  // If coppa is defined in the request, use it
  if (coppa !== undefined) {
    return coppa;
  }
  return config.getConfig('coppa') === true ? 1 : 0;
}

function _getGppConsent(bidderRequest) {
  let gpp = deepAccess(bidderRequest, 'gppConsent.gppString')
  let gppSid = deepAccess(bidderRequest, 'gppConsent.applicableSections')

  if (!gpp || !gppSid) {
    gpp = deepAccess(bidderRequest, 'ortb2.regs.gpp', '')
    gppSid = deepAccess(bidderRequest, 'ortb2.regs.gpp_sid', [])
  }
  return { gpp, gppSid }
}

function _getUspConsent(bidderRequest) {
  return (deepAccess(bidderRequest, 'uspConsent')) ? { uspConsent: bidderRequest.uspConsent } : false;
}

function buildRegs(bidderRequest) {
  let regs = {
    ext: {},
  };
  if (bidderRequest.gdprConsent) {
    regs.ext.gdpr = bidderRequest.gdprConsent.gdprApplies ? 1 : 0;
    regs.ext.gdprConsentString = bidderRequest.gdprConsent.consentString;
  }

  regs.coppa = _getCoppa(bidderRequest);

  const { gpp, gppSid } = _getGppConsent(bidderRequest);

  if (gpp) {
    regs.ext.gpp = gpp;
  }

  if (gppSid) {
    regs.ext.gppSid = gppSid;
  }

  const usp = _getUspConsent(bidderRequest);

  if (usp) {
    regs.ext.us_privacy = usp.uspConsent;
    regs.ext.ccpa = usp.uspConsent
  }

  const dsa = deepAccess(bidderRequest, 'ortb2.regs.ext.dsa');
  if (dsa) {
    regs.ext.dsa = dsa;
  }

  return regs;
}

function buildUser(bid) {
  const userId = getUserId() || generateUUID();
  const yob = deepAccess(bid, 'params.user.yob')
  const gender = deepAccess(bid, 'params.user.gender')
  const keywords = deepAccess(bid, 'params.user.keywords')
  const data = deepAccess(bid, 'params.user.data')
  const ext = deepAccess(bid, 'params.user.ext')

  setUserId(userId);

  const userData = {
    id: userId,
  }

  if (yob) {
    userData.yob = yob;
  }

  if (gender) {
    userData.gender = gender;
  }

  if (keywords) {
    userData.keywords = keywords;
  }

  if (data) {
    userData.data = data;
  }

  if (ext) {
    userData.ext = ext;
  }

  return userData
}

function extractSchain(bids, requestId) {
  if (!bids || bids.length === 0 || !bids[0].schain) return;

  const schain = bids[0].schain;
  if (schain && schain.nodes && schain.nodes.length && schain.nodes[0]) {
    schain.nodes[0].rid = requestId;
  }

  return schain;
}

function extractEids(bids) {
  if (!bids) return;

  const bid = bids.find(bid => isArray(bid.userIdAsEids) && bid.userIdAsEids.length > 0);
  return bid ? bid.userIdAsEids : bids[0].userIdAsEids;
}

function buildRequest(validBidRequests, bidderRequest) {
  const req = {
    id: bidderRequest.bidderRequestId,
    tmax: bidderRequest.timeout,
    source: {
      fd: 1,
      tid: bidderRequest.ortb2?.source?.tid,
    },
    site: {
      // TODO: are these the right refererInfo values?
      domain: bidderRequest.refererInfo.domain,
      page: bidderRequest.refererInfo.page,
      ref: bidderRequest.refererInfo.ref,
    },
    device: buildDevice(bidderRequest),
    regs: buildRegs(bidderRequest),
    user: buildUser(validBidRequests[0]),
    imp: validBidRequests.map((bidRequest) => buildImpression(bidRequest)),
    ext: {
      insticator: {
        adapter: {
          vendor: 'prebid',
          prebid: '$prebid.version$'
        }
      }
    }
  };

  const params = config.getConfig('insticator.params');

  if (params) {
    req.ext = {
      insticator: {...req.ext.insticator, ...params},
    };
  }

  const schain = extractSchain(validBidRequests, bidderRequest.bidderRequestId);

  if (schain) {
    req.source.ext = { schain };
  }

  const eids = extractEids(validBidRequests);

  if (eids) {
    req.user.ext = { eids };
  }

  const ortb2SiteData = deepAccess(bidderRequest, 'ortb2.site');
  if (ortb2SiteData) {
    for (const key in ORTB_SITE_FIRST_PARTY_DATA) {
      const value = ortb2SiteData[key];
      if (value && ORTB_SITE_FIRST_PARTY_DATA[key](value)) {
        req.site[key] = value;
      }
    }
  }

  if (bidderRequest.gdprConsent) {
    deepSetValue(req, 'user.ext.consent', bidderRequest.gdprConsent.consentString);
  }

  return req;
}

function buildBid(bid, bidderRequest) {
  const originalBid = find(bidderRequest.bids, (b) => b.bidId === bid.impid);
  let meta = {}

  if (bid.ext && bid.ext.meta) {
    meta = bid.ext.meta
  }

  if (bid.adomain) {
    meta.advertiserDomains = bid.adomain
  }

  let mediaType = 'banner';
  if (bid.adm && bid.adm.includes('<VAST')) {
    mediaType = 'video';
  }
  let bidResponse = {
    requestId: bid.impid,
    creativeId: bid.crid,
    cpm: bid.price,
    currency: 'USD',
    netRevenue: true,
    ttl: bid.exp || config.getConfig('insticator.bidTTL') || BID_TTL,
    width: bid.w,
    height: bid.h,
    mediaType: mediaType,
    ad: bid.adm,
    adUnitCode: originalBid.adUnitCode,
    ...(Object.keys(meta).length > 0 ? {meta} : {})
  };

  if (mediaType === 'video') {
    bidResponse.vastXml = bid.adm;
  }

  // Inticator bid adaptor only returns `vastXml` for video bids. No VastUrl or videoCache.
  if (!bidResponse.vastUrl && bidResponse.vastXml) {
    bidResponse.vastUrl = 'data:text/xml;charset=utf-8;base64,' + window.btoa(bidResponse.vastXml.replace(/\\"/g, '"'));
  }

  if (bid.ext && bid.ext.dsa) {
    bidResponse.ext = {
      ...bidResponse.ext,
      dsa: bid.ext.dsa,
    }
  }

  return bidResponse;
}

function buildBidSet(seatbid, bidderRequest) {
  return seatbid.bid.map((bid) => buildBid(bid, bidderRequest));
}

function validateSize(size) {
  return (
    size instanceof Array &&
    size.length === 2 &&
    typeof size[0] === 'number' &&
    typeof size[1] === 'number'
  );
}

function validateSizes(sizes) {
  return (
    sizes instanceof Array &&
    sizes.length > 0 &&
    sizes.map(validateSize).reduce((a, b) => a && b, true)
  );
}

function validateAdUnitId(bid) {
  if (!bid.params.adUnitId) {
    logError('insticator: missing adUnitId bid parameter');
    return false;
  }

  return true;
}

function validateMediaType(bid) {
  if (!(BANNER in bid.mediaTypes || VIDEO in bid.mediaTypes)) {
    logError('insticator: expected banner or video in mediaTypes');
    return false;
  }

  return true;
}

function validateBanner(bid) {
  const banner = deepAccess(bid, 'mediaTypes.banner');

  if (banner === undefined) {
    return true;
  }

  if (
    !validateSizes(bid.sizes) &&
    !validateSizes(bid.mediaTypes.banner.sizes)
  ) {
    logError('insticator: banner sizes not specified or invalid');
    return false;
  }

  return true;
}

function validateVideo(bid) {
  const videoParams = deepAccess(bid, 'mediaTypes.video');
  const videoBidderParams = deepAccess(bid, 'params.video');
  let video = {
    ...videoParams,
    ...videoBidderParams // bidder specific overrides for video
  }

  // Check if the video object is undefined
  if (videoParams === undefined) {
    return true;
  }

  let w = deepAccess(bid, 'mediaTypes.video.w');
  let h = deepAccess(bid, 'mediaTypes.video.h');
  const playerSize = deepAccess(bid, 'mediaTypes.video.playerSize');
  if (!w && playerSize) {
    if (Array.isArray(playerSize[0])) {
      w = parseInt(playerSize[0][0], 10);
    } else if (typeof playerSize[0] === 'number' && !isNaN(playerSize[0])) {
      w = parseInt(playerSize[0], 10);
    }
  }
  if (!h && playerSize) {
    if (Array.isArray(playerSize[0])) {
      h = parseInt(playerSize[0][1], 10);
    } else if (typeof playerSize[1] === 'number' && !isNaN(playerSize[1])) {
      h = parseInt(playerSize[1], 10);
    }
  }
  const videoSize = [
    w,
    h,
  ];

  if (
    !validateSize(videoSize)
  ) {
    logError('insticator: video size not specified or invalid');
    return false;
  }

  const mimes = deepAccess(bid, 'mediaTypes.video.mimes');

  if (!Array.isArray(mimes) || mimes.length === 0) {
    logError('insticator: mimes not specified');
    return false;
  }

  const plcmt = deepAccess(bid, 'mediaTypes.video.plcmt');

  if (typeof plcmt !== 'undefined' && typeof plcmt !== 'number') {
    logError('insticator: video plcmt is not a number');
    return false;
  }

  for (const param in OPTIONAL_VIDEO_PARAMS) {
    if (video[param]) {
      if (!OPTIONAL_VIDEO_PARAMS[param](video[param])) {
        logError(`insticator: video ${param} is invalid or not supported by insticator`);
      }
    }
  }

  if (video.minduration && video.maxduration && video.minduration > video.maxduration) {
    logError('insticator: video minduration is greater than maxduration');
    return false;
  }

  return true;
}

export const spec = {
  code: BIDDER_CODE,
  gvlid: GVLID,
  supportedMediaTypes: [ BANNER, VIDEO ],

  isBidRequestValid: function (bid) {
    return (
      validateAdUnitId(bid) &&
      validateMediaType(bid) &&
      validateBanner(bid) &&
      validateVideo(bid)
    );
  },

  buildRequests: function (validBidRequests, bidderRequest) {
    const requests = [];
    let endpointUrl = config.getConfig('insticator.endpointUrl') || ENDPOINT;
    endpointUrl = endpointUrl.replace(/^http:/, 'https:');

    // Use the first bid request's bid_request_url if it exists ( for updating server url)
    if (validBidRequests.length > 0) {
      if (deepAccess(validBidRequests[0], 'params.bid_endpoint_request_url')) {
        endpointUrl = deepAccess(validBidRequests[0], 'params.bid_endpoint_request_url').replace(/^http:/, 'https:');
      }
    }

    if (validBidRequests.length > 0) {
      requests.push({
        method: 'POST',
        url: endpointUrl,
        options: {
          contentType: 'application/json',
          withCredentials: true,
        },
        data: JSON.stringify(buildRequest(validBidRequests, bidderRequest)),
        bidderRequest,
      });
    }

    return requests;
  },

  interpretResponse: function (serverResponse, request) {
    const bidderRequest = request.bidderRequest;
    const body = serverResponse.body;
    if (!body || body.id !== bidderRequest.bidderRequestId) {
      logError('insticator: response id does not match bidderRequestId');
      return [];
    }

    if (!body.seatbid) {
      return [];
    }

    const bidsets = body.seatbid.map((seatbid) =>
      buildBidSet(seatbid, bidderRequest)
    );

    return bidsets.reduce((a, b) => a.concat(b), []);
  },

  getUserSyncs: function (options, responses) {
    const syncs = [];

    for (const response of responses) {
      if (
        response.body &&
        response.body.ext &&
        response.body.ext.sync instanceof Array
      ) {
        syncs.push(...response.body.ext.sync);
      }
    }

    return syncs;
  },
};

registerBidder(spec);
