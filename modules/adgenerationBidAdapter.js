import { escapeUnsafeChars } from '../libraries/htmlEscape/htmlEscape.js';
import { getCurrencyFromBidderRequest } from '../libraries/ortb2Utils/currency.js';
import { tryAppendQueryString } from '../libraries/urlUtils/urlUtils.js';
import { registerBidder } from '../src/adapters/bidderFactory.js';
import { BANNER, NATIVE } from '../src/mediaTypes.js';
import { getBidIdParameter, deepSetValue, prefixLog } from '../src/utils.js';
import { ortbConverter } from '../libraries/ortbConverter/converter.js';
const adgLogger = prefixLog('Adgeneration: ');

/**
 * @typedef {import('../src/adapters/bidderFactory.js').BidRequest} BidRequest
 * @typedef {import('../src/adapters/bidderFactory.js').Bid} Bid
 * @typedef {import('../src/adapters/bidderFactory.js').ServerResponse} ServerResponse
 * @typedef {import('../src/adapters/bidderFactory.js').SyncOptions} SyncOptions
 * @typedef {import('../src/adapters/bidderFactory.js').UserSync} UserSync
 */

const ADG_BIDDER_CODE = 'adgeneration';
const ADGENE_PREBID_VERSION = '1.6.5';
const DEBUG_URL = 'https://api-test.scaleout.jp/adgen/prebid';
const URL = 'https://d.socdm.com/adgen/prebid';

const converter = ortbConverter({
  context: {
    // `netRevenue` and `ttl` are required properties of bid responses - provide a default for them
    netRevenue: true, // or false if your adapter should set bidResponse.netRevenue = false
    ttl: 30// default bidResponse.ttl (when not specified in ORTB response.seatbid[].bid[].exp)
  },
  imp(buildImp, bidRequest, context) {
    const imp = buildImp(bidRequest, context);
    deepSetValue(imp, 'ext.params', bidRequest.params);
    deepSetValue(imp, 'ext.mediaTypes', bidRequest.mediaTypes);
    return imp;
  },
  request(buildRequest, imps, bidderRequest, context) {
    const request = buildRequest(imps, bidderRequest, context);
    return request;
  },
  bidResponse(buildBidResponse, bid, context) {
    return buildBidResponse(bid, context)
  }
});

export const spec = {
  code: ADG_BIDDER_CODE,
  aliases: ['adg'], // short code
  supportedMediaTypes: [BANNER, NATIVE],
  /**
   * Determines whether or not the given bid request is valid.
   *
   * @param {BidRequest} bid The bid params to validate.
   * @return boolean True if this is a valid bid, and false otherwise.
   */
  isBidRequestValid: function (bid) {
    return !!(bid.params.id);
  },
  /**
   * Make a server request from the list of BidRequests.
   * @param validBidRequests
   * @param bidderRequest
   * @return ServerRequest Info describing the request to the server.
   */
  buildRequests: function (validBidRequests, bidderRequest) {
    const ortbObj = converter.toORTB({bidRequests: validBidRequests, bidderRequest});
    adgLogger.logInfo('ortbObj', ortbObj);
    const {imp, ...rest} = ortbObj
    const requests = imp.map((impObj) => {
      const customParams = impObj?.ext?.params;
      const id = getBidIdParameter('id', customParams);
      const additionalParams = JSON.parse(JSON.stringify(rest));

      let urlParams = ``;
      urlParams = tryAppendQueryString(urlParams, 'id', id);
      urlParams = tryAppendQueryString(urlParams, 'posall', 'SSPLOC');// not reaquired
      urlParams = tryAppendQueryString(urlParams, 'sdktype', '0');

      // remove the trailing "&"
      if (urlParams.lastIndexOf('&') === urlParams.length - 1) {
        urlParams = urlParams.substring(0, urlParams.length - 1);
      }

      const urlBase = customParams.debug ? (customParams.debug_url ? customParams.debug_url : DEBUG_URL) : URL
      const url = `${urlBase}?${urlParams}`;

      const data = {
        currency: getCurrencyType(bidderRequest),
        pbver: '$prebid.version$',
        sdkname: 'prebidjs',
        adapterver: ADGENE_PREBID_VERSION,
        ortb: {
          imp: [impObj],
          ...additionalParams
        }
      }

      // native以外にvideo等の対応が入った場合は要修正
      if (!impObj?.ext?.mediaTypes || !impObj?.ext?.mediaTypes.native) {
        data.imark = 1;
      }

      return {
        method: 'POST',
        url: url,
        data,
        options: {
          withCredentials: true,
          crossOrigin: true
        },
      }
    })
    return requests;
  },
  /**
   * Unpack the response from the server into a list of bids.
   *
   * @param {ServerResponse} serverResponse A successful response from the server.
   * @param {BidRequest} bidRequests
   * @return {Bid[]} An array of bids which were nested inside the server.
   */
  interpretResponse: function (serverResponse, bidRequests) {
    adgLogger.logInfo('serverResponse', JSON.parse(JSON.stringify(serverResponse)));
    const body = serverResponse.body;
    if (!body.results || body.results.length < 1) {
      return [];
    }

    if (!bidRequests?.data?.ortb?.imp || bidRequests?.data?.ortb?.imp.length < 1) {
      return [];
    }

    const adResult = body?.results[0];
    const targetImp = bidRequests?.data?.ortb?.imp[0];
    const requestId = targetImp?.id;

    const bidResponse = {
      requestId: requestId,
      cpm: adResult.cpm || 0,
      width: adResult.w ? adResult.w : 1,
      height: adResult.h ? adResult.h : 1,
      creativeId: adResult.creativeid || '',
      dealId: adResult.dealid || '',
      currency: bidRequests?.data?.currency || 'JPY',
      netRevenue: true,
      ttl: adResult.ttl || 10,
    };
    if (adResult.adomain && Array.isArray(adResult.adomain) && adResult.adomain.length) {
      bidResponse.meta = {
        advertiserDomains: adResult.adomain
      }
    }
    if (isNative(adResult)) {
      bidResponse.native = createNativeAd(adResult.native, adResult.beaconurl);
      bidResponse.mediaType = NATIVE;
    } else {
      // banner
      bidResponse.ad = createAd(adResult, body?.location_params, targetImp.ext.params, requestId);
    }
    return [bidResponse];
  },

  /**
   * Register the user sync pixels which should be dropped after the auction.
   *
   * @param {SyncOptions} syncOptions Which user syncs are allowed?
   * @param {ServerResponse[]} serverResponses List of server's responses.
   * @return {UserSync[]} The user syncs which should be dropped.
   */
  getUserSyncs: function (syncOptions, serverResponses) {
    const syncs = [];
    return syncs;
  }
};

