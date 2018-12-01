import * as utils from 'src/utils';
import { registerBidder } from 'src/adapters/bidderFactory';

const BIDDER_CODE = 'ozone';

const OZONEURI = 'https://elb.the-ozone-project.com/openrtb2/auction';
const OZONECOOKIESYNC = 'https://elb.the-ozone-project.com/static/load-cookie.html';

export const spec = {
  code: BIDDER_CODE,

  /**
   * Basic check to see whether required parameters are in the request.
   * @param bid
   * @returns {boolean}
   */
  isBidRequestValid(bid) {
    if (!(bid.params.hasOwnProperty('placementId'))) {
      utils.logInfo('OZONE BID ADAPTER VALIDATION FAILED : missing placementId : siteId, placementId and publisherId are REQUIRED');
      return false;
    }
    if (!(bid.params.placementId).toString().match(/^[0-9]{10}$/)) {
      utils.logInfo('OZONE BID ADAPTER VALIDATION FAILED : placementId must be exactly 10 numeric characters');
      return false;
    }
    if (!(bid.params.hasOwnProperty('publisherId'))) {
      utils.logInfo('OZONE BID ADAPTER VALIDATION FAILED : missing publisherId : siteId, placementId and publisherId are REQUIRED');
      return false;
    }
    if (!(bid.params.publisherId).toString().match(/^[a-zA-Z0-9\-]{12}$/)) {
      utils.logInfo('OZONE BID ADAPTER VALIDATION FAILED : publisherId must be exactly 12 alphanumieric characters including hyphens');
      return false;
    }
    if (!(bid.params.hasOwnProperty('siteId'))) {
      utils.logInfo('OZONE BID ADAPTER VALIDATION FAILED : missing siteId : siteId, placementId and publisherId are REQUIRED');
      return false;
    }
    if (!(bid.params.siteId).toString().match(/^[0-9]{10}$/)) {
      utils.logInfo('OZONE BID ADAPTER VALIDATION FAILED : siteId must be exactly 10 numeric characters');
      return false;
    }
    if (bid.params.hasOwnProperty('customData')) {
      if (typeof bid.params.customData !== 'object') {
        utils.logInfo('OZONE BID ADAPTER VALIDATION FAILED : customData is not an object');
        return false;
      }
    }
    if (bid.params.hasOwnProperty('customParams')) {
      utils.logInfo('OZONE BID ADAPTER VALIDATION FAILED : customParams should be renamed to customData');
      return false;
    }
    if (bid.params.hasOwnProperty('ozoneData')) {
      if (typeof bid.params.ozoneData !== 'object') {
        utils.logInfo('OZONE BID ADAPTER VALIDATION FAILED : ozoneData is not an object');
        return false;
      }
    }
    if (bid.params.hasOwnProperty('lotameData')) {
      if (typeof bid.params.lotameData !== 'object') {
        utils.logInfo('OZONE BID ADAPTER VALIDATION FAILED : lotameData is not an object');
        return false;
      }
    }
    return true;
  },
  /**
   * @param serverResponse
   * @param request
   * @returns {*}
   */
  interpretResponse(serverResponse, request) {
    serverResponse = serverResponse.body || {};
    if (serverResponse.seatbid) {
      if (utils.isArray(serverResponse.seatbid)) {
        const {seatbid: arrSeatbid} = serverResponse;
        let winnerAds = arrSeatbid.reduce((bid, ads) => {
          var _seat = ads.seat;
          let ad = ads.bid.reduce(function(currentWinningBid, considerBid) {
            if (currentWinningBid.price < considerBid.price) {
              const bid = matchRequest(considerBid.impid, request);
              const {width, height} = defaultSize(bid);
              considerBid.cpm = considerBid.price;
              considerBid.bidId = considerBid.impid;
              considerBid.requestId = considerBid.impid;
              considerBid.width = considerBid.w || width;
              considerBid.height = considerBid.h || height;
              considerBid.ad = considerBid.adm;
              considerBid.netRevenue = true;
              considerBid.creativeId = considerBid.crid;
              considerBid.currency = 'USD';
              considerBid.ttl = 60;
              considerBid.seat = _seat;

              return considerBid;
            } else {
              currentWinningBid.cpm = currentWinningBid.price;
              return currentWinningBid;
            }
          }, {price: 0});
          if (ad.adm) {
            bid.push(ad)
          }
          return bid;
        }, [])
        let winnersClean = winnerAds.filter(w => {
          if (w.bidId) {
            return true;
          }
          return false;
        });
        utils.logInfo(['going to return winnersClean:', winnersClean]);
        return winnersClean;
      } else {
        return [];
      }
    } else {
      return [];
    }
  },
  buildRequests(validBidRequests, bidderRequest) {
    let ozoneRequest = validBidRequests[0].params;
    ozoneRequest['id'] = utils.generateUUID();
    ozoneRequest['auctionId'] = bidderRequest['auctionId'];

    if (bidderRequest.hasOwnProperty('placementId')) {
      bidderRequest.placementId = (bidderRequest.placementId).toString();
    }
    if (bidderRequest.hasOwnProperty('siteId')) {
      bidderRequest.siteId = (bidderRequest.siteId).toString();
    }
    if (bidderRequest.hasOwnProperty('publisherId')) {
      bidderRequest.publisherId = (bidderRequest.publisherId).toString();
    }

    if (!ozoneRequest.test) {
      delete ozoneRequest.test;
    }
    if (bidderRequest.gdprConsent) {
      ozoneRequest.regs = {};
      ozoneRequest.regs.ext = {};
      ozoneRequest.regs.ext.gdpr = bidderRequest.gdprConsent.gdprApplies === true ? 1 : 0;
      if (ozoneRequest.regs.ext.gdpr) {
        ozoneRequest.regs.ext.consent = bidderRequest.gdprConsent.consentString;
      }
    }
    let tosendtags = validBidRequests.map(ozone => {
      var obj = {};
      obj.id = ozone.bidId;
      obj.tagid = String(ozone.params.ozoneid);
      obj.secure = window.location.protocol === 'https:' ? 1 : 0;
      obj.banner = {
        topframe: 1,
        w: ozone.sizes[0][0] || 0,
        h: ozone.sizes[0][1] || 0,
        format: ozone.sizes.map(s => {
          return {w: s[0], h: s[1]};
        })
      };
      if (ozone.params.hasOwnProperty('customData')) {
        obj.customData = ozone.params.customData;
      }
      if (ozone.params.hasOwnProperty('ozoneData')) {
        obj.ozoneData = ozone.params.ozoneData;
      }
      if (ozone.params.hasOwnProperty('lotameData')) {
        obj.lotameData = ozone.params.lotameData;
      }
      if (ozone.params.hasOwnProperty('publisherId')) {
        obj.publisherId = (ozone.params.publisherId).toString();
      }
      if (ozone.params.hasOwnProperty('siteId')) {
        obj.siteId = (ozone.params.siteId).toString();
      }
      obj.ext = {'prebid': {'storedrequest': {'id': (ozone.params.placementId).toString()}}};
      return obj;
    });
    ozoneRequest.imp = tosendtags;
    var ret = {
      method: 'POST',
      url: OZONEURI,
      data: JSON.stringify(ozoneRequest),
      bidderRequest: bidderRequest
    };
    utils.logInfo(['buildRequests going to return', ret]);
    return ret;
  },
  getUserSyncs(optionsType, serverResponse) {
    if (!serverResponse || serverResponse.length === 0) {
      return [];
    }
    if (optionsType.iframeEnabled) {
      return [{
        type: 'iframe',
        url: OZONECOOKIESYNC
      }];
    }
  }
}

/**
 * Function matchRequest(id: string, BidRequest: object)
 * @param id
 * @type string
 * @param bidRequest
 * @type Object
 * @returns Object
 *
 */
export function matchRequest(id, bidRequest) {
  const {bids} = bidRequest.bidderRequest;
  const [returnValue] = bids.filter(bid => bid.bidId === id);
  return returnValue;
}

export function checkDeepArray(Arr) {
  if (Array.isArray(Arr)) {
    if (Array.isArray(Arr[0])) {
      return Arr[0];
    } else {
      return Arr;
    }
  } else {
    return Arr;
  }
}
export function defaultSize(thebidObj) {
  const {sizes} = thebidObj;
  const returnObject = {};
  returnObject.width = checkDeepArray(sizes)[0];
  returnObject.height = checkDeepArray(sizes)[1];
  return returnObject;
}
registerBidder(spec);
