import {registerBidder} from '../src/adapters/bidderFactory.js';
import {ortbConverter} from '../libraries/ortbConverter/converter.js';
import {
  generateUUID,
  isEmpty,
  isFn,
  isPlainObject,
  logError,
  logInfo,
  triggerPixel
} from '../src/utils.js';
import {BANNER} from '../src/mediaTypes.js';
import {getStorageManager} from '../src/storageManager.js';

const BIDDER_CODE = 'bitmedia';
export const ENDPOINT_URL = 'https://cdn.bmcdn7.com/prebid/';
const AVAILABLE_SIZES = [
  [320, 100], [125, 125], [250, 250], [728, 90], [468, 60],
  [300, 100], [300, 250], [120, 240], [320, 1200], [200, 200],
  [160, 600], [336, 280], [120, 600], [300, 600], [180, 150],
  [320, 50], [468, 90], [970, 90], [250, 100],
];

const SIZE_SET = new Set(AVAILABLE_SIZES.map(([w, h]) => `${w}x${h}`));
const DEFAULT_TTL = 30; // seconds
const DEFAULT_CURRENCY = 'USD';
const ALLOWED_CURRENCIES = [
  'USD'
];
const DEFAULT_NET_REVENUE = true;
const PREBID_VERSION = '$prebid.version$';
const ADAPTER_VERSION = '1.0';
export const STORAGE = getStorageManager({bidderCode: BIDDER_CODE});
const USER_FINGERPRINT_KEY = 'bitmedia_fid';

const _handleOnBidWon = (endpoint) => {
  logInfo(BIDDER_CODE, `____handle bid won____`, endpoint);
  triggerPixel(endpoint);
}

const _getFidFromBitmediaFid = (bitmediaFid) => {
  try {
    const decoded = atob(bitmediaFid);
    const parsed = JSON.parse(decoded);
    logInfo(BIDDER_CODE, 'Parsed bitmedia_fid', parsed);
    return parsed.fid || null;
  } catch (e) {
    logError(BIDDER_CODE, 'Failed to parse bitmedia_fid', e);
    return null;
  }
}

const _getBidFloor = (bid, size) => {
  logInfo(BIDDER_CODE, '[Bid Floor] Retrieving bid floor for bid:', bid, size);
  if (isFn(bid.getFloor)) {
    let floor = bid.getFloor({
      currency: DEFAULT_CURRENCY,
      mediaType: BANNER,
      size: size || '*'
    });

    logInfo(BIDDER_CODE, '[Bid Floor] Floor data received:', floor);

    if (isPlainObject(floor) && !isNaN(floor.floor) && floor.currency === DEFAULT_CURRENCY) {
      logInfo(BIDDER_CODE, '[Bid Floor] Valid floor found:', floor);
      return floor.floor;
    }
  }
  logInfo(BIDDER_CODE, '[Bid Floor] Returning null for bid floor.');
  return null;
}

const CONVERTER = ortbConverter({
  context: {
    netRevenue: DEFAULT_NET_REVENUE,
    ttl: DEFAULT_TTL,
    currency: DEFAULT_CURRENCY, // Only one currency available
    mediaType: BANNER,
  },

  imp(buildImp, bidRequest) {
    logInfo(BIDDER_CODE, 'Building imp object for bidRequest', bidRequest);
    const sizes = bidRequest.sizes;

    const validSizes = sizes.filter(([w, h]) => SIZE_SET.has(`${w}x${h}`));

    const imps = validSizes.map(size => {
      const imp = {
        id: bidRequest.bidId,
        tagid: bidRequest.params.adUnitID,
        banner: {
          w: size[0],
          h: size[1],
        }
      };

      const floor = _getBidFloor(bidRequest, size);
      if (floor) {
        imp.bidfloor = floor;
        imp.bidfloorcur = DEFAULT_CURRENCY;
      }

      return imp;
    });
    logInfo(BIDDER_CODE, 'Result imp objects for bidRequest', imps);
    // Should hasOwnProperty id.
    return {id: bidRequest.bidId, imps};
  },

  request(buildRequest, imps, bidderRequest, context) {
    logInfo(BIDDER_CODE, 'Building request with imps and bidderRequest', imps, bidderRequest);

    const requestImps = imps[0].imps;// Unpacking: each imp has the same id, but different banner size

    const reqData = {
      ...bidderRequest.ortb2,
      id: generateUUID(),
      imp: requestImps,
      cur: [context.currency],
      tmax: bidderRequest.timeout,
      ext: {
        ...bidderRequest.ortb2.ext,
        adapter_version: ADAPTER_VERSION,
        prebid_version: PREBID_VERSION
      }
    };

    let userId = null;
    let bitmediaFid = null;
    if (STORAGE.hasLocalStorage()) {
      bitmediaFid = STORAGE.getDataFromLocalStorage(USER_FINGERPRINT_KEY);
      logInfo(BIDDER_CODE, 'Fingerprint in localstorage', bitmediaFid);
    }

    if (!bitmediaFid && STORAGE.cookiesAreEnabled()) {
      bitmediaFid = STORAGE.getCookie(USER_FINGERPRINT_KEY);
      logInfo(BIDDER_CODE, 'Fingerprint in cookies', bitmediaFid);
    }

    if (bitmediaFid) {
      userId = _getFidFromBitmediaFid(bitmediaFid);
    }

    if (userId) {
      reqData.user = reqData.user || {};
      reqData.user.id = userId;
    }

    return reqData;
  },

  bidResponse(buildBidResponse, bid, context) {
    logInfo(BIDDER_CODE, 'Processing bid response in converter', bid);
    const bidResponse = {
      requestId: bid.impid,
      cpm: bid.price,
      currency: bid.cur || context.currency,
      width: bid.w,
      height: bid.h,
      ad: bid.adm,
      ttl: bid.exp || context.ttl,
      creativeId: bid.crid,
      netRevenue: context.netRevenue,
      meta: {
        advertiserDomains: bid.adomain || [],
      },
      nurl: bid.nurl || bid.burl,
      mediaType: context.mediaType,
    };

    return bidResponse;
  },
});

