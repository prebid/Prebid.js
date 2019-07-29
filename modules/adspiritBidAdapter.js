import * as utils from '../src/utils';
import {registerBidder} from '../src/adapters/bidderFactory';
const RTB_URL = '/rtb/getbid.php?rtbprovider=prebid';
const SCRIPT_URL = '/adasync.min.js';
export const spec = {
  code: 'adspirit',
  aliases: ['xapadsmedia', 'connectad'],
  isBidRequestValid: function(bid) {
    let host = spec.getBidderHost(bid);
    if (!host) return false;
    if (!bid.params.placementId) return false;
    return true;
  },
  buildRequests: function(validBidRequests) {
    let requests = [];
    let bidRequest;
    let reqUrl;
    let placementId;
    let page ={};
    for (let i = 0; i < validBidRequests.length; i++) {
      bidRequest = validBidRequests[i];
      bidRequest.adspiritConId = spec.genAdConId(bidRequest);
      reqUrl = spec.getBidderHost(bidRequest);
      placementId = utils.getBidIdParameter('placementId', bidRequest.params);
      reqUrl = '//' + reqUrl + RTB_URL + '&pid=' + placementId + '&ref=' + encodeURIComponent(utils.getTopWindowUrl()) + '&scx=' + (screen.width) + '&scy=' + (screen.height) + '&wcx=' + ('innerWidth' in window ? window.innerWidth : page.clientWidth) + '&wcy=' + ('innerHeight' in window ? window.innerHeight : page.clientHeight) + '&async=' + bidRequest.adspiritConId + '&t=' + Math.round(Math.random() * 100000);
      requests.push({
        method: 'GET',
        url: reqUrl,
        data: {},
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
    if (!cpm) return [];

    let host = spec.getBidderHost(bidObj);
    let adm = '<scr' + 'ipt>window.inDapIF=false</scr' + 'ipt><scr' + 'ipt src="//' + host + SCRIPT_URL + '"></scr' + 'ipt>' + '<ins id="' + bidObj.adspiritConId + '"></ins>' + adData.adm;
    const bidResponse = {
      requestId: bidObj.bidId,
      cpm: cpm,
      width: adData.w,
      height: adData.h,
      creativeId: bidObj.params.placementId,
      currency: 'EUR',
      netRevenue: true,
      ttl: 300,
      ad: adm
    };
    bidResponses.push(bidResponse);
    return bidResponses;
  },
  getBidderHost: function(bid) {
    if (bid.bidder === 'adspirit') return utils.getBidIdParameter('host', bid.params);
    if (bid.bidder === 'connectad') return 'connected-by.connectad.io';
    if (bid.bidder === 'xapadsmedia') return 'dsp.xapads.com';
    return null;
  },
  genAdConId: function(bid) {
    return bid.bidder + Math.round(Math.random() * 100000);
  }
}
registerBidder(spec);
