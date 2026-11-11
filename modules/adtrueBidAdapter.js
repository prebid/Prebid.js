import { VIDEO_CUSTOM_PARAMS, parseBannerSizes, createBannerRequest, createVideoRequest, parseNativeAssets, getResponseMeta, getDomainFromURL } from '../libraries/adtruePwbidUtils/bidderUtils.js';
import { logWarn, isArray, inIframe, isStr, deepClone, deepSetValue, logError, deepAccess } from '../src/utils.js';
import { registerBidder } from '../src/adapters/bidderFactory.js';
import { BANNER, NATIVE, VIDEO } from '../src/mediaTypes.js';
import { config } from '../src/config.js';
import { getStorageManager } from '../src/storageManager.js';
import { convertOrtbRequestToProprietaryNative } from '../src/native.js';
import { getDNT } from '../libraries/dnt/index.js';

const BIDDER_CODE = 'adtrue';
const storage = getStorageManager({ bidderCode: BIDDER_CODE });
const ADTRUE_CURRENCY = 'USD';
const ENDPOINT_URL = 'https://hb.adtrue.com/prebid/auction';
const LOG_WARN_PREFIX = 'AdTrue: ';
const AUCTION_TYPE = 1;
const UNDEFINED = undefined;
const NET_REVENUE = false;
let publisherId = 0;
let zoneId = 0;
const NATIVE_ASSET_ID_TO_KEY_MAP = {};
const SYNC_TYPES = Object.freeze({
  1: 'iframe',
  2: 'image'
});

const platform = (function getPlatform() {
  var ua = navigator.userAgent;
  if (ua.indexOf('Android') > -1 || ua.indexOf('Adr') > -1) {
    return 'Android';
  }
  if (ua.match(/\(i[^;]+;( U;)? CPU.+Mac OS X/)) {
    return 'iOS';
  }
  return 'windows';
})();

function _generateGUID() {
  var d = new Date().getTime();
  var guid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    var r = (d + Math.random() * 16) % 16 | 0;
    d = Math.floor(d / 16);
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  });
  return guid;
}

function _isMobile() {
  return (/(ios|ipod|ipad|iphone|android)/i).test(navigator.userAgent);
}

function _isConnectedTV() {
  return (/(smart[-]?tv|hbbtv|appletv|googletv|hdmi|netcast\.tv|viera|nettv|roku|\bdtv\b|sonydtv|inettvbrowser|\btv\b)/i).test(navigator.userAgent);
}

function _initConf(refererInfo) {
  return {
    // TODO: do the fallbacks make sense here?
    pageURL: refererInfo?.page || window.location.href,
    refURL: refererInfo?.ref || window.document.referrer
  };
}

function _getLanguage() {
  const language = navigator.language ? 'language' : 'userLanguage';
  return navigator[language].split('-')[0];
}

function _createOrtbTemplate(conf) {
  var guid;
  if (storage.getDataFromLocalStorage('adtrue_user_id') == null) {
    storage.setDataInLocalStorage('adtrue_user_id', _generateGUID());
  }
  guid = storage.getDataFromLocalStorage('adtrue_user_id');

  return {
    id: '' + new Date().getTime(),
    at: AUCTION_TYPE,
    cur: [ADTRUE_CURRENCY],
    imp: [],
    site: {
      page: conf.pageURL,
      ref: conf.refURL,
      publisher: {}
    },
    device: {
      ip: '',
      ua: navigator.userAgent,
      os: platform,
      js: 1,
      dnt: getDNT() ? 1 : 0,
      h: screen.height,
      w: screen.width,
      language: _getLanguage(),
      devicetype: _isMobile() ? 1 : _isConnectedTV() ? 3 : 2,
      geo: {
        country: '{country_code}',
        type: 0,
        ipservice: 1,
        region: '',
        city: '',
      },
    },
    user: {
      id: guid
    },
    ext: {}
  };
}

function _parseNativeResponse(bid, newBid) {
  newBid.native = {};
  if (bid.hasOwnProperty('adm')) {
    var adm;
    try {
      adm = JSON.parse(bid.adm.replace(/\\/g, ''));
    } catch (ex) {
      // logWarn(LOG_WARN_PREFIX + 'Error: Cannot parse native response for ad response: ' + newBid.adm);
      return;
    }
    if (adm && adm.native && adm.native.assets && adm.native.assets.length > 0) {
      parseNativeAssets(adm.native.assets, newBid, NATIVE_ASSET_ID_TO_KEY_MAP);
      newBid.native.clickUrl = adm.native.link && adm.native.link.url;
      newBid.native.clickTrackers = (adm.native.link && adm.native.link.clicktrackers) || [];
      newBid.native.impressionTrackers = adm.native.imptrackers || [];
      newBid.native.jstracker = adm.native.jstracker || [];
    }
  }
}

