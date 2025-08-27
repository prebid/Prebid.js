import {isEmpty, parseUrl} from '../src/utils.js';
import { registerBidder } from '../src/adapters/bidderFactory.js';
import { BANNER } from '../src/mediaTypes.js';
import {getStorageManager} from '../src/storageManager.js';

/**
 * @typedef {import('../src/adapters/bidderFactory.js').BidRequest} BidRequest
 * @typedef {import('../src/adapters/bidderFactory.js').Bid} Bid
 * @typedef {import('../src/adapters/bidderFactory.js').BidderRequest} BidderRequest
 * @typedef {import('../src/adapters/bidderFactory.js').validBidRequests} validBidRequests
 * @typedef {import('../src/adapters/bidderFactory.js').ServerResponse} ServerResponse
 * @typedef {import('../src/adapters/bidderFactory.js').SyncOptions} SyncOptions
 * @typedef {import('../src/adapters/bidderFactory.js').UserSync} UserSync
 */

const NETWORK_ID = 10922;
const AD_TYPES = [4309, 641];
const DTX_TYPES = [5061];
const TARGET_NAME = 'inline';
const BIDDER_CODE = 'flipp';
const ENDPOINT = 'https://gateflipp.flippback.com/flyer-locator-service/client_bidding';
const DEFAULT_TTL = 30;
const DEFAULT_CURRENCY = 'USD';
const DEFAULT_CREATIVE_TYPE = 'NativeX';
const VALID_CREATIVE_TYPES = ['DTX', 'NativeX'];
const FLIPP_USER_KEY = 'flipp-uid';
const COMPACT_DEFAULT_HEIGHT = 600;
const STANDARD_DEFAULT_HEIGHT = 1800;

let userKey = null;
export const storage = getStorageManager({bidderCode: BIDDER_CODE});

export function getUserKey(options = {}) {
  if (userKey) {
    return userKey;
  }

  // If the partner provides the user key use it, otherwise fallback to cookies
  if ('userKey' in options && options.userKey) {
    if (isValidUserKey(options.userKey)) {
      userKey = options.userKey;
      return options.userKey;
    }
  }

  // Grab from Cookie
  const foundUserKey = storage.cookiesAreEnabled(null) && storage.getCookie(FLIPP_USER_KEY, null);
  if (foundUserKey && isValidUserKey(foundUserKey)) {
    return foundUserKey;
  }

  // Generate if none found
  userKey = generateUUID();

  // Set cookie
  if (storage.cookiesAreEnabled()) {
    storage.setCookie(FLIPP_USER_KEY, userKey);
  }

  return userKey;
}

function isValidUserKey(userKey) {
  return typeof userKey === 'string' && !userKey.startsWith('#') && userKey.length > 0;
}

const generateUUID = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

/**
 * Determines if a creativeType is valid
 *
 * @param {string} creativeType The Creative Type to validate.
 * @return string creativeType if this is a valid Creative Type, and 'NativeX' otherwise.
 */
const validateCreativeType = (creativeType) => {
  if (creativeType && VALID_CREATIVE_TYPES.includes(creativeType)) {
    return creativeType;
  } else {
    return DEFAULT_CREATIVE_TYPE;
  }
};

const getAdTypes = (creativeType) => {
  if (creativeType === 'DTX') {
    return DTX_TYPES;
  }
  return AD_TYPES;
}

export const spec = {
  code: BIDDER_CODE,
  supportedMediaTypes: [BANNER],
  /**
   * Determines whether or not the given bid request is valid.
   *
   * @param {BidRequest} bid The bid params to validate.
   * @return boolean True if this is a valid bid, and false otherwise.
   */
  isBidRequestValid: function(bid) {
    return !!(bid.params.siteId) && !!(bid.params.publisherNameIdentifier);
  },
  /**
   * Make a server request from the list of BidRequests.
   *
   * @param {validBidRequests} validBidRequests an array of bids
   * @param {BidderRequest} bidderRequest master bidRequest object
   * @return ServerRequest Info describing the request to the server.
   */
  buildRequests: function(validBidRequests, bidderRequest) {
    const urlParams = parseUrl(bidderRequest.refererInfo.page).search;
    const contentCode = urlParams['flipp-content-code'];
    const userKey = getUserKey(validBidRequests[0]?.params);
    const placements = validBidRequests.map((bid, index) => {
      const options = bid.params.options || {};
      if (!options.hasOwnProperty('startCompact')) {
        options.startCompact = true;
      }
      return {
        divName: TARGET_NAME,
        networkId: NETWORK_ID,
        siteId: bid.params.siteId,
        adTypes: getAdTypes(bid.params.creativeType),
        count: 1,
        ...(!isEmpty(bid.params.zoneIds) && {zoneIds: bid.params.zoneIds}),
        properties: {
          ...(!isEmpty(contentCode) && {contentCode: contentCode.slice(0, 32)}),
        },
        options,
        prebid: {
          requestId: bid.bidId,
          publisherNameIdentifier: bid.params.publisherNameIdentifier,
          height: bid.mediaTypes.banner.sizes[index][0],
          width: bid.mediaTypes.banner.sizes[index][1],
          creativeType: validateCreativeType(bid.params.creativeType),
        }
      }
    });
    return {
      method: 'POST',
      url: ENDPOINT,
      data: {
        placements,
        url: bidderRequest.refererInfo.page,
        user: {
          key: userKey,
        },
      },
    }
  },
  /**
   * Unpack the response from the server into a list of bids.
   *
   * @param {ServerResponse} serverResponse A successful response from the server.
   * @param {BidRequest} bidRequest A bid request object
   * @return {Bid[]} An array of bids which were nested inside the server.
   */
  interpretResponse: function(serverResponse, bidRequest) {
    if (!serverResponse?.body) return [];
    const placements = bidRequest.data.placements;
    const res = serverResponse.body;
    if (!isEmpty(res) && !isEmpty(res.decisions) && !isEmpty(res.decisions.inline)) {
      return res.decisions.inline.map(decision => {
        const placement = placements.find(p => p.prebid.requestId === decision.prebid?.requestId);
        const customData = decision.contents[0]?.data?.customData;
        const height = placement.options?.startCompact
          ? customData?.compactHeight ?? COMPACT_DEFAULT_HEIGHT
          : customData?.standardHeight ?? STANDARD_DEFAULT_HEIGHT;
        return {
          bidderCode: BIDDER_CODE,
          requestId: decision.prebid?.requestId,
          cpm: decision.prebid?.cpm,
          width: decision.width,
          height,
          creativeId: decision.adId,
          currency: DEFAULT_CURRENCY,
          netRevenue: true,
          ttl: DEFAULT_TTL,
          ad: decision.prebid?.creative,
        }
      });
    }
    return [];
  },

  /**
   * Register the user sync pixels which should be dropped after the auction.
   *
   * @param {SyncOptions} syncOptions Which user syncs are allowed?
   * @param {ServerResponse[]} serverResponses List of server's responses.
   * @return {UserSync[]} The user syncs which should be dropped.
   */
  getUserSyncs: (syncOptions, serverResponses) => [],
}
registerBidder(spec);
