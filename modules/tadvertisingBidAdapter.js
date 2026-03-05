import {
  deepAccess,
  isEmpty,
  deepSetValue,
  logWarn,
  replaceAuctionPrice,
  triggerPixel,
  logError,
  isFn,
  isPlainObject,
  isInteger
} from '../src/utils.js';
import {registerBidder} from '../src/adapters/bidderFactory.js';
import {BANNER, VIDEO} from "../src/mediaTypes.js";
import {ortbConverter} from '../libraries/ortbConverter/converter.js';
import {hasPurpose1Consent} from '../src/utils/gdpr.js';
import {ajax, sendBeacon} from "../src/ajax.js";

const BIDDER_CODE = 'tadvertising';
const GVL_ID = 213;
const ENDPOINT_URL = 'https://prebid.tads.xplosion.de/bid';
const NOTIFICATION_URL = 'https://prebid.tads.xplosion.de/notify';
const USER_SYNC_URL = 'https://match.adsrvr.org/track/cmf/generic?ttd_pid=pxpinp0&ttd_tpi=1';
const BID_TTL = 360;

const MEDIA_TYPES = {
  [BANNER]: 1,
  [VIDEO]: 2,
};

const pageCache = {};

const converter = ortbConverter({
  bidResponse: (buildBidResponse, bid, context) => {
    let mediaType = BANNER;
    if (bid.adm && bid.adm.startsWith('<VAST')) {
      mediaType = VIDEO;
    }
    bid.mtype = MEDIA_TYPES[mediaType];

    return buildBidResponse(bid, context);
  },
});

export function buildSuccessNotification(bidEvent) {
  return Object.fromEntries(
    Object.entries({
      publisherId: deepAccess(bidEvent, 'params.0.publisherId'),
      placementId: deepAccess(bidEvent, 'params.0.placementId'),
      bidId: bidEvent.adId,
      auctionId: bidEvent.auctionId,
      adUnitCode: bidEvent.adUnitCode,
      page: pageCache[bidEvent.requestId],
      cpm: bidEvent.cpm,
      currency: bidEvent.currency,
      adId: bidEvent.adId,
      creativeId: bidEvent.creativeId,
      size: bidEvent.size,
      dealId: bidEvent.dealId,
      mediaType: bidEvent.mediaType,
      status: bidEvent.status,
      ttr: bidEvent.timeToRespond
    }).filter(([_, value]) => value != null)
  );
}

export function buildErrorNotification(bidEvent, error = null) {
  return Object.fromEntries(
    Object.entries({
      publisherId: deepAccess(bidEvent, 'bids.0.params.publisherId') || deepAccess(bidEvent, 'bids.0.params.0.publisherId'),
      placementId: deepAccess(bidEvent, 'bids.0.params.placementId') || deepAccess(bidEvent, 'bids.0.params.0.placementId'),
      bidId: deepAccess(bidEvent, 'bids.0.bidId'),
      auctionId: deepAccess(bidEvent, 'auctionId'),
      adUnitCode: deepAccess(bidEvent, 'bids.0.adUnitCode'),
      page: deepAccess(bidEvent, 'refererInfo.page'),
      timeout: bidEvent.timeout,
      timedOut: error?.timedOut,
      statusCode: error?.status,
      response: error?.responseText
    }).filter(([_, value]) => value != null)
  );
}

export function buildTimeoutNotification(bidEvent) {
  return Object.fromEntries(
    Object.entries({
      publisherId: deepAccess(bidEvent, 'params.0.publisherId'),
      placementId: deepAccess(bidEvent, 'params.0.placementId'),
      bidId: deepAccess(bidEvent, 'bidId'),
      auctionId: deepAccess(bidEvent, 'auctionId'),
      adUnitCode: deepAccess(bidEvent, 'adUnitCode'),
      page: deepAccess(bidEvent, 'ortb2.site.page'),
      timeout: deepAccess(bidEvent, 'timeout'),
    }).filter(([_, value]) => value != null)
  );
}

export function getBidFloor (bid) {
  // value from params takes precedance over value set by Floor Module
  if (bid.params.bidfloor) {
    return bid.params.bidfloor;
  }

  if (!isFn(bid.getFloor)) {
    return null;
  }

  let floor = bid.getFloor({
    currency: 'USD',
    mediaType: '*',
    size: '*'
  });
  if (isPlainObject(floor) && !isNaN(floor.floor) && floor.currency === 'USD') {
    return floor.floor;
  }
  return null;
}

export const sendNotification = (notifyUrl, eventType, data) => {
  try {
    const notificationUrl = `${notifyUrl}/${eventType}`;
    const payload = JSON.stringify(data)

    if (!sendBeacon(notificationUrl, payload)) {
      // Fallback to using AJAX if Beacon API is not supported
      ajax(notificationUrl, null, payload, {
        method: 'POST',
        contentType: 'text/plain',
        keepalive: true,
      });
    }
  } catch (error) {
    logError(BIDDER_CODE, `Failed to notify event: ${eventType}`, error);
  }
}

