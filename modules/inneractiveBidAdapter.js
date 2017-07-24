import * as utils from 'src/utils';
import Adapter from 'src/adapter';
import {ajax} from 'src/ajax';
import bidManager from 'src/bidmanager';
import bidFactory from 'src/bidfactory';
import {STATUS} from 'src/constants';
import {formatQS} from 'src/url';
import adaptermanager from 'src/adaptermanager';

/**
 * @type {{IA_JS: string, ADAPTER_NAME: string, V: string, RECTANGLE_SIZE: {W: number, H: number}, SPOT_TYPES: {INTERSTITIAL: string, RECTANGLE: string, FLOATING: string, BANNER: string}, DISPLAY_AD: number, ENDPOINT_URL: string, EVENTS_ENDPOINT_URL: string, RESPONSE_HEADERS_NAME: {PRICING_VALUE: string, AD_H: string, AD_W: string}}}
 */
const CONSTANTS = {
  ADAPTER_NAME: 'inneractive',
  V: 'IA-JS-HB-PBJS-1.0',
  RECTANGLE_SIZE: {W: 300, H: 250},

  SPOT_TYPES: {
    INTERSTITIAL: 'interstitial',
    RECTANGLE: 'rectangle',
    FLOATING: 'floating',
    BANNER: 'banner'
  },

  DISPLAY_AD: 20,
  ENDPOINT_URL: '//ad-tag.inner-active.mobi/simpleM2M/requestJsonAd',
  EVENTS_ENDPOINT_URL: '//vast-events.inner-active.mobi/Event',
  RESPONSE_HEADERS_NAME: {
    PRICING_VALUE: 'X-IA-Pricing-Value',
    AD_H: 'X-IA-Ad-Height',
    AD_W: 'X-IA-Ad-Width'
  }
};

let iaRef;
try {
  iaRef = window.top.document.referrer;
} catch (e) {
  iaRef = window.document.referrer;
}

/**
 * gloable util functions
 * @type {{defaultsQsParams: {v: (string|string), page: string, mw: boolean, hb: string}, stringToCamel: (function(*)), objectToCamel: (function(*=))}}
 */
const Helpers = {
  defaultsQsParams: {v: CONSTANTS.V, page: encodeURIComponent(utils.getTopWindowUrl()), mw: true, hb: 'prebidjs'},
  /**
   * Change string format from underscore to camelcase (e.g., APP_ID to appId)
   * @param str: string
   * @returns string
   */
  stringToCamel(str) {
    if (str.indexOf('_') === -1) {
      const first = str.charAt(0);
      if (first !== first.toLowerCase()) {
        str = str.toLowerCase();
      }
      return str;
    }

    str = str.toLowerCase();
    return str.replace(/(\_[a-z])/g, $1 => $1.toUpperCase().replace('_', ''));
  },

  /**
   * Change all object keys string format from underscore to camelcase (e.g., {'APP_ID' : ...} to {'appId' : ...})
   * @param params: object
   * @returns object
   */
  objectToCamel(params) {
    Object.keys(params).forEach(key => {
      const keyCamelCase = this.stringToCamel(key);
      if (keyCamelCase !== key) {
        params[keyCamelCase] = params[key];
        delete params[key];
      }
    });
    return params;
  }
};

/**
 * Tracking pixels for events
 * @type {{fire: (function(*=))}}
 */
const Tracker = {
  /**
   * Creates a tracking pixel
   * @param urls: Array<String>
   */
  fire(urls) {
    urls.forEach(url => url && ((new Image(1, 1)).src = encodeURI(url)));
  }
};

/**
 * Analytics
 * @type {{errorEventName: string, pageProtocol: string, getPageProtocol: (function(): string), getEventUrl: (function(*, *=)), reportEvent: (function(string, Object)), defaults: {v: (string|string), page: string, mw: boolean, hb: string}, eventQueryStringParams: (function(Object): string), createTrackingPixel: (function(string))}}
 */
