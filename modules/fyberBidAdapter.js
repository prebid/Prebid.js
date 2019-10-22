import {logError, getTopWindowUrl, getTopWindowReferrer, getTopWindowLocation, createTrackPixelHtml} from '../src/utils';
import { registerBidder } from '../src/adapters/bidderFactory';
import { formatQS } from '../src/url';
import { config } from '../src/config';

/**
 * @type {{CODE: string, V: string, RECTANGLE_SIZE: {W: number, H: number}, SPOT_TYPES: {INTERSTITIAL: string, RECTANGLE: string, FLOATING: string, BANNER: string}, DISPLAY_AD: number, ENDPOINT_URL: string, EVENTS_ENDPOINT_URL: string, RESPONSE_HEADERS_NAME: {PRICING_VALUE: string, AD_H: string, AD_W: string}}}
 */
const CONSTANTS = {
  CODE: 'fyber',
  V: 'FY-JS-HB-PBJS-1.0',
  RECTANGLE_SIZE: {W: 300, H: 250},

  SPOT_TYPES: {
    INTERSTITIAL: 'interstitial',
    RECTANGLE: 'rectangle',
    FLOATING: 'floating',
    BANNER: 'banner'
  },

  DISPLAY_AD: 20,
  ENDPOINT_URL: 'https://ad-tag.inner-active.mobi/simpleM2M/requestJsonAd',
  EVENTS_ENDPOINT_URL: 'https://vast-events.inner-active.mobi/Event',
  RESPONSE_HEADERS_NAME: {
    PRICING_VALUE: 'X-IA-Pricing-Value',
    AD_H: 'X-IA-Ad-Height',
    AD_W: 'X-IA-Ad-Width',
    CREATIVE_ID: 'X-IA-Creative-ID',
    CURRENCY: 'X-IA-Pricing-Currency',
    TIMEOUT: 'X-IA-SESSION-TIMEOUT'
  }
};

/**
 * gloable util functions
 * @type {{defaultsQsParams: {v: (string|string), page: string, mw: boolean, hb: string}, stringToCamel: (function(*)), objectToCamel: (function(*=))}}
 */