export const spec = {
  code: BIDDER_CODE,
  gvlid: GVL_ID,
  supportedMediaTypes: [BANNER, VIDEO],
  sync_url: USER_SYNC_URL,
  notify_url: NOTIFICATION_URL,

  isBidRequestValid: function (bid) {
    if (!bid.params.publisherId) {
      logWarn(BIDDER_CODE + ': Missing required parameter params.publisherId');
      return false;
    }
    if (bid.params.publisherId.length > 32) {
      logWarn(BIDDER_CODE + ': params.publisherId must be 32 characters or less');
      return false;
    }
    if (!bid.params.placementId) {
      logWarn(BIDDER_CODE + ': Missing required parameter params.placementId');
      return false;
    }

    const mediaTypesBanner = deepAccess(bid, 'mediaTypes.banner');
    const mediaTypesVideo = deepAccess(bid, 'mediaTypes.video');

    if (!mediaTypesBanner && !mediaTypesVideo) {
      logWarn(BIDDER_CODE + ': one of mediaTypes.banner or mediaTypes.video must be passed');
      return false;
    }

    if (FEATURES.VIDEO && mediaTypesVideo) {
      if (!mediaTypesVideo.maxduration || !isInteger(mediaTypesVideo.maxduration)) {
        logWarn(BIDDER_CODE + ': mediaTypes.video.maxduration must be set to the maximum video ad duration in seconds');
        return false;
      }
      if (!mediaTypesVideo.api || mediaTypesVideo.api.length === 0) {
        logWarn(BIDDER_CODE + ': mediaTypes.video.api should be an array of supported api frameworks. See the Open RTB v2.5 spec for valid values');
        return false;
      }
      if (!mediaTypesVideo.mimes || mediaTypesVideo.mimes.length === 0) {
        logWarn(BIDDER_CODE + ': mediaTypes.video.mimes should be an array of supported mime types');
        return false;
      }
      if (!mediaTypesVideo.protocols) {
        logWarn(BIDDER_CODE + ': mediaTypes.video.protocols should be an array of supported protocols. See the Open RTB v2.5 spec for valid values');
        return false;
      }
    }
    return true;
  },

  buildRequests: function (validBidRequests, bidderRequest) {
    let data = converter.toORTB({validBidRequests, bidderRequest})
    deepSetValue(data, 'site.publisher.id', bidderRequest.bids[0].params.publisherId)

    const bidFloor = getBidFloor(bidderRequest.bids[0])
    if (bidFloor) {
      deepSetValue(data, 'imp.0.bidfloor', bidFloor)
      deepSetValue(data, 'imp.0.bidfloorcur', 'USD')
    }

    if (deepAccess(validBidRequests[0], 'userIdAsEids')) {
      deepSetValue(data, 'user.ext.eids', validBidRequests[0].userIdAsEids);
    }

    bidderRequest.bids.forEach((bid, index) => {
      pageCache[bid.bidId] = deepAccess(bid, 'ortb2.site.page');
      deepSetValue(data, `imp.${index}.ext.gpid`, bid.params.placementId);
    })
    return {
      method: 'POST',
      url: ENDPOINT_URL,
      data: data,
    };
  },

  interpretResponse: function (response, serverRequest) {
    if (isEmpty(response.body.seatbid)) {
      return [];
    }
    deepSetValue(response, 'body.seatbid.0.bid.0.impid', deepAccess(serverRequest, 'data.imp.0.id'))

    const bids = converter.fromORTB({response: response.body, request: serverRequest.data}).bids;

    bids.forEach(bid => {
      bid.ttl = BID_TTL;
      bid.netRevenue = true;
      bid.currency = bid.currency || 'USD';
      bid.dealId = bid.dealId || null;
      if (bid.vastXml) {
        bid.vastXml = replaceAuctionPrice(bid.vastXml, bid.cpm);
      } else {
        bid.ad = replaceAuctionPrice(bid.ad, bid.cpm);
      }
    })

    return bids;
  },

  getUserSyncs: function (syncOptions, serverResponses, gdprConsent) {
    const syncs = []
    if (serverResponses[0]?.body?.ext?.uss === 1 && gdprConsent && hasPurpose1Consent(gdprConsent)) {
      let gdprParams;
      if (typeof gdprConsent.gdprApplies === 'boolean') {
        gdprParams = `&gdpr=${Number(gdprConsent.gdprApplies)}&gdpr_consent=${gdprConsent.consentString}`;
      } else {
        gdprParams = `&gdpr_consent=${gdprConsent.consentString}`;
      }

      if (syncOptions.pixelEnabled) {
        syncs.push({
          type: 'image',
          url: USER_SYNC_URL + gdprParams
        });
      }
    }
    return syncs;
  },

  onBidWon: function (bid) {
    const payload = buildSuccessNotification(bid)
    sendNotification(spec.notify_url, "won", payload)
  },

  onBidBillable: function (bid) {
    if (bid.burl) {
      triggerPixel(replaceAuctionPrice(bid.burl, bid.cpm));
    }
    const payload = buildSuccessNotification(bid)
    sendNotification(spec.notify_url, "billable", payload)
  },

  onTimeout: function (timeoutData) {
    const payload = timeoutData.map(data => buildTimeoutNotification(data))
    sendNotification(spec.notify_url, 'timeout', payload)
  },

  onBidderError: function ({error, bidderRequest}) {
    const payload = buildErrorNotification(bidderRequest, error)
    sendNotification(spec.notify_url, 'error', payload)
  }
}

registerBidder(spec);
