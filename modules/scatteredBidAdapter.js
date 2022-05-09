// jshint esversion: 6, es3: false, node: true
'use strict';

import { registerBidder } from '../src/adapters/bidderFactory.js';
import { config } from '../src/config.js';
import { BANNER } from '../src/mediaTypes.js';
import { mergeDeep, deepAccess, parseSizesInput, parseUrl, deepSetValue, logInfo, createTrackPixelHtml } from '../src/utils.js';

const { getConfig } = config;

const BIDDER_CODE = 'scattered';

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

export const spec = {
  code: BIDDER_CODE,
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
  buildRequests: function (validBidRequests, bidderRequest) {
    const ortb2Obj = bidderRequest.ortb2 || {};
    let { user } = ortb2Obj

    let site = getConfig('site') || {};
    if (ortb2Obj.site) {
      mergeDeep(site, ortb2Obj.site)
    }
    // site.page    URL of the page where the impression will be shown.
    // site.domain  Domain of the site (e.g., “mysite.foo.com”).
    if (!site.page && bidderRequest.refererInfo) {
      site.page = bidderRequest.refererInfo.referer;
      site.domain = parseUrl(bidderRequest.refererInfo.referer).hostname
    }

    const bidderDomain = getKeyOnAny(validBidRequests, 'params.bidderDomain')

    const device = getConfig('device') || {};
    device.w = device.w || window.innerWidth;
    device.h = device.h || window.innerHeight;
    device.ua = device.ua || navigator.userAgent;

    const imps = buildImps(validBidRequests)

    const tid = getKeyOnAny(validBidRequests, 'transactionId');

    const request = {
      id: bidderRequest.auctionId,
      imp: imps,
      site,
      user,
      device,
      source: { tid }
    };

    if (bidderRequest && bidderRequest.gdprConsent) {
      let { gdprApplies, consentString } = bidderRequest.gdprConsent;
      deepSetValue(request, 'user.ext.consent', consentString);
      deepSetValue(request, 'regs.ext.gdpr', gdprApplies ? 1 : 0);
    }

    const test = getKeyOnAny(validBidRequests, 'params.test') || 0
    if (test) {
      request.test = 1;
    }

    return {
      method: 'POST',
      url: 'https://' + bidderDomain,
      data: JSON.stringify(request),
      options: {
        contentType: 'application/json'
      },
      bidRequests: validBidRequests
    };
  },

  // 3.
  interpretResponse: function (serverResponse, request) {
    if (!serverResponse.body) {
      return;
    }

    const { bidRequests } = request;
    const { seatbid, cur } = serverResponse.body;
    let idx = 0;
    let results = []

    if (seatbid !== undefined) {
      for (let seat of seatbid) {
        for (let bidResponse of seat.bid) {
          const bidRequest = bidRequests[idx]

          const result = {
            requestId: bidRequest.bidId,
            cpm: bidResponse.price,
            creativeId: bidResponse.crid,
            ttl: 360,
            netRevenue: bidRequest.netRevenue === 'net',
            currency: cur,
            ad: bidResponse.adm,
            mediaType: BANNER, // we don't serve other types
            width: bidResponse.w,
            height: bidResponse.h,
          }

          if (bidResponse.dealid) {
            result.dealId = bidResponse.dealid
          }

          // insert pixel into markup that will call us
          if (bidResponse.nurl) {
            result.ad += createTrackPixelHtml(bidResponse.nurl)
          }

          results.push(result);
          idx++;
        }
      }
    }
    return results;
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
