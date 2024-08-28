import {
  registerBidder
} from '../src/adapters/bidderFactory.js';

import {
  deepAccess,
  isFn,
  logError,
  isArray,
  formatQS,
  deepSetValue
} from '../src/utils.js';
import { EVENTS } from '../src/constants.js';
import { ajax } from '../src/ajax.js';

import {
  ADPOD,
  BANNER,
  VIDEO,
} from '../src/mediaTypes.js';

const BIDDER_CODE = 'connatix';

const AD_URL = 'https://capi.connatix.com/rtb/hba';
const DEFAULT_MAX_TTL = '3600';
const DEFAULT_CURRENCY = 'USD';

const EVENTS_BASE_URL = 'https://capi.connatix.com/tr/am';

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

function _getBidRequests(validBidRequests) {
  return validBidRequests.map(bid => {
    const {
      bidId,
      mediaTypes,
      params,
      sizes,
    } = bid;
    return {
      bidId,
      mediaTypes,
      sizes,
      placementId: params.placementId,
      hasViewabilityContainerId: Boolean(params.viewabilityContainerIdentifier),
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

function _onAuctionTimeout(timeoutData, context) {
  const isConnatixTimeout = timeoutData.bidderRequests.some(bidderRequest => bidderRequest.bidderCode === BIDDER_CODE);

  // Log only it is a timeout for Connatix
  // Otherwise it is not relevant for us
  if (!isConnatixTimeout) {
    return;
  }

  const timeout = timeoutData.timeout;
  ajax(`${EVENTS_BASE_URL}`, null, JSON.stringify({type: 'timeout', timeout, context}), {
    method: 'POST',
    withCredentials: false
  });
}

function _onAuctionEnd(auctionEndData, context) {
  const bidsReceived = auctionEndData.bidsReceived;
  const hasConnatixBid = bidsReceived.some(bid => bid.bidderCode === BIDDER_CODE);

  // Log only if connatix compete in the auction and have a bid.
  // Otherwise it is not relevant for us
  if (!hasConnatixBid) {
    return;
  }

  const { bestBidPrice, bestBidBidder } = bidsReceived.reduce((acc, bid) => {
    if (bid.cpm > acc.bestBidPrice) {
      acc.bestBidPrice = bid.cpm;
      acc.bestBidBidder = bid.bidderCode;
    }
    return acc;
  }, { bestBidPrice: 0, bestBidBidder: '' });

  const connatixBid = bidsReceived.find(bid => bid.bidderCode === BIDDER_CODE);
  const connatixBidPrice = connatixBid?.cpm ?? 0;

  if (bestBidPrice > connatixBidPrice) {
    ajax(`${EVENTS_BASE_URL}`, null, JSON.stringify({type: 'auction_end', bestBidBidder, bestBidPrice, connatixBidPrice, context}), {
      method: 'POST',
      withCredentials: false
    });
  }
}

/**
 * Handle prebid events to send to Connatix
 */
function subscribeToEvents(validBidRequests, bidderRequest) {
  const prebidJs = window.pbjs;

  if (!prebidJs) {
    return;
  }

  const bidRequests = _getBidRequests(validBidRequests);
  const context = {
    refererInfo: bidderRequest.refererInfo,
    uspConsent: bidderRequest.uspConsent,
    gppConsent: bidderRequest.gppConsent,
    gdprConsent: bidderRequest.gdprConsent,
    ortb2: bidderRequest.ortb2,
    bidRequests,
  };

  prebidJs.onEvent(EVENTS.AUCTION_TIMEOUT, (timeoutData) => {
    _onAuctionTimeout(timeoutData, context);
  });

  prebidJs.onEvent(EVENTS.AUCTION_END, (auctionEndData) => {
    _onAuctionEnd(auctionEndData, context);
  });
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
    subscribeToEvents(validBidRequests, bidderRequest)

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

    return {
      method: 'POST',
      url: AD_URL,
      data: requestPayload
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
  }
};

registerBidder(spec);
