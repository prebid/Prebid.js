import * as utils from 'src/utils';
import { registerBidder } from 'src/adapters/bidderFactory';
const constants = require('src/constants.json');

const BIDDER_CODE = 'pubmaticServer';
const ENDPOINT = '//ow.pubmatic.com/openrtb/2.4/';
const CURRENCY = 'USD';
const AUCTION_TYPE = 1; // PubMaticServer just picking highest bidding bid from the partners configured
const UNDEFINED = undefined;
const IFRAME = 'iframe';
const IMAGE = 'image';
const REDIRECT = 'redirect';
const DEFAULT_VERSION_ID = '0';

const CUSTOM_PARAMS = {
  'kadpageurl': '', // Custom page url
  'gender': '', // User gender
  'yob': '', // User year of birth
  'lat': '', // User location - Latitude
  'lon': '', // User Location - Longitude
  'wiid': '', // OpenWrap Wrapper Impression ID
  'profId': '', // OpenWrap Legacy: Profile ID
  'verId': '', // OpenWrap Legacy: version ID
  'divId': '' // OpenWrap new
};

function logNonStringParam(paramName, paramValue) {
  utils.logWarn('PubMaticServer: Ignoring param : ' + paramName + ' with value : ' + paramValue + ', expects string-value, found ' + typeof paramValue);
}

function _parseSlotParam(paramName, paramValue) {
  if (!utils.isStr(paramValue)) {
    paramValue && logNonStringParam(paramName, paramValue);
    return UNDEFINED;
  }

  paramValue = paramValue.trim();

  switch (paramName) {
    case 'pmzoneid':
      return paramValue.split(',').slice(0, 50).map(id => id.trim()).join();
    case 'kadfloor':
      return parseFloat(paramValue) || UNDEFINED;
    case 'lat':
      return parseFloat(paramValue) || UNDEFINED;
    case 'lon':
      return parseFloat(paramValue) || UNDEFINED;
    case 'yob':
      return parseInt(paramValue) || UNDEFINED;
    case 'gender':
    default:
      return paramValue;
  }
}

function _initConf() {
  var conf = {};
  conf.pageURL = utils.getTopWindowUrl().trim();
  conf.refURL = utils.getTopWindowReferrer().trim();
  return conf;
}

function _handleCustomParams(params, conf) {
  // istanbul ignore else
  if (!conf.kadpageurl) {
    conf.kadpageurl = conf.pageURL;
  }

  var key, value, entry;
  for (key in CUSTOM_PARAMS) {
    // istanbul ignore else
    if (CUSTOM_PARAMS.hasOwnProperty(key)) {
      value = params[key];
      // istanbul ignore else
      if (value) {
        entry = CUSTOM_PARAMS[key];
        if (utils.isA(entry, 'Object')) {
          // will be used in future when we want to process a custom param before using
          // 'keyname': {f: function() {}}
          value = entry.f(value, conf);
        }

        if (utils.isStr(value)) {
          conf[key] = value;
        } else {
          logNonStringParam(key, CUSTOM_PARAMS[key]);
        }
      }
    }
  }
  return conf;
}

function _createOrtbTemplate(conf) {
  return {
    id: '' + new Date().getTime(),
    at: AUCTION_TYPE,
    cur: [CURRENCY],
    imp: [],
    site: {
      page: conf.pageURL,
      ref: conf.refURL,
      publisher: {}
    },
    device: {
      ua: navigator.userAgent,
      js: 1,
      dnt: (navigator.doNotTrack == 'yes' || navigator.doNotTrack == '1' || navigator.msDoNotTrack == '1') ? 1 : 0,
      h: screen.height,
      w: screen.width,
      language: navigator.language
    },
    user: {},
    ext: {}
  };
}

function _createImpressionObject(bid, conf) {
  return {
    id: bid.bidId,
    tagid: bid.params.adUnitId,
    bidfloor: _parseSlotParam('kadfloor', bid.params.kadfloor),
    secure: window.location.protocol === 'https:' ? 1 : 0,
    banner: {
      pos: 0,
      topframe: utils.inIframe() ? 0 : 1,
      format: (function() {
        let arr = [];
        for (let i = 0, l = bid.sizes.length; i < l; i++) {
          arr.push({
            w: bid.sizes[i][0],
            h: bid.sizes[i][1]
          });
        }
        return arr;
      })()
    },
    ext: {
      pmZoneId: _parseSlotParam('pmzoneid', bid.params.pmzoneid),
      div: bid.params.divId
    }
  };
}

function mandatoryParamCheck(paramName, paramValue) {
  if (!utils.isStr(paramValue)) {
    utils.logWarn(BIDDER_CODE + ': ' + paramName + ' is mandatory and it should be a string, , found ' + typeof paramValue);
    return false;
  }
  return true;
}

