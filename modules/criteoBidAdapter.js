import {deepSetValue, isArray, logError, logWarn, parseUrl, triggerPixel, deepAccess, logInfo} from '../src/utils.js';
import {registerBidder} from '../src/adapters/bidderFactory.js';
import {BANNER, NATIVE, VIDEO} from '../src/mediaTypes.js';
import {getStorageManager} from '../src/storageManager.js';
import {getRefererInfo} from '../src/refererDetection.js';
import {hasPurpose1Consent} from '../src/utils/gdpr.js';
import {Renderer} from '../src/Renderer.js';
import {OUTSTREAM} from '../src/video.js';
import {ajax} from '../src/ajax.js';
import {ortbConverter} from '../libraries/ortbConverter/converter.js';
import {ortb25Translator} from '../libraries/ortb2.5Translator/translator.js';
import {config} from '../src/config.js';

/**
 * @typedef {import('../src/adapters/bidderFactory.js').BidRequest} BidRequest
 * @typedef {import('../src/adapters/bidderFactory.js').Bid} Bid
 * @typedef {import('../src/adapters/bidderFactory.js').ServerRequest} ServerRequest
 * @typedef {import('../src/adapters/bidderFactory.js').BidderSpec} BidderSpec
 * @typedef {import('../src/adapters/bidderFactory.js').TimedOutBid} TimedOutBid
 */

const GVLID = 91;
export const ADAPTER_VERSION = 37;
const BIDDER_CODE = 'criteo';
const CDB_ENDPOINT = 'https://grid-bidder.criteo.com/openrtb_2_5/pbjs/auction/request';
const PROFILE_ID_INLINE = 207;
export const storage = getStorageManager({ bidderCode: BIDDER_CODE });
const LOG_PREFIX = 'Criteo: ';
const TRANSLATOR = ortb25Translator();

const PUBLISHER_TAG_OUTSTREAM_SRC = 'https://static.criteo.net/js/ld/publishertag.renderer.js'
const OPTOUT_COOKIE_NAME = 'cto_optout';
const BUNDLE_COOKIE_NAME = 'cto_bundle';
const GUID_RETENTION_TIME_HOUR = 24 * 30 * 13; // 13 months
const OPTOUT_RETENTION_TIME_HOUR = 5 * 12 * 30 * 24; // 5 years
const DEFAULT_GZIP_ENABLED = true;

/**
 * Defines the generic oRTB converter and all customization functions.
 */
const CONVERTER = ortbConverter({
  context: {
    netRevenue: true,
    ttl: 60
  },
  imp,
  request,
  bidResponse,
  response
});

/**
 * Builds an impression object for the ORTB 2.5 request.
 *
 * @param {function} buildImp - The function for building an imp object.
 * @param {Object} bidRequest - The bid request object.
 * @param {Object} context - The context object.
 * @returns {Object} The ORTB 2.5 imp object.
 */
function imp(buildImp, bidRequest, context) {
  const imp = buildImp(bidRequest, context);
  const params = bidRequest.params;

  imp.tagid = bidRequest.adUnitCode;
  deepSetValue(imp, 'ext', {
    ...bidRequest.params.ext,
    ...imp.ext,
    rwdd: imp.rwdd,
    floors: getFloors(bidRequest),
    bidder: {
      publishersubid: params?.publisherSubId,
      zoneid: params?.zoneId,
      uid: params?.uid,
    },
  });

  delete imp.rwdd // oRTB 2.6 field moved to ext

  if (!context.fledgeEnabled && imp.ext.igs?.ae) {
    delete imp.ext.igs.ae;
  }

  if (hasVideoMediaType(bidRequest)) {
    const paramsVideo = bidRequest.params.video;
    if (paramsVideo !== undefined) {
      deepSetValue(imp, 'video', {
        ...imp.video,
        skip: imp.video.skip || paramsVideo.skip || 0,
        placement: imp.video.placement || paramsVideo.placement,
        minduration: imp.video.minduration || paramsVideo.minduration,
        playbackmethod: imp.video.playbackmethod || paramsVideo.playbackmethod,
        startdelay: imp.video.startdelay || paramsVideo.startdelay || 0,
      })
    }
    deepSetValue(imp, 'video.ext', {
      context: bidRequest.mediaTypes.video.context,
      playersizes: parseSizes(bidRequest?.mediaTypes?.video?.playerSize, parseSize),
      plcmt: bidRequest.mediaTypes.video.plcmt,
      poddur: bidRequest.mediaTypes.video.adPodDurationSec,
      rqddurs: bidRequest.mediaTypes.video.durationRangeSec,
    })
  }

  if (imp.native && typeof imp.native.request !== 'undefined') {
    const requestNative = JSON.parse(imp.native.request);

    // We remove the native asset requirements if we used the bypass to generate the imp
    const hasAssetRequirements = requestNative.assets &&
      (requestNative.assets.length !== 1 || Object.keys(requestNative.assets[0]).length);
    if (!hasAssetRequirements) {
      delete requestNative.assets;
    }

    deepSetValue(imp, 'native.request_native', requestNative);
    delete imp.native.request;
  }

  return imp;
}

