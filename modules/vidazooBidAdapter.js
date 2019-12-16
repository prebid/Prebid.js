import * as utils from '../src/utils';
import {registerBidder} from '../src/adapters/bidderFactory';
import {BANNER} from '../src/mediaTypes';
export const URL = 'https://prebid.cootlogix.com';
const BIDDER_CODE = 'vidazoo';
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

function isBidRequestValid(bid) {
  const params = bid.params || {};
  return !!(params.cId && params.pId);
}

function buildRequest(bid, topWindowUrl, size, bidderRequest) {
  const {params, bidId} = bid;
  const {bidFloor, cId, pId, ext} = params;
  // Prebid's util function returns AppNexus style sizes (i.e. 300x250)
  const [width, height] = size.split('x');

  const dto = {
    method: 'GET',
    url: `${URL}/prebid/${cId}`,
    data: {
      url: encodeURIComponent(topWindowUrl),
      cb: Date.now(),
      bidFloor: bidFloor,
      bidId: bidId,
      publisherId: pId,
      consent: bidderRequest.gdprConsent && bidderRequest.gdprConsent.consentString,
      width,
      height
    }
  };

  utils._each(ext, (value, key) => {
    dto.data['ext.' + key] = value;
  });

  return dto;
}

function buildRequests(validBidRequests, bidderRequest) {
  const topWindowUrl = bidderRequest.refererInfo.referer;
  const requests = [];
  validBidRequests.forEach(validBidRequest => {
    const sizes = utils.parseSizesInput(validBidRequest.sizes);
    sizes.forEach(size => {
      const request = buildRequest(validBidRequest, topWindowUrl, size, bidderRequest);
      requests.push(request);
    });
  });
  return requests;
}

function interpretResponse(serverResponse, request) {
  if (!serverResponse || !serverResponse.body) {
    return [];
  }
  const {creativeId, ad, price, exp} = serverResponse.body;
  if (!ad || !price) {
    return [];
  }
  const {bidId, width, height} = request.data;
  try {
    return [{
      requestId: bidId,
      cpm: price,
      width: width,
      height: height,
      creativeId: creativeId,
      currency: CURRENCY,
      netRevenue: true,
      ttl: exp || TTL_SECONDS,
      ad: ad
    }];
  } catch (e) {
    return [];
  }
}

function getUserSyncs(syncOptions, responses) {
  const {iframeEnabled, pixelEnabled} = syncOptions;

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
      const {body} = response;
      const cookies = body ? body.cookies || [] : [];
      cookies.forEach(cookie => {
        switch (cookie.type) {
          case INTERNAL_SYNC_TYPE.IFRAME:
            break;
          case INTERNAL_SYNC_TYPE.IMAGE:
            if (pixelEnabled && !lookup[cookie.src]) {
              syncs.push({
                type: EXTERNAL_SYNC_TYPE.IMAGE,
                url: cookie.src
              });
            }
            break;
        }
      });
    });
    return syncs;
  }

  return [];
}

export const spec = {
  code: BIDDER_CODE,
  supportedMediaTypes: [BANNER],
  isBidRequestValid,
  buildRequests,
  interpretResponse,
  getUserSyncs
};

registerBidder(spec);
