const LIB_VERSION_GLOBAL = '3.0.4';

var CONSTANTS = require('src/constants');
var utils = require('src/utils');
var bidfactory = require('src/bidfactory');
var bidmanager = require('src/bidmanager');
var adloader = require('src/adloader');
var Adapter = require('src/adapter').default;
var adaptermanager = require('src/adaptermanager');

const IMPROVE_DIGITAL_BIDDER_CODE = 'improvedigital';

const ImproveDigitalAdapter = function () {
  let baseAdapter = new Adapter(IMPROVE_DIGITAL_BIDDER_CODE);
  baseAdapter.idClient = new ImproveDigitalAdServerJSClient('hb');

  let LIB_VERSION = LIB_VERSION_GLOBAL;

  // Ad server needs to implement JSONP using this function as the callback
  let CALLBACK_FUNCTION = '$$PREBID_GLOBAL$$' + '.improveDigitalResponse';

  baseAdapter.getNormalizedBidRequest = function(bid) {
    let adUnitId = utils.getBidIdParameter('placementCode', bid) || null;
    let placementId = utils.getBidIdParameter('placementId', bid.params) || null;
    let publisherId = null;
    let placementKey = null;

    if (placementId === null) {
      publisherId = utils.getBidIdParameter('publisherId', bid.params) || null;
      placementKey = utils.getBidIdParameter('placementKey', bid.params) || null;
    }
    let keyValues = utils.getBidIdParameter('keyValues', bid.params) || null;
    let localSize = utils.getBidIdParameter('size', bid.params) || null;
    let bidId = utils.getBidIdParameter('bidId', bid);

    let normalizedBidRequest = {};
    if (placementId) {
      normalizedBidRequest.placementId = placementId;
    } else {
      if (publisherId) {
        normalizedBidRequest.publisherId = publisherId;
      }
      if (placementKey) {
        normalizedBidRequest.placementKey = placementKey;
      }
    }

    if (keyValues) {
      normalizedBidRequest.keyValues = keyValues;
    }
    if (localSize && localSize.w && localSize.h) {
      normalizedBidRequest.size = {};
      normalizedBidRequest.size.h = localSize.h;
      normalizedBidRequest.size.w = localSize.w;
    }
    if (bidId) {
      normalizedBidRequest.id = bidId;
    }
    if (adUnitId) {
      normalizedBidRequest.adUnitId = adUnitId;
    }
    return normalizedBidRequest;
  }

  $$PREBID_GLOBAL$$.improveDigitalResponse = function(response) {
    let bidRequests = $$PREBID_GLOBAL$$._bidsRequested.find(bidSet => bidSet.bidderCode === IMPROVE_DIGITAL_BIDDER_CODE);
    if (bidRequests.bids && bidRequests.bids.length > 0) {
      for (var requestNumber = 0; requestNumber < bidRequests.bids.length; requestNumber++) {
        let bidRequest = bidRequests.bids[requestNumber];
        let bidObjects = response.bid || null;
        if (bidObjects === null || bidObjects.length <= 0) continue;

        for (var bidNumber = 0; bidNumber < bidObjects.length; bidNumber++) {
          let bidObject = bidObjects[bidNumber];

          if (bidObject.id === bidRequest.bidId) {
            let bid;
            if (!bidObject.price || bidObject.price === null) {
              bid = bidfactory.createBid(CONSTANTS.STATUS.NO_BID);
              bid.bidderCode = IMPROVE_DIGITAL_BIDDER_CODE;
              bidmanager.addBidResponse(bidRequest.placementCode, bid);
              continue;
            }
            if (bidObject.errorCode && bidObject.errorCode !== 0) {
              bid = bidfactory.createBid(CONSTANTS.STATUS.NO_BID);
              bid.bidderCode = IMPROVE_DIGITAL_BIDDER_CODE;
              bidmanager.addBidResponse(bidRequest.placementCode, bid);
              continue;
            }
            if (!bidObject.adm || bidObject.adm === null || typeof bidObject.adm !== 'string') {
              bid = bidfactory.createBid(CONSTANTS.STATUS.NO_BID);
              bid.bidderCode = IMPROVE_DIGITAL_BIDDER_CODE;
              bidmanager.addBidResponse(bidRequest.placementCode, bid);
              continue;
            }

            bid = bidfactory.createBid(CONSTANTS.STATUS.GOOD);

            let syncString = '';
            let syncArray = (bidObject.sync && bidObject.sync.length > 0) ? bidObject.sync : [];

            for (var syncCounter = 0; syncCounter < syncArray.length; syncCounter++) {
              syncString += (syncString === '') ? 'document.writeln(\"' : '';
              let syncInd = syncArray[syncCounter];
              syncInd = syncInd.replace(/\//g, '\\\/');
              syncString += '<img src=\\\"' + syncInd + '\\\"\/>';
            }
            syncString += (syncString === '') ? '' : '\")';

            let nurl = '';
            if (bidObject.nurl && bidObject.nurl.length > 0) {
              nurl = '<img src=\"' + bidObject.nurl + '\" width=\"0\" height=\"0\" style=\"display:none\">';
            }
            bid.ad = nurl + '<script>' + bidObject.adm + syncString + '</script>';
            bid.bidderCode = IMPROVE_DIGITAL_BIDDER_CODE;
            bid.cpm = parseFloat(bidObject.price);
            bid.width = bidObject.w;
            bid.height = bidObject.h;

            bidmanager.addBidResponse(bidRequest.placementCode, bid);
          }
        }
      }
    }
  };

  baseAdapter.callBids = function (params) {
    // params will contain an array
    let bidRequests = params.bids || [];
    let loc = utils.getTopWindowLocation();
    let requestParameters = {
      singleRequestMode: false,
      httpRequestType: this.idClient.CONSTANTS.HTTP_REQUEST_TYPE.GET,
      callback: CALLBACK_FUNCTION,
      secure: (loc.protocol === 'https:') ? 1 : 0,
      libVersion: this.LIB_VERSION
    };

    let normalizedBids = [];
    for (var bidCounter = 0; bidCounter < bidRequests.length; bidCounter++) {
      let normalizedBidRequest = this.getNormalizedBidRequest(bidRequests[bidCounter]);
      normalizedBids.push(normalizedBidRequest);
      if (bidRequests[bidCounter].params && bidRequests[bidCounter].params.singleRequest) {
        requestParameters.singleRequestMode = true;
      }
    }

    let request = this.idClient.createRequest(
      normalizedBids, // requestObject
      requestParameters
    );

    if (request.errors && request.errors.length > 0) {
      utils.logError('ID WARNING 0x01');
    }

    if (request && request.requests && request.requests[0]) {
      for (var requestCounter = 0; requestCounter < request.requests.length; requestCounter++) {
        if (request.requests[requestCounter].url) {
          adloader.loadScript(request.requests[requestCounter].url, null);
        }
      }
    }
  }

  // Export the callBids function, so that prebid.js can execute this function
  // when the page asks to send out bid requests.
  return Object.assign(this, {
    LIB_VERSION: LIB_VERSION,
    idClient: baseAdapter.idClient,
    getNormalizedBidRequest: baseAdapter.getNormalizedBidRequest,
    callBids: baseAdapter.callBids
  });
};

ImproveDigitalAdapter.createNew = function () {
  return new ImproveDigitalAdapter();
};

adaptermanager.registerBidAdapter(new ImproveDigitalAdapter(), IMPROVE_DIGITAL_BIDDER_CODE);

module.exports = ImproveDigitalAdapter;

function ImproveDigitalAdServerJSClient(endPoint) {
  this.isA = function (object, _t) {
    return Object.prototype.toString.call(object) === '[object ' + _t + ']';
  };

  this.isArray = function (object) {
    return this.isA(object, 'Array');
  };

  this.getRandomString = function(prefix) {
    var randomNumber = Math.floor((Math.random() * 1000000000) + 1);
    if (prefix) {
      return prefix + randomNumber;
    }
    return randomNumber.toString();
  };

  this.CONSTANTS = {
    HTTP_REQUEST_TYPE: {
      GET: 0,
      POST: 1
    },
    HTTP_SECURITY: {
      STANDARD: 0,
      SECURE: 1
    },
    AD_SERVER_BASE_URL: 'ad.360yield.com',
    END_POINT: endPoint || 'hb',
    AD_SERVER_URL_PARAM: '?jsonp=',
    CLIENT_VERSION: 'JS-3.0.1',
    MAX_URL_LENGTH: 2083,
    ERROR_CODES: {
      BAD_HTTP_REQUEST_TYPE_PARAM: 1,
      MISSING_PLACEMENT_PARAMS: 2,
      LIB_VERSION_MISSING: 3
    }
  };

  this.getErrorReturn = function(errorCode) {
    return {
      idMappings: {},
      requests: {},
      'errorCode': errorCode
    };
  };

  this.createGetRequest = function(requestObject, requestParameters, extraRequestParameters) {
    requestParameters.httpRequestType = this.CONSTANTS.HTTP_REQUEST_TYPE.GET;
    return this.createRequest(requestObject, requestParameters, extraRequestParameters);
  };

  this.createRequest = function(requestObject, requestParameters, extraRequestParameters) {
    if (requestParameters.httpRequestType !== this.CONSTANTS.HTTP_REQUEST_TYPE.GET) {
      return this.getErrorReturn(this.CONSTANTS.ERROR_CODES.BAD_HTTP_REQUEST_TYPE_PARAM);
    }
    if (!requestParameters.libVersion) {
      return this.getErrorReturn(this.CONSTANTS.ERROR_CODES.LIB_VERSION_MISSING);
    }

    var impressionObjects = [];
    var impressionObject;
    var counter;
    if (this.isArray(requestObject)) {
      for (counter = 0; counter < requestObject.length; counter++) {
        impressionObject = this.createImpressionObject(requestObject[counter]);
        impressionObjects.push(impressionObject);
      }
    } else {
      impressionObject = this.createImpressionObject(requestObject);
      impressionObjects.push(impressionObject);
    }

    var returnObject = {};
    returnObject.idMappings = [];
    returnObject.requests = [];
    var errors = null;

    var baseUrl = (requestParameters.secure === 1 ? 'https' : 'http') + '://' + this.CONSTANTS.AD_SERVER_BASE_URL + '/' + this.CONSTANTS.END_POINT + this.CONSTANTS.AD_SERVER_URL_PARAM;

    var bidRequestObject = {
      bid_request: this.createBasicBidRequestObject(requestParameters, extraRequestParameters)
    };
    for (counter = 0; counter < impressionObjects.length; counter++) {
      impressionObject = impressionObjects[counter];

      if (impressionObject.errorCode) {
        errors = errors || [];
        errors.push({
          errorCode: impressionObject.errorCode,
          adUnitId: impressionObject.adUnitId
        });
      } else {
        returnObject.idMappings.push({
          adUnitId: impressionObject.adUnitId,
          id: impressionObject.impressionObject.id
        });
        bidRequestObject.bid_request.imp = bidRequestObject.bid_request.imp || [];

        bidRequestObject.bid_request.imp.push(impressionObject.impressionObject);
        var outputUri = encodeURIComponent(baseUrl + JSON.stringify(bidRequestObject));

        if (!requestParameters.singleRequestMode) {
          returnObject.requests.push({
            url: baseUrl + encodeURIComponent(JSON.stringify(bidRequestObject))
          });
          bidRequestObject = {
            bid_request: this.createBasicBidRequestObject(requestParameters, extraRequestParameters)
          };
        }

        if (outputUri.length > this.CONSTANTS.MAX_URL_LENGTH) {
          if (bidRequestObject.bid_request.imp.length > 1) {
            bidRequestObject.bid_request.imp.pop();
            returnObject.requests.push({
              url: baseUrl + encodeURIComponent(JSON.stringify(bidRequestObject))
            });
            bidRequestObject = {
              bid_request: this.createBasicBidRequestObject(requestParameters, extraRequestParameters)
            };
            bidRequestObject.bid_request.imp = [];
            bidRequestObject.bid_request.imp.push(impressionObject.impressionObject);
          } else {
            // We have a problem.  Single request is too long for a URI
          }
        }
      }
    }
    if (bidRequestObject.bid_request &&
      bidRequestObject.bid_request.imp &&
      bidRequestObject.bid_request.imp.length > 0) {
      returnObject.requests = returnObject.requests || [];
      returnObject.requests.push({
        url: baseUrl + encodeURIComponent(JSON.stringify(bidRequestObject))
      });
    }

    if (errors) {
      returnObject.errors = errors;
    }

    return returnObject;
  };

  this.createBasicBidRequestObject = function(requestParameters, extraRequestParameters) {
    var impressionBidRequestObject = {};
    if (requestParameters.requestId) {
      impressionBidRequestObject.id = requestParameters.requestId;
    } else {
      impressionBidRequestObject.id = this.getRandomString();
    }
    if (requestParameters.domain) {
      impressionBidRequestObject.domain = requestParameters.domain;
    }
    if (requestParameters.page) {
      impressionBidRequestObject.page = requestParameters.page;
    }
    if (requestParameters.ref) {
      impressionBidRequestObject.ref = requestParameters.ref;
    }
    if (requestParameters.callback) {
      impressionBidRequestObject.callback = requestParameters.callback;
    }
    if ('secure' in requestParameters) {
      impressionBidRequestObject.secure = requestParameters.secure;
    }
    if (requestParameters.libVersion) {
      impressionBidRequestObject.version = requestParameters.libVersion + '-' + this.CONSTANTS.CLIENT_VERSION;
    }
    if (extraRequestParameters) {
      for (var prop in extraRequestParameters) {
        impressionBidRequestObject[prop] = extraRequestParameters[prop];
      }
    }

    return impressionBidRequestObject;
  };

  this.createImpressionObject = function(placementObject) {
    var outputObject = {};
    var impressionObject = {};
    outputObject.impressionObject = impressionObject;

    if (placementObject.id) {
      impressionObject.id = placementObject.id;
    } else {
      impressionObject.id = this.getRandomString(placementObject.adUnitId);
    }
    if (placementObject.adUnitId) {
      outputObject.adUnitId = placementObject.adUnitId;
    }
    if (placementObject.placementId) {
      impressionObject.pid = placementObject.placementId;
    }
    if (placementObject.publisherId) {
      impressionObject.pubid = placementObject.publisherId;
    }
    if (placementObject.placementKey) {
      impressionObject.pkey = placementObject.placementKey;
    }
    if (placementObject.transactionId) {
      impressionObject.tid = placementObject.transactionId;
    }
    if (placementObject.keyValues) {
      for (var key in placementObject.keyValues) {
        for (var valueCounter = 0; valueCounter < placementObject.keyValues[key].length; valueCounter++) {
          impressionObject.kvw = impressionObject.kvw || {};
          impressionObject.kvw[key] = impressionObject.kvw[key] || [];
          impressionObject.kvw[key].push(placementObject.keyValues[key][valueCounter]);
        }
      }
    }
    if (placementObject.size && placementObject.size.w && placementObject.size.h) {
      impressionObject.banner = {};
      impressionObject.banner.w = placementObject.size.w;
      impressionObject.banner.h = placementObject.size.h;
    } else {
      impressionObject.banner = {};
    }

    if (!impressionObject.pid &&
    !impressionObject.pubid &&
    !impressionObject.pkey &&
    !(impressionObject.banner && impressionObject.banner.w && impressionObject.banner.h)) {
      outputObject.impressionObject = null;
      outputObject.errorCode = this.CONSTANTS.ERROR_CODES.MISSING_PLACEMENT_PARAMS;
    }
    return outputObject;
  };
}

exports.ImproveDigitalAdServerJSClient = ImproveDigitalAdServerJSClient;
