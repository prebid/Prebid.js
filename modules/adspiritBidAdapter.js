import * as utils from '../src/utils.js';
import { registerBidder } from '../src/adapters/bidderFactory.js';
import { BANNER, NATIVE } from '../src/mediaTypes.js';

const RTB_URL = '/rtb/getbid.php?rtbprovider=prebid';
const SCRIPT_URL = '/adasync.min.js';

export const spec = {

  code: 'adspirit',
  aliases: ['twiago'],
  supportedMediaTypes: [BANNER, NATIVE],

  isBidRequestValid: function (bid) {
    let host = spec.getBidderHost(bid);
    if (!host || !bid.params.placementId) {
      return false;
    }
    return true;
  },

  buildRequests: function (validBidRequests, bidderRequest) {
    let requests = [];
    for (let i = 0; i < validBidRequests.length; i++) {
      let bidRequest = validBidRequests[i];
      bidRequest.adspiritConId = spec.genAdConId(bidRequest);
      let reqUrl = spec.getBidderHost(bidRequest);
      let placementId = utils.getBidIdParameter('placementId', bidRequest.params);
      reqUrl = '//' + reqUrl + RTB_URL + '&pid=' + placementId +
        '&ref=' + encodeURIComponent(bidderRequest.refererInfo.topmostLocation) +
        '&scx=' + (screen.width) +
        '&scy=' + (screen.height) +
        '&wcx=' + (window.innerWidth || document.documentElement.clientWidth) +
        '&wcy=' + (window.innerHeight || document.documentElement.clientHeight) +
        '&async=' + bidRequest.adspiritConId +
        '&t=' + Math.round(Math.random() * 100000);

      let data = {};

      if (bidderRequest && bidderRequest.gdprConsent) {
        const gdprConsentString = bidderRequest.gdprConsent.consentString;
        reqUrl += '&gdpr=' + encodeURIComponent(gdprConsentString);
      }

      if (bidRequest.schain && bidderRequest.schain) {
        data.schain = bidRequest.schain;
      }

      requests.push({
        method: 'GET',
        url: reqUrl,
        data: data,
        bidRequest: bidRequest
      });
    }
    return requests;
  },
  interpretResponse: function(serverResponse, bidRequest) {
    const bidResponses = [];
    let bidObj = bidRequest.bidRequest;

    if (!serverResponse || !serverResponse.body || !bidObj) {
      utils.logWarn(`No valid bids from ${spec.code} bidder!`);
      return [];
    }

    let adData = serverResponse.body;
    let cpm = adData.cpm;

    if (!cpm) {
      return [];
    }

    let host = spec.getBidderHost(bidObj);

    const bidResponse = {
      requestId: bidObj.bidId,
      cpm: cpm,
      width: adData.w,
      height: adData.h,
      creativeId: bidObj.params.placementId,
      currency: 'EUR',
      netRevenue: true,
      ttl: 300,
      meta: {
        advertiserDomains: bidObj && bidObj.adomain ? bidObj.adomain : []
      }
    };

    if ('mediaTypes' in bidObj && 'native' in bidObj.mediaTypes) {
      bidResponse.native = {
        title: adData.title,
        body: adData.body,
        cta: adData.cta,
        image: { url: adData.image },
        clickUrl: adData.click,
        impressionTrackers: [adData.view]
      };
      bidResponse.mediaType = NATIVE;
    } else {
      let adm = '<script>window.inDapIF=false</script><script src="//' + host + SCRIPT_URL + '"></script><ins id="' + bidObj.adspiritConId + '"></ins>' + adData.adm;
      bidResponse.ad = adm;
      bidResponse.mediaType = BANNER;
    }

    bidResponses.push(bidResponse);
    return bidResponses;
  },
  getBidderHost: function (bid) {
    if (bid.bidder === 'adspirit') {
      return utils.getBidIdParameter('host', bid.params);
    }
    if (bid.bidder === 'twiago') {
      return 'a.twiago.com';
    }
    return null;
  },

  genAdConId: function (bid) {
    return bid.bidder + Math.round(Math.random() * 100000);
  }
};

registerBidder(spec);