const Reporter = {
  /**
   * @private
   */
  errorEventName: 'HBPreBidError',
  pageProtocol: '',

  /**
   * Gets the page protocol based on the <code>document.location.protocol</code>
   * The returned string is either <code>http://</code> or <code>https://</code>
   * @returns {string}
   */
  getPageProtocol() {
    if (!this.pageProtocol) {
      this.pageProtocol = (utils.getTopWindowLocation().protocol === 'http:' ? 'http:' : 'https:');
    }
    return this.pageProtocol;
  },

  getEventUrl(evtName, extraDetails) {
    let eventsEndpoint = CONSTANTS.EVENTS_ENDPOINT_URL + '?table=' + ((evtName === this.errorEventName) ? 'mbwError' : 'mbwEvent');
    let queryStringParams = this.eventQueryStringParams(extraDetails);
    const appId = extraDetails && extraDetails.appId;
    let queryStringParamsWithAID = `${queryStringParams}&aid=${appId}_${evtName}_other&evtName=${evtName}`;
    return eventsEndpoint + '&' + queryStringParamsWithAID;
  },

  /**
   * Reports an event to IA's servers.
   * @param {string} evtName - event name as string.
   * @param {object} extraDetails - e.g., a JS exception JSON object.
   * @param shouldSendOnlyToNewEndpoint
   */
  reportEvent(evtName, extraDetails) {
    const url = this.getEventUrl(evtName, extraDetails);
    this.createTrackingPixel(url);
  },
  defaults: Helpers.defaultsQsParams,

  /**
   * Ia Event Reporting Query String Parameters, not including App Id.
   * @param {object} extraDetails - e.g., a JS exception JSON object.
   * @return {string} IA event contcatenated queryString parameters.
   */
  eventQueryStringParams(extraDetails) {
    const toQS = Object.assign({}, this.defaults, {realAppId: extraDetails && extraDetails.appId, timestamp: Date.now()});
    return formatQS(toQS);
  },

  /**
   * Creates a tracking pixel by prepending the page's protocol to the URL sent as the param.
   * @param {string} urlWithoutProtocol - the URL to send the tracking pixel to, without the protocol as a prefix.
   */
  createTrackingPixel(urlWithoutProtocol) {
    Tracker.fire([this.getPageProtocol() + urlWithoutProtocol]);
  }
};

/**
 * Url generator - generates a request URL
 * @type {{defaultsParams: *, serverParamNameBySettingParamName: {referrer: string, keywords: string, appId: string, portal: string, age: string, gender: string, isSecured: (boolean|null)}, toServerParams: (function(*)), unwantedValues: *[], getUrlParams: (function(*=))}}
 */
const Url = {
  defaultsParams: Object.assign({}, Helpers.defaultsQsParams, {f: CONSTANTS.DISPLAY_AD, fs: false, ref: iaRef}),
  serverParamNameBySettingParamName: {
    referrer: 'ref',
    keywords: 'k',
    appId: 'aid',
    portal: 'po',
    age: 'a',
    gender: 'g',
  },
  unwantedValues: ['', null, undefined],

  /**
   * Maps publisher params to server params
   * @param params: object {k:v}
   * @returns object {k:v}
   */
  toServerParams(params) {
    const serverParams = {};
    for (const paramName in params) {
      if (params.hasOwnProperty(paramName) && this.serverParamNameBySettingParamName.hasOwnProperty(paramName)) {
        serverParams[this.serverParamNameBySettingParamName[paramName]] = params[paramName];
      } else {
        serverParams[paramName] = params[paramName];
      }
    }

    serverParams.isSecured = Reporter.getPageProtocol() === 'https:' || null;
    return serverParams;
  },

  /**
   * Prepare querty string to ad server
   * @param params: object {k:v}
   * @returns : object {k:v}
   */
  getUrlParams(params) {
    const serverParams = this.toServerParams(params);
    const toQueryString = Object.assign({}, this.defaultsParams, serverParams);
    for (const paramName in toQueryString) {
      if (toQueryString.hasOwnProperty(paramName) && this.unwantedValues.indexOf(toQueryString[paramName]) !== -1) {
        delete toQueryString[paramName];
      }
    }
    toQueryString.fs = params.spotType === CONSTANTS.SPOT_TYPES.INTERSTITIAL;

    if (params.spotType === CONSTANTS.SPOT_TYPES.RECTANGLE) {
      toQueryString.rw = CONSTANTS.RECTANGLE_SIZE.W;
      toQueryString.rh = CONSTANTS.RECTANGLE_SIZE.H;
    }

    if (typeof $$PREBID_GLOBAL$$ !== 'undefined') {
      toQueryString.bco = $$PREBID_GLOBAL$$.cbTimeout || $$PREBID_GLOBAL$$.bidderTimeout;
    }

    toQueryString.timestamp = Date.now();
    delete toQueryString.qa;
    return toQueryString;
  }
};

