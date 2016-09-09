import {formatQS} from './url';

//Adserver parent class
var adserver = function(attr) {
  var that = {};
  that.name = attr.adserver;
  that.code = attr.code;
  that.getWinningBidByCode = function() {
    var bidObject = $$PREBID_GLOBAL$$._bidsReceived.find(bid => bid.adUnitCode === that.code);
    return bidObject;
  };
  return that;
};

//DFP ad server
exports.dfpAdserver = function (options, urlComponents) {
  var that = adserver(options);
  that.urlComponents = urlComponents;

  var dfpReqParams = {
    'env' : 'vp',
    'gdfp_req' : '1',
    'impl' : 's',
    'unviewed_position_start' : '1'
  };

  var dfpParamsWithVariableValue = ['output', 'iu', 'sz', 'url', 'correlator', 'description_url', 'hl'];

  var getCustomParams = function(targeting) {
    targeting.hb_pb = '10.00';
    return encodeURIComponent(formatQS(targeting));
  };

  that.appendQueryParams = function() {
    var bid = that.getWinningBidByCode();
    this.urlComponents.search.description_url = encodeURIComponent(bid.adUrl);
    this.urlComponents.search.cust_params = getCustomParams(bid.adserverTargeting);
    this.urlComponents.correlator = Date.now();
  };

  that.verifyAdserverTag = function() {
    for(var key in dfpReqParams) {
      if(!this.urlComponents.search.hasOwnProperty(key) || this.urlComponents.search[key] !== dfpReqParams[key]) {
        return false;
      }
    }

    for(var i in dfpParamsWithVariableValue) {
      if(!this.urlComponents.search.hasOwnProperty(dfpParamsWithVariableValue[i])) {
        return false;
      }
    }
    return true;
  };

  return that;
};
