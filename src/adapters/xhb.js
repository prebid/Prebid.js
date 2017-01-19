import {getBidRequest} from '../utils.js';

const CONSTANTS = require('../constants.json');
const utils = require('../utils.js');
const adloader = require('../adloader.js');
const bidmanager = require('../bidmanager.js');
const bidfactory = require('../bidfactory.js');

const XhbAdapter = function XhbAdapter() {

  function buildJPTCall(bid, callbackId) {
    //determine tag params
    const placementId = utils.getBidIdParameter('placementId', bid.params);
    const inventoryCode = utils.getBidIdParameter('invCode', bid.params);
    let referrer = utils.getBidIdParameter('referrer', bid.params);
    const altReferrer = utils.getBidIdParameter('alt_referrer', bid.params);

    //Always use https
    let jptCall = 'https://ib.adnxs.com/jpt?';

    jptCall = utils.tryAppendQueryString(jptCall, 'callback', '$$PREBID_GLOBAL$$.handleXhbCB');
    jptCall = utils.tryAppendQueryString(jptCall, 'callback_uid', callbackId);
    jptCall = utils.tryAppendQueryString(jptCall, 'id', placementId);
    jptCall = utils.tryAppendQueryString(jptCall, 'code', inventoryCode);

    //sizes takes a bit more logic
    let sizeQueryString = '';
    let parsedSizes = utils.parseSizesInput(bid.sizes);

    //combine string into proper querystring for impbus
    let parsedSizesLength = parsedSizes.length;
    if (parsedSizesLength > 0) {
      //first value should be "size"
      sizeQueryString = 'size=' + parsedSizes[0];
      if (parsedSizesLength > 1) {
        //any subsequent values should be "promo_sizes"
        sizeQueryString += '&promo_sizes=';
        for (let j = 1; j < parsedSizesLength; j++) {
          sizeQueryString += parsedSizes[j] += ',';
        }
        //remove trailing comma
        if (sizeQueryString && sizeQueryString.charAt(sizeQueryString.length - 1) === ',') {
          sizeQueryString = sizeQueryString.slice(0, sizeQueryString.length - 1);
        }
      }
    }

    if (sizeQueryString) {
      jptCall += sizeQueryString + '&';
    }

    //append custom attributes:
    let paramsCopy = utils.extend({}, bid.params);

    //delete attributes already used
    delete paramsCopy.placementId;
    delete paramsCopy.invCode;
    delete paramsCopy.query;
    delete paramsCopy.referrer;
    delete paramsCopy.alt_referrer;

    //get the reminder
    let queryParams = utils.parseQueryStringParameters(paramsCopy);

    //append
    if (queryParams) {
      jptCall += queryParams;
    }

    //append referrer
    if (referrer === '') {
      referrer = utils.getTopWindowUrl();
    }

    jptCall = utils.tryAppendQueryString(jptCall, 'referrer', referrer);
    jptCall = utils.tryAppendQueryString(jptCall, 'alt_referrer', altReferrer);

    //remove the trailing "&"
    if (jptCall.lastIndexOf('&') === jptCall.length - 1) {
      jptCall = jptCall.substring(0, jptCall.length - 1);
    }

    return jptCall;
  }

  //expose the callback to the global object:
  $$PREBID_GLOBAL$$.handleXhbCB = function (jptResponseObj) {
      let bidCode;

      if (jptResponseObj && jptResponseObj.callback_uid) {

        let responseCPM;
        let id = jptResponseObj.callback_uid;
        let placementCode = '';
        let bidObj = getBidRequest(id);
        if (bidObj) {
          bidCode = bidObj.bidder;
          placementCode = bidObj.placementCode;
          //set the status
          bidObj.status = CONSTANTS.STATUS.GOOD;
        }

        let bid = [];
        if (jptResponseObj.result && jptResponseObj.result.ad && jptResponseObj.result.ad !== '') {
          responseCPM = 0.00;

          //store bid response
          //bid status is good (indicating 1)
          let adId = jptResponseObj.result.creative_id;
          bid = bidfactory.createBid(CONSTANTS.STATUS.GOOD, bidObj);
          bid.creative_id = adId;
          bid.bidderCode = bidCode;
          bid.cpm = responseCPM;
          bid.adUrl = jptResponseObj.result.ad;
          bid.width = jptResponseObj.result.width;
          bid.height = jptResponseObj.result.height;
          bid.dealId = '99999999';

          bidmanager.addBidResponse(placementCode, bid);

        } else {
          //no response data
          //indicate that there is no bid for this placement
          bid = bidfactory.createBid(2);
          bid.bidderCode = bidCode;
          bidmanager.addBidResponse(placementCode, bid);
        }
      }
    };

  function _callBids(params) {
    let bids = params.bids || [];
    for (let i = 0; i < bids.length; i++) {
      let bid = bids[i];
      let callbackId = bid.bidId;
      adloader.loadScript(buildJPTCall(bid, callbackId));
    }
  }

  // Export the callBids function, so that prebid.js can execute
  // this function when the page asks to send out bid requests.
  return {
      callBids: _callBids
    };
};

module.exports = XhbAdapter;
