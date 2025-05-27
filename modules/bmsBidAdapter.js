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
  isEmpty,
  // replaceAuctionPrice, // No longer directly used here
  // isFn, // No longer directly used here
  // isPlainObject, // No longer directly used here
  // deepSetValue, // No longer directly used here
  // triggerPixel, // No longer directly used here
} from '../src/utils.js';
const BIDDER_CODE = 'bms';
const ENDPOINT_URL =
  'https://api.prebid.int.us-east-1.bluems.com/v1/bid?exchangeId=prebid';
const GVLID = 1105;
const DEFAULT_CURRENCY = 'USD';
const DEFAULT_BID_TTL = 1200;

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