function _createVideoRequest(bid) {
  var videoData = bid.params.video;
  var videoObj;

  if (videoData !== UNDEFINED) {
    videoObj = createVideoRequest(videoData, bid.mediaTypes.video.playerSize, VIDEO_CUSTOM_PARAMS, message => logWarn(LOG_WARN_PREFIX + message));
    if (bid.params.video.hasOwnProperty('skippable')) {
      videoObj.ext = {
        'video_skippable': bid.params.video.skippable ? 1 : 0
      };
    }
  } else {
    videoObj = UNDEFINED;
    logWarn(LOG_WARN_PREFIX + 'Error: Video config params missing for adunit: ' + bid.params.adUnit + ' with mediaType set as video. Ignoring video impression in the adunit.');
  }
  return videoObj;
}

function _checkMediaType(adm, newBid) {
  var admStr;
  var videoRegex = new RegExp(/VAST\s+version/);
  newBid.mediaType = BANNER;
  if (videoRegex.test(adm)) {
    newBid.mediaType = VIDEO;
  } else {
    try {
      admStr = JSON.parse(adm.replace(/\\/g, ''));
      if (admStr && admStr.native) {
        newBid.mediaType = NATIVE;
      }
    } catch (e) {
      logWarn(LOG_WARN_PREFIX + 'Error: Cannot parse native response for ad response: ' + adm);
    }
  }
}

function _createImpressionObject(bid, conf) {
  var impObj;
  var bannerObj;
  var videoObj;
  var sizes = bid.hasOwnProperty('sizes') ? bid.sizes : [];
  var mediaTypes = '';
  var format = [];

  impObj = {
    id: bid.bidId,
    tagid: String(bid.params.zoneId || undefined),
    bidfloor: 0,
    secure: 1,
    ext: {},
    bidfloorcur: ADTRUE_CURRENCY
  };

  if (bid.hasOwnProperty('mediaTypes')) {
    for (mediaTypes in bid.mediaTypes) {
      switch (mediaTypes) {
        case BANNER:
          bannerObj = createBannerRequest(bid, message => logWarn(LOG_WARN_PREFIX + message));
          if (bannerObj !== UNDEFINED) {
            impObj.banner = bannerObj;
          }
          break;
        case VIDEO:
          videoObj = _createVideoRequest(bid);
          if (videoObj !== UNDEFINED) {
            impObj.video = videoObj;
          }
          break;
      }
    }
  } else {
    // mediaTypes is not present, so this is a banner only impression
    // this part of code is required for older testcases with no 'mediaTypes' to run successfully.
    bannerObj = {
      pos: 0,
      w: bid.params.width,
      h: bid.params.height,
      topframe: inIframe() ? 0 : 1
    };
    if (isArray(sizes) && sizes.length > 1) {
      sizes = sizes.splice(1, sizes.length - 1);
      sizes.forEach(size => {
        format.push({
          w: size[0],
          h: size[1]
        });
      });
      bannerObj.format = format;
    }
    impObj.banner = bannerObj;
  }

  return impObj.hasOwnProperty(BANNER) ||
  impObj.hasOwnProperty(NATIVE) ||
  impObj.hasOwnProperty(VIDEO) ? impObj : UNDEFINED;
}

