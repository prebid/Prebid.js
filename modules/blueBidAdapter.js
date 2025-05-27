import { ortbConverter } from '../libraries/ortbConverter/converter.js';
import { registerBidder } from '../src/adapters/bidderFactory.js';
import { BANNER } from '../src/mediaTypes.js';
import { getStorageManager } from '../src/storageManager.js';
import {
  getBidFloor,
  buildOrtbRequest,
  ortbConverterRequest,
  ortbConverterImp,
  buildBidObjectBase,
  commonOnBidWonHandler,
  commonIsBidRequestValid,
  createOrtbConverter,
  getPublisherIdFromBids
} from '../../libraries/blueUtils/bidderutils.js';
import {
  replaceAuctionPrice,
  isEmpty,
  // isFn, // No longer directly used here
  // isPlainObject, // No longer directly used here
  // deepSetValue, // No longer directly used here
  // triggerPixel, // No longer directly used here
} from '../src/utils.js';
const BIDDER_CODE = 'blue';
const ENDPOINT_URL = 'https://bidder-us-east-1.getblue.io/engine/?src=prebid';
const GVLID = 620;
const DEFAULT_CURRENCY = 'USD';

export const storage = getStorageManager({ bidderCode: BIDDER_CODE });

const converter = createOrtbConverter(ortbConverter, BANNER, DEFAULT_CURRENCY, ortbConverterImp, ortbConverterRequest);

export const spec = {
  code: BIDDER_CODE,
  gvlid: GVLID,
  supportedMediaTypes: [BANNER],

  // Validate bid request
  isBidRequestValid: commonIsBidRequestValid,

  // Build OpenRTB requests using `ortbConverter`
  buildRequests: function (validBidRequests, bidderRequest) {
    const context = {
      publisherId: getPublisherIdFromBids(validBidRequests),
    };

    const ortbRequest = buildOrtbRequest(validBidRequests, bidderRequest, context, GVLID, converter);

    return [
      {
        method: 'POST',
        url: ENDPOINT_URL,
        data: ortbRequest,
        options: {
          contentType: 'application/json',
        },
      },
    ];
  },

  interpretResponse: (serverResponse) => {
    if (!serverResponse || isEmpty(serverResponse.body)) return [];

    let bids = [];
    serverResponse.body.seatbid.forEach((response) => {
      response.bid.forEach((bid) => {
        const baseBid = buildBidObjectBase(bid, serverResponse.body, BIDDER_CODE, DEFAULT_CURRENCY);
        const blueSpecific = { creativeId: bid.ext.blue.adId, creative_id: bid.ext.blue.adId, ttl: 1200 };
        bids.push({ ...baseBid, ...blueSpecific });
      });
    });
    return bids;
  },

  onBidWon: function (bid) {
    // replaceAuctionPrice is available in this scope due to the import above
    commonOnBidWonHandler(bid, (url, bidData) => replaceAuctionPrice(url, bidData.originalCpm || bidData.cpm));
  },
};

registerBidder(spec);
