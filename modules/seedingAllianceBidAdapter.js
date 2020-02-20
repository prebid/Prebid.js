// jshint esversion: 6, es3: false, node: true
'use strict';

import { registerBidder } from '../src/adapters/bidderFactory.js';
import { NATIVE } from '../src/mediaTypes.js';
import * as utils from '../src/utils.js';
import { config } from '../src/config.js';

const BIDDER_CODE = 'seedingAlliance';
const DEFAULT_CUR = 'EUR';
const ENDPOINT_URL = 'https://b.nativendo.de/cds/rtb/bid?format=openrtb2.5&ssp=nativendo';

const NATIVE_ASSET_IDS = {0: 'title', 1: 'body', 2: 'sponsoredBy', 3: 'image', 4: 'cta', 5: 'icon'};

const NATIVE_PARAMS = {
  title: {
    id: 0,
    name: 'title'
  },

  body: {
    id: 1,
    name: 'data',
    type: 2
  },

  sponsoredBy: {
    id: 2,
    name: 'data',
    type: 1
  },

  image: {
    id: 3,
    type: 3,
    name: 'img'
  },

  cta: {
    id: 4,
    type: 12,
    name: 'data'
  },

  icon: {
    id: 5,
    type: 1,
    name: 'img'
  }
};

export const spec = {
  code: BIDDER_CODE,

  supportedMediaTypes: [NATIVE],

  isBidRequestValid: function(bid) {
    return !!bid.params.adUnitId;
  },

  buildRequests: (validBidRequests, bidderRequest) => {
    const pt = setOnAny(validBidRequests, 'params.pt') || setOnAny(validBidRequests, 'params.priceType') || 'net';
    const tid = validBidRequests[0].transactionId;
    const cur = [config.getConfig('currency.adServerCurrency') || DEFAULT_CUR];
    let pubcid = null;
    let url = bidderRequest.refererInfo.referer;

    const imp = validBidRequests.map((bid, id) => {
      const assets = utils._map(bid.nativeParams, (bidParams, key) => {
        const props = NATIVE_PARAMS[key];

        const asset = {
          required: bidParams.required & 1
        };

        if (props) {
          asset.id = props.id;

          let w, h;

          if (bidParams.sizes) {
            w = bidParams.sizes[0];
            h = bidParams.sizes[1];
          }

          asset[props.name] = {
            len: bidParams.len,
            type: props.type,
            w,
            h
          };

          return asset;
        }
      })
        .filter(Boolean);

      if (bid.params.url) {
        url = bid.params.url;
      }

      return {
        id: String(id + 1),
        tagid: bid.params.adUnitId,
        tid: tid,
        pt: pt,
        native: {
          request: {
            assets
          }
        }
      };
    });

    if (validBidRequests[0].crumbs && validBidRequests[0].crumbs.pubcid) {
      pubcid = validBidRequests[0].crumbs.pubcid;
    }

    const request = {
      id: bidderRequest.auctionId,
      site: {
        page: url
      },
      device: {
        ua: navigator.userAgent
      },
      cur,
      imp,
      user: {
        buyeruid: pubcid
      }
    };

    return {
      method: 'POST',
      url: ENDPOINT_URL,
      data: JSON.stringify(request),
      bids: validBidRequests
    };
  },

  interpretResponse: function(serverResponse, { bids }) {
    if (utils.isEmpty(serverResponse.body)) {
      return [];
    }

    const { seatbid, cur } = serverResponse.body;

    const bidResponses = flatten(seatbid.map(seat => seat.bid)).reduce((result, bid) => {
      result[bid.impid - 1] = bid;
      return result;
    }, []);

    return bids
      .map((bid, id) => {
        const bidResponse = bidResponses[id];

        if (bidResponse) {
          return {
            requestId: bid.bidId,
            cpm: bidResponse.price,
            creativeId: bidResponse.crid,
            ttl: 1000,
            netRevenue: bid.netRevenue === 'net',
            currency: cur,
            mediaType: NATIVE,
            bidderCode: BIDDER_CODE,
            native: parseNative(bidResponse)
          };
        }
      })
      .filter(Boolean);
  }
};

registerBidder(spec);

function parseNative(bid) {
  const {assets, link, imptrackers} = bid.adm.native;

  link.clicktrackers.forEach(function (clicktracker, index) {
    link.clicktrackers[index] = clicktracker.replace(/\$\{AUCTION_PRICE\}/, bid.price);
  });

  imptrackers.forEach(function (imptracker, index) {
    imptrackers[index] = imptracker.replace(/\$\{AUCTION_PRICE\}/, bid.price);
  });

  const result = {
    url: link.url,
    clickUrl: link.url,
    clickTrackers: link.clicktrackers || undefined,
    impressionTrackers: imptrackers || undefined
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
