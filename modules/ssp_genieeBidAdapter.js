import * as utils from '../src/utils.js';
import { isPlainObject } from '../src/utils.js';
import { registerBidder } from '../src/adapters/bidderFactory.js';
import { BANNER } from '../src/mediaTypes.js';
import { getStorageManager } from '../src/storageManager.js';
import { MODULE_TYPE_ANALYTICS } from '../src/activities/modules.js';
import { highEntropySUAAccessor } from '../src/fpd/sua.js';
import { config } from '../src/config.js';

/**
 * @typedef {import('../src/adapters/bidderFactory.js').BidRequest} BidRequest
 * @typedef {import('../src/adapters/bidderFactory.js').ServerResponse} ServerResponse
 */

const BIDDER_CODE = 'ssp_geniee';
export const BANNER_ENDPOINT = 'https://aladdin.genieesspv.jp/yie/ld/api/ad_call/v2';
export const USER_SYNC_ENDPOINT_IMAGE = 'https://cs.gssprt.jp/yie/ld/mcs';
export const USER_SYNC_ENDPOINT_IFRAME = 'https://aladdin.genieesspv.jp/yie/ld';
const SUPPORTED_MEDIA_TYPES = [ BANNER ];
const DEFAULT_CURRENCY = 'JPY';
const ALLOWED_CURRENCIES = ['USD', 'JPY'];
const NET_REVENUE = true;
const MODULE_NAME = `ssp_geniee`;
export const storage = getStorageManager({moduleType: MODULE_TYPE_ANALYTICS, moduleName: MODULE_NAME})

/**
 * List of keys for geparams (parameters we use)
 * key: full name of the parameter
 * value: shortened name used in geparams
 */
const GEPARAMS_KEY = {
  /**
   * location.href whose protocol is not http
   */
  LOCATION: 'loc',
  /**
   * document.referrer whose protocol is not http
   */
  REFERRER: 'ref',
  /**
   * URL parameter to be linked to clicks
   */
  GENIEE_CT0: 'ct0',
  /**
   * zipcode
   */
  ZIP: 'zip',
  /**
   * country
   */
  COUNTRY: 'country',
  /**
   * city
   */
  CITY: 'city',
  /**
   * longitude
   */
  LONGITUDE: 'long',
  /**
   * lattitude
   */
  LATITUDE: 'lati',
  /**
   * for customised parameters
   */
  CUSTOM: 'custom',
  /**
   * advertising identifier for iOS
   */
  IDENTIFIER_FOR_ADVERTISERS: 'idfa',
  /**
   * tracked Ad restrictions for iOS
   */
  LIMIT_AD_TRACKING: 'lat',
  /**
   * bundle ID of iOS applications?
   */
  BUNDLE: 'bundle',
};

/**
 * List of keys for gecuparams (parameters we use)
 * key: full name of the parameter
 * value: shortened name used in geparams
 */
const GECUPARAMS_KEY = {
  /**
   * version no of gecuparams
   */
  VERSION: 'ver',
  /**
   * minor version no of gecuparams
   */
  MINOR_VERSION: 'minor',
  /**
   * encrypted value of LTSV format
   */
  VALUE: 'value',
};

/**
 * executing encodeURIComponent including single quotation
 * @param {string} str
 * @returns
 */
