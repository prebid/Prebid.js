// ADRIVER BID ADAPTER for Prebid 1.13
import { logInfo, getWindowLocation, getBidIdParameter, _each } from '../src/utils.js';
import { registerBidder } from '../src/adapters/bidderFactory.js';
import { getStorageManager } from '../src/storageManager.js';

const BIDDER_CODE = 'adriver';
const ADRIVER_BID_URL = 'https://pb.adriver.ru/cgi-bin/bid.cgi';
const TIME_TO_LIVE = 3000;

export const storage = getStorageManager({bidderCode: BIDDER_CODE});
export const spec = {
  code: BIDDER_CODE,

  /**
   * Determines whether or not the given bid request is valid.
   *
   * @param {object} bid The bid to validate.
   * @return boolean True if this is a valid bid, and false otherwise.
   */
  isBidRequestValid: function (bid) {
    return !!bid.params.siteid;
  },

  buildRequests: function (validBidRequests, bidderRequest) {
    let win = getWindowLocation();
    let customID = Math.round(Math.random() * 999999999) + '-' + Math.round(new Date() / 1000) + '-1-46-';
    let siteId = getBidIdParameter('siteid', validBidRequests[0].params) + '';
    let currency = getBidIdParameter('currency', validBidRequests[0].params);
    currency = 'RUB';

    let timeout = null;
    if (bidderRequest) {
      timeout = bidderRequest.timeout;
    }

    const payload = {
      'at': 1,
      'cur': [currency],
      'tmax': timeout,
      'site': {
        'name': win.origin,
        'domain': win.hostname,
        'id': siteId,
        'page': win.href
      },
      'id': customID,
      'user': {
        'buyerid': 0,
        'ext': {
          'eids': getUserIdAsEids(validBidRequests)
        }
      },
      'device': {
        'ip': '195.209.111.14',
        'ua': window.navigator.userAgent
      },
      'imp': []
    };

    _each(validBidRequests, (bid) => {
      _each(bid.sizes, (sizes) => {
        let width;
        let height;
        let par;

        let floorAndCurrency = _getFloor(bid, currency, sizes);

        let bidFloor = floorAndCurrency.floor;
        let dealId = getBidIdParameter('dealid', bid.params);
        if (typeof sizes[0] === 'number' && typeof sizes[1] === 'number') {
          width = sizes[0];
          height = sizes[1];
        }
        par = {
          'id': bid.params.placementId,
          'ext': {'query': 'bn=15&custom=111=' + bid.bidId},
          'banner': {
            'w': width || undefined,
            'h': height || undefined
          },
          'bidfloor': bidFloor || 0,
          'bidfloorcur': floorAndCurrency.currency,
          'secure': 0
        };
        if (dealId) {
          par.pmp = {
            'private_auction': 1,
            'deals': [{
              'id': dealId,
              'bidfloor': bidFloor || 0,
              'bidfloorcur': currency
            }]
          };
        }
        logInfo('par', par);
        payload.imp.push(par);
      });
    });

    let adrcidCookie = storage.getDataFromLocalStorage('adrcid') || validBidRequests[0].userId?.adrcid;
    if (adrcidCookie) {
      payload.user.buyerid = adrcidCookie;
    }
    const payloadString = JSON.stringify(payload);

    return {
      method: 'POST',
      url: ADRIVER_BID_URL,
      data: payloadString
    };
  },

  interpretResponse: function (serverResponse, bidRequest) {
    logInfo('serverResponse.body.seatbid', serverResponse.body.seatbid);
    const bidResponses = [];
    let nurl = 0;
    _each(serverResponse.body.seatbid, (seatbid) => {
      logInfo('_each', seatbid);
      var bid = seatbid.bid[0];
      if (bid.nurl !== undefined) {
        nurl = bid.nurl.split('://');
        nurl = window.location.protocol + '//' + nurl[1];
        nurl = nurl.replace(/\$\{AUCTION_PRICE\}/, bid.price);
      }

      if (bid.price >= 0 && bid.impid !== undefined && nurl !== 0 && bid.dealid === undefined) {
        let bidResponse = {
          requestId: bid.ext || undefined,
          cpm: bid.price,
          width: bid.w,
          height: bid.h,
          creativeId: bid.impid || undefined,
          currency: serverResponse.body.cur,
          netRevenue: true,
          ttl: TIME_TO_LIVE,
          meta: {
            advertiserDomains: bid.adomain
          },
          ad: '<IFRAME SRC="' + bid.nurl + '" FRAMEBORDER="0" SCROLLING="no" MARGINHEIGHT="0" MARGINWIDTH="0" TOPMARGIN="0" LEFTMARGIN="0" ALLOWTRANSPARENCY="true" STYLE ="WIDTH:' + bid.w + 'px; HEIGHT:' + bid.h + 'px"></IFRAME>'
        };
        logInfo('bidResponse', bidResponse);
        bidResponses.push(bidResponse);
      }
    });
    return bidResponses;
  }
};
registerBidder(spec);

/**
 * get first userId from validBidRequests
 * @param validBidRequests
 * @returns {Array|*} userIdAsEids
 */
function getUserIdAsEids(validBidRequests) {
  if (validBidRequests && validBidRequests.length > 0 && validBidRequests[0].userIdAsEids &&
    validBidRequests[0].userIdAsEids.length > 0) {
    return validBidRequests[0].userIdAsEids;
  } else {
    return [];
  }
}

/**
 * Gets bidfloor
 * @param {Object} bid
 * @param currencyPar
 * @param sizes
 * @returns {Object} floor
 */
function _getFloor(bid, currencyPar, sizes) {
  const curMediaType = bid.mediaTypes && bid.mediaTypes.video ? 'video' : 'banner';
  let floor = 0;
  const currency = currencyPar || 'RUB';

  let currencyResult = '';

  let isSize = false;

  if (typeof sizes[0] === 'number' && typeof sizes[1] === 'number') {
    isSize = true;
  }

  if (typeof bid.getFloor === 'function') {
    const floorInfo = bid.getFloor({
      currency: currency,
      mediaType: curMediaType,
      size: isSize ? sizes : '*'
    });

    if (typeof floorInfo === 'object' &&
      !isNaN(parseFloat(floorInfo.floor))) {
      floor = floorInfo.floor;
    }

    if (typeof floorInfo === 'object' && floorInfo.currency) {
      currencyResult = floorInfo.currency;
    }
  }

  if (!currencyResult) {
    currencyResult = currency;
  }

  if (floor == null) {
    floor = 0;
  }

  return {
    floor: floor,
    currency: currencyResult
  };
}
