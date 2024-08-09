import { registerBidder } from '../src/adapters/bidderFactory.js';
import {
  logInfo,
  logError,
  getBidIdParameter,
  _each,
  getValue,
  isFn,
  isPlainObject,
  isArray,
  isStr,
  isNumber,
} from '../src/utils.js';
import { BANNER } from '../src/mediaTypes.js';

const BIDDER_CODE = 'otm';
const OTM_BID_URL = 'https://ssp.otm-r.com/adjson';
const DEFAULT_CURRENCY = 'RUB'

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
    return Boolean(bid.params.tid);
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
    const tz = new Date().getTimezoneOffset()
    const referrer = bidderRequest && bidderRequest.refererInfo ? bidderRequest.refererInfo.referer : '';

    _each(validBidRequests, (bid) => {
      let topOrigin = ''
      try {
        if (isStr(referrer)) topOrigin = new URL(referrer).host
      } catch (e) { /* do nothing */ }
      const domain = isStr(bid.params.domain) ? bid.params.domain : topOrigin
      const cur = getValue(bid.params, 'currency') || DEFAULT_CURRENCY
      const bidid = getBidIdParameter('bidId', bid)
      const transactionid = getBidIdParameter('transactionId', bid)
      const auctionid = getBidIdParameter('auctionId', bid)
      const bidfloor = _getBidFloor(bid)

      _each(bid.sizes, size => {
        const hasSizes = isArray(size) && isNumber(size[0]) && isNumber(size[1])
        const width = hasSizes ? size[0] : 0;
        const height = hasSizes ? size[1] : 0;

        bidRequests.push({
          method: 'GET',
          url: OTM_BID_URL,
          data: {
            tz,
            w: width,
            h: height,
            domain,
            l: referrer,
            s: bid.params.tid,
            cur,
            bidid,
            transactionid,
            auctionid,
            bidfloor,
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
   * @returns {[]|*[]}
   */
  interpretResponse: function (serverResponse) {
    logInfo('serverResponse', serverResponse.body);

    const responsesBody = serverResponse ? serverResponse.body : {};
    const bidResponses = [];
    try {
      if (responsesBody.length === 0) {
        return [];
      }

      _each(responsesBody, (bid) => {
        if (bid.ad) {
          bidResponses.push({
            requestId: bid.bidid,
            cpm: bid.cpm,
            width: bid.w,
            height: bid.h,
            creativeId: bid.creativeid,
            currency: bid.currency || DEFAULT_CURRENCY,
            netRevenue: true,
            ad: bid.ad,
            ttl: bid.ttl,
            transactionId: bid.transactionid,
            meta: {
              advertiserDomains: bid.adDomain ? [bid.adDomain] : []
            }
          });
        }
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

  const floor = bid.getFloor({
    currency: DEFAULT_CURRENCY,
    mediaType: '*',
    size: '*'
  });
  if (isPlainObject(floor) && !isNaN(floor.floor) && floor.currency === DEFAULT_CURRENCY) {
    return floor.floor;
  }
  return 0;
}

registerBidder(spec);
