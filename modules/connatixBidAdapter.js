import adapterManager from '../src/adapterManager.js';
import {
  registerBidder
} from '../src/adapters/bidderFactory.js';

import { percentInView } from '../libraries/percentInView/percentInView.js';

import { config } from '../src/config.js';
import { getStorageManager } from '../src/storageManager.js';
import { ajax } from '../src/ajax.js';
import {
  deepAccess,
  deepSetValue,
  formatQS,
  getWindowTop,
  isArray,
  isFn,
  isNumber,
  isStr,
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
const CNX_IDS_LOCAL_STORAGE_COOKIES_KEY = 'cnx_user_ids';
const CNX_IDS_EXPIRY = 24 * 30 * 60 * 60 * 1000; // 30 days
export const storage = getStorageManager({ bidderCode: BIDDER_CODE });
const ALL_PROVIDERS_RESOLVED_EVENT = 'cnx_all_identity_providers_resolved';
const IDENTITY_PROVIDER_RESOLVED_EVENT = 'cnx_identity_provider_resolved';
let cnxIdsValues;

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
    return bidFloor?.floor;
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

export function _getMinSize(sizes) {
  if (!sizes || sizes.length === 0) return undefined;
  return sizes.reduce((minSize, currentSize) => {
    const minArea = minSize.w * minSize.h;
    const currentArea = currentSize.w * currentSize.h;
    return currentArea < minArea ? currentSize : minSize;
  });
}

export function _canSelectViewabilityContainer() {
  try {
    window.top.document.querySelector('#viewability-container');
    return true;
  } catch (e) {
    return false;
  }
}

export function _isViewabilityMeasurable(element) {
  if (!element) return false;
  return _canSelectViewabilityContainer(element);
}

export function _getViewability(element, topWin, { w, h } = {}) {
  return topWin.document.visibilityState === 'visible'
    ? percentInView(element, topWin, { w, h })
    : 0;
}

export function detectViewability(bid) {
  const { params, adUnitCode } = bid;

  const viewabilityContainerIdentifier = params.viewabilityContainerIdentifier;

  let element = null;
  let bidParamSizes = null;
  let minSize = [];

  if (isStr(viewabilityContainerIdentifier)) {
    try {
      element = document.querySelector(viewabilityContainerIdentifier) || window.top.document.querySelector(viewabilityContainerIdentifier);
      if (element) {
        bidParamSizes = [element.offsetWidth, element.offsetHeight];
        minSize = _getMinSize(bidParamSizes)
      }
    } catch (e) {
      logError(`Error while trying to find viewability container element: ${viewabilityContainerIdentifier}`);
    }
  }

  if (!element) {
    // Get the sizes from the mediaTypes object if it exists, otherwise use the sizes array from the bid object
    bidParamSizes = bid.mediaTypes && bid.mediaTypes.banner && bid.mediaTypes.banner.sizes ? bid.mediaTypes.banner.sizes : bid.sizes;
    bidParamSizes = typeof bidParamSizes === 'undefined' && bid.mediaType && bid.mediaType.video && bid.mediaType.video.playerSize ? bid.mediaType.video.playerSize : bidParamSizes;
    bidParamSizes = typeof bidParamSizes === 'undefined' && bid.mediaType && bid.mediaType.video && isNumber(bid.mediaType.video.w) && isNumber(bid.mediaType.h) ? [bid.mediaType.video.w, bid.mediaType.video.h] : bidParamSizes;
    minSize = _getMinSize(bidParamSizes ?? [])
    element = document.getElementById(adUnitCode);
  }

  if (_isViewabilityMeasurable(element)) {
    const minSizeObj = {
      w: minSize[0],
      h: minSize[1]
    }
    return Math.round(_getViewability(element, getWindowTop(), minSizeObj))
  }

  return null;
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
    let detectedViewabilityPercentage = detectViewability(bid);
    if (isNumber(detectedViewabilityPercentage)) {
      detectedViewabilityPercentage = detectedViewabilityPercentage / 100;
    }
    return {
      bidId,
      mediaTypes,
      sizes,
      placementId,
      floor: getBidFloor(bid),
      hasViewabilityContainerId: Boolean(viewabilityContainerIdentifier),
      declaredViewabilityPercentage: bid.params.viewabilityPercentage ?? null,
      detectedViewabilityPercentage,
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

export function saveOnAllStorages(name, value, expirationTimeMs) {
  const date = new Date();
  date.setTime(date.getTime() + expirationTimeMs);
  const expires = `expires=${date.toUTCString()}`;
  storage.setCookie(name, JSON.stringify(value), expires);
  storage.setDataInLocalStorage(name, JSON.stringify(value));
  cnxIdsValues = value;
}

export function readFromAllStorages(name) {
  const fromCookie = storage.getCookie(name);
  const fromLocalStorage = storage.getDataFromLocalStorage(name);

  const parsedCookie = fromCookie ? JSON.parse(fromCookie) : undefined;
  const parsedLocalStorage = fromLocalStorage ? JSON.parse(fromLocalStorage) : undefined;

  return parsedCookie || parsedLocalStorage || undefined;
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
    const isValidViewability = typeof params.viewabilityPercentage === 'undefined' || (isNumber(params.viewabilityPercentage) && params.viewabilityPercentage >= 0 && params.viewabilityPercentage <= 1);
    const hasRequiredBidParams = Boolean(params.placementId);

    const isValid = hasBidId && hasMediaTypes && isValidBanner && isValidVideo && hasRequiredBidParams && isValidViewability;
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
    let userIds;
    try {
      userIds = readFromAllStorages(CNX_IDS_LOCAL_STORAGE_COOKIES_KEY) || cnxIdsValues;
    } catch (error) {
      userIds = cnxIdsValues;
    }

    const requestPayload = {
      ortb2: bidderRequest.ortb2,
      gdprConsent: bidderRequest.gdprConsent,
      uspConsent: bidderRequest.uspConsent,
      gppConsent: bidderRequest.gppConsent,
      refererInfo: bidderRequest.refererInfo,
      identityProviderData: userIds,
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

    window.addEventListener('message', function handler(event) {
      if (!event.data || event.origin !== 'https://cds.connatix.com') {
        return;
      }

      if (event.data.type === ALL_PROVIDERS_RESOLVED_EVENT) {
        this.removeEventListener('message', handler);
        event.stopImmediatePropagation();
      }

      if (event.data.type === ALL_PROVIDERS_RESOLVED_EVENT || event.data.type === IDENTITY_PROVIDER_RESOLVED_EVENT) {
        const response = event.data;
        if (response.data) {
          saveOnAllStorages(CNX_IDS_LOCAL_STORAGE_COOKIES_KEY, response.data, CNX_IDS_EXPIRY);
        }
      }
    }, true)

    const syncUrl = serverResponses[0].body.UserSyncEndpoint;
    const queryParams = Object.keys(params).length > 0 ? formatQS(params) : '';

    const url = queryParams ? `${syncUrl}?${queryParams}` : syncUrl;
    return [{
      type: 'iframe',
      url
    }];
  },

  isConnatix: (aliasName) => {
    if (!aliasName) {
      return false;
    }

    const originalBidderName = adapterManager.aliasRegistry[aliasName] || aliasName;
    return originalBidderName === BIDDER_CODE;
  },

  /**
   * Register bidder specific code, which will execute if the server response time is greater than auction timeout
   */
  onTimeout: (timeoutData) => {
    const connatixBidRequestTimeout = timeoutData.find(bidderRequest => spec.isConnatix(bidderRequest.bidder));

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
    const {bidder, cpm, requestId, bidId, adUnitCode, timeToRespond, auctionId} = bidWinData;

    spec.triggerEvent({type: 'BidWon', bestBidBidder: bidder, bestBidPrice: cpm, requestId, bidId, adUnitCode, timeToRespond, auctionId, context});
  },

  triggerEvent(data) {
    ajax(EVENTS_URL, null, JSON.stringify(data), {
      method: 'POST',
      withCredentials: false
    });
  },
};

registerBidder(spec);
