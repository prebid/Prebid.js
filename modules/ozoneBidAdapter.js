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
    utils.logInfo('ozone interpretResponse', serverResponse, request);
    serverResponse = serverResponse.body || {};
    _ozoneInternal.serverResponseId = serverResponse.id; /* this is sent to the ads request as requestId */
    if (serverResponse.seatbid) {
      if (utils.isArray(serverResponse.seatbid)) {
        // check - does the auction ID match the one in the request?
        utils.logInfo('checking auction ID: ', _ozoneInternal.auctionId, request.bidderRequest.auctionId);
        // serverResponse seems good, let's get the list of bids from the request object:
        let arrRequestBids = request.bidderRequest.bids;
        // build up a list of winners, one for each bidId in arrBidIds
        let arrWinners = [];
        for (let i = 0; i < arrRequestBids.length; i++) {
          let thisBid = arrRequestBids[i];
          let {seat: winningSeat, bid: winningBid} = ozoneGetWinnerForRequestBid(thisBid, serverResponse.seatbid);
          utils.logInfo('adding all bids to _ozoneInternal for key: ', thisBid.bidId);
          _ozoneInternal.responses[thisBid.bidId] = ozoneGetAllBidsForBidId(thisBid.bidId, serverResponse.seatbid);
          _ozoneInternal.winners[thisBid.bidId] = {'seat': winningSeat, 'bid': winningBid};
          if (winningBid !== null) {
            const {defaultWidth, defaultHeight} = defaultSize(arrRequestBids[i]);
            winningBid = ozoneAddStandardProperties(winningBid, defaultWidth, defaultHeight);
            // utils.logInfo(['adding allBids to winningBid object for key: ', thisBid.bidId]);
            // winningBid['allBids'] = ozoneGetAllBidsForBidId(thisBid.bidId, serverResponse.seatbid);
            utils.logInfo('winner is', winningBid);
            arrWinners.push(winningBid);
            utils.logInfo('arrWinners is', arrWinners);
            utils.logInfo('_ozoneInternal is', _ozoneInternal);
          }
        }
        let winnersClean = arrWinners.filter(w => {
          return (w.bidId); // will be cast to boolean
        });
        utils.logInfo('going to return winnersClean:', winnersClean);
        return winnersClean;
      } else {
        return [];
      }
    } else {
      return [];
    }
  },
  buildRequests(validBidRequests, bidderRequest) {
    utils.logInfo('validBidRequests', validBidRequests, 'bidderRequest', bidderRequest);
    utils.logInfo('buildRequests setting auctionId', bidderRequest.auctionId);
    _ozoneInternal.auctionId = bidderRequest.auctionId;
    let htmlParams = validBidRequests[0].params; // the html page config params will be included in each element
    let ozoneRequest = {}; // we only want to set specific properties on this, not validBidRequests[0].params
    ozoneRequest['id'] = utils.generateUUID();
    ozoneRequest['auctionId'] = bidderRequest['auctionId'];

    delete ozoneRequest.test; // don't allow test to be set in the config - ONLY use $_GET['pbjs_debug']
    if (bidderRequest.gdprConsent) {
      ozoneRequest.regs = {};
      ozoneRequest.regs.ext = {};
      ozoneRequest.regs.ext.gdpr = bidderRequest.gdprConsent.gdprApplies === true ? 1 : 0;
      if (ozoneRequest.regs.ext.gdpr) {
        ozoneRequest.regs.ext.consent = bidderRequest.gdprConsent.consentString;
      }
    }
    let tosendtags = validBidRequests.map(ozoneBidRequest => {
      var obj = {};
      obj.id = ozoneBidRequest.bidId;
      obj.tagid = (ozoneBidRequest.params.placementId).toString();
      obj.secure = window.location.protocol === 'https:' ? 1 : 0;
      obj.banner = {
        topframe: 1,
        w: ozoneBidRequest.sizes[0][0] || 0,
        h: ozoneBidRequest.sizes[0][1] || 0,
        format: ozoneBidRequest.sizes.map(s => {
          return {w: s[0], h: s[1]};
        })
      };
      if (ozoneBidRequest.params.hasOwnProperty('placementId')) {
        obj.placementId = (ozoneBidRequest.params.placementId).toString();
      }
      if (ozoneBidRequest.params.hasOwnProperty('publisherId')) {
        obj.publisherId = (ozoneBidRequest.params.publisherId).toString();
      }
      if (ozoneBidRequest.params.hasOwnProperty('siteId')) {
        obj.siteId = (ozoneBidRequest.params.siteId).toString();
      }
      // build the imp['ext'] object
      obj.ext = {'prebid': {'storedrequest': {'id': (ozoneBidRequest.params.placementId).toString()}}, 'ozone':{}};
      if (ozoneBidRequest.params.hasOwnProperty('customData')) {
        obj.ext.ozone.customData = ozoneBidRequest.params.customData;
      }
      if (ozoneBidRequest.params.hasOwnProperty('ozoneData')) {
        obj.ext.ozone.ozoneData = ozoneBidRequest.params.ozoneData;
      }
      if (ozoneBidRequest.params.hasOwnProperty('lotameData')) {
        obj.ext.ozone.lotameData = ozoneBidRequest.params.lotameData;
      }
      return obj;
    });
    ozoneRequest.imp = tosendtags;
    ozoneRequest.source = {'tid': bidderRequest.auctionId};
    ozoneRequest.site = {'publisher': {'id': htmlParams.publisherId}, 'page': document.location.href};
    ozoneRequest.test = parseInt(getTestQuerystringValue()); // will be 1 or 0
    var ret = {
      method: 'POST',
      url: OZONEURI,
      data: JSON.stringify(ozoneRequest),
      bidderRequest: bidderRequest
    };
    utils.logInfo('buildRequests going to return', ret);
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
  let winningSeat = null;
  for (let j = 0; j < serverResponseSeatBid.length; j++) {
    let theseBids = serverResponseSeatBid[j].bid;
    let thisSeat = serverResponseSeatBid[j].seat;
    for (let k = 0; k < theseBids.length; k++) {
      if (theseBids[k].impid === requestBid.bidId) { // we've found a matching server response bid for this request bid
        if ((thisBidWinner == null) || (thisBidWinner.price < theseBids[k].price)) {
          thisBidWinner = theseBids[k];
          winningSeat = thisSeat;
          break;
        }
      }
    }
  }
  return {'seat': winningSeat, 'bid': thisBidWinner};
}

