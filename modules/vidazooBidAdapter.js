import {
  deepAccess,
  parseSizesInput,
  isArray,
} from '../src/utils.js';
import {registerBidder} from '../src/adapters/bidderFactory.js';
import {BANNER, VIDEO} from '../src/mediaTypes.js';
import {getStorageManager} from '../src/storageManager.js';
import {config} from '../src/config.js';
import {chunk} from '../libraries/chunk/chunk.js';
import {
  createSessionId,
  extractCID,
  extractSubDomain,
  isBidRequestValid,
  getCacheOpt,
  getNextDealId,
  onBidWon,
  createUserSyncGetter,
  getVidazooSessionId,
  buildRequestData
} from '../libraries/vidazooUtils/bidderUtils.js';
import {
  CURRENCY,
  TTL_SECONDS,
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

function getUniqueRequestData(hashUrl) {
  const dealId = getNextDealId(storage, hashUrl);
  const sessionId = getVidazooSessionId(storage);
  const ptrace = getCacheOpt(storage, OPT_CACHE_KEY);
  const vdzhum = getCacheOpt(storage, OPT_TIME_KEY);

  return {
    dealId: dealId,
    sessionId: sessionId,
    ptrace: ptrace,
    vdzhum: vdzhum
  };
}

function buildRequest(bid, topWindowUrl, sizes, bidderRequest, bidderTimeout) {
  const {params} = bid;
  const cId = extractCID(params);
  const subDomain = extractSubDomain(params);
  const data = buildRequestData(bid, topWindowUrl, sizes, bidderRequest, bidderTimeout, webSessionId, storage, BIDDER_VERSION, BIDDER_CODE, getUniqueRequestData);
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
    return buildRequestData(bid, topWindowUrl, sizes, bidderRequest, bidderTimeout, webSessionId, storage, BIDDER_VERSION, BIDDER_CODE, getUniqueRequestData)
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

const getUserSyncs = createUserSyncGetter({
  iframeSyncUrl: 'https://sync.cootlogix.com/api/sync/iframe',
  imageSyncUrl: 'https://sync.cootlogix.com/api/sync/image'
});

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
