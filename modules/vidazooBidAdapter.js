import {_each, deepAccess, parseSizesInput, parseUrl, uniques, isFn} from '../src/utils.js';
import {registerBidder} from '../src/adapters/bidderFactory.js';
import {BANNER, VIDEO} from '../src/mediaTypes.js';
import {getStorageManager} from '../src/storageManager.js';
import {bidderSettings} from '../src/bidderSettings.js';
import {config} from '../src/config.js';

const GVLID = 744;
const DEFAULT_SUB_DOMAIN = 'prebid';
const BIDDER_CODE = 'vidazoo';
const BIDDER_VERSION = '1.0.0';
const CURRENCY = 'USD';
const TTL_SECONDS = 60 * 5;
const DEAL_ID_EXPIRY = 1000 * 60 * 15;
const UNIQUE_DEAL_ID_EXPIRY = 1000 * 60 * 60;
const SESSION_ID_KEY = 'vidSid';
const OPT_CACHE_KEY = 'vdzwopt';
export const SUPPORTED_ID_SYSTEMS = {
  'britepoolid': 1,
  'criteoId': 1,
  'id5id': 1,
  'idl_env': 1,
  'lipb': 1,
  'netId': 1,
  'parrableId': 1,
  'pubcid': 1,
  'tdid': 1,
  'pubProvidedId': 1
};
export const webSessionId = 'wsid_' + parseInt(Date.now() * Math.random());
const storage = getStorageManager({bidderCode: BIDDER_CODE});

function getTopWindowQueryParams() {
  try {
    const parsedUrl = parseUrl(window.top.document.URL, {decodeSearchAsString: true});
    return parsedUrl.search;
  } catch (e) {
    return '';
  }
}

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

function buildRequest(bid, topWindowUrl, sizes, bidderRequest, bidderTimeout) {
  const {
    params,
    bidId,
    userId,
    adUnitCode,
    schain,
    mediaTypes,
    auctionId,
    transactionId,
    bidderRequestId,
    bidRequestsCount,
    bidderRequestsCount,
    bidderWinsCount
  } = bid;
  const {ext} = params;
  let {bidFloor} = params;
  const hashUrl = hashCode(topWindowUrl);
  const dealId = getNextDealId(hashUrl);
  const uniqueDealId = getUniqueDealId(hashUrl);
  const sId = getVidazooSessionId();
  const cId = extractCID(params);
  const pId = extractPID(params);
  const subDomain = extractSubDomain(params);
  const ptrace = getCacheOpt();
  const isStorageAllowed = bidderSettings.get(BIDDER_CODE, 'storageAllowed');

  const gpid = deepAccess(bid, 'ortb2Imp.ext.gpid', deepAccess(bid, 'ortb2Imp.ext.data.pbadslot', ''));
  const cat = deepAccess(bidderRequest, 'ortb2.site.cat', []);
  const pagecat = deepAccess(bidderRequest, 'ortb2.site.pagecat', []);

  if (isFn(bid.getFloor)) {
    const floorInfo = bid.getFloor({
      currency: 'USD',
      mediaType: '*',
      size: '*'
    });

    if (floorInfo.currency === 'USD') {
      bidFloor = floorInfo.floor;
    }
  }

  let data = {
    url: encodeURIComponent(topWindowUrl),
    uqs: getTopWindowQueryParams(),
    cb: Date.now(),
    bidFloor: bidFloor,
    bidId: bidId,
    referrer: bidderRequest.refererInfo.ref,
    adUnitCode: adUnitCode,
    publisherId: pId,
    sessionId: sId,
    sizes: sizes,
    dealId: dealId,
    uniqueDealId: uniqueDealId,
    bidderVersion: BIDDER_VERSION,
    prebidVersion: '$prebid.version$',
    res: `${screen.width}x${screen.height}`,
    schain: schain,
    mediaTypes: mediaTypes,
    ptrace: ptrace,
    isStorageAllowed: isStorageAllowed,
    gpid: gpid,
    cat: cat,
    pagecat: pagecat,
    auctionId: auctionId,
    transactionId: transactionId,
    bidderRequestId: bidderRequestId,
    bidRequestsCount: bidRequestsCount,
    bidderRequestsCount: bidderRequestsCount,
    bidderWinsCount: bidderWinsCount,
    bidderTimeout: bidderTimeout,
    webSessionId: webSessionId
  };

  appendUserIdsToRequestPayload(data, userId);

  const sua = deepAccess(bidderRequest, 'ortb2.device.sua');

  if (sua) {
    data.sua = sua;
  }

  if (bidderRequest.gdprConsent) {
    if (bidderRequest.gdprConsent.consentString) {
      data.gdprConsent = bidderRequest.gdprConsent.consentString;
    }
    if (bidderRequest.gdprConsent.gdprApplies !== undefined) {
      data.gdpr = bidderRequest.gdprConsent.gdprApplies ? 1 : 0;
    }
  }
  if (bidderRequest.uspConsent) {
    data.usPrivacy = bidderRequest.uspConsent;
  }

  if (bidderRequest.gppConsent) {
    data.gppString = bidderRequest.gppConsent.gppString;
    data.gppSid = bidderRequest.gppConsent.applicableSections;
  } else if (bidderRequest.ortb2?.regs?.gpp) {
    data.gppString = bidderRequest.ortb2.regs.gpp;
    data.gppSid = bidderRequest.ortb2.regs.gpp_sid;
  }

  const dto = {
    method: 'POST',
    url: `${createDomain(subDomain)}/prebid/multi/${cId}`,
    data: data
  };

  _each(ext, (value, key) => {
    dto.data['ext.' + key] = value;
  });

  return dto;
}

