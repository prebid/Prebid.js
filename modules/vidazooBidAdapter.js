import * as utils from '../src/utils.js';
import { registerBidder } from '../src/adapters/bidderFactory.js';
import { BANNER } from '../src/mediaTypes.js';

const DEFAULT_SUB_DOMAIN = 'prebid';
const BIDDER_CODE = 'vidazoo';
const BIDDER_VERSION = '1.0.0';
const CURRENCY = 'USD';
const TTL_SECONDS = 60 * 5;
const INTERNAL_SYNC_TYPE = {
  IFRAME: 'iframe',
  IMAGE: 'img'
};
const EXTERNAL_SYNC_TYPE = {
  IFRAME: 'iframe',
  IMAGE: 'image'
};
export const SUPPORTED_ID_SYSTEMS = {
  'britepoolid': 1,
  'criteoId': 1,
  'digitrustid': 1,
  'id5id': 1,
  'idl_env': 1,
  'lipb': 1,
  'netId': 1,
  'parrableid': 1,
  'pubcid': 1,
  'tdid': 1,
};

export function createDomain(subDomain = DEFAULT_SUB_DOMAIN) {
  return `https://${subDomain}.cootlogix.com`;
}

export function extractCID(params) {
  return params.cId || params.CID || params.cID || params.CId || params.cid || params.ciD || params.Cid || params.CiD;
}

export function extractPID(params) {
  return params.pId || params.PID || params.pID || params.PId || params.pid || params.piD || params.Pid || params.PiD;
}

export function extractSubDomain(params) {
  return params.subDomain || params.SubDomain || params.Subdomain || params.subdomain || params.SUBDOMAIN || params.subDOMAIN;
}

function isBidRequestValid(bid) {
  const params = bid.params || {};
  return !!(extractCID(params) && extractPID(params));
}

function buildRequest(bid, topWindowUrl, sizes, bidderRequest) {
  const { params, bidId, userId, adUnitCode } = bid;
  const { bidFloor, ext } = params;
  const hashUrl = hashCode(topWindowUrl);
  const dealId = getNextDealId(hashUrl);
  const cId = extractCID(params);
  const pId = extractPID(params);
  const subDomain = extractSubDomain(params);

  let data = {
    url: encodeURIComponent(topWindowUrl),
    cb: Date.now(),
    bidFloor: bidFloor,
    bidId: bidId,
    adUnitCode: adUnitCode,
    publisherId: pId,
    sizes: sizes,
    dealId: dealId,
    bidderVersion: BIDDER_VERSION,
    prebidVersion: '$prebid.version$',
    res: `${screen.width}x${screen.height}`
  };

  appendUserIdsToRequestPayload(data, userId);

  if (bidderRequest.gdprConsent) {
    if (bidderRequest.gdprConsent.consentString) {
      data.gdprConsent = bidderRequest.gdprConsent.consentString;
    }
    if (bidderRequest.gdprConsent.gdprApplies !== undefined) {
      data.gdpr = bidderRequest.gdprConsent.gdprApplies ? 1 : 0;
    }
  }
  if (bidderRequest.uspConsent) {
    data.usPrivacy = bidderRequest.uspConsent
  }

  const dto = {
    method: 'POST',
    url: `${createDomain(subDomain)}/prebid/multi/${cId}`,
    data: data
  };

  utils._each(ext, (value, key) => {
    dto.data['ext.' + key] = value;
  });

  return dto;
}

function appendUserIdsToRequestPayload(payloadRef, userIds) {
  let key;
  utils._each(userIds, (userId, idSystemProviderName) => {
    if (SUPPORTED_ID_SYSTEMS[idSystemProviderName]) {
      key = `uid.${idSystemProviderName}`;

      switch (idSystemProviderName) {
        case 'digitrustid':
          payloadRef[key] = utils.deepAccess(userId, 'data.id');
          break;
        case 'lipb':
          payloadRef[key] = userId.lipbid;
          break;
        default:
          payloadRef[key] = userId;
      }
    }
  });
}

function buildRequests(validBidRequests, bidderRequest) {
  const topWindowUrl = bidderRequest.refererInfo.referer;
  const requests = [];
  validBidRequests.forEach(validBidRequest => {
    const sizes = utils.parseSizesInput(validBidRequest.sizes);
    const request = buildRequest(validBidRequest, topWindowUrl, sizes, bidderRequest);
    requests.push(request);
  });
  return requests;
}

function interpretResponse(serverResponse, request) {
  if (!serverResponse || !serverResponse.body) {
    return [];
  }
  const { bidId } = request.data;
  const { results } = serverResponse.body;

  let output = [];

  try {
    results.forEach(result => {
      const { creativeId, ad, price, exp, width, height, currency } = result;
      if (!ad || !price) {
        return;
      }
      output.push({
        requestId: bidId,
        cpm: price,
        width: width,
        height: height,
        creativeId: creativeId,
        currency: currency || CURRENCY,
        netRevenue: true,
        ttl: exp || TTL_SECONDS,
        ad: ad
      })
    });
    return output;
  } catch (e) {
    return [];
  }
}

function getUserSyncs(syncOptions, responses) {
  const { iframeEnabled, pixelEnabled } = syncOptions;

  if (iframeEnabled) {
    return [{
      type: 'iframe',
      url: 'https://static.cootlogix.com/basev/sync/user_sync.html'
    }];
  }

  if (pixelEnabled) {
    const lookup = {};
    const syncs = [];
    responses.forEach(response => {
      const { body } = response;
      const results = body ? body.results || [] : [];
      results.forEach(result => {
        (result.cookies || []).forEach(cookie => {
          if (cookie.type === INTERNAL_SYNC_TYPE.IMAGE) {
            if (pixelEnabled && !lookup[cookie.src]) {
              syncs.push({
                type: EXTERNAL_SYNC_TYPE.IMAGE,
                url: cookie.src
              });
            }
          }
        });
      });
    });
    return syncs;
  }

  return [];
}

function hashCode(s, prefix = '_') {
  const l = s.length;
  let h = 0
  let i = 0;
  if (l > 0) {
    while (i < l) { h = (h << 5) - h + s.charCodeAt(i++) | 0; }
  }
  return prefix + h;
}

function getNextDealId(key) {
  try {
    const currentValue = Number(getStorageItem(key) || 0);
    const nextValue = currentValue + 1;
    setStorageItem(key, nextValue);
    return nextValue;
  } catch (e) {
    return 0;
  }
}

function getStorage() {
  return window['sessionStorage'];
}

function getStorageItem(key) {
  try {
    return getStorage().getItem(key);
  } catch (e) {
    return null;
  }
}

function setStorageItem(key, value) {
  try {
    getStorage().setItem(key, String(value));
  } catch (e) { }
}

export const spec = {
  code: BIDDER_CODE,
  version: BIDDER_VERSION,
  supportedMediaTypes: [BANNER],
  isBidRequestValid,
  buildRequests,
  interpretResponse,
  getUserSyncs
};

registerBidder(spec);
