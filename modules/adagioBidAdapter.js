import find from 'core-js-pure/features/array/find.js';
import * as utils from '../src/utils.js';
import {registerBidder} from '../src/adapters/bidderFactory.js';
import { loadExternalScript } from '../src/adloader.js'
import JSEncrypt from 'jsencrypt/bin/jsencrypt.js';
import sha256 from 'crypto-js/sha256.js';
import { getStorageManager } from '../src/storageManager.js';
import { getRefererInfo } from '../src/refererDetection.js';

const BIDDER_CODE = 'adagio';
const LOG_PREFIX = 'Adagio:';
const VERSION = '2.3.0';
const FEATURES_VERSION = '1';
const ENDPOINT = 'https://mp.4dex.io/prebid';
const SUPPORTED_MEDIA_TYPES = ['banner'];
const ADAGIO_TAG_URL = 'https://script.4dex.io/localstore.js';
const ADAGIO_LOCALSTORAGE_KEY = 'adagioScript';
const GVLID = 617;
const storage = getStorageManager(GVLID, 'adagio');

export const ADAGIO_PUBKEY = `-----BEGIN PUBLIC KEY-----
MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQC9el0+OEn6fvEh1RdVHQu4cnT0
jFSzIbGJJyg3cKqvtE6A0iaz9PkIdJIvSSSNrmJv+lRGKPEyRA/VnzJIieL39Ngl
t0b0lsHN+W4n9kitS/DZ/xnxWK/9vxhv0ZtL1LL/rwR5Mup7rmJbNtDoNBw4TIGj
pV6EP3MTLosuUEpLaQIDAQAB
-----END PUBLIC KEY-----`;

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
    adagioScriptFromLocalStorageCb(ls)
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

export function isSafeFrameWindow() {
  const w = utils.getWindowSelf();
  return !!(w.$sf && w.$sf.ext);
}

function initAdagio() {
  const w = utils.getWindowSelf();

  w.ADAGIO = w.ADAGIO || {};
  w.ADAGIO.queue = w.ADAGIO.queue || [];
  w.ADAGIO.versions = w.ADAGIO.versions || {};
  w.ADAGIO.versions.adagioBidderAdapter = VERSION;

  getAdagioScript();

  loadExternalScript(ADAGIO_TAG_URL, BIDDER_CODE);
}

