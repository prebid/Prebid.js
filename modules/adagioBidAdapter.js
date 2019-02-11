import find from 'core-js/library/fn/array/find';
import * as utils from 'src/utils';
import { registerBidder } from 'src/adapters/bidderFactory';

const BIDDER_CODE = 'adagio';
const VERSION = '1.0.0';
const FEATURES_VERSION = '1';
const ENDPOINT = 'https://mp.4dex.io/prebid';
const SUPPORTED_MEDIA_TYPES = ['banner'];
const ADAGIO_TAG_URL = '//script.4dex.io/localstore.js';
const ADAGIO_TAG_TO_LOCALSTORE = '//script.4dex.io/adagio.js';
const ADAGIO_LOCALSTORE_KEY = 'adagioScript';
const LOCALSTORE_TIMEOUT = 100;
const script = document.createElement('script');

const getAdagioTag = function getAdagioTag() {
  const ls = window.top.localStorage.getItem('adagioScript');
  if (ls !== null) {
    Function(ls)(); // eslint-disable-line no-new-func
  } else {
    utils.logWarn('Adagio Script not found');
  }
}

// First, try to load adagio-js from localStorage.
getAdagioTag();

// Then prepare localstore.js to update localStorage adagio-sj script with
// the very last version.
script.type = 'text/javascript';
script.async = true;
script.src = ADAGIO_TAG_URL;
script.setAttribute('data-key', ADAGIO_LOCALSTORE_KEY);
script.setAttribute('data-src', ADAGIO_TAG_TO_LOCALSTORE);
setTimeout(function() {
  utils.insertElement(script);
}, LOCALSTORE_TIMEOUT);

/*
 * Custom Adagio Mapping:
 * ---------------------
 * print_number        | private | defaults to 1
 * page_dimensions     | private | e.g. "5490x954"
 * viewport_dimensions | private | e.g. "1680x954"
 * dom_loading         | private | Navigation Timing "DOM Loading", in milliseconds
 * layout              | private | Responsive layout code. e.g. "AA1"
 * adunit_position     | private | Position of the slot. e.g. "1000x45"
 * user_timestamp      | private | User timestamp. Server-side, this unix timestamp is parsed a UTC timestamp - ex: 1518197208
 * device              | private | IAB device type code: "5" for tablet, "4" for mobile, "2" for others
 * url                 | private | Current URL, (without query string and/or hash)
 * browser             | private | Current Browser name. e.g. "edge", "chrome", etc…
 * os                  | private | Current OS name : "linux", "windows", "mac"
 */

