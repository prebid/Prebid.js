import find from 'core-js-pure/features/array/find.js';
import * as utils from '../src/utils.js';
import {registerBidder} from '../src/adapters/bidderFactory.js';
import { loadExternalScript } from '../src/adloader.js'
import JSEncrypt from 'jsencrypt/bin/jsencrypt.js';
import sha256 from 'crypto-js/sha256.js';
import { getStorageManager } from '../src/storageManager.js';
import { getRefererInfo } from '../src/refererDetection.js';

export const BIDDER_CODE = 'adagio';
export const LOG_PREFIX = 'Adagio:';
export const VERSION = '2.3.0';
export const FEATURES_VERSION = '1';
export const ENDPOINT = 'https://mp.4dex.io/prebid';
export const SUPPORTED_MEDIA_TYPES = ['banner'];
export const ADAGIO_TAG_URL = 'https://script.4dex.io/localstore.js';
export const ADAGIO_LOCALSTORAGE_KEY = 'adagioScript';
export const GVLID = 617;
export const storage = getStorageManager(GVLID, 'adagio');

export const ADAGIO_PUBKEY = `-----BEGIN PUBLIC KEY-----
MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQC9el0+OEn6fvEh1RdVHQu4cnT0
jFSzIbGJJyg3cKqvtE6A0iaz9PkIdJIvSSSNrmJv+lRGKPEyRA/VnzJIieL39Ngl
t0b0lsHN+W4n9kitS/DZ/xnxWK/9vxhv0ZtL1LL/rwR5Mup7rmJbNtDoNBw4TIGj
pV6EP3MTLosuUEpLaQIDAQAB
-----END PUBLIC KEY-----`;

let currentWindow;

export function adagioScriptFromLocalStorageCb(ls) {
  try {
    if (!ls) {
      utils.logWarn(`${LOG_PREFIX} script not found.`);
      return;
    }

    const hashRgx = /^(\/\/ hash: (.+)\n)(.+\n)$/;

    if (!hashRgx.test(ls)) {
      utils.logWarn(`${LOG_PREFIX} no hash found.`);
      storage.removeDataFromLocalStorage(ADAGIO_LOCALSTORAGE_KEY);
    } else {
      const r = ls.match(hashRgx);
      const hash = r[2];
      const content = r[3];

      var jsEncrypt = new JSEncrypt();
      jsEncrypt.setPublicKey(ADAGIO_PUBKEY);

      if (jsEncrypt.verify(content, hash, sha256)) {
        utils.logInfo(`${LOG_PREFIX} start script.`);
        Function(ls)(); // eslint-disable-line no-new-func
      } else {
        utils.logWarn(`${LOG_PREFIX} invalid script found.`);
        storage.removeDataFromLocalStorage(ADAGIO_LOCALSTORAGE_KEY);
      }
    }
  } catch (err) {
    utils.logError(LOG_PREFIX, err);
  }
}

export function getAdagioScript() {
  storage.getDataFromLocalStorage(ADAGIO_LOCALSTORAGE_KEY, (ls) => {
    internal.adagioScriptFromLocalStorageCb(ls)
  });

  storage.localStorageIsEnabled(isValid => {
    if (isValid) {
      loadExternalScript(ADAGIO_TAG_URL, BIDDER_CODE);
    } else {
      // ensure adagio removing for next time.
      // It's an antipattern regarding the TCF2 enforcement logic
      // but it's the only way to respect the user choice update.
      window.localStorage.removeItem(ADAGIO_LOCALSTORAGE_KEY);
    }
  });
}

function canAccessTopWindow() {
  try {
    if (utils.getWindowTop().location.href) {
      return true;
    }
  } catch (error) {
    return false;
  }
}

function getCurrentWindow() {
  return currentWindow || utils.getWindowSelf();
}

function isSafeFrameWindow() {
  const ws = utils.getWindowSelf();
  return !!(ws.$sf && ws.$sf.ext);
}

