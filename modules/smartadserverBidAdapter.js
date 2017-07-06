import { ajax } from 'src/ajax';
import bidfactory from 'src/bidfactory';
import bidmanager from 'src/bidmanager';
import { STATUS } from 'src/constants.json';
import * as utils from 'src/utils';
import adloader from 'src/adloader.js';
import adaptermanager from 'src/adaptermanager';

function smartadserverBidAdapter() {
  var generateCallbackId = function(placementCode) {
    var callbackId = "sas_" + utils.getUniqueIdentifierStr();
    $$PREBID_GLOBAL$$[callbackId] = function(adResponse) {
      var status = adResponse != null ? STATUS.GOOD : STATUS.NO_BID;
      utils.logMessage(`[SmartAdServer] bid status for placementCode ${placementCode} : ${status}`);
      var bidObject = bidfactory.createBid(status);
      bidObject.bidderCode = 'smartadserver';
      Object.assign(bidObject, adResponse);
      bidmanager.addBidResponse(placementCode, bidObject);
    };
    return callbackId;
  };

  var bidCallback = function(params, bidIndex, callbackId) {
    return function() { pbjs.sas.callBid(params, bidIndex, callbackId); };
  };

  return {
    callBids: function(params) {
      for (var i = 0; i < params.bids.length; i++) {
        var bid = params.bids[i];
        adloader.loadScript(`//ced.sascdn.com/tag/${bid.params.networkId || 0}/sas-prebid.js`, bidCallback(params, i, generateCallbackId(bid.placementCode)), true);
      }
    }
  };
};

adaptermanager.registerBidAdapter(new smartadserverBidAdapter, 'smartadserver');

module.exports = smartadserverBidAdapter;
