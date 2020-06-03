import * as utils from '../src/utils.js';
import {config} from '../src/config.js';
import {registerBidder} from '../src/adapters/bidderFactory.js';
import { BANNER, VIDEO } from '../src/mediaTypes.js';

const BIDDER_CODE = 'dspx';
const ENDPOINT_URL = 'https://buyer.dspx.tv/request/';
const ENDPOINT_URL_DEV = 'https://dcbuyer.dspx.tv/request/';
const DEFAULT_VAST_FORMAT = 'vast2';

export const spec = {
  code: BIDDER_CODE,
  aliases: ['dspx'],
  supportedMediaTypes: [BANNER, VIDEO],
  isBidRequestValid: function(bid) {
    return !!(bid.params.placement);
  },
  buildRequests: function(validBidRequests, bidderRequest) {
    return validBidRequests.map(bidRequest => {
      const params = bidRequest.params;

      const videoData = utils.deepAccess(bidRequest, 'mediaTypes.video') || {};
      const sizes = utils.parseSizesInput(videoData.playerSize || bidRequest.sizes)[0];
      const [width, height] = sizes.split('x');

      const placementId = params.placement;
      const rnd = Math.floor(Math.random() * 99999999999);
      const referrer = bidderRequest.refererInfo.referer;
      const bidId = bidRequest.bidId;
      const isDev = params.devMode || false;

      let endpoint = isDev ? ENDPOINT_URL_DEV : ENDPOINT_URL;
      let payload = {};

      if (isVideoRequest(bidRequest)) {
        let vastFormat = params.vastFormat || DEFAULT_VAST_FORMAT;
        payload = {
          _f: vastFormat,
          alternative: 'prebid_js',
          inventory_item_id: placementId,
          srw: width,
          srh: height,
          idt: 100,
          rnd: rnd,
          ref: referrer,
          bid_id: bidId,
        };
      } else {
        payload = {
          _f: 'html',
          alternative: 'prebid_js',
          inventory_item_id: placementId,
          srw: width,
          srh: height,
          idt: 100,
          rnd: rnd,
          ref: referrer,
          bid_id: bidId,
        };
      }

      if (params.pfilter !== undefined) {
        payload.pfilter = params.pfilter;
      }

      if (bidderRequest && bidderRequest.gdprConsent) {
        if (payload.pfilter !== undefined) {
          if (!payload.pfilter.gdpr_consent) {
            payload.pfilter.gdpr_consent = bidderRequest.gdprConsent.consentString;
            payload.pfilter.gdpr = bidderRequest.gdprConsent.gdprApplies;
          }
        } else {
          payload.pfilter = {
            'gdpr_consent': bidderRequest.gdprConsent.consentString,
            'gdpr': bidderRequest.gdprConsent.gdprApplies
          };
        }
      }

      if (params.bcat !== undefined) {
        payload.bcat = params.bcat;
      }
      if (params.dvt !== undefined) {
        payload.dvt = params.dvt;
      }
      if (isDev) {
        payload.prebidDevMode = 1;
      }
      return {
        method: 'GET',
        url: endpoint,
        data: objectToQueryString(payload),
      }
    });
  },
  interpretResponse: function(serverResponse, bidRequest) {
    const bidResponses = [];
    const response = serverResponse.body;
    const crid = response.crid || 0;
    const cpm = response.cpm / 1000000 || 0;
    if (cpm !== 0 && crid !== 0) {
      const dealId = response.dealid || '';
      const currency = response.currency || 'EUR';
      const netRevenue = (response.netRevenue === undefined) ? true : response.netRevenue;
      const bidResponse = {
        requestId: response.bid_id,
        cpm: cpm,
        width: response.width,
        height: response.height,
        creativeId: crid,
        dealId: dealId,
        currency: currency,
        netRevenue: netRevenue,
        type: response.type,
        ttl: config.getConfig('_bidderTimeout')
      };
      if (response.vastXml) {
        bidResponse.vastXml = response.vastXml;
        bidResponse.mediaType = 'video';
      } else {
        bidResponse.ad = response.adTag;
      }
      bidResponses.push(bidResponse);
    }
    return bidResponses;
  }
}

function objectToQueryString(obj, prefix) {
  let str = [];
  let p;
  for (p in obj) {
    if (obj.hasOwnProperty(p)) {
      let k = prefix ? prefix + '[' + p + ']' : p;
      let v = obj[p];
      str.push((v !== null && typeof v === 'object')
        ? objectToQueryString(v, k)
        : encodeURIComponent(k) + '=' + encodeURIComponent(v));
    }
  }
  return str.join('&');
}

/**
 * Check if it's a video bid request
 *
 * @param {BidRequest} bid - Bid request generated from ad slots
 * @returns {boolean} True if it's a video bid
 */
function isVideoRequest(bid) {
  return bid.mediaType === 'video' || !!utils.deepAccess(bid, 'mediaTypes.video');
}

registerBidder(spec);