function initAdagio() {
  if (canAccessTopWindow()) {
    currentWindow = (canAccessTopWindow()) ? utils.getWindowTop() : utils.getWindowSelf();
  }

  const w = internal.getCurrentWindow();

  w.ADAGIO = w.ADAGIO || {};
  w.ADAGIO.adUnits = w.ADAGIO.adUnits || {};
  w.ADAGIO.pbjsAdUnits = w.ADAGIO.pbjsAdUnits || [];
  w.ADAGIO.queue = w.ADAGIO.queue || [];
  w.ADAGIO.versions = w.ADAGIO.versions || {};
  w.ADAGIO.versions.adagioBidderAdapter = VERSION;
  w.ADAGIO.isSafeFrameWindow = isSafeFrameWindow();

  getAdagioScript();
}

export const _features = {
  getPrintNumber(adUnitCode) {
    const adagioAdUnit = internal.getOrAddAdagioAdUnit(adUnitCode);
    return adagioAdUnit.printNumber || 1;
  },

  getPageDimensions() {
    if (isSafeFrameWindow() || !canAccessTopWindow()) {
      return '';
    }

    // the page dimension can be computed on window.top only.
    const wt = utils.getWindowTop();
    const body = wt.document.querySelector('body');

    if (!body) {
      return '';
    }
    const html = wt.document.documentElement;
    const pageWidth = Math.max(body.scrollWidth, body.offsetWidth, html.clientWidth, html.scrollWidth, html.offsetWidth);
    const pageHeight = Math.max(body.scrollHeight, body.offsetHeight, html.clientHeight, html.scrollHeight, html.offsetHeight);

    return `${pageWidth}x${pageHeight}`;
  },

  getViewPortDimensions() {
    if (!isSafeFrameWindow() && !canAccessTopWindow()) {
      return '';
    }

    const viewportDims = { w: 0, h: 0 };

    if (isSafeFrameWindow()) {
      const ws = utils.getWindowSelf();

      if (typeof ws.$sf.ext.geom !== 'function') {
        utils.logWarn(`${LOG_PREFIX} cannot use the $sf.ext.geom() safeFrame API method`);
        return '';
      }

      const sfGeom = ws.$sf.ext.geom().win;
      viewportDims.w = Math.round(sfGeom.w);
      viewportDims.h = Math.round(sfGeom.h);
    } else {
      // window.top based computing
      const wt = utils.getWindowTop();

      if (wt.innerWidth) {
        viewportDims.w = wt.innerWidth;
        viewportDims.h = wt.innerHeight;
      } else {
        const d = wt.document;
        const body = d.querySelector('body');

        if (!body) {
          return '';
        }

        viewportDims.w = d.querySelector('body').clientWidth;
        viewportDims.h = d.querySelector('body').clientHeight;
      }
    }

    return `${viewportDims.w}x${viewportDims.h}`;
  },

  /**
   * domLoading feature is computed on window.top if reachable.
   */
  getDomLoadingDuration() {
    let domLoadingDuration = -1;
    let performance;

    performance = (canAccessTopWindow()) ? utils.getWindowTop().performance : utils.getWindowSelf().performance;

    if (performance && performance.timing && performance.timing.navigationStart > 0) {
      const val = performance.timing.domLoading - performance.timing.navigationStart;
      if (val > 0) {
        domLoadingDuration = val;
      }
    }

    return domLoadingDuration;
  },

  getSlotPosition(params) {
    const { adUnitElementId, postBid } = params;

    if (!adUnitElementId) {
      return '';
    }

    if (!isSafeFrameWindow() && !canAccessTopWindow()) {
      return '';
    }

    const position = { x: 0, y: 0 };

    if (isSafeFrameWindow()) {
      const ws = utils.getWindowSelf();

      if (typeof ws.$sf.ext.geom !== 'function') {
        utils.logWarn(`${LOG_PREFIX} cannot use the $sf.ext.geom() safeFrame API method`);
        return '';
      }

      const sfGeom = ws.$sf.ext.geom().self;
      position.x = Math.round(sfGeom.t);
      position.y = Math.round(sfGeom.l);
    } else if (canAccessTopWindow()) {
      // window.top based computing
      const wt = utils.getWindowTop();
      const d = wt.document;

      let domElement;

      if (postBid === true) {
        const ws = utils.getWindowSelf();
        const currentElement = ws.document.getElementById(adUnitElementId);
        domElement = internal.getElementFromTopWindow(currentElement, ws);
      } else {
        domElement = wt.document.getElementById(adUnitElementId);
      }

      if (!domElement) {
        return '';
      }

      let box = domElement.getBoundingClientRect();

      const docEl = d.documentElement;
      const body = d.body;
      const clientTop = d.clientTop || body.clientTop || 0;
      const clientLeft = d.clientLeft || body.clientLeft || 0;
      const scrollTop = wt.pageYOffset || docEl.scrollTop || body.scrollTop;
      const scrollLeft = wt.pageXOffset || docEl.scrollLeft || body.scrollLeft;

      const elComputedStyle = wt.getComputedStyle(domElement, null);
      const elComputedDisplay = elComputedStyle.display || 'block';
      const mustDisplayElement = elComputedDisplay === 'none';

      if (mustDisplayElement) {
        domElement.style = domElement.style || {};
        domElement.style.display = 'block';
        box = domElement.getBoundingClientRect();
        domElement.style.display = elComputedDisplay;
      }
      position.x = Math.round(box.left + scrollLeft - clientLeft);
      position.y = Math.round(box.top + scrollTop - clientTop);
    } else {
      return '';
    }

    return `${position.x}x${position.y}`;
  },

  getTimestampUTC() {
    // timestamp returned in seconds
    return Math.floor(new Date().getTime() / 1000) - new Date().getTimezoneOffset() * 60;
  },

  getDevice() {
    const ws = utils.getWindowSelf();
    const ua = ws.navigator.userAgent;

    if ((/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i).test(ua)) {
      return 5; // "tablet"
    }
    if ((/Mobile|iP(hone|od|ad)|Android|BlackBerry|IEMobile|Kindle|NetFront|Silk-Accelerated|(hpw|web)OS|Fennec|Minimo|Opera M(obi|ini)|Blazer|Dolfin|Dolphin|Skyfire|Zune/).test(ua)) {
      return 4; // "phone"
    }
    return 2; // personal computers
  },

  getBrowser() {
    const ws = utils.getWindowSelf();
    const ua = ws.navigator.userAgent;
    const uaLowerCase = ua.toLowerCase();
    return /Edge\/\d./i.test(ua) ? 'edge' : uaLowerCase.indexOf('chrome') > 0 ? 'chrome' : uaLowerCase.indexOf('firefox') > 0 ? 'firefox' : uaLowerCase.indexOf('safari') > 0 ? 'safari' : uaLowerCase.indexOf('opera') > 0 ? 'opera' : uaLowerCase.indexOf('msie') > 0 || ws.MSStream ? 'ie' : 'unknow';
  },

  getOS() {
    const ws = utils.getWindowSelf();
    const ua = ws.navigator.userAgent;
    const uaLowerCase = ua.toLowerCase();
    return uaLowerCase.indexOf('linux') > 0 ? 'linux' : uaLowerCase.indexOf('mac') > 0 ? 'mac' : uaLowerCase.indexOf('win') > 0 ? 'windows' : '';
  },

  getUrl(refererInfo) {
    // top has not been reached, it means we are not sure
    // to get the proper page url.
    if (!refererInfo.reachedTop) {
      return;
    }
    return refererInfo.referer;
  },

  getUrlFromParams(params) {
    const { postBidOptions } = params;
    if (postBidOptions && postBidOptions.url) {
      return postBidOptions.url;
    }
  }
};

