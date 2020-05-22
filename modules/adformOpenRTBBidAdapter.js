// jshint esversion: 6, es3: false, node: true
'use strict';

import {
  registerBidder
} from '../src/adapters/bidderFactory';
import {
  NATIVE
} from '../src/mediaTypes';
import * as utils from '../src/utils';
import { config } from '../src/config';

const BIDDER_CODE = 'adformOpenRTB';
const NATIVE_ASSET_IDS = { 0: 'title', 2: 'icon', 3: 'image', 5: 'sponsoredBy', 4: 'body', 1: 'cta' };
const NATIVE_PARAMS = {
  title: {
    id: 0,
    name: 'title'
  },
  icon: {
    id: 2,
    type: 1,
    name: 'img'
  },
  image: {
    id: 3,
    type: 3,
    name: 'img'
  },
  sponsoredBy: {
    id: 5,
    name: 'data',
    type: 1
  },
  body: {
    id: 4,
    name: 'data',
    type: 2
  },
  cta: {
    id: 1,
    type: 12,
    name: 'data'
  }
};

export const spec = {
  code: BIDDER_CODE,
  supportedMediaTypes: [ NATIVE ],
  isBidRequestValid: bid => !!bid.params.mid,
  buildRequests: (validBidRequests, bidderRequest) => {
    const page = bidderRequest.refererInfo.referer;
    const adxDomain = setOnAny(validBidRequests, 'params.adxDomain') || 'adx.adform.net';
    const ua = navigator.userAgent;
    const pt = setOnAny(validBidRequests, 'params.pt') || setOnAny(validBidRequests, 'params.priceType') || 'net';
    const tid = validBidRequests[0].transactionId; // ??? check with ssp
    const test = setOnAny(validBidRequests, 'params.test');
    const publisher = setOnAny(validBidRequests, 'params.publisher');
    const siteId = setOnAny(validBidRequests, 'params.siteId');
    const currency = config.getConfig('currency.adServerCurrency');
    const cur = currency && [ currency ];

    const imp = validBidRequests.map((bid, id) => {
      bid.netRevenue = pt;
      const assets = utils._map(bid.nativeParams, (bidParams, key) => {
        const props = NATIVE_PARAMS[key];
        const asset = {
          required: bidParams.required & 1,
        };
        if (props) {
          asset.id = props.id;
          let wmin, hmin, w, h;
          let aRatios = bidParams.aspect_ratios;

          if (aRatios && aRatios[0]) {
            aRatios = aRatios[0];
            wmin = aRatios.min_width || 0;
            hmin = aRatios.ratio_height * wmin / aRatios.ratio_width | 0;
          }

          if (bidParams.sizes) {
            const sizes = flatten(bidParams.sizes);
            w = sizes[0];
            h = sizes[1];
          }

          asset[props.name] = {
            len: bidParams.len,
            type: props.type,
            wmin,
            hmin,
            w,
            h
          };

          return asset;
        }
      }).filter(Boolean);

      return {
        id: id + 1,
        tagid: bid.params.mid,
        native: {
          request: {
            assets
          }
        }
      };
    });

    const request = {
      id: bidderRequest.auctionId,
      site: { id: siteId, page, publisher },
      device: { ua },
      source: { tid, fd: 1 },
      ext: { pt },
      cur,
      imp
    };

    if (test) {
      request.is_debug = !!test;
      request.test = 1;
    }
    if (utils.deepAccess(bidderRequest, 'gdprConsent.gdprApplies')) {
      request.user = { ext: { consent: bidderRequest.gdprConsent.consentString } };
      request.regs = { ext: { gdpr: bidderRequest.gdprConsent.gdprApplies & 1 } };
    }

    return {
      method: 'POST',
      url: '//' + adxDomain + '/adx/openrtb',
      data: JSON.stringify(request),
      options: {
        contentType: 'application/json'
      },
      bids: validBidRequests
    };
  },
  interpretResponse: function(serverResponse, { bids }) {
    if (!serverResponse.body) {
      return;
    }
    const { seatbid, cur } = serverResponse.body;

    const bidResponses = flatten(seatbid.map(seat => seat.bid)).reduce((result, bid) => {
      result[bid.impid - 1] = bid;
      return result;
    }, []);

    return bids.map((bid, id) => {
      const bidResponse = bidResponses[id];
      if (bidResponse) {
        return {
          requestId: bid.bidId,
          cpm: bidResponse.price,
          creativeId: bidResponse.crid,
          ttl: 360,
          netRevenue: bid.netRevenue === 'net',
          currency: cur,
          mediaType: NATIVE,
          bidderCode: BIDDER_CODE,
          native: parseNative(bidResponse)
        };
      }
    }).filter(Boolean);
  }
};

registerBidder(spec);

function parseNative(bid) {
  const { assets, link, imptrackers, jstracker } = bid.native;
  const result = {
    clickUrl: link.url,
    clickTrackers: link.clicktrackers || undefined,
    impressionTrackers: imptrackers || undefined,
    javascriptTrackers: jstracker ? [ jstracker ] : undefined
  };
  assets.forEach(asset => {
    const kind = NATIVE_ASSET_IDS[asset.id];
    const content = kind && asset[NATIVE_PARAMS[kind].name];
    if (content) {
      result[kind] = content.text || content.value || { url: content.url, width: content.w, height: content.h };
    }
  });

  return result;
}

function setOnAny(collection, key) {
  for (let i = 0, result; i < collection.length; i++) {
    result = utils.deepAccess(collection[i], key);
    if (result) {
      return result;
    }
  }
}

function flatten(arr) {
  return [].concat(...arr);
}
