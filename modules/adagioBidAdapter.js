import find from 'core-js/library/fn/array/find';
import * as utils from 'src/utils';
import { registerBidder } from 'src/adapters/bidderFactory';

const BIDDER_CODE = 'adagio';
const VERSION = '1.4.0';
const FEATURES_VERSION = '1';
const ENDPOINT = 'https://mp.4dex.io/prebid';
const SUPPORTED_MEDIA_TYPES = ['banner'];
const ADAGIO_TAG_URL = '//script.4dex.io/localstore.js';
const ADAGIO_TAG_TO_LOCALSTORE = '//script.4dex.io/adagio.js';
const ADAGIO_LOCALSTORE_KEY = 'adagioScript';
const LOCALSTORE_TIMEOUT = 100;
const ADSRV_EVENTS = {
  GPT: {
    IMPRESSION_VIEWABLE: 'impressionViewable',
    SLOT_ON_LOAD: 'slotOnLoad',
    SLOT_RENDER_ENDED: 'slotRenderEnded',
    SLOT_REQUESTED: 'slotRequested',
    SLOT_RESPONSE_RECEIVED: 'slotResponseReceived',
    SLOT_VISIBILITY_CHANGED: 'slotVisibilityChanged',
  },
  SAS: {
    CALL: 'call',
    CLEAN: 'clean',
    BEFORE_RENDER: 'beforeRender',
    CMP_ANSWERED: 'CmpAnswered',
    CMP_CALLED: 'CmpCalled',
    LOAD: 'load',
    NOAD: 'noad',
    RENDER: 'render',
    RESET: 'reset'
  }
};

function canAccessTopWindow() {
  try {
    if (window.top.location.href) {
      return true;
    }
  } catch (error) {
    return false;
  }
}

function initAdagio() {
  const script = document.createElement('script');

  window.top.ADAGIO = window.top.ADAGIO || {};
  window.top.ADAGIO.queue = window.top.ADAGIO.queue || [];
  window.top.ADAGIO.versions = window.top.ADAGIO.versions || {};
  window.top.ADAGIO.versions.adagioBidderAdapter = VERSION;

  const getAdagioTag = function getAdagioTag() {
    const ls = window.top.localStorage.getItem('adagioScript');
    if (ls !== null) {
      Function(ls)(); // eslint-disable-line no-new-func
    } else {
      utils.logWarn('Adagio Script not found');
    }
  }

  const adagioEnqueue = function adagioEnqueue(action, data) {
    window.top.ADAGIO.queue.push({ action, data, ts: Date.now() });
  }

  // Listen to ad-server events in current window as we can
  // in a Post-Bid scenario.
  window.googletag = window.googletag || {};
  window.googletag.cmd = window.googletag.cmd || [];
  window.googletag.cmd.push(function() {
    const gptEvents = Object.keys(ADSRV_EVENTS.GPT).map(key => ADSRV_EVENTS.GPT[key]);
    gptEvents.forEach(eventName => {
      window.googletag.pubads().addEventListener(eventName, args => {
        adagioEnqueue('gpt-event', { eventName, args });
      });
    });
  });

  window.sas = window.sas || {};
  window.sas.cmd = window.sas.cmd || [];
  window.sas.cmd.push(function() {
    const sasEvents = Object.keys(ADSRV_EVENTS.SAS).map(key => ADSRV_EVENTS.SAS[key]);
    sasEvents.forEach(eventName => {
      window.sas.events.on(eventName, args => {
        adagioEnqueue('sas-event', { eventName, args });
      });
    });
  });

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
}

if (canAccessTopWindow()) {
  initAdagio();
}

