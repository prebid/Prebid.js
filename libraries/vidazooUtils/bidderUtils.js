import {
  _each,
  formatQS,
  isArray,
  isFn,
  parseSizesInput,
  parseUrl,
  triggerPixel,
  uniques
} from '../../src/utils.js';
import {chunk} from '../chunk/chunk.js';
import {CURRENCY, DEAL_ID_EXPIRY, SESSION_ID_KEY, TTL_SECONDS, UNIQUE_DEAL_ID_EXPIRY} from './constants.js';
import {bidderSettings} from '../../src/bidderSettings.js';
import {config} from '../../src/config.js';
import {BANNER, VIDEO} from '../../src/mediaTypes.js';

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
    const coppa = config.getConfig('coppa') ? 1 : 0;

    const cidArr = responses.filter(resp => resp?.body?.cid).map(resp => resp.body.cid).filter(uniques);
    let params = `?cid=${encodeURIComponent(cidArr.join(','))}&gdpr=${gdprApplies ? 1 : 0}&gdpr_consent=${encodeURIComponent(consentString || '')}&us_privacy=${encodeURIComponent(uspConsent || '')}&coppa=${encodeURIComponent((coppa))}`;
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

function appendUserIdsAsEidsToRequestPayload(payloadRef, userIds) {
  let key;
  userIds.forEach((userIdObj) => {
    key = `uid.${userIdObj.source}`;
    payloadRef[key] = userIdObj.uids[0].id;
  })
}

export function getVidazooSessionId(storage) {
  return getStorageItem(storage, SESSION_ID_KEY) || '';
}

export function buildRequestData(bid, topWindowUrl, sizes, bidderRequest, bidderTimeout, storage, bidderVersion, bidderCode, getUniqueRequestData) {
  const {
    params,
    bidId,
    adUnitCode,
    schain,
    mediaTypes,
    ortb2Imp,
    bidderRequestId,
    bidRequestsCount,
    bidderRequestsCount,
    bidderWinsCount
  } = bid;
  const {ext} = params;
  let {bidFloor} = params;
  const hashUrl = hashCode(topWindowUrl);
  const uniqueRequestData = isFn(getUniqueRequestData) ? getUniqueRequestData(hashUrl, bid) : {};
  const uniqueDealId = getUniqueDealId(storage, hashUrl);
  const pId = extractPID(params);
  const isStorageAllowed = bidderSettings.get(bidderCode, 'storageAllowed');

  const gpid = bid?.ortb2Imp?.ext?.gpid || '';
  const cat = bidderRequest?.ortb2?.site?.cat || [];
  const pagecat = bidderRequest?.ortb2?.site?.pagecat || [];
  const contentData = bidderRequest?.ortb2?.site?.content?.data || [];
  const userData = bidderRequest?.ortb2?.user?.data || [];
  const contentLang = bidderRequest?.ortb2?.site?.content?.language || document.documentElement.lang;
  const coppa = bidderRequest?.ortb2?.regs?.coppa ?? 0;
  const device = bidderRequest?.ortb2?.device || {};

  if (isFn(bid.getFloor)) {
    const floorInfo = bid.getFloor({
      currency: 'USD',
      mediaType: '*',
      size: '*'
    });

    if (floorInfo?.currency === 'USD') {
      bidFloor = floorInfo.floor;
    }
  }

  const data = {
    url: encodeURIComponent(topWindowUrl),
    uqs: getTopWindowQueryParams(),
    cb: Date.now(),
    bidFloor: bidFloor,
    bidId: bidId,
    referrer: bidderRequest.refererInfo.ref,
    adUnitCode: adUnitCode,
    publisherId: pId,
    sizes: sizes,
    uniqueDealId: uniqueDealId,
    bidderVersion: bidderVersion,
    prebidVersion: '$prebid.version$',
    res: `${screen.width}x${screen.height}`,
    schain: schain,
    mediaTypes: mediaTypes,
    isStorageAllowed: isStorageAllowed,
    gpid: gpid,
    cat: cat,
    contentData,
    contentLang,
    coppa,
    userData: userData,
    pagecat: pagecat,
    transactionId: ortb2Imp?.ext?.tid,
    bidderRequestId: bidderRequestId,
    bidRequestsCount: bidRequestsCount,
    bidderRequestsCount: bidderRequestsCount,
    bidderWinsCount: bidderWinsCount,
    bidderTimeout: bidderTimeout,
    device,
    ...uniqueRequestData
  };

  // backward compatible userId generators
  if (bid.userIdAsEids?.length > 0) {
    appendUserIdsAsEidsToRequestPayload(data, bid.userIdAsEids);
  }
  if (bid.user?.ext?.eids?.length > 0) {
    appendUserIdsAsEidsToRequestPayload(data, bid.user.ext.eids);
  }
  if (bid.userId) {
    appendUserIdsToRequestPayload(data, bid.userId);
  }

  const sua = bidderRequest?.ortb2?.device?.sua;

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

  if (bidderRequest.paapi?.enabled) {
    const fledge = bidderRequest?.ortb2Imp?.ext?.ae;
    if (fledge) {
      data.fledge = fledge;
    }
  }

  const api = mediaTypes?.video?.api || [];
  if (api.includes(7)) {
    const sourceExt = bidderRequest?.ortb2?.source?.ext;
    if (sourceExt?.omidpv) {
      data.omidpv = sourceExt.omidpv;
    }
    if (sourceExt?.omidpn) {
      data.omidpn = sourceExt.omidpn;
    }
  }

  const dsa = bidderRequest?.ortb2?.regs?.ext?.dsa;
  if (dsa) {
    data.dsa = dsa;
  }
  if (params.placementId) {
    data.placementId = params.placementId;
  }

  _each(ext, (value, key) => {
    data['ext.' + key] = value;
  });

  if (bidderRequest.ortb2) data.ortb2 = bidderRequest.ortb2
  if (bid.ortb2Imp) data.ortb2Imp = bid.ortb2Imp

  return data;
}

