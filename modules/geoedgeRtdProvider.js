/**
 * This module adds geoedge provider to the real time data module
 * The {@link module:modules/realTimeData} module is required
 * The module will fetch creative wrapper from geoedge server
 * The module will place geoedge RUM client on bid responses markup
 * For outstream video the module holds the bid's own renderer until the client clears the creative
 * @module modules/geoedgeProvider
 * @requires module:modules/realTimeData
 */

/**
 * @typedef {Object} ModuleParams
 * @property {string} key
 * @property {?Object} bidders
 * @property {?boolean} wap
 * @property {?boolean} gpt
 * @property {?boolean} outstream publisher opt-in to outstream video monitoring
 * @property {?string} keyName
 */

import { submodule } from '../src/hook.js';
import { getGlobal } from '../src/prebidGlobal.js';
import { ajax } from '../src/ajax.js';
import { generateUUID, createInvisibleIframe, insertElement, isEmpty, logError } from '../src/utils.js';
import * as events from '../src/events.js';
import { EVENTS } from '../src/constants.js';
import { loadExternalScript } from '../src/adloader.js';
import { isRendererRequired } from '../src/Renderer.js';
import { auctionManager } from '../src/auctionManager.js';
import { getRefererInfo } from '../src/refererDetection.js';
import { MODULE_TYPE_RTD } from '../src/activities/modules.js';

const SUBMODULE_NAME = 'geoedge';
/* eslint-disable no-template-curly-in-string */
export const WRAPPER_URL = 'https://wrappers.geoedge.be/wrapper.html';
export const HTML_PLACEHOLDER = '${creative}';
const PV_ID = generateUUID();
const HOST_NAME = 'https://rumcdn.geoedge.be';
const FILE_NAME_CLIENT = 'grumi.js';
const FILE_NAME_INPAGE = 'grumi-ip.js';
export const getClientUrl = (key) => `${HOST_NAME}/${key}/${FILE_NAME_CLIENT}`;
export const getInPageUrl = (key) => `${HOST_NAME}/${key}/${FILE_NAME_INPAGE}`;
const OUTSTREAM_API = 'grumiOutstreamApi'; // exposed by the client inside the client frame
const OUTSTREAM_GATED = '__geOutstreamGated'; // stamped on a renderer we wrapped; the client reads it
export const OUTSTREAM_GATE_TIMEOUT = 1500; // give up waiting for the client and render unprotected
const VAST_HEAD_CHARS = 300; // how far into bid.ad to look for the <VAST> marker

export let wrapper;
let wrapperReady;
let clientLoaded = false;
let clientTimedOut = false;
let clientTimeoutId;
/** @type {HTMLIFrameElement} the client frame; the video gate delegates into it */
let clientFrame;
/** @type {Array} renders parked until the client script has executed; flushed by markClientAsLoaded */
let videoWaiters = [];

/** @type {object} */
const refererInfo = getRefererInfo();
/** @type {object} */
const overrides = window.grumi?.overrides;

/**
 * fetches the creative wrapper
 * @param {function} success - success callback
 */
export function fetchWrapper(success) {
  if (wrapperReady) {
    return success(wrapper);
  }

  ajax(WRAPPER_URL, success);
}

/**
 * sets the wrapper response
 * @param {string} responseText
 */
export function setWrapper(responseText) {
  wrapperReady = true;
  wrapper = responseText;
}

/**
 * builds the params object handed to the client inside the frame
 * @param {string} key
 * @param {?boolean} outstream publisher opt-in to outstream video monitoring
 * @return {Object}
 */
export function getInitialParams(key, outstream, bidders) {
  const params = {
    wver: '1.1.2',
    wtype: 'pbjs-module',
    key,
    meta: { topUrl: refererInfo.page },
    site: refererInfo.domain,
    pimp: PV_ID,
    fsRan: true,
    frameApi: true,
    outstream
  };

  if (outstream) {
    params.pbjs = getGlobal();
    params.bidders = bidders;
  }

  return params;
}

/**
 * the client script's onload. Releases any render parked waiting for it.
 */
export function markClientAsLoaded() {
  clientLoaded = true;

  if (clientTimedOut) {
    return;
  }

  stopClientLoadTimer();
  handleOutstreamPendingBids();
}

function onClientTimeout() {
  clientTimedOut = true;

  flushOutstreamPendingBids();
}

function handleOutstreamPendingBids() {
  videoWaiters.forEach((waiter) => {
    const [renderInvoker, bid] = waiter;

    if (shouldRenderOutstream(bid)) {
      renderInvoker();
    }
  });

  videoWaiters = [];
}

function flushOutstreamPendingBids() {
  videoWaiters.forEach((waiter) => {
    const [renderInvoker] = waiter;

    renderInvoker();
  });

  videoWaiters = [];
}

function startClientLoadTimer() {
  clientTimeoutId = setTimeout(onClientTimeout, OUTSTREAM_GATE_TIMEOUT);
}

function stopClientLoadTimer() {
  clearTimeout(clientTimeoutId);
}

