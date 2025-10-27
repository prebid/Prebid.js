import {registerBidder} from '../src/adapters/bidderFactory.js';
import {logError, logInfo, triggerPixel} from '../src/utils.js';

const BIDDER_CODE = 'ampliffy';
const GVLID = 1258;
const DEFAULT_ENDPOINT = 'bidder.ampliffy.com';
const TTL = 600; // Time-to-Live - how long (in seconds) Prebid can use this bid.
const LOG_PREFIX = 'AmpliffyBidder: ';

function isBidRequestValid(bid) {
  logInfo(LOG_PREFIX + 'isBidRequestValid: Code: ' + bid.adUnitCode + ': Param' + JSON.stringify(bid.params), bid.adUnitCode);
  if (bid.params) {
    if (!bid.params.placementId || !bid.params.format) return false;

    if (bid.params.format.toLowerCase() !== 'video' && bid.params.format.toLowerCase() !== 'display' && bid.params.format.toLowerCase() !== 'all') return false;
    if (bid.params.format.toLowerCase() === 'video' && !bid.mediaTypes['video']) return false;
    if (bid.params.format.toLowerCase() === 'display' && !bid.mediaTypes['banner']) return false;

    if (!bid.params.server || bid.params.server === '') {
      const server = bid.params.type + bid.params.region + bid.params.adnetwork;
      if (server && server !== '') bid.params.server = server;
      else bid.params.server = DEFAULT_ENDPOINT;
    }
    return true;
  }
  return false;
}

function manageConsentArguments(bidderRequest) {
  let consent = null;
  if (bidderRequest?.gdprConsent) {
    consent = {
      gdpr: bidderRequest.gdprConsent.gdprApplies ? '1' : '0',
    };
    if (bidderRequest.gdprConsent.consentString) {
      consent.consent_string = bidderRequest.gdprConsent.consentString;
    }
    if (bidderRequest.gdprConsent.addtlConsent && bidderRequest.gdprConsent.addtlConsent.indexOf('~') !== -1) {
      consent.addtl_consent = bidderRequest.gdprConsent.addtlConsent;
    }
  }
  return consent;
}

function buildRequests(validBidRequests, bidderRequest) {
  const bidRequests = [];
  for (const bidRequest of validBidRequests) {
    for (const sizes of bidRequest.sizes) {
      let extraParams = mergeParams(getDefaultParams(), bidRequest.params.extraParams);
      // Apply GDPR parameters to request.
      extraParams = mergeParams(extraParams, manageConsentArguments(bidderRequest));
      const serverURL = getServerURL(bidRequest.params.server, sizes, bidRequest.params.placementId, extraParams);
      logInfo(LOG_PREFIX + serverURL, 'requests');
      extraParams.bidId = bidRequest.bidId;
      bidRequests.push({
        method: 'GET',
        url: serverURL,
        data: extraParams,
        bidRequest,
      });
    }
    logInfo(LOG_PREFIX + 'Building request from: ' + bidderRequest.url + ': ' + JSON.stringify(bidRequests), bidRequest.adUnitCode);
  }
  return bidRequests;
}
export function getDefaultParams() {
  return {
    ciu_szs: '1x1',
    gdfp_req: '1',
    env: 'vp',
    output: 'xml_vast4',
    unviewed_position_start: '1'
  };
}
export function mergeParams(params, extraParams) {
  if (extraParams) {
    for (const k in extraParams) {
      params[k] = extraParams[k];
    }
  }
  return params;
}
export function paramsToQueryString(params) {
  return Object.entries(params).filter(e => typeof e[1] !== 'undefined').map(e => {
    if (e[1]) return encodeURIComponent(e[0]) + '=' + encodeURIComponent(e[1]);
    else return encodeURIComponent(e[0]);
  }).join('&');
}
const getCacheBuster = () => Math.floor(Math.random() * (9999999999 - 1000000000));

