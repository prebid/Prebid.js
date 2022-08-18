import { registerBidder } from '../src/adapters/bidderFactory.js';
import { config } from '../src/config.js';
import { BANNER } from '../src/mediaTypes.js';
import { getStorageManager } from '../src/storageManager.js';
import {
  isArray,
  isEmpty,
  isEmptyStr,
  isStr,
  isPlainObject,
} from '../src/utils.js';

const GVLID = 1012;
const BIDDER_CODE = 'glimpse';
const storageManager = getStorageManager({
  gvlid: GVLID,
  bidderCode: BIDDER_CODE,
});
const ENDPOINT = 'https://market.glimpsevault.io/public/v1/prebid';
const LOCAL_STORAGE_KEY = {
  vault: {
    jwt: 'gp_vault_jwt',
  },
};

export const spec = {
  gvlid: GVLID,
  code: BIDDER_CODE,
  supportedMediaTypes: [BANNER],

  /**
   * Determines if the bid request is valid
   * @param bid {BidRequest} The bid to validate
   * @return {boolean}
   */
  isBidRequestValid: (bid) => {
    const pid = bid?.params?.pid;
    return isStr(pid) && !isEmptyStr(pid);
  },

  /**
   * Builds the http request
   * @param validBidRequests {BidRequest[]}
   * @param bidderRequest {BidderRequest}
   * @returns {ServerRequest}
   */
  buildRequests: (validBidRequests, bidderRequest) => {
    const url = buildQuery(bidderRequest);
    const auth = getVaultJwt();
    const referer = getReferer(bidderRequest);
    const imp = validBidRequests.map(processBidRequest);
    const fpd = getFirstPartyData(bidderRequest.ortb2);

    const data = {
      auth,
      data: {
        referer,
        imp,
        fpd,
      },
    };

    return {
      method: 'POST',
      url,
      data: JSON.stringify(data),
      options: {},
    };
  },

  /**
   * Parse http response
   * @param response {ServerResponse}
   * @returns {Bid[]}
   */
  interpretResponse: (response) => {
    if (isValidResponse(response)) {
      const { auth, data } = response.body;
      setVaultJwt(auth);
      const bids = data.bids.map(processBidResponse);
      return bids;
    }
    return [];
  },
};

function setVaultJwt(auth) {
  storageManager.setDataInLocalStorage(LOCAL_STORAGE_KEY.vault.jwt, auth);
}

function getVaultJwt() {
  return (
    storageManager.getDataFromLocalStorage(LOCAL_STORAGE_KEY.vault.jwt) || ''
  );
}

function getReferer(bidderRequest) {
  // TODO: is 'page' the right value here?
  return bidderRequest?.refererInfo?.page || '';
}

function buildQuery(bidderRequest) {
  let url = appendQueryParam(ENDPOINT, 'ver', '$prebid.version$');

  const timeout = config.getConfig('bidderTimeout');
  url = appendQueryParam(url, 'tmax', timeout);

  if (gdprApplies(bidderRequest)) {
    const consentString = bidderRequest.gdprConsent.consentString;
    url = appendQueryParam(url, 'gdpr', consentString);
  }

  if (ccpaApplies(bidderRequest)) {
    url = appendQueryParam(url, 'ccpa', bidderRequest.uspConsent);
  }

  return url;
}

function appendQueryParam(url, key, value) {
  if (!value) {
    return url;
  }
  const prefix = url.includes('?') ? '&' : '?';
  return `${url}${prefix}${key}=${encodeURIComponent(value)}`;
}

function gdprApplies(bidderRequest) {
  return Boolean(bidderRequest?.gdprConsent?.gdprApplies);
}

function ccpaApplies(bidderRequest) {
  return (
    isStr(bidderRequest.uspConsent) &&
    !isEmptyStr(bidderRequest.uspConsent) &&
    bidderRequest.uspConsent?.substr(1, 3) !== '---'
  );
}

function processBidRequest(bid) {
  const sizes = normalizeSizes(bid.sizes);

  return {
    bid: bid.bidId,
    pid: bid.params.pid,
    sizes,
  };
}

function normalizeSizes(sizes) {
  const isSingleSize =
    isArray(sizes) &&
    sizes.length === 2 &&
    !isArray(sizes[0]) &&
    !isArray(sizes[1]);

  if (isSingleSize) {
    return [sizes];
  }

  return sizes;
}

function getFirstPartyData(ortb2) {
  let fpd = ortb2 || {};
  optimizeObject(fpd);
  return fpd;
}

function optimizeObject(obj) {
  if (!isPlainObject(obj)) {
    return;
  }
  for (const [key, value] of Object.entries(obj)) {
    optimizeObject(value);
    // only delete empty object, array, or string
    if (
      (isPlainObject(value) || isArray(value) || isStr(value)) &&
      isEmpty(value)
    ) {
      delete obj[key];
    }
  }
}

function isValidResponse(bidResponse) {
  const auth = bidResponse?.body?.auth;
  const bids = bidResponse?.body?.data?.bids;
  return isStr(auth) && isArray(bids) && !isEmpty(bids);
}

function processBidResponse(bid) {
  const meta = bid.meta || {};
  meta.advertiserDomains = bid.meta?.advertiserDomains || [];

  return {
    ...bid,
    meta,
  };
}

registerBidder(spec);
