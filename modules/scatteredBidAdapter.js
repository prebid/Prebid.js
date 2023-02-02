// jshint esversion: 6, es3: false, node: true
'use strict';

import { registerBidder } from '../src/adapters/bidderFactory.js';
import { BANNER } from '../src/mediaTypes.js';
import { deepAccess, logInfo, parseSizesInput } from '../src/utils.js';
import { ortbConverter } from '../libraries/ortbConverter/converter.js';

const BIDDER_CODE = 'scattered';
const GVLID = 1179;
export function buildImps(validBidRequests) {
  return validBidRequests.map((bid, index) => {
    let imp = {
      id: `${index + 1}`
    };
    const bannerParams = deepAccess(bid, 'mediaTypes.banner');
    if (bannerParams && bannerParams.sizes) {
      const sizes = parseSizesInput(bannerParams.sizes);
      const format = sizes.map(size => {
        const [width, height] = size.split('x');
        const w = parseInt(width, 10);
        const h = parseInt(height, 10);
        return { w, h };
      });

      imp.banner = {
        format
      };
    };
    return imp;
  });
}

export const converter = ortbConverter({
  context: {
    mediaType: BANNER,
    ttl: 360
  },
  bidResponse(buildBidResponse, bid, context) {
    context.netRevenue = context.bidRequest.netRevenue === 'net';
    return buildBidResponse(bid, context);
  }
})

export const spec = {
  code: BIDDER_CODE,
  gvlid: GVLID,
  supportedMediaTypes: [BANNER],

  // 1.
  isBidRequestValid: function (bid) {
    const bidderDomain = deepAccess(bid, 'params.bidderDomain')
    if (bidderDomain === undefined || bidderDomain === '') {
      return false
    }

    const sizes = deepAccess(bid, 'mediaTypes.banner.sizes')
    if (sizes === undefined || sizes.length < 1) {
      return false
    }

    return true
  },

  // 2.
  buildRequests: function (bidRequests, bidderRequest) {
    return {
      method: 'POST',
      url: 'https://' + getKeyOnAny(bidRequests, 'params.bidderDomain'),
      data: converter.toORTB({ bidderRequest, bidRequests }),
      options: {
        contentType: 'application/json'
      },
    };
  },

  // 3.
  interpretResponse: function (response, request) {
    if (!response.body) return;
    return converter.fromORTB({ response: response.body, request: request.data }).bids;
  },

  // 4
  onBidWon: function (bid) {
    logInfo('onBidWon', bid)
  }
}

function getKeyOnAny(collection, key) {
  for (let i = 0; i < collection.length; i++) {
    const result = deepAccess(collection[i], key);
    if (result) {
      return result;
    }
  }
}

registerBidder(spec);