function createAd(adResult, locationPrams, bidParams, requestId) {
  adgLogger.logInfo('params', bidParams);
  let ad = adResult.ad;
  if (adResult.vastxml && adResult.vastxml.length > 0) {
    if (isUpperBillboard(locationPrams)) {
      const marginTop = bidParams.marginTop ? bidParams.marginTop : '0';
      ad = `<body>${createADGBrowserMTag()}${insertVASTMethodForADGBrowserM(adResult.vastxml, marginTop)}</body>`;
    } else {
      ad = `<body><div id="apvad-${requestId}"></div>${createAPVTag()}${insertVASTMethodForAPV(requestId, adResult.vastxml)}</body>`;
    }
  }
  ad = appendChildToBody(ad, adResult.beacon);
  if (removeWrapper(ad)) return removeWrapper(ad);
  return ad;
}

function isUpperBillboard(locationParams) {
  if (locationParams && locationParams.option && locationParams.option.ad_type) {
    return locationParams.option.ad_type === 'upper_billboard';
  }
  return false;
}

function isNative(adResult) {
  if (!adResult) return false;
  return adResult.native && adResult.native.assets.length > 0;
}

function createNativeAd(nativeAd, beaconUrl) {
  const native = {};
  if (nativeAd && nativeAd.assets.length > 0) {
    const assets = nativeAd.assets;
    for (let i = 0, len = assets.length; i < len; i++) {
      switch (assets[i].id) {
        case 1:
          native.title = assets[i].title.text;
          break;
        case 2:
          native.image = {
            url: assets[i].img.url,
            height: assets[i].img.h,
            width: assets[i].img.w,
          };
          break;
        case 3:
          native.icon = {
            url: assets[i].img.url,
            height: assets[i].img.h,
            width: assets[i].img.w,
          };
          break;
        case 4:
          native.sponsoredBy = assets[i].data.value;
          break;
        case 5:
          native.body = assets[i].data.value;
          break;
        case 6:
          native.cta = assets[i].data.value;
          break;
        case 502:
          native.privacyLink = encodeURIComponent(assets[i].data.value);
          break;
      }
    }
    native.clickUrl = nativeAd.link.url;
    native.clickTrackers = nativeAd.link.clicktrackers || [];
    native.impressionTrackers = nativeAd.imptrackers || [];
    if (beaconUrl) {
      native.impressionTrackers.push(beaconUrl);
    }
  }
  return native;
}

function appendChildToBody(ad, data) {
  return ad.replace(/<\/\s?body>/, `${data}</body>`);
}

/**
 * create APVTag
 * @return {string}
 */
function createAPVTag() {
  const APVURL = 'https://cdn.apvdr.com/js/VideoAd.min.js';
  return `<script type="text/javascript" id="apv" src="${APVURL}"></script>`
}

/**
 * create ADGBrowserMTag
 * @return {string}
 */
function createADGBrowserMTag() {
  const ADGBrowserMURL = 'https://i.socdm.com/sdk/js/adg-browser-m.js';
  return `<script type="text/javascript" src="${ADGBrowserMURL}"></script>`;
}

/**
 * create APVTag & insertVast
 * @param targetId
 * @param vastXml
 * @return {string}
 */
function insertVASTMethodForAPV(targetId, vastXml) {
  const apvVideoAdParam = {
    s: targetId
  };
  return `<script type="text/javascript">(function(){ new APV.VideoAd(${escapeUnsafeChars(JSON.stringify(apvVideoAdParam))}).load('${vastXml.replace(/\r?\n/g, '')}'); })();</script>`
}

/**
 * create ADGBrowserMTag & insertVast
 * @param vastXml
 * @param marginTop
 * @return {string}
 */
function insertVASTMethodForADGBrowserM(vastXml, marginTop) {
  return `<script type="text/javascript">window.ADGBrowserM.init({vastXml: '${vastXml.replace(/\r?\n/g, '')}', marginTop: '${marginTop}'});</script>`
}

/**
 *
 * @param ad
 */
function removeWrapper(ad) {
  const bodyIndex = ad.indexOf('<body>');
  const lastBodyIndex = ad.lastIndexOf('</body>');
  if (bodyIndex === -1 || lastBodyIndex === -1) return false;
  return ad.substr(bodyIndex, lastBodyIndex).replace('<body>', '').replace('</body>', '');
}

/**
 * @return {?string} USD or JPY
 */
function getCurrencyType(bidderRequest) {
  const adServerCurrency = getCurrencyFromBidderRequest(bidderRequest) || ''
  return adServerCurrency.toUpperCase() === 'USD' ? 'USD' : 'JPY'
}

registerBidder(spec);
