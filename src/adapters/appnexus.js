import { getBidRequest } from '../utils.js';

var CONSTANTS = require('../constants.json');
var utils = require('../utils.js');
var adloader = require('../adloader.js');
var bidmanager = require('../bidmanager.js');
var bidfactory = require('../bidfactory.js');
var Adapter = require('./adapter.js');

var AppNexusAdapter;
AppNexusAdapter = function AppNexusAdapter() {
  var baseAdapter = Adapter.createNew('appnexus');
  var usersync = false;

  baseAdapter.callBids = function (params) {
    //var bidCode = baseAdapter.getBidderCode();

    var anArr = params.bids;

    //var bidsCount = anArr.length;

    //set expected bids count for callback execution
    //bidmanager.setExpectedBidsCount(bidCode, bidsCount);

    for (var i = 0; i < anArr.length; i++) {
      var bidRequest = anArr[i];
      var callbackId = bidRequest.bidId;
      adloader.loadScript(buildJPTCall(bidRequest, callbackId));

      //store a reference to the bidRequest from the callback id
      //bidmanager.pbCallbackMap[callbackId] = bidRequest;
    }
  };

  function buildJPTCall(bid, callbackId) {

    //determine tag params
    var placementId = utils.getBidIdParameter('placementId', bid.params);

    //memberId will be deprecated, use member instead
    var memberId = utils.getBidIdParameter('memberId', bid.params);
    var member = utils.getBidIdParameter('member', bid.params);
    var inventoryCode = utils.getBidIdParameter('invCode', bid.params);
    var query = utils.getBidIdParameter('query', bid.params);
    var referrer = utils.getBidIdParameter('referrer', bid.params);
    var altReferrer = utils.getBidIdParameter('alt_referrer', bid.params);

    //build our base tag, based on if we are http or https

    var jptCall = 'http' + (document.location.protocol === 'https:' ? 's://secure.adnxs.com/jpt?' : '://ib.adnxs.com/jpt?');

    jptCall = utils.tryAppendQueryString(jptCall, 'callback', '$$PREBID_GLOBAL$$.handleAnCB');
    jptCall = utils.tryAppendQueryString(jptCall, 'callback_uid', callbackId);
    jptCall = utils.tryAppendQueryString(jptCall, 'psa', '0');
    jptCall = utils.tryAppendQueryString(jptCall, 'id', placementId);
    if (member) {
      jptCall = utils.tryAppendQueryString(jptCall, 'member', member);
    } else if (memberId) {
      jptCall = utils.tryAppendQueryString(jptCall, 'member', memberId);
      utils.logMessage('appnexus.callBids: "memberId" will be deprecated soon. Please use "member" instead');
    }

    jptCall = utils.tryAppendQueryString(jptCall, 'code', inventoryCode);

    //sizes takes a bit more logic
    var sizeQueryString = '';
    var parsedSizes = utils.parseSizesInput(bid.sizes);

    //combine string into proper querystring for impbus
    var parsedSizesLength = parsedSizes.length;
    if (parsedSizesLength > 0) {
      //first value should be "size"
      sizeQueryString = 'size=' + parsedSizes[0];
      if (parsedSizesLength > 1) {
        //any subsequent values should be "promo_sizes"
        sizeQueryString += '&promo_sizes=';
        for (var j = 1; j < parsedSizesLength; j++) {
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

    //this will be deprecated soon
    var targetingParams = utils.parseQueryStringParameters(query);

    if (targetingParams) {
      //don't append a & here, we have already done it in parseQueryStringParameters
      jptCall += targetingParams;
    }

    //append custom attributes:
    var paramsCopy = utils.extend({}, bid.params);

    //delete attributes already used
    delete paramsCopy.placementId;
    delete paramsCopy.memberId;
    delete paramsCopy.invCode;
    delete paramsCopy.query;
    delete paramsCopy.referrer;
    delete paramsCopy.alt_referrer;
    delete paramsCopy.member;

    //get the reminder
    var queryParams = utils.parseQueryStringParameters(paramsCopy);

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

    // @if NODE_ENV='debug'
    utils.logMessage('jpt request built: ' + jptCall);

    // @endif

    //append a timer here to track latency
    bid.startTime = new Date().getTime();

    return jptCall;

  }

  //expose the callback to the global object:
  $$PREBID_GLOBAL$$.handleAnCB = function (jptResponseObj) {

    var bidCode;

    if (jptResponseObj && jptResponseObj.callback_uid) {

      var responseCPM;
      var id = jptResponseObj.callback_uid;
      var placementCode = '';
      var bidObj = getBidRequest(id);
      if (bidObj) {

        bidCode = bidObj.bidder;

        placementCode = bidObj.placementCode;

        //set the status
        bidObj.status = CONSTANTS.STATUS.GOOD;
      }

      // @if NODE_ENV='debug'
      utils.logMessage('JSONP callback function called for ad ID: ' + id);

      // @endif
      var bid = [];
      if (jptResponseObj.result && jptResponseObj.result.cpm && jptResponseObj.result.cpm !== 0) {
        responseCPM = parseInt(jptResponseObj.result.cpm, 10);

        //CPM response from /jpt is dollar/cent multiplied by 10000
        //in order to avoid using floats
        //switch CPM to "dollar/cent"
        responseCPM = responseCPM / 10000;

        //store bid response
        //bid status is good (indicating 1)
        var adId = jptResponseObj.result.creative_id;
        bid = bidfactory.createBid(1, bidObj);
        bid.creative_id = adId;
        bid.bidderCode = bidCode;
        bid.cpm = responseCPM;
        bid.adUrl = jptResponseObj.result.ad;
        bid.width = jptResponseObj.result.width;
        bid.height = jptResponseObj.result.height;
        bid.dealId = jptResponseObj.result.deal_id;

        bidmanager.addBidResponse(placementCode, bid);

      } else {
        //no response data
        // @if NODE_ENV='debug'
        utils.logMessage('No prebid response from AppNexus for placement code ' + placementCode);

        // @endif
        //indicate that there is no bid for this placement
        bid = bidfactory.createBid(2, bidObj);
        bid.bidderCode = bidCode;
        bidmanager.addBidResponse(placementCode, bid);
      }

      if (!usersync) {
        var iframe = utils.createInvisibleIframe();
        iframe.src = '//acdn.adnxs.com/ib/static/usersync/v3/async_usersync.html';
        try {
          document.body.appendChild(iframe);
        } catch (error) {
          utils.logError(error);
        }
        usersync = true;
      }


    } else {
      //no response data
      // @if NODE_ENV='debug'
      utils.logMessage('No prebid response for placement %%PLACEMENT%%');

      // @endif

    }

  };

  return {
    callBids: baseAdapter.callBids,
    setBidderCode: baseAdapter.setBidderCode,
    createNew: AppNexusAdapter.createNew,
    buildJPTCall: buildJPTCall
  };
};

AppNexusAdapter.createNew = function () {
  return new AppNexusAdapter();
};

module.exports = AppNexusAdapter;
