import * as utils from 'src/utils';
import { registerBidder } from 'src/adapters/bidderFactory';
import { userSync } from 'src/userSync';

const BIDDER_CODE = 'improvedigital';

export const spec = {
  version: '4.0.0',
  code: BIDDER_CODE,
  aliases: ['id'],

  /**
   * Determines whether or not the given bid request is valid.
   *
   * @param {object} bid The bid to validate.
   * @return boolean True if this is a valid bid, and false otherwise.
   */
  isBidRequestValid: function (bid) {
    return !!(bid && bid.params && (bid.params.placementId || (bid.params.placementKey && bid.params.publisherId)));
  },

  /**
   * Make a server request from the list of BidRequests.
   *
   * @param {BidRequest[]} bidRequests A non-empty list of bid requests which should be sent to the Server.
   * @return ServerRequest Info describing the request to the server.
   */
  buildRequests: function (bidRequests) {
    let normalizedBids = bidRequests.map((bidRequest) => {
      return getNormalizedBidRequest(bidRequest);
    });

    let idClient = new ImproveDigitalAdServerJSClient('hb');
    let requestParameters = {
      singleRequestMode: false,
      httpRequestType: idClient.CONSTANTS.HTTP_REQUEST_TYPE.GET,
      returnObjType: idClient.CONSTANTS.RETURN_OBJ_TYPE.PREBID,
      libVersion: this.version
    };

    let requestObj = idClient.createRequest(
      normalizedBids, // requestObject
      requestParameters
    );

    if (requestObj.errors && requestObj.errors.length > 0) {
      utils.logError('ID WARNING 0x01');
    }

    return requestObj.requests;
  },

  /**
   * Unpack the response from the server into a list of bids.
   *
   * @param {*} serverResponse A successful response from the server.
   * @return {Bid[]} An array of bids which were nested inside the server.
   */
  interpretResponse: function (serverResponse, request) {
    const bids = [];
    utils._each(serverResponse.body.bid, function (bidObject) {
      if (!bidObject.price || bidObject.price === null ||
        bidObject.hasOwnProperty('errorCode') ||
        typeof bidObject.adm !== 'string') {
        return;
      }

      let bid = {};
      let nurl = '';
      if (bidObject.nurl && bidObject.nurl.length > 0) {
        nurl = `<img src="${bidObject.nurl}" width="0" height="0" style="display:none">`;
      }
      bid.ad = `${nurl}<script>${bidObject.adm}</script>`;
      bid.adId = bidObject.id;
      bid.cpm = parseFloat(bidObject.price);
      bid.creativeId = bidObject.crid;
      bid.currency = bidObject.currency ? bidObject.currency.toUpperCase() : 'USD';
      if (utils.isNumber(bidObject.lid)) {
        bid.dealId = bidObject.lid;
      } else if (typeof bidObject.lid === 'object' && bidObject.lid['1']) {
        bid.dealId = bidObject.lid['1'];
      }
      bid.height = bidObject.h;
      bid.netRevenue = bidObject.isNet ? bidObject.isNet : false;
      bid.requestId = bidObject.id;
      bid.ttl = 300;
      bid.width = bidObject.w;

      bids.push(bid);

      // Register user sync URLs
      if (utils.isArray(bidObject.sync)) {
        utils._each(bidObject.sync, function (syncElement) {
          userSync.registerSync('image', spec.code, syncElement);
        });
      }
    });
    return bids;
  }
};

function getNormalizedBidRequest(bid) {
  let adUnitId = utils.getBidIdParameter('adUnitCode', bid) || null;
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
  let transactionId = utils.getBidIdParameter('transactionId', bid);

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
  if (transactionId) {
    normalizedBidRequest.transactionId = transactionId;
  }
  return normalizedBidRequest;
}
registerBidder(spec);

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
    AD_SERVER_URL_PARAM: 'jsonp=',
    CLIENT_VERSION: 'JS-4.2.0',
    MAX_URL_LENGTH: 2083,
    ERROR_CODES: {
      BAD_HTTP_REQUEST_TYPE_PARAM: 1,
      MISSING_PLACEMENT_PARAMS: 2,
      LIB_VERSION_MISSING: 3
    },
    RETURN_OBJ_TYPE: {
      DEFAULT: 0,
      PREBID: 1
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

    requestParameters.returnObjType = requestParameters.returnObjType || this.CONSTANTS.RETURN_OBJ_TYPE.DEFAULT;

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

    let returnIdMappings = true;
    if (requestParameters.returnObjType === this.CONSTANTS.RETURN_OBJ_TYPE.PREBID) {
      returnIdMappings = false;
    }

    let returnObject = {};
    returnObject.requests = [];
    if (returnIdMappings) {
      returnObject.idMappings = [];
    }
    let errors = null;

    let baseUrl = `${(requestParameters.secure === 1 ? 'https' : 'http')}://${this.CONSTANTS.AD_SERVER_BASE_URL}/${this.CONSTANTS.END_POINT}?${this.CONSTANTS.AD_SERVER_URL_PARAM}`;

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
        if (returnIdMappings) {
          returnObject.idMappings.push({
            adUnitId: impressionObject.adUnitId,
            id: impressionObject.impressionObject.id
          });
        }
        bidRequestObject.bid_request.imp = bidRequestObject.bid_request.imp || [];
        bidRequestObject.bid_request.imp.push(impressionObject.impressionObject);

        let writeLongRequest = false;
        const outputUri = baseUrl + encodeURIComponent(JSON.stringify(bidRequestObject));
        if (outputUri.length > this.CONSTANTS.MAX_URL_LENGTH) {
          writeLongRequest = true;
          if (bidRequestObject.bid_request.imp.length > 1) {
            // Pop the current request and process it again in the next iteration
            bidRequestObject.bid_request.imp.pop();
            if (returnIdMappings) {
              returnObject.idMappings.pop();
            }
            counter--;
          }
        }

        if (writeLongRequest ||
            !requestParameters.singleRequestMode ||
            counter === impressionObjects.length - 1) {
          returnObject.requests.push(this.formatRequest(requestParameters, bidRequestObject));
          bidRequestObject = {
            bid_request: this.createBasicBidRequestObject(requestParameters, extraRequestParameters)
          };
        }
      }
    }

    if (errors) {
      returnObject.errors = errors;
    }

    return returnObject;
  };

  this.formatRequest = function(requestParameters, bidRequestObject) {
    switch (requestParameters.returnObjType) {
      case this.CONSTANTS.RETURN_OBJ_TYPE.PREBID:
        return {
          method: 'GET',
          url: `//${this.CONSTANTS.AD_SERVER_BASE_URL}/${this.CONSTANTS.END_POINT}`,
          data: `${this.CONSTANTS.AD_SERVER_URL_PARAM}${JSON.stringify(bidRequestObject)}`
        };
      default:
        const baseUrl = `${(requestParameters.secure === 1 ? 'https' : 'http')}://` +
          `${this.CONSTANTS.AD_SERVER_BASE_URL}/` +
          `${this.CONSTANTS.END_POINT}?${this.CONSTANTS.AD_SERVER_URL_PARAM}`;
        return {
          url: baseUrl + encodeURIComponent(JSON.stringify(bidRequestObject))
        }
    }
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