/**
 * Get a list of all the bids, for this bidId
 * @param matchBidId
 * @param serverResponseSeatBid
 * @returns {} = {ozone:{obj}, appnexus:{obj}, ... }
 */
export function ozoneGetAllBidsForBidId(matchBidId, serverResponseSeatBid) {
  utils.logInfo('ozoneGetAllBidsForBidId - starting, with: ', matchBidId, serverResponseSeatBid);
  let objBids = {};
  for (let j = 0; j < serverResponseSeatBid.length; j++) {
    let theseBids = serverResponseSeatBid[j].bid;
    let thisSeat = serverResponseSeatBid[j].seat;
    for (let k = 0; k < theseBids.length; k++) {
      if (theseBids[k].impid === matchBidId) { // we've found a matching server response bid for the request bid we're looking for
        utils.logInfo('ozoneGetAllBidsForBidId - found matching bid: ', matchBidId, theseBids[k]);
        objBids[thisSeat] = theseBids[k];
      }
    }
  }
  utils.logInfo('ozoneGetAllBidsForBidId - going to return: ', objBids);
  return objBids;
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

/**
 * we need to add test=1 or test=0 to the get params sent to the server.
 * Get the value set as pbjs_debug= in the url, OR 0.
 * @returns {*}
 */
export function getTestQuerystringValue() {
  let searchString = window.location.search.substring(1);
  let params = searchString.split('&');
  for (let i = 0; i < params.length; i++) {
    let val = params[i].split('=');
    if (val[0] === 'pbjs_debug') {
      return val[1] === 'true' ? 1 : 0;
    }
  }
  return 0;
}

// listeners:
// http://prebid.org/dev-docs/publisher-api-reference.html
// this is called immediately after the standard targeting has been set.
// We will now try to add custom targeting data - auction ID and all losing bidders.
// we will use this instead of having to use in the html page: pbjs.bidderSettings = { ozone: { ... } } - see http://prebid.org/dev-docs/publisher-api-reference.html
pbjs.onEvent('setTargeting', function(arrData) {
  utils.logInfo('In the setTargeting event handler. Adding custom k/v to the ad request. _ozoneInternal = ', _ozoneInternal);
  /*
  In order to add a custom key/value pair you fundamentally need to do one thing:
  Set new targeting for this key by calling setTargeting() on each window.googletag.pubads().getSlots() array.
  */
  // iterate over the slot objects, adding custom targeting parameters
  window.googletag.pubads().getSlots().forEach(function (slot) {
    let thisAdId = slot.getTargetingMap().hb_adid;
    let ozoneResponse = _ozoneInternal.responses[thisAdId]; /* The key is bidid - always found in responses & matches back to the request. */
  Object.keys(ozoneResponse).forEach(function(bidderName, index, ar2) {
       slot.setTargeting('oz_' + bidderName , bidderName);
       slot.setTargeting('oz_' + bidderName + '_pb', ozoneResponse[bidderName].price);
       slot.setTargeting('oz_' + bidderName + '_crid', ozoneResponse[bidderName].crid);
       slot.setTargeting('oz_' + bidderName + '_adv', ozoneResponse[bidderName].adomain);
       slot.setTargeting('oz_' + bidderName + '_imp_id', ozoneResponse[bidderName].impid);
     });
     let objWinner = _ozoneInternal.winners[thisAdId];
     slot.setTargeting('oz_auc_id', _ozoneInternal.auctionId); /* from request.auctionId */
     slot.setTargeting('oz_winner', objWinner.seat);
     slot.setTargeting('oz_winner_auc_id', objWinner.bid.id);
     slot.setTargeting('oz_winner_imp_id', objWinner.bid.impid);
     slot.setTargeting('oz_response_id', _ozoneInternal.serverResponseId);
  });
});

// declare a variable to hold data about the responses & auction ID which we will use in our setTargeting event handler
var _ozoneInternal = { 'responses': {}, 'winners': {}, 'auctionId': 'not_set', 'serverResponseId': 'not_set' }; // this will hold the response from ozone server call. We use this data to send non-winning bidders to the ad request

registerBidder(spec);
