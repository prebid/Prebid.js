import * as utils from 'src/utils';
import { formatQS as buildQueryString } from '../src/url';
import { registerBidder } from 'src/adapters/bidderFactory';

/**
 * @module {BidderSpec} YieldbotBidAdapter
 * @description Adapter for requesting bids from Yieldbot
 * @see BidderSpec
 * @author [elljoh]{@link https://github.com/elljoh}
 * @private
 */
export const YieldbotAdapter = {
  _adapterLoaded: Date.now(),
  _navigationStart: 0,
  /**
   * @description Yieldbot adapter internal constants
   * @constant
   * @memberof module:YieldbotBidAdapter
   * @property {string} VERSION Yieldbot adapter version string: <pre>'pbjs-{major}.{minor}.{patch}'</pre>
   * @property {string} CURRENCY 3-letter ISO 4217 code defining the currency of the bid
   * @property {boolean} NET_REVENUE Bid value is net or gross. True = Net
   * @property {string} DEFAULT_REQUEST_URL_PREFIX Request Url prefix to use when ad server response has not provided availability zone specific prefix
   * @property {string} REQUEST_API_VERSION Yieldbot request API Url path parameter
   * @property {string} REQUEST_API_PATH_BID Yieldbot bid request API path component
   * @property {string} REQUEST_API_PATH_CREATIVE Yieldbot ad markup request API path component
   * @property {string} REQUEST_API_PATH_IMRESSION Yieldbot ad impression request API path component
   * @property {string} REQUEST_PARAMS_TERMINATOR Yieldbot request query parameters termination character
   * @property {number} USER_ID_TIMEOUT
   * @property {number} VISIT_ID_TIMEOUT
   * @property {number} SESSION_ID_TIMEOUT
   * @property {object} IFRAME_TYPE the iFrame type in which a ad markup request is made
   * @property {string} IFRAME_TYPE.NONE not in an iFrame
   * @property {string} IFRAME_TYPE.SAME_ORIGIN in an iFrame with the same origin aka "friendly"
   * @property {string} IFRAME_TYPE.CROSS_ORIGIN in an iFrame with a different origin aka "unfriendly"
   * @property {object} REQUEST_PARAMS Request Url query parameter names
   * @property {string} REQUEST_PARAMS.ADAPTER_VERSION The version of the YieldbotAdapter code. See [VERSION]{@link module:YieldbotBidAdapter.CONSTANTS}.
   * @property {string} REQUEST_PARAMS.USER_ID First party user identifier
   * @property {string} REQUEST_PARAMS.SESSION_ID Publisher site visit session identifier
   * @property {string} REQUEST_PARAMS.PAGEVIEW_ID Page visit identifier
   * @property {string} REQUEST_PARAMS.AD_REQUEST_ID Yieldbot ad request identifier
   * @property {string} REQUEST_PARAMS.AD_REQUEST_SLOT Slot name for Yieldbot ad markup request e.g. <pre>&lt;slot name&gt;:&lt;width&gt;x&lt;height&gt;</pre>
   * @property {string} REQUEST_PARAMS.PAGEVIEW_DEPTH Counter for page visits in a session
   * @property {string} [REQUEST_PARAMS.LAST_PAGEVIEW_ID] Pageview identifier for the last pageview within the session TTL
   * @property {string} REQUEST_PARAMS.BID_SLOT_NAME Yieldbot slot name to request bid for
   * @property {string} REQUEST_PARAMS.BID_SLOT_SIZE Dimensions for the respective bid slot name
   * @property {string} REQUEST_PARAMS.LOCATION The page visit location Url
   * @property {string} REQUEST_PARAMS.REFERRER The referring page Url
   * @property {string} REQUEST_PARAMS.SCREEN_DIMENSIONS User-agent screen dimensions
   * @property {string} REQUEST_PARAMS.TIMEZONE_OFFSET Number of hours offset from UTC
   * @property {string} REQUEST_PARAMS.LANGUAGE Language and locale of the user-agent
   * @property {string} REQUEST_PARAMS.NAVIGATION_PLATFORM User-agent browsing platform
   * @property {string} REQUEST_PARAMS.USER_AGENT User-Agent string
   * @property {string} [REQUEST_PARAMS.LAST_PAGEVIEW_TIME] Time in milliseconds since the last page visit
   * @property {string} REQUEST_PARAMS.NAVIGATION_START_TIME Performance timing navigationStart
   * @property {string} REQUEST_PARAMS.ADAPTER_LOADED_TIME Adapter code interpreting started timestamp, in milliseconds since the UNIX epoch
   * @property {string} REQUEST_PARAMS.BID_REQUEST_TIME Yieldbot bid request sent timestamp, in milliseconds since the UNIX epoch
   * @property {string} REQUEST_PARAMS.BID_RESPONSE_TIME Yieldbot bid response processing started timestamp, in milliseconds since the UNIX epoch
   * @property {string} REQUEST_PARAMS.AD_REQUEST_TIME Yieldbot ad creative request sent timestamp, in milliseconds since the UNIX epoch
   * @property {string} REQUEST_PARAMS.AD_RENDER_TIME Yieldbot ad creative render started timestamp, in milliseconds since the UNIX epoch
   * @property {string} REQUEST_PARAMS.AD_IMPRESSION_TIME Yieldbot ad impression rerquest sent  timestamp, in milliseconds since the UNIX epoch
   * @property {string} [REQUEST_PARAMS.INTERSECTION_OBSERVER_AVAILABLE] Indicator that the user-agent supports the Intersection Observer API
   * @property {string} [REQUEST_PARAMS.IFRAME_TYPE] Indicator to specify Yieldbot creative rendering occured in a same (<code>so</code>) or cross (<code>co</code>) origin iFrame
   * @property {string} [REQUEST_PARAMS.BID_TYPE] Yieldbot bid request type: initial or refresh
   * @property {string} REQUEST_PARAMS.CALLBACK Ad creative render callback
   * @property {string} REQUEST_PARAMS.SESSION_BLOCKED Yieldbot ads blocked by user opt-out or suspicious activity detected during session
   * @property {string} [REQUEST_PARAMS.ADAPTER_ERROR] Yieldbot error description parameter
   * @property {string} [REQUEST_PARAMS.TERMINATOR] Yieldbot search parameters terminator
   * @property {object} COOKIES Cookie name suffixes set by Yieldbot. See also <code>YieldbotAdapter._COOKIE_PREFIX</code>
   * @property {string} COOKIES.SESSION_BLOCKED The user session is blocked for bids
   * @property {string} COOKIES.SESSION_ID The user session identifier
   * @property {string} COOKIES.PAGEVIEW_DEPTH The session pageview depth
   * @property {string} COOKIES.USER_ID The Yieldbot first-party user identifier
   * @property {string} COOKIES.LAST_PAGEVIEW_ID The last pageview identifier within the session TTL
   * @property {string} COOKIES.PREVIOUS_VISIT The time in [ms] since the last visit within the session TTL
   * @property {string} COOKIES.URL_PREFIX Geo/IP proximity request Url domain
   * @TODO Document parameter optionality for properties
   */
  CONSTANTS: {
    VERSION: 'pbjs-yb-1.0.0',
    CURRENCY: 'USD',
    NET_REVENUE: true,
    DEFAULT_REQUEST_URL_PREFIX: '//i.yldbt.com/m/',
    REQUEST_API_VERSION: '/v1',
    REQUEST_API_PATH_BID: '/init',
    REQUEST_API_PATH_CREATIVE: '/ad/creative.js',
    REQUEST_API_PATH_IMPRESSION: '/ad/impression.gif',
    REQUEST_PARAMS_TERMINATOR: '&e',
    USER_ID_TIMEOUT: 2592000000,
    VISIT_ID_TIMEOUT: 2592000000,
    SESSION_ID_TIMEOUT: 180000,
    IFRAME_TYPE: {
      NONE: 'none',
      SAME_ORIGIN: 'so',
      CROSS_ORIGIN: 'co'
    },
    REQUEST_PARAMS: {
      ADAPTER_VERSION: 'v',
      USER_ID: 'vi',
      SESSION_ID: 'si',
      PAGEVIEW_ID: 'pvi',
      AD_REQUEST_ID: 'ri',
      AD_REQUEST_SLOT: 'slot',
      PAGEVIEW_DEPTH: 'pvd',
      LAST_PAGEVIEW_ID: 'lpvi',
      BID_SLOT_NAME: 'sn',
      BID_SLOT_SIZE: 'ssz',
      LOCATION: 'lo',
      REFERRER: 'r',
      SCREEN_DIMENSIONS: 'sd',
      TIMEZONE_OFFSET: 'to',
      LANGUAGE: 'la',
      NAVIGATOR_PLATFORM: 'np',
      USER_AGENT: 'ua',
      LAST_PAGEVIEW_TIME: 'lpv',
      NAVIGATION_START_TIME: 'cts_ns',
      ADAPTER_LOADED_TIME: 'cts_js',
      BID_REQUEST_TIME: 'cts_ini',
      BID_RESPONSE_TIME: 'cts_res',
      AD_REQUEST_TIME: 'cts_ad',
      AD_RENDER_TIME: 'cts_rend',
      AD_IMPRESSION_TIME: 'cts_imp',
      INTERSECTION_OBSERVER_AVAILABLE: 'ioa',
      IFRAME_TYPE: 'it',
      BID_TYPE: 'bt',
      CALLBACK: 'cb',
      MEDIA_TYPE: 'mtp',
      SESSION_BLOCKED: 'sb',
      ADAPTER_ERROR: 'apie',
      TERMINATOR: 'e'
    },
    COOKIES: {
      SESSION_BLOCKED: '__ybot_n',
      SESSION_ID: '__ybot_si',
      PAGEVIEW_DEPTH: '__ybot_pvd',
      USER_ID: '__ybot_vi',
      LAST_PAGEVIEW_ID: '__ybot_lpvi',
      PREVIOUS_VISIT: '__ybot_v',
      URL_PREFIX: '__ybot_c'
    }
  },
  _bidRequestCount: 0,
  _pageviewDepth: 0,
  _lastPageviewId: '',
  _sessionBlocked: false,
  _isInitialized: false,

  initialize: function() {
    if (!this._isInitialized) {
      this._pageviewDepth = this.pageviewDepth;
      this._sessionBlocked = this.sessionBlocked;
      this._isInitialized = true;
    }
  },

  /**
   * Is the user session blocked by the Yieldbot adserver.<br>
   * The Yieldbot adserver may return <code>"block_session": true</code> in a bid response.
   * A session may be blocked for efficiency (i.e. Yieldbot has decided no to bid for the session),
   * security and/or fraud detection.
   * @returns {boolean}
   * @readonly
   * @memberof module:YieldbotBidAdapter
   * @private
   */
  get sessionBlocked() {
    const cookieName = this.CONSTANTS.COOKIES.SESSION_BLOCKED;
    const cookieValue = this.getCookie(cookieName);
    const sessionBlocked = cookieValue ? parseInt(cookieValue, 10) || 0 : 0;
    if (sessionBlocked) {
      this.setCookie(cookieName, 1, this.CONSTANTS.SESSION_ID_TIMEOUT, '/');
    }
    this._sessionBlocked = !!sessionBlocked;
    return this._sessionBlocked;
  },

  set sessionBlocked(blockSession) {
    const cookieName = this.CONSTANTS.COOKIES.SESSION_BLOCKED;
    const sessionBlocked = blockSession ? 1 : 0;
    this.setCookie(cookieName, sessionBlocked, this.CONSTANTS.SESSION_ID_TIMEOUT, '/');
    return !!sessionBlocked;
  },

  get userId() {
    const cookieName = this.CONSTANTS.COOKIES.USER_ID;
    let cookieValue = this.getCookie(cookieName);
    if (!cookieValue) {
      cookieValue = this.newId();
      this.setCookie(cookieName, cookieValue, this.CONSTANTS.USER_ID_TIMEOUT, '/');
    }
    return cookieValue;
  },

  get sessionId() {
    const cookieName = this.CONSTANTS.COOKIES.SESSION_ID;
    let cookieValue = this.getCookie(cookieName);
    if (!cookieValue) {
      cookieValue = this.newId();
      this.setCookie(cookieName, cookieValue, this.CONSTANTS.SESSION_ID_TIMEOUT, '/');
    }
    return cookieValue;
  },

  get pageviewDepth() {
    const cookieName = this.CONSTANTS.COOKIES.PAGEVIEW_DEPTH;
    let cookieValue = parseInt(this.getCookie(cookieName), 10) || 0;
    cookieValue++;
    this.setCookie(cookieName, cookieValue, this.CONSTANTS.SESSION_ID_TIMEOUT, '/');
    return cookieValue;
  },

  get lastPageviewId() {
    const cookieName = this.CONSTANTS.COOKIES.LAST_PAGEVIEW_ID;
    let cookieValue = this.getCookie(cookieName);
    return cookieValue || '';
  },

  set lastPageviewId(id) {
    const cookieName = this.CONSTANTS.COOKIES.LAST_PAGEVIEW_ID;
    return this.setCookie(cookieName, id, this.CONSTANTS.SESSION_ID_TIMEOUT, '/');
  },

  get lastPageviewTime() {
    const cookieName = this.CONSTANTS.COOKIES.PREVIOUS_VISIT;
    let cookieValue = this.getCookie(cookieName);
    return cookieValue ? parseInt(cookieValue, 10) : 0;
  },

  set lastPageviewTime(ts) {
    const cookieName = this.CONSTANTS.COOKIES.PREVIOUS_VISIT;
    return this.setCookie(cookieName, ts, this.CONSTANTS.SESSION_ID_TIMEOUT, '/');
  },

  /**
   * Get/set the request base url used to form bid, ad markup and impression requests.
   * @param {string} [prefix] the bidder request base url
   * @returns {string} the request base Url string
   * @memberof module:YieldbotBidAdapter
   */
  urlPrefix: function(prefix) {
    const cookieName = this.CONSTANTS.COOKIES.URL_PREFIX;
    const pIdx = prefix ? prefix.indexOf(':') : -1;
    const url = pIdx !== -1 ? document.location.protocol + prefix.substr(pIdx + 1) : null;
    let cookieValue = url || this.getCookie(cookieName);
    if (!cookieValue) {
      cookieValue = this.CONSTANTS.DEFAULT_REQUEST_URL_PREFIX;
    }
    this.setCookie(cookieName, cookieValue, this.CONSTANTS.SESSION_ID_TIMEOUT, '/');
    return cookieValue;
  },

  /**
   * Bidder identifier code.
   * @type {string}
   * @constant
   * @memberof module:YieldbotBidAdapter
   */
  get code() { return 'yieldbot'; },

  /**
   * A list of aliases which should also resolve to this bidder.
   * @type {string[]}
   * @constant
   * @memberof module:YieldbotBidAdapter
   */
  get aliases() { return []; },

  /**
   * @property {MediaType[]} [supportedMediaTypes]: A list of Media Types which the adapter supports.
   * @constant
   * @memberof module:YieldbotBidAdapter
   */
  get supportedMediaTypes() { return ['banner']; },

  /**
   * Determines whether or not the given bid request is valid.
   *
   * @param {BidRequest} bid The bid params to validate.
   * @returns {boolean} True if this is a valid bid, and false otherwise.
   * @memberof module:YieldbotBidAdapter
   */
  isBidRequestValid: function(bid) {
    let invalidSizeArray = false;
    if (utils.isArray(bid.sizes)) {
      const arr = bid.sizes.reduce((acc, cur) => acc.concat(cur), []).filter((item) => {
        return !utils.isNumber(item);
      });
      invalidSizeArray = arr.length !== 0;
    }
    const ret = bid &&
            bid.params &&
            utils.isStr(bid.params.psn) &&
            utils.isStr(bid.params.slot) &&
            !invalidSizeArray &&
            !!bid.params.psn &&
      !!bid.params.slot;
    return ret;
  },

  /**
   * Make a server request from the list of BidRequests.
   *
   * @param {BidRequest[]} bidRequests A non-empty list of bid requests which should be sent to the Server.
   * @return ServerRequest Info describing the request to the server.
   * @memberof module:YieldbotBidAdapter
   */
  buildRequests: function(bidRequests) {
    const requests = [];
    if (!this._optOut && !this.sessionBlocked) {
      const searchParams = this.initBidRequestParams();
      this._bidRequestCount++;

      const pageviewIdToMap = searchParams[this.CONSTANTS.REQUEST_PARAMS.PAGEVIEW_ID];

      const yieldbotSlotParams = this.getSlotRequestParams(pageviewIdToMap, bidRequests);

      searchParams[this.CONSTANTS.REQUEST_PARAMS.BID_SLOT_NAME] =
        yieldbotSlotParams[this.CONSTANTS.REQUEST_PARAMS.BID_SLOT_NAME] || '';

      searchParams[this.CONSTANTS.REQUEST_PARAMS.BID_SLOT_SIZE] =
        yieldbotSlotParams[this.CONSTANTS.REQUEST_PARAMS.BID_SLOT_SIZE] || '';

      const bidUrl = this.urlPrefix() +
              yieldbotSlotParams.psn +
              this.CONSTANTS.REQUEST_API_VERSION +
              this.CONSTANTS.REQUEST_API_PATH_BID;

      searchParams[this.CONSTANTS.REQUEST_PARAMS.BID_REQUEST_TIME] = Date.now();
      requests.push({
        method: 'GET',
        url: bidUrl,
        data: searchParams,
        yieldbotSlotParams: yieldbotSlotParams,
        options: {
          withCredentials: true,
          customHeaders: {
            Accept: 'application/json'
          }
        }
      });
    }
    return requests;
  },

  /**
   * Register the user sync pixels which should be dropped after the auction.
   *
   * @param {SyncOptions} syncOptions Which user syncs are allowed?
   * @param {ServerResponse[]} serverResponses List of server's responses.
   * @return {UserSync[]} The user syncs which should be dropped.
   * @memberof module:YieldbotBidAdapter
   */
  getUserSyncs: function(syncOptions, serverResponses) {
    const userSyncs = [];
    if (syncOptions.pixelEnabled &&
        serverResponses.length > 0 &&
        serverResponses[0].body &&
        serverResponses[0].body.user_syncs &&
        utils.isArray(serverResponses[0].body.user_syncs)) {
      const responseUserSyncs = serverResponses[0].body.user_syncs;
      responseUserSyncs.forEach((pixel) => {
        userSyncs.push({
          type: 'image',
          url: pixel
        });
      });
    }
    return userSyncs;
  },

  /**
   * @typeDef {YieldbotBid} YieldbotBid
   * @type {object}
   * @property {string} slot Yieldbot config param slot
   * @property {string} cpm Yieldbot bid quantity/label
   * @property {string} size Slot dimensions of the form <code>&lt;width&gt;x&lt;height&gt;</code>
   * @memberof module:YieldbotBidAdapter
   */
  /**
   * Unpack the response from the server into a list of bids.
   *
   * @param {ServerResponse} serverResponse A successful response from the server.
   * @param {BidRequest} bidRequest Request object submitted which produced the response.
   * @return {Bid[]} An array of bids which were nested inside the server.
   * @memberof module:YieldbotBidAdapter
   */
  interpretResponse: function(serverResponse, bidRequest) {
    const bidResponses = [];
    const responseBody = serverResponse && serverResponse.body ? serverResponse.body : {};
    this._optOut = responseBody.optout || false;
    if (this._optOut) {
      this.clearAllCookies();
    }
    if (!this._optOut && !this._sessionBlocked) {
      const slotBids = responseBody.slots && responseBody.slots.length > 0 ? responseBody.slots : [];
      slotBids.forEach((bid) => {
        if (bid.slot && bid.size && bid.cpm) {
          const sizeParts = bid.size ? bid.size.split('x') : [1, 1];
          const width = sizeParts[0] || 1;
          const height = sizeParts[1] || 1;
          const cpm = parseInt(bid.cpm, 10) / 100.0 || 0;

          const yieldbotSlotParams = bidRequest.yieldbotSlotParams || null;
          const ybBidId = bidRequest.data[this.CONSTANTS.REQUEST_PARAMS.PAGEVIEW_ID];
          const paramKey = ybBidId +
                  ':' +
                  bid.slot +
                  ':' +
                  bid.size || '';
          const bidIdMap = yieldbotSlotParams && yieldbotSlotParams.bidIdMap ? yieldbotSlotParams.bidIdMap : {};
          const requestId = bidIdMap[paramKey] || '';

          const urlPrefix = this.urlPrefix(responseBody.url_prefix);
          const tagObject = this.buildAdCreativeTag(urlPrefix, bid, bidRequest);
          const bidResponse = {
            requestId: requestId,
            cpm: cpm,
            width: width,
            height: height,
            creativeId: tagObject.creativeId,
            currency: this.CONSTANTS.CURRENCY,
            netRevenue: this.CONSTANTS.NET_REVENUE,
            ttl: this.CONSTANTS.SESSION_ID_TIMEOUT / 1000, // [s]
            ad: tagObject.ad
          };
          bidResponses.push(bidResponse);
        }
      });
    }
    return bidResponses;
  },

  /**
   * Initializes search parameters common to both ad request and impression Urls.
   * @param {string} adRequestId Yieldbot ad request identifier
   * @param {BidRequest} bidRequest The request that is the source of the impression
   * @returns {object} Search parameter key/value pairs
   * @memberof module:YieldbotBidAdapter
   */
  initAdRequestParams: function(adRequestId, bidRequest) {
    let commonSearchParams = {};
    commonSearchParams[this.CONSTANTS.REQUEST_PARAMS.ADAPTER_VERSION] = this.CONSTANTS.VERSION;
    commonSearchParams[this.CONSTANTS.REQUEST_PARAMS.USER_ID] = bidRequest.data.vi || this.CONSTANTS.VERSION + '-vi';
    commonSearchParams[this.CONSTANTS.REQUEST_PARAMS.SESSION_ID] = bidRequest.data.si || this.CONSTANTS.VERSION + '-si';
    commonSearchParams[this.CONSTANTS.REQUEST_PARAMS.PAGEVIEW_ID] = bidRequest.data.pvi || this.CONSTANTS.VERSION + '-pvi';
    commonSearchParams[this.CONSTANTS.REQUEST_PARAMS.AD_REQUEST_ID] = adRequestId;
    return commonSearchParams;
  },

  buildAdUrl: function(urlPrefix, publisherNumber, commonSearchParams, bid) {
    const searchParams = Object.assign({}, commonSearchParams);
    searchParams[this.CONSTANTS.REQUEST_PARAMS.BID_RESPONSE_TIME] = Date.now();
    searchParams[this.CONSTANTS.REQUEST_PARAMS.AD_REQUEST_SLOT] = bid.slot + ':' + bid.size;
    searchParams[this.CONSTANTS.REQUEST_PARAMS.INTERSECTION_OBSERVER_AVAILABLE] = this.intersectionObserverAvailable(window);

    const queryString = buildQueryString(searchParams) || '';
    const adUrl = urlPrefix +
            publisherNumber +
            this.CONSTANTS.REQUEST_API_PATH_CREATIVE +
            '?' +
            queryString;
    return adUrl;
  },

  buildImpressionUrl: function(urlPrefix, publisherNumber, commonSearchParams) {
    const searchParams = Object.assign({}, commonSearchParams);
    const queryString = buildQueryString(searchParams) || '';
    const impressionUrl = urlPrefix +
            publisherNumber +
            this.CONSTANTS.REQUEST_API_PATH_IMPRESSION +
            '?' +
            queryString;
    return impressionUrl;
  },

  /**
   * Object with Yieldbot ad markup representation and unique creative identifier.
   * @typeDef {TagObject} TagObject
   * @type {object}
   * @property {string} creativeId bidder specific creative identifier for tracking at the source
   * @property {string} ad ad creative markup
   * @memberof module:YieldbotBidAdapter
   */
  /**
   * Builds the ad creative markup.
   * @param {string} urlPrefix base url for Yieldbot requests
   * @param {module:YieldbotBidAdapter.YieldbotBid} bid Bidder slot bid object
   * @returns {module:YieldbotBidAdapter.TagObject}
   * @memberof module:YieldbotBidAdapter
   */
  buildAdCreativeTag: function(urlPrefix, bid, bidRequest) {
    const ybotAdRequestId = this.newId();
    const commonSearchParams = this.initAdRequestParams(ybotAdRequestId, bidRequest);
    const publisherNumber = bidRequest && bidRequest.yieldbotSlotParams ? bidRequest.yieldbotSlotParams.psn || '' : '';
    const adUrl = this.buildAdUrl(urlPrefix, publisherNumber, commonSearchParams, bid);
    const impressionUrl = this.buildImpressionUrl(urlPrefix, publisherNumber, commonSearchParams);

    let htmlMarkup = `<div id="ybot-${ybotAdRequestId}"></div>
<script type="text/javascript">
  var yieldbot = {
    iframeType: function (win) {
      var it = 'none';
      while (win !== window.top) {
        try {
          win = win.parent;
          var doc = win.document;
          it = doc ? 'so' : 'co';
        } catch (e) {
          it = 'co';
        }
      }
      return it;
    },
    '_render': function(data) {
      try {
        yieldbot['cts_rend_' + '${ybotAdRequestId}'] = Date.now();
        var bodyHtml = data.html,
        width = data.size[0] || 0,
        height = data.size[1] || 0,
        divEl = document.createElement('div');
        divEl.style.width = width + 'px';
        divEl.style.height = height + 'px';
        divEl.className = 'ybot-creative creative-wrapper';

        var containerEl = document.getElementById(data.wrapper_id || 'ybot-' + data.request_id);
        containerEl.appendChild(divEl);

        var iframeHtml = '<!DOCTYPE html><head><meta charset=utf-8><style>' +
           data.style +
           '</style></head><body>' +
           data.html +
           '</body>',
        innerFrame = document.createElement('iframe');
        innerFrame.width = width;
        innerFrame.height = height;
        innerFrame.scrolling = 'no';
        innerFrame.marginWidth = '0';
        innerFrame.marginHeight = '0';
        innerFrame.frameBorder = '0';
        innerFrame.style.border = '0px';
        innerFrame.style['vertical-align'] = 'bottom';
        innerFrame.id = 'ybot-' + data.request_id + '-iframe';
        divEl.appendChild(innerFrame);
        var innerFrameDoc = innerFrame.contentWindow.document;
        innerFrameDoc.open();
        innerFrameDoc.write(iframeHtml);
        innerFrameDoc.close();

        var image = new Image(1, 1);
        image.onload = function () {};
        var cts_rend = yieldbot['cts_rend_' + '${ybotAdRequestId}'] || 0;
        image.src = '${impressionUrl}' + '&cts_imp=' + Date.now() + '&cts_rend=' + cts_rend + '&e';
      } catch(err) {}
    }
  };
</script>
<script type="text/javascript">
  var jsEl = document.createElement('script');
  var src = '${adUrl}' + '&it=' + yieldbot.iframeType(window) + '&cts_ad=' + Date.now() + '&e';
  jsEl.src = src;
  var firstEl = document.getElementsByTagName('script')[0];
  firstEl.parentNode.insertBefore(jsEl, firstEl);
</script>`;
    return { ad: htmlMarkup, creativeId: ybotAdRequestId };
  },
  iframeType: function (win) {
    let it = this.CONSTANTS.IFRAME_TYPE.NONE;
    while (win !== window.top) {
      try {
        win = win.parent;
        const doc = win.document;
        it = doc ? this.CONSTANTS.IFRAME_TYPE.SAME_ORIGIN : this.CONSTANTS.IFRAME_TYPE.CROSS_ORIGIN;
      } catch (e) {
        it = this.CONSTANTS.IFRAME_TYPE.CROSS_ORIGIN;
      }
    }
    return it;
  },

  intersectionObserverAvailable: function (win) {
    /* Ref:
     * https://github.com/w3c/IntersectionObserver/blob/gh-pages/polyfill/intersection-observer.js#L23-L25
     */
    return win &&
      win.IntersectionObserver &&
      win.IntersectionObserverEntry &&
      win.IntersectionObserverEntry.prototype &&
      'intersectionRatio' in win.IntersectionObserverEntry.prototype;
  },

  /**
   * @typeDef {BidParams} BidParams
   * @property {string} psn Yieldbot publisher customer number
   * @property {object} searchParams bid request Url search parameters
   * @property {object} searchParams.sn slot names
   * @property {object} searchParams.szz slot sizes
   * @memberof module:YieldbotBidAdapter
   * @private
   */
  /**
   * Builds the common Yieldbot bid request Url query parameters.<br>
   * Slot bid related parameters are handled separately. The so-called common parameters
   * here are request identifiers, page properties and user-agent attributes.
   * @returns {object} query parameter key/value items
   * @memberof module:YieldbotBidAdapter
   */
  initBidRequestParams: function() {
    const params = {};

    params[this.CONSTANTS.REQUEST_PARAMS.ADAPTER_LOADED_TIME] = this._adapterLoaded;
    params[this.CONSTANTS.REQUEST_PARAMS.NAVIGATION_START_TIME] = this._navigationStart;
    params[this.CONSTANTS.REQUEST_PARAMS.ADAPTER_VERSION] = this.CONSTANTS.VERSION;

    const userId = this.userId;
    const sessionId = this.sessionId;
    const pageviewId = this.newId();
    const currentBidTime = Date.now();
    const lastBidTime = this.lastPageviewTime;
    const lastBidId = this.lastPageviewId;
    this.lastPageviewTime = currentBidTime;
    this.lastPageviewId = pageviewId;
    params[this.CONSTANTS.REQUEST_PARAMS.USER_ID] = userId;
    params[this.CONSTANTS.REQUEST_PARAMS.SESSION_ID] = sessionId;
    params[this.CONSTANTS.REQUEST_PARAMS.PAGEVIEW_DEPTH] = this._pageviewDepth;
    params[this.CONSTANTS.REQUEST_PARAMS.PAGEVIEW_ID] = pageviewId;
    params[this.CONSTANTS.REQUEST_PARAMS.LAST_PAGEVIEW_TIME] = lastBidTime;
    params[this.CONSTANTS.REQUEST_PARAMS.LAST_PAGEVIEW_ID] = lastBidId;
    params[this.CONSTANTS.REQUEST_PARAMS.BID_TYPE] = this._bidRequestCount === 0 ? 'init' : 'refresh';

    params[this.CONSTANTS.REQUEST_PARAMS.USER_AGENT] = navigator.userAgent;
    params[this.CONSTANTS.REQUEST_PARAMS.NAVIGATOR_PLATFORM] = navigator.platform;
    params[this.CONSTANTS.REQUEST_PARAMS.LANGUAGE] =
      navigator.browserLanguage ? navigator.browserLanguage : navigator.language;
    params[this.CONSTANTS.REQUEST_PARAMS.TIMEZONE_OFFSET] =
      (new Date()).getTimezoneOffset() / 60;
    params[this.CONSTANTS.REQUEST_PARAMS.SCREEN_DIMENSIONS] =
      window.screen.width + 'x' + window.screen.height;

    params[this.CONSTANTS.REQUEST_PARAMS.LOCATION] = utils.getTopWindowUrl();
    params[this.CONSTANTS.REQUEST_PARAMS.REFERRER] = utils.getTopWindowReferrer();

    params[this.CONSTANTS.REQUEST_PARAMS.TERMINATOR] = '';

    return params;
  },

  /**
   * Bid mapping key to the Prebid internal bidRequestId<br>
   * Format <code>{pageview id}:{slot name}:{width}x{height}</code>
   * @typeDef {BidRequestKey} BidRequestKey
   * @type {string}
   * @example "jbgxsxqxyxvqm2oud7:leaderboard:728x90"
   * @memberof module:YieldbotBidAdapter
   */

  /**
   * Internal Yieldbot adapter bid and ad markup request state
   * <br>
   * When interpreting a server response, the associated requestId is lookeded up
   * in this map when creating a {@link Bid} response object.
   * @typeDef {BidRequestMapping} BidRequestMapping
   * @type {object}
   * @property {Object.<module:YieldbotBidAdapter.BidRequestKey, string>} {*} Yieldbot bid to requestId mapping item
   * @memberof module:YieldbotBidAdapter
   * @example
   * {
   *   "jbgxsxqxyxvqm2oud7:leaderboard:728x90": "2b7e31676ce17",
   *   "jbgxsxqxyxvqm2oud7:medrec:300x250": "2b7e31676cd89",
   *   "jcrvvd6eoileb8w8ko:medrec:300x250": "2b7e316788ca7"
   * }
   * @memberof module:YieldbotBidAdapter
   */

  /**
   * Rationalized set of Yieldbot bids for adUnits and mapping to respective Prebid.js bidId.
   * @typeDef {BidSlots} BidSlots
   * @property {string} psn Yieldbot publisher site identifier taken from bidder params
   * @property {string} sn slot names
   * @property {string} szz slot sizes
   * @property {module:YieldbotBidAdapter.BidRequestMapping} bidIdMap Yieldbot bid to Prebid bidId mapping
   * @memberof module:YieldbotBidAdapter
   */

  /**
   * Gets unique slot name and sizes for query parameters object
   * @param {string} pageviewId The Yieldbot bid request identifier
   * @param {BidRequest[]} bidRequests A non-empty list of bid requests which should be sent to the Server
   * @returns {module:YieldbotBidAdapter.BidSlots} Yieldbot specific bid parameters and bid identifier mapping
   * @memberof module:YieldbotBidAdapter
   */
  getSlotRequestParams: function(pageviewId, bidRequests) {
    const params = {};
    const bidIdMap = {};
    bidRequests = bidRequests || [];
    pageviewId = pageviewId || '';
    try {
      const slotBids = {};
      bidRequests.forEach((bid) => {
        params.psn = params.psn || bid.params.psn || '';
        utils.parseSizesInput(bid.sizes).forEach(sz => {
          const slotName = bid.params.slot;
          if (sz && (!slotBids[slotName] || !slotBids[slotName].some(existingSize => existingSize === sz))) {
            slotBids[slotName] = slotBids[slotName] || [];
            slotBids[slotName].push(sz);
            const paramKey = pageviewId + ':' + slotName + ':' + sz;
            bidIdMap[paramKey] = bid.bidId;
          }
        });
      });

      const nm = [];
      const sz = [];
      for (let idx in slotBids) {
        const slotName = idx;
        const slotSizes = slotBids[idx];
        nm.push(slotName);
        sz.push(slotSizes.join('.'));
      }
      params[this.CONSTANTS.REQUEST_PARAMS.BID_SLOT_NAME] = nm.join('|');
      params[this.CONSTANTS.REQUEST_PARAMS.BID_SLOT_SIZE] = sz.join('|');

      params.bidIdMap = bidIdMap;
    } catch (err) {}
    return params;
  },

  getCookie: function(name) {
    const cookies = document.cookie.split(';');
    let value = null;
    for (let idx = 0; idx < cookies.length; idx++) {
      const item = cookies[idx].split('=');
      const itemName = item[0].replace(/^\s+|\s+$/g, '');
      if (itemName == name) {
        value = item.length > 1 ? decodeURIComponent(item[1].replace(/^\s+|\s+$/g, '')) : null;
        break;
      }
    }
    return value;
  },

  setCookie: function(name, value, expireMillis, path, domain, secure) {
    const expireTime = expireMillis ? new Date(Date.now() + expireMillis).toGMTString() : '';
    const dataValue = encodeURIComponent(value);
    const docLocation = path || '';
    const pageDomain = domain || '';
    const httpsOnly = secure ? ';secure' : '';

    const cookieStr = `${name}=${dataValue};expires=${expireTime};path=${docLocation};domain=${pageDomain}${httpsOnly}`;
    document.cookie = cookieStr;
  },

  deleteCookie: function(name, path, domain, secure) {
    return this.setCookie(name, '', -1, path, domain, secure);
  },

  /**
   * Clear all first-party cookies.
   * See [CONSTANTS.COOKIES]{@link module:YieldbotBidAdapter.CONSTANTS}.
   */
  clearAllCookies: function() {
    for (let label in this.CONSTANTS.COOKIES) {
      if (this.CONSTANTS.COOKIES.hasOwnProperty(label)) {
        this.deleteCookie(this.CONSTANTS.COOKIES[label]);
      }
    }
  },

  /**
   * Generate a new Yieldbot format id<br>
   * Base 36 and lowercase: <[ms] since epoch><[base36]{10}>
   * @example "jbgxsyrlx9fxnr1hbl"
   * @private
   */
  newId: function() {
    return (+new Date()).toString(36) + 'xxxxxxxxxx'
      .replace(/[x]/g, function() {
        return (0 | Math.random() * 36).toString(36);
      });
  },

  /**
   * Create a delegate function with 'this' context of the YieldbotAdapter object.
   * @param {object} instance Object for 'this' context in function apply
   * @param {function} fn Function to execute in instance context
   * @returns {function} the provided function bound to the instance context
   * @memberof module:YieldbotBidAdapter
   */
  createDelegate: function(instance, fn) {
    var outerArgs = Array.prototype.slice.call(arguments, 2);
    return function() {
      return fn.apply(instance, outerArgs.length > 0 ? Array.prototype.slice.call(arguments, 0).concat(outerArgs) : arguments);
    };
  }
};

YieldbotAdapter.initialize();

export const spec = {
  code: YieldbotAdapter.code,
  aliases: YieldbotAdapter.aliases,
  supportedMediaTypes: YieldbotAdapter.supportedMediaTypes,
  isBidRequestValid: YieldbotAdapter.createDelegate(YieldbotAdapter, YieldbotAdapter.isBidRequestValid),
  buildRequests: YieldbotAdapter.createDelegate(YieldbotAdapter, YieldbotAdapter.buildRequests),
  interpretResponse: YieldbotAdapter.createDelegate(YieldbotAdapter, YieldbotAdapter.interpretResponse),
  getUserSyncs: YieldbotAdapter.createDelegate(YieldbotAdapter, YieldbotAdapter.getUserSyncs)
};

YieldbotAdapter._navigationStart = Date.now();
registerBidder(spec);
