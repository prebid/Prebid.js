import { ortbConverter } from '../libraries/ortbConverter/converter.js';
import { registerBidder } from '../src/adapters/bidderFactory.js';
import { BANNER } from '../src/mediaTypes.js';
import { getStorageManager } from '../src/storageManager.js';
import { getBidFloor, buildOrtbRequest, ortbConverterRequest, ortbConverterImp, buildBidObjectBase, commonOnBidWonHandler } from '../../libraries/blueUtils/bidderutils.js';
import {
  replaceAuctionPrice,
  isFn,
  isPlainObject,
  deepSetValue,
  isEmpty,
  // triggerPixel, // No longer directly used here
} from '../src/utils.js';
const BIDDER_CODE = 'bms';
const ENDPOINT_URL =
  'https://api.prebid.int.us-east-1.bluems.com/v1/bid?exchangeId=prebid';
const GVLID = 1105;
const DEFAULT_CURRENCY = 'USD';
const DEFAULT_BID_TTL = 1200;

export const storage = getStorageManager({ bidderCode: BIDDER_CODE });

const converter = ortbConverter({
  context: {
    netRevenue: true, // Default net revenue configuration
    ttl: 100, // Default time-to-live for bid responses
    mediaTypes: {
      banner: BANNER,
      defaultCurrency: DEFAULT_CURRENCY
    }
  },
  imp: ortbConverterImp,
  request: ortbConverterRequest,
});

export const spec = {
  code: BIDDER_CODE,
  gvlid: GVLID,
  supportedMediaTypes: [BANNER],

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

    const ortbRequest = buildOrtbRequest(validBidRequests, bidderRequest, context, GVLID, converter);

    return [
      {
        method: 'POST',
        url: ENDPOINT_URL,
        data: JSON.stringify(ortbRequest),
        options: {
          contentType: 'text/plain',
          withCredentials: true,
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
        const bmsSpecific = {
          creativeId: bid.ext.bms.adId,
          ttl: typeof bid.exp === 'number' ? bid.exp : DEFAULT_BID_TTL,
          nurl: bid.nurl || null,
          burl: bid.burl || null,
          meta: {
            advertiserDomains: bid.adomain || [],
            networkId: bid.ext?.networkId || GVLID,
            networkName: bid.ext?.networkName || 'BMS',
          }
        };
        bids.push({ ...baseBid, ...bmsSpecific });
      });
    });
    return bids;
  },

  onBidWon: function (bid) {
    commonOnBidWonHandler(bid);
  },
};

registerBidder(spec);