export function createInterpretResponseFn(bidderCode, allowSingleRequest) {
  return function interpretResponse(serverResponse, request) {
    if (!serverResponse || !serverResponse.body) {
      return [];
    }

    const singleRequestMode = allowSingleRequest && config.getConfig(`${bidderCode}.singleRequest`);
    const reqBidId = request?.data?.bidId;
    const {results} = serverResponse.body;

    const output = [];

    try {
      results.forEach((result, i) => {
        const {
          creativeId,
          ad,
          price,
          exp,
          width,
          height,
          currency,
          bidId,
          nurl,
          advertiserDomains,
          metaData,
          mediaType = BANNER
        } = result;
        if (!ad || !price) {
          return;
        }

        const response = {
          requestId: (singleRequestMode && bidId) ? bidId : reqBidId,
          cpm: price,
          width: width,
          height: height,
          creativeId: creativeId,
          currency: currency || CURRENCY,
          netRevenue: true,
          ttl: exp || TTL_SECONDS,
        };

        if (nurl) {
          response.nurl = nurl;
        }

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
}

export function createBuildRequestsFn(createRequestDomain, createUniqueRequestData, storage, bidderCode, bidderVersion, allowSingleRequest) {
  function buildRequest(bid, topWindowUrl, sizes, bidderRequest, bidderTimeout) {
    const {params} = bid;
    const cId = extractCID(params);
    const subDomain = extractSubDomain(params);
    const data = buildRequestData(bid, topWindowUrl, sizes, bidderRequest, bidderTimeout, storage, bidderVersion, bidderCode, createUniqueRequestData);
    const dto = {
      method: 'POST', url: `${createRequestDomain(subDomain)}/prebid/multi/${cId}`, data: data
    };
    return dto;
  }

  function buildSingleRequest(bidRequests, bidderRequest, topWindowUrl, bidderTimeout) {
    const {params} = bidRequests[0];
    const cId = extractCID(params);
    const subDomain = extractSubDomain(params);
    const data = bidRequests.map(bid => {
      const sizes = parseSizesInput(bid.sizes);
      return buildRequestData(bid, topWindowUrl, sizes, bidderRequest, bidderTimeout, storage, bidderVersion, bidderCode, createUniqueRequestData)
    });
    const chunkSize = Math.min(20, config.getConfig(`${bidderCode}.chunkSize`) || 10);

    const chunkedData = chunk(data, chunkSize);
    return chunkedData.map(chunk => {
      return {
        method: 'POST',
        url: `${createRequestDomain(subDomain)}/prebid/multi/${cId}`,
        data: {
          bids: chunk
        }
      };
    });
  }

  // validBidRequests - an array of bids validated via the isBidRequestValid function.
  // bidderRequest    - an object with data common to all bid requests.
  return function buildRequests(validBidRequests, bidderRequest) {
    const topWindowUrl = bidderRequest.refererInfo.page || bidderRequest.refererInfo.topmostLocation;
    const bidderTimeout = bidderRequest.timeout || config.getConfig('bidderTimeout');

    const singleRequestMode = allowSingleRequest && config.getConfig(`${bidderCode}.singleRequest`);

    const requests = [];

    if (singleRequestMode) {
      // banner bids are sent as a single request
      const bannerBidRequests = validBidRequests.filter(bid => isArray(bid.mediaTypes) ? bid.mediaTypes.includes(BANNER) : bid.mediaTypes[BANNER] !== undefined);
      if (bannerBidRequests.length > 0) {
        const singleRequests = buildSingleRequest(bannerBidRequests, bidderRequest, topWindowUrl, bidderTimeout);
        requests.push(...singleRequests);
      }

      // video bids are sent as a single request for each bid

      const videoBidRequests = validBidRequests.filter(bid => bid.mediaTypes[VIDEO] !== undefined);
      videoBidRequests.forEach(validBidRequest => {
        const sizes = parseSizesInput(validBidRequest.sizes);
        const request = buildRequest(validBidRequest, topWindowUrl, sizes, bidderRequest, bidderTimeout);
        requests.push(request);
      });
    } else {
      validBidRequests.forEach(validBidRequest => {
        const sizes = parseSizesInput(validBidRequest.sizes);
        const request = buildRequest(validBidRequest, topWindowUrl, sizes, bidderRequest, bidderTimeout);
        requests.push(request);
      });
    }
    return requests;
  }
}
