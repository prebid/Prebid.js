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
   * Interpret the response if the array contains BIDDER elements, in the format: [ [bidder1 bid 1, bidder1 bid 2], [bidder2 bid 1, bidder2 bid 2] ]
   * @param serverResponse
   * @param request
   * @returns {*}
   */
  interpretResponse(serverResponse, request) {
    utils.logInfo('ozone interpretResponse version 2018-12-05 16:46');
    serverResponse = serverResponse.body || {};
    if (serverResponse.seatbid) {
      if (utils.isArray(serverResponse.seatbid)) {
        // serverResponse seems good, let's get the list of bids from the request object:
        let arrRequestBids = request.bidderRequest.bids;
        // build up a list of winners, one for each bidId in arrBidIds
        let arrWinners = [];
        for (let i = 0; i < arrRequestBids.length; i++) {
          let winner = ozoneGetWinnerForRequestBid(arrRequestBids[i], serverResponse.seatbid);
          if (winner !== null) {
            const {defaultWidth, defaultHeight} = defaultSize(arrRequestBids[i]);
            winner = ozoneAddStandardProperties(winner, defaultWidth, defaultHeight);
            arrWinners.push(winner);
          }
        }
        let winnersClean = arrWinners.filter(w => {
          return (w.bidId); // will be cast to boolean
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
  returnObject.defaultWidth = checkDeepArray(sizes)[0];
  returnObject.defaultHeight = checkDeepArray(sizes)[1];
  return returnObject;
}

/**
 * Do the messy searching for the best bid response in the serverResponse.seatbid array matching the requestBid.bidId
 * @param requestBid
 * @param serverResponseSeatBid
 * @returns {*} bid object
 */
export function ozoneGetWinnerForRequestBid(requestBid, serverResponseSeatBid) {
  let thisBidWinner = null;
  for (let j = 0; j < serverResponseSeatBid.length; j++) {
    let theseBids = serverResponseSeatBid[j].bid;
    let thisSeat = serverResponseSeatBid[j].seat;
    for (let k = 0; k < theseBids.length; k++) {
      if (theseBids[k].impid === requestBid.bidId) { // we've found a matching server response bid for this request bid
        if ((thisBidWinner == null) || (thisBidWinner.price < theseBids[k].price)) {
          thisBidWinner = theseBids[k];
          thisBidWinner.seat = thisSeat; // we need to add this here - it's the name of the winning bidder, not guaranteed to be available in the bid object.
        }
      }
    }
  }
  return thisBidWinner;
}

/**
 * We expect to be able to find a standard set of properties on winning bid objects; add them here.
 * @param seatBid
 * @returns {*}
 */
export function ozoneAddStandardProperties(seatBid, defaultWidth, defaultHeight) {
  seatBid.cpm = seatBid.price;
  seatBid.bidId = seatBid.impid;
  seatBid.requestId = seatBid.impid;
  seatBid.width = seatBid.w || defaultWidth;
  seatBid.height = seatBid.h || defaultHeight;
  seatBid.ad = seatBid.adm;
  seatBid.netRevenue = true;
  seatBid.creativeId = seatBid.crid;
  seatBid.currency = 'USD';
  seatBid.ttl = 60;
  return seatBid;
}

registerBidder(spec);