function enqueue(ob) {
  const w = internal.getCurrentWindow();

  w.ADAGIO = w.ADAGIO || {};
  w.ADAGIO.queue = w.ADAGIO.queue || [];
  w.ADAGIO.queue.push(ob);
};

function getOrAddAdagioAdUnit(adUnitCode) {
  const w = internal.getCurrentWindow();

  w.ADAGIO = w.ADAGIO || {};

  if (w.ADAGIO.adUnits[adUnitCode]) {
    return w.ADAGIO.adUnits[adUnitCode]
  }

  return w.ADAGIO.adUnits[adUnitCode] = {};
};

function getPageviewId() {
  const w = internal.getCurrentWindow();

  w.ADAGIO = w.ADAGIO || {};
  w.ADAGIO.pageviewId = w.ADAGIO.pageviewId || utils.generateUUID();

  return w.ADAGIO.pageviewId;
};

function computePrintNumber(adUnitCode) {
  let printNumber = 1;
  const w = internal.getCurrentWindow();

  if (
    w.ADAGIO &&
    w.ADAGIO.adUnits && w.ADAGIO.adUnits[adUnitCode] &&
    w.ADAGIO.adUnits[adUnitCode].pageviewId === internal.getPageviewId() &&
    w.ADAGIO.adUnits[adUnitCode].printNumber
  ) {
    printNumber = parseInt(w.ADAGIO.adUnits[adUnitCode].printNumber, 10) + 1;
  }

  return printNumber;
};

