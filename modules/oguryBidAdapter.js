'use strict';

import { BANNER } from '../src/mediaTypes.js';
import { getWindowSelf, getWindowTop, isFn, deepAccess, isPlainObject, deepSetValue, mergeDeep } from '../src/utils.js';
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
const ADAPTER_VERSION = '2.0.0';

export const converter = ortbConverter({
  context: {
    netRevenue: true,
    ttl: 60,
    mediaType: 'banner'
  },

  request(buildRequest, imps, bidderRequest, context) {
    const req = buildRequest(imps, bidderRequest, context);
    req.tmax = DEFAULT_TIMEOUT;
    deepSetValue(req, 'device.pxratio', window.devicePixelRatio);
    deepSetValue(req, 'site.page', getWindowContext().location.href);

    req.ext = mergeDeep({}, req.ext, {
      adapterversion: ADAPTER_VERSION,
      prebidversion: '$prebid.version$'
    });

    const bidWithAssetKey = bidderRequest.bids.find(bid => Boolean(deepAccess(bid, 'params.assetKey', false)));
    if (bidWithAssetKey) deepSetValue(req, 'site.id', bidWithAssetKey.params.assetKey);

    const bidWithUserIds = bidderRequest.bids.find(bid => Boolean(bid.userId));
    if (bidWithUserIds) deepSetValue(req, 'user.ext.uids', bidWithUserIds.userId);

    return req;
  },

  imp(buildImp, bidRequest, context) {
    const imp = buildImp(bidRequest, context);
    const timeSpentOnPage = document.timeline && document.timeline.currentTime ? document.timeline.currentTime : 0
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
    const bidResponse = buildBidResponse(bid, context);
    bidResponse.currency = 'USD';
    return bidResponse;
  }
});

function isBidRequestValid(bid) {
  const adUnitSizes = getAdUnitSizes(bid);

  const isValidSize = (Boolean(adUnitSizes) && adUnitSizes.length > 0);
  const hasAssetKeyAndAdUnitId = !!deepAccess(bid, 'params.adUnitId') && !!deepAccess(bid, 'params.assetKey');
  const hasPublisherIdAndAdUnitCode = !!deepAccess(bid, 'ortb2.site.publisher.id') && !!bid.adUnitCode;

  return isValidSize && (hasAssetKeyAndAdUnitId || hasPublisherIdAndAdUnitCode);
}

function getUserSyncs(syncOptions, serverResponses, gdprConsent, uspConsent, gppConsent) {
  const consent = (gdprConsent && gdprConsent.consentString) || '';
  const gpp = (gppConsent && gppConsent.gppString) || '';
  const gppSid = (gppConsent && gppConsent.applicableSections && gppConsent.applicableSections.toString()) || '';

  if (syncOptions.iframeEnabled) {
    return [
      {
        type: 'iframe',
        url: `${MS_COOKIE_SYNC_DOMAIN}/user-sync.html?gdpr_consent=${consent}&source=prebid&gpp=${gpp}&gpp_sid=${gppSid}`
      }
    ];
  }

  if (syncOptions.pixelEnabled) {
    return [
      {
        type: 'image',
        url: `${MS_COOKIE_SYNC_DOMAIN}/v1/init-sync/bid-switch?iab_string=${consent}&source=prebid&gpp=${gpp}&gpp_sid=${gppSid}`
      },
      {
        type: 'image',
        url: `${MS_COOKIE_SYNC_DOMAIN}/ttd/init-sync?iab_string=${consent}&source=prebid&gpp=${gpp}&gpp_sid=${gppSid}`
      },
      {
        type: 'image',
        url: `${MS_COOKIE_SYNC_DOMAIN}/xandr/init-sync?iab_string=${consent}&source=prebid&gpp=${gpp}&gpp_sid=${gppSid}`
      }
    ];
  }

  return [];
}

function buildRequests(bidRequests, bidderRequest) {
  const data = converter.toORTB({bidRequests, bidderRequest});

  return {
    method: 'POST',
    url: BID_HOST,
    data,
    options: {contentType: 'application/json'},
  };
}

function interpretResponse(response, request) {
  return converter.fromORTB({response: response.body, request: request.data}).bids;
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

  return (isPlainObject(floorResult) && floorResult.currency === 'USD') ? floorResult.floor : 0;
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
  gvlid: GVLID,
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
