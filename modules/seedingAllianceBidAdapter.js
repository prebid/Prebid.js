// jshint esversion: 6, es3: false, node: true
'use strict';

import { registerBidder } from '../src/adapters/bidderFactory.js';
import { NATIVE } from '../src/mediaTypes.js';
import { _map, deepSetValue, isEmpty, deepAccess } from '../src/utils.js';
import { config } from '../src/config.js';
import { convertOrtbRequestToProprietaryNative } from '../src/native.js';

const BIDDER_CODE = 'seedingAlliance';
const GVL_ID = 371;
const DEFAULT_CUR = 'EUR';
const ENDPOINT_URL = 'https://b.nativendo.de/cds/rtb/bid?format=openrtb2.5&ssp=pb';

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

  gvlid: GVL_ID,

  supportedMediaTypes: [NATIVE],

  isBidRequestValid: function(bid) {
    return !!bid.params.adUnitId;
  },

  buildRequests: (validBidRequests, bidderRequest) => {
    // convert Native ORTB definition to old-style prebid native definition
    validBidRequests = convertOrtbRequestToProprietaryNative(validBidRequests);

    const pt = setOnAny(validBidRequests, 'params.pt') || setOnAny(validBidRequests, 'params.priceType') || 'net';
    const tid = bidderRequest.auctionId;
    const cur = [config.getConfig('currency.adServerCurrency') || DEFAULT_CUR];
    let url = bidderRequest.refererInfo.page;

    const imp = validBidRequests.map((bid, id) => {
      const assets = _map(bid.nativeParams, (bidParams, key) => {
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
      user: {},
      regs: {
        ext: {
          gdpr: 0,
          pb_ver: '$prebid.version$'
        }
      }
    };

    if (bidderRequest && bidderRequest.gdprConsent) {
      deepSetValue(request, 'user.ext.consent', bidderRequest.gdprConsent.consentString);
      deepSetValue(request, 'regs.ext.gdpr', (typeof bidderRequest.gdprConsent.gdprApplies === 'boolean' && bidderRequest.gdprConsent.gdprApplies) ? 1 : 0);
    }

    return {
      method: 'POST',
      url: ENDPOINT_URL,
      data: JSON.stringify(request),
      options: {
        contentType: 'application/json'
      },
      bids: validBidRequests
    };
  },

  interpretResponse: function(serverResponse, { bids }) {
    if (isEmpty(serverResponse.body)) {
      return [];
    }

    const { seatbid, cur } = serverResponse.body;

    const bidResponses = (typeof seatbid != 'undefined') ? flatten(seatbid.map(seat => seat.bid)).reduce((result, bid) => {
      result[bid.impid - 1] = bid;
      return result;
    }, []) : [];

    return bids
      .map((bid, id) => {
        const bidResponse = bidResponses[id];

        if (bidResponse) {
          return {
            requestId: bid.bidId,
            cpm: bidResponse.price,
            creativeId: bidResponse.crid,
            ttl: 1000,
            netRevenue: (!bid.netRevenue || bid.netRevenue === 'net'),
            currency: cur,
            mediaType: NATIVE,
            bidderCode: BIDDER_CODE,
            native: parseNative(bidResponse),
            meta: {
              advertiserDomains: bidResponse.adomain && bidResponse.adomain.length > 0 ? bidResponse.adomain : []
            }
          };
        }
      })
      .filter(Boolean);
  }
};

registerBidder(spec);

function parseNative(bid) {
  const {assets, link, imptrackers} = bid.adm.native;

  let clickUrl = link.url.replace(/\$\{AUCTION_PRICE\}/g, bid.price);

  if (link.clicktrackers) {
    link.clicktrackers.forEach(function (clicktracker, index) {
      link.clicktrackers[index] = clicktracker.replace(/\$\{AUCTION_PRICE\}/g, bid.price);
    });
  }

  if (imptrackers) {
    imptrackers.forEach(function (imptracker, index) {
      imptrackers[index] = imptracker.replace(/\$\{AUCTION_PRICE\}/g, bid.price);
    });
  }

  const result = {
    url: clickUrl,
    clickUrl: clickUrl,
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
    result = deepAccess(collection[i], key);
    if (result) {
      return result;
    }
  }
}

function flatten(arr) {
  return [].concat(...arr);
}