/**
 * loads the monitoring client in an invisible iframe
 * @param {string} key
 * @param {?boolean} outstream publisher opt-in to outstream video monitoring
 */
export function loadClientInIframe(key, outstream, bidders) {
  const iframe = createInvisibleIframe();
  const url = getClientUrl(key);

  iframe.id = 'grumiFrame';
  insertElement(iframe);
  iframe.contentWindow.grumi = getInitialParams(key, outstream, bidders);
  clientFrame = iframe;

  loadExternalScript(url, MODULE_TYPE_RTD, SUBMODULE_NAME, markClientAsLoaded, iframe.contentDocument);
  startClientLoadTimer();
}

/**
 * creates identity function for string replace without special replacement patterns
 * @param {string} str
 * @return {function}
 */
function replacer(str) {
  return function () {
    return str;
  };
}

/**
 * places the creative inside the wrapper
 * @param {string} wrapper
 * @param {string} html
 * @return {string}
 */
export function wrapHtml(wrapper, html) {
  return wrapper.replace(HTML_PLACEHOLDER, replacer(html));
}

/**
 * generate macros dictionary from bid response
 * @param {Object} bid
 * @param {string} key
 * @return {Object}
 */
export function getMacros(bid, key) {
  return {
    '${key}': key,
    '%%ADUNIT%%': bid.adUnitCode,
    '%%WIDTH%%': bid.width,
    '%%HEIGHT%%': bid.height,
    '%%PATTERN:hb_adid%%': bid.adId,
    '%%PATTERN:hb_bidder%%': bid.bidderCode,
    '%_isHb!': true,
    '%_hbcid!': bid.creativeId || '',
    '%_hbadomains': bid.meta && bid.meta.advertiserDomains,
    '%%PATTERN:hb_pb%%': bid.pbHg,
    '%%SITE%%': overrides?.site || refererInfo.domain,
    '%_pimp%': PV_ID,
    '%_hbCpm!': bid.cpm,
    '%_hbCurrency!': bid.currency
  };
}

function replaceMacros(wrapper, macros) {
  var re = new RegExp('\\' + Object.keys(macros).join('|'), 'gi');

  return wrapper.replace(re, function (matched) {
    return macros[matched];
  });
}

function buildHtml(bid, wrapper, html, key) {
  const macros = getMacros(bid, key);
  wrapper = replaceMacros(wrapper, macros);

  return wrapHtml(wrapper, html);
}

function mutateBid(bid, ad) {
  bid.ad = ad;
}

/**
 * wraps the bid's markup with the creative wrapper
 * @param {Object} bid
 * @param {string} key
 */
export function wrapBidResponse(bid, key) {
  const wrapped = buildHtml(bid, wrapper, bid.ad, key);

  mutateBid(bid, wrapped);
}

function isSupportedBidder(bidder, paramsBidders) {
  return isEmpty(paramsBidders) || paramsBidders[bidder] === true;
}

function shouldWrap(bid, params) {
  const supportedBidder = isSupportedBidder(bid.bidderCode, params.bidders);
  const clientReady = params.wap ? clientLoaded : true;
  const isGPT = params.gpt;

  return wrapperReady && supportedBidder && clientReady && !isGPT;
}

function conditionallyWrap(bidResponse, config, userConsent) {
  const params = config.params;

  if (shouldWrap(bidResponse, params)) {
    wrapBidResponse(bidResponse, params.key);
  }
}

// ---------------------------------------------------------------------------
// Outstream video gate
//
// Video creatives are VAST, not HTML, so there is no markup to wrap. The bid's own renderer is
// wrapped instead: on render, the client is asked whether the creative may run. If the client does
// not load in time the creative renders anyway. A publisher's ad is never lost because monitoring
// was unavailable.
// ---------------------------------------------------------------------------

function getOutstreamAPI() {
  try {
    return clientFrame && clientFrame.contentWindow && clientFrame.contentWindow[OUTSTREAM_API];
  } catch (e) {
    return null; // frame torn out of the DOM
  }
}

// Deliberately broad, because mediaType alone is not reliable: an adapter that omits it leaves a
// video bid labeled 'banner', and instream/outstream context lives on the adUnit, not the response.
// The bid.ad leg covers outstream, the one video context prebid does not require a VAST field for:
// checkVideoBidSetup accepts it on hasRenderer alone, so the VAST may arrive in `ad`.
// No vastUrl leg: handleVideoBidCaching backfills a bare vastUrl into vastXml before BID_RESPONSE,
// so a correctly labeled video bid always has vastXml by the time this runs.
/**
 * whether this bid could carry a VAST document through its renderer
 * @param {Object} bid
 * @return {boolean}
 */
export function isVastBid(bid) {
  return Boolean(bid.mediaType === 'video' || bid.vastXml || hasVastXmlInBidAd(bid));
}

function hasVastXmlInBidAd(bid) {
  // head only, since display bids reach this leg too, and their `ad` is a full creative
  return typeof bid.ad === 'string' && /<vast/i.test(bid.ad.slice(0, VAST_HEAD_CHARS));
}

