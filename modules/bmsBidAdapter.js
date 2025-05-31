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
  isEmpty
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
    const ortbRequestData = buildOrtbRequest(validBidRequests, bidderRequest, context, GVLID, converter);

    const bmsDataProcessor = (data) => JSON.stringify(data);
    const bmsOptions = { contentType: 'text/plain', withCredentials: true };

    return packageOrtbRequest(ortbRequestData, ENDPOINT_URL, bmsDataProcessor, bmsOptions);
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
