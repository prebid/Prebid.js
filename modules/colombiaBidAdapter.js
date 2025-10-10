import { ajax } from '../src/ajax.js';
import * as utils from '../src/utils.js';
import {config} from '../src/config.js';
import {registerBidder} from '../src/adapters/bidderFactory.js';
import { BANNER } from '../src/mediaTypes.js';
const BIDDER_CODE = 'colombia';
const ENDPOINT_URL = 'https://ade.clmbtech.com/cde/prebid.htm';
const ENDPOINT_TIMEOUT = "https://ade.clmbtech.com/cde/bidNotify.htm";
const HOST_NAME = document.location.protocol + '//' + window.location.host;

export const spec = {
  code: BIDDER_CODE,
  aliases: ['clmb'],
  supportedMediaTypes: [BANNER],
  isBidRequestValid: function(bid) {
    return !!(bid.params.placementId);
  },
  buildRequests: function(validBidRequests, bidderRequest) {
    if (validBidRequests.length === 0) {
      return [];
    }
    const payloadArr = []
    let ctr = 1;
    validBidRequests.forEach(bidRequest => {
      const params = bidRequest.params;
      const sizes = utils.parseSizesInput(bidRequest.sizes)[0];
      const width = sizes.split('x')[0];
      const height = sizes.split('x')[1];
      const placementId = params.placementId;
      const cb = Math.floor(Math.random() * 99999999999);
      const bidId = bidRequest.bidId;
      const referrer = (bidderRequest && bidderRequest.refererInfo && bidderRequest.refererInfo.referer) ? bidderRequest.refererInfo.referer : '';
      const mediaTypes = {}
      const payload = {
        v: 'hb1',
        p: placementId,
        pos: '~' + ctr,
        w: width,
        h: height,
        cb: cb,
        r: referrer,
        uid: bidId,
        t: 'i',
        d: HOST_NAME,
        fpc: params.fpc,
        _u: window.location.href,
        mediaTypes: Object.assign({}, mediaTypes, bidRequest.mediaTypes)
      };
      if (params.keywords) payload.keywords = params.keywords;
      if (params.category) payload.cat = params.category;
      if (params.pageType) payload.pgt = params.pageType;
      if (params.incognito) payload.ic = params.incognito;
      if (params.dsmi) payload.smi = params.dsmi;
      if (params.optout) payload.out = params.optout;
      if (bidRequest && bidRequest.hasOwnProperty('ortb2Imp') && bidRequest.ortb2Imp.hasOwnProperty('ext')) {
        payload.ext = bidRequest.ortb2Imp.ext;
        if (bidRequest.ortb2Imp.ext.hasOwnProperty('gpid')) payload.pubAdCode = bidRequest.ortb2Imp.ext.gpid.split('#')[0];
      }
      payloadArr.push(payload);
      ctr++;
    });
    return [{
      method: 'POST',
      url: ENDPOINT_URL,
      data: payloadArr,
    }]
  },
  interpretResponse: function(serverResponse, bidRequest) {
    const bidResponses = [];
    const res = serverResponse.body || serverResponse;
    if (!res || res.length === 0) {
      return bidResponses;
    }
    try {
      res.forEach(response => {
        const crid = response.creativeId || 0;
        const width = response.width || 0;
        const height = response.height || 0;
        const cpm = response.cpm || 0;
        if (cpm <= 0) {
          return bidResponses;
        }
        if (width !== 0 && height !== 0 && cpm !== 0 && crid !== 0) {
          const dealId = response.dealid || '';
          const currency = response.currency || 'USD';
          const netRevenue = (response.netRevenue === undefined) ? true : response.netRevenue;
          const bidResponse = {
            requestId: response.requestId,
            cpm: cpm.toFixed(2),
            width: response.width,
            height: response.height,
            creativeId: crid,
            dealId: dealId,
            currency: currency,
            netRevenue: netRevenue,
            ttl: config.getConfig('_bidderTimeout') || 300,
            referrer: bidRequest.data.r,
            ad: response.ad
          };
          if (response.eventTrackers) {
            bidResponse.eventTrackers = response.eventTrackers;
          }
          if (response.ext) {
            bidResponse.ext = response.ext;
          }
          bidResponses.push(bidResponse);
        }
      });
    } catch (error) {
      utils.logError(error);
    }
    return bidResponses;
  },
  onBidWon: function (bid) {
    let ENDPOINT_BIDWON = null;
    if (bid.eventTrackers && bid.eventTrackers.length) {
      const matched = bid.eventTrackers.find(tracker => tracker.event === 500);
      if (matched && matched.url) {
        ENDPOINT_BIDWON = matched.url;
      }
    }
    if (!ENDPOINT_BIDWON) return;
    const payload = {};
    payload.bidNotifyType = 1;
    payload.evt = bid.ext && bid.ext.evtData;

    ajax(ENDPOINT_BIDWON, null, JSON.stringify(payload), {
      method: 'POST',
      withCredentials: false
    });
  },

  onTimeout: function (timeoutData) {
    if (timeoutData === null || !timeoutData.length) {
      return;
    }
    let pubAdCodes = [];
    timeoutData.forEach(data => {
      if (data && data.ortb2Imp && data.ortb2Imp.ext && typeof data.ortb2Imp.ext.gpid === 'string') {
        pubAdCodes.push(data.ortb2Imp.ext.gpid.split('#')[0]);
      };
    });
    const pubAdCodesString = pubAdCodes.join(',');
    const payload = {};
    payload.bidNotifyType = 2;
    payload.pubAdCodeNames = pubAdCodesString;

    ajax(ENDPOINT_TIMEOUT, null, JSON.stringify(payload), {
      method: 'POST',
      withCredentials: false
    });
  }
}
registerBidder(spec);
