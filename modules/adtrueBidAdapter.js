import * as utils from '../src/utils.js';
import {registerBidder} from '../src/adapters/bidderFactory.js';
import {BANNER, NATIVE, VIDEO} from "../src/mediaTypes";
import {config} from "../src/config";
import {getStorageManager} from "../src/storageManager";

const storage = getStorageManager();

const BIDDER_CODE = 'adtrue';
const ADTRUE_CURRENCY = 'USD';
const ADTRUE_TTL = 120;
const ENDPOINT_URL = 'https://hb.adtrue.com/prebid/auction';
const LOG_WARN_PREFIX = 'AdTrue: ';

const DEFAULT_CURRENCY = 'USD';
const AUCTION_TYPE = 1;
const UNDEFINED = undefined;
const DEFAULT_WIDTH = 0;
const DEFAULT_HEIGHT = 0;

const USER_SYNC_URL_IFRAME = 'https://hb.adtrue.com/prebid/usersync?t=iframe&p=';
const USER_SYNC_URL_IMAGE = 'https://hb.adtrue.com/prebid/usersync?t=img&p=';

let publisherId = 0;

function _getDomainFromURL(url) {
  let anchor = document.createElement('a');
  anchor.href = url;
  return anchor.hostname;
}

function _parseSlotParam(paramName, paramValue) {
  switch (paramName) {
    case 'reserve':
      return parseFloat(paramValue) || UNDEFINED;
    default:
      return paramValue;
  }
}

let platform = (function getPlatform() {
  var ua = navigator.userAgent;
  if (ua.indexOf('Android') > -1 || ua.indexOf('Adr') > -1) {
    return 'Android'
  }
  if (ua.match(/\(i[^;]+;( U;)? CPU.+Mac OS X/)) {
    return 'iOS'
  }
  return 'windows'
})();

function _generateGUID() {
  var d = new Date().getTime();
  var guid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    var r = (d + Math.random() * 16) % 16 | 0;
    d = Math.floor(d / 16);
    return (c == 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  })
  return guid;
}

function _isMobile() {
  return (/(ios|ipod|ipad|iphone|android)/i).test(navigator.userAgent);
}

function _isConnectedTV() {
  return (/(smart[-]?tv|hbbtv|appletv|googletv|hdmi|netcast\.tv|viera|nettv|roku|\bdtv\b|sonydtv|inettvbrowser|\btv\b)/i).test(navigator.userAgent);
}


function _parseAdSlot(bid) {
  bid.params.width = 0;
  bid.params.height = 0;
  // check if size is mentioned in sizes array. in that case do not check for @ in adslot
  if (bid.hasOwnProperty('mediaTypes') &&
    bid.mediaTypes.hasOwnProperty(BANNER) &&
    bid.mediaTypes.banner.hasOwnProperty('sizes')) {
    var i = 0;
    var sizeArray = [];
    for (; i < bid.mediaTypes.banner.sizes.length; i++) {
      if (bid.mediaTypes.banner.sizes[i].length === 2) { // sizes[i].length will not be 2 in case where size is set as fluid, we want to skip that entry
        sizeArray.push(bid.mediaTypes.banner.sizes[i]);
      }
    }
    bid.mediaTypes.banner.sizes = sizeArray;
    if (bid.mediaTypes.banner.sizes.length >= 1) {
      // set the first size in sizes array in bid.params.width and bid.params.height. These will be sent as primary size.
      // The rest of the sizes will be sent in format array.
      bid.params.width = bid.mediaTypes.banner.sizes[0][0];
      bid.params.height = bid.mediaTypes.banner.sizes[0][1];
      bid.mediaTypes.banner.sizes = bid.mediaTypes.banner.sizes.splice(1, bid.mediaTypes.banner.sizes.length - 1);
    }
  }
}

function _initConf(refererInfo) {
  return {
    pageURL: (refererInfo && refererInfo.referer) ? refererInfo.referer : window.location.href,
    refURL: window.document.referrer
  };
}

function _getLanguage() {
  const language = navigator.language ? 'language' : 'userLanguage';
  return navigator[language].split('-')[0];
}

