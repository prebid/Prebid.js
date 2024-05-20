import {
  _each,
  deepAccess,
  isFn,
  parseSizesInput,
  parseUrl,
  uniques,
  isArray,
  formatQS,
  triggerPixel
} from '../src/utils.js';
import {registerBidder} from '../src/adapters/bidderFactory.js';
import {BANNER, VIDEO} from '../src/mediaTypes.js';
import {getStorageManager} from '../src/storageManager.js';
import {bidderSettings} from '../src/bidderSettings.js';
import {config} from '../src/config.js';
import {chunk} from '../libraries/chunk/chunk.js';

const GVLID = 1292;
const DEFAULT_SUB_DOMAIN = 'exchange';
const BIDDER_CODE = 'twistdigital';
const BIDDER_VERSION = '1.0.0';
const CURRENCY = 'USD';
const TTL_SECONDS = 60 * 5;
const UNIQUE_DEAL_ID_EXPIRY = 1000 * 60 * 60;

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
  return `https://${subDomain}.twist.win`;
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

function buildRequestData(bid, topWindowUrl, sizes, bidderRequest, bidderTimeout) {
  const {
    params,
    bidId,
    userId,
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
  const uniqueDealId = getUniqueDealId(hashUrl);
  const pId = extractPID(params);
  const isStorageAllowed = bidderSettings.get(BIDDER_CODE, 'storageAllowed');

  const gpid = deepAccess(bid, 'ortb2Imp.ext.gpid', deepAccess(bid, 'ortb2Imp.ext.data.pbadslot', ''));
  const cat = deepAccess(bidderRequest, 'ortb2.site.cat', []);
  const pagecat = deepAccess(bidderRequest, 'ortb2.site.pagecat', []);
  const contentData = deepAccess(bidderRequest, 'ortb2.site.content.data', []);
  const userData = deepAccess(bidderRequest, 'ortb2.user.data', []);

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
    sizes: sizes,
    uniqueDealId: uniqueDealId,
    bidderVersion: BIDDER_VERSION,
    prebidVersion: '$prebid.version$',
    res: `${screen.width}x${screen.height}`,
    schain: schain,
    mediaTypes: mediaTypes,
    isStorageAllowed: isStorageAllowed,
    gpid: gpid,
    cat: cat,
    contentData,
    userData: userData,
    pagecat: pagecat,
    transactionId: ortb2Imp?.ext?.tid,
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

  if (bidderRequest.fledgeEnabled) {
    const fledge = deepAccess(bidderRequest, 'ortb2Imp.ext.ae');
    if (fledge) {
      data.fledge = fledge;
    }
  }

  _each(ext, (value, key) => {
    data['ext.' + key] = value;
  });

  return data;
}

function buildRequest(bid, topWindowUrl, sizes, bidderRequest, bidderTimeout) {
  const {params} = bid;
  const cId = extractCID(params);
  const subDomain = extractSubDomain(params);
  const data = buildRequestData(bid, topWindowUrl, sizes, bidderRequest, bidderTimeout);
  const dto = {
    method: 'POST',
    url: `${createDomain(subDomain)}/prebid/multi/${cId}`,
    data: data
  };
  return dto;
}

function buildSingleRequest(bidRequests, bidderRequest, topWindowUrl, bidderTimeout) {
  const {params} = bidRequests[0];
  const cId = extractCID(params);
  const subDomain = extractSubDomain(params);
  const data = bidRequests.map(bid => {
    const sizes = parseSizesInput(bid.sizes);
    return buildRequestData(bid, topWindowUrl, sizes, bidderRequest, bidderTimeout)
  });
  const chunkSize = Math.min(20, config.getConfig('twistdigital.chunkSize') || 10);

  const chunkedData = chunk(data, chunkSize);
  return chunkedData.map(chunk => {
    return {
      method: 'POST',
      url: `${createDomain(subDomain)}/prebid/multi/${cId}`,
      data: {
        bids: chunk
      }
    };
  });
}

function appendUserIdsToRequestPayload(payloadRef, userIds) {
  let key;
  _each(userIds, (userId, idSystemProviderName) => {
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
  });
}

function buildRequests(validBidRequests, bidderRequest) {
  const topWindowUrl = bidderRequest.refererInfo.page || bidderRequest.refererInfo.topmostLocation;
  const bidderTimeout = config.getConfig('bidderTimeout');

  const singleRequestMode = config.getConfig('twistdigital.singleRequest');

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

function interpretResponse(serverResponse, request) {
  if (!serverResponse || !serverResponse.body) {
    return [];
  }

  const singleRequestMode = config.getConfig('twistdigital.singleRequest');
  const reqBidId = deepAccess(request, 'data.bidId');
  const {results} = serverResponse.body;

  let output = [];

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

function getUserSyncs(syncOptions, responses, gdprConsent = {}, uspConsent = '', gppConsent = {}) {
  let syncs = [];
  const {iframeEnabled, pixelEnabled} = syncOptions;
  const {gdprApplies, consentString = ''} = gdprConsent;
  const {gppString, applicableSections} = gppConsent;

  const cidArr = responses.filter(resp => deepAccess(resp, 'body.cid')).map(resp => resp.body.cid).filter(uniques);
  let params = `?cid=${encodeURIComponent(cidArr.join(','))}&gdpr=${gdprApplies ? 1 : 0}&gdpr_consent=${encodeURIComponent(consentString || '')}&us_privacy=${encodeURIComponent(uspConsent || '')}`;

  if (gppString && applicableSections?.length) {
    params += '&gpp=' + encodeURIComponent(gppString);
    params += '&gpp_sid=' + encodeURIComponent(applicableSections.join(','));
  }

  if (iframeEnabled) {
    syncs.push({
      type: 'iframe',
      url: `https://sync.twist.win/api/sync/iframe/${params}`
    });
  }
  if (pixelEnabled) {
    syncs.push({
      type: 'image',
      url: `https://sync.twist.win/api/sync/image/${params}`
    });
  }
  return syncs;
}

/**
 * @param {Bid} bid
 */
function onBidWon(bid) {
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
  getUserSyncs,
  onBidWon
};

registerBidder(spec);
