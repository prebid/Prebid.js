'use strict';

import { BANNER } from '../src/mediaTypes.js';
import { getAdUnitSizes, logWarn, isFn, getWindowTop, getWindowSelf } from '../src/utils.js';
import { registerBidder } from '../src/adapters/bidderFactory.js';
import { ajax } from '../src/ajax.js'

const BIDDER_CODE = 'ogury';
const DEFAULT_TIMEOUT = 1000;
const BID_HOST = 'https://mweb-hb.presage.io/api/header-bidding-request';
const TIMEOUT_MONITORING_HOST = 'https://ms-ads-monitoring-events.presage.io';
const MS_COOKIE_SYNC_DOMAIN = 'https://ms-cookie-sync.presage.io';
const ADAPTER_VERSION = '1.2.12';

function getClientWidth() {
  const documentElementClientWidth = window.top.document.documentElement.clientWidth
    ? window.top.document.documentElement.clientWidth
    : 0
  const innerWidth = window.top.innerWidth ? window.top.innerWidth : 0
  const outerWidth = window.top.outerWidth ? window.top.outerWidth : 0
  const screenWidth = window.top.screen.width ? window.top.screen.width : 0

  return documentElementClientWidth || innerWidth || outerWidth || screenWidth
}

function getClientHeight() {
  const documentElementClientHeight = window.top.document.documentElement.clientHeight
    ? window.top.document.documentElement.clientHeight
    : 0
  const innerHeight = window.top.innerHeight ? window.top.innerHeight : 0
  const outerHeight = window.top.outerHeight ? window.top.outerHeight : 0
  const screenHeight = window.top.screen.height ? window.top.screen.height : 0

  return documentElementClientHeight || innerHeight || outerHeight || screenHeight
}

function isBidRequestValid(bid) {
  const adUnitSizes = getAdUnitSizes(bid);

  const isValidSizes = Boolean(adUnitSizes) && adUnitSizes.length > 0;
  const isValidAdUnitId = !!bid.params.adUnitId;
  const isValidAssetKey = !!bid.params.assetKey;

  return (isValidSizes && isValidAdUnitId && isValidAssetKey);
}

function getUserSyncs(syncOptions, serverResponses, gdprConsent, uspConsent) {
  if (!syncOptions.pixelEnabled) return [];

  return [
    {
      type: 'image',
      url: `${MS_COOKIE_SYNC_DOMAIN}/v1/init-sync/bid-switch?iab_string=${(gdprConsent && gdprConsent.consentString) || ''}&source=prebid`
    },
    {
      type: 'image',
      url: `${MS_COOKIE_SYNC_DOMAIN}/ttd/init-sync?iab_string=${(gdprConsent && gdprConsent.consentString) || ''}&source=prebid`
    }
  ]
}

function buildRequests(validBidRequests, bidderRequest) {
  const openRtbBidRequestBanner = {
    id: bidderRequest.auctionId,
    tmax: DEFAULT_TIMEOUT,
    at: 1,
    regs: {
      ext: {
        gdpr: bidderRequest.gdprConsent && bidderRequest.gdprConsent.gdprApplies ? 1 : 0
      },
    },
    site: {
      domain: location.hostname,
      page: location.href
    },
    user: {
      ext: {
        consent: ''
      }
    },
    imp: [],
    ext: {
      adapterversion: ADAPTER_VERSION,
      prebidversion: '$prebid.version$'
    },
    device: {
      w: getClientWidth(),
      h: getClientHeight()
    }
  };

  if (bidderRequest.gdprConsent && bidderRequest.gdprConsent.consentString) {
    openRtbBidRequestBanner.user.ext.consent = bidderRequest.gdprConsent.consentString
  }

  validBidRequests.forEach((bidRequest) => {
    const sizes = getAdUnitSizes(bidRequest)
      .map(size => ({ w: size[0], h: size[1] }));

    if (bidRequest.mediaTypes &&
      bidRequest.mediaTypes.hasOwnProperty('banner')) {
      openRtbBidRequestBanner.site.id = bidRequest.params.assetKey;
      const floor = getFloor(bidRequest);

      openRtbBidRequestBanner.imp.push({
        id: bidRequest.bidId,
        tagid: bidRequest.params.adUnitId,
        ...(floor && {bidfloor: floor}),
        banner: {
          format: sizes
        },
        ext: bidRequest.params
      });
    }
  });

  return {
    method: 'POST',
    url: BID_HOST,
    data: openRtbBidRequestBanner,
    options: {contentType: 'application/json'},
  };
}

function interpretResponse(openRtbBidResponse) {
  if (!openRtbBidResponse ||
    !openRtbBidResponse.body ||
    typeof openRtbBidResponse.body != 'object' ||
    Object.keys(openRtbBidResponse.body).length === 0) {
    logWarn('no response or body is malformed');
    return [];
  }

  const bidResponses = [];

  openRtbBidResponse.body.seatbid.forEach((seatbid) => {
    seatbid.bid.forEach((bid) => {
      let bidResponse = {
        requestId: bid.impid,
        cpm: bid.price,
        currency: 'USD',
        width: bid.w,
        height: bid.h,
        creativeId: bid.id,
        netRevenue: true,
        ttl: 60,
        ext: bid.ext,
        meta: {
          advertiserDomains: bid.adomain
        },
        nurl: bid.nurl,
        adapterVersion: ADAPTER_VERSION,
        prebidVersion: '$prebid.version$'
      };

      bidResponse.ad = bid.adm;

      bidResponses.push(bidResponse);
    });
  });
  return bidResponses;
}

function getFloor(bid) {
  if (!isFn(bid.getFloor)) {
    return 0;
  }
  let floorResult = bid.getFloor({
    currency: 'USD',
    mediaType: 'banner',
    size: '*'
  });
  return floorResult.currency === 'USD' ? floorResult.floor : 0;
}

function getWindowContext() {
  try {
    return getWindowTop()
  } catch (e) {
    return getWindowSelf()
  }
}

function onBidWon(bid) {
  const w = getWindowContext()
  w.OG_PREBID_BID_OBJECT = {
    ...(bid && { ...bid }),
  }
  if (bid && bid.nurl) ajax(bid.nurl, null);
}

function onTimeout(timeoutData) {
  ajax(`${TIMEOUT_MONITORING_HOST}/bid_timeout`, null, JSON.stringify({...timeoutData[0], location: window.location.href}), {
    method: 'POST',
    contentType: 'application/json'
  });
}

export const spec = {
  code: BIDDER_CODE,
  supportedMediaTypes: [BANNER],
  isBidRequestValid,
  getUserSyncs,
  buildRequests,
  interpretResponse,
  getFloor,
  onBidWon,
  getWindowContext,
  onTimeout
}

registerBidder(spec);
