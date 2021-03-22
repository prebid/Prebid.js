import * as utils from '../src/utils.js';
import { ajax } from '../src/ajax.js';
import { registerBidder } from '../src/adapters/bidderFactory.js';
import { config } from '../src/config.js';
import { BANNER } from '../src/mediaTypes.js';
const BIDDER_CODE = 'doceree';
const END_POINT = 'https://bidder.doceree.com'

function registerImpression(responseJson) {
  return (function() {
    if (responseJson.impressionLink) {
      ajax(responseJson.impressionLink, function() {
        // nothing to do
      }, null, {method: 'GET', customHeaders: {'Content-type': 'application/json; charset=utf-8'}});
    }
    return ''
  })()
}

function processHTMLAndRender(responseJson, creativeHtml) {
  if (responseJson.sourceURL) {
    creativeHtml = creativeHtml.replace('<head>', `<head><style>html,body{padding:0;margin:0;}</style><base href="${responseJson.sourceURL.split('unzip')[0]}unzip/" target="_blank">`);
  }
  creativeHtml = creativeHtml.replace('<body', `<body onload="${registerImpression(responseJson)}" `);
  creativeHtml = creativeHtml.replaceAll('[TRACKING_LINK]', responseJson.ctaLink);
  creativeHtml = creativeHtml.replaceAll(/DOCEREE_CLICK_URL_UNESC/g, responseJson.ctaLink);
  while (creativeHtml.indexOf('_ucid') > -1) {
    creativeHtml = creativeHtml.replace('_ucid', utils.generateUUID())
  }
  return creativeHtml;
}

export const spec = {
  code: BIDDER_CODE,
  url: '',
  supportedMediaTypes: [ BANNER ],

  isBidRequestValid: (bid) => {
    const { placementId } = bid.params;
    return !!placementId
  },
  buildRequests: (validBidRequests) => {
    const serverRequests = [];
    const { data } = config.getConfig('doceree.user')
    const { page, domain, token } = config.getConfig('doceree.context')
    const encodedUserInfo = window.btoa(encodeURIComponent(JSON.stringify(data)))

    validBidRequests.forEach(function(validBidRequest) {
      const { publisherUrl, placementId } = validBidRequest.params;
      const url = publisherUrl || page
      let queryString = '';
      queryString = utils.tryAppendQueryString(queryString, 'id', placementId);
      queryString = utils.tryAppendQueryString(queryString, 'publisherDomain', domain);
      queryString = utils.tryAppendQueryString(queryString, 'pubRequestedURL', encodeURIComponent(url));
      queryString = utils.tryAppendQueryString(queryString, 'loggedInUser', encodedUserInfo);
      queryString = utils.tryAppendQueryString(queryString, 'currentUrl', url);
      queryString = utils.tryAppendQueryString(queryString, 'prebidjs', true);
      queryString = utils.tryAppendQueryString(queryString, 'token', token);
      queryString = utils.tryAppendQueryString(queryString, 'requestId', validBidRequest.bidId);

      serverRequests.push({
        method: 'GET',
        url: END_POINT + '/v1/adrequest?' + queryString
      })
    })
    return serverRequests;
  },
  interpretResponse: (serverResponse, request) => {
    const responseJson = serverResponse ? serverResponse.body : {};
    const placementId = responseJson.DIVID;
    const bidResponse = {
      width: Number(responseJson.width),
      height: Number(responseJson.height),
      requestId: responseJson.guid,
      netRevenue: true,
      ttl: 30,
      cpm: responseJson.cpmBid,
      currency: responseJson.currency,
      mediaType: 'banner',
      creativeId: placementId,
      meta: {
        advertiserDomains: [responseJson.advertiserDomain]
      }
    };

    if (responseJson.creativeType && responseJson.creativeType !== 'banner') {
      if (responseJson.sourceHTML) {
        responseJson.sourceHTML = responseJson.sourceHTML.replace(/[\uE000-\uF8FF]/g, '');
        let creative = processHTMLAndRender(responseJson, responseJson.sourceHTML)
        bidResponse.ad = `<div id="${placementId}">${creative}</div>`
      } else {
        bidResponse.ad = `<iframe id="ifrm" src="${responseJson.sourceURL}" onload="${registerImpression(responseJson)}" style="border:none;margin:0"></iframe>`
      }
    } else {
      if (responseJson.ctaLink) {
        bidResponse.ad = `<a href="${responseJson.ctaLink}" target="_blank"><img onload="${registerImpression(responseJson)}" src="${responseJson.sourceURL}" /></a>`;
      } else {
        bidResponse.ad = `<div id="${placementId}"><img onload="${registerImpression(responseJson)}" src="${responseJson.sourceURL}" /></div>`;
      }
    }
    return [bidResponse];
  }
};

registerBidder(spec);
