import { registerBidder } from '../src/adapters/bidderFactory.js';
import {logInfo, logError, getBidIdParameter, _each, getValue, isFn, isPlainObject} from '../src/utils.js';
import { BANNER } from '../src/mediaTypes.js';

const BIDDER_CODE = 'otm';
const OTM_BID_URL = 'https://ssp.otm-r.com/adjson';
const DEF_CUR = 'RUB'

export const spec = {

  code: BIDDER_CODE,
  url: OTM_BID_URL,
  supportedMediaTypes: [ BANNER ],

  /**
   * Determines whether or not the given bid request is valid.
   *
   * @param {object} bid The bid to validate.
   * @return boolean True if this is a valid bid, and false otherwise.
   */
  isBidRequestValid: function (bid) {
    return !!bid.params.tid;
  },

  /**
   * Build bidder requests.
   *
   * @param validBidRequests
   * @param bidderRequest
   * @returns {[]}
   */
  buildRequests: function (validBidRequests, bidderRequest) {
    logInfo('validBidRequests', validBidRequests);

    const bidRequests = [];
    let tz = new Date().getTimezoneOffset()
    let referrer = '';
    if (bidderRequest && bidderRequest.refererInfo) {
      referrer = bidderRequest.refererInfo.referer;
    }

    _each(validBidRequests, (bid) => {
      let domain = getValue(bid.params, 'domain') || ''
      let tid = getValue(bid.params, 'tid')
      let cur = getValue(bid.params, 'currency') || DEF_CUR
      let bidid = getBidIdParameter('bidId', bid)
      let transactionid = getBidIdParameter('transactionId', bid)
      let auctionid = getBidIdParameter('auctionId', bid)
      let bidfloor = _getBidFloor(bid)

      _each(bid.sizes, size => {
        let width = 0;
        let height = 0;
        if (size.length && typeof size[0] === 'number' && typeof size[1] === 'number') {
          width = size[0];
          height = size[1];
        }
        bidRequests.push({
          method: 'GET',
          url: OTM_BID_URL,
          data: {
            tz: tz,
            w: width,
            h: height,
            domain: domain,
            l: referrer,
            s: tid,
            cur: cur,
            bidid: bidid,
            transactionid: transactionid,
            auctionid: auctionid,
            bidfloor: bidfloor,
          },
        })
      })
    })
    return bidRequests;
  },

  /**
   * Generate response.
   *
   * @param serverResponse
   * @param request
   * @returns {[]|*[]}
   */
  interpretResponse: function (serverResponse, request) {
    logInfo('serverResponse', serverResponse.body);

    const responseBody = serverResponse ? serverResponse.body : {};
    const bidResponses = [];
    try {
      if (responseBody.length === 0) {
        return [];
      }

      _each(serverResponse.body, (responseBody) => {
        if (!responseBody.ad) {
          return null
        }

        bidResponses.push({
          requestId: responseBody.bidid,
          cpm: responseBody.cpm,
          width: responseBody.w,
          height: responseBody.h,
          creativeId: responseBody.creativeid,
          currency: responseBody.currency || 'RUB',
          netRevenue: true,
          ad: responseBody.ad,
          ttl: responseBody.ttl,
          transactionId: responseBody.transactionid,
          meta: {
            advertiserDomains: responseBody.adDomain ? [responseBody.adDomain] : []
          }
        });
      });
    } catch (error) {
      logError(error);
    }

    return bidResponses;
  }
};

/**
 * Get floor value
 * @param bid
 * @returns {null|*}
 * @private
 */
function _getBidFloor(bid) {
  if (!isFn(bid.getFloor)) {
    return bid.params.bidfloor ? bid.params.bidfloor : 0;
  }

  let floor = bid.getFloor({
    currency: DEF_CUR,
    mediaType: '*',
    size: '*'
  });
  if (isPlainObject(floor) && !isNaN(floor.floor) && floor.currency === DEF_CUR) {
    return floor.floor;
  }
  return 0;
}

registerBidder(spec);
