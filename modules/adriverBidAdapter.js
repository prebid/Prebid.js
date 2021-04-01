// ADRIVER BID ADAPTER for Prebid 1.13
import * as utils from '../src/utils.js';
import { registerBidder } from '../src/adapters/bidderFactory.js';

const BIDDER_CODE = 'adriver';
const ADRIVER_BID_URL = 'https://pb.adriver.ru/cgi-bin/bid.cgi';
const TIME_TO_LIVE = 3000;

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

  buildRequests: function (validBidRequests) {
    utils.logInfo('validBidRequests', validBidRequests);

    let win = utils.getWindowLocation();
    let customID = Math.round(Math.random() * 999999999) + '-' + Math.round(new Date() / 1000) + '-1-46-';
    let siteId = utils.getBidIdParameter('siteid', validBidRequests[0].params) + '';
    let currency = utils.getBidIdParameter('currency', validBidRequests[0].params);
    currency = currency ? currency + '' : 'RUB';

    const payload = {
      'at': 1,
      'cur': [currency],
      'site': {
        'name': win.origin,
        'domain': win.hostname,
        'id': siteId,
        'page': win.href
      },
      'id': customID,
      'user': {
        'buyerid': 0
      },
      'device': {
        'ip': '195.209.111.14',
        'ua': window.navigator.userAgent
      },
      'imp': []
    };

    utils._each(validBidRequests, (bid) => {
      utils._each(bid.sizes, (sizes) => {
        let width; let height; let par;
        let bidFloor = utils.getBidIdParameter('bidfloor', bid.params);
        let dealId = utils.getBidIdParameter('dealid', bid.params);
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
          'bidfloorcur': currency,
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
        utils.logInfo('par', par);
        payload.imp.push(par);
      });
    });

    const payloadString = JSON.stringify(payload);

    return {
      method: 'POST',
      url: ADRIVER_BID_URL,
      data: payloadString,
    };
  },

  interpretResponse: function (serverResponse, bidRequest) {
    utils.logInfo('serverResponse.body.seatbid', serverResponse.body.seatbid);
    const bidResponses = [];
    let nurl = 0;
    utils._each(serverResponse.body.seatbid, (seatbid) => {
      utils.logInfo('_each', seatbid);
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
          ad: '<IFRAME SRC="' + bid.nurl + '" FRAMEBORDER="0" SCROLLING="no" MARGINHEIGHT="0" MARGINWIDTH="0" TOPMARGIN="0" LEFTMARGIN="0" ALLOWTRANSPARENCY="true" STYLE ="WIDTH:' + bid.w + 'px; HEIGHT:' + bid.h + 'px"></IFRAME>'
        };
        utils.logInfo('bidResponse', bidResponse);
        bidResponses.push(bidResponse);
      }
    });
    return bidResponses;
  }

};
registerBidder(spec);