const isBidRequestValid = (bid) => {
  logInfo(BIDDER_CODE, 'Validating bid request', bid);
  const {banner} = bid.mediaTypes || {};
  const {adUnitID, currency} = bid.params || {};

  if (!banner || !Array.isArray(banner.sizes)) {
    logError(BIDDER_CODE, 'Invalid bid: missing or malformed banner sizes', banner);
    return false;
  }

  const hasValidSize = banner.sizes.some(([w, h]) => SIZE_SET.has(`${w}x${h}`));
  if (!hasValidSize) {
    logError(BIDDER_CODE, 'Invalid bid: no valid sizes found', banner.sizes);
    return false;
  }

  if (typeof adUnitID !== 'string') {
    logError(BIDDER_CODE, 'Invalid bid: malformed adUnitId', adUnitID);
    return false;
  }

  const isCurrencyValid = ALLOWED_CURRENCIES.includes(currency);
  if (!isCurrencyValid) {
    logError(BIDDER_CODE, `Invalid currency: ${currency}. Allowed currencies are ${ALLOWED_CURRENCIES.join(', ')}`);
    return false;
  }

  logInfo(BIDDER_CODE, 'Bid request is valid', bid);
  return true;
};

const buildRequests = (validBidRequests = [], bidderRequest = {}) => {
  logInfo(BIDDER_CODE, 'Building OpenRTB request', {validBidRequests, bidderRequest});
  const requests = validBidRequests.map(bidRequest => {
    const data = CONVERTER.toORTB({
      bidRequests: [bidRequest],
      bidderRequest,
    });

    logInfo(BIDDER_CODE, 'Result OpenRTB request data for bidRequest', data);

    const adUnitId = bidRequest.params.adUnitID;

    return {
      method: 'POST',
      url: `${ENDPOINT_URL}${adUnitId}`,
      data: data,
      bids: [bidRequest],
      options: {
        withCredentials: false,
        crossOrigin: true
      },
    };
  });
  return requests;
};

const interpretResponse = (serverResponse, bidRequest) => {
  logInfo(BIDDER_CODE, 'Interpreting server response', {serverResponse, bidRequest});

  if (isEmpty(serverResponse.body)) {
    logInfo(BIDDER_CODE, 'Empty response');
    return [];
  }

  const bids = CONVERTER.fromORTB({
    response: serverResponse.body,
    request: bidRequest.data,
  }).bids;

  logInfo(BIDDER_CODE, `${bids.length} bids successfully interpreted`, bids);

  return bids;
};

const onBidWon = (bid) => {
  const cpm = bid.adserverTargeting?.hb_pb || '';
  logInfo(BIDDER_CODE, `-----Bid won-----`, {bid, cpm: cpm});
  _handleOnBidWon(bid.nurl);
}

export const spec = {
  code: BIDDER_CODE,
  supportedMediaTypes: [BANNER],
  isBidRequestValid,
  buildRequests,
  interpretResponse,
  onBidWon,
};

registerBidder(spec);
