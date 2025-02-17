import { ortbConverter } from '../libraries/ortbConverter/converter.js';
import { registerBidder } from '../src/adapters/bidderFactory.js';
import { BANNER } from '../src/mediaTypes.js';
import { getStorageManager } from '../src/storageManager.js';
import { deepSetValue, isFn, isPlainObject } from '../src/utils.js';

const BIDDER_CODE = 'blue';
const ENDPOINT_URL = 'https://bidder-us-east-1.getblue.io/engine/?src=prebid';
const GVLID = 620; // GVLID for your bidder
const COOKIE_NAME = 'ckid'; // Cookie name for identifying users
const CURRENCY = 'USD'; // Currency used in bid floors

export const storage = getStorageManager({ bidderCode: BIDDER_CODE });

const converter = ortbConverter({
  context: {
    netRevenue: true, // Default netRevenue setting
    ttl: 100, // Default time-to-live for bid responses
  },
  imp,
  request,
});

function request(buildRequest, imps, bidderRequest, context) {
  let request = buildRequest(imps, bidderRequest, context);
  deepSetValue(request, 'site.publisher.id', context.publisherId);
  return request;
}

function imp(buildImp, bidRequest, context) {
  const imp = buildImp(bidRequest, context);
  const floor = getBidFloor(bidRequest);
  if (floor) {
    imp.bidfloor = floor;
    imp.bidfloorcur = CURRENCY;
  }
  return imp;
}

function getBidFloor(bid) {
  if (isFn(bid.getFloor)) {
    let floor = bid.getFloor({
      currency: CURRENCY,
      mediaType: BANNER,
      size: '*',
    });
    if (
      isPlainObject(floor) &&
      !isNaN(floor.floor) &&
      floor.currency === CURRENCY
    ) {
      return floor.floor;
    }
  }
  return null;
}

export const spec = {
  code: BIDDER_CODE,
  gvlid: GVLID,
  supportedMediaTypes: [BANNER], // Supported ad types

  // Validate bid request
  isBidRequestValid: function (bid) {
    return !!bid.params.placementId && !!bid.params.publisherId;
  },

  // Build OpenRTB requests using `ortbConverter`
  buildRequests: function (validBidRequests, bidderRequest) {
    const context = {
      publisherId: validBidRequests.find(
        (bidRequest) => bidRequest.params?.publisherId
      )?.params.publisherId,
    };

    const ortbRequest = converter.toORTB({
      bidRequests: validBidRequests,
      bidderRequest,
      context,
    });

    // Add GVLID and cookie ID to the request
    ortbRequest.ext = ortbRequest.ext || {};
    deepSetValue(ortbRequest, 'ext.gvlid', GVLID);

    // Include user cookie if available
    const ckid = storage.getDataFromLocalStorage('blueID') || storage.getCookie(COOKIE_NAME) || null;
    if (ckid) {
      deepSetValue(ortbRequest, 'user.ext.buyerid', ckid);
    }

    return {
      method: 'POST',
      url: ENDPOINT_URL,
      data: JSON.stringify(ortbRequest),
      options: {
        contentType: 'text/plain',
      },
    };
  },

  // Interpret OpenRTB responses using `ortbConverter`
  interpretResponse: function (serverResponse, request) {
    const ortbResponse = serverResponse.body;

    // Parse the OpenRTB response into Prebid bid responses
    const prebidResponses = converter.fromORTB({
      response: ortbResponse,
      request: request.data,
    }).bids;

    // Example: Modify bid responses if needed
    prebidResponses.forEach((bid) => {
      bid.meta = bid.meta || {};
      bid.meta.adapterVersion = '1.0.0';
    });

    return prebidResponses;
  },
};

registerBidder(spec);