/**
 * whether this VAST bid is one we gate: the publisher opted in, the bidder is monitored, and prebid
 * will render it through the bid's own renderer. Callers establish isVastBid first, so this does not
 * re-check it. safeRenderer bids are skipped, since prebid loads that renderer's own script and
 * never calls bid.renderer.
 *
 * Says nothing about whether the renderer is already wrapped: that is renderer state, not bid
 * identity, and one renderer can serve many bids.
 * @param {Object} bid
 * @param {ModuleParams} params
 * @return {boolean}
 */
function shouldGateOutstreamRender(bid, params) {
  const { renderer } = bid;
  const supportedBidder = isSupportedBidder(bid.bidderCode, params.bidders);

  if (!params.outstream || !supportedBidder || bid.safeRenderer || !clientFrame) {
    return false;
  }

  // isRendererRequired null-guards, so short-circuiting protects the renderer.render read
  return Boolean(isRendererRequired(renderer) && renderer.render);
}

function isRendererAlreadyGated(renderer) {
  return renderer[OUTSTREAM_GATED];
}

function setRendererAsGated(renderer) {
  Object.defineProperty(renderer, OUTSTREAM_GATED, { value: true, enumerable: false, configurable: true }); // non-enumerable so JSON.stringify(bid) cannot see it
}

/**
 * asks the client whether this creative may render. No gate published means yes.
 * @param {Object} bid
 * @return {boolean}
 */
function shouldRenderOutstream(bid) {
  const outstreamAPI = getOutstreamAPI();

  return !outstreamAPI || outstreamAPI.shouldRender(bid);
}

/**
 * replaces the renderer's render() with one that consults the client first. If the client is still
 * loading the invocation is parked and replayed once it resolves, either way.
 *
 * Takes the renderer and reads the bid from the render arguments, never from this scope. An adapter
 * may install one Renderer for every outstream bid it makes (ozone caches a single instance at
 * module scope), and the renderer is wrapped only once, so a bid captured here would be the wrong
 * one for every later render through the same object. prebid's executeRenderer has passed the bid
 * first since v8.
 * @param {Object} renderer
 */
function gateOutstreamRender(renderer) {
  const originalRender = renderer.render;

  renderer.render = function () {
    const self = this;
    const args = arguments;
    const [bid] = args;

    if (clientLoaded) {
      if (shouldRenderOutstream(bid)) {
        originalRender.apply(self, args);
      }

      return;
    }

    if (clientTimedOut) {
      originalRender.apply(self, args);

      return;
    }

    const renderInvoker = () => originalRender.apply(self, args);
    const videoWaiter = [renderInvoker, bid];

    videoWaiters.push(videoWaiter);
  };

  setRendererAsGated(renderer);
}

/**
 * Test-only: clears the client-load flags so a spec can reach the parked and failed-open branches.
 * The module is a singleton and prebid's adloader mock fires the load callback synchronously, so the
 * flags latch true on the first init(). clientFrame and the load timer are left intact.
 */
export function resetOutstreamGateStateForTesting() {
  clientLoaded = false;
  clientTimedOut = false;
  videoWaiters = [];
}

function onBidResponse(bidResponse, config, userConsent) {
  if (isVastBid(bidResponse)) {
    if (shouldGateOutstreamRender(bidResponse, config.params) && !isRendererAlreadyGated(bidResponse.renderer)) {
      gateOutstreamRender(bidResponse.renderer);
    }

    return;
  }

  conditionallyWrap(bidResponse, config, userConsent);
}

function isBillingMessage(data, params) {
  return data.key === params.key && data.impression;
}

// Fire billable events when our client posts an impression message
function fireBillableEventsForApplicableBids(params) {
  window.addEventListener('message', function (message) {
    const data = message.data;

    if (isBillingMessage(data, params)) {
      const winningBid = auctionManager.findBidByAdId(data.adId);

      events.emit(EVENTS.BILLABLE_EVENT, {
        vendor: SUBMODULE_NAME,
        billingId: data.impressionId,
        type: winningBid ? 'impression' : data.type,
        transactionId: winningBid?.transactionId || data.transactionId,
        auctionId: winningBid?.auctionId || data.auctionId,
        bidId: winningBid?.requestId || data.requestId
      });
    }
  });
}

// Loads the geoedge in-page script that monitors all ad slots created by GPT
function setupInPage(params) {
  window.grumi = params;
  window.grumi.fromPrebid = true;
  loadExternalScript(getInPageUrl(params.key), MODULE_TYPE_RTD, SUBMODULE_NAME);
}

function init(config, userConsent) {
  const params = config.params;
  if (!params || !params.key) {
    logError('missing key for geoedge RTD module provider');
    return false;
  }
  if (params.gpt) {
    setupInPage(params);
  } else {
    fetchWrapper(setWrapper);
    loadClientInIframe(params.key, params.outstream, params.bidders);
  }
  fireBillableEventsForApplicableBids(params);

  return true;
}

export const geoedgeSubmodule = {
  name: SUBMODULE_NAME,
  init,
  onBidResponseEvent: onBidResponse
};

submodule('realTimeData', geoedgeSubmodule);