function encodeURIComponentIncludeSingleQuotation(str) {
  return encodeURIComponent(str).replace(/'/g, '%27');
}

/**
 * Checking "params" has a value for the key "key" and it is not undefined, null, or an empty string
 * To support IE in the same way, we cannot use the ?? operator
 * @param {Object} params
 * @param {string} key
 * @returns {boolean}
 */
function hasParamsNotBlankString(params, key) {
  return (
    key in params &&
    typeof params[key] !== 'undefined' &&
    params[key] !== null &&
    params[key] !== ''
  );
}

export const buildExtuidQuery = ({id5, imuId}) => {
  const params = [
    ...(id5 ? [`id5:${id5}`] : []),
    ...(imuId ? [`im:${imuId}`] : []),
  ];

  const queryString = params.join('\t');
  if (!queryString) return null;
  return queryString;
}

/**
 * making request data be used commonly banner and native
 * @see https://docs.prebid.org/dev-docs/bidder-adaptor.html#location-and-referrers
 */
function makeCommonRequestData(bid, geparameter, refererInfo) {
  const gpid = utils.deepAccess(bid, 'ortb2Imp.ext.gpid');

  const data = {
    zoneid: bid.params.zoneId,
    cb: Math.floor(Math.random() * 99999999999),
    charset: document.charset || document.characterSet || '',
    loc: refererInfo?.page || refererInfo?.location || refererInfo?.topmostLocation || refererInfo?.legacy.referer || encodeURIComponentIncludeSingleQuotation(geparameter[GEPARAMS_KEY.LOCATION]) || '',
    ct0: geparameter[GEPARAMS_KEY.GENIEE_CT0] !== 'undefined'
      ? encodeURIComponentIncludeSingleQuotation(geparameter[GEPARAMS_KEY.GENIEE_CT0])
      : '',
    referer: refererInfo?.ref || encodeURIComponentIncludeSingleQuotation(geparameter[GEPARAMS_KEY.REFERRER]) || '',
    topframe: window.parent === window.self ? 1 : 0,
    cur: bid.params.hasOwnProperty('currency') ? bid.params.currency : DEFAULT_CURRENCY,
    requestid: bid.bidId,
    ua: navigator.userAgent,
    tpaf: 1,
    cks: 1,
    ...(gpid ? { gpid } : {}),
  };

  const pageTitle = document.title;
  if (pageTitle) {
    data.title = encodeURIComponentIncludeSingleQuotation(pageTitle);
  }

  try {
    if (window.self.toString() !== '[object Window]' || window.parent.toString() !== '[object Window]') {
      data.err = '1';
    }
  } catch (e) {}

  if (GEPARAMS_KEY.IDENTIFIER_FOR_ADVERTISERS in geparameter) {
    data.idfa = encodeURIComponentIncludeSingleQuotation(geparameter[GEPARAMS_KEY.IDENTIFIER_FOR_ADVERTISERS]);
  }
  if (GEPARAMS_KEY.LIMIT_AD_TRACKING in geparameter) {
    data.adtk = geparameter[GEPARAMS_KEY.LIMIT_AD_TRACKING] ? '0' : '1';
  }
  // makeScreenSizeForQueryParameter
  if (typeof screen !== 'undefined') {
    const screenWidth = screen.width;
    const screenHeight = screen.height;
    if (screenWidth > screenHeight) {
      data.sw = screenHeight;
      data.sh = screenWidth;
    } else {
      data.sw = screenWidth;
      data.sh = screenHeight;
    }
  }
  // makeBannerJskQuery
  if (hasParamsNotBlankString(geparameter, GEPARAMS_KEY.ZIP)) {
    data.zip = encodeURIComponentIncludeSingleQuotation(geparameter[GEPARAMS_KEY.ZIP]);
  }
  if (hasParamsNotBlankString(geparameter, GEPARAMS_KEY.COUNTRY)) {
    data.country = encodeURIComponentIncludeSingleQuotation(geparameter[GEPARAMS_KEY.COUNTRY]);
  }
  if (hasParamsNotBlankString(geparameter, GEPARAMS_KEY.CITY)) {
    data.city = encodeURIComponentIncludeSingleQuotation(geparameter[GEPARAMS_KEY.CITY]);
  }
  if (hasParamsNotBlankString(geparameter, GEPARAMS_KEY.LONGITUDE)) {
    data.long = encodeURIComponentIncludeSingleQuotation(geparameter[GEPARAMS_KEY.LONGITUDE]);
  }
  if (hasParamsNotBlankString(geparameter, GEPARAMS_KEY.LATITUDE)) {
    data.lati = encodeURIComponentIncludeSingleQuotation(
      geparameter[GEPARAMS_KEY.LATITUDE]
    );
  }
  if (GEPARAMS_KEY.CUSTOM in geparameter && isPlainObject(geparameter[GEPARAMS_KEY.CUSTOM])) {
    for (const c in geparameter[GEPARAMS_KEY.CUSTOM]) {
      if (hasParamsNotBlankString(geparameter[GEPARAMS_KEY.CUSTOM], c)) {
        data[encodeURIComponentIncludeSingleQuotation('custom_' + c)] =
          encodeURIComponentIncludeSingleQuotation(
            geparameter[GEPARAMS_KEY.CUSTOM][c]
          );
      }
    }
  }
  const gecuparameter = window.gecuparams || {};
  if (isPlainObject(gecuparameter)) {
    if (hasParamsNotBlankString(gecuparameter, GECUPARAMS_KEY.VERSION)) {
      data.gc_ver = encodeURIComponentIncludeSingleQuotation(gecuparameter[GECUPARAMS_KEY.VERSION]);
    }
    if (hasParamsNotBlankString(gecuparameter, GECUPARAMS_KEY.MINOR_VERSION)) {
      data.gc_minor = encodeURIComponentIncludeSingleQuotation(gecuparameter[GECUPARAMS_KEY.MINOR_VERSION]);
    }
    if (hasParamsNotBlankString(gecuparameter, GECUPARAMS_KEY.VALUE)) {
      data.gc_value = encodeURIComponentIncludeSingleQuotation(gecuparameter[GECUPARAMS_KEY.VALUE]);
    }
  }

  // imuid, id5
  const id5 = utils.deepAccess(bid, 'userId.id5id.uid');
  const imuId = utils.deepAccess(bid, 'userId.imuid');
  const extuidQuery = buildExtuidQuery({id5, imuId});
  if (extuidQuery) data.extuid = extuidQuery;

  // makeUAQuery
  // To avoid double encoding, not using encodeURIComponent here
  const ua = JSON.parse(getUserAgent());
  if (ua && ua.fullVersionList) {
    const fullVersionList = ua.fullVersionList.reduce((acc, cur) => {
      let str = acc;
      if (str) str += ',';
      str += '"' + cur.brand + '";v="' + cur.version + '"';
      return str;
    }, '');
    data.ucfvl = fullVersionList;
  }
  if (ua && ua.platform) data.ucp = '"' + ua.platform + '"';
  if (ua && ua.architecture) data.ucarch = '"' + ua.architecture + '"';
  if (ua && ua.platformVersion) data.ucpv = '"' + ua.platformVersion + '"';
  if (ua && ua.bitness) data.ucbit = '"' + ua.bitness + '"';
  data.ucmbl = '?' + (ua && ua.mobile ? '1' : '0');
  if (ua && ua.model) data.ucmdl = '"' + ua.model + '"';

  return data;
}

/**
 * making request data for banner
 */
function makeBannerRequestData(bid, geparameter, refererInfo) {
  const data = makeCommonRequestData(bid, geparameter, refererInfo);

  // this query is not used in nad endpoint but used in ad_call endpoint
  if (hasParamsNotBlankString(geparameter, GEPARAMS_KEY.BUNDLE)) {
    data.apid = encodeURIComponentIncludeSingleQuotation(geparameter[GEPARAMS_KEY.BUNDLE]);
  }

  return data;
}

/**
 * making bid response be used commonly banner and native
 */
function makeCommonBidResponse(bid, width, height) {
  return {
    requestId: bid.requestid,
    cpm: bid.price,
    creativeId: bid.creativeId,
    currency: bid.cur,
    netRevenue: NET_REVENUE,
    ttl: 700,
    width: width, // width of the ad iframe
    height: height, // height of the ad iframe
  };
}

/**
 * making bid response for banner
 */
function makeBannerBidResponse(bid, request) {
  const bidResponse = makeCommonBidResponse(bid, bid.width, bid.height);
  const loc = encodeURIComponentIncludeSingleQuotation(
    window.top === window.self ? location.href : window.top.document.referrer
  );
  const beacon = !bid.ib
    ? ''
    : `
    <div style="position: absolute; left: 0px; top: 0px; visibility: hidden;">
    <img src="${bid.ib.uri}&loc=${loc}" width="0" height="0" alt="" style="width: 0px; height: 0px;">
    </div>`;
  bidResponse.ad = makeBidResponseAd(
    beacon + '<div>' + makeChangeHeightEventMarkup(request) + decodeURIComponent(bid.adm) + '</div>'
  );
  bidResponse.mediaType = BANNER;

  return bidResponse;
}

/**
 * making change height event markup for af iframe. About passback ad, it is possible that ad image is cut off. To handle this, we add this event to change height after ad is loaded.
 */
function makeChangeHeightEventMarkup(request) {
  return (
    '<script>window.addEventListener("load",function(){window.parent.document.getElementById("' + request.bid.adUnitCode + '").height=document.body.scrollHeight})</script>'
  );
}

/**
 * making bid response ad. This is also the value to be used by document.write in renderAd function.
 * @param {string} innerHTML
 * @returns
 */
function makeBidResponseAd(innerHTML) {
  return '<body marginwidth="0" marginheight="0">' + innerHTML + '</body>';
}

function getUserAgent() {
  return storage.getDataFromLocalStorage('key') || null;
}

export const spec = {
  code: BIDDER_CODE,
  supportedMediaTypes: SUPPORTED_MEDIA_TYPES,
  /**
   * Determines whether or not the given bid request is valid.
   * @param {BidRequest} bidRequest The bid request params to validate.
   * @return boolean True if this is a valid bid request, and false otherwise.
   */
  isBidRequestValid: function (bidRequest) {
    if (!bidRequest.params.zoneId) return false;

    if (bidRequest.params.hasOwnProperty('currency')) {
      const bidCurrency = bidRequest.params.currency;

      if (!ALLOWED_CURRENCIES.includes(bidCurrency)) {
        utils.logError(`[${BIDDER_CODE}] Currency "${bidCurrency}" in bid params is not supported. Supported are: ${ALLOWED_CURRENCIES.join(', ')}.`);
        return false;
      }
    } else {
      const adServerCurrency = config.getConfig('currency.adServerCurrency');
      if (typeof adServerCurrency === 'string' && !ALLOWED_CURRENCIES.includes(adServerCurrency)) {
        utils.logError(`[${BIDDER_CODE}] adServerCurrency "${adServerCurrency}" is not supported. Supported are: ${ALLOWED_CURRENCIES.join(', ')}.`);
        return false;
      }
    }

    return true;
  },
  /**
   * Make a server request from the list of BidRequests.
   *
   * @param {Array<BidRequest>} validBidRequests an array of bid requests
   * @return ServerRequest Info describing the request to the server.
   */
  buildRequests: function (validBidRequests, bidderRequest) {
    const serverRequests = [];

    const HIGH_ENTROPY_HINTS = [
      'architecture',
      'model',
      'mobile',
      'platform',
      'bitness',
      'platformVersion',
      'fullVersionList',
    ];

    const uaData = window.navigator?.userAgentData;
    if (uaData && uaData.getHighEntropyValues) {
      const getHighEntropySUA = highEntropySUAAccessor(uaData);
      getHighEntropySUA(HIGH_ENTROPY_HINTS).then((ua) => {
        if (ua) {
          storage.setDataInLocalStorage('ua', JSON.stringify(ua));
        }
      });
    }

    validBidRequests.forEach((bid) => {
      // const isNative = bid.mediaTypes?.native;
      const geparameter = window.geparams || {};

      serverRequests.push({
        method: 'GET',
        url: BANNER_ENDPOINT,
        data: makeBannerRequestData(bid, geparameter, bidderRequest?.refererInfo),
        bid: bid,
      });
    });

    return serverRequests;
  },
  /**
   * Unpack the response from the server into a list of bids.
   *
   * @param {ServerResponse} serverResponse A successful response from the server.
   * @param {BidRequest} bidderRequest A matched bid request for this response.
   * @return Array<BidResponse> An array of bids which were nested inside the server.
   */
  interpretResponse: function (serverResponse, bidderRequest) {
    const bidResponses = [];

    if (!serverResponse || !serverResponse.body) {
      return bidResponses;
    }

    const zoneId = bidderRequest.bid.params.zoneId;
    let successBid;
    successBid = serverResponse.body || {};

    if (successBid.hasOwnProperty(zoneId)) {
      const bid = successBid[zoneId];
      bidResponses.push(makeBannerBidResponse(bid, bidderRequest));
    }
    return bidResponses;
  },
  getUserSyncs: function (syncOptions, serverResponses) {
    const syncs = [];
    if (!syncOptions.iframeEnabled && !syncOptions.pixelEnabled) return syncs;

    serverResponses.forEach((serverResponse) => {
      if (!serverResponse || !serverResponse.body) return;

      const bids = Object.values(serverResponse.body).filter(Boolean);
      if (!bids.length) return;

      bids.forEach(bid => {
        if (syncOptions.iframeEnabled && bid.cs_url) {
          syncs.push({ type: 'iframe', url: USER_SYNC_ENDPOINT_IFRAME + bid.cs_url });
          return;
        }

        if (syncOptions.pixelEnabled && bid.adm) {
          const decodedAdm = decodeURIComponent(bid.adm)
          const reg = new RegExp('https:\\\\/\\\\/cs.gssprt.jp\\\\/yie\\\\/ld\\\\/mcs\\?([^\\\\"]+)\\\\"', 'g');
          const csQuery = Array.from(decodedAdm.matchAll(reg), (match) => match[1]);
          if (!csQuery.length) {
            return;
          }

          csQuery.forEach((query) => {
            syncs.push({
              type: 'image',
              url: USER_SYNC_ENDPOINT_IMAGE + '?' + query
            });
          });
        }
      });
    });

    return syncs;
  },
  onTimeout: function (timeoutData) {},
  onBidWon: function (bid) {},
  onSetTargeting: function (bid) {},
};

registerBidder(spec);
