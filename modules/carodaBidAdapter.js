// jshint esversion: 6, es3: false, node: true
'use strict'

import { getCurrencyFromBidderRequest } from '../libraries/ortb2Utils/currency.js';
import { registerBidder } from '../src/adapters/bidderFactory.js';
import { config } from '../src/config.js';
import { BANNER, VIDEO } from '../src/mediaTypes.js';
import {
  deepAccess,
  deepSetValue,
  getWinDimensions,
  logError,
  mergeDeep,
  sizeTupleToRtbSize,
  sizesToSizeTuples
} from '../src/utils.js';

const { getConfig } = config;

const BIDDER_CODE = 'caroda';
const GVLID = 954;

// some state info is required to synchronize with Caroda ad server
const topUsableWindow = getTopUsableWindow();

export const spec = {
  code: BIDDER_CODE,
  gvlid: GVLID,
  supportedMediaTypes: [BANNER, VIDEO],
  isBidRequestValid: bid => {
    const params = bid.params || {};
    const { ctok, placementId, priceType } = params;
    return typeof ctok === 'string' && (
      typeof placementId === 'string' ||
      typeof placementId === 'undefined'
    ) && (
      typeof priceType === 'undefined' ||
      priceType === 'gross' ||
      priceType === 'net'
    );
  },
  buildRequests: (validBidRequests, bidderRequest) => {
    // TODO: consider using the Prebid-generated page view ID instead of generating a custom one
    topUsableWindow.carodaPageViewId = topUsableWindow.carodaPageViewId || Math.floor(Math.random() * 1e9);
    const pageViewId = topUsableWindow.carodaPageViewId;
    const ortbCommon = getORTBCommon(bidderRequest);
    const priceType =
      getFirstWithKey(validBidRequests, 'params.priceType') ||
      'net';
    const test = getFirstWithKey(validBidRequests, 'params.test');
    const currency = getCurrencyFromBidderRequest(bidderRequest);
    const eids = getFirstWithKey(validBidRequests, 'userIdAsEids');
    const schain = getFirstWithKey(validBidRequests, 'ortb2.source.ext.schain');
    const request = {
      // TODO: fix auctionId leak: https://github.com/prebid/Prebid.js/issues/9781
      auctionId: bidderRequest.auctionId,
      currency,
      hb_version: '$prebid.version$',
      ...ortbCommon,
      price_type: priceType
    };
    if (test) {
      request.test = 1;
    }
    if (schain) {
      request.schain = schain;
    }
    if (config.getConfig('coppa')) {
      deepSetValue(request, 'privacy.coppa', 1);
    }
    if (deepAccess(bidderRequest, 'gdprConsent.gdprApplies') !== undefined) {
      deepSetValue(
        request,
        'privacy.gdpr_consent',
        bidderRequest.gdprConsent.consentString
      );
      deepSetValue(
        request,
        'privacy.gdpr',
        bidderRequest.gdprConsent.gdprApplies & 1
      );
    }
    if (bidderRequest.uspConsent) {
      deepSetValue(request, 'privacy.us_privacy', bidderRequest.uspConsent);
    }
    if (eids) {
      deepSetValue(request, 'user.eids', eids);
    }
    return getImps(validBidRequests, request).map(imp => ({
      method: 'POST',
      url: 'https://prebid.caroda.io/api/hb?entry_id=' + pageViewId,
      data: JSON.stringify(imp)
    }));
  },
  interpretResponse: (serverResponse) => {
    if (!serverResponse.body) {
      return;
    }
    const { ok, error } = serverResponse.body
    if (error) {
      logError(BIDDER_CODE, ': server caught', error.message);
      return;
    }
    try {
      return JSON.parse(ok.value)
        .map((bid) => {
          const ret = {
            requestId: bid.bid_id,
            cpm: bid.cpm,
            creativeId: bid.creative_id,
            ttl: 300,
            netRevenue: true,
            currency: bid.currency,
            width: bid.w,
            height: bid.h,
            meta: {
              advertiserDomains: bid.adomain || []
            },
            ad: bid.ad,
            placementId: bid.placement_id
          }
          if (bid.adserver_targeting) {
            ret.adserverTargeting = bid.adserver_targeting
          }
          return ret
        })
        .filter(Boolean);
    } catch (e) {
      logError(BIDDER_CODE, ': caught', e);
    }
  }
}

registerBidder(spec)

function getFirstWithKey (collection, key) {
  for (let i = 0, result; i < collection.length; i++) {
    result = deepAccess(collection[i], key);
    if (result) {
      return result;
    }
  }
}

function getTopUsableWindow () {
  let res = window;
  try {
    while (window.top !== res && res.parent.location.href.length) {
      res = res.parent;
    }
  } catch (e) {}
  return res;
}

function getORTBCommon (bidderRequest) {
  let app, site;
  const commonFpd = bidderRequest.ortb2 || {};
  const { user } = commonFpd;
  if (typeof getConfig('app') === 'object') {
    app = getConfig('app') || {}
    if (commonFpd.app) {
      mergeDeep(app, commonFpd.app);
    }
  } else {
    site = getConfig('site') || {};
    if (commonFpd.site) {
      mergeDeep(site, commonFpd.site);
    }
    if (!site.page) {
      site.page = bidderRequest.refererInfo.page;
    }
  }
  const device = getConfig('device') || {};
  const { innerWidth, innerHeight } = getWinDimensions();

  device.w = device.w || innerWidth;
  device.h = device.h || innerHeight;
  device.ua = device.ua || navigator.userAgent;
  return {
    app,
    site,
    user,
    device
  };
}

function getImps (validBidRequests, common) {
  return validBidRequests.map((bid) => {
    const floorInfo = bid.getFloor
      ? bid.getFloor({ currency: common.currency || 'EUR' })
      : {};
    const bidfloor = floorInfo?.floor;
    const bidfloorcur = floorInfo?.currency;
    const { ctok, placementId } = bid.params;
    const imp = {
      bid_id: bid.bidId,
      ctok,
      bidfloor,
      bidfloorcur,
      ...common
    };
    const bannerParams = deepAccess(bid, 'mediaTypes.banner');
    if (bannerParams && bannerParams.sizes) {
      const format = sizesToSizeTuples(bannerParams.sizes).map(sizeTupleToRtbSize);
      imp.banner = {
        format
      };
    }
    if (placementId) {
      imp.placement_id = placementId;
    }
    const videoParams = deepAccess(bid, 'mediaTypes.video');
    if (videoParams) {
      imp.video = videoParams;
    }
    return imp;
  })
}
