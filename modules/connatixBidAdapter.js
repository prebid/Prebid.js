import {
  registerBidder
} from '../src/adapters/bidderFactory.js';

import { config } from '../src/config.js';

import { ajax } from '../src/ajax.js';
import {
  deepAccess,
  deepSetValue,
  formatQS,
  isArray,
  isFn,
  isNumber,
  logError
} from '../src/utils.js';

import {
  ADPOD,
  BANNER,
  VIDEO,
} from '../src/mediaTypes.js';

const BIDDER_CODE = 'connatix';

const AD_URL = 'https://capi.connatix.com/rtb/hba';
const DEFAULT_MAX_TTL = '3600';
const DEFAULT_CURRENCY = 'USD';

const EVENTS_URL = 'https://capi.connatix.com/tr/am';

let context = {};

/*
 * Get the bid floor value from the bid object, either using the getFloor function or by accessing the 'params.bidfloor' property.
 * If the bid floor cannot be determined, return 0 as a fallback value.
 */
export function getBidFloor(bid) {
  if (!isFn(bid.getFloor)) {
    return deepAccess(bid, 'params.bidfloor', 0);
  }

  try {
    const bidFloor = bid.getFloor({
      currency: DEFAULT_CURRENCY,
      mediaType: '*',
      size: '*',
    });
    return bidFloor.floor;
  } catch (err) {
    logError(err);
    return 0;
  }
}

export function validateBanner(mediaTypes) {
  if (!mediaTypes[BANNER]) {
    return true;
  }

  const banner = deepAccess(mediaTypes, BANNER, {});
  return (Boolean(banner.sizes) && isArray(mediaTypes[BANNER].sizes) && mediaTypes[BANNER].sizes.length > 0);
}

export function validateVideo(mediaTypes) {
  const video = mediaTypes[VIDEO];
  if (!video) {
    return true;
  }

  return video.context !== ADPOD;
}

export function _getBidRequests(validBidRequests) {
  return validBidRequests.map(bid => {
    const {
      bidId,
      mediaTypes,
      params,
      sizes,
    } = bid;
    const { placementId, viewabilityContainerIdentifier } = params;
    return {
      bidId,
      mediaTypes,
      sizes,
      placementId,
      hasViewabilityContainerId: Boolean(viewabilityContainerIdentifier),
      floor: getBidFloor(bid),
    };
  });
}

/**
 * Get ids from Prebid User ID Modules and add them to the payload
 */
function _handleEids(payload, validBidRequests) {
  let bidUserIdAsEids = deepAccess(validBidRequests, '0.userIdAsEids');
  if (isArray(bidUserIdAsEids) && bidUserIdAsEids.length > 0) {
    deepSetValue(payload, 'userIdList', bidUserIdAsEids);
  }
}