/**
 * Http helper to extract metadata
 * @type {{headers: *[], getBidHeaders: (function(*))}}
 */
const Http = {
  headers: [
    CONSTANTS.RESPONSE_HEADERS_NAME.PRICING_VALUE,
    CONSTANTS.RESPONSE_HEADERS_NAME.AD_H,
    CONSTANTS.RESPONSE_HEADERS_NAME.AD_W
  ],

  /**
   * Extract headers data
   * @param xhr: XMLHttpRequest
   * @returns {}
   */
  getBidHeaders(xhr) {
    const headersData = {};
    this.headers.forEach(headerName => headersData[headerName] = xhr.getResponseHeader(headerName));
    return headersData;
  }
};

/**
 * InnerActiveAdapter for requesting bids
 * @class
 */
class InnerActiveAdapter {
  constructor() {
    this.iaAdapter = Adapter.createNew(CONSTANTS.ADAPTER_NAME);
    this.bidByBidId = {};
  }

  /**
   * validate if bid request is valid
   * @param adSettings: object
   * @returns {boolean}
   * @private
   */
  _isValidRequest(adSettings) {
    if (adSettings && adSettings.appId && adSettings.spotType) {
      return true;
    }
    utils.logError('bid requires appId');
    return false;
  }

  /**
   * Store the bids in a Map object (k: bidId, v: bid)to check later if won
   * @param bid
   * @returns bid object
   * @private
   */
  _storeBidRequestDetails(bid) {
    this.bidByBidId[bid.bidId] = bid;
    return bid;
  }

  /**
   * @param bidStatus: int ("STATUS": {"GOOD": 1,"NO_BID": 2})
   * @param bidResponse: object
   * @returns {type[]}
   * @private
   */
  _getBidDetails(bidStatus, bidResponse, bidId) {
    let bid = bidFactory.createBid(bidStatus, bidResponse);
    bid.code = CONSTANTS.ADAPTER_NAME;
    bid.bidderCode = bid.code;
    if (bidStatus === STATUS.GOOD) {
      bid = Object.assign(bid, bidResponse);
      this._setBidCpm(bid, bidId);
    }
    return bid;
  }

  _setBidCpm(bid, bidId) {
    const storedBid = this.bidByBidId[bidId];
    if (storedBid) {
      bid.cpm = storedBid.params && storedBid.params.qa && storedBid.params.qa.cpm || bid.cpm;
      bid.cpm = (bid.cpm !== null && !isNaN(bid.cpm)) ? parseFloat(bid.cpm) : 0.0;
    }
  }

  /**
   * Validate if response is valid
   * @param responseAsJson : object
   * @param headersData: {}
   * @returns {boolean}
   * @private
   */
  _isValidBidResponse(responseAsJson, headersData) {
    return (responseAsJson && responseAsJson.ad && responseAsJson.ad.html && headersData && headersData[CONSTANTS.RESPONSE_HEADERS_NAME.PRICING_VALUE] > 0);
  }

  /**
   * When response is received
   * @param response: string(json format)
   * @param xhr: XMLHttpRequest
   * @param bidId: string
   * @private
   */
  _onResponse(response, xhr, bidId) {
    const bid = this.bidByBidId[bidId];
    const [w, h] = bid.sizes[0];
    const size = {w, h};
    let responseAsJson;
    const headersData = Http.getBidHeaders(xhr);
    try {
      responseAsJson = JSON.parse(response);
    } catch (error) {
      utils.logError(error);
    }

    if (!this._isValidBidResponse(responseAsJson, headersData)) {
      let errorMessage = `response failed for ${CONSTANTS.ADAPTER_NAME} adapter`;
      utils.logError(errorMessage);
      const passback = responseAsJson && responseAsJson.config && responseAsJson.config.passback;
      if (passback) {
        Tracker.fire([passback]);
      }
      Reporter.reportEvent('HBPreBidNoAd', bid.params);
      return bidManager.addBidResponse(bid.placementCode, this._getBidDetails(STATUS.NO_BID));
    }
    const bidResponse = {
      cpm: headersData[CONSTANTS.RESPONSE_HEADERS_NAME.PRICING_VALUE] * 1000,
      width: parseFloat(headersData[CONSTANTS.RESPONSE_HEADERS_NAME.AD_W]) || size.w,
      ad: this._getAd(responseAsJson.ad.html, responseAsJson.config.tracking, bid.params),
      height: parseFloat(headersData[CONSTANTS.RESPONSE_HEADERS_NAME.AD_H]) || size.h
    };
    const auctionBid = this._getBidDetails(STATUS.GOOD, bidResponse, bidId);
    bid.adId = auctionBid.adId;
    this.bidByBidId[bidId] = bid;
    bidManager.addBidResponse(bid.placementCode, auctionBid);
  }

