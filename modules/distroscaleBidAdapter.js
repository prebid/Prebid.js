import { logWarn, isPlainObject, isStr, isArray, isFn, inIframe, mergeDeep, deepSetValue, logError, deepClone } from '../src/utils.js';
import { registerBidder } from '../src/adapters/bidderFactory.js';
import { config } from '../src/config.js';
import { BANNER } from '../src/mediaTypes.js';
const BIDDER_CODE = 'distroscale';
const SHORT_CODE = 'ds';
const LOG_WARN_PREFIX = 'DistroScale: ';
const ENDPOINT = 'https://hb.jsrdn.com/hb?from=pbjs';
const DEFAULT_CURRENCY = 'USD';
const AUCTION_TYPE = 1;
const GVLID = 754;
const UNDEF = undefined;

const SUPPORTED_MEDIATYPES = [ BANNER ];

function _getHost(url) {
  let a = document.createElement('a');
  a.href = url;
  return a.hostname;
}

function _getBidFloor(bid, mType, sz) {
  if (isFn(bid.getFloor)) {
    let floor = bid.getFloor({
      currency: DEFAULT_CURRENCY,
      mediaType: mType || '*',
      size: sz || '*'
    });
    if (isPlainObject(floor) && !isNaN(floor.floor) && floor.currency === DEFAULT_CURRENCY) {
      return floor.floor;
    }
  }
  return null;
}

function _createImpressionObject(bid) {
  var impObj = UNDEF;
  var i;
  var sizes = {};
  var sizesCount = 0;

  function addSize(arr) {
    var w, h;
    if (arr && arr.length > 1) {
      w = parseInt(arr[0]);
      h = parseInt(arr[1]);
    }
    sizes[w + 'x' + h] = {
      w: w,
      h: h,
      area: w * h,
      idx:
        ({
          '970x250': 1,
          '300x250': 2
        })[w + 'x' + h] || Math.max(w * h, 200)
    };
    sizesCount++;
  }

  // Gather all sizes
  if (isArray(bid.sizes)) {
    for (i = 0; i < bid.sizes.length; i++) {
      addSize(bid.sizes[i]);
    }
  }
  if (bid.params && bid.params.width && bid.params.height) {
    addSize([bid.params.width, bid.params.height]);
  }
  if (bid.mediaTypes && BANNER in bid.mediaTypes && bid.mediaTypes[BANNER] && bid.mediaTypes[BANNER].sizes) {
    for (i = 0; i < bid.mediaTypes[BANNER].sizes.length; i++) {
      addSize(bid.mediaTypes[BANNER].sizes[i]);
    }
  }
  if (sizesCount == 0) {
    logWarn(LOG_WARN_PREFIX + 'Error: missing sizes: ' + bid.params.adUnit + '. Ignoring the banner impression in the adunit.');
  } else {
    // Use the first preferred size
    var keys = Object.keys(sizes);
    keys.sort(function(a, b) {
      return sizes[a].idx - sizes[b].idx
    });
    var bannerObj = {
      pos: 0,
      w: sizes[keys[0]].w,
      h: sizes[keys[0]].h,
      topframe: inIframe() ? 0 : 1,
      format: [{
        'w': sizes[keys[0]].w,
        'h': sizes[keys[0]].h
      }]
    };

    impObj = {
      id: bid.bidId,
      tagid: bid.params.zoneid || '',
      secure: 1,
      ext: {
        pubid: bid.params.pubid || '',
        zoneid: bid.params.zoneid || ''
      }
    };

    var floor = _getBidFloor(bid, BANNER, [sizes[keys[0]].w, sizes[keys[0]].h]);
    if (floor > 0) {
      impObj.bidfloor = floor;
      impObj.bidfloorcur = DEFAULT_CURRENCY;
    }

    impObj[BANNER] = bannerObj;
  }

  return impObj;
}

