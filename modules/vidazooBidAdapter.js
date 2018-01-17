import * as utils from 'src/utils';
import {registerBidder} from 'src/adapters/bidderFactory';
import {BANNER} from 'src/mediaTypes';

const BIDDER_CODE = 'vidazoo';
const CURRENCY = 'USD';
const TTL_SECONDS = 60 * 5;
export const URL = '//prebid.cliipa.com';
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

function buildRequest(bid, topWindowUrl, size) {
  const {params, bidId} = bid;
  const {bidFloor, cId, pId} = params;
  // Prebid's util function returns AppNexus style sizes (i.e. 300x250)
  const [width, height] = size.split('x');

  return {
    method: 'GET',
    url: `${URL}/prebid/${cId}`,
    data: {
      url: topWindowUrl,
      cb: Date.now(),
      bidFloor: bidFloor,
      bidId: bidId,
      publisherId: pId,
      width,
      height
    }
  }
}

function buildRequests(validBidRequests) {
  const topWindowUrl = utils.getTopWindowUrl();
  const requests = [];
  validBidRequests.forEach(validBidRequest => {
    const sizes = utils.parseSizesInput(validBidRequest.sizes);
    sizes.forEach(size => {
      const request = buildRequest(validBidRequest, topWindowUrl, size);
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
  const lookup = {};
  const syncs = [];
  responses.forEach(response => {
    const {body} = response;
    const cookies = body ? body.cookies || [] : [];
    cookies.forEach(cookie => {
      switch (cookie.type) {
        case INTERNAL_SYNC_TYPE.IFRAME:
          if (iframeEnabled && !lookup[cookie.src]) {
            syncs.push({
              type: EXTERNAL_SYNC_TYPE.IFRAME,
              url: cookie.src
            });
          }
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

export const spec = {
  code: BIDDER_CODE,
  supportedMediaTypes: [BANNER],
  isBidRequestValid,
  buildRequests,
  interpretResponse,
  getUserSyncs
};

registerBidder(spec);