export const spec = {
  code: BIDDER_CODE,
  supportedMediaTypes: ['banner', 'video'],

  isBidRequestValid: function (bid) {
    if (bid && bid.params) {
      if (!bid.params.zoneId) {
        logWarn(LOG_WARN_PREFIX + 'Error: missing zoneId');
        return false;
      }
      if (!bid.params.publisherId) {
        logWarn(LOG_WARN_PREFIX + 'Error: missing publisherId');
        return false;
      }
      if (!isStr(bid.params.publisherId)) {
        logWarn(LOG_WARN_PREFIX + 'Error: publisherId is mandatory and cannot be numeric');
        return false;
      }
      if (!isStr(bid.params.zoneId)) {
        logWarn(LOG_WARN_PREFIX + 'Error: zoneId is mandatory and cannot be numeric');
        return false;
      }
      return true;
    }
    return false;
  },

  buildRequests: function (validBidRequests, bidderRequest) {
    // convert Native ORTB definition to old-style prebid native definition
    validBidRequests = convertOrtbRequestToProprietaryNative(validBidRequests);

    let refererInfo;
    if (bidderRequest && bidderRequest.refererInfo) {
      refererInfo = bidderRequest.refererInfo;
    }
    const conf = _initConf(refererInfo);
    const payload = _createOrtbTemplate(conf);
    let bidCurrency = '';
    let bid;
    validBidRequests.forEach(originalBid => {
      bid = deepClone(originalBid);
      parseBannerSizes(bid);

      conf.zoneId = conf.zoneId || bid.params.zoneId;
      conf.pubId = conf.pubId || bid.params.publisherId;

      conf.transactionId = bid.ortb2Imp?.ext?.tid;
      if (bidCurrency === '') {
        bidCurrency = bid.params.currency || UNDEFINED;
      } else if (bid.params.hasOwnProperty('currency') && bidCurrency !== bid.params.currency) {
        logWarn(LOG_WARN_PREFIX + 'Currency specifier ignored. Only one currency permitted.');
      }
      bid.params.currency = bidCurrency;

      var impObj = _createImpressionObject(bid, conf);
      if (impObj) {
        payload.imp.push(impObj);
      }
    });
    if (payload.imp.length === 0) {
      return;
    }
    publisherId = conf.pubId.trim();
    zoneId = conf.zoneId.trim();

    payload.site.publisher.id = conf.pubId.trim();
    payload.ext.wrapper = {};

    payload.ext.wrapper.transactionId = conf.transactionId;
    payload.ext.wrapper.wiid = conf.wiid || bidderRequest.ortb2?.ext?.tid;
    payload.ext.wrapper.wp = 'pbjs';

    payload.user.geo = {};
    payload.device.geo = payload.user.geo;
    payload.site.page = conf.pageURL;
    payload.site.domain = getDomainFromURL(payload.site.page);

    if (typeof config.getConfig('content') === 'object') {
      payload.site.content = config.getConfig('content');
    }

    if (typeof config.getConfig('device') === 'object') {
      payload.device = Object.assign(payload.device, config.getConfig('device'));
    }
    deepSetValue(payload, 'source.tid', conf.transactionId);
    // test bids
    if (window.location.href.indexOf('adtrueTest=true') !== -1) {
      payload.test = 1;
    }
    // adding schain object
    const schain = validBidRequests[0]?.ortb2?.source?.ext?.schain;
    if (schain) {
      deepSetValue(payload, 'source.ext.schain', schain);
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
    // coppa compliance
    if (bidderRequest?.ortb2?.regs?.coppa === 1) {
      deepSetValue(payload, 'regs.coppa', 1);
    }

    return {
      method: 'POST',
      url: ENDPOINT_URL,
      data: JSON.stringify(payload),
      bidderRequests: bidderRequest
    };
  },
  interpretResponse: function (serverResponses, bidderRequest) {
    const bidResponses = [];
    var respCur = ADTRUE_CURRENCY;
    const parsedRequest = JSON.parse(bidderRequest.data);
    const parsedReferrer = parsedRequest.site && parsedRequest.site.ref ? parsedRequest.site.ref : '';
    try {
      if (serverResponses.body && serverResponses.body.seatbid && isArray(serverResponses.body.seatbid)) {
        // Supporting multiple bid responses for same adSize
        respCur = serverResponses.body.cur || respCur;
        serverResponses.body.seatbid.forEach(seatbidder => {
          seatbidder.bid &&
          isArray(seatbidder.bid) &&
          seatbidder.bid.forEach(bid => {
            const newBid = {
              requestId: bid.impid,
              cpm: (parseFloat(bid.price) || 0).toFixed(2),
              width: bid.w,
              height: bid.h,
              creativeId: bid.crid || bid.id,
              dealId: bid.dealid,
              currency: respCur,
              netRevenue: NET_REVENUE,
              ttl: 300,
              referrer: parsedReferrer,
              ad: bid.adm,
              partnerImpId: bid.id || '' // partner impression Id
            };
            if (parsedRequest.imp && parsedRequest.imp.length > 0) {
              parsedRequest.imp.forEach(req => {
                if (bid.impid === req.id) {
                  _checkMediaType(bid.adm, newBid);
                  switch (newBid.mediaType) {
                    case BANNER:
                      break;
                    case VIDEO:
                      break;
                    case NATIVE:
                      _parseNativeResponse(bid, newBid);
                      break;
                  }
                }
              });
            }
            newBid.meta = getResponseMeta(bid);
            // adserverTargeting
            if (seatbidder.ext && seatbidder.ext.buyid) {
              newBid.adserverTargeting = {
                'hb_buyid_adtrue': seatbidder.ext.buyid
              };
            }
            bidResponses.push(newBid);
          });
        });
      }
    } catch (error) {
      logError(error);
    }
    return bidResponses;
  },
  getUserSyncs: function (syncOptions, responses, gdprConsent, uspConsent, gppConsent, coppa) {
    if (!responses || responses.length === 0 || (!syncOptions.iframeEnabled && !syncOptions.pixelEnabled)) {
      return [];
    }
    return responses.reduce((accum, rsp) => {
      const cookieSyncs = deepAccess(rsp, 'body.ext.cookie_sync');
      if (cookieSyncs) {
        const cookieSyncObjects = cookieSyncs.map(cookieSync => {
          return {
            type: SYNC_TYPES[cookieSync.type],
            url: cookieSync.url +
              '&publisherId=' + publisherId +
              '&zoneId=' + zoneId +
              '&gdpr=' + (gdprConsent && gdprConsent.gdprApplies ? 1 : 0) +
              '&gdpr_consent=' + encodeURIComponent((gdprConsent ? gdprConsent.consentString : '')) +
              '&us_privacy=' + encodeURIComponent((uspConsent || '')) +
              '&coppa=' + (coppa === true ? 1 : 0)
          };
        });
        return accum.concat(cookieSyncObjects);
      }
      return accum;
    }, []);
  }
};

registerBidder(spec);
