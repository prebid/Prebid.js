import * as utils from '../src/utils.js';
import { registerBidder } from '../src/adapters/bidderFactory.js';
import { BANNER } from '../src/mediaTypes.js';
import { getStorageManager } from '../src/storageManager.js';

const GVLID = 744;
const DEFAULT_SUB_DOMAIN = 'prebid';
const BIDDER_CODE = 'vidazoo';
const BIDDER_VERSION = '1.0.0';
const CURRENCY = 'USD';
const TTL_SECONDS = 60 * 5;
const DEAL_ID_EXPIRY = 1000 * 60 * 15;
const UNIQUE_DEAL_ID_EXPIRY = 1000 * 60 * 15;
const SESSION_ID_KEY = 'vidSid';
export const SUPPORTED_ID_SYSTEMS = {
  'britepoolid': 1,
  'criteoId': 1,
  'digitrustid': 1,
  'id5id': 1,
  'idl_env': 1,
  'lipb': 1,
  'netId': 1,
  'parrableId': 1,
  'pubcid': 1,
  'tdid': 1,
};
const storage = getStorageManager(GVLID);

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
  const uniqueDealId = getUniqueDealId(hashUrl);
  const sId = getVidazooSessionId();
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
    sessionId: sId,
    sizes: sizes,
    dealId: dealId,
    uniqueDealId: uniqueDealId,
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
        case 'parrableId':
          payloadRef[key] = userId.eid;
          break;
        case 'id5id':
          payloadRef[key] = userId.uid;
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
      const { creativeId, ad, price, exp, width, height, currency, advertiserDomains } = result;
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
        ad: ad,
        meta: {
          advertiserDomains: advertiserDomains || []
        }
      })
    });
    return output;
  } catch (e) {
    return [];
  }
}

function getUserSyncs(syncOptions, responses, gdprConsent = {}, uspConsent = '') {
  let syncs = [];
  const { iframeEnabled, pixelEnabled } = syncOptions;
  const { gdprApplies, consentString = '' } = gdprConsent;
  const params = `?gdpr=${gdprApplies ? 1 : 0}&gdpr_consent=${encodeURIComponent(consentString || '')}&us_privacy=${encodeURIComponent(uspConsent || '')}`
  if (iframeEnabled) {
    syncs.push({
      type: 'iframe',
      url: `https://prebid.cootlogix.com/api/sync/iframe/${params}`
    });
  }
  if (pixelEnabled) {
    syncs.push({
      type: 'image',
      url: `https://prebid.cootlogix.com/api/sync/image/${params}`
    });
  }
  return syncs;
}

export function hashCode(s, prefix = '_') {
  const l = s.length;
  let h = 0
  let i = 0;
  if (l > 0) {
    while (i < l) { h = (h << 5) - h + s.charCodeAt(i++) | 0; }
  }
  return prefix + h;
}

export function getNextDealId(key, expiry = DEAL_ID_EXPIRY) {
  try {
    const data = getStorageItem(key);
    let currentValue = 0;
    let timestamp;

    if (data && data.value && Date.now() - data.created < expiry) {
      currentValue = data.value;
      timestamp = data.created;
    }

    const nextValue = currentValue + 1;
    setStorageItem(key, nextValue, timestamp);
    return nextValue;
  } catch (e) {
    return 0;
  }
}

export function getUniqueDealId(key, expiry = UNIQUE_DEAL_ID_EXPIRY) {
  const storageKey = `u_${key}`;
  const now = Date.now();
  const data = getStorageItem(storageKey);
  let uniqueId;

  if (!data || !data.value || now - data.created > expiry) {
    uniqueId = `${key}_${now.toString()}`;
    setStorageItem(storageKey, uniqueId);
  } else {
    uniqueId = data.value;
  }

  return uniqueId;
}

export function getVidazooSessionId() {
  return getStorageItem(SESSION_ID_KEY) || '';
}

export function getStorageItem(key) {
  try {
    return tryParseJSON(storage.getDataFromLocalStorage(key));
  } catch (e) { }

  return null;
}

export function setStorageItem(key, value, timestamp) {
  try {
    const created = timestamp || Date.now();
    const data = JSON.stringify({ value, created });
    storage.setDataInLocalStorage(key, data);
  } catch (e) { }
}

export function tryParseJSON(value) {
  try {
    return JSON.parse(value);
  } catch (e) {
    return value;
  }
}

export const spec = {
  code: BIDDER_CODE,
  version: BIDDER_VERSION,
  gvlid: GVLID,
  supportedMediaTypes: [BANNER],
  isBidRequestValid,
  buildRequests,
  interpretResponse,
  getUserSyncs
};

registerBidder(spec);