// For testing purposes
let currentUrl = null;
export function getCurrentURL() {
  if (!currentUrl) currentUrl = top.location.href;
  return currentUrl;
}
export function setCurrentURL(url) {
  currentUrl = url;
}
const getCurrentURLEncoded = () => encodeURIComponent(getCurrentURL());
function getServerURL(server, sizes, iu, queryParams) {
  const random = getCacheBuster();
  const size = sizes[0] + 'x' + sizes[1];
  let serverURL = '//' + server + '/gampad/ads';
  queryParams.sz = size;
  queryParams.iu = iu;
  queryParams.url = getCurrentURL();
  queryParams.description_url = getCurrentURL();
  queryParams.correlator = random;

  return serverURL;
}
function interpretResponse(serverResponse, bidRequest) {
  const bidResponses = [];

  const bidResponse = {};
  let mediaType = 'video';
  if (
    bidRequest.bidRequest?.mediaTypes &&
    !bidRequest.bidRequest.mediaTypes['video']
  ) {
    mediaType = 'banner';
  }
  bidResponse.requestId = bidRequest.bidRequest.bidId;
  bidResponse.width = bidRequest.bidRequest?.sizes[0][0];
  bidResponse.height = bidRequest.bidRequest?.sizes[0][1];
  bidResponse.ttl = TTL;
  bidResponse.creativeId = 'ampCreativeID134';
  bidResponse.netRevenue = true;
  bidResponse.mediaType = mediaType;
  bidResponse.meta = {
    advertiserDomains: [],
  };
  let xmlStr = serverResponse.body;
  const xml = new window.DOMParser().parseFromString(xmlStr, 'text/xml');
  const xmlData = parseXML(xml, bidResponse);
  logInfo(LOG_PREFIX + 'Response from: ' + bidRequest.url + ': ' + JSON.stringify(xmlData), bidRequest.bidRequest.adUnitCode);
  if (xmlData.cpm < 0 || !xmlData.creativeURL || !xmlData.bidUp) {
    return [];
  }
  bidResponse.cpm = xmlData.cpm;
  bidResponse.currency = xmlData.currency;

  if (mediaType === 'video') {
    logInfo(LOG_PREFIX + xmlData.creativeURL, 'requests');
    bidResponse.vastUrl = xmlData.creativeURL;
  } else {
    bidResponse.adUrl = xmlData.creativeURL;
  }
  if (xmlData.trackingUrl) {
    bidResponse.vastImpUrl = xmlData.trackingUrl;
    bidResponse.trackingUrl = xmlData.trackingUrl;
  }
  bidResponses.push(bidResponse);
  return bidResponses;
}
const replaceMacros = (txt, cpm, bid) => {
  const size = bid.width + 'x' + bid.height;
  txt = txt.replaceAll('%%CACHEBUSTER%%', getCacheBuster());
  txt = txt.replaceAll('@@CACHEBUSTER@@', getCacheBuster());
  txt = txt.replaceAll('%%REFERER%%', getCurrentURLEncoded());
  txt = txt.replaceAll('@@REFERER@@', getCurrentURLEncoded());
  txt = txt.replaceAll('%%REFERRER_URL_UNESC%%', getCurrentURLEncoded());
  txt = txt.replaceAll('@@REFERRER_URL_UNESC@@', getCurrentURLEncoded());
  txt = txt.replaceAll('%%PRICE_ESC%%', encodePrice(cpm));
  txt = txt.replaceAll('@@PRICE_ESC@@', encodePrice(cpm));
  txt = txt.replaceAll('%%SIZES%%', size);
  txt = txt.replaceAll('@@SIZES@@', size);
  return txt;
}
const encodePrice = (price) => {
  price = parseFloat(price);
  const s = 116.54;
  const c = 1;
  const a = 1;
  let encodedPrice = s * Math.log10(price + a) + c;
  encodedPrice = Math.min(200, encodedPrice);
  encodedPrice = Math.round(Math.max(1, encodedPrice));

  // Format the encoded price with leading zeros if necessary
  const formattedEncodedPrice = encodedPrice.toString().padStart(3, '0');

  // Build the encoding key
  const encodingKey = `H--${formattedEncodedPrice}`;

  return encodeURIComponent(`vch=${encodingKey}`);
};