export const spec = {
  code: BIDDER_CODE,

  /**
  * Determines whether or not the given bid request is valid. Valid bid request must have placementId and hbid
  *
  * @param {BidRequest} bid The bid params to validate.
  * @return boolean True if this is a valid bid, and false otherwise.
  */
  isBidRequestValid: bid => {
    if (bid && bid.params) {
      return mandatoryParamCheck('publisherId', bid.params.publisherId) &&
        mandatoryParamCheck('adUnitId', bid.params.adUnitId) &&
        mandatoryParamCheck('divId', bid.params.divId) &&
        mandatoryParamCheck('adUnitIndex', bid.params.adUnitIndex);
    }
    return false;
  },

  /**
  * Make a server request from the list of BidRequests.
  *
  * @param {validBidRequests[]} - an array of bids
  * @return ServerRequest Info describing the request to the server.
  */
  buildRequests: validBidRequests => {
    let conf = _initConf();
    let payload = _createOrtbTemplate(conf);

    if (utils.isEmpty(validBidRequests)) {
      utils.logWarn('No Valid Bid Request found for given adUnits');
      return;
    }

    validBidRequests.forEach(bid => {
      conf.pubId = conf.pubId || bid.params.publisherId;
      conf = _handleCustomParams(bid.params, conf);
      conf.transactionId = bid.transactionId;
      payload.imp.push(_createImpressionObject(bid, conf));
    });

    payload.site.publisher.id = conf.pubId.trim();
    payload.ext.dm = {
      rs: 1,
      pubId: conf.pubId,
      wp: 'pbjs',
      wv: constants.REPO_AND_VERSION,
      transactionId: conf.transactionId,
      profileid: conf.profId || UNDEFINED,
      versionid: conf.verId || DEFAULT_VERSION_ID,
      wiid: conf.wiid || UNDEFINED
    };
    payload.user = {
      gender: _parseSlotParam('gender', conf.gender),
      yob: _parseSlotParam('yob', conf.yob),
      geo: {
        lat: _parseSlotParam('lat', conf.lat),
        lon: _parseSlotParam('lon', conf.lon)
      }
    };
    payload.device.geo = payload.user.geo;
    payload.site.page = conf.kadpageurl || payload.site.page;
    payload.site.domain = utils.getTopWindowHostName();
    return {
      method: 'POST',
      url: ENDPOINT,
      data: JSON.stringify(payload)
    };
  },

  /**
  * Unpack the response from the server into a list of bids.
  *
  * @param {*} response A successful response from the server.
  * @return {Bid[]} An array of bids which were nested inside the server.
  */
  interpretResponse: (response, request) => {
    const bidResponses = [];
    try {
      if (response.body && response.body.seatbid) {
        // Supporting multiple bid responses for same adSize
        const referrer = utils.getTopWindowUrl();
        response.body.seatbid.forEach(seatbidder => {
          seatbidder.bid &&
          seatbidder.bid.forEach(bid => {
            if (bid.id !== null && bid.ext.summary) {
              bid.ext.summary.forEach((summary, index) => {
                if (summary.bidder) {
                  const firstSummary = index === 0;
                  const newBid = {
                    requestId: bid.impid,
                    bidderCode: BIDDER_CODE,
                    originalBidder: summary.bidder,
                    pubmaticServerErrorCode: summary.errorCode,
                    cpm: (parseFloat(summary.bid) || 0).toFixed(2),
                    width: summary.width,
                    height: summary.height,
                    creativeId: firstSummary ? (bid.crid || bid.id) : bid.id,
                    dealId: firstSummary ? (bid.dealid || UNDEFINED) : UNDEFINED,
                    currency: CURRENCY,
                    netRevenue: true,
                    ttl: 300,
                    referrer: referrer,
                    ad: firstSummary ? bid.adm : ''
                  };
                  bidResponses.push(newBid);
                }
              });
            }
          });
        });
      }
    } catch (error) {
      utils.logError(error);
    }
    return bidResponses;
  },

  /**
  * Register User Sync.
  */
  getUserSyncs: (syncOptions, serverResponses) => {
    let serverResponse;
    let urls = [];
    // Todo: Can fire multiple usersync calls if multiple responses for same adsize found
    if (serverResponses.length > 0 && serverResponses[0] && serverResponses[0].body) {
      serverResponse = serverResponses[0].body;
    }
    if (serverResponse && serverResponse.ext && serverResponse.ext.bidderstatus && utils.isArray(serverResponse.ext.bidderstatus)) {
      serverResponse.ext.bidderstatus.forEach(bidder => {
        if (bidder.usersync && bidder.usersync.url) {
          if (bidder.usersync.type === IFRAME) {
            if (syncOptions.iframeEnabled) {
              urls.push({
                type: IFRAME,
                url: bidder.usersync.url
              });
            } else {
              utils.logWarn(bidder.bidder + ': Please enable iframe based user sync.');
            }
          } else if (bidder.usersync.type === IMAGE || bidder.usersync.type === REDIRECT) {
            if (syncOptions.pixelEnabled) {
              urls.push({
                type: IMAGE,
                url: bidder.usersync.url
              });
            } else {
              utils.logWarn(bidder.bidder + ': Please enable pixel based user sync.');
            }
          } else {
            utils.logWarn(bidder.bidder + ': Please provide valid user sync type.');
          }
        }
      });
    }
    return urls;
  }
};

registerBidder(spec);