export const spec = {
  code: BIDDER_CODE,
  gvlid: 143,
  supportedMediaTypes: [BANNER, VIDEO],

  /*
   * Validate the bid request.
   * If the request is valid, Connatix is trying to obtain at least one bid.
   * Otherwise, the request to the Connatix server is not made
   */
  isBidRequestValid: (bid = {}) => {
    const bidId = deepAccess(bid, 'bidId');
    const mediaTypes = deepAccess(bid, 'mediaTypes', {});
    const params = deepAccess(bid, 'params', {});

    const hasBidId = Boolean(bidId);
    const hasMediaTypes = Boolean(mediaTypes) && (Boolean(mediaTypes[BANNER]) || Boolean(mediaTypes[VIDEO]));
    const isValidBanner = validateBanner(mediaTypes);
    const isValidVideo = validateVideo(mediaTypes);
    const hasRequiredBidParams = Boolean(params.placementId);

    const isValid = hasBidId && hasMediaTypes && isValidBanner && isValidVideo && hasRequiredBidParams;
    if (!isValid) {
      logError(
        `Invalid bid request:
          hasBidId: ${hasBidId}, 
          hasMediaTypes: ${hasMediaTypes}, 
          isValidBanner: ${isValidBanner}, 
          isValidVideo: ${isValidVideo}, 
          hasRequiredBidParams: ${hasRequiredBidParams}`
      );
    }
    return isValid;
  },

  /*
   * Build the request payload by processing valid bid requests and extracting the necessary information.
   * Determine the host and page from the bidderRequest's refferUrl, and include ccpa and gdpr consents.
   * Return an object containing the request method, url, and the constructed payload.
   */
  buildRequests: (validBidRequests = [], bidderRequest = {}) => {
    const bidRequests = _getBidRequests(validBidRequests);

    const requestPayload = {
      ortb2: bidderRequest.ortb2,
      gdprConsent: bidderRequest.gdprConsent,
      uspConsent: bidderRequest.uspConsent,
      gppConsent: bidderRequest.gppConsent,
      refererInfo: bidderRequest.refererInfo,
      bidRequests,
    };

    _handleEids(requestPayload, validBidRequests);

    context = requestPayload;

    return {
      method: 'POST',
      url: AD_URL,
      data: context
    };
  },

  /*
   * Interpret the server response and create an array of bid responses by extracting and formatting
   * relevant information such as requestId, cpm, ttl, width, height, creativeId, referrer and ad
   * Returns an array of bid responses by extracting and formatting the server response
   */
  interpretResponse: (serverResponse) => {
    const responseBody = serverResponse.body;
    const bids = responseBody.Bids;

    if (!isArray(bids)) {
      return [];
    }

    const referrer = responseBody.Referrer;
    return bids.map(bidResponse => ({
      requestId: bidResponse.RequestId,
      cpm: bidResponse.Cpm,
      ttl: bidResponse.Ttl || DEFAULT_MAX_TTL,
      currency: 'USD',
      mediaType: bidResponse.VastXml ? VIDEO : BANNER,
      netRevenue: true,
      width: bidResponse.Width,
      height: bidResponse.Height,
      creativeId: bidResponse.CreativeId,
      ad: bidResponse.Ad,
      vastXml: bidResponse.VastXml,
      referrer: referrer,
    }));
  },

  /*
   * Determine the user sync type (either 'iframe' or 'image') based on syncOptions.
   * Construct the sync URL by appending required query parameters such as gdpr, ccpa, and coppa consents.
   * Return an array containing an object with the sync type and the constructed URL.
   */
  getUserSyncs: (syncOptions, serverResponses, gdprConsent, uspConsent, gppConsent) => {
    if (!syncOptions.iframeEnabled) {
      return [];
    }

    if (!serverResponses || !serverResponses.length) {
      return [];
    }

    const params = {};

    if (gdprConsent) {
      if (typeof gdprConsent.gdprApplies === 'boolean') {
        params['gdpr'] = Number(gdprConsent.gdprApplies);
      } else {
        params['gdpr'] = 0;
      }

      if (typeof gdprConsent.consentString === 'string') {
        params['gdpr_consent'] = encodeURIComponent(gdprConsent.consentString);
      }
    }

    if (typeof uspConsent === 'string') {
      params['us_privacy'] = encodeURIComponent(uspConsent);
    }

    const syncUrl = serverResponses[0].body.UserSyncEndpoint;
    const queryParams = Object.keys(params).length > 0 ? formatQS(params) : '';

    const url = queryParams ? `${syncUrl}?${queryParams}` : syncUrl;
    return [{
      type: 'iframe',
      url
    }];
  },

  /**
   * Register bidder specific code, which will execute if the server response time is greater than auction timeout
   */
  onTimeout: (timeoutData) => {
    const connatixBidRequestTimeout = timeoutData.find(bidderRequest => bidderRequest.bidder === BIDDER_CODE);

    // Log only it is a timeout for Connatix
    // Otherwise it is not relevant for us
    if (!connatixBidRequestTimeout) {
      return;
    }
    const requestTimeout = connatixBidRequestTimeout.timeout;
    const timeout = isNumber(requestTimeout) ? requestTimeout : config.getConfig('bidderTimeout');
    spec.triggerEvent({type: 'Timeout', timeout, context});
  },

  /**
   * Register bidder specific code, which will execute if a bid from this bidder won the auction
   */
  onBidWon(bidWinData) {
    if (bidWinData == null) {
      return;
    }
    const {bidder, cpm, requestId, adUnitCode, timeToRespond, auctionId} = bidWinData;

    spec.triggerEvent({type: 'BidWon', bestBidBidder: bidder, bestBidPrice: cpm, requestId, adUnitCode, timeToRespond, auctionId, context});
  },

  triggerEvent(data) {
    ajax(EVENTS_URL, null, JSON.stringify(data), {
      method: 'POST',
      withCredentials: false
    });
  },
};

registerBidder(spec);
