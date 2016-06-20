import { getBidRequest } from '../utils.js';
var CONSTANTS = require('../constants.json');
var utils = require('../utils.js');
var bidfactory = require('../bidfactory.js');
var bidmanager = require('../bidmanager.js');

var SekindoAdapter;
SekindoAdapter = function SekindoAdapter() {

  function _callBids(params) {
    var bids = params.bids;
    var bidsCount = bids.length;

    var pubUrl = null;
    if (parent !== window)
      pubUrl = document.referrer;
    else
      pubUrl = window.location.href;

    for (var i = 0; i < bidsCount; i++) {
      var bidReqeust = bids[i];
      var callbackId = bidReqeust.bidId;
      _requestBids(bidReqeust, callbackId, pubUrl);
      //store a reference to the bidRequest from the callback id
      //bidmanager.pbCallbackMap[callbackId] = bidReqeust;
    }
  }

  pbjs.sekindoCB = function(callbackId, response) {
    var bidObj = getBidRequest(callbackId);
    if (typeof (response) !== 'undefined' && typeof (response.cpm) !== 'undefined') {
      var bid = [];
      if (bidObj) {
        var bidCode = bidObj.bidder;
        var placementCode = bidObj.placementCode;

        if (response.cpm !== undefined && response.cpm > 0) {

          bid = bidfactory.createBid(CONSTANTS.STATUS.GOOD);
          bid.adId = response.adId;
          bid.callback_uid = callbackId;
          bid.bidderCode = bidCode;
          bid.creative_id = response.adId;
          bid.cpm = parseFloat(response.cpm);
          bid.ad = response.ad;
          bid.width = response.width;
          bid.height = response.height;

          bidmanager.addBidResponse(placementCode, bid);
        }

        else {
          bid = bidfactory.createBid(CONSTANTS.STATUS.NO_BID);
          bid.callback_uid = callbackId;
          bid.bidderCode = bidCode;
          bidmanager.addBidResponse(placementCode, bid);
        }
      }
    }

    else {
      if (bidObj) {
        utils.logMessage('No prebid response for placement '+bidObj.placementCode);
      }

      else {
        utils.logMessage('sekindo callback general error');
      }
    }
  };

  function _requestBids(bid, callbackId, pubUrl) {
    //determine tag params
    var spaceId = utils.getBidIdParamater('spaceId', bid.params);
    var bidfloor = utils.getBidIdParamater('bidfloor', bid.params);
    var protocol = ('https:' === document.location.protocol ? 's' : '');
    var scriptSrc = 'https://live.sekindo.com/live/liveView.php?';

    scriptSrc = utils.tryAppendQueryString(scriptSrc, 's', spaceId);
    scriptSrc = utils.tryAppendQueryString(scriptSrc, 'pubUrl', pubUrl);
    scriptSrc = utils.tryAppendQueryString(scriptSrc, 'hbcb', callbackId);
    scriptSrc = utils.tryAppendQueryString(scriptSrc, 'dcpmflr', bidfloor);
    scriptSrc = utils.tryAppendQueryString(scriptSrc, 'hbto', pbjs.bidderTimeout);
    scriptSrc = utils.tryAppendQueryString(scriptSrc, 'protocol', protocol);

    var html = '<scr'+'ipt type="text/javascript" src="'+scriptSrc+'"></scr'+'ipt>';

    var iframe = utils.createInvisibleIframe();
    iframe.id = 'skIfr_'+callbackId;

    var elToAppend = document.getElementsByTagName('head')[0];
    //insert the iframe into document
    elToAppend.insertBefore(iframe, elToAppend.firstChild);

    var iframeDoc = utils.getIframeDocument(iframe);
    iframeDoc.open();
    iframeDoc.write(html);
    iframeDoc.close();
  }

  return {
    callBids: _callBids
  };
};

module.exports = SekindoAdapter;