const Helpers = {
  defaultsQsParams: {v: CONSTANTS.V, page: encodeURIComponent(getTopWindowUrl()), mw: true, hb: 'prebidjs'},
  /**
   * Returns the ad HTML template
   * @param adHtml: string {ad server creative}
   * @param tracking: object {impressions, clicks}
   * @param bidParams: object
   * @returns {string}: create template
   */
  getAd(adHtml, tracking, bidParams) {
    let impressionsHtml = '';
    if (tracking && Array.isArray(tracking.impressions)) {
      let impressions = tracking.impressions;
      impressions.push(Reporter.getEventUrl('HBPreBidImpression', bidParams, false));
      impressions.forEach(impression => impression && (impressionsHtml += createTrackPixelHtml(impression)));
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
  },

  /**
  * Change string format from underscore to camelcase (e.g., APP_ID to appId)
  * @param {string} str
  * @return string
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
  },

  /**
   * @param {Object} params
   * @return {string} url
   */
  getEndpointUrl(params) {
    return (params && params.qa && params.qa.url) || ('https:' + CONSTANTS.ENDPOINT_URL);
  },

  /**
    * Adjust bid params to fyber-ad-server params
    * @param {Object} bid
    * @return {Object} bid
  */
  toBidParams(bid) {
    const bidParamsWithCustomParams = Object.assign({}, bid.params, bid.params.customParams);
    delete bidParamsWithCustomParams.customParams;
    bid.params = this.objectToCamel(bidParamsWithCustomParams);
    return bid;
  },

  /**
   * Validate if response is valid
   * @param responseAsJson : object
   * @param headersData: {}
   * @returns {boolean}
   * @private
   */
  isValidBidResponse(responseAsJson, headersData) {
    return (responseAsJson && responseAsJson.ad && responseAsJson.ad.html && headersData && headersData[CONSTANTS.RESPONSE_HEADERS_NAME.PRICING_VALUE] > 0);
  }
};

/**
 * Url generator - generates a request URL
 * @type {{defaultsParams: *, serverParamNameBySettingParamName: {referrer: string, keywords: string, appId: string, portal: string, age: string, gender: string, isSecured: (boolean|null)}, toServerParams: (function(*)), unwantedValues: *[], getUrlParams: (function(*=))}}
 */
const Url = {
  defaultsParams: Object.assign({}, Helpers.defaultsQsParams, {f: CONSTANTS.DISPLAY_AD, fs: false, ref: getTopWindowReferrer()}),
  serverParamNameBySettingParamName: {
    referrer: 'ref',
    keywords: 'k',
    appId: 'aid',
    portal: 'po',
    age: 'a',
    gender: 'g',
    gdprPrivacyConsent: 'gdpr_privacy_consent',
    consentString: 'consent_string',
    gdprConsentData: 'gdpr_consent_data'
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

  handleGDPR(params) {
    if (params.hasOwnProperty('gdprPrivacyConsent')) {
      if (['true', true, '1', 1].indexOf(params.gdprPrivacyConsent) !== -1) {
        params.gdprPrivacyConsent = 1;
      } else {
        params.gdprPrivacyConsent = 0;
      }
    }
  },

  /**
  * Prepare querty string to ad server
  * @param params: object {k:v}
  * @returns : object {k:v}
  */
  getUrlParams(params) {
    this.handleGDPR(params);
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
    toQueryString.bco = config.getConfig('cbTimeout') || config.getConfig('bidderTimeout');
    toQueryString.timestamp = Date.now();
    delete toQueryString.qa;
    return toQueryString;
  }
};

/**
 * Analytics
 * @type {{errorEventName: string, pageProtocol: string, getPageProtocol: (function(): string), getEventUrl: (function(*, *=)), defaults: {v: (string|string), page: string, mw: boolean, hb: string}, eventQueryStringParams: (function(Object): string)}}
 */
const Reporter = {
  /**
  * @private
  */
  errorEventName: 'HBPreBidError',
  pageProtocol: '',
  defaults: Helpers.defaultsQsParams,

  /**
  * Gets the page protocol based on the <code>document.location.protocol</code>
  * The returned string is either <code>http://</code> or <code>https://</code>
  * @return {string}
  */
  getPageProtocol() {
    if (!this.pageProtocol) {
      this.pageProtocol = (getTopWindowLocation().protocol === 'http:' ? 'http:' : 'https:');
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
  * Fyber Event Reporting Query String Parameters, not including App Id.
  * @param {object} extraDetails - e.g., a JS exception JSON object.
  * @return {string} Fyber event contcatenated queryString parameters.
  */
  eventQueryStringParams(extraDetails) {
    const toQS = Object.assign({}, this.defaults, {realAppId: extraDetails && extraDetails.appId, timestamp: Date.now()});
    Url.handleGDPR(toQS);
    return formatQS(toQS);
  }
};
const {PRICING_VALUE, AD_W, AD_H, CREATIVE_ID, CURRENCY, TIMEOUT} = CONSTANTS.RESPONSE_HEADERS_NAME;
/**
 * Http helper to extract metadata
 * @type {{headers: *[], getBidHeaders: (function(*))}}
 */
const Http = {
  headerNames: [PRICING_VALUE, AD_W, AD_H, CREATIVE_ID, CURRENCY, TIMEOUT],

  /**
   * Extract headers data
   * @param responseHeaders: XMLHttpRequest
   * @return {}
   */
  getBidHeaders(responseHeaders) {
    const headersData = {};
    this.headerNames.forEach(headerName => headersData[headerName] = responseHeaders.get(headerName));
    return headersData;
  }
};

const bidByBidId = {};
class FyberBid {
  constructor(headersData, response, bid) {
    this.handleGDPR(response.config.tracking, bid.params);
    const [w, h] = bid.sizes[0];
    this.cpm = ((bid.params.qa && bid.params.qa.cpm) || headersData[PRICING_VALUE]) * 1000;
    this.requestId = bid.bidId;
    this.width = parseFloat(headersData[AD_W]) || w;
    this.ad = Helpers.getAd(response.ad.html, response.config.tracking, bid.params);
    this.height = parseFloat(headersData[AD_H]) || h;
    this.creativeId = headersData[CREATIVE_ID];
    this.currency = headersData[CURRENCY] || 'USD';
    this.netRevenue = true;
    this.ttl = 60 * (headersData[TIMEOUT] || 20);
    this.dealId = null;
  }

  handleGDPR(tracking, params) {
    if (params.hasOwnProperty('gdprPrivacyConsent')) {
      if (['true', true, '1', 1].indexOf(params.gdprPrivacyConsent) !== -1) {
        params.gdprPrivacyConsent = 1;
      } else {
        params.gdprPrivacyConsent = 0;
      }
      Object.keys(tracking).forEach((trackName) => {
        if (Array.isArray(tracking[trackName])) {
          tracking[trackName].forEach((url, index) => {
            if (url) {
              if (url.indexOf('?') === -1) {
                url += '?';
              }
              url += '&gdpr_privacy_consent=' + params.gdprPrivacyConsent;
              tracking[trackName][index] = url;
            }
          });
        }
      });
    }
  }
}

export const spec = {
  code: CONSTANTS.CODE,

  /**
   * Determines whether or not the given bid request is valid.
   * Valid bid request must have appId and spotType
   * @param {BidRequest} bid The bid params to validate.
   * @return boolean True if this is a valid bid, and false otherwise.
   */
  isBidRequestValid(bid) {
    const {appId, spotType} = Helpers.objectToCamel(bid.params);
    const isValid = !!(appId && spotType);
    if (!isValid) {
      logError(`bid requires appId = ${appId} , spotType = ${spotType}`);
    }
    return isValid;
  },

  buildRequests(bidRequests) {
    let requests = [];
    bidRequests.forEach((bid) => {
      bid = Helpers.toBidParams(bid);
      bidByBidId[bid.bidId] = bid;
      requests.push({
        method: 'GET',
        url: Helpers.getEndpointUrl(bid.params),
        data: Url.getUrlParams(bid.params),
        bidId: bid.bidId
      });
    });
    return requests;
  },

  interpretResponse(response, request) {
    const isValid = response.body && response.body.ad;
    const headersData = (isValid && Http.getBidHeaders(response.headers)) || {};
    const bid = bidByBidId[request.bidId];
    const bidResponse = [];
    if (!isValid || !Helpers.isValidBidResponse(response.body, headersData)) {
      logError(`response failed for ${CONSTANTS.CODE} adapter`);
      return bidResponse;
    }
    bidResponse.push(new FyberBid(headersData, response.body, bid));
    return bidResponse;
  }
};
registerBidder(spec);
