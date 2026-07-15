'use strict';

import { BANNER, VIDEO } from '../src/mediaTypes.js';
import { getWindowSelf, getWindowTop, isFn, deepAccess, isPlainObject, deepSetValue, mergeDeep } from '../src/utils.js';
import { getDevicePixelRatio } from '../libraries/devicePixelRatio/devicePixelRatio.js';
import { registerBidder } from '../src/adapters/bidderFactory.js';
import { ajax } from '../src/ajax.js';
import { getAdUnitSizes } from '../libraries/sizeUtils/sizeUtils.js';
import { ortbConverter } from '../libraries/ortbConverter/converter.js';

const BIDDER_CODE = 'ogury';
const GVLID = 31;
const DEFAULT_TIMEOUT = 1000;
const BID_HOST = 'https://mweb-hb.presage.io/api/header-bidding-request';
const TIMEOUT_MONITORING_HOST = 'https://ms-ads-monitoring-events.presage.io';
const MS_COOKIE_SYNC_DOMAIN = 'https://ms-cookie-sync.presage.io';
const ADAPTER_VERSION = '2.1.0';

export const ortbConverterProps = {
  context: {
    netRevenue: true,
    ttl: 60
  },

  request(buildRequest, imps, bidderRequest, context) {
    const req = buildRequest(imps, bidderRequest, context);
    req.tmax = DEFAULT_TIMEOUT;
    deepSetValue(req, 'device.pxratio', getDevicePixelRatio(getWindowContext()));
    deepSetValue(req, 'site.page', getWindowContext().location.href);

    req.ext = mergeDeep({}, req.ext, {
      adapterversion: ADAPTER_VERSION,
      prebidversion: '$prebid.version$'
    });

    const bidWithAssetKey = bidderRequest.bids.find(bid => Boolean(deepAccess(bid, 'params.assetKey', false)));
    if (bidWithAssetKey) deepSetValue(req, 'site.id', bidWithAssetKey.params.assetKey);

    return req;
  },

  imp(buildImp, bidRequest, context) {
    const imp = buildImp(bidRequest, context);
    const timeSpentOnPage = document.timeline && document.timeline.currentTime ? document.timeline.currentTime : 0;
    const gpid = bidRequest.adUnitCode;
    imp.tagid = bidRequest.adUnitCode;
    imp.ext = mergeDeep({}, bidRequest.params, { timeSpentOnPage, gpid }, imp.ext);

    const bidfloor = getFloor(bidRequest);

    if (!bidfloor) {
      delete imp.bidfloor;
    } else {
      imp.bidfloor = bidfloor;
    }

    return imp;
  },

  bidResponse(buildBidResponse, bid, context) {
    const nurl = bid.nurl;
    delete bid.nurl;

    const bidResponse = buildBidResponse(bid, context);
    bidResponse.currency = 'USD';
    bidResponse.nurl = nurl;

    return bidResponse;
  }
};

export const converter = ortbConverter(ortbConverterProps);

function isBidRequestValid(bid) {
  const bannerSizes = getAdUnitSizes(bid);
  const videoPlayerSize = deepAccess(bid, 'mediaTypes.video.playerSize');

  const hasBannerSize = Array.isArray(bannerSizes) && bannerSizes.length > 0;
  const hasVideoSize = Array.isArray(videoPlayerSize) && videoPlayerSize.length > 0;
  const isValidSize = hasBannerSize || hasVideoSize;

  const hasAssetKeyAndAdUnitId = !!deepAccess(bid, 'params.adUnitId') && !!deepAccess(bid, 'params.assetKey');
  const hasPublisherIdAndAdUnitCode = !!deepAccess(bid, 'ortb2.site.publisher.id') && !!bid.adUnitCode;

  return isValidSize && (hasAssetKeyAndAdUnitId || hasPublisherIdAndAdUnitCode);
}

function getUserSyncs(syncOptions, serverResponses, gdprConsent, uspConsent, gppConsent) {
  const consent = (gdprConsent && gdprConsent.consentString) || '';
  const gpp = (gppConsent && gppConsent.gppString) || '';
  const gppSid = (gppConsent && gppConsent.applicableSections && gppConsent.applicableSections.toString()) || '';
  const usp = uspConsent || '';

  if (syncOptions.iframeEnabled) {
    return [
      {
        type: 'iframe',
        url: `${MS_COOKIE_SYNC_DOMAIN}/user-sync.html?gdpr_consent=${consent}&source=prebid&gpp=${gpp}&gpp_sid=${gppSid}&us_privacy=${usp}`,
      }
    ];
  }

  if (syncOptions.pixelEnabled) {
    return [
      {
        type: 'image',
        url: `${MS_COOKIE_SYNC_DOMAIN}/user-sync?source=prebid&gdpr_consent=${consent}&gpp=${gpp}&gpp_sid=${gppSid}&us_privacy=${usp}`,
      }
    ];
  }

  return [];
}

function buildRequests(bidRequests, bidderRequest) {
  const data = converter.toORTB({ bidRequests, bidderRequest });

  return {
    method: 'POST',
    url: BID_HOST,
    data,
    options: { contentType: 'application/json' },
  };
}

function interpretResponse(response, request) {
  return converter.fromORTB({ response: response.body, request: request.data }).bids;
}

function getFloor(bid) {
  if (!isFn(bid.getFloor)) {
    return 0;
  }

  // Detect banner from mediaTypes.banner rather than via getAdUnitSizes — Prebid
  // populates bid.sizes from mediaTypes.video.playerSize for video-only adUnits,
  // which would otherwise make hasBanner falsely true and route the floor query
  // to the banner mediaType for an imp that has no banner.
  const hasBanner = Boolean(deepAccess(bid, 'mediaTypes.banner'));
  const videoPlayerSize = deepAccess(bid, 'mediaTypes.video.playerSize');
  const hasVideo = Array.isArray(videoPlayerSize) && videoPlayerSize.length > 0;

  // Video-only bid: query the video floor.
  // Banner-only and mixed banner+video bids: query the banner floor with the
  // historical `size: '*'` wildcard. This preserves the exact pre-video-support
  // behaviour for every banner imp (no regression on banner revenue) and treats
  // mixed imps conservatively as banner.
  const mediaType = (hasVideo && !hasBanner) ? VIDEO : BANNER;
  const result = bid.getFloor({ currency: 'USD', mediaType, size: '*' });

  return (isPlainObject(result) && result.currency === 'USD') ? result.floor : 0;
}

function getWindowContext() {
  try {
    return getWindowTop();
  } catch (e) {
    return getWindowSelf();
  }
}

function onBidWon(bid) {
  const w = getWindowContext();
  w.OG_PREBID_BID_OBJECT = {
    ...(bid && { ...bid }),
  };
  if (bid && bid.nurl) ajax(bid.nurl, null);
}

function onTimeout(timeoutData) {
  ajax(`${TIMEOUT_MONITORING_HOST}/bid_timeout`, null, JSON.stringify({ ...timeoutData[0], location: window.location.href }), {
    method: 'POST',
    contentType: 'application/json'
  });
}

export const spec = {
  code: BIDDER_CODE,
  gvlid: GVLID,
  supportedMediaTypes: [BANNER, VIDEO],
  isBidRequestValid,
  getUserSyncs,
  buildRequests,
  interpretResponse,
  getFloor,
  onBidWon,
  getWindowContext,
  onTimeout
};

registerBidder(spec);