function _createOrtbTemplate(conf) {
  var guid;
  if (storage.getDataFromLocalStorage('adtrue_user_id') == null) {
    storage.setDataInLocalStorage('adtrue_user_id', _generateGUID())
  }
  guid = storage.getDataFromLocalStorage('adtrue_user_id')

  return {
    id: '' + new Date().getTime(),
    at: AUCTION_TYPE,
    cur: [DEFAULT_CURRENCY],
    imp: [],
    site: {
      page: conf.pageURL,
      ref: conf.refURL,
      publisher: {}
    },
    device: {
      ip: '{client_ip}',
      ua: navigator.userAgent,
      os: platform,
      js: 1,
      dnt: (navigator.doNotTrack == 'yes' || navigator.doNotTrack == '1' || navigator.msDoNotTrack == '1') ? 1 : 0,
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

function _checkParamDataType(key, value, datatype) {
  var errMsg = 'Ignoring param key: ' + key + ', expects ' + datatype + ', found ' + typeof value;
  var functionToExecute;
  switch (datatype) {
    case DATA_TYPES.BOOLEAN:
      functionToExecute = utils.isBoolean;
      break;
    case DATA_TYPES.NUMBER:
      functionToExecute = utils.isNumber;
      break;
    case DATA_TYPES.STRING:
      functionToExecute = utils.isStr;
      break;
    case DATA_TYPES.ARRAY:
      functionToExecute = utils.isArray;
      break;
  }
  if (functionToExecute(value)) {
    return value;
  }
  utils.logWarn(LOG_WARN_PREFIX + errMsg);
  return UNDEFINED;
}

function _createBannerRequest(bid) {
  var sizes = bid.mediaTypes.banner.sizes;
  var format = [];
  var bannerObj;
  if (sizes !== UNDEFINED && utils.isArray(sizes)) {
    bannerObj = {};
    if (!bid.params.width && !bid.params.height) {
      if (sizes.length === 0) {
        // i.e. since bid.params does not have width or height, and length of sizes is 0, need to ignore this banner imp
        bannerObj = UNDEFINED;
        utils.logWarn(LOG_WARN_PREFIX + 'Error: mediaTypes.banner.size missing for adunit: ' + bid.params.adUnit + '. Ignoring the banner impression in the adunit.');
        return bannerObj;
      } else {
        bannerObj.w = parseInt(sizes[0][0], 10);
        bannerObj.h = parseInt(sizes[0][1], 10);
        sizes = sizes.splice(1, sizes.length - 1);
      }
    } else {
      bannerObj.w = bid.params.width;
      bannerObj.h = bid.params.height;
    }
    if (sizes.length > 0) {
      format = [];
      sizes.forEach(function (size) {
        if (size.length > 1) {
          format.push({w: size[0], h: size[1]});
        }
      });
      if (format.length > 0) {
        bannerObj.format = format;
      }
    }
    bannerObj.pos = 0;
    bannerObj.topframe = utils.inIframe() ? 0 : 1;
  } else {
    utils.logWarn(LOG_WARN_PREFIX + 'Error: mediaTypes.banner.size missing for adunit: ' + bid.params.adUnit + '. Ignoring the banner impression in the adunit.');
    bannerObj = UNDEFINED;
  }
  return bannerObj;
}

function _createVideoRequest(bid) {
  var videoData = bid.params.video;
  var videoObj;

  if (videoData !== UNDEFINED) {
    videoObj = {};
    for (var key in VIDEO_CUSTOM_PARAMS) {
      if (videoData.hasOwnProperty(key)) {
        videoObj[key] = _checkParamDataType(key, videoData[key], VIDEO_CUSTOM_PARAMS[key]);
      }
    }
    // read playersize and assign to h and w.
    if (utils.isArray(bid.mediaTypes.video.playerSize[0])) {
      videoObj.w = parseInt(bid.mediaTypes.video.playerSize[0][0], 10);
      videoObj.h = parseInt(bid.mediaTypes.video.playerSize[0][1], 10);
    } else if (utils.isNumber(bid.mediaTypes.video.playerSize[0])) {
      videoObj.w = parseInt(bid.mediaTypes.video.playerSize[0], 10);
      videoObj.h = parseInt(bid.mediaTypes.video.playerSize[1], 10);
    }
    if (bid.params.video.hasOwnProperty('skippable')) {
      videoObj.ext = {
        'video_skippable': bid.params.video.skippable ? 1 : 0
      };
    }
  } else {
    videoObj = UNDEFINED;
    utils.logWarn(LOG_WARN_PREFIX + 'Error: Video config params missing for adunit: ' + bid.params.adUnit + ' with mediaType set as video. Ignoring video impression in the adunit.');
  }
  return videoObj;
}

function _createImpressionObject(bid, conf) {
  var impObj = {};
  var bannerObj;
  var videoObj;
  var sizes = bid.hasOwnProperty('sizes') ? bid.sizes : [];
  var mediaTypes = '';
  var format = [];

  impObj = {
    id: bid.bidId,
    tagid: String(bid.params.zoneId || undefined),
    bidfloor: _parseSlotParam('reserve', bid.params.reserve),
    secure: 1,
    ext: {},
    bidfloorcur: DEFAULT_CURRENCY
  };

  if (bid.hasOwnProperty('mediaTypes')) {
    for (mediaTypes in bid.mediaTypes) {
      switch (mediaTypes) {
        case BANNER:
          bannerObj = _createBannerRequest(bid);
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
    // this part of code is required for older testcases with no 'mediaTypes' to run succesfully.
    bannerObj = {
      pos: 0,
      w: bid.params.width,
      h: bid.params.height,
      topframe: utils.inIframe() ? 0 : 1
    };
    if (utils.isArray(sizes) && sizes.length > 1) {
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
        utils.logWarn(LOG_WARN_PREFIX + 'Error: missing zoneId');
        return false;
      }
      if (!bid.params.publisherId) {
        utils.logWarn(LOG_WARN_PREFIX + 'Error: missing publisherId');
        return false;
      }
      return true;
    }
    return false;
  },

  buildRequests: function (validBidRequests, bidderRequest) {
    let refererInfo;
    if (bidderRequest && bidderRequest.refererInfo) {
      refererInfo = bidderRequest.refererInfo;
    }
    let conf = _initConf(refererInfo);
    let payload = _createOrtbTemplate(conf);
    let bidCurrency = '';
    let dctrArr = [];
    let bid;
    let blockedIabCategories = [];

    validBidRequests.forEach(originalBid => {
      bid = utils.deepClone(originalBid);
      _parseAdSlot(bid);

      conf.zoneId = conf.zoneId || bid.params.zoneId;
      conf.pubId = conf.pubId || bid.params.publisherId;

      conf.transactionId = bid.transactionId;
      if (bidCurrency === '') {
        bidCurrency = bid.params.currency || UNDEFINED;
      } else if (bid.params.hasOwnProperty('currency') && bidCurrency !== bid.params.currency) {
        utils.logWarn(LOG_WARN_PREFIX + 'Currency specifier ignored. Only one currency permitted.');
      }
      bid.params.currency = bidCurrency;

      var impObj = _createImpressionObject(bid, conf);
      if (impObj) {
        payload.imp.push(impObj);
      }
    });
    if (payload.imp.length == 0) {
      return;
    }
    publisherId = conf.pubId.trim();

    payload.site.publisher.id = conf.pubId.trim();
    payload.ext.wrapper = {};

    payload.ext.wrapper.wv = $$REPO_AND_VERSION$$;
    payload.ext.wrapper.transactionId = conf.transactionId;
    payload.ext.wrapper.wiid = conf.wiid || bidderRequest.auctionId;
    payload.ext.wrapper.wp = 'pbjs';

    payload.user.geo = {};
    payload.device.geo = payload.user.geo;
    payload.site.page = conf.pageURL;
    payload.site.domain = _getDomainFromURL(payload.site.page);

    if (typeof config.getConfig('content') === 'object') {
      payload.site.content = config.getConfig('content');
    }

    if (typeof config.getConfig('device') === 'object') {
      payload.device = Object.assign(payload.device, config.getConfig('device'));
    }

    utils.deepSetValue(payload, 'source.tid', conf.transactionId);

    // test bids
    if (window.location.href.indexOf('adtrueTest=true') !== -1) {
      payload.test = 1;
    }
    // adding schain object
    if (validBidRequests[0].schain) {
      utils.deepSetValue(payload, 'source.ext.schain', validBidRequests[0].schain);
    }

    // Attaching GDPR Consent Params
    if (bidderRequest && bidderRequest.gdprConsent) {
      utils.deepSetValue(payload, 'user.ext.consent', bidderRequest.gdprConsent.consentString);
      utils.deepSetValue(payload, 'regs.ext.gdpr', (bidderRequest.gdprConsent.gdprApplies ? 1 : 0));
    }

    // CCPA
    if (bidderRequest && bidderRequest.uspConsent) {
      utils.deepSetValue(payload, 'regs.ext.us_privacy', bidderRequest.uspConsent);
    }

    // coppa compliance
    if (config.getConfig('coppa') === true) {
      utils.deepSetValue(payload, 'regs.coppa', 1);
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
    utils._each(serverResponses.body, function (response) {
      if (response.cpm > 0) {
        const bidResponse = {
          requestId: response.id,
          creativeId: response.id,
          adId: response.id,
          cpm: response.cpm,
          width: response.width,
          height: response.height,
          currency: ADTRUE_CURRENCY,
          netRevenue: true,
          ad: response.ad
        };
        bidResponses.push(bidResponse);
      }
    });
    return bidResponses;
  },
  getUserSyncs: function (syncOptions, responses, gdprConsent, uspConsent) {
    let syncurl = '' + publisherId;

    if (gdprConsent) {
      syncurl += '&gdpr=' + (gdprConsent.gdprApplies ? 1 : 0);
      syncurl += '&gdpr_consent=' + encodeURIComponent(gdprConsent.consentString || '');
    }
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
};
registerBidder(spec);