function getDevice() {
  const language = navigator.language ? 'language' : 'userLanguage';
  return {
    userAgent: navigator.userAgent,
    language: navigator[language],
    deviceType: _features.getDevice(),
    dnt: utils.getDNT() ? 1 : 0,
    geo: {},
    js: 1
  };
};

function getSite(bidderRequest) {
  let domain = '';
  let page = '';
  let referrer = '';

  const { refererInfo } = bidderRequest;

  if (canAccessTopWindow()) {
    const wt = utils.getWindowTop();
    domain = wt.location.hostname;
    page = wt.location.href;
    referrer = wt.document.referrer || '';
  } else if (refererInfo.reachedTop) {
    const url = utils.parseUrl(refererInfo.referer);
    domain = url.hostname;
    page = refererInfo.referer;
  } else if (refererInfo.stack && refererInfo.stack.length && refererInfo.stack[0]) {
    // important note check if refererInfo.stack[0] is 'thruly' because a `null` value
    // will be considered as "localhost" by the parseUrl function.
    // As the isBidRequestValid returns false when it does not reach the referer
    // this should never called.
    const url = utils.parseUrl(refererInfo.stack[0]);
    domain = url.hostname;
  }

  return {
    domain,
    page,
    referrer
  };
};

function getElementFromTopWindow(element, currentWindow) {
  try {
    if (utils.getWindowTop() === currentWindow) {
      if (!element.getAttribute('id')) {
        element.setAttribute('id', `adg-${utils.getUniqueIdentifierStr()}`);
      }
      return element;
    } else {
      const frame = currentWindow.frameElement;
      const frameClientRect = frame.getBoundingClientRect();
      const elementClientRect = element.getBoundingClientRect();

      if (frameClientRect.width !== elementClientRect.width || frameClientRect.height !== elementClientRect.height) {
        return false;
      }

      return getElementFromTopWindow(frame, currentWindow.parent);
    }
  } catch (err) {
    utils.logWarn(`${LOG_PREFIX}`, err);
    return false;
  }
};

function autoDetectAdUnitElementId(adUnitCode) {
  const autoDetectedAdUnit = utils.getGptSlotInfoForAdUnitCode(adUnitCode)
  let adUnitElementId = null;

  if (autoDetectedAdUnit && autoDetectedAdUnit.divId) {
    adUnitElementId = autoDetectedAdUnit.divId;
  }

  return adUnitElementId;
};

function autoDetectEnvironment() {
  const device = _features.getDevice();
  let environment;
  switch (device) {
    case 2:
      environment = 'desktop'
      break;
    case 4:
      environment = 'mobile'
      break;
    case 5:
      environment = 'tablet'
      break;
  };
  return environment
};

