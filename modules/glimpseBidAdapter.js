import { BANNER } from '../src/mediaTypes.js';
import { config } from '../src/config.js';
import { getStorageManager } from '../src/storageManager.js';
import { isArray, tryAppendQueryString } from '../src/utils.js';
import { registerBidder } from '../src/adapters/bidderFactory.js';

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
   * Determines whether or not the given bid request is valid
   * @param bid {BidRequest} The bid to validate
   * @return {boolean}
   */
  isBidRequestValid: (bid) => {
    return (
      hasValue(bid) && hasValue(bid.params) && isString(bid.params.placementId)
    );
  },

  /**
   * Builds http request for Glimpse bids
   * @param validBidRequests {BidRequest[]}
   * @param bidderRequest {BidderRequest}
   * @returns {ServerRequest}
   */
  buildRequests: (validBidRequests, bidderRequest) => {
    const url = buildQuery(bidderRequest);
    const auth = getVaultJwt();
    const referer = getReferer(bidderRequest);
    const imp = validBidRequests.map(processBid);
    const fpd = getFirstPartyData();

    const data = {
      auth,
      data: {
        referer,
        imp,
        fpd,
        bidderCode: spec.code,
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
   * Parse response from Glimpse server
   * @param bidResponse {ServerResponse}
   * @returns {Bid[]}
   */
  interpretResponse: (bidResponse) => {
    const isValidResponse = isValidBidResponse(bidResponse);

    if (isValidResponse) {
      const { auth, data } = bidResponse.body;
      setVaultJwt(auth);
      return data.bids;
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
  const hasReferer =
    hasValue(bidderRequest) &&
    hasValue(bidderRequest.refererInfo) &&
    isString(bidderRequest.refererInfo.referer);

  if (hasReferer) {
    return bidderRequest.refererInfo.referer;
  }

  return '';
}

function buildQuery(bidderRequest) {
  let url = ENDPOINT + '?';
  url = tryAppendQueryString(url, 'ver', '$prebid.version$');
  if (isGdprApplies(bidderRequest)) {
    const consentString = bidderRequest.gdprConsent.consentString;
    url = tryAppendQueryString(url, 'reg', 'gdpr');
    url = tryAppendQueryString(url, 'cmp_cs', consentString);
  } else if (isCcpaApplies(bidderRequest)) {
    url = tryAppendQueryString(url, 'reg', 'ccpa');
    url = tryAppendQueryString(url, 'us_privacy', bidderRequest.uspConsent);
  } else {
    url = tryAppendQueryString(url, 'reg', 'none');
  }
  return url;
}

function isGdprApplies(bidderRequest) {
  return (
    hasValue(bidderRequest.gdprConsent) &&
    isBoolean(bidderRequest.gdprConsent.gdprApplies)
  );
}

function isCcpaApplies(bidderRequest) {
  return (
    isString(bidderRequest.uspConsent) &&
    bidderRequest.uspConsent.substr(1, 3) !== '---'
  );
}

function processBid(bid) {
  const sizes = normalizeSizes(bid.sizes);

  return {
    bid: bid.bidId,
    pid: bid.params.placementId,
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

function getFirstPartyData() {
  const siteKeywords = parseGlobalKeywords('site');
  const userKeywords = parseGlobalKeywords('user');

  const siteAttributes = getConfig('ortb2.site.ext.data', {});
  const userAttributes = getConfig('ortb2.user.ext.data', {});

  return {
    site: {
      keywords: siteKeywords,
      attributes: siteAttributes,
    },
    user: {
      keywords: userKeywords,
      attributes: userAttributes,
    },
  };
}

function parseGlobalKeywords(scope) {
  const keywords = getConfig(`ortb2.${scope}.keywords`, '');

  return keywords.split(', ').filter((keyword) => keyword !== '');
}

function getConfig(path, defaultValue) {
  return config.getConfig(path) || defaultValue;
}

function isValidBidResponse(bidResponse) {
  return (
    hasValue(bidResponse) &&
    hasValue(bidResponse.body) &&
    hasValue(bidResponse.body.data) &&
    hasArrayValue(bidResponse.body.data.bids) &&
    isString(bidResponse.body.auth)
  );
}

function hasValue(value) {
  return value !== undefined && value !== null;
}

function isBoolean(value) {
  return hasValue(value) && typeof value === 'boolean';
}

function isString(value) {
  return hasValue(value) && typeof value === 'string' && value.length > 0;
}

function hasArrayValue(value) {
  return hasValue(value) && isArray(value) && value.length > 0;
}

registerBidder(spec);
