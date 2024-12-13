import { ortbConverter } from '../libraries/ortbConverter/converter.js';
import { registerBidder } from '../src/adapters/bidderFactory.js';
import { BANNER } from '../src/mediaTypes.js';
import { getStorageManager } from '../src/storageManager.js';
import { deepSetValue } from '../src/utils.js';

const BIDDER_CODE = 'blue';
const ENDPOINT_URL = 'https://bidder-us-east-1.getblue.io/engine/?src=prebid';
const GVLID = 620; // GVLID for your bidder
const COOKIE_NAME = 'ckid'; // Cookie name for identifying users
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
  // eslint-disable-next-line no-console
  return request;
}

function imp(buildImp, bidRequest, context) {
  let imp = buildImp(bidRequest, context);
  imp.bidfloor = bidRequest.params.bidFloor;
  imp.bidfloorcur = bidRequest.params.currency;
  imp.tagid = bidRequest.params.placementId;
  return imp;
}

export const spec = {
  code: BIDDER_CODE,
  gvlid: GVLID,
  supportedMediaTypes: [BANNER], // Supported ad types

  // Validate bid request
  isBidRequestValid: function (bid) {
    return (
      !!bid.params.placementId &&
      !!bid.params.publisherId &&
      !!bid.params.bidFloor &&
      !!bid.params.currency
    );
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
    const ckid = storage.getCookie(COOKIE_NAME) || null;
    if (ckid) {
      deepSetValue(ortbRequest, 'user.ext.buyerid', ckid);
    }

    return {
      method: 'POST',
      url: ENDPOINT_URL,
      data: ortbRequest,
      options: {
        contentType: 'application/json',
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