const _features = {
  /**
   * Returns the print number of an element
   * The print number is used only in case of an element is Refreshed
   * @todo implement this if needed
   * @returns number - default 1
   */
  getPrintNumber: function() {
    return 1;
  },

  /**
   * Returns the page dimensions
   * @returns {string} width x height. e.g. 1920x2105
   */
  getPageDimensions: function() {
    const viewportDims = _features.getViewPortDimensions().split('x');
    const body = document.body;
    const html = document.documentElement;
    const w = window;
    let pageHeight = 0;

    if (w === w.top) {
      pageHeight = Math.max(body.scrollHeight, body.offsetHeight, html.clientHeight, html.scrollHeight, html.offsetHeight);
    } else {
      pageHeight = Math.max(body.offsetHeight, html.scrollHeight, html.offsetHeight);
    }

    return viewportDims[0] + 'x' + pageHeight;
  },

  /**
   * Returns the viewport dimensions
   * @returns {string} width x height. e.g. 1920x1024
   */
  getViewPortDimensions: function() {
    let viewPortWidth;
    let viewPortHeight;
    const w = window;
    const d = document;

    // the more standards compliant browsers (mozilla/netscape/opera/IE7) use w.innerWidth and w.innerHeight
    // then try IE6 in standards compliant mode (i.e. with a valid doctype as the first line in the document)
    // finish with older versions of IE
    if (w.innerWidth != null) {
      viewPortWidth = w.innerWidth;
      viewPortHeight = w.innerHeight;
    } else if (d.documentElement != null &&
        d.documentElement.clientWidth != null &&
        d.documentElement.clientWidth !== 0) {
      viewPortWidth = d.documentElement.clientWidth;
      viewPortHeight = d.documentElement.clientHeight;
    } else {
      viewPortWidth = d.getElementsByTagName('body')[0].clientWidth;
      viewPortHeight = d.getElementsByTagName('body')[0].clientHeight;
    }

    return viewPortWidth + 'x' + viewPortHeight;
  },

  /**
   * Returns the navigation timing "DOM Loading", in milliseconds
   * @returns {number}
   */
  isDomLoading: function() {
    const w = window;
    let performance = w.performance || w.msPerformance || w.webkitPerformance || w.mozPerformance;
    let domLoading = -1;

    if (performance && performance.timing && performance.timing.navigationStart > 0) {
      const val = performance.timing.domLoading - performance.timing.navigationStart;
      if (val > 0) domLoading = val;
    }
    return domLoading;
  },

  /**
   * Returns the position of an element in the page
   * @param {HTMLElement} element
   * @returns {string} x-axis x y-axis. e.g. 1200x324
   */
  getSlotPosition: function(element) {
    const w = window;
    const d = document;
    const el = element;

    // Source: http://stackoverflow.com/a/26230989 & https://github.com/timoxley/offset/blob/master/index.js
    let box = el.getBoundingClientRect();
    const docEl = d.documentElement;
    const body = d.body;
    const clientTop = d.clientTop || body.clientTop || 0;
    const clientLeft = d.clientLeft || body.clientLeft || 0;
    const scrollTop = w.pageYOffset || docEl.scrollTop || body.scrollTop;
    const scrollLeft = w.pageXOffset || docEl.scrollLeft || body.scrollLeft;

    // We need to display an hidden element before we can get his position
    const elComputedStyle = w.getComputedStyle(el, null);
    const elComputedDisplay = elComputedStyle.display || 'block';
    const mustDisplayElement = elComputedDisplay === 'none';

    if (mustDisplayElement) {
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

  /**
   * Returns the user timestamp.
   * Server-side, this unix timestamp is parsed a UTC timestamp, e.g. 1518197208
   * @returns {number}
   */
  getTimestamp: function() {
    return Math.floor(new Date().getTime() / 1000) - new Date().getTimezoneOffset() * 60;
  },

  /**
   * Returns the device type, as an IAB code.
   * Based on https://github.com/ua-parser/uap-cpp/blob/master/UaParser.cpp#L331, with the following updates:
   * - replaced `mobile` by `mobi` in the table regexp, so Opera Mobile on phones is not detected as a tablet.
   * @returns {number}
   */
  getDevice: function() {
    const ua = navigator.userAgent;

    // Tablets must be checked before phones.
    if ((/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i).test(ua)) {
      return 5; // "tablet"
    }
    if ((/Mobile|iP(hone|od|ad)|Android|BlackBerry|IEMobile|Kindle|NetFront|Silk-Accelerated|(hpw|web)OS|Fennec|Minimo|Opera M(obi|ini)|Blazer|Dolfin|Dolphin|Skyfire|Zune/).test(ua)) {
      return 4; // "phone"
    }
    // Consider that all other devices are personal computers
    return 2;
  },

  // Browser detection
  getBrowser: function() {
    const userAgentLoweCase = navigator.userAgent.toLowerCase();
    return /Edge\/\d./i.test(navigator.userAgent) ? 'edge' : userAgentLoweCase.indexOf('chrome') > 0 ? 'chrome' : userAgentLoweCase.indexOf('firefox') > 0 ? 'firefox' : userAgentLoweCase.indexOf('safari') > 0 ? 'safari' : userAgentLoweCase.indexOf('opera') > 0 ? 'opera' : userAgentLoweCase.indexOf('msie') > 0 || window.top.MSStream ? 'ie' : 'unknow';
  },

  // OS detection
  getOS: function() {
    const userAgentLoweCase = navigator.userAgent.toLowerCase();
    return userAgentLoweCase.indexOf('linux') > 0 ? 'linux' : userAgentLoweCase.indexOf('mac') > 0 ? 'mac' : userAgentLoweCase.indexOf('win') > 0 ? 'windows' : '';
  }
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
  const topLocation = utils.getTopWindowLocation();
  return {
    domain: topLocation.hostname,
    page: topLocation.href,
    referrer: utils.getTopWindowReferrer()
  };
};

function _getPageviewId() {
  return (!window.top.ADAGIO || !window.top.ADAGIO.pageviewId) ? '_' : window.top.ADAGIO.pageviewId;
};

/**
 * Returns all features for a specific adUnit element
 *
 * @param {Object} bidRequest
 * @returns {Object} features for an element (see specs)
 */
function _getFeatures(bidRequest) {
  const adUnitElementId = bidRequest.params.adUnitElementId;
  const element = document.getElementById(adUnitElementId);
  let features = {};

  if (element) {
    features = Object.assign({}, {
      print_number: _features.getPrintNumber(element).toString(),
      page_dimensions: _features.getPageDimensions().toString(),
      viewport_dimensions: _features.getViewPortDimensions().toString(),
      dom_loading: _features.isDomLoading().toString(),
      // layout: features.getLayout().toString(),
      adunit_position: _features.getSlotPosition(element).toString(),
      user_timestamp: _features.getTimestamp().toString(),
      device: _features.getDevice().toString(),
      url: top.location.origin + top.location.pathname,
      browser: _features.getBrowser(),
      os: _features.getOS()
    })
  }

  const adUnitFeature = {};
  adUnitFeature[adUnitElementId] = {
    features: features,
    version: FEATURES_VERSION
  };

  _setData({
    features: adUnitFeature
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
  }
  return consent;
}

// Extra data returned by Adagio SSP Engine
function _setData(data) {
  window.top.ADAGIO = window.top.ADAGIO || {};
  window.top.ADAGIO.queue = window.top.ADAGIO.queue || [];
  window.top.ADAGIO.queue.push({
    action: 'ssp-data',
    ts: Date.now(),
    data: data,
  });
}

export const spec = {
  code: BIDDER_CODE,

  supportedMediaType: SUPPORTED_MEDIA_TYPES,

  isBidRequestValid: function(bid) {
    return !!(bid.params.organizationId && bid.params.site && bid.params.placement && bid.params.pagetype && bid.params.adUnitElementId && document.getElementById(bid.params.adUnitElementId) !== null);
  },

  buildRequests: function(validBidRequests, bidderRequest) {
    const secure = (location.protocol === 'https:') ? 1 : 0;
    const device = _getDevice();
    const site = _getSite();
    const pageviewId = _getPageviewId();
    const gdprConsent = _getGdprConsent(bidderRequest);
    const adUnits = utils._map(validBidRequests, (bidRequest) => {
      bidRequest.features = _getFeatures(bidRequest);
      return bidRequest;
    });

    // Regroug ad units by siteId
    const groupedAdUnits = adUnits.reduce((groupedAdUnits, adUnit) => {
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
          adapterVersion: VERSION
        },
        options: {
          contentType: 'application/json'
        }
      }
    });

    return requests;
  },

  interpretResponse: function(serverResponse, bidRequest) {
    let bidResponses = [];
    try {
      const response = serverResponse.body;
      if (response) {
        if (response.data) {
          _setData(response.data)
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

  getUserSyncs: function(syncOptions, serverResponses) {
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