export const _features = {
  getPrintNumber(adUnitCode) {
    const adagioAdUnit = _getOrAddAdagioAdUnit(adUnitCode);
    return adagioAdUnit.printNumber || 1;
  },

  getPageDimensions() {
    if (isSafeFrameWindow() || !canAccessTopWindow()) {
      return '';
    }

    // the page dimension can be properly computed when window.top
    // is accessible.
    const w = utils.getWindowTop();
    const viewportDims = _features.getViewPortDimensions().split('x');
    const body = w.document.querySelector('body');

    if (!body) {
      return '';
    }

    const pageDims = { w: 0, h: 0 };
    const html = w.document.documentElement;
    const pageHeight = Math.max(body.scrollHeight, body.offsetHeight, html.clientHeight, html.scrollHeight, html.offsetHeight);

    pageDims.w = viewportDims[0];
    pageDims.h = pageHeight;

    return `${pageDims.w}x${pageDims.h}`;
  },

  getViewPortDimensions() {
    if (!isSafeFrameWindow() && !canAccessTopWindow()) {
      return '';
    }

    const viewportDims = { w: 0, h: 0 };

    if (isSafeFrameWindow()) {
      const w = utils.getWindowSelf();

      if (typeof w.$sf.ext.geom !== 'function') {
        utils.logWarn(`${LOG_PREFIX} cannot use the $sf.ext.geom() safeFrame API method`);
        return '';
      }

      const sfGeom = w.$sf.ext.geom().win;
      viewportDims.w = Math.round(sfGeom.w);
      viewportDims.h = Math.round(sfGeom.h);
    } else {
      // window.top based computing
      const w = utils.getWindowTop();
      const d = w.document;
      const body = d.querySelector('body');

      if (!body) {
        return '';
      }

      if (w.innerWidth) {
        viewportDims.w = w.innerWidth;
        viewportDims.h = w.innerHeight;
      } else {
        viewportDims.w = d.querySelector('body').clientWidth;
        viewportDims.h = d.querySelector('body').clientHeight;
      }
    }

    return `${viewportDims.w}x${viewportDims.h}`;
  },

  /**
   * domLoading feature is computed on window.top if reachable.
   */
  domLoading() {
    let domLoading = -1;
    let performance;

    performance = (canAccessTopWindow()) ? utils.getWindowTop().performance : utils.getWindowSelf().performance;

    if (performance && performance.timing && performance.timing.navigationStart > 0) {
      const val = performance.timing.domLoading - performance.timing.navigationStart;
      if (val > 0) {
        domLoading = val;
      }
    }

    return domLoading;
  },

  getSlotPosition(adUnitElementId, postBid) {
    if (!adUnitElementId || (!isSafeFrameWindow() && !canAccessTopWindow())) {
      return '';
    }

    const position = { x: 0, y: 0 };

    if (isSafeFrameWindow()) {
      const w = utils.getWindowSelf();

      if (typeof w.$sf.ext.geom !== 'function') {
        // console.log('coool');
        utils.logWarn(`${LOG_PREFIX} cannot use the $sf.ext.geom() safeFrame API method`);
        return '';
      }

      const sfGeom = w.$sf.ext.geom().self;
      position.x = Math.round(sfGeom.t);
      position.y = Math.round(sfGeom.l);
    } else {
      // window.top based computing
      const w = utils.getWindowTop();
      const d = w.document;

      let domElement;

      if (postBid === true) {
        window.document.getElementById(adUnitElementId);
        domElement = _getElementFromTopWindow(domElement, window);
      } else {
        domElement = window.top.document.getElementById(adUnitElementId);
      }

      if (!domElement) {
        return '';
      }

      let box = domElement.getBoundingClientRect();

      const docEl = d.documentElement;
      const body = d.body;
      const clientTop = d.clientTop || body.clientTop || 0;
      const clientLeft = d.clientLeft || body.clientLeft || 0;
      const scrollTop = w.pageYOffset || docEl.scrollTop || body.scrollTop;
      const scrollLeft = w.pageXOffset || docEl.scrollLeft || body.scrollLeft;

      const elComputedStyle = w.getComputedStyle(domElement, null);
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
    }

    return `${position.x}x${position.y}`;
  },

  getTimestamp() {
    return Math.floor(new Date().getTime() / 1000) - new Date().getTimezoneOffset() * 60;
  },

  getDevice() {
    const w = utils.getWindowSelf();
    const ua = w.navigator.userAgent;

    if ((/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i).test(ua)) {
      return 5; // "tablet"
    }
    if ((/Mobile|iP(hone|od|ad)|Android|BlackBerry|IEMobile|Kindle|NetFront|Silk-Accelerated|(hpw|web)OS|Fennec|Minimo|Opera M(obi|ini)|Blazer|Dolfin|Dolphin|Skyfire|Zune/).test(ua)) {
      return 4; // "phone"
    }
    return 2; // personal computers
  },

  getBrowser() {
    const w = utils.getWindowSelf();
    const ua = w.navigator.userAgent;
    const uaLowerCase = ua.toLowerCase();
    return /Edge\/\d./i.test(ua) ? 'edge' : uaLowerCase.indexOf('chrome') > 0 ? 'chrome' : uaLowerCase.indexOf('firefox') > 0 ? 'firefox' : uaLowerCase.indexOf('safari') > 0 ? 'safari' : uaLowerCase.indexOf('opera') > 0 ? 'opera' : uaLowerCase.indexOf('msie') > 0 || w.MSStream ? 'ie' : 'unknow';
  },

  getOS() {
    const w = utils.getWindowSelf();
    const ua = w.navigator.userAgent;
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

  getUrlFromParams(bidRequest) {
    const { postBidOptions } = bidRequest.params;
    if (postBidOptions && postBidOptions.url) {
      return postBidOptions.url;
    }
  }
}

function _pushInAdagioQueue(ob) {
  try {
    const w = utils.getWindowSelf();
    w.ADAGIO.queue = w.ADAGIO.queue || [];
    w.ADAGIO.queue.push(ob);
  } catch (e) {}
};

function _getOrAddAdagioAdUnit(adUnitCode) {
  const w = utils.getWindowSelf();
  if (w.ADAGIO.adUnits[adUnitCode]) {
    return w.ADAGIO.adUnits[adUnitCode]
  }
  return w.ADAGIO.adUnits[adUnitCode] = {};
}

function _computePrintNumber(adUnitCode) {
  let printNumber = 1;
  const w = utils.getWindowSelf();
  if (
    w.ADAGIO &&
    w.ADAGIO.adUnits && w.ADAGIO.adUnits[adUnitCode] &&
    w.ADAGIO.adUnits[adUnitCode].pageviewId === _getPageviewId() &&
    w.ADAGIO.adUnits[adUnitCode].printNumber
  ) {
    printNumber = parseInt(w.ADAGIO.adUnits[adUnitCode].printNumber, 10) + 1;
  }
  return printNumber;
}

function _getDevice() {
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

function _getSite(bidderRequest) {
  let domain = '';
  let page = '';
  let referrer = '';

  const { refererInfo } = bidderRequest;

  if (canAccessTopWindow()) {
    const w = utils.getWindowTop();
    domain = w.location.hostname;
    page = w.location.href;
    referrer = w.document.referrer || '';
  } else if (refererInfo.reachedTop) {
    const url = utils.parseUrl(refererInfo.referer);
    domain = url.hostname;
    page = refererInfo.referer;
  } else if (refererInfo.stack && refererInfo.stack.length && refererInfo.stack[0]) {
    // important note check if refererInfo.stack[0] is 'thruly' cause a `null` value
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

function _getPageviewId() {
  const w = utils.getWindowSelf();
  w.ADAGIO.pageviewId = w.ADAGIO.pageviewId || utils.generateUUID();
  return w.ADAGIO.pageviewId;
};

function _getElementFromTopWindow(element, currentWindow) {
  try {
    if (utils.getWindowTop() === currentWindow) {
      if (!element.getAttribute('id')) {
        element.setAttribute('id', `adg-${utils.getUniqueIdentifierStr()}`);
      }
      return element;
    } else {
      const frame = currentWindow.frameElement;
      return _getElementFromTopWindow(frame, currentWindow.parent);
    }
  } catch (err) {
    utils.logWarn(err);
  }
}

export function _autoDetectAdUnitElementId(adUnitCode) {
  const autoDetectedAdUnit = utils.getGptSlotInfoForAdUnitCode(adUnitCode)
  let adUnitElementId = null;

  if (autoDetectedAdUnit && autoDetectedAdUnit.divId) {
    adUnitElementId = autoDetectedAdUnit.divId;
  }

  return adUnitElementId;
}

function _autoDetectEnvironment() {
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
}

/**
 * Returns all features for a specific adUnit element
 *
 * @param {Object} bidRequest
 * @returns {Object} features for an element (see specs)
 */
function _getFeatures(bidRequest, bidderRequest) {
  const { adUnitElementId } = bidRequest.params;
  const { refererInfo } = bidderRequest;

  if (!adUnitElementId) {
    utils.logWarn(`${LOG_PREFIX} unable to get params.adUnitElementId. Continue without tiv.`);
  }

  const features = {
    print_number: _features.getPrintNumber(bidRequest.adUnitCode).toString(),
    page_dimensions: _features.getPageDimensions().toString(),
    viewport_dimensions: _features.getViewPortDimensions().toString(),
    dom_loading: _features.domLoading().toString(),
    // layout: features.getLayout().toString(),
    adunit_position: _features.getSlotPosition(adUnitElementId, bidRequest.params.postBid).toString(),
    user_timestamp: _features.getTimestamp().toString(),
    device: _features.getDevice().toString(),
    url: _features.getUrl(refererInfo) || _features.getUrlFromParams(bidRequest) || '',
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

  _pushInAdagioQueue({
    action: 'features',
    ts: Date.now(),
    data: adUnitFeature
  });

  return features;
};

function _getGdprConsent(bidderRequest) {
  const consent = {};
  if (utils.deepAccess(bidderRequest, 'gdprConsent')) {
    if (bidderRequest.gdprConsent.consentString !== undefined) {
      consent.consentString = bidderRequest.gdprConsent.consentString;
    }
    if (bidderRequest.gdprConsent.gdprApplies !== undefined) {
      consent.consentRequired = bidderRequest.gdprConsent.gdprApplies ? 1 : 0;
    }
    if (bidderRequest.gdprConsent.allowAuctionWithoutConsent !== undefined) {
      consent.allowAuctionWithoutConsent = bidderRequest.gdprConsent.allowAuctionWithoutConsent ? 1 : 0;
    }
    if (bidderRequest.gdprConsent.apiVersion !== undefined) {
      consent.apiVersion = bidderRequest.gdprConsent.apiVersion;
    }
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
  supportedMediaType: SUPPORTED_MEDIA_TYPES,

  isBidRequestValid(bid) {
    const { adUnitCode, auctionId, sizes, bidder, params, mediaTypes } = bid;
    const { organizationId, site, placement } = bid.params;
    const adUnitElementId = bid.params.adUnitElementId || _autoDetectAdUnitElementId(adUnitCode);
    const environment = bid.params.environment || _autoDetectEnvironment();
    let isValid = false;

    const refererInfo = getRefererInfo();

    if (!refererInfo.reachedTop) {
      utils.logWarn(`${LOG_PREFIX} the main page url is unreachabled.`)
      return isValid;
    }

    try {
      const w = utils.getWindowSelf();
      w.ADAGIO = w.ADAGIO || {};
      w.ADAGIO.adUnits = w.ADAGIO.adUnits || {};
      w.ADAGIO.pbjsAdUnits = w.ADAGIO.pbjsAdUnits || [];
      isValid = !!(organizationId && site && placement);

      const tempAdUnits = w.ADAGIO.pbjsAdUnits.filter((adUnit) => adUnit.code !== adUnitCode);

      bid.params = {
        ...bid.params,
        adUnitElementId,
        environment
      }

      tempAdUnits.push({
        code: adUnitCode,
        sizes: (mediaTypes && mediaTypes.banner && Array.isArray(mediaTypes.banner.sizes)) ? mediaTypes.banner.sizes : sizes,
        bids: [{
          bidder,
          params
        }]
      });
      w.ADAGIO.pbjsAdUnits = tempAdUnits;

      if (isValid === true) {
        let printNumber = _computePrintNumber(adUnitCode);
        w.ADAGIO.adUnits[adUnitCode] = {
          auctionId: auctionId,
          pageviewId: _getPageviewId(),
          printNumber
        };
      }
    } catch (e) {
      return isValid;
    }
    return isValid;
  },

  buildRequests(validBidRequests, bidderRequest) {
    const secure = (location.protocol === 'https:') ? 1 : 0;
    const device = _getDevice();
    const site = _getSite(bidderRequest);
    const pageviewId = _getPageviewId();
    const gdprConsent = _getGdprConsent(bidderRequest);
    const schain = _getSchain(validBidRequests[0]);
    const adUnits = utils._map(validBidRequests, (bidRequest) => {
      bidRequest.features = _getFeatures(bidRequest, bidderRequest);
      return bidRequest;
    });

    // Regroug ad units by siteId
    const groupedAdUnits = adUnits.reduce((groupedAdUnits, adUnit) => {
      if (adUnit.params && adUnit.params.organizationId) {
        adUnit.params.organizationId = adUnit.params.organizationId.toString();
      }

      groupedAdUnits[adUnit.params.organizationId] = groupedAdUnits[adUnit.params.organizationId] || []
      groupedAdUnits[adUnit.params.organizationId].push(adUnit);

      return groupedAdUnits;
    }, {});

    // Build one request per siteId
    const requests = utils._map(Object.keys(groupedAdUnits), (organizationId) => {
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
          _pushInAdagioQueue({
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
    const syncs = serverResponses[0].body.userSyncs.map((sync) => {
      return {
        type: sync.t === 'p' ? 'image' : 'iframe',
        url: sync.u
      }
    })
    return syncs;
  },
};

initAdagio();

registerBidder(spec);
