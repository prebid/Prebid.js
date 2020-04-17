import * as utils from '../src/utils.js';
import * as ajax from '../src/ajax.js';
import {userSync} from '../src/userSync.js';
import { config } from '../src/config.js';
import { registerBidder } from '../src/adapters/bidderFactory.js';
const constants = require('../src/constants.json');

const BIDDER_CODE = 'pubmaticServer';
const ENDPOINT = 'https://ow.pubmatic.com/openrtb/2.5/';
const COOKIE_SYNC = 'https://ow.pubmatic.com/cookie_sync/?sec=1'; // Set sec=1 to identify secure flag changes at server side
const CURRENCY = 'USD';
const AUCTION_TYPE = 1; // PubMaticServer just picking highest bidding bid from the partners configured
const UNDEFINED = undefined;
const IFRAME = 'iframe';
const IMAGE = 'image';
const REDIRECT = 'redirect';
const DEFAULT_VERSION_ID = '0';
const PUBMATIC_DIGITRUST_KEY = 'nFIn8aLzbd';

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

function _initConf(refererInfo) {
  var conf = {};
  conf.pageURL = (refererInfo && refererInfo.referer) ? refererInfo.referer : window.location.href;
  conf.refURL = window.document.referrer;
  return conf;
}

function _getDomainFromURL(url) {
  let anchor = document.createElement('a');
  anchor.href = url;
  return anchor.hostname;
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
    secure: 1,
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
        return arr.length > 0 ? arr : UNDEFINED;
      })()
    },
    ext: {
      wrapper: {
        div: bid.params.divId
      },
      bidder: {
        pubmatic: {
          pmZoneId: _parseSlotParam('pmzoneid', bid.params.pmzoneid)
        }
      }
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

function cookieSyncCallBack(response, XMLReqObj) {
  response = JSON.parse(response);
  // var userSyncConfig = config.getConfig('userSync.filterSettings');
  let syncOptions = {
    iframeEnabled: true,
    pixelEnabled: true
  }
  let serverResponse;
  // By default we should sync all bidders irrespective of iframe of image type
  // as OpenWrap doesn't have any feature to disable iframe of image based syncups
  // TODO : In future if we require to have it condition uncomment below code
  // and add condition to check partner if it needs to be synced.
  // if (userSyncConfig) {
  //   syncOptions = {
  //     iframeEnabled: config.getConfig('userSync.filterSettings.iframe') ? config.getConfig('userSync.filterSettings.iframe.filter') == 'include' : false,
  //     pixelEnabled: config.getConfig('userSync.filterSettings.image') ? (config.getConfig('userSync.filterSettings.image.filter') == 'include') : true,
  //   };
  // }
  // Todo: Can fire multiple usersync calls if multiple responses for same adsize found
  if (response.hasOwnProperty('bidder_status')) {
    serverResponse = response.bidder_status;
  }
  serverResponse.forEach(bidder => {
    if (bidder.usersync && bidder.usersync.url) {
      if (bidder.usersync.type === IFRAME) {
        if (syncOptions.iframeEnabled) {
          userSync.registerSync(IFRAME, bidder.bidder, bidder.usersync.url);
        } else {
          utils.logWarn(bidder.bidder + ': Please enable iframe based user sync.');
        }
      } else if (bidder.usersync.type === IMAGE || bidder.usersync.type === REDIRECT) {
        if (syncOptions.pixelEnabled) {
          userSync.registerSync(IMAGE, bidder.bidder, bidder.usersync.url);
        } else {
          utils.logWarn(bidder.bidder + ': Please enable pixel based user sync.');
        }
      } else {
        utils.logWarn(bidder.bidder + ': Please provide valid user sync type.');
      }
      window.$$PREBID_GLOBAL$$.triggerUserSyncs();
    }
  });
}

function logAllErrors(errors) {
  utils._each(errors, function (item, key) {
    utils.logWarn(key + ':' + item.join(','));
  });
}

function _getDataFromImpArray (impData, id, key) {
  for (var index in impData) {
    if (impData[index].ext.wrapper.div === id) {
      switch (key) {
        case 'requestId':
          return impData[index].id;
        case 'width':
          return impData[index].banner.format[0].w;
        case 'height':
          return impData[index].banner.format[0].h;
      }
    }
  }
}

function _createDummyBids (impData, bidResponses, errorCode, parsedReferrer) {
  let bidMap = window.PWT.bidMap;
  for (var id in bidMap) {
    for (var adapterID in bidMap[id].adapters) {
      if (adapterID !== 'prebid') {
        bidResponses.push({
          requestId: _getDataFromImpArray(impData, id, 'requestId'),
          bidderCode: BIDDER_CODE,
          originalBidder: adapterID,
          pubmaticServerErrorCode: errorCode,
          width: _getDataFromImpArray(impData, id, 'width'),
          height: _getDataFromImpArray(impData, id, 'height'),
          creativeId: 0,
          dealId: '',
          currency: CURRENCY,
          netRevenue: true,
          ttl: 300,
          referrer: parsedReferrer,
          ad: '',
          cpm: 0,
          serverSideResponseTime: (errorCode === 3) ? 0 : -1
        });
      }
    }
  }
}

function _getDigiTrustObject(key) {
  function getDigiTrustId() {
    let digiTrustUser = window.DigiTrust && (config.getConfig('digiTrustId') || window.DigiTrust.getUser({member: key}));
    return (digiTrustUser && digiTrustUser.success && digiTrustUser.identity) || null;
  }
  let digiTrustId = getDigiTrustId();
  // Verify there is an ID and this user has not opted out
  if (!digiTrustId || (digiTrustId.privacy && digiTrustId.privacy.optout)) {
    return null;
  }
  return digiTrustId;
}

function _handleDigitrustId(eids) {
  let digiTrustId = _getDigiTrustObject(PUBMATIC_DIGITRUST_KEY);
  if (digiTrustId !== null) {
    eids.push({
      'source': 'digitru.st',
      'uids': [{
        'id': digiTrustId.id || '',
        'atype': 1,
        'ext': {
          'keyv': parseInt(digiTrustId.keyv) || 0
        }
      }]
    });
  }
}

function _handleTTDId(eids, validBidRequests) {
  let ttdId = null;
  let adsrvrOrgId = config.getConfig('adsrvrOrgId');
  if (utils.isStr(utils.deepAccess(validBidRequests, '0.userId.tdid'))) {
    ttdId = validBidRequests[0].userId.tdid;
  } else if (adsrvrOrgId && utils.isStr(adsrvrOrgId.TDID)) {
    ttdId = adsrvrOrgId.TDID;
  }

  if (ttdId !== null) {
    eids.push({
      'source': 'adserver.org',
      'uids': [{
        'id': ttdId,
        'atype': 1,
        'ext': {
          'rtiPartner': 'TDID'
        }
      }]
    });
  }
}

/**
 * Produces external userid object in ortb 3.0 model.
 */
function _addExternalUserId(eids, value, source, atype) {
  if (utils.isStr(value)) {
    eids.push({
      source,
      uids: [{
        id: value,
        atype
      }]
    });
  }
}

function _handleEids(payload, validBidRequests) {
  let eids = [];
  _handleDigitrustId(eids);
  _handleTTDId(eids, validBidRequests);
  const bidRequest = validBidRequests[0];
  if (bidRequest && bidRequest.userId) {
    _addExternalUserId(eids, utils.deepAccess(bidRequest, `userId.pubcid`), 'pubcid.org', 1);
    _addExternalUserId(eids, utils.deepAccess(bidRequest, `userId.digitrustid.data.id`), 'digitru.st', 1);
    _addExternalUserId(eids, utils.deepAccess(bidRequest, `userId.id5id`), 'id5-sync.com', 1);
    _addExternalUserId(eids, utils.deepAccess(bidRequest, `userId.criteoId`), 'criteo.com', 1);// replacing criteoRtus
    _addExternalUserId(eids, utils.deepAccess(bidRequest, `userId.idl_env`), 'liveramp.com', 1);
    _addExternalUserId(eids, utils.deepAccess(bidRequest, `userId.lipb.lipbid`), 'liveintent.com', 1);
    _addExternalUserId(eids, utils.deepAccess(bidRequest, `userId.parrableid`), 'parrable.com', 1);
    _addExternalUserId(eids, utils.deepAccess(bidRequest, `userId.britepoolid`), 'britepool.com', 1);
    _addExternalUserId(eids, utils.deepAccess(bidRequest, `userId.firstpartyid`), 'firstpartyid', 1);
  }
  if (eids.length > 0) {
    payload.user.ext = {};
    payload.user.ext.eids = eids;
  }
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
  buildRequests: (validBidRequests, bidderRequest) => {
    var startTime = utils.timestamp();
    var refererInfo;
    if (bidderRequest && bidderRequest.refererInfo) {
      refererInfo = bidderRequest.refererInfo;
    }
    let conf = _initConf(refererInfo);
    let payload = _createOrtbTemplate(conf);
    window.PWT.owLatency = window.PWT.owLatency || {};

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

    payload.ext.wrapper = {
      profileid: parseInt(conf.profId) || UNDEFINED,
      versionid: parseInt(conf.verId) || parseInt(DEFAULT_VERSION_ID),
      sumry_disable: 0,
      ssauction: 0,
      wp: 'pbjs',
      wv: constants.REPO_AND_VERSION,
      // transactionId: conf.transactionId,
      wiid: conf.wiid || UNDEFINED
    };
    payload.source = {
      tid: conf.transactionId
    };
    payload.user = {
      gender: _parseSlotParam('gender', conf.gender),
      yob: _parseSlotParam('yob', conf.yob),
      geo: {
        lat: _parseSlotParam('lat', conf.lat),
        lon: _parseSlotParam('lon', conf.lon)
      }
    };

    // Attaching GDPR Consent Params
    if (bidderRequest && bidderRequest.gdprConsent) {
      payload.user.ext = {
        consent: bidderRequest.gdprConsent.consentString
      };

      payload.regs = {
        ext: {
          gdpr: (bidderRequest.gdprConsent.gdprApplies ? 1 : 0)
        }
      };
    }

    // CCPA
    if (bidderRequest && bidderRequest.uspConsent) {
      utils.deepSetValue(payload, 'regs.ext.us_privacy', bidderRequest.uspConsent);
    }

    payload.device.geo = payload.user.geo;
    payload.site.page = conf.kadpageurl || payload.site.page;
    payload.site.domain = _getDomainFromURL(payload.site.page);

    if (window.PWT.owLatency.hasOwnProperty(conf.wiid)) {
      window.PWT.owLatency[conf.wiid].startTime = startTime;
    } else {
      window.PWT.owLatency[conf.wiid] = {
        startTime: startTime
      }
    }
    _handleEids(payload, validBidRequests);
    return {
      method: 'POST',
      url: utils.getParameterByName('pwtvc') ? ENDPOINT + '?debug=1' : ENDPOINT,
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
    var endTime = utils.timestamp();
    var wiid = JSON.parse(request.data).ext.wrapper.wiid;
    if (window.PWT.owLatency.hasOwnProperty(wiid)) {
      window.PWT.owLatency[wiid].endTime = endTime;
    } else {
      window.PWT.owLatency[wiid] = {
        endTime: endTime
      }
    }
    const bidResponses = [];
    try {
      if (response.body && response.body.seatbid) {
        // Log errors if any present
        const errors = (response.body.ext && response.body.ext.errors) || {};
        logAllErrors(errors);

        // Supporting multiple bid responses for same adSize
        const partnerResponseTimeObj = (response.body.ext && response.body.ext.responsetimemillis) || {};

        const miObj = (response.body.ext && response.body.ext.matchedimpression) || {};
        let requestData = JSON.parse(request.data);
        let parsedReferrer = requestData.site && requestData.site.ref ? requestData.site.ref : '';
        response.body.seatbid.forEach(function (seatbidder) {
          seatbidder.bid && seatbidder.bid.forEach(function (bid) {
            if (/* bid.id !== null && */bid.ext.summary) {
              bid.ext.summary.forEach(function (summary, index) {
                var firstSummary = index === 0;
                let newBid = {};
                if (summary.errorCode === 6 || summary.errorCode === 3 || summary.errorCode === 11 || summary.errorCode === 12) {
                  // special handling for error code 6,11,12. Create all dummy bids from request data.
                  // 11: All Partners Throttled, 12 Some Partner Throttled.
                  bidResponses.length === 0 && _createDummyBids(requestData.imp, bidResponses, summary.errorCode, parsedReferrer);
                } else {
                  switch (summary.errorCode) {
                    case undefined:
                      newBid = {
                        requestId: bid.impid,
                        bidderCode: BIDDER_CODE,
                        originalBidder: summary.bidder,
                        pubmaticServerErrorCode: undefined,
                        width: summary.width,
                        height: summary.height,
                        creativeId: firstSummary ? (bid.crid || bid.id) : bid.id,
                        dealId: firstSummary ? (bid.dealid || UNDEFINED) : UNDEFINED,
                        currency: CURRENCY,
                        netRevenue: true,
                        ttl: 300,
                        referrer: parsedReferrer,
                        ad: firstSummary ? bid.adm : '',
                        cpm: (parseFloat(summary.bid) || 0).toFixed(2),
                        serverSideResponseTime: partnerResponseTimeObj[summary.bidder] || 0,
                        mi: miObj.hasOwnProperty(summary.bidder) ? miObj[summary.bidder] : UNDEFINED,
                        regexPattern: summary.regex || undefined
                      }
                      break;
                    default:
                      requestData.imp.forEach(function(impObj) {
                        if (impObj.id === bid.impid) {
                          newBid = {
                            requestId: impObj.id,
                            bidderCode: BIDDER_CODE,
                            originalBidder: summary.bidder,
                            pubmaticServerErrorCode: summary.errorCode,
                            width: impObj.banner.format[0].w,
                            height: impObj.banner.format[0].h,
                            creativeId: 0,
                            dealId: '',
                            currency: CURRENCY,
                            netRevenue: true,
                            ttl: 300,
                            referrer: parsedReferrer,
                            ad: '',
                            cpm: 0,
                            serverSideResponseTime: (summary.errorCode === 1 || summary.errorCode === 2 || summary.errorCode === 6) ? -1
                              : summary.errorCode === 5 ? 0 : partnerResponseTimeObj[summary.bidder] || 0,
                            /* errorCodes meaning:
                                1 = GADS_UNMAPPED_SLOT_ERROR
                                2 = GADS_MISSING_CONF_ERROR
                                3 = TIMEOUT_ERROR
                                4 = NO_BID_PREBID_ERROR
                                5 = PARTNER_TIMEDOUT_ERROR
                                6 = INVALID_CONFIGURATION_ERROR
                                7 = NO_GDPR_CONSENT_ERROR
                                500 = API_RESPONSE_ERROR
                                - setting serverSideResponseTime as 0, in cases where partnerResponseTimeObj[summary.bidder] is not available.
                                - setting serverSideResponseTime as -1, in cases where errorCode is 1,2 or 6. In these cases we do not log this bid in logger
                                - explicitly setting serverSideResponseTime = 0, where errorCode is 5, i.e. PARTNER_TIMEDOUT_ERROR
                            */
                            mi: miObj.hasOwnProperty(summary.bidder) ? miObj[summary.bidder] : undefined,
                            regexPattern: summary.regex || undefined

                          }
                        }
                      });
                      break;
                  }
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
  getUserSyncs: (syncOptions, serverResponses, gdprConsent, uspConsent) => {
    let urls = [];
    var bidders = config.getConfig('userSync.enabledBidders');
    var UUID = utils.getUniqueIdentifierStr();
    var data = {
      uuid: UUID,
      bidders: bidders
    };

    if (gdprConsent) {
      data['gdpr'] = gdprConsent.gdprApplies ? 1 : 0;
      data['gdpr_consent'] = encodeURIComponent(gdprConsent.consentString || '');
    }
    // CCPA
    if (uspConsent) {
      data['us_privacy'] = encodeURIComponent(uspConsent);
    }

    ajax.ajax(COOKIE_SYNC, cookieSyncCallBack, JSON.stringify(data), {
      withCredentials: true
    });
    return urls;
  }
};

registerBidder(spec);
