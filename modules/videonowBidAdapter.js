import {registerBidder} from '../src/adapters/bidderFactory.js';
import {BANNER} from '../src/mediaTypes.js';
import {_each, getBidIdParameter, getValue, logError, logInfo} from '../src/utils.js';

const BIDDER_CODE = 'videonow';
const RTB_URL = 'https://adx.videonow.ru/yhb'
const DEFAULT_CURRENCY = 'RUB'
const DEFAULT_CODE_TYPE = 'combo'
const TTL_SECONDS = 60 * 5

export const spec = {

  code: BIDDER_CODE,
  url: RTB_URL,
  supportedMediaTypes: [ BANNER ],

  /**
   * Determines whether or not the given bid request is valid.
   *
   * @param {BidRequest} bidRequest The bid params to validate.
   * @return boolean True if this is a valid bid, and false otherwise.
   */
  isBidRequestValid: function (bidRequest) {
    if (!bidRequest.params) {
      return false;
    }

    if (!bidRequest.params.pId) {
      logError('failed validation: pId not declared');
      return false
    }

    return true
  },

  /**
   * Make a server request from the list of BidRequests.
   *
   * @param {validBidRequests[]} validBidRequests - an array of bids
   * @param bidderRequest
   * @return ServerRequest Info describing the request to the server.
   */
  buildRequests: function (validBidRequests, bidderRequest) {
    logInfo('validBidRequests', validBidRequests);

    const bidRequests = [];

    _each(validBidRequests, (bid) => {
      const bidId = getBidIdParameter('bidId', bid)
      const placementId = getValue(bid.params, 'pId')
      const currency = getValue(bid.params, 'currency') || DEFAULT_CURRENCY
      const url = getValue(bid.params, 'url') || RTB_URL
      const codeType = getValue(bid.params, 'codeType') || DEFAULT_CODE_TYPE
      const sizes = getValue(bid, 'sizes')

      bidRequests.push({
        method: 'POST',
        url,
        data: {
          places: [
            {
              id: bidId,
              placementId,
              codeType,
              sizes
            }
          ],
          settings: {
            currency,
          }
        },
      })
    })

    return bidRequests;
  },

  /**
   * Unpack the response from the server into a list of bids.
   *
   * @param {ServerResponse} serverResponse A successful response from the server.
   * @param {BidRequest} bidRequest The bid params
   * @return {Bid[]} An array of bids which were nested inside the server.
   */
  interpretResponse: function (serverResponse, bidRequest) {
    logInfo('serverResponse', serverResponse.body);

    const responsesBody = serverResponse ? serverResponse.body : {};
    const bidResponses = [];
    try {
      if (!responsesBody?.bids?.length) {
        return [];
      }

      _each(responsesBody.bids, (bid) => {
        if (bid?.displayCode) {
          const bidResponse = {
            requestId: bid.id,
            cpm: bid.cpm,
            currency: bid.currency,
            width: bid.size.width,
            height: bid.size.height,
            ad: bid.displayCode,
            ttl: TTL_SECONDS,
            creativeId: bid.id,
            netRevenue: true,
            meta: {
              advertiserDomains: bid.adDomain ? [bid.adDomain] : []
            }
          };
          bidResponses.push(bidResponse)
        }
      })
    } catch (error) {
      logError(error);
    }

    return bidResponses
  },
}

registerBidder(spec);