function extractCT(xml) {
  let ct = null;
  try {
    try {
      const vastAdTagURI = xml.getElementsByTagName('VASTAdTagURI')[0]
      if (vastAdTagURI) {
        let url = null;
        for (const childNode of vastAdTagURI.childNodes) {
          if (childNode.nodeValue.trim().includes('http')) {
            url = decodeURIComponent(childNode.nodeValue);
          }
        }
        const urlParams = new URLSearchParams(url);
        ct = urlParams.get('ct')
      }
    } catch (e) {
    }
    if (!ct) {
      const geoExtensions = xml.querySelectorAll('Extension[type="geo"]');
      geoExtensions.forEach((geoExtension) => {
        const countryElement = geoExtension.querySelector('Country');
        if (countryElement) {
          ct = countryElement.textContent;
        }
      });
    }
  } catch (e) {}
  return ct;
}

function extractCPM(htmlContent, ct, cpm) {
  const cpmMapDiv = htmlContent.querySelectorAll('[cpmMap]')[0];
  if (cpmMapDiv) {
    let cpmMapJSON = JSON.parse(cpmMapDiv.getAttribute('cpmMap'));
    if ((cpmMapJSON)) {
      if (cpmMapJSON[ct]) {
        cpm = cpmMapJSON[ct];
      } else if (cpmMapJSON['default']) {
        cpm = cpmMapJSON['default'];
      }
    }
  }
  return cpm;
}

function extractCurrency(htmlContent, currency) {
  const currencyDiv = htmlContent.querySelectorAll('[cpmCurrency]')[0];
  if (currencyDiv) {
    const currencyValue = currencyDiv.getAttribute('cpmCurrency');
    if (currencyValue && currencyValue !== '') {
      currency = currencyValue;
    }
  }
  return currency;
}

function extractCreativeURL(htmlContent, ct, cpm, bid) {
  let creativeURL = null;
  const creativeMap = htmlContent.querySelectorAll('[creativeMap]')[0];
  if (creativeMap) {
    const creativeMapString = creativeMap.getAttribute('creativeMap');

    const creativeMapJSON = JSON.parse(creativeMapString);
    let defaultURL = null;
    for (const url of Object.keys(creativeMapJSON)) {
      const geo = creativeMapJSON[url];
      if (geo.includes(ct)) {
        creativeURL = replaceMacros(url, cpm, bid);
      } else if (geo.includes('default')) {
        defaultURL = url;
      }
    }
    if (!creativeURL && defaultURL) creativeURL = replaceMacros(defaultURL, cpm, bid);
  }
  return creativeURL;
}

function extractSyncs(htmlContent) {
  let userSyncsJSON = null;
  const userSyncs = htmlContent.querySelectorAll('[userSyncs]')[0];
  if (userSyncs) {
    const userSyncsString = userSyncs.getAttribute('userSyncs');

    userSyncsJSON = JSON.parse(userSyncsString);
  }
  return userSyncsJSON;
}

function extractTrackingURL(htmlContent, ret) {
  const trackingUrlDiv = htmlContent.querySelectorAll('[bidder-tracking-url]')[0];
  if (trackingUrlDiv) {
    const trackingUrl = trackingUrlDiv.getAttribute('bidder-tracking-url');
    logInfo(LOG_PREFIX + 'parseXML: trackingUrl: ', trackingUrl)
    ret.trackingUrl = trackingUrl;
  }
}

