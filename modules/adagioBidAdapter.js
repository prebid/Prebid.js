import find from 'core-js/library/fn/array/find.js';
import * as utils from '../src/utils.js';
import {registerBidder} from '../src/adapters/bidderFactory.js';
import { loadExternalScript } from '../src/adloader.js'
import JSEncrypt from 'jsencrypt/bin/jsencrypt.js';
import sha256 from 'crypto-js/sha256.js';
import { getStorageManager } from '../src/storageManager.js';

const BIDDER_CODE = 'adagio';
const VERSION = '2.2.0';
const FEATURES_VERSION = '1';
const ENDPOINT = 'https://mp.4dex.io/prebid';
const SUPPORTED_MEDIA_TYPES = ['banner'];
const ADAGIO_TAG_URL = 'https://script.4dex.io/localstore.js';
const ADAGIO_LOCALSTORAGE_KEY = 'adagioScript';
const GVLID = 617;
const storage = getStorageManager(GVLID);

export const ADAGIO_PUBKEY = `-----BEGIN PUBLIC KEY-----
MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQC9el0+OEn6fvEh1RdVHQu4cnT0
jFSzIbGJJyg3cKqvtE6A0iaz9PkIdJIvSSSNrmJv+lRGKPEyRA/VnzJIieL39Ngl
t0b0lsHN+W4n9kitS/DZ/xnxWK/9vxhv0ZtL1LL/rwR5Mup7rmJbNtDoNBw4TIGj
pV6EP3MTLosuUEpLaQIDAQAB
-----END PUBLIC KEY-----`;