function appendUserIdsToRequestPayload(payloadRef, userIds) {
  let key;
  _each(userIds, (userId, idSystemProviderName) => {
    if (SUPPORTED_ID_SYSTEMS[idSystemProviderName]) {
      key = `uid.${idSystemProviderName}`;

      switch (idSystemProviderName) {
        case 'digitrustid':
          payloadRef[key] = deepAccess(userId, 'data.id');
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
  // TODO: does the fallback make sense here?
  const topWindowUrl = bidderRequest.refererInfo.page || bidderRequest.refererInfo.topmostLocation;
  const bidderTimeout = config.getConfig('bidderTimeout');
  const requests = [];
  validBidRequests.forEach(validBidRequest => {
    const sizes = parseSizesInput(validBidRequest.sizes);
    const request = buildRequest(validBidRequest, topWindowUrl, sizes, bidderRequest, bidderTimeout);
    requests.push(request);
  });
  return requests;
}

function interpretResponse(serverResponse, request) {
  if (!serverResponse || !serverResponse.body) {
    return [];
  }
  const {bidId} = request.data;
  const {results} = serverResponse.body;

  let output = [];

  try {
    results.forEach(result => {
      const {creativeId, ad, price, exp, width, height, currency, advertiserDomains, metaData, mediaType = BANNER} = result;
      if (!ad || !price) {
        return;
      }

      const response = {
        requestId: bidId,
        cpm: price,
        width: width,
        height: height,
        creativeId: creativeId,
        currency: currency || CURRENCY,
        netRevenue: true,
        ttl: exp || TTL_SECONDS,
      };

      if (metaData) {
        Object.assign(response, {
          meta: metaData
        })
      } else {
        Object.assign(response, {
          meta: {
            advertiserDomains: advertiserDomains || []
          }
        })
      }

      if (mediaType === BANNER) {
        Object.assign(response, {
          ad: ad,
        });
      } else {
        Object.assign(response, {
          vastXml: ad,
          mediaType: VIDEO
        });
      }
      output.push(response);
    });
    return output;
  } catch (e) {
    return [];
  }
}

function getUserSyncs(syncOptions, responses, gdprConsent = {}, uspConsent = '') {
  let syncs = [];
  const {iframeEnabled, pixelEnabled} = syncOptions;
  const {gdprApplies, consentString = ''} = gdprConsent;

  const cidArr = responses.filter(resp => deepAccess(resp, 'body.cid')).map(resp => resp.body.cid).filter(uniques);
  const params = `?cid=${encodeURIComponent(cidArr.join(','))}&gdpr=${gdprApplies ? 1 : 0}&gdpr_consent=${encodeURIComponent(consentString || '')}&us_privacy=${encodeURIComponent(uspConsent || '')}`
  if (iframeEnabled) {
    syncs.push({
      type: 'iframe',
      url: `https://sync.cootlogix.com/api/sync/iframe/${params}`
    });
  }
  if (pixelEnabled) {
    syncs.push({
      type: 'image',
      url: `https://sync.cootlogix.com/api/sync/image/${params}`
    });
  }
  return syncs;
}

export function hashCode(s, prefix = '_') {
  const l = s.length;
  let h = 0
  let i = 0;
  if (l > 0) {
    while (i < l) {
      h = (h << 5) - h + s.charCodeAt(i++) | 0;
    }
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

export function getCacheOpt() {
  let data = storage.getDataFromLocalStorage(OPT_CACHE_KEY);
  if (!data) {
    data = String(Date.now());
    storage.setDataInLocalStorage(OPT_CACHE_KEY, data);
  }

  return data;
}

export function getStorageItem(key) {
  try {
    return tryParseJSON(storage.getDataFromLocalStorage(key));
  } catch (e) {
  }

  return null;
}

export function setStorageItem(key, value, timestamp) {
  try {
    const created = timestamp || Date.now();
    const data = JSON.stringify({value, created});
    storage.setDataInLocalStorage(key, data);
  } catch (e) {
  }
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
  supportedMediaTypes: [BANNER, VIDEO],
  isBidRequestValid,
  buildRequests,
  interpretResponse,
  getUserSyncs
};

registerBidder(spec);
