import { registerBidder } from '../src/adapters/bidderFactory.js';
import { config } from '../src/config.js';
import * as utils from '../src/utils.js';
import { getStorageManager } from '../src/storageManager.js';

const CONSTANTS = {
  DSU_KEY: 'apr_dsu',
  BIDDER_CODE: 'apstream',
  GVLID: 394
};
const storage = getStorageManager(CONSTANTS.GVLID, CONSTANTS.BIDDER_CODE);

function serializeSizes(sizes) {
  if (Array.isArray(sizes[0]) === false) {
    sizes = [sizes];
  }

  return sizes.map(s => s[0] + 'x' + s[1]).join('_');
}

function getRawConsentString(gdprConsentConfig) {
  if (!gdprConsentConfig || gdprConsentConfig.gdprApplies === false) {
    return null;
  }

  return gdprConsentConfig.consentString;
}

function getConsentStringFromPrebid(gdprConsentConfig) {
  const consentString = getRawConsentString(gdprConsentConfig);
  if (!consentString) {
    return null;
  }

  let isIab = config.getConfig('consentManagement.cmpApi') != 'static';
  let vendorConsents = (
    gdprConsentConfig.vendorData.vendorConsents ||
    (gdprConsentConfig.vendorData.vendor || {}).consents ||
    {}
  );
  let isConsentGiven = !!vendorConsents[CONSTANTS.GVLID.toString(10)];

  return isIab && isConsentGiven ? consentString : null;
}

function getIabConsentString(bidderRequest) {
  if (utils.deepAccess(bidderRequest, 'gdprConsent')) {
    return getConsentStringFromPrebid(bidderRequest.gdprConsent);
  }

  return null;
}

function injectPixels(ad, pixels, scripts) {
  if (!pixels && !scripts) {
    return ad;
  }

  let trackedAd = ad;
  if (pixels) {
    pixels.forEach(pixel => {
      const tracker = utils.createTrackPixelHtml(pixel);
      trackedAd += tracker;
    });
  }

  if (scripts) {
    scripts.forEach(script => {
      const tracker = `<script src="${script}"></script>`;
      trackedAd += tracker;
    });
  }

  return trackedAd;
}

function getScreenParams() {
  return `${window.screen.width}x${window.screen.height}@${window.devicePixelRatio}`;
}

function getBids(bids) {
  const bidArr = bids.map(bid => {
    const bidId = bid.bidId;

    let mediaType = '';
    const mediaTypes = Object.keys(bid.mediaTypes)
    switch (mediaTypes[0]) {
      case 'video':
        mediaType = 'v';
        break;

      case 'native':
        mediaType = 'n';
        break;

      case 'audio':
        mediaType = 'a';
        break;

      default:
        mediaType = 'b';
        break;
    }

    let adUnitCode = `,c=${bid.adUnitCode}`;
    if (bid.params.code) {
      adUnitCode = `,c=${encodeURIComponent(bid.params.code)}`;
    }
    if (bid.params.adunitId) {
      adUnitCode = `,u=${encodeURIComponent(bid.params.adunitId)}`;
    }

    return `${bidId}:t=${mediaType},s=${serializeSizes(bid.sizes)}${adUnitCode}`;
  });

  return bidArr.join(';');
};

function getEndpointsGroups(bidRequests) {
  let endpoints = [];
  const getEndpoint = bid => {
    if (bid.params.test) {
      return `https://mock-bapi.userreport.com/v2/${bid.params.publisherId}/bid`;
    }

    if (bid.params.endpoint) {
      return `${bid.params.endpoint}${bid.params.publisherId}/bid`;
    }

    return `https://bapi.userreport.com/v2/${bid.params.publisherId}/bid`;
  }
  bidRequests.forEach(bid => {
    const exist = endpoints.filter(item => item.endpoint.indexOf(bid.params.endpoint) > -1)[0];
    if (exist) {
      exist.bids.push(bid);
    } else {
      endpoints.push({
        endpoint: getEndpoint(bid),
        bids: [bid]
      });
    }
  });

  return endpoints;
}

function isBidRequestValid(bid) {
  const isPublisherIdExist = !!bid.params.publisherId;
  const isOneMediaType = Object.keys(bid.mediaTypes).length === 1;

  return isPublisherIdExist && isOneMediaType;
}

