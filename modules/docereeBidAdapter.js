import { registerBidder } from '../src/adapters/bidderFactory.js';
import { triggerPixel } from '../src/utils.js';
import { config } from '../src/config.js';
import { BANNER } from '../src/mediaTypes.js';
import {tryAppendQueryString} from '../libraries/urlUtils/urlUtils.js';
const BIDDER_CODE = 'doceree';
const GVLID = 1063;
const END_POINT = 'https://bidder.doceree.com'
const TRACKING_END_POINT = 'https://tracking.doceree.com'

export const spec = {
  code: BIDDER_CODE,
  gvlid: GVLID,
  url: '',
  supportedMediaTypes: [ BANNER ],

  isBidRequestValid: (bid) => {
    const { placementId } = bid.params;
    return !!placementId
  },
  isGdprConsentPresent: (bid) => {
    const { gdpr, gdprConsent } = bid.params;
    if (Number(gdpr) === 1) {
      return !!gdprConsent
    }
    return true
  },
  buildRequests: (validBidRequests) => {
    const serverRequests = [];
    const { data } = config.getConfig('doceree.user')
    // TODO: this should probably look at refererInfo
    const { page, domain, token } = config.getConfig('doceree.context')
    const encodedUserInfo = window.btoa(encodeURIComponent(JSON.stringify(data)))

    validBidRequests.forEach(function(validBidRequest) {
      const { publisherUrl, placementId, gdpr, gdprConsent } = validBidRequest.params;
      const url = publisherUrl || page
      let queryString = '';
      queryString = tryAppendQueryString(queryString, 'id', placementId);
      queryString = tryAppendQueryString(queryString, 'publisherDomain', domain);
      queryString = tryAppendQueryString(queryString, 'pubRequestedURL', encodeURIComponent(url));
      queryString = tryAppendQueryString(queryString, 'loggedInUser', encodedUserInfo);
      queryString = tryAppendQueryString(queryString, 'currentUrl', url);
      queryString = tryAppendQueryString(queryString, 'prebidjs', true);
      queryString = tryAppendQueryString(queryString, 'token', token);
      queryString = tryAppendQueryString(queryString, 'requestId', validBidRequest.bidId);
      queryString = tryAppendQueryString(queryString, 'gdpr', gdpr);
      queryString = tryAppendQueryString(queryString, 'gdpr_consent', gdprConsent);

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
      ad: responseJson.sourceHTML,
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
    return [bidResponse];
  },
  onTimeout: function(timeoutData) {
    if (timeoutData == null || !timeoutData.length) {
      return;
    }
    timeoutData.forEach(td => {
      const encodedBuf = window.btoa(encodeURIComponent(JSON.stringify({
        bidId: td.bidId,
        timeout: td.timeout,
      })));
      triggerPixel(TRACKING_END_POINT + '/v1/hbTimeout?adp=prebidjs&data=' + encodedBuf);
    })
  },
  onBidWon: function (bidWon) {
    if (bidWon == null) {
      return;
    }
    const encodedBuf = window.btoa(encodeURIComponent(JSON.stringify({
      requestId: bidWon.requestId,
      cpm: bidWon.cpm,
      adId: bidWon.adId,
      currency: bidWon.currency,
      netRevenue: bidWon.netRevenue,
      status: bidWon.status,
      hb_pb: bidWon.adserverTargeting && bidWon.adserverTargeting.hb_pb,
    })));
    triggerPixel(TRACKING_END_POINT + '/v1/hbBidWon?adp=prebidjs&data=' + encodedBuf);
  }
};

registerBidder(spec);