  /**
   * Returns the ad HTML template
   * @param adHtml: string {ad server creative}
   * @param tracking: object {impressions, clicks}
   * @param bidParams: object
   * @returns {string}: create template
   * @private
   */
  _getAd(adHtml, tracking, bidParams) {
    let impressionsHtml = '';
    if (tracking && Array.isArray(tracking.impressions)) {
      let impressions = tracking.impressions;
      impressions.push(Reporter.getEventUrl('HBPreBidImpression', bidParams, false));
      impressions.forEach(impression => impression && (impressionsHtml += utils.createTrackPixelHtml(impression)));
    }
    adHtml = impressionsHtml + adHtml.replace(/<a /g, '<a target="_blank" ');
    let clicks = tracking && Array.isArray(tracking.clicks) && tracking.clicks;
    if (clicks && Array.isArray(clicks)) {
      clicks.push(Reporter.getEventUrl('HBPreBidClick', bidParams, false));
    }
    const adTemplate = `
      <html>
        <head>
            <script type='text/javascript'>inDapIF=true;</script>
        </head>
        <body style='margin : 0; padding: 0;'>
            <div id="iaAdContainer">${adHtml}</div>
            <script type='text/javascript'>
                var iaAdContainer = document.getElementById('iaAdContainer');
                if(iaAdContainer){
                    var clicks = '${clicks}';
                    if(clicks){
                      clicks = clicks.split(',');
                      iaAdContainer.addEventListener('click', function onIaContainerClick(){
                          clicks.forEach(function forEachClick(click){
                              if(click){
                                  (new Image(1,1)).src = encodeURI(click);
                              }
                          });
                      });
                    }
                }
            </script>
        </body>
      </html>`;
    return adTemplate;
  }
  /**
   * Adjust bid params to ia-ad-server params
   * @param bid: object
   * @private
   */
  _toIaBidParams(bid) {
    const bidParamsWithCustomParams = Object.assign({}, bid.params, bid.params.customParams);
    delete bidParamsWithCustomParams.customParams;
    bid.params = Helpers.objectToCamel(bidParamsWithCustomParams);
  }

  /**
   * Prebid executes for stating an auction
   * @param bidRequest: object
   */
  callBids(bidRequest) {
    const bids = bidRequest.bids || [];
    bids.forEach(bid => this._toIaBidParams(bid));
    bids
      .filter(bid => this._isValidRequest(bid.params))
      .map(bid => this._storeBidRequestDetails(bid))
      .forEach(bid => ajax(this._getEndpointUrl(bid.params), (response, xhr) => this._onResponse(response, xhr, bid.bidId), Url.getUrlParams(bid.params), {method: 'GET'}));
  }

  _getEndpointUrl(params) {
    return params && params.qa && params.qa.url || Reporter.getPageProtocol() + CONSTANTS.ENDPOINT_URL;
  }

  _getStoredBids() {
    const storedBids = [];
    for (const bidId in this.bidByBidId) {
      if (this.bidByBidId.hasOwnProperty(bidId)) {
        storedBids.push(this.bidByBidId[bidId]);
      }
    }
    return storedBids;
  }

  /**
   * Return internal object - testing
   * @returns {{Reporter: {errorEventName: string, pageProtocol: string, getPageProtocol: (function(): string), getEventUrl: (function(*, *=)), reportEvent: (function(string, Object)), defaults: {v: (string|string), page: string, mw: boolean, hb: string}, eventQueryStringParams: (function(Object): string), createTrackingPixel: (function(string))}}}
   * @private
   */
  static _getUtils() {
    return {Reporter};
  }

  /**
   * Creates new instance of InnerActiveAdapter for prebid auction
   * @returns {InnerActiveAdapter}
   */
  static createNew() {
    return new InnerActiveAdapter();
  }
}

adaptermanager.registerBidAdapter(new InnerActiveAdapter(), 'inneractive');

module.exports = InnerActiveAdapter;
