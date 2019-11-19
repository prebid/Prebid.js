// jshint esversion: 6, es3: false, node: true
'use strict';

import {
  registerBidder
} from '../src/adapters/bidderFactory';
import * as utils from '../src/utils';

const BIDDER_CODE = 'revcontent';
const NATIVE_ASSET_IDS = {0: 'title', 2: 'icon', 3: 'image', 5: 'sponsoredBy', 4: 'body', 1: 'cta'};
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
  supportedMediaTypes: ['banner', 'native', 'video'],
  isBidRequestValid: function (bid) {
    return (typeof bid.params.apiKey !== 'undefined' && typeof bid.params.userId !== 'undefined');
  },
  buildRequests: (validBidRequests, bidderRequest) => {
    utils.logInfo('starting buildRequests');

    const userId = setOnAny(validBidRequests, 'params.userId');
    const widgetId = setOnAny(validBidRequests, 'params.widgetId');
    const apiKey = setOnAny(validBidRequests, 'params.apiKey');

    let serverRequests = [];
    var refererInfo;
    if (bidderRequest && bidderRequest.refererInfo) {
      refererInfo = bidderRequest.refererInfo;
    }

    var endpoint = '//trends-s0.revcontent.com/rtb?apiKey=' + apiKey + '&userId=' + userId;

    if (!isNaN(widgetId) && widgetId > 0) {
      endpoint = endpoint + '&widgetId=' + widgetId;
    }

    validBidRequests.forEach((bid, i) => {
      let data = {
        'placementid': bid.params.placementId,
        'cur': 'usd',
        'ua': navigator.userAgent,
        'loc': utils.getTopWindowUrl(),
        'topframe': (window.parent === window.self) ? 1 : 0,
        'sw': screen && screen.width,
        'sh': screen && screen.height,
        'cb': Math.floor(Math.random() * 99999999999),
        'tpaf': 1,
        'cks': 1,
        'requestid': bid.bidId,
        'transactionId': validBidRequests[0].transactionId
      };

      if (refererInfo && refererInfo.referer) {
        data.referer = refererInfo.referer;
      } else {
        data.referer = '';
      }

      serverRequests.push({
        method: 'POST',
        options: {
          contentType: 'application/json'
        },
        url: endpoint,
        data: JSON.stringify(data),
        bid: validBidRequests
      });
    });

    return serverRequests;
  },
  interpretResponse: function (serverResponse, { bids }) {
    if (!serverResponse.body) {
      return;
    }
    const {seatbid, cur} = serverResponse.body;

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
          mediaType: 'banner',
          bidderCode: BIDDER_CODE,
          native: parseNative(bidResponse)
        };
      }
    }).filter(Boolean);
  }
};

registerBidder(spec);

function parseNative(bid) {
  const {assets, link, imptrackers, jstracker} = bid.native;
  const result = {
    clickUrl: link.url,
    clickTrackers: link.clicktrackers || undefined,
    impressionTrackers: imptrackers || undefined,
    javascriptTrackers: jstracker ? [jstracker] : undefined
  };
  assets.forEach(asset => {
    const kind = NATIVE_ASSET_IDS[asset.id];
    const content = kind && asset[NATIVE_PARAMS[kind].name];
    if (content) {
      result[kind] = content.text || content.value || {url: content.url, width: content.w, height: content.h};
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
