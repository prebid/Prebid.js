import {
  _each,
  deepAccess,
  isFn,
  parseSizesInput,
  uniques,
  isArray,
} from '../src/utils.js';
import {registerBidder} from '../src/adapters/bidderFactory.js';
import {BANNER, VIDEO} from '../src/mediaTypes.js';
import {getStorageManager} from '../src/storageManager.js';
import {bidderSettings} from '../src/bidderSettings.js';
import {config} from '../src/config.js';
import {chunk} from '../libraries/chunk/chunk.js';
import {
  createSessionId,
  getTopWindowQueryParams,
  extractCID,
  extractPID,
  extractSubDomain,
  isBidRequestValid,
  getStorageItem,
  getCacheOpt,
  getUniqueDealId,
  getNextDealId,
  hashCode,
  onBidWon
} from '../libraries/vidazooUtils/bidderUtils.js';
import {
  CURRENCY,
  TTL_SECONDS,
  SESSION_ID_KEY,
  OPT_CACHE_KEY,
  OPT_TIME_KEY
} from '../libraries/vidazooUtils/constants.js';

const GVLID = 744;
const DEFAULT_SUB_DOMAIN = 'prebid';
const BIDDER_CODE = 'vidazoo';
const BIDDER_VERSION = '1.0.0';
export const storage = getStorageManager({bidderCode: BIDDER_CODE});
export const webSessionId = createSessionId();

export function createDomain(subDomain = DEFAULT_SUB_DOMAIN) {
  return `https://${subDomain}.cootlogix.com`;
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
  const dealId = getNextDealId(storage, hashUrl);
  const uniqueDealId = getUniqueDealId(storage, hashUrl);
  const sId = getVidazooSessionId();
  const pId = extractPID(params);
  const ptrace = getCacheOpt(storage, OPT_CACHE_KEY);
  const vdzhum = getCacheOpt(storage, OPT_TIME_KEY);
  const isStorageAllowed = bidderSettings.get(BIDDER_CODE, 'storageAllowed');

  const gpid = deepAccess(bid, 'ortb2Imp.ext.gpid') || deepAccess(bid, 'ortb2Imp.ext.data.pbadslot', '');
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
    vdzhum: vdzhum,
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

  if (bidderRequest.paapi?.enabled) {
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
  const chunkSize = Math.min(20, config.getConfig('vidazoo.chunkSize') || 10);

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

function buildRequests(validBidRequests, bidderRequest) {
  // TODO: does the fallback make sense here?
  const topWindowUrl = bidderRequest.refererInfo.page || bidderRequest.refererInfo.topmostLocation;
  const bidderTimeout = config.getConfig('bidderTimeout');

  const singleRequestMode = config.getConfig('vidazoo.singleRequest');

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

  const singleRequestMode = config.getConfig('vidazoo.singleRequest');
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

export function getVidazooSessionId() {
  return getStorageItem(storage, SESSION_ID_KEY) || '';
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
