
import * as utils from '../src/utils.js';
import {config} from '../src/config.js';
import {registerBidder} from '../src/adapters/bidderFactory.js';
import { BANNER, VIDEO } from '../src/mediaTypes.js';

const BIDDER_CODE = 'stv';
const VADS_ENDPOINT_URL = 'https://ads.smartstream.tv/r/';
const DEFAULT_VIDEO_SOURCE = 'vads';
const DEFAULT_BANNER_FORMAT = 'vast2';

export const spec = {
  code: BIDDER_CODE,
  aliases: ['vads'],
  supportedMediaTypes: [BANNER, VIDEO],
  isBidRequestValid: function(bid) {
    return !!(bid.params.placement);
  },
  buildRequests: function(validBidRequests, bidderRequest) {
    return validBidRequests.map(bidRequest => {
      const params = bidRequest.params;

      const videoData = utils.deepAccess(bidRequest, 'mediaTypes.video') || {};
      const sizes = utils.parseSizesInput(videoData.playerSize || bidRequest.sizes)[0];
      const width = sizes.split('x')[0];
      const height = sizes.split('x')[1];

      const placementId = params.placement;

      const rnd = Math.floor(Math.random() * 99999999999);
      const referrer = bidderRequest.refererInfo.referer;
      const bidId = bidRequest.bidId;
      let endpoint = VADS_ENDPOINT_URL;

      let payload = {};
      if (isVideoRequest(bidRequest)) {
        const source = params.source || DEFAULT_VIDEO_SOURCE;
        if (source === 'vads') {
          payload = {
            _f: 'vast2',
            alternative: 'prebid_js',
            _ps: placementId,
            srw: width,
            srh: height,
            idt: 100,
            rnd: rnd,
            ref: referrer,
            bid_id: bidId,
          };
          endpoint = VADS_ENDPOINT_URL;
        }
      } else {
        const outputFormat = params.format || DEFAULT_BANNER_FORMAT;
        payload = {
          _f: outputFormat,
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
      prepareExtraParams(params, payload);

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
        : encodeURIComponent(k) + '=' + (k == '_ps' ? v : encodeURIComponent(v)));
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

function prepareExtraParams(params, payload) {
  if (params.pfilter !== undefined) {
    payload.pfilter = params.pfilter;
  }
  if (params.bcat !== undefined) {
    payload.bcat = params.bcat;
  }
  if (params.noskip !== undefined) {
    payload.noskip = params.noskip;
  }

  if (params.dvt !== undefined) {
    payload.dvt = params.dvt;
  }
}

registerBidder(spec);
