import * as utils from '../src/utils.js';
import {registerBidder} from '../src/adapters/bidderFactory.js';

const BIDDER_CODE = 'admixer';
const ALIASES = ['go2net'];
const ENDPOINT_URL = 'https://inv-nets.admixer.net/prebid.1.1.aspx';
export const spec = {
  code: BIDDER_CODE,
  aliases: ALIASES,
  supportedMediaTypes: ['banner', 'video'],
  /**
   * Determines whether or not the given bid request is valid.
   */
  isBidRequestValid: function (bid) {
    return !!bid.params.zone;
  },
  /**
   * Make a server request from the list of BidRequests.
   */
  buildRequests: function (validRequest, bidderRequest) {
    const payload = {
      imps: [],
    };
    if (bidderRequest) {
      if (bidderRequest.refererInfo && bidderRequest.refererInfo.referer) {
        payload.referrer = encodeURIComponent(bidderRequest.refererInfo.referer);
      }
      if (bidderRequest.gdprConsent) {
        payload.gdprConsent = {
          consentString: bidderRequest.gdprConsent.consentString,
          // will check if the gdprApplies field was populated with a boolean value (ie from page config).  If it's undefined, then default to true
          gdprApplies: (typeof bidderRequest.gdprConsent.gdprApplies === 'boolean') ? bidderRequest.gdprConsent.gdprApplies : true
        }
      }
      if (bidderRequest.uspConsent) {
        payload.uspConsent = bidderRequest.uspConsent;
      }
    }
    validRequest.forEach((bid) => {
      payload.imps.push(bid);
    });
    const payloadString = JSON.stringify(payload);
    return {
      method: 'GET',
      url: ENDPOINT_URL,
      data: `data=${payloadString}`,
    };
  },
  /**
   * Unpack the response from the server into a list of bids.
   */
  interpretResponse: function (serverResponse, bidRequest) {
    const bidResponses = [];
    try {
      const {body: {ads = []} = {}} = serverResponse;
      ads.forEach((bidResponse) => {
        const bidResp = {
          requestId: bidResponse.bidId,
          cpm: bidResponse.cpm,
          width: bidResponse.width,
          height: bidResponse.height,
          ad: bidResponse.ad,
          ttl: bidResponse.ttl,
          creativeId: bidResponse.creativeId,
          netRevenue: bidResponse.netRevenue,
          currency: bidResponse.currency,
          vastUrl: bidResponse.vastUrl,
          dealId: bidResponse.dealId,
        };
        bidResponses.push(bidResp);
      });
    } catch (e) {
      utils.logError(e);
    }
    return bidResponses;
  },
  getUserSyncs: function(syncOptions, serverResponses, gdprConsent) {
    const pixels = [];
    serverResponses.forEach(({body: {cm = {}} = {}}) => {
      const {pixels: img = [], iframes: frm = []} = cm;
      if (syncOptions.pixelEnabled) {
        img.forEach((url) => pixels.push({type: 'image', url}));
      }
      if (syncOptions.iframeEnabled) {
        frm.forEach((url) => pixels.push({type: 'iframe', url}));
      }
    });
    return pixels;
  }
};
registerBidder(spec);
