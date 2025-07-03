import { ortbConverter } from '../libraries/ortbConverter/converter.js';
import { registerBidder } from '../src/adapters/bidderFactory.js';
import { BANNER } from '../src/mediaTypes.js';
import { getStorageManager } from '../src/storageManager.js';
import {
  buildOrtbRequest,
  ortbConverterRequest,
  ortbConverterImp,
  buildBidObjectBase,
  commonOnBidWonHandler,
  commonIsBidRequestValid,
  createOrtbConverter,
  getPublisherIdFromBids,
  packageOrtbRequest
} from '../libraries/blueUtils/bidderUtils.js';
import {
  replaceAuctionPrice,
  isEmpty
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
    const ortbRequestData = buildOrtbRequest(validBidRequests, bidderRequest, context, GVLID, converter);

    const blueDataProcessor = (data) => data;
    const blueOptions = { contentType: 'application/json' };

    return packageOrtbRequest(ortbRequestData, ENDPOINT_URL, blueDataProcessor, blueOptions);
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
    // replaceAuctionPrice is available in this scope due to the import from ../src/utils.js
    commonOnBidWonHandler(bid, (url, bidData) => replaceAuctionPrice(url, bidData.originalCpm || bidData.cpm));
  },
};

registerBidder(spec);
