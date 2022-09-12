import { tryAppendQueryString } from '../src/utils.js';
import { registerBidder } from '../src/adapters/bidderFactory.js';
import { config } from '../src/config.js';
import { BANNER } from '../src/mediaTypes.js';
const BIDDER_CODE = 'doceree';
const END_POINT = 'https://bidder.doceree.com'

export const spec = {
  code: BIDDER_CODE,
  url: '',
  supportedMediaTypes: [ BANNER ],

  isBidRequestValid: (bid) => {
    const { placementId } = bid.params;
    return !!placementId
  },
  isGdprConsentPresent: (bid) => {
    const { gdpr, gdprConsent } = bid.params;
    if (gdpr == '1') {
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
  }
};

registerBidder(spec);
