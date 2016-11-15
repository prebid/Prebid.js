import {format, formatQS, parse} from './url';

//Adserver parent class
const AdServer = function(attr) {
  this.name = attr.adserver;
  this.code = attr.code;
  this.getWinningBidByCode = function() {
    var bidObject = $$PREBID_GLOBAL$$._bidsReceived.find(bid => bid.adUnitCode === this.code);
    return bidObject;
  };
};

//DFP ad server
exports.dfpAdserver = function (options, urlComponents) {
  var adserver = new AdServer(options);
  adserver.urlComponents = urlComponents;

  var dfpReqParams = {
    'env' : 'vp',
    'gdfp_req' : '1',
    'impl' : 's',
    'unviewed_position_start' : '1'
  };

  var dfpParamsWithVariableValue = ['output', 'iu', 'sz', 'url', 'correlator', 'description_url', 'hl'];

  var getCustomParams = function(targeting) {
    return encodeURIComponent(formatQS(targeting));
  };

  /**
   * Replace regional-specific url to match DFP origin url
   */
  const matchOriginUrl = function(url) {
    const parsedUrl = parse(url);

    parsedUrl.protocol = 'https';
    parsedUrl.host = 'ib.adnxs.com';

    const matchedUrl = format(parsedUrl);
    return encodeURIComponent(matchedUrl);
  };

  adserver.appendQueryParams = function() {
    var bid = adserver.getWinningBidByCode();
    this.urlComponents.search.description_url = matchOriginUrl(bid.vastUrl);
    this.urlComponents.search.cust_params = getCustomParams(bid.adserverTargeting);
    this.urlComponents.correlator = Date.now();
  };

  adserver.verifyAdserverTag = function() {
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

  return adserver;
};