const _features = {
  getPrintNumber: function() {
    return 1;
  },

  getPageDimensions: function() {
    const viewportDims = _features.getViewPortDimensions().split('x');
    const w = window.top;
    const body = w.document.body;
    const html = w.document.documentElement;
    let pageHeight = 0;

    if (w === w.top) {
      pageHeight = Math.max(body.scrollHeight, body.offsetHeight, html.clientHeight, html.scrollHeight, html.offsetHeight);
    } else {
      pageHeight = Math.max(body.offsetHeight, html.scrollHeight, html.offsetHeight);
    }

    return viewportDims[0] + 'x' + pageHeight;
  },

  getViewPortDimensions: function() {
    let viewPortWidth;
    let viewPortHeight;
    const w = window.top;
    const d = w.document;

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

  isDomLoading: function() {
    const w = window.top;
    let performance = w.performance || w.msPerformance || w.webkitPerformance || w.mozPerformance;
    let domLoading = -1;

    if (performance && performance.timing && performance.timing.navigationStart > 0) {
      const val = performance.timing.domLoading - performance.timing.navigationStart;
      if (val > 0) domLoading = val;
    }
    return domLoading;
  },

  getSlotPosition: function(element) {
    const w = window.top;
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

  getTimestamp: function() {
    return Math.floor(new Date().getTime() / 1000) - new Date().getTimezoneOffset() * 60;
  },

  getDevice: function() {
    const w = window.top;
    const ua = w.navigator.userAgent;

    if ((/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i).test(ua)) {
      return 5; // "tablet"
    }
    if ((/Mobile|iP(hone|od|ad)|Android|BlackBerry|IEMobile|Kindle|NetFront|Silk-Accelerated|(hpw|web)OS|Fennec|Minimo|Opera M(obi|ini)|Blazer|Dolfin|Dolphin|Skyfire|Zune/).test(ua)) {
      return 4; // "phone"
    }
    return 2; // personal computers
  },

  getBrowser: function() {
    const w = window.top;
    const ua = w.navigator.userAgent;
    const uaLowerCase = ua.toLowerCase();
    return /Edge\/\d./i.test(ua) ? 'edge' : uaLowerCase.indexOf('chrome') > 0 ? 'chrome' : uaLowerCase.indexOf('firefox') > 0 ? 'firefox' : uaLowerCase.indexOf('safari') > 0 ? 'safari' : uaLowerCase.indexOf('opera') > 0 ? 'opera' : uaLowerCase.indexOf('msie') > 0 || w.MSStream ? 'ie' : 'unknow';
  },

  getOS: function() {
    const w = window.top;
    const ua = w.navigator.userAgent;
    const uaLowerCase = ua.toLowerCase();
    return uaLowerCase.indexOf('linux') > 0 ? 'linux' : uaLowerCase.indexOf('mac') > 0 ? 'mac' : uaLowerCase.indexOf('win') > 0 ? 'windows' : '';
  }
}

function _pushInAdagioQueue(ob) {
  if (!canAccessTopWindow()) return;
  window.top.ADAGIO.queue.push(ob);
};

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
  window.top.ADAGIO.pageviewId = window.top.ADAGIO.pageviewId || utils.generateUUID();
  return window.top.ADAGIO.pageviewId;
};

function _getElementFromTopWindow(element, w) {
  if (w.top === w) {
    if (!element.getAttribute('id')) {
      element.setAttribute('id', `adg-${utils.getUniqueIdentifierStr()}`);
    }
    return element;
  } else {
    const frame = w.frameElement;
    return _getElementFromTopWindow(frame, w.parent);
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
  const adUnitElementId = bidRequest.params.adUnitElementId;
  const adUnitCode = bidRequest.adUnitCode;

  let element = window.document.getElementById(adUnitElementId);

  if (bidRequest.params.postBid === true) {
    element = _getElementFromTopWindow(element, window);
    top.ADAGIO.pbjsAdUnits.map((adUnit) => {
      if (adUnit.code === adUnitCode) {
        const outerElementId = element.getAttribute('id');
        adUnit.outerAdUnitElementId = outerElementId;
        bidRequest.params.outerAdUnitElementId = outerElementId;
      }
    });
  } else {
    element = window.top.document.getElementById(adUnitElementId);
  }

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
  }
  return consent;
}

export const spec = {
  code: BIDDER_CODE,

  supportedMediaType: SUPPORTED_MEDIA_TYPES,

  isBidRequestValid: function(bid) {
    const { adUnitCode, auctionId, sizes, bidder, params } = bid;
    const { organizationId, site, placement, adUnitElementId } = bid.params;
    let isValid = false;

    if (canAccessTopWindow()) {
      top.ADAGIO = top.ADAGIO || {};
      top.ADAGIO.adUnits = top.ADAGIO.adUnits || {};
      top.ADAGIO.pbjsAdUnits = top.ADAGIO.pbjsAdUnits || [];
      isValid = !!(organizationId && site && placement && adUnitElementId && document.getElementById(adUnitElementId) !== null);
      const tempAdUnits = top.ADAGIO.pbjsAdUnits.filter((adUnit) => adUnit.code !== adUnitCode);
      tempAdUnits.push({
        code: adUnitCode,
        sizes,
        bids: [{
          bidder,
          params
        }]
      });
      top.ADAGIO.pbjsAdUnits = tempAdUnits;

      if (isValid === true) {
        top.ADAGIO.adUnits[adUnitCode] = {
          auctionId: auctionId,
          pageviewId: _getPageviewId()
        };
      }
    }

    return isValid;
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
          prebidVersion: $$PREBID_GLOBAL$$.version,
          adapterVersion: VERSION,
          featuresVersion: FEATURES_VERSION
          /**
           * @todo doit on ajouter ici le outerAdUnitElementId si on est en Post-Bid ?
           */
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