export const spec = {
  code: BIDDER_CODE,
  gvlid: GVLID,
  supportedMediaTypes: SUPPORTED_MEDIATYPES,
  aliases: [SHORT_CODE],

  isBidRequestValid: bid => {
    if (bid && bid.params && bid.params.pubid && isStr(bid.params.pubid)) {
      return true;
    } else {
      logWarn(LOG_WARN_PREFIX + 'Error: pubid is mandatory and cannot be numeric');
    }
    return false;
  },

  buildRequests: (validBidRequests, bidderRequest) => {
    // TODO: does the fallback to window.location make sense?
    var pageUrl = bidderRequest?.refererInfo?.page || window.location.href;

    var payload = {
      id: '' + (new Date()).getTime(),
      at: AUCTION_TYPE,
      cur: [DEFAULT_CURRENCY],
      site: {
        page: pageUrl
      },
      device: {
        ua: navigator.userAgent,
        js: 1,
        h: screen.height,
        w: screen.width,
        language: (navigator.language && navigator.language.replace(/-.*/, '')) || 'en',
        dnt: (navigator.doNotTrack == '1' || navigator.msDoNotTrack == '1' || navigator.doNotTrack == 'yes') ? 1 : 0
      },
      imp: [],
      user: {},
      ext: {}
    };

    validBidRequests.forEach(b => {
      var bid = deepClone(b);
      var impObj = _createImpressionObject(bid);
      if (impObj) {
        payload.imp.push(impObj);
      }
    });

    if (payload.imp.length == 0) {
      return;
    }

    payload.site.domain = _getHost(payload.site.page);

    // add the content object from config in request
    if (typeof config.getConfig('content') === 'object') {
      payload.site.content = config.getConfig('content');
    }

    // merge the device from config.getConfig('device')
    if (typeof config.getConfig('device') === 'object') {
      payload.device = Object.assign(payload.device, config.getConfig('device'));
    }

    // adding schain object
    if (validBidRequests[0].schain) {
      deepSetValue(payload, 'source.schain', validBidRequests[0].schain);
    }

    // Attaching GDPR Consent Params
    if (bidderRequest && bidderRequest.gdprConsent) {
      deepSetValue(payload, 'user.consent', bidderRequest.gdprConsent.consentString);
      deepSetValue(payload, 'regs.gdpr', (bidderRequest.gdprConsent.gdprApplies ? 1 : 0));
    }

    // CCPA
    if (bidderRequest && bidderRequest.uspConsent) {
      deepSetValue(payload, 'regs.us_privacy', bidderRequest.uspConsent);
    }

    // coppa compliance
    if (config.getConfig('coppa') === true) {
      deepSetValue(payload, 'regs.coppa', 1);
    }

    // First Party Data
    const commonFpd = bidderRequest.ortb2 || {};
    if (commonFpd.site) {
      mergeDeep(payload, {site: commonFpd.site});
    }
    if (commonFpd.user) {
      mergeDeep(payload, {user: commonFpd.user});
    }

    // User IDs
    if (validBidRequests[0].userIdAsEids && validBidRequests[0].userIdAsEids.length > 0) {
      // Standard ORTB structure
      deepSetValue(payload, 'user.eids', validBidRequests[0].userIdAsEids);
    } else if (validBidRequests[0].userId && Object.keys(validBidRequests[0].userId).length > 0) {
      // Fallback to non-ortb structure
      deepSetValue(payload, 'user.ext.userId', validBidRequests[0].userId);
    }

    return {
      method: 'POST',
      url: ENDPOINT,
      data: payload,
      bidderRequest: bidderRequest
    };
  },

  interpretResponse: (response, request) => {
    const bidResponses = [];
    try {
      if (response.body && response.body.seatbid && isArray(response.body.seatbid)) {
        // Supporting multiple bid responses for same adSize
        response.body.seatbid.forEach(seatbidder => {
          seatbidder.bid &&
            isArray(seatbidder.bid) &&
            seatbidder.bid.forEach(bid => {
              let newBid = {
                requestId: bid.impid,
                cpm: (parseFloat(bid.price) || 0),
                currency: DEFAULT_CURRENCY,
                width: parseInt(bid.w),
                height: parseInt(bid.h),
                creativeId: bid.crid || bid.id,
                netRevenue: true,
                ttl: 300,
                ad: bid.adm,
                meta: {
                  advertiserDomains: []
                }
              };
              if (isArray(bid.adomain) && bid.adomain.length > 0) {
                newBid.meta.advertiserDomains = bid.adomain;
              }
              bidResponses.push(newBid);
            });
        });
      }
    } catch (error) {
      logError(error);
    }
    return bidResponses;
  }
};

registerBidder(spec);