/**
 * Builds a request object for the ORTB 2.5 request.
 *
 * @param {function} buildRequest - The function for building a request object.
 * @param {Array} imps - An array of ORTB 2.5 impression objects.
 * @param {Object} bidderRequest - The bidder request object.
 * @param {Object} context - The context object.
 * @returns {Object} The ORTB 2.5 request object.
 */
function request(buildRequest, imps, bidderRequest, context) {
  let request = buildRequest(imps, bidderRequest, context);

  // params.pubid should override publisher id
  if (typeof context.publisherId !== 'undefined') {
    if (typeof request.app !== 'undefined') {
      deepSetValue(request, 'app.publisher.id', context.publisherId);
    } else {
      deepSetValue(request, 'site.publisher.id', context.publisherId);
    }
  }

  if (bidderRequest && bidderRequest.gdprConsent) {
    deepSetValue(request, 'regs.ext.gdprversion', bidderRequest.gdprConsent.apiVersion);
  }

  // Translate 2.6 OpenRTB request into 2.5 OpenRTB request
  request = TRANSLATOR(request);

  return request;
}

/**
 * Build bid from oRTB 2.5 bid.
 *
 * @param buildBidResponse
 * @param bid
 * @param context
 * @returns {*}
 */
function bidResponse(buildBidResponse, bid, context) {
  context.mediaType = bid?.ext?.mediatype;
  if (context.mediaType === NATIVE && typeof bid.adm_native !== 'undefined') {
    bid.adm = bid.adm_native;
    delete bid.adm_native;
  }

  const bidResponse = buildBidResponse(bid, context);
  const {bidRequest} = context;

  bidResponse.currency = bid?.ext?.cur;

  if (typeof bid?.ext?.meta !== 'undefined') {
    deepSetValue(bidResponse, 'meta', {
      ...bidResponse.meta,
      ...bid.ext.meta
    });
  }
  if (typeof bid?.ext?.paf?.content_id !== 'undefined') {
    deepSetValue(bidResponse, 'meta.paf.content_id', bid.ext.paf.content_id)
  }

  if (bidResponse.mediaType === VIDEO) {
    bidResponse.vastUrl = bid.ext?.displayurl;
    // if outstream video, add a default render for it.
    if (bidRequest?.mediaTypes?.video?.context === OUTSTREAM) {
      bidResponse.renderer = createOutstreamVideoRenderer(bid);
    }
  }

  return bidResponse;
}

/**
 * Builds bid response from the oRTB 2.5 bid response.
 *
 * @param buildResponse
 * @param bidResponses
 * @param ortbResponse
 * @param context
 * @returns *
 */
function response(buildResponse, bidResponses, ortbResponse, context) {
  const response = buildResponse(bidResponses, ortbResponse, context);

  const pafTransmission = ortbResponse?.ext?.paf?.transmission;
  response.bids.forEach(bid => {
    if (typeof pafTransmission !== 'undefined' && typeof bid?.meta?.paf?.content_id !== 'undefined') {
      deepSetValue(bid, 'meta.paf.transmission', pafTransmission);
    } else {
      delete bid.meta.paf;
    }
  });

  return response;
}

