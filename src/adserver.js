import { formatQS } from './utils.js';
import { targeting } from './targeting.js';

// Adserver parent class
const AdServer = function(attr) {
  this.name = attr.adserver;
  this.code = attr.code;
  this.getWinningBidByCode = function() {
    return targeting.getWinningBids(this.code)[0];
  };
};

// DFP ad server
export function dfpAdserver(options, urlComponents) {
  var adserver = new AdServer(options);
  adserver.urlComponents = urlComponents;

  var dfpReqParams = {
    'env': 'vp',
    'gdfp_req': '1',
    'impl': 's',
    'unviewed_position_start': '1'
  };

  var dfpParamsWithVariableValue = ['output', 'iu', 'sz', 'url', 'correlator', 'description_url', 'hl'];

  var getCustomParams = function(targeting) {
    return encodeURIComponent(formatQS(targeting));
  };

  adserver.appendQueryParams = function() {
    var bid = adserver.getWinningBidByCode();
    if (bid) {
      this.urlComponents.search.description_url = encodeURIComponent(bid.vastUrl);
      this.urlComponents.search.cust_params = getCustomParams(bid.adserverTargeting);
      this.urlComponents.search.correlator = Date.now();
    }
  };

  adserver.verifyAdserverTag = function() {
    for (var key in dfpReqParams) {
      if (!this.urlComponents.search.hasOwnProperty(key) || this.urlComponents.search[key] !== dfpReqParams[key]) {
        return false;
      }
    }
    for (var i in dfpParamsWithVariableValue) {
      if (!this.urlComponents.search.hasOwnProperty(dfpParamsWithVariableValue[i])) {
        return false;
      }
    }
    return true;
  };

  return adserver;
};
