import {_each, deepAccess, formatQS, parseUrl, triggerPixel, uniques} from '../../src/utils.js';
import {DEAL_ID_EXPIRY, SESSION_ID_KEY, UNIQUE_DEAL_ID_EXPIRY} from './constants.js';

export function createSessionId() {
  return 'wsid_' + parseInt(Date.now() * Math.random());
}

export function getTopWindowQueryParams() {
  try {
    const parsedUrl = parseUrl(window.top.document.URL, {decodeSearchAsString: true});
    return parsedUrl.search;
  } catch (e) {
    return '';
  }
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

export function isBidRequestValid(bid) {
  const params = bid.params || {};
  return !!(extractCID(params) && extractPID(params));
}

export function tryParseJSON(value) {
  try {
    return JSON.parse(value);
  } catch (e) {
    return value;
  }
}

export function setStorageItem(storage, key, value, timestamp) {
  try {
    const created = timestamp || Date.now();
    const data = JSON.stringify({value, created});
    storage.setDataInLocalStorage(key, data);
  } catch (e) {
  }
}

export function getStorageItem(storage, key) {
  try {
    return tryParseJSON(storage.getDataFromLocalStorage(key, null));
  } catch (e) {
  }

  return null;
}

export function getCacheOpt(storage, useKey) {
  let data = storage.getDataFromLocalStorage(useKey, null);
  if (!data) {
    data = String(Date.now());
    storage.setDataInLocalStorage(useKey, data, null);
  }

  return data;
}

export function getUniqueDealId(storage, key, expiry = UNIQUE_DEAL_ID_EXPIRY) {
  const storageKey = `u_${key}`;
  const now = Date.now();
  const data = getStorageItem(storage, storageKey);
  let uniqueId;

  if (!data || !data.value || now - data.created > expiry) {
    uniqueId = `${key}_${now.toString()}`;
    setStorageItem(storage, storageKey, uniqueId);
  } else {
    uniqueId = data.value;
  }

  return uniqueId;
}

export function getNextDealId(storage, key, expiry = DEAL_ID_EXPIRY) {
  try {
    const data = getStorageItem(storage, key);
    let currentValue = 0;
    let timestamp;

    if (data && data.value && Date.now() - data.created < expiry) {
      currentValue = data.value;
      timestamp = data.created;
    }

    const nextValue = currentValue + 1;
    setStorageItem(storage, key, nextValue, timestamp);
    return nextValue;
  } catch (e) {
    return 0;
  }
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

export function onBidWon(bid) {
  if (!bid.nurl) {
    return;
  }
  const wonBid = {
    adId: bid.adId,
    creativeId: bid.creativeId,
    auctionId: bid.auctionId,
    transactionId: bid.transactionId,
    adUnitCode: bid.adUnitCode,
    cpm: bid.cpm,
    currency: bid.currency,
    originalCpm: bid.originalCpm,
    originalCurrency: bid.originalCurrency,
    netRevenue: bid.netRevenue,
    mediaType: bid.mediaType,
    timeToRespond: bid.timeToRespond,
    status: bid.status,
  };
  const qs = formatQS(wonBid);
  const url = bid.nurl + (bid.nurl.indexOf('?') === -1 ? '?' : '&') + qs;
  triggerPixel(url);
}

/**
 * Create the spec function for getting user syncs
 *
 * The options object accepts the following fields:
 *
 *  - iframeSyncUrl
 *  - imageSyncUrl
 *
 * @param options
 */
export function createUserSyncGetter(options = {
  iframeSyncUrl: '',
  imageSyncUrl: ''
}) {
  return function getUserSyncs(syncOptions, responses, gdprConsent = {}, uspConsent = '', gppConsent = {}) {
    const syncs = [];
    const {iframeEnabled, pixelEnabled} = syncOptions;
    const {gdprApplies, consentString = ''} = gdprConsent;
    const {gppString, applicableSections} = gppConsent;

    const cidArr = responses.filter(resp => deepAccess(resp, 'body.cid')).map(resp => resp.body.cid).filter(uniques);
    let params = `?cid=${encodeURIComponent(cidArr.join(','))}&gdpr=${gdprApplies ? 1 : 0}&gdpr_consent=${encodeURIComponent(consentString || '')}&us_privacy=${encodeURIComponent(uspConsent || '')}`;

    if (gppString && applicableSections?.length) {
      params += '&gpp=' + encodeURIComponent(gppString);
      params += '&gpp_sid=' + encodeURIComponent(applicableSections.join(','));
    }

    if (iframeEnabled && options.iframeSyncUrl) {
      syncs.push({
        type: 'iframe',
        url: `${options.iframeSyncUrl}/${params}`
      });
    }
    if (pixelEnabled && options.imageSyncUrl) {
      syncs.push({
        type: 'image',
        url: `${options.imageSyncUrl}/${params}`
      });
    }
    return syncs;
  }
}

export function appendUserIdsToRequestPayload(payloadRef, userIds) {
  let key;
  _each(userIds, (userId, idSystemProviderName) => {
    key = `uid.${idSystemProviderName}`;
    switch (idSystemProviderName) {
      case 'lipb':
        payloadRef[key] = userId.lipbid;
        break;
      case 'id5id':
        payloadRef[key] = userId.uid;
        break;
      default:
        payloadRef[key] = userId;
    }
  });
}

export function getVidazooSessionId(storage) {
  return getStorageItem(storage, SESSION_ID_KEY) || '';
}