export function parseXML(xml, bid) {
  const ret = { cpm: 0.001, currency: 'EUR', creativeURL: null, bidUp: false };
  const ct = extractCT(xml);
  if (!ct) return ret;

  try {
    if (ct) {
      const companion = xml.getElementsByTagName('Companion')[0];
      const htmlResource = companion.getElementsByTagName('HTMLResource')[0];
      const htmlContent = document.createElement('html');
      htmlContent.innerHTML = htmlResource.textContent;

      ret.cpm = extractCPM(htmlContent, ct, ret.cpm);
      ret.currency = extractCurrency(htmlContent, ret.currency);
      ret.creativeURL = extractCreativeURL(htmlContent, ct, ret.cpm, bid);
      extractTrackingURL(htmlContent, ret);
      ret.bidUp = isAllowedToBidUp(htmlContent, getCurrentURL());
      ret.userSyncs = extractSyncs(htmlContent);
    }
  } catch (e) {
    logError(LOG_PREFIX + 'Error parsing XML', e);
  }
  logInfo(LOG_PREFIX + 'parseXML RET:', ret);

  return ret;
}
export function isAllowedToBidUp(html, currentURL) {
  currentURL = currentURL.split('?')[0]; // Remove parameters
  let allowedToPush = false;
  try {
    const domainsMap = html.querySelectorAll('[domainMap]')[0];
    if (domainsMap) {
      let domains = JSON.parse(domainsMap.getAttribute('domainMap'));
      if (domains.domainMap) {
        domains = domains.domainMap;
      }
      domains.forEach((d) => {
        if (currentURL.includes(d) || d === 'all' || d === '*') allowedToPush = true;
      })
    } else {
      allowedToPush = true;
    }
    if (allowedToPush) {
      const excludedURL = html.querySelectorAll('[excludedURLs]')[0];
      if (excludedURL) {
        const excludedURLsString = domainsMap.getAttribute('excludedURLs');
        if (excludedURLsString !== '') {
          let excluded = JSON.parse(excludedURLsString);
          excluded.forEach((d) => {
            if (currentURL.includes(d)) allowedToPush = false;
          })
        }
      }
    }
  } catch (e) {
    logError(LOG_PREFIX + 'isAllowedToBidUp', e);
  }
  return allowedToPush;
}

function getSyncData(options, syncs) {
  const ret = [];
  if (syncs?.length) {
    for (const sync of syncs) {
      if (sync.type === 'syncImage' && options.pixelEnabled) {
        ret.push({url: sync.url, type: 'image'});
      } else if (sync.type === 'syncIframe' && options.iframeEnabled) {
        ret.push({url: sync.url, type: 'iframe'});
      }
    }
  }
  return ret;
}

function getUserSyncs(syncOptions, serverResponses) {
  const userSyncs = [];
  for (const serverResponse of serverResponses) {
    if (serverResponse.body) {
      try {
        const xmlStr = serverResponse.body;
        const xml = new window.DOMParser().parseFromString(xmlStr, 'text/xml');
        const xmlData = parseXML(xml, {});
        if (xmlData.userSyncs) {
          userSyncs.push(...getSyncData(syncOptions, xmlData.userSyncs));
        }
      } catch (e) {}
    }
  }
  return userSyncs;
}

function onBidWon(bid) {
  logInfo(`${LOG_PREFIX} WON AMPLIFFY`);
  if (bid.trackingUrl) {
    let url = bid.trackingUrl;

    // Replace macros with URL-encoded bid parameters
    Object.keys(bid).forEach(key => {
      const macroKey = `%%${key.toUpperCase()}%%`;
      const value = encodeURIComponent(JSON.stringify(bid[key]));
      url = url.split(macroKey).join(value);
    });

    triggerPixel(url, () => {
      logInfo(`${LOG_PREFIX} send data success`);
    },
    (e) => {
      logError(`${LOG_PREFIX} send data error`, e);
    });
  }
}
function onTimeOut() {
  logInfo(LOG_PREFIX + 'TIMEOUT');
}

export const spec = {
  code: BIDDER_CODE,
  gvlid: GVLID,
  aliases: ['ampliffy', 'amp', 'videoffy', 'publiffy'],
  supportedMediaTypes: ['video', 'banner'],
  isBidRequestValid,
  buildRequests,
  interpretResponse,
  getUserSyncs,
  onTimeOut,
  onBidWon,
};

registerBidder(spec);