export function getAdagioScript() {
  try {
    const ls = storage.getDataFromLocalStorage(ADAGIO_LOCALSTORAGE_KEY);

    if (!ls) {
      utils.logWarn('Adagio Script not found');
      return;
    }

    const hashRgx = /^(\/\/ hash: (.+)\n)(.+\n)$/;

    if (!hashRgx.test(ls)) {
      utils.logWarn('No hash found in Adagio script');
      storage.removeDataFromLocalStorage(ADAGIO_LOCALSTORAGE_KEY);
    } else {
      const r = ls.match(hashRgx);
      const hash = r[2];
      const content = r[3];

      var jsEncrypt = new JSEncrypt();
      jsEncrypt.setPublicKey(ADAGIO_PUBKEY);

      if (jsEncrypt.verify(content, hash, sha256)) {
        utils.logInfo('Start Adagio script');
        Function(ls)(); // eslint-disable-line no-new-func
      } else {
        utils.logWarn('Invalid Adagio script found');
        storage.removeDataFromLocalStorage(ADAGIO_LOCALSTORAGE_KEY);
      }
    }
  } catch (err) {
    //
  }
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

function initAdagio() {
  const w = utils.getWindowTop();

  w.ADAGIO = w.ADAGIO || {};
  w.ADAGIO.queue = w.ADAGIO.queue || [];
  w.ADAGIO.versions = w.ADAGIO.versions || {};
  w.ADAGIO.versions.adagioBidderAdapter = VERSION;

  getAdagioScript();

  loadExternalScript(ADAGIO_TAG_URL, BIDDER_CODE)
}

if (canAccessTopWindow()) {
  initAdagio();
}

const _features = {
  getPrintNumber: function (adUnitCode) {
    const adagioAdUnit = _getOrAddAdagioAdUnit(adUnitCode);
    return adagioAdUnit.printNumber || 1;
  },

  getPageDimensions: function () {
    const viewportDims = _features.getViewPortDimensions().split('x');
    const w = utils.getWindowTop();
    const body = w.document.body;
    if (!body) {
      return ''
    }
    const html = w.document.documentElement;
    const pageHeight = Math.max(body.scrollHeight, body.offsetHeight, html.clientHeight, html.scrollHeight, html.offsetHeight);

    return viewportDims[0] + 'x' + pageHeight;
  },

  getViewPortDimensions: function () {
    let viewPortWidth;
    let viewPortHeight;
    const w = utils.getWindowTop();
    const d = w.document;

    if (w.innerWidth) {
      viewPortWidth = w.innerWidth;
      viewPortHeight = w.innerHeight;
    } else {
      viewPortWidth = d.getElementsByTagName('body')[0].clientWidth;
      viewPortHeight = d.getElementsByTagName('body')[0].clientHeight;
    }

    return viewPortWidth + 'x' + viewPortHeight;
  },

  isDomLoading: function () {
    const w = utils.getWindowTop();
    let performance = w.performance || w.msPerformance || w.webkitPerformance || w.mozPerformance;
    let domLoading = -1;

    if (performance && performance.timing && performance.timing.navigationStart > 0) {
      const val = performance.timing.domLoading - performance.timing.navigationStart;
      if (val > 0) domLoading = val;
    }
    return domLoading;
  },

  getSlotPosition: function (element) {
    if (!element) return '';

    const w = utils.getWindowTop();
    const d = w.document;
    const el = element;

    let box = el.getBoundingClientRect();
    const docEl = d.documentElement;
    const body = d.body;
    const clientTop = d.clientTop || body.clientTop || 0;
    const clientLeft = d.clientLeft || body.clientLeft || 0;
    const scrollTop = w.pageYOffset || docEl.scrollTop || body.scrollTop;
    const scrollLeft = w.pageXOffset || docEl.scrollLeft || body.scrollLeft;

    const elComputedStyle = w.getComputedStyle(el, null);
    const elComputedDisplay = elComputedStyle.display || 'block';
    const mustDisplayElement = elComputedDisplay === 'none';

    if (mustDisplayElement) {
      el.style = el.style || {};
      el.style.display = 'block';
      box = el.getBoundingClientRect();
      el.style.display = elComputedDisplay;
    }

    const position = {
      x: Math.round(box.left + scrollLeft - clientLeft),
      y: Math.round(box.top + scrollTop - clientTop)
    };

    return position.x + 'x' + position.y;
  },

  getTimestamp: function () {
    return Math.floor(new Date().getTime() / 1000) - new Date().getTimezoneOffset() * 60;
  },

  getDevice: function () {
    if (!canAccessTopWindow()) return false;
    const w = utils.getWindowTop();
    const ua = w.navigator.userAgent;

    if ((/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i).test(ua)) {
      return 5; // "tablet"
    }
    if ((/Mobile|iP(hone|od|ad)|Android|BlackBerry|IEMobile|Kindle|NetFront|Silk-Accelerated|(hpw|web)OS|Fennec|Minimo|Opera M(obi|ini)|Blazer|Dolfin|Dolphin|Skyfire|Zune/).test(ua)) {
      return 4; // "phone"
    }
    return 2; // personal computers
  },

  getBrowser: function () {
    const w = utils.getWindowTop();
    const ua = w.navigator.userAgent;
    const uaLowerCase = ua.toLowerCase();
    return /Edge\/\d./i.test(ua) ? 'edge' : uaLowerCase.indexOf('chrome') > 0 ? 'chrome' : uaLowerCase.indexOf('firefox') > 0 ? 'firefox' : uaLowerCase.indexOf('safari') > 0 ? 'safari' : uaLowerCase.indexOf('opera') > 0 ? 'opera' : uaLowerCase.indexOf('msie') > 0 || w.MSStream ? 'ie' : 'unknow';
  },

  getOS: function () {
    const w = window.top;
    const ua = w.navigator.userAgent;
    const uaLowerCase = ua.toLowerCase();
    return uaLowerCase.indexOf('linux') > 0 ? 'linux' : uaLowerCase.indexOf('mac') > 0 ? 'mac' : uaLowerCase.indexOf('win') > 0 ? 'windows' : '';
  }
}

function _pushInAdagioQueue(ob) {
  try {
    if (!canAccessTopWindow()) return;
    const w = utils.getWindowTop();
    w.ADAGIO.queue.push(ob);
  } catch (e) {}
};

function _getOrAddAdagioAdUnit(adUnitCode) {
  const w = utils.getWindowTop();
  if (w.ADAGIO.adUnits[adUnitCode]) {
    return w.ADAGIO.adUnits[adUnitCode]
  }
  return w.ADAGIO.adUnits[adUnitCode] = {};
}

function _computePrintNumber(adUnitCode) {
  let printNumber = 1;
  const w = utils.getWindowTop();
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

function _getSite() {
  const w = utils.getWindowTop();
  return {
    domain: w.location.hostname,
    page: w.location.href,
    referrer: w.document.referrer || ''
  };
};

function _getPageviewId() {
  if (!canAccessTopWindow()) return false;
  const w = utils.getWindowTop();
  w.ADAGIO.pageviewId = w.ADAGIO.pageviewId || utils.generateUUID();
  return w.ADAGIO.pageviewId;
};

function _getElementFromTopWindow(element, currentWindow) {
  if (utils.getWindowTop() === currentWindow) {
    if (!element.getAttribute('id')) {
      element.setAttribute('id', `adg-${utils.getUniqueIdentifierStr()}`);
    }
    return element;
  } else {
    const frame = currentWindow.frameElement;
    return _getElementFromTopWindow(frame, currentWindow.parent);
  }
}

/**
 * Returns all features for a specific adUnit element
 *
 * @param {Object} bidRequest
 * @returns {Object} features for an element (see specs)
 */
function _getFeatures(bidRequest) {
  if (!canAccessTopWindow()) return;
  const w = utils.getWindowTop();
  const adUnitElementId = bidRequest.params.adUnitElementId;
  const adUnitCode = bidRequest.adUnitCode;

  let element = window.document.getElementById(adUnitElementId);

  if (bidRequest.params.postBid === true) {
    element = _getElementFromTopWindow(element, window);
    w.ADAGIO.pbjsAdUnits.map((adUnit) => {
      if (adUnit.code === adUnitCode) {
        const outerElementId = element.getAttribute('id');
        adUnit.outerAdUnitElementId = outerElementId;
        bidRequest.params.outerAdUnitElementId = outerElementId;
      }
    });
  } else {
    element = w.document.getElementById(adUnitElementId);
  }

  const features = {
    print_number: _features.getPrintNumber(bidRequest.adUnitCode).toString(),
    page_dimensions: _features.getPageDimensions().toString(),
    viewport_dimensions: _features.getViewPortDimensions().toString(),
    dom_loading: _features.isDomLoading().toString(),
    // layout: features.getLayout().toString(),
    adunit_position: _features.getSlotPosition(element).toString(),
    user_timestamp: _features.getTimestamp().toString(),
    device: _features.getDevice().toString(),
    url: w.location.origin + w.location.pathname,
    browser: _features.getBrowser(),
    os: _features.getOS()
  };

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

  isBidRequestValid: function (bid) {
    const { adUnitCode, auctionId, sizes, bidder, params, mediaTypes } = bid;
    const { organizationId, site, placement, adUnitElementId } = bid.params;
    let isValid = false;

    try {
      if (canAccessTopWindow()) {
        const w = utils.getWindowTop();
        w.ADAGIO = w.ADAGIO || {};
        w.ADAGIO.adUnits = w.ADAGIO.adUnits || {};
        w.ADAGIO.pbjsAdUnits = w.ADAGIO.pbjsAdUnits || [];
        isValid = !!(organizationId && site && placement && adUnitElementId);
        const tempAdUnits = w.ADAGIO.pbjsAdUnits.filter((adUnit) => adUnit.code !== adUnitCode);
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
      }
    } catch (e) {
      return isValid;
    }
    return isValid;
  },

  buildRequests: function (validBidRequests, bidderRequest) {
    // AdagioBidAdapter works when window.top can be reached only
    if (!bidderRequest.refererInfo.reachedTop) return [];

    const secure = (location.protocol === 'https:') ? 1 : 0;
    const device = _getDevice();
    const site = _getSite();
    const pageviewId = _getPageviewId();
    const gdprConsent = _getGdprConsent(bidderRequest);
    const schain = _getSchain(validBidRequests[0]);
    const adUnits = utils._map(validBidRequests, (bidRequest) => {
      bidRequest.features = _getFeatures(bidRequest);
      return bidRequest;
    });

    // Regroug ad units by siteId
    const groupedAdUnits = adUnits.reduce((groupedAdUnits, adUnit) => {
      if (adUnit.params && adUnit.params.organizationId) {
        adUnit.params.organizationId = adUnit.params.organizationId.toString();
      }
      (groupedAdUnits[adUnit.params.organizationId] = groupedAdUnits[adUnit.params.organizationId] || []).push(adUnit);
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

  interpretResponse: function (serverResponse, bidRequest) {
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

  getUserSyncs: function (syncOptions, serverResponses) {
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
  }
}

registerBidder(spec);