function buildRequests(bidRequests, bidderRequest) {
  const data = {
    med: encodeURIComponent(window.location.href),
    auid: bidderRequest.auctionId,
    ref: document.referrer,
    dnt: Number(window.navigator.doNotTrack) || 0,
    sr: getScreenParams()
  };

  const consentData = getRawConsentString(bidderRequest.gdprConsent);
  data.iab_consent = consentData;

  let options = {
    withCredentials: true
  };

  const isConsent = getIabConsentString(bidderRequest);
  if (isConsent) {
    // eslint-disable-next-line
    const dsuModule=function(){"use strict";var n="apr_dsu",r="1",e="YicAu6ZpNG",t={USERREPORT:"1"};function o(n,r){var e=n.l+r.l,t={h:n.h+r.h+(e/2>>>31)>>>0,l:e>>>0};n.h=t.h,n.l=t.l}function x(n,r){n.h^=r.h,n.h>>>=0,n.l^=r.l,n.l>>>=0}function a(n,r){var e={h:n.h<<r|n.l>>>32-r,l:n.l<<r|n.h>>>32-r};n.h=e.h,n.l=e.l}function u(n){var r=n.l;n.l=n.h,n.h=r}function i(n,r,e,t){o(n,r),o(e,t),a(r,13),a(t,16),x(r,n),x(t,e),u(n),o(e,r),o(n,t),a(r,17),a(t,21),x(r,e),x(t,n),u(e)}function l(n,r){return n[r+3]<<24|n[r+2]<<16|n[r+1]<<8|n[r]}function c(n,r){"string"==typeof r&&(r=function(n){if("function"==typeof TextEncoder)return(new TextEncoder).encode(n);n=unescape(encodeURIComponent(n));for(var r=new Uint8Array(n.length),e=0,t=n.length;e<t;e++)r[e]=n.charCodeAt(e);return r}(r));var e={h:n[1]>>>0,l:n[0]>>>0},t={h:n[3]>>>0,l:n[2]>>>0},o={h:e.h,l:e.l},a=e,u={h:t.h,l:t.l},c=t,f=r.length,h=f-7,s=new Uint8Array(new ArrayBuffer(8));x(o,{h:1936682341,l:1886610805}),x(u,{h:1685025377,l:1852075885}),x(a,{h:1819895653,l:1852142177}),x(c,{h:1952801890,l:2037671283});for(var d=0;d<h;){var v={h:l(r,d+4),l:l(r,d)};x(c,v),i(o,u,a,c),i(o,u,a,c),x(o,v),d+=8}s[7]=f;for(var p=0;d<f;)s[p++]=r[d++];for(;p<7;)s[p++]=0;var g={h:s[7]<<24|s[6]<<16|s[5]<<8|s[4],l:s[3]<<24|s[2]<<16|s[1]<<8|s[0]};x(c,g),i(o,u,a,c),i(o,u,a,c),x(o,g),x(a,{h:0,l:255}),i(o,u,a,c),i(o,u,a,c),i(o,u,a,c),i(o,u,a,c);var y=o;return x(y,u),x(y,a),x(y,c),y}var f=function(n,r){var e=c(n,r);return("0000000"+e.h.toString(16)).substr(-8)+("0000000"+e.l.toString(16)).substr(-8)}.bind(null,[2251905623,1801168887,1769155591,711914637]),h=new RegExp("^(([^:/?#]+):)?(//([^/?#]*))?([^?#]*)(\\?([^#]*))?(#(.*))?"),s=null,d={};function v(){var n=s||window.location.toString();if(n=n.replace(/\.demo\.audienceproject\.com\//,"/"),d.url===n)return d.parsed;var r=function(n){var r=0!==n.indexOf("/")&&-1!==n.indexOf("/")&&(-1===n.indexOf(":")||n.indexOf(":")>n.indexOf("/")),e=h.exec(r?"noscheme://"+n:n),t={scheme:r?"":e[2]||"",host:e[4]||"",hostname:e[4]?e[4].split(":")[0]:"",pathname:e[5]||"",search:e[7]||"",hash:e[9]||"",toString:function(){return n}};return t.origin=t.scheme+"://"+t.host,t}(n);return d.url=n,d.parsed=r,r}function p(){var n=function(){if("function"==typeof Uint32Array&&"undefined"!=typeof crypto&&void 0!==crypto.getRandomValues){var n=new Uint32Array(4);crypto.getRandomValues(n);var r=-1;return"xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g,function(e){var t=n[++r>>3]>>r%8*4&15;return("x"===e?t:3&t|8).toString(16)})}var e=(new Date).getTime();return"undefined"!=typeof performance&&"function"==typeof performance.now&&(e+=performance.now()),"xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g,function(n){var r=(e+16*Math.random())%16|0;return e=Math.floor(e/16),("x"===n?r:3&r|8).toString(16)})}(),o=v(),x=f(n+o.toString()),a=x.substr(0,4),u=x.substr(4);n=n.substr(0,19)+a+"-"+u;var i,l=(i=(new Date).getTime()-new Date(2019,0,1).getTime(),Math.floor(i/864e5)),c=f(o.origin),h=[t.USERREPORT,l,c].join("."),s=f(n+h+e);return[r,s,n,h].join(".")}return{readOrCreateDsu:function(){var r;try{r=storage.getDataFromLocalStorage(n)}catch(n){return null}r||(r=p());try{storage.setDataInLocalStorage(n,r)}catch(n){return null}return r}}}();

    data.dsu = dsuModule.readOrCreateDsu();
  } else {
    data.dsu = '';
    options.withCredentials = false;
  }

  const endpoints = getEndpointsGroups(bidRequests);
  const serverRequests = endpoints.map(item => ({
    method: 'GET',
    url: item.endpoint,
    data: {
      ...data,
      bids: getBids(item.bids),
      rnd: Math.random()
    },
    options: options
  }));

  return serverRequests;
}

function interpretResponse(serverResponse) {
  let bidResponses = serverResponse && serverResponse.body;

  if (!bidResponses || !bidResponses.length) {
    return [];
  }

  return bidResponses.map(x => ({
    requestId: x.bidId,
    cpm: x.bidDetails.cpm,
    width: x.bidDetails.width,
    height: x.bidDetails.height,
    creativeId: x.bidDetails.creativeId,
    currency: x.bidDetails.currency || 'USD',
    netRevenue: x.bidDetails.netRevenue,
    dealId: x.bidDetails.dealId,
    ad: injectPixels(x.bidDetails.ad, x.bidDetails.noticeUrls, x.bidDetails.impressionScripts),
    ttl: x.bidDetails.ttl,
  }));
}

export const spec = {
  code: CONSTANTS.BIDDER_CODE,
  gvlid: CONSTANTS.GVLID,
  isBidRequestValid: isBidRequestValid,
  buildRequests: buildRequests,
  interpretResponse: interpretResponse
}

registerBidder(spec);
