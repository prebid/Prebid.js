const LIB_VERSION_GLOBAL = '3.0.5';

const CONSTANTS = require('src/constants');
const utils = require('src/utils');
const bidfactory = require('src/bidfactory');
const bidmanager = require('src/bidmanager');
const adloader = require('src/adloader');
const Adapter = require('src/adapter').default;
const adaptermanager = require('src/adaptermanager');

const IMPROVE_DIGITAL_BIDDER_CODE = 'improvedigital';

const ImproveDigitalAdapter = function () {
  let baseAdapter = new Adapter(IMPROVE_DIGITAL_BIDDER_CODE);
  baseAdapter.idClient = new ImproveDigitalAdServerJSClient('hb');

  const LIB_VERSION = LIB_VERSION_GLOBAL;

  // Ad server needs to implement JSONP using this function as the callback
  const CALLBACK_FUNCTION = '$$PREBID_GLOBAL$$' + '.improveDigitalResponse';

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

  let submitNoBidResponse = function(bidRequest) {
    let bid = bidfactory.createBid(CONSTANTS.STATUS.NO_BID, bidRequest);
    bid.bidderCode = IMPROVE_DIGITAL_BIDDER_CODE;
    bidmanager.addBidResponse(bidRequest.placementCode, bid);
  };

  $$PREBID_GLOBAL$$.improveDigitalResponse = function(response) {
    let bidRequests = utils.getBidderRequestAllAdUnits(IMPROVE_DIGITAL_BIDDER_CODE);
    if (bidRequests && bidRequests.bids && bidRequests.bids.length > 0) {
      utils._each(bidRequests.bids, function (bidRequest) {
        let bidObjects = response.bid || [];
        utils._each(bidObjects, function (bidObject) {
          if (bidObject.id === bidRequest.bidId) {
            if (!bidObject.price || bidObject.price === null) {
              submitNoBidResponse(bidRequest);
              return;
            }
            if (bidObject.errorCode && bidObject.errorCode !== 0) {
              submitNoBidResponse(bidRequest);
              return;
            }
            if (!bidObject.adm || bidObject.adm === null || typeof bidObject.adm !== 'string') {
              submitNoBidResponse(bidRequest);
              return;
            }

            let bid = bidfactory.createBid(CONSTANTS.STATUS.GOOD, bidRequest);

            let syncString = '';
            let syncArray = (bidObject.sync && bidObject.sync.length > 0) ? bidObject.sync : [];

            utils._each(syncArray, function (syncElement) {
              let syncInd = syncElement.replace(/\//g, '\\\/');
              syncString = `${syncString}${(syncString === '') ? 'document.writeln(\"' : ''}<img src=\\\"${syncInd}\\\" style=\\\"display:none\\\"\/>`;
            });
            syncString = `${syncString}${(syncString === '') ? '' : '\")'}`;

            let nurl = '';
            if (bidObject.nurl && bidObject.nurl.length > 0) {
              nurl = `<img src=\"${bidObject.nurl}\" width=\"0\" height=\"0\" style=\"display:none\">`;
            }
            bid.ad = `${nurl}<script>${bidObject.adm}${syncString}</script>`;
            bid.bidderCode = IMPROVE_DIGITAL_BIDDER_CODE;
            bid.cpm = parseFloat(bidObject.price);
            bid.width = bidObject.w;
            bid.height = bidObject.h;

            bidmanager.addBidResponse(bidRequest.placementCode, bid);
          }
        });
      });
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

    let normalizedBids = bidRequests.map((bidRequest) => {
      let normalizedBidRequest = this.getNormalizedBidRequest(bidRequest);
      if (bidRequest.params && bidRequest.params.singleRequest) {
        requestParameters.singleRequestMode = true;
      }
      return normalizedBidRequest;
    });

    let request = this.idClient.createRequest(
      normalizedBids, // requestObject
      requestParameters
    );

    if (request.errors && request.errors.length > 0) {
      utils.logError('ID WARNING 0x01');
    }

    if (request && request.requests && request.requests[0]) {
      utils._each(request.requests, function (requestElement) {
        if (requestElement.url) {
          adloader.loadScript(requestElement.url, null);
        }
      });
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
    CLIENT_VERSION: 'JS-4.0.2',
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

  this.createRequest = function(requestObject, requestParameters, extraRequestParameters) {
    if (requestParameters.httpRequestType !== this.CONSTANTS.HTTP_REQUEST_TYPE.GET) {
      return this.getErrorReturn(this.CONSTANTS.ERROR_CODES.BAD_HTTP_REQUEST_TYPE_PARAM);
    }
    if (!requestParameters.libVersion) {
      return this.getErrorReturn(this.CONSTANTS.ERROR_CODES.LIB_VERSION_MISSING);
    }

    let impressionObjects = [];
    let impressionObject;
    let counter;
    if (utils.isArray(requestObject)) {
      for (counter = 0; counter < requestObject.length; counter++) {
        impressionObject = this.createImpressionObject(requestObject[counter]);
        impressionObjects.push(impressionObject);
      }
    } else {
      impressionObject = this.createImpressionObject(requestObject);
      impressionObjects.push(impressionObject);
    }

    let returnObject = {};
    returnObject.idMappings = [];
    returnObject.requests = [];
    let errors = null;

    let baseUrl = `${(requestParameters.secure === 1 ? 'https' : 'http')}://${this.CONSTANTS.AD_SERVER_BASE_URL}/${this.CONSTANTS.END_POINT}${this.CONSTANTS.AD_SERVER_URL_PARAM}`;

    let bidRequestObject = {
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
        let outputUri = encodeURIComponent(baseUrl + JSON.stringify(bidRequestObject));

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
    let impressionBidRequestObject = {};
    if (requestParameters.requestId) {
      impressionBidRequestObject.id = requestParameters.requestId;
    } else {
      impressionBidRequestObject.id = utils.getUniqueIdentifierStr();
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
      for (let prop in extraRequestParameters) {
        impressionBidRequestObject[prop] = extraRequestParameters[prop];
      }
    }

    return impressionBidRequestObject;
  };

  this.createImpressionObject = function(placementObject) {
    let outputObject = {};
    let impressionObject = {};
    outputObject.impressionObject = impressionObject;

    if (placementObject.id) {
      impressionObject.id = placementObject.id;
    } else {
      impressionObject.id = utils.getUniqueIdentifierStr();
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
      for (let key in placementObject.keyValues) {
        for (let valueCounter = 0; valueCounter < placementObject.keyValues[key].length; valueCounter++) {
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