/** @type {BidderSpec} */
export const spec = {
  code: BIDDER_CODE,
  gvlid: GVLID,
  supportedMediaTypes: [BANNER, VIDEO, NATIVE],

  getUserSyncs: function (syncOptions, _, gdprConsent, uspConsent, gppConsent = {}) {
    const { gppString = '', applicableSections = [] } = gppConsent;

    const refererInfo = getRefererInfo();
    const origin = 'criteoPrebidAdapter';

    if (syncOptions.iframeEnabled && hasPurpose1Consent(gdprConsent)) {
      const queryParams = [];
      queryParams.push(`origin=${origin}`);
      queryParams.push(`topUrl=${refererInfo.domain}`);
      if (gdprConsent) {
        if (gdprConsent.gdprApplies) {
          queryParams.push(`gdpr=${gdprConsent.gdprApplies === true ? 1 : 0}`);
        }
        if (gdprConsent.consentString) {
          queryParams.push(`gdpr_consent=${gdprConsent.consentString}`);
        }
      }
      if (uspConsent) {
        queryParams.push(`us_privacy=${uspConsent}`);
      }
      queryParams.push(`gpp=${gppString}`);
      if (Array.isArray(applicableSections)) {
        for (const applicableSection of applicableSections) {
          queryParams.push(`gpp_sid=${applicableSection}`);
        }
      }

      const requestId = Math.random().toString();

      const jsonHash = {
        bundle: readFromAllStorages(BUNDLE_COOKIE_NAME),
        cw: storage.cookiesAreEnabled(),
        lsw: storage.localStorageIsEnabled(),
        optoutCookie: readFromAllStorages(OPTOUT_COOKIE_NAME),
        origin: origin,
        requestId: requestId,
        tld: refererInfo.domain,
        topUrl: refererInfo.domain,
        version: '$prebid.version$'.replace(/\./g, '_'),
      };

      function handleGumMessage(event) {
        if (!event.data || event.origin !== 'https://gum.criteo.com') {
          return;
        }

        if (event.data.requestId !== requestId) {
          return;
        }

        window.removeEventListener('message', handleGumMessage, true);

        event.stopImmediatePropagation();

        const response = event.data;

        if (response.optout) {
          deleteFromAllStorages(BUNDLE_COOKIE_NAME);

          saveOnAllStorages(OPTOUT_COOKIE_NAME, true, OPTOUT_RETENTION_TIME_HOUR, refererInfo.domain);
        } else {
          if (response.bundle) {
            saveOnAllStorages(BUNDLE_COOKIE_NAME, response.bundle, GUID_RETENTION_TIME_HOUR, refererInfo.domain);
          }

          response?.callbacks?.forEach?.(triggerPixel);
        }
      }

      window.removeEventListener('message', handleGumMessage, true);
      window.addEventListener('message', handleGumMessage, true);

      const jsonHashSerialized = JSON.stringify(jsonHash).replace(/"/g, '%22');

      return [{
        type: 'iframe',
        url: `https://gum.criteo.com/syncframe?${queryParams.join('&')}#${jsonHashSerialized}`
      }];
    } else if (syncOptions.pixelEnabled && hasPurpose1Consent(gdprConsent)) {
      const queryParams = [];
      queryParams.push(`profile=207`);
      if (gdprConsent) {
        if (gdprConsent.gdprApplies === true) {
          queryParams.push(`gdprapplies=true`);
        }
        if (gdprConsent.consentString) {
          queryParams.push(`gdpr=${gdprConsent.consentString}`);
        }
      }
      if (uspConsent) {
        queryParams.push(`ccpa=${uspConsent}`);
      }
      queryParams.push(`gpp=${gppString}`);
      if (Array.isArray(applicableSections)) {
        for (const applicableSection of applicableSections) {
          queryParams.push(`gpp_sid=${applicableSection}`);
        }
      }
      // gpp
      // gpp_sid
      return [{
        type: 'image',
        url: `https://ssp-sync.criteo.com/user-sync/redirect?${queryParams.join('&')}`
      }];
    }
    return [];
  },

  /**
   * f
   * @param {object} bid
   * @return {boolean}
   */
  isBidRequestValid: (bid) => {
    // either one of zoneId or networkId should be set
    if (!(bid && bid.params && (bid.params.zoneId || bid.params.networkId))) {
      return false;
    }

    // video media types requires some mandatory params
    if (hasVideoMediaType(bid)) {
      if (!hasValidVideoMediaType(bid)) {
        return false;
      }
    }

    return true;
  },

  /**
   * @param {BidRequest[]} bidRequests
   * @param {*} bidderRequest
   * @return {ServerRequest}
   */
  buildRequests: (bidRequests, bidderRequest) => {
    bidRequests.forEach(bidRequest => {
      if (hasNativeMediaType(bidRequest)) {
        if (!checkNativeSendId(bidRequest)) {
          logWarn(LOG_PREFIX + 'all native assets containing URL should be sent as placeholders with sendId(icon, image, clickUrl, displayUrl, privacyLink, privacyIcon)');
        }

        // We support native request without assets requirements because we can fill them later on.
        // This is a trick to fool oRTB converter isOpenRTBBidRequestValid(ortb) fn because it needs
        // nativeOrtbRequest.assets to be non-empty.
        if (bidRequest?.nativeOrtbRequest?.assets == null) {
          logWarn(LOG_PREFIX + 'native asset requirements are missing');
          deepSetValue(bidRequest, 'nativeOrtbRequest.assets', [{}]);
        }
      }
    });

    const context = buildContext(bidRequests, bidderRequest);
    const url = buildCdbUrl(context);
    const data = CONVERTER.toORTB({bidderRequest, bidRequests, context});

    if (data) {
      return {
        method: 'POST',
        url,
        data,
        bidRequests,
        options: {
          endpointCompression: getGzipSetting()
        },
      };
    }
  },

  /**
   * @param {*} response
   * @param {ServerRequest} request
   * @return {Bid[] | {bids: Bid[], fledgeAuctionConfigs: object[]}}
   */
  interpretResponse: (response, request) => {
    if (typeof response?.body === 'undefined') {
      return []; // no bid
    }

    const interpretedResponse = CONVERTER.fromORTB({response: response.body, request: request.data});
    const bids = interpretedResponse.bids || [];

    const fledgeAuctionConfigs = response.body?.ext?.igi?.filter(igi => isArray(igi?.igs))
      .flatMap(igi => igi.igs);
    if (fledgeAuctionConfigs?.length) {
      return {
        bids,
        paapi: fledgeAuctionConfigs,
      };
    }

    return bids;
  },

  /**
   * @param {BidRequest[]} bidRequests
   */
  onDataDeletionRequest: (bidRequests) => {
    const id = readFromAllStorages(BUNDLE_COOKIE_NAME);
    if (id) {
      deleteFromAllStorages(BUNDLE_COOKIE_NAME);
      ajax('https://privacy.criteo.com/api/privacy/datadeletionrequest',
        null,
        JSON.stringify({ publisherUserId: id }),
        {
          contentType: 'application/json',
          method: 'POST'
        });
    }
  }
};

function getGzipSetting() {
  try {
    const gzipSetting = deepAccess(config.getBidderConfig(), 'criteo.gzipEnabled');

    if (gzipSetting !== undefined) {
      const gzipValue = String(gzipSetting).toLowerCase().trim();
      if (gzipValue === 'true' || gzipValue === 'false') {
        const parsedValue = gzipValue === 'true';
        logInfo('Criteo: Using bidder-specific gzipEnabled setting:', parsedValue);
        return parsedValue;
      }

      logWarn('Criteo: Invalid gzipEnabled value in bidder config:', gzipSetting);
    }
  } catch (e) {
    logWarn('Criteo: Error accessing bidder config:', e);
  }

  logInfo('Criteo: Using default gzipEnabled setting:', DEFAULT_GZIP_ENABLED);
  return DEFAULT_GZIP_ENABLED;
}

function readFromAllStorages(name) {
  const fromCookie = storage.getCookie(name);
  const fromLocalStorage = storage.getDataFromLocalStorage(name);

  return fromCookie || fromLocalStorage || undefined;
}

function saveOnAllStorages(name, value, expirationTimeHours, domain) {
  const date = new Date();
  date.setTime(date.getTime() + (expirationTimeHours * 60 * 60 * 1000));
  const expires = `expires=${date.toUTCString()}`;

  const subDomains = domain.split('.');
  for (let i = 0; i < subDomains.length; ++i) {
    // Try to write the cookie on this subdomain (we want it to be stored only on the TLD+1)
    const domain = subDomains.slice(subDomains.length - i - 1, subDomains.length).join('.');

    try {
      storage.setCookie(name, value, expires, null, '.' + domain);

      // Try to read the cookie to check if we wrote it
      const check = storage.getCookie(name);
      if (check && check === value) {
        break;
      }
    } catch (error) {

    }
  }

  storage.setDataInLocalStorage(name, value);
}

function deleteFromAllStorages(name) {
  storage.setCookie(name, '', 0);
  storage.removeDataFromLocalStorage(name);
}

/**
 * @param {BidRequest[]} bidRequests
 * @param bidderRequest
 */
function buildContext(bidRequests, bidderRequest) {
  const queryString = parseUrl(bidderRequest?.refererInfo?.topmostLocation).search;

  return {
    url: bidderRequest?.refererInfo?.page || '',
    debug: queryString['pbt_debug'] === '1',
    noLog: queryString['pbt_nolog'] === '1',
    fledgeEnabled: bidderRequest.paapi?.enabled,
    amp: bidRequests.some(bidRequest => bidRequest.params.integrationMode === 'amp'),
    networkId: bidRequests.find(bidRequest => bidRequest.params?.networkId)?.params.networkId,
    publisherId: bidRequests.find(bidRequest => bidRequest.params?.pubid)?.params.pubid,
  };
}

/**
 * @param {Object} context
 * @return {string}
 */
function buildCdbUrl(context) {
  let url = CDB_ENDPOINT;
  url += '?profileId=' + PROFILE_ID_INLINE;
  url += '&av=' + String(ADAPTER_VERSION);
  url += '&wv=' + encodeURIComponent('$prebid.version$');
  url += '&cb=' + String(Math.floor(Math.random() * 99999999999));

  if (storage.localStorageIsEnabled()) {
    url += '&lsavail=1';
  } else {
    url += '&lsavail=0';
  }

  if (context.amp) {
    url += '&im=1';
  }
  if (context.debug) {
    url += '&debug=1';
  }
  if (context.noLog) {
    url += '&nolog=1';
  }

  const bundle = readFromAllStorages(BUNDLE_COOKIE_NAME);
  if (bundle) {
    url += `&bundle=${bundle}`;
  }

  const optout = readFromAllStorages(OPTOUT_COOKIE_NAME);
  if (optout) {
    url += `&optout=1`;
  }

  if (context.networkId) {
    url += `&networkId=` + context.networkId;
  }

  return url;
}

function checkNativeSendId(bidRequest) {
  return !(bidRequest.nativeParams &&
    (
      (bidRequest.nativeParams.image && ((bidRequest.nativeParams.image.sendId !== true))) ||
      (bidRequest.nativeParams.icon && ((bidRequest.nativeParams.icon.sendId !== true))) ||
      (bidRequest.nativeParams.clickUrl && ((bidRequest.nativeParams.clickUrl.sendId !== true))) ||
      (bidRequest.nativeParams.displayUrl && ((bidRequest.nativeParams.displayUrl.sendId !== true))) ||
      (bidRequest.nativeParams.privacyLink && ((bidRequest.nativeParams.privacyLink.sendId !== true))) ||
      (bidRequest.nativeParams.privacyIcon && ((bidRequest.nativeParams.privacyIcon.sendId !== true)))
    ));
}

function parseSizes(sizes, parser = s => s) {
  if (!sizes) {
    return [];
  }
  if (Array.isArray(sizes[0])) { // is there several sizes ? (ie. [[728,90],[200,300]])
    return sizes.map(size => parser(size));
  }
  return [parser(sizes)]; // or a single one ? (ie. [728,90])
}

function parseSize(size) {
  return size[0] + 'x' + size[1];
}

function hasVideoMediaType(bidRequest) {
  return bidRequest?.mediaTypes?.video !== undefined;
}

function hasNativeMediaType(bidRequest) {
  return bidRequest?.mediaTypes?.native !== undefined;
}

function hasValidVideoMediaType(bidRequest) {
  let isValid = true;

  var requiredMediaTypesParams = ['mimes', 'playerSize', 'maxduration', 'protocols', 'api', 'skip', 'placement', 'playbackmethod'];

  requiredMediaTypesParams.forEach(function (param) {
    if (param === 'placement') {
      if (bidRequest?.mediaTypes?.video?.[param] === undefined && bidRequest?.params?.video?.[param] === undefined && bidRequest?.mediaTypes?.video?.plcmt === undefined && bidRequest?.params?.video?.plcmt === undefined) {
        isValid = false;
        logError('Criteo Bid Adapter: mediaTypes.video.' + param + ' or mediaTypes.video.plcmt is required');
      }
    } else {
      if (bidRequest?.mediaTypes?.video?.[param] === undefined && bidRequest?.params?.video?.[param] === undefined) {
        isValid = false;
        logError('Criteo Bid Adapter: mediaTypes.video.' + param + ' is required');
      }
    }
  });

  return isValid;
}

function pickAvailableGetFloorFunc(bidRequest) {
  if (bidRequest.getFloor) {
    return bidRequest.getFloor;
  }
  if (bidRequest.params.bidFloor && bidRequest.params.bidFloorCur) {
    try {
      const floor = parseFloat(bidRequest.params.bidFloor);
      return () => {
        return {
          currency: bidRequest.params.bidFloorCur,
          floor: floor
        };
      };
    } catch { }
  }
  return undefined;
}

function getFloors(bidRequest) {
  try {
    const floors = {};

    const getFloor = pickAvailableGetFloorFunc(bidRequest);

    if (getFloor) {
      if (bidRequest.mediaTypes?.banner) {
        floors.banner = {};
        const bannerSizes = parseSizes(bidRequest?.mediaTypes?.banner?.sizes)
        bannerSizes.forEach(bannerSize => {
          floors.banner[parseSize(bannerSize).toString()] = getFloor.call(bidRequest, { size: bannerSize, mediaType: BANNER });
        });
      }

      if (bidRequest.mediaTypes?.video) {
        floors.video = {};
        const videoSizes = parseSizes(bidRequest?.mediaTypes?.video?.playerSize)
        videoSizes.forEach(videoSize => {
          floors.video[parseSize(videoSize).toString()] = getFloor.call(bidRequest, { size: videoSize, mediaType: VIDEO });
        });
      }

      if (bidRequest.mediaTypes?.native) {
        floors.native = {};
        floors.native['*'] = getFloor.call(bidRequest, { size: '*', mediaType: NATIVE });
      }

      return floors;
    }
  } catch (e) {
    logError('Could not parse floors from Prebid: ' + e);
  }
}

function createOutstreamVideoRenderer(bid) {
  if (bid.ext?.videoPlayerConfig === undefined || bid.ext?.videoPlayerType === undefined) {
    return undefined;
  }

  const config = {
    documentResolver: (_, sourceDocument, renderDocument) => {
      return renderDocument ?? sourceDocument;
    }
  }

  const render = (_, renderDocument) => {
    const payload = {
      slotid: bid.id,
      vastUrl: bid.ext?.displayurl,
      vastXml: bid.adm,
      documentContext: renderDocument,
    };

    const outstreamConfig = bid.ext.videoPlayerConfig;
    window.CriteoOutStream[bid.ext.videoPlayerType].play(payload, outstreamConfig)
  };

  const renderer = Renderer.install({ url: PUBLISHER_TAG_OUTSTREAM_SRC, config: config });
  renderer.setRender(render);
  return renderer;
}

registerBidder(spec);
