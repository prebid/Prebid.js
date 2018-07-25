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
  _adapterLoaded: utils.timestamp(),
  _navigationStart: 0,
  _version: 'pbjs-yb-0.0.1',
  _bidRequestCount: 0,
  _pageviewDepth: 0,
  _lastPageviewId: '',
  _sessionBlocked: false,
  _isInitialized: false,
  _sessionTimeout: 180000,
  _userTimeout: 2592000000,
  _cookieLabels: ['n', 'u', 'si', 'pvd', 'lpv', 'lpvi', 'c'],

  initialize: function() {
    if (!this._isInitialized) {
      this._pageviewDepth = this.pageviewDepth;
      this._sessionBlocked = this.sessionBlocked;
      this._isInitialized = true;
    }
  },

  /**
   * Adapter version
   * <code>pbjs-yb-x.x.x</code>
   * @returns {string} The adapter version string
   * @memberof module:YieldbotBidAdapter
   */
  get version() {
    return this._version;
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
    const cookieName = '__ybotn';
    const cookieValue = this.getCookie(cookieName);
    const sessionBlocked = cookieValue ? parseInt(cookieValue, 10) || 0 : 0;
    if (sessionBlocked) {
      this.setCookie(cookieName, 1, this._sessionTimeout, '/');
    }
    this._sessionBlocked = !!sessionBlocked;
    return this._sessionBlocked;
  },

  set sessionBlocked(blockSession) {
    const cookieName = '__ybotn';
    const sessionBlocked = blockSession ? 1 : 0;
    this.setCookie(cookieName, sessionBlocked, this._sessionTimeout, '/');
  },

  get userId() {
    const cookieName = '__ybotu';
    let cookieValue = this.getCookie(cookieName);
    if (!cookieValue) {
      cookieValue = this.newId();
      this.setCookie(cookieName, cookieValue, this._userTimeout, '/');
    }
    return cookieValue;
  },

  get sessionId() {
    const cookieName = '__ybotsi';
    let cookieValue = this.getCookie(cookieName);
    if (!cookieValue) {
      cookieValue = this.newId();
      this.setCookie(cookieName, cookieValue, this._sessionTimeout, '/');
    }
    return cookieValue;
  },

  get pageviewDepth() {
    const cookieName = '__ybotpvd';
    let cookieValue = parseInt(this.getCookie(cookieName), 10) || 0;
    cookieValue++;
    this.setCookie(cookieName, cookieValue, this._sessionTimeout, '/');
    return cookieValue;
  },

  get lastPageviewId() {
    const cookieName = '__ybotlpvi';
    let cookieValue = this.getCookie(cookieName);
    return cookieValue || '';
  },

  set lastPageviewId(id) {
    const cookieName = '__ybotlpvi';
    this.setCookie(cookieName, id, this._sessionTimeout, '/');
  },

  get lastPageviewTime() {
    const cookieName = '__ybotlpv';
    let cookieValue = this.getCookie(cookieName);
    return cookieValue ? parseInt(cookieValue, 10) : 0;
  },

  set lastPageviewTime(ts) {
    const cookieName = '__ybotlpv';
    this.setCookie(cookieName, ts, this._sessionTimeout, '/');
  },

  /**
   * Get/set the request base url used to form bid, ad markup and impression requests.
   * @param {string} [prefix] the bidder request base url
   * @returns {string} the request base Url string
   * @memberof module:YieldbotBidAdapter
   */
  urlPrefix: function(prefix) {
    const cookieName = '__ybotc';
    const pIdx = prefix ? prefix.indexOf(':') : -1;
    const url = pIdx !== -1 ? document.location.protocol + prefix.substr(pIdx + 1) : null;
    let cookieValue = url || this.getCookie(cookieName);
    if (!cookieValue) {
      cookieValue = '//i.yldbt.com/m/';
    }
    this.setCookie(cookieName, cookieValue, this._sessionTimeout, '/');
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

      const pageviewIdToMap = searchParams['pvi'];

      const yieldbotSlotParams = this.getSlotRequestParams(pageviewIdToMap, bidRequests);

      searchParams['sn'] = yieldbotSlotParams['sn'] || '';
      searchParams['ssz'] = yieldbotSlotParams['ssz'] || '';

      const bidUrl = this.urlPrefix() + yieldbotSlotParams.psn + '/v1/init';

      searchParams['cts_ini'] = utils.timestamp();
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
          const ybBidId = bidRequest.data['pvi'];
          const paramKey = `${ybBidId}:${bid.slot}:${bid.size || ''}`;
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
            currency: 'USD',
            netRevenue: true,
            ttl: this._sessionTimeout / 1000, // [s]
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
    commonSearchParams['v'] = this._version;
    commonSearchParams['vi'] = bidRequest.data.vi || this._version + '-vi';
    commonSearchParams['si'] = bidRequest.data.si || this._version + '-si';
    commonSearchParams['pvi'] = bidRequest.data.pvi || this._version + '-pvi';
    commonSearchParams['ri'] = adRequestId;
    return commonSearchParams;
  },

  buildAdUrl: function(urlPrefix, publisherNumber, commonSearchParams, bid) {
    const searchParams = Object.assign({}, commonSearchParams);
    searchParams['cts_res'] = utils.timestamp();
    searchParams['slot'] = bid.slot + ':' + bid.size;
    searchParams['ioa'] = this.intersectionObserverAvailable(window);

    const queryString = buildQueryString(searchParams) || '';
    const adUrl = urlPrefix +
            publisherNumber +
            '/ad/creative.js?' +
            queryString;
    return adUrl;
  },

  buildImpressionUrl: function(urlPrefix, publisherNumber, commonSearchParams) {
    const searchParams = Object.assign({}, commonSearchParams);
    const queryString = buildQueryString(searchParams) || '';
    const impressionUrl = urlPrefix +
            publisherNumber +
            '/ad/impression.gif?' +
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

    const htmlMarkup = `<div id="ybot-${ybotAdRequestId}"></div><script type="text/javascript">var yieldbot={iframeType:function(win){var it='none';while(win !== window.top){try{win=win.parent;var doc=win.document;it=doc?'so':'co';}catch(e){it='co';}}return it;},'_render':function(data){try{yieldbot['cts_rend_'+'${ybotAdRequestId}']=(new Date()).getTime();var bodyHtml=data.html,width=data.size[0]||0,height=data.size[1]||0,divEl=document.createElement('div');divEl.style.width=width+'px';divEl.style.height=height+'px';divEl.className='ybot-creativecreative-wrapper';var containerEl=document.getElementById(data.wrapper_id||'ybot-'+data.request_id);containerEl.appendChild(divEl);var iframeHtml='<!DOCTYPE html><head><meta charset=utf-8><style>'+data.style+'</style></head><body>'+data.html+'</body>',innerFrame=document.createElement('iframe');innerFrame.width=width;innerFrame.height=height;innerFrame.scrolling='no';innerFrame.marginWidth='0';innerFrame.marginHeight='0';innerFrame.frameBorder='0';innerFrame.style.border='0px';innerFrame.style['vertical-align']='bottom';innerFrame.id='ybot-'+data.request_id+'-iframe';divEl.appendChild(innerFrame);var innerFrameDoc=innerFrame.contentWindow.document;innerFrameDoc.open();innerFrameDoc.write(iframeHtml);innerFrameDoc.close();var image=new Image(1,1);image.onload=function(){};var cts_rend=yieldbot['cts_rend_'+'${ybotAdRequestId}']||0;image.src='${impressionUrl}'+'&cts_imp='+(new Date()).getTime()+'&cts_rend='+cts_rend+'&e';}catch(err){}}};</script><script type="text/javascript">var jsEl=document.createElement('script');var src='${adUrl}'+'&it='+yieldbot.iframeType(window)+'&cts_ad='+(new Date()).getTime()+'&e';jsEl.src=src;var firstEl=document.getElementsByTagName('script')[0];firstEl.parentNode.insertBefore(jsEl,firstEl);</script>`;
    return { ad: htmlMarkup, creativeId: ybotAdRequestId };
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

    params['cts_js'] = this._adapterLoaded;
    params['cts_ns'] = this._navigationStart;
    params['v'] = this._version;

    const userId = this.userId;
    const sessionId = this.sessionId;
    const pageviewId = this.newId();
    const currentBidTime = utils.timestamp();
    const lastBidTime = this.lastPageviewTime;
    const lastBidId = this.lastPageviewId;
    this.lastPageviewTime = currentBidTime;
    this.lastPageviewId = pageviewId;
    params['vi'] = userId;
    params['si'] = sessionId;
    params['pvd'] = this._pageviewDepth;
    params['pvi'] = pageviewId;
    params['lpv'] = lastBidTime;
    params['lpvi'] = lastBidId;
    params['bt'] = this._bidRequestCount === 0 ? 'init' : 'refresh';

    params['ua'] = navigator.userAgent;
    params['np'] = navigator.platform;
    params['la'] =
      navigator.browserLanguage ? navigator.browserLanguage : navigator.language;
    params['to'] =
      (new Date()).getTimezoneOffset() / 60;
    params['sd'] =
      window.screen.width + 'x' + window.screen.height;

    params['lo'] = utils.getTopWindowUrl();
    params['r'] = utils.getTopWindowReferrer();

    params['e'] = '';

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
      params['sn'] = nm.join('|');
      params['ssz'] = sz.join('|');

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
    const dataValue = encodeURIComponent(value);
    const cookieStr = name + '=' + dataValue +
            (expireMillis ? ';expires=' + new Date(utils.timestamp() + expireMillis).toGMTString() : '') +
            (path ? ';path=' + path : '') +
            (domain ? ';domain=' + domain : '') +
            (secure ? ';secure' : '');

    document.cookie = cookieStr;
  },

  deleteCookie: function(name, path, domain, secure) {
    return this.setCookie(name, '', -1, path, domain, secure);
  },

  /**
   * Clear all first-party cookies.
   */
  clearAllCookies: function() {
    const labels = this._cookieLabels;
    for (let idx = 0; idx < labels.length; idx++) {
      const label = '__ybot' + labels[idx];
      this.deleteCookie(label);
    }
  },

  /**
   * Generate a new Yieldbot format id<br>
   * Base 36 and lowercase: <[ms] since epoch><[base36]{10}>
   * @example "jbgxsyrlx9fxnr1hbl"
   * @private
   */
  newId: function() {
    return (utils.timestamp()).toString(36) + 'xxxxxxxxxx'
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

YieldbotAdapter._navigationStart = utils.timestamp();
registerBidder(spec);