function getFeatures(bidRequest, bidderRequest) {
  const { adUnitCode, params } = bidRequest;
  const { adUnitElementId } = params;
  const { refererInfo } = bidderRequest;

  if (!adUnitElementId) {
    utils.logWarn(`${LOG_PREFIX} unable to get params.adUnitElementId. Continue without tiv.`);
  }

  const features = {
    print_number: _features.getPrintNumber(adUnitCode).toString(),
    page_dimensions: _features.getPageDimensions().toString(),
    viewport_dimensions: _features.getViewPortDimensions().toString(),
    dom_loading: _features.getDomLoadingDuration().toString(),
    // layout: features.getLayout().toString(),
    adunit_position: _features.getSlotPosition(params).toString(),
    user_timestamp: _features.getTimestampUTC().toString(),
    device: _features.getDevice().toString(),
    url: _features.getUrl(refererInfo) || _features.getUrlFromParams(params) || '',
    browser: _features.getBrowser(),
    os: _features.getOS()
  };

  Object.keys(features).forEach((prop) => {
    if (features[prop] === '') {
      delete features[prop];
    }
  });

  const adUnitFeature = {};

  adUnitFeature[adUnitElementId] = {
    features: features,
    version: FEATURES_VERSION
  };

  internal.enqueue({
    action: 'features',
    ts: Date.now(),
    data: adUnitFeature
  });

  return features;
};

export const internal = {
  enqueue,
  getOrAddAdagioAdUnit,
  getPageviewId,
  computePrintNumber,
  getDevice,
  getSite,
  getElementFromTopWindow,
  autoDetectAdUnitElementId,
  autoDetectEnvironment,
  getFeatures,
  getRefererInfo,
  adagioScriptFromLocalStorageCb,
  getCurrentWindow,
  canAccessTopWindow
};

function _getGdprConsent(bidderRequest) {
  if (!utils.deepAccess(bidderRequest, 'gdprConsent')) {
    return false;
  }

  const {
    apiVersion,
    gdprApplies,
    consentString,
    allowAuctionWithoutConsent
  } = bidderRequest.gdprConsent;

  const consent = {};

  if (apiVersion !== undefined) {
    consent.apiVersion = apiVersion
  }

  if (consentString !== undefined) {
    consent.consentString = consentString;
  }

  if (gdprApplies !== undefined) {
    consent.consentRequired = (gdprApplies) ? 1 : 0;
  }

  if (allowAuctionWithoutConsent !== undefined) {
    consent.allowAuctionWithoutConsent = allowAuctionWithoutConsent ? 1 : 0;
  }

  return consent;
}

function _getSchain(bidRequest) {
  if (utils.deepAccess(bidRequest, 'schain')) {
    return bidRequest.schain;
  }
}

