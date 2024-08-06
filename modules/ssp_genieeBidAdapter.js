/* eslint-disable camelcase */
import * as utils from '../src/utils.js';
import { registerBidder } from '../src/adapters/bidderFactory.js';
import { BANNER, NATIVE } from '../src/mediaTypes.js';
import { getStorageManager } from '../src/storageManager.js';
import { MODULE_TYPE_ANALYTICS } from '../src/activities/modules.js'

const BIDDER_CODE = 'ssp_geniee';
export const BANNER_ENDPOINT = 'https://aladdin.genieesspv.jp/yie/ld/api/ad_call/v2';
export const NATIVE_ENDPOINT = 'https://aladdin.genieesspv.jp/yie/ld/nad';
// export const ENDPOINT_USERSYNC = '';
const SUPPORTED_MEDIA_TYPES = [BANNER, NATIVE];
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
    params[key] != null &&
    params[key] != ''
  );
}

/**
 * Checking argument is object or not
 * @param {any} value
 * @returns {boolean}
 */
function isObject(value) {
  return !!(typeof value !== 'undefined' && typeof value == 'object' && value);
}

/**
 * making request data be used commonly banner and native
 * @see https://docs.prebid.org/dev-docs/bidder-adaptor.html#location-and-referrers
 */
function makeCommonRequestData(bid, geparameter, refererInfo) {
  const data = {
    zoneid: bid.params.zoneId,
    cb: Math.floor(Math.random() * 99999999999),
    charset: document.charset || document.characterSet || '',
    loc: refererInfo?.page || refererInfo?.location || refererInfo?.topmostLocation || refererInfo?.legacy.referer || encodeURIComponentIncludeSingleQuotation(geparameter[GEPARAMS_KEY.LOCATION]) || '',
    ct0: geparameter[GEPARAMS_KEY.GENIEE_CT0] !== 'undefined'
      ? encodeURIComponentIncludeSingleQuotation(geparameter[GEPARAMS_KEY.GENIEE_CT0])
      : '',
    referer: refererInfo?.ref || encodeURIComponentIncludeSingleQuotation(geparameter[GEPARAMS_KEY.REFERRER]) || '',
    topframe: window.parent == window.self ? 1 : 0,
    cur: bid.params.hasOwnProperty('currency') ? bid.params.currency : DEFAULT_CURRENCY,
    requestid: bid.bidId,
    ua: navigator.userAgent,
    tpaf: 1,
    cks: 1,
    ib: bid.params.invalidImpBeacon === true ? 0 : 1,
  };

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
  if (GEPARAMS_KEY.CUSTOM in geparameter && isObject(geparameter[GEPARAMS_KEY.CUSTOM])) {
    for (const c in geparameter[GEPARAMS_KEY.CUSTOM]) {
      if (hasParamsNotBlankString(geparameter[GEPARAMS_KEY.CUSTOM], c)) {
        data[encodeURIComponentIncludeSingleQuotation('custom_' + c)] =
          encodeURIComponentIncludeSingleQuotation(
            geparameter[GEPARAMS_KEY.CUSTOM][c]
          );
      }
    }
  }
  const gecuparameter = bid.params.gecuparams;
  if (isObject(gecuparameter)) {
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

  // imuid
  const imuidQuery = getImuidAsQueryParameter();
  if (imuidQuery) data.extuid = imuidQuery;

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

function toCallbackName(zoneId) {
  return 'gnnative_' + zoneId + '_callback';
}

function toNativeObjectName(zoneId) {
  return 'gnnative_' + zoneId;
}

/**
 * making request data for native
 */
function makeNativeRequestData(bid, geparameter, refererInfo) {
  const data = makeCommonRequestData(bid, geparameter, refererInfo);

  data.callback = toCallbackName(data.zoneid);
  if (geparameter.gfuid && geparameter.gfuid != '') {
    data.gfuid = encodeURIComponentIncludeSingleQuotation(geparameter.gfuid);
  }
  if (geparameter.adt && geparameter.adt != '') {
    data.adt = encodeURIComponentIncludeSingleQuotation(geparameter.adt);
  }

  data.apiv = bid.params.native.apiv || '1.0.0';
  data.tkf = bid.params.native.tkf || 0;
  data.ad_track = '1';

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
    width: width + 'px', // width of the ad iframe
    height: height + 'px', // height of the ad iframe
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
 * making bid response for native
 */
function makeNativeBidResponse(bid, request, serverResponseBody) {
  let width;
  let height;
  request.bid.mediaTypes.native.ortb.assets.forEach((asset) => {
    if (asset.img) {
      width = asset.img.w;
      height = asset.img.h;
    }
  });
  const bidResponse = makeCommonBidResponse(
    bid,
    width,
    height
  );

  let bidResponseAd = "<script type='text/javascript'>";
  bidResponseAd += 'window.parent.' + toNativeObjectName(request.bid.params.zoneId) + '.targetWindow=window;';
  bidResponseAd += 'window.parent.' + serverResponseBody;
  bidResponseAd += '</'.concat('script>');

  bidResponse.ad = makeBidResponseAd(bidResponseAd);
  bidResponse.mediaType = NATIVE;
  bidResponse.native = {
    title: bid.title,
    body: bid.description,
    cta: bid.cta || 'click here',
    sponsoredBy: bid.advertiser || 'geniee',
    clickUrl: encodeURIComponentIncludeSingleQuotation(bid.landingURL),
    impressionTrackers: bid.trackings,
  };
  if (bid.screenshots) {
    bidResponse.native.image = {
      url: bid.screenshots.url,
      height: bid.screenshots.height,
      width: bid.screenshots.width,
    };
  }
  if (bid.icon) {
    bidResponse.native.icon = {
      url: bid.icon.url,
      height: bid.icon.height,
      width: bid.icon.width,
    };
  }

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

/**
 * definition of window object for native ad.
 * 1. define object and callback function in current window
 * 2. convert Aladdin ad response and write it to iframe
 * 3. call callback function in current window (=parent window of iframe) from iframe
 * 4. operate window and document in iframe from current window
 * The way to set targetWindow is unnecessarily complicated because of the above.
 * Note: If targetWindow.document is assigned to a variable, the ad will not be displayed in Firefox. It will not be displayed even if the argument is changed from window to document.
 * @param {object} bidParams
 */
function defineGnnativeWindow(bidParams) {
  window[toNativeObjectName(bidParams.zoneId)] = {
    targetWindow: null,
    itemFormat: bidParams?.native.itemFormat,
    zoneid: bidParams.zoneId,
    write_native_ad: function (nad) {
      if (!this.targetWindow) return false;
      let gnnative_id_$REPLACE_$zoneId$;
      if (nad && nad.third_tag && nad.trackings) {
        gnnative_id_$REPLACE_$zoneId$ = Math.floor(Math.random() * 99999);
        this.targetWindow.document.write(
          '<div id ="gnnative_ad' + gnnative_id_$REPLACE_$zoneId$ + '" style="display:none;"></div>'
        );
        this.targetWindow.document.write(nad.third_tag);
        for (let i = 0, len = nad.trackings.length; i < len; i++) {
          this.targetWindow.document.write(nad.trackings[i]);
        }
      } else if (nad && (nad.trackings || nad.isnative == 1)) {
        let item = this.itemFormat;
        item = this.changeOptoutText(item, nad);
        item =
          nad.icon && nad.icon.url
            ? item.replace(/{icon-url}/g, nad.icon.url)
            : item.replace(/{icon-url}/g, '');
        item =
          nad.icon && nad.icon.largeURL
            ? item.replace(/{icon-large-url}/g, nad.icon.largeURL)
            : item.replace(/{icon-large-url}/g, '');
        item = nad.landingURL
          ? item.replace(/{landing-url}/g, nad.landingURL)
          : item.replace(/{landing-url}/g, '');
        item = nad.title
          ? item.replace(/{title}/g, nad.title)
          : item.replace(/{title}/g, '');
        item = nad.advertiser
          ? item.replace(/{advertiser}/g, nad.advertiser)
          : item.replace(/{advertiser}/g, '');
        if (nad.optout) {
          item = nad.optout.text
            ? item.replace(/{optout-text}/g, nad.optout.text)
            : item.replace(/{optout-text}/g, '');
          item = nad.optout.url
            ? item.replace(/{optout-url}/g, nad.optout.url)
            : item.replace(/{optout-url}/g, '');
          item = nad.optout.image_url
            ? item.replace(/{optout-image-url}/g, nad.optout.image_url)
            : item.replace(/{optout-image-url}/g, '');
        }
        item = nad.description
          ? item.replace(/{description}/g, nad.description)
          : item.replace(/{description}/g, '');
        item = nad.cta
          ? item.replace(/{cta}/g, nad.cta)
          : item.replace(/{cta}/g, '');
        item =
          nad.app && nad.app.appName
            ? item.replace(/{app-name}/g, nad.app.appName)
            : item.replace(/{app-name}/g, '');
        item =
          nad.app && nad.app.targetAge
            ? item.replace(/{target-age}/g, nad.app.targetAge)
            : item.replace(/{target-age}/g, '');
        item =
          nad.app && nad.app.rating
            ? item.replace(/{rating}/g, nad.app.rating)
            : item.replace(/{rating}/g, '');
        if (nad.screenshots) {
          item = nad.screenshots.url
            ? item.replace(/{screenshots-url}/g, nad.screenshots.url)
            : item.replace(/{screenshots-url}/g, '');
          item = nad.screenshots.width
            ? item.replace(/{screenshots-width}/g, nad.screenshots.width)
            : item.replace(/{screenshots-width}/g, '');
          item = nad.screenshots.height
            ? item.replace(/{screenshots-height}/g, nad.screenshots.height)
            : item.replace(/{screenshots-height}/g, '');
        }
        const ret = this.postReplace(item);
        item = ret || item;
        if (typeof gnnative_id_$REPLACE_$zoneId$ === 'undefined') {
          gnnative_id_$REPLACE_$zoneId$ = Math.floor(Math.random() * 99999);
          this.targetWindow.document.write(
            '<div id ="gnnative_ad' + gnnative_id_$REPLACE_$zoneId$ + '" style="display:none;"></div>'
          );
        }
        const tmpNode = this.targetWindow.document.getElementById(
          'gnnative_ad' + gnnative_id_$REPLACE_$zoneId$
        );
        tmpNode.innerHTML = item;
        if (nad.clicktrackers && nad.clicktrackers.length) {
          const linkElements = tmpNode.getElementsByTagName('a');
          for (let count = 0; count < linkElements.length; count++) {
            const linkElement = linkElements[count];
            if (linkElement.getAttribute('href') === nad.landingURL) {
              this.addEvent(linkElement, 'click', function () {
                let ctTagText = '';
                for (let ctIdx = 0; ctIdx < nad.clicktrackers.length; ctIdx++) {
                  ctTagText += nad.clicktrackers[ctIdx];
                }
                if (ctTagText.length > 0) {
                  const divTag =
                    this.targetWindow.document.createElement('div');
                  divTag.style.cssText = 'visibility:hidden;position:absolute;width:0px!important;height:0px!important;';
                  divTag.innerHTML = ctTagText;
                  linkElement.appendChild(divTag);
                }
                return true;
              });
            }
          }
        }
        while (tmpNode.firstChild) {
          tmpNode.parentNode.insertBefore(tmpNode.firstChild, tmpNode);
        }
        tmpNode.parentNode.removeChild(tmpNode);
        for (let i = 0, len = nad.trackings.length; i < len; i++) {
          // add div and image tag
          this.targetWindow.document.write(
            '<div style="position: absolute; left: 0px; top: 0px; visibility: hidden;"><img src="' + nad.trackings[i] + '" width="0" height="0" alt="" style="width: 0px; height: 0px;">'
          );
        }
      } else {
        return false;
      }
    },
    write_native_video_ad: function (nad) {
      if (!this.targetWindow) return false;
      const targetWindow = this.targetWindow;
      let gnnative_id_$REPLACE_$zoneId$;
      if (nad && nad.third_tag && nad.trackings) {
        gnnative_id_$REPLACE_$zoneId$ = Math.floor(Math.random() * 99999);
        targetWindow.document.write(
          '<div id ="gnnative_ad' + gnnative_id_$REPLACE_$zoneId$ + '" style="display:none;"></div>'
        );
        targetWindow.document.write(nad.third_tag);
        for (let i = 0, len = nad.trackings.length; i < len; i++) {
          targetWindow.document.write(nad.trackings[i]);
        }
      } else if (nad && (nad.trackings || nad.isnative == 1)) {
        if (typeof gnnative_id_$REPLACE_$zoneId$ === 'undefined') {
          gnnative_id_$REPLACE_$zoneId$ = Math.floor(Math.random() * 99999);
        }

        if (nad.vast_xml && nad.item_format_url && nad.video_player_url) {
          targetWindow.document.write(
            '<div id ="gnnative_ad' + gnnative_id_$REPLACE_$zoneId$ + '" style="display:none;"></div>'
          );
        } else {
          return false;
        }

        const tmpNode = targetWindow.document.getElementById(
          'gnnative_ad' + gnnative_id_$REPLACE_$zoneId$
        );
        if (targetWindow.$GNVPTagRD_$) {
          const tagRd = new targetWindow.$GNVPTagRD_$(gnnative_id_$REPLACE_$zoneId$, tmpNode);
          tagRd.render(nad);
        } else {
          const tagRdScript = targetWindow.document.createElement('script');
          tagRdScript.src = nad.video_renderer_url;
          tagRdScript.onload = function () {
            const tagRd = new targetWindow.$GNVPTagRD_$(gnnative_id_$REPLACE_$zoneId$, tmpNode);
            tagRd.render(nad);
          };

          tmpNode.parentNode.appendChild(tagRdScript);
        }
      } else {
        return false;
      }
    },
    changeOptoutText: function (item, nad) {
      if (!nad.optout || !nad.optout.url || !this.targetWindow) {
        return item;
      }
      if (
        item.indexOf('{optout-text}') === -1 ||
        item.indexOf('{optout-url}') !== -1
      ) {
        return item;
      }
      const fn = 'link' + Math.floor(Math.random() * 99999);
      const ch = "<span onclick='return " + fn + "();' style='cursor: pointer'>{optout-text}</span>";
      let sc = '';
      sc += "<script type='text/javascript'>";
      sc += 'function ' + fn + '(){';
      sc += "window.open('" + nad.optout.url + "', '_blank');";
      sc += 'return false;';
      sc += '}';
      sc += '</script>';
      this.targetWindow.document.write(sc);
      return item.replace(/{optout-text}/g, ch);
    },
    postReplace: Function('item', bidParams.native.nativePostReplace), // eslint-disable-line no-new-func
    addEvent: function (target, type, handler) {
      if (target.addEventListener) {
        target.addEventListener(type, handler, false);
      } else {
        if (target.attachEvent) {
          target.attachEvent('on' + type, function (event) {
            return handler.call(target, event);
          });
        }
      }
    },
  };
  window[toCallbackName(bidParams.zoneId)] = function (gnjson) {
    const nad = gnjson[String(bidParams.zoneId)];
    if (nad && Object.prototype.hasOwnProperty.call(nad, 'vast_xml')) {
      window[toNativeObjectName(bidParams.zoneId)].write_native_video_ad(nad);
    } else {
      window[toNativeObjectName(bidParams.zoneId)].write_native_ad(nad);
    }
  };
}

/**
 * add imuid script tag
 */
function appendImuidScript() {
  const scriptEl = document.createElement('script');
  scriptEl.src = '//dmp.im-apps.net/scripts/im-uid-hook.js?cid=3929';
  scriptEl.async = true;
  document.body.appendChild(scriptEl);
}

/**
 * return imuid strings as query parameters
 */
function getImuidAsQueryParameter() {
  const imuid = storage.getCookie('_im_uid.3929');
  return imuid ? 'im:' + imuid : ''; // To avoid double encoding, not using encodeURIComponent here
}

/**
 * add actions for uach
 * @returns
 */
function setUserAgent() {
  // userAgentData is undefined if the browser is not Chrome
  if (
    !navigator.userAgentData ||
    !navigator.userAgentData.getHighEntropyValues
  ) {
    return;
  }

  return navigator.userAgentData
    .getHighEntropyValues([
      'architecture',
      'model',
      'mobile',
      'platform',
      'bitness',
      'platformVersion',
      'fullVersionList',
    ])
    .then((ua) => {
      storage.setDataInLocalStorage('ua', JSON.stringify(ua));
    });
}

function getUserAgent() {
  return storage.getDataFromLocalStorage('key') || null;
}

export const spec = {
  code: BIDDER_CODE,
  supportedMediaTypes: SUPPORTED_MEDIA_TYPES,
  /**
   * Determines whether or not the given bid request is valid.
   *
   * @param {BidRequest} bidRequest The bid request params to validate.
   * @return boolean True if this is a valid bid request, and false otherwise.
   */
  isBidRequestValid: function (bidRequest) {
    if (!bidRequest.params.zoneId) return false;
    if (bidRequest.params.hasOwnProperty('currency')) {
      if (ALLOWED_CURRENCIES.indexOf(bidRequest.params.currency) === -1) {
        utils.logError('Invalid currency type, we support only JPY and USD!');
        return false;
      }
    }

    if (bidRequest.params.hasOwnProperty('native') && !bidRequest.params.native) return false;
    if (bidRequest.params?.native) {
      if (!bidRequest.params.native.itemFormat) return false;
      if (typeof bidRequest.params.native.nativePostReplace !== 'string') {
        return false;
      }
    }
    if (bidRequest.mediaTypes?.native) {
      if (!bidRequest.mediaTypes.native.ortb || !bidRequest.mediaTypes.native.ortb.assets) return false;
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

    setUserAgent();

    validBidRequests.forEach((bid) => {
      // const isNative = bid.mediaTypes?.native;
      const isNative = bid.params.hasOwnProperty('native');
      const geparameter = bid.params?.geparams || {};

      serverRequests.push({
        method: 'GET',
        url: isNative ? NATIVE_ENDPOINT : BANNER_ENDPOINT,
        data: utils.parseQueryStringParameters(
          isNative
            ? makeNativeRequestData(bid, geparameter, bidderRequest?.refererInfo)
            : makeBannerRequestData(bid, geparameter, bidderRequest?.refererInfo)
        ),
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
  interpretResponse: function (serverResponse, request) {
    const bidResponses = [];

    if (!serverResponse || !serverResponse.body) {
      return bidResponses;
    }

    appendImuidScript();

    const zoneId = request.bid.params.zoneId;
    let successBid;
    if (request.url === BANNER_ENDPOINT) {
      successBid = serverResponse.body || {};
    } else if (request.url === NATIVE_ENDPOINT) {
      defineGnnativeWindow(request.bid.params, request.bid.adUnitCode);
      const gnnativeCallbackName = toCallbackName(zoneId);
      // Since the response is not JSON but JSONP, the callback function is written with JSON as an argument, so extract the JSON argument
      const gnjson = JSON.parse(serverResponse.body.replace(new RegExp(gnnativeCallbackName + '\\((.*)\\);'), '$1'));
      successBid = gnjson || {};
    }

    if (successBid.hasOwnProperty(zoneId)) {
      const bid = successBid[zoneId];
      bidResponses.push(
        bid.hasOwnProperty('title')
          ? makeNativeBidResponse(bid, request, serverResponse.body)
          : makeBannerBidResponse(bid, request)
      );
    }
    return bidResponses;
  },
  getUserSyncs: function (syncOptions, serverResponses) {
    const syncs = [];

    // if we need user sync, we add this part after preparing the endpoint
    /* if (syncOptions.pixelEnabled) {
      syncs.push({
        type: 'image',
        url: ENDPOINT_USERSYNC
      });
    } */

    return syncs;
  },
  onTimeout: function (timeoutData) {},
  onBidWon: function (bid) {},
  onSetTargeting: function (bid) {},
};

registerBidder(spec);
