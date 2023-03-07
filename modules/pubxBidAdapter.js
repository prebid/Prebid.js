import { deepSetValue } from '../src/utils.js';
import { registerBidder } from '../src/adapters/bidderFactory.js';

const BIDDER_CODE = 'pubx';
const BID_ENDPOINT = 'https://api.primecaster.net/adlogue/api/slot/bid';
const USER_SYNC_URL = 'https://api.primecaster.net/primecaster_dmppv.html'
export const spec = {
  code: BIDDER_CODE,
  isBidRequestValid: function(bid) {
    if (!(bid.params.sid)) {
      return false;
    } else { return true }
  },
  buildRequests: function(validBidRequests) {
    return validBidRequests.map(bidRequest => {
      const bidId = bidRequest.bidId;
      const params = bidRequest.params;
      const sid = params.sid;
      const payload = {
        sid: sid
      };
      return {
        id: bidId,
        method: 'GET',
        url: BID_ENDPOINT,
        data: payload,
      }
    });
  },
  interpretResponse: function(serverResponse, bidRequest) {
    const body = serverResponse.body;
    const bidResponses = [];
    if (body.cid) {
      const bidResponse = {
        requestId: bidRequest.id,
        cpm: body.cpm,
        currency: body.currency,
        width: body.width,
        height: body.height,
        creativeId: body.cid,
        netRevenue: true,
        ttl: body.TTL,
        ad: body.adm
      };
      if (body.adomains) {
        deepSetValue(bidResponse, 'meta.advertiserDomains', Array.isArray(body.adomains) ? body.adomains : [body.adomains]);
      }
      bidResponses.push(bidResponse);
    } else {};
    return bidResponses;
  },
  /**
   * Determine which user syncs should occur
   * @param {object} syncOptions
   * @param {array} serverResponses
   * @returns {array} User sync pixels
   */
  getUserSyncs: function (syncOptions, serverResponses) {
    const kwTag = document.getElementsByName('keywords');
    let kwString = '';
    let kwEnc = '';
    let titleContent = !!document.title && document.title;
    let titleEnc = '';
    let descContent = !!document.getElementsByName('description') && !!document.getElementsByName('description')[0] && document.getElementsByName('description')[0].content;
    let descEnc = '';
    const pageUrl = location.href.replace(/\?.*$/, '');
    const pageEnc = encodeURIComponent(pageUrl);
    const refUrl = document.referrer.replace(/\?.*$/, '');
    const refEnc = encodeURIComponent(refUrl);
    if (kwTag.length) {
      const kwContents = kwTag[0].content;
      if (kwContents.length > 20) {
        const kwArray = kwContents.substr(0, 20).split(',');
        kwArray.pop();
        kwString = kwArray.join();
      } else {
        kwString = kwContents;
      }
      kwEnc = encodeURIComponent(kwString);
    } else { }
    if (titleContent) {
      if (titleContent.length > 30) {
        titleContent = titleContent.substr(0, 30);
      } else {};
      titleEnc = encodeURIComponent(titleContent);
    } else { };
    if (descContent) {
      if (descContent.length > 60) {
        descContent = descContent.substr(0, 60);
      } else {};
      descEnc = encodeURIComponent(descContent);
    } else { };
    return (syncOptions.iframeEnabled) ? [{
      type: 'iframe',
      url: USER_SYNC_URL + '?pkw=' + kwEnc + '&pd=' + descEnc + '&pu=' + pageEnc + '&pref=' + refEnc + '&pt=' + titleEnc
    }] : [];
  }
}
registerBidder(spec);
