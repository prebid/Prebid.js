import {_each, deepAccess, parseSizesInput, parseUrl, isFn} from '../src/utils.js';
import {registerBidder} from '../src/adapters/bidderFactory.js';
import {BANNER, VIDEO} from '../src/mediaTypes.js';
import {getStorageManager} from '../src/storageManager.js';
import {config} from '../src/config.js';
import {
  appendUserIdsToRequestPayload,
  extractCID,
  extractPID,
  extractSubDomain,
  isBidRequestValid,
  hashCode,
  getUniqueDealId, createUserSyncGetter
} from '../libraries/vidazooUtils/bidderUtils.js';

const DEFAULT_SUB_DOMAIN = 'exchange';
const BIDDER_CODE = 'illumin';
const BIDDER_VERSION = '1.0.0';
const GVLID = 149;
const CURRENCY = 'USD';
const TTL_SECONDS = 60 * 5;
export const storage = getStorageManager({bidderCode: BIDDER_CODE});

function getTopWindowQueryParams() {
  try {
    const parsedUrl = parseUrl(window.top.document.URL, {decodeSearchAsString: true});
    return parsedUrl.search;
  } catch (e) {
    return '';
  }
}

export function createDomain(subDomain = DEFAULT_SUB_DOMAIN) {
  return `https://${subDomain}.illumin.com`;
}

function buildRequest(bid, topWindowUrl, sizes, bidderRequest, bidderTimeout) {
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
  let {bidFloor, ext} = params;
  const hashUrl = hashCode(topWindowUrl);
  const uniqueDealId = getUniqueDealId(storage, hashUrl);
  const cId = extractCID(params);
  const pId = extractPID(params);
  const subDomain = extractSubDomain(params);

  const gpid = deepAccess(bid, 'ortb2Imp.ext.gpid', deepAccess(bid, 'ortb2Imp.ext.data.pbadslot', ''));

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
    gpid: gpid,
    transactionId: ortb2Imp?.ext?.tid,
    bidderRequestId: bidderRequestId,
    bidRequestsCount: bidRequestsCount,
    bidderRequestsCount: bidderRequestsCount,
    bidderWinsCount: bidderWinsCount,
    bidderTimeout: bidderTimeout
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

function buildRequests(validBidRequests, bidderRequest) {
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
      const {
        creativeId,
        ad,
        price,
        exp,
        width,
        height,
        currency,
        metaData,
        advertiserDomains,
        mediaType = BANNER
      } = result;
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

const getUserSyncs = createUserSyncGetter({
  iframeSyncUrl: 'https://sync.illumin.com/api/sync/iframe',
  imageSyncUrl: 'https://sync.illumin.com/api/sync/image'
});

export const spec = {
  code: BIDDER_CODE,
  version: BIDDER_VERSION,
  supportedMediaTypes: [BANNER, VIDEO],
  gvlid: GVLID,
  isBidRequestValid,
  buildRequests,
  interpretResponse,
  getUserSyncs
};

registerBidder(spec);