export const spec = {
  code: BIDDER_CODE,
  gvlid: GVLID,
  supportedMediaTypes: SUPPORTED_MEDIA_TYPES,

  isBidRequestValid(bid) {
    const { adUnitCode, auctionId, sizes, bidder, params, mediaTypes } = bid;
    if (!params) {
      utils.logWarn(`${LOG_PREFIX} the "params" property is missing.`);
      return false;
    }

    const { organizationId, site, placement } = params;
    const adUnitElementId = params.adUnitElementId || internal.autoDetectAdUnitElementId(adUnitCode);
    const environment = params.environment || internal.autoDetectEnvironment();

    // insure auto-detected params are kept in `bid` object.
    bid.params = {
      ...params,
      adUnitElementId,
      environment
    }

    const debugData = () => ({
      action: 'pb-dbg',
      ts: Date.now(),
      data: {
        bid
      }
    });

    const refererInfo = internal.getRefererInfo();

    if (!refererInfo.reachedTop) {
      utils.logWarn(`${LOG_PREFIX} the main page url is unreachabled.`);
      internal.enqueue(debugData());

      return false;
    } else if (!(organizationId && site && placement)) {
      utils.logWarn(`${LOG_PREFIX} at least one required param is missing.`);
      internal.enqueue(debugData());

      return false;
    }

    const w = internal.getCurrentWindow();
    const pageviewId = internal.getPageviewId();
    const printNumber = internal.computePrintNumber(adUnitCode);

    // Store adUnits config.
    // If an adUnitCode has already been stored, it will be replaced.
    w.ADAGIO = w.ADAGIO || {};
    w.ADAGIO.pbjsAdUnits = w.ADAGIO.pbjsAdUnits.filter((adUnit) => adUnit.code !== adUnitCode)
    w.ADAGIO.pbjsAdUnits.push({
      code: adUnitCode,
      mediaTypes: mediaTypes || {},
      sizes: (mediaTypes && mediaTypes.banner && Array.isArray(mediaTypes.banner.sizes)) ? mediaTypes.banner.sizes : sizes,
      bids: [{
        bidder,
        params: bid.params // use the updated bid.params object with auto-detected params
      }],
      auctionId,
      pageviewId,
      printNumber
    });

    // (legacy) Store internal adUnit information
    w.ADAGIO.adUnits[adUnitCode] = {
      auctionId,
      pageviewId,
      printNumber,
    };

    return true;
  },

  buildRequests(validBidRequests, bidderRequest) {
    const secure = (location.protocol === 'https:') ? 1 : 0;
    const device = internal.getDevice();
    const site = internal.getSite(bidderRequest);
    const pageviewId = internal.getPageviewId();
    const gdprConsent = _getGdprConsent(bidderRequest) || {};
    const schain = _getSchain(validBidRequests[0]);
    const adUnits = utils._map(validBidRequests, (bidRequest) => {
      bidRequest.features = internal.getFeatures(bidRequest, bidderRequest);
      return bidRequest;
    });

    // Group ad units by organizationId
    const groupedAdUnits = adUnits.reduce((groupedAdUnits, adUnit) => {
      adUnit.params.organizationId = adUnit.params.organizationId.toString();

      groupedAdUnits[adUnit.params.organizationId] = groupedAdUnits[adUnit.params.organizationId] || []
      groupedAdUnits[adUnit.params.organizationId].push(adUnit);

      return groupedAdUnits;
    }, {});

    // Build one request per organizationId
    const requests = utils._map(Object.keys(groupedAdUnits), organizationId => {
      return {
        method: 'POST',
        url: ENDPOINT,
        data: {
          id: utils.generateUUID(),
          organizationId: organizationId,
          secure: secure,
          device: device,
          site: site,
          pageviewId: pageviewId,
          adUnits: groupedAdUnits[organizationId],
          gdpr: gdprConsent,
          schain: schain,
          prebidVersion: '$prebid.version$',
          adapterVersion: VERSION,
          featuresVersion: FEATURES_VERSION
        },
        options: {
          contentType: 'text/plain'
        }
      }
    });

    return requests;
  },

  interpretResponse(serverResponse, bidRequest) {
    let bidResponses = [];
    try {
      const response = serverResponse.body;
      if (response) {
        if (response.data) {
          internal.enqueue({
            action: 'ssp-data',
            ts: Date.now(),
            data: response.data
          });
        }
        if (response.bids) {
          response.bids.forEach(bidObj => {
            const bidReq = (find(bidRequest.data.adUnits, bid => bid.bidId === bidObj.requestId));
            if (bidReq) {
              bidObj.site = bidReq.params.site;
              bidObj.placement = bidReq.params.placement;
              bidObj.pagetype = bidReq.params.pagetype;
              bidObj.category = bidReq.params.category;
              bidObj.subcategory = bidReq.params.subcategory;
              bidObj.environment = bidReq.params.environment;
            }
            bidResponses.push(bidObj);
          });
        }
      }
    } catch (err) {
      utils.logError(err);
    }
    return bidResponses;
  },

  getUserSyncs(syncOptions, serverResponses) {
    if (!serverResponses.length || serverResponses[0].body === '' || !serverResponses[0].body.userSyncs) {
      return false;
    }

    const syncs = serverResponses[0].body.userSyncs.map(sync => ({
      type: sync.t === 'p' ? 'image' : 'iframe',
      url: sync.u
    }));

    return syncs;
  },
};

initAdagio();

registerBidder(spec);
