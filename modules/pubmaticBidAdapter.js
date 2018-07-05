import * as utils from 'src/utils';
import { registerBidder } from 'src/adapters/bidderFactory';
import { BANNER, VIDEO } from 'src/mediaTypes';
const constants = require('src/constants.json');

const BIDDER_CODE = 'pubmatic';
const ENDPOINT = '//hbopenbid.pubmatic.com/translator?source=prebid-client';
const USYNCURL = '//ads.pubmatic.com/AdServer/js/showad.js#PIX&kdntuid=1&p=';
const DEFAULT_CURRENCY = 'USD';
const AUCTION_TYPE = 1;
const UNDEFINED = undefined;
const CUSTOM_PARAMS = {
  'kadpageurl': '', // Custom page url
  'gender': '', // User gender
  'yob': '', // User year of birth
  'lat': '', // User location - Latitude
  'lon': '', // User Location - Longitude
  'wiid': '', // OpenWrap Wrapper Impression ID
  'profId': '', // OpenWrap Legacy: Profile ID
  'verId': '' // OpenWrap Legacy: version ID
};
const VIDEO_CUSTOM_PARAMS = {
  'mimes': constants.DATA_TYPES.ARRAY,
  'minduration': constants.DATA_TYPES.NUMBER,
  'maxduration': constants.DATA_TYPES.NUMBER,
  'startdelay': constants.DATA_TYPES.NUMBER,
  'playbackmethod': constants.DATA_TYPES.ARRAY,
  'api': constants.DATA_TYPES.ARRAY,
  'protocols': constants.DATA_TYPES.ARRAY,
  'w': constants.DATA_TYPES.NUMBER,
  'h': constants.DATA_TYPES.NUMBER,
  'battr': constants.DATA_TYPES.ARRAY,
  'linearity': constants.DATA_TYPES.NUMBER,
  'placement': constants.DATA_TYPES.NUMBER,
  'minbitrate': constants.DATA_TYPES.NUMBER,
  'maxbitrate': constants.DATA_TYPES.NUMBER
}
const NET_REVENUE = false;
const dealChannelValues = {
  1: 'PMP',
  5: 'PREF',
  6: 'PMPG'
};

let publisherId = 0;

function _getDomainFromURL(url) {
  let anchor = document.createElement('a');
  anchor.href = url;
  return anchor.hostname;
}

function _parseSlotParam(paramName, paramValue) {
  if (!utils.isStr(paramValue)) {
    paramValue && utils.logWarn('PubMatic: Ignoring param key: ' + paramName + ', expects string-value, found ' + typeof paramValue);
    return UNDEFINED;
  }

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
    default:
      return paramValue;
  }
}

function _cleanSlot(slotName) {
  if (utils.isStr(slotName)) {
    return slotName.replace(/^\s+/g, '').replace(/\s+$/g, '');
  }
  return '';
}

function _parseAdSlot(bid) {
  bid.params.adUnit = '';
  bid.params.adUnitIndex = '0';
  bid.params.width = 0;
  bid.params.height = 0;
  var sizesArrayExists = (bid.hasOwnProperty('sizes') && utils.isArray(bid.sizes) && bid.sizes.length >= 1);
  bid.params.adSlot = _cleanSlot(bid.params.adSlot);

  var slot = bid.params.adSlot;
  var splits = slot.split(':');

  slot = splits[0];
  if (splits.length == 2) {
    bid.params.adUnitIndex = splits[1];
  }
  // check if size is mentioned in sizes array. in that case do not check for @ in adslot
  splits = slot.split('@');
  if (splits.length != 2) {
    if (!(sizesArrayExists)) {
      utils.logWarn('AdSlot Error: adSlot not in required format');
      return;
    }
  }
  bid.params.adUnit = splits[0];
  if (splits.length > 1) { // i.e size is specified in adslot, so consider that and ignore sizes array
    splits = splits[1].split('x');
    if (splits.length != 2) {
      utils.logWarn('AdSlot Error: adSlot not in required format');
      return;
    }
    bid.params.width = parseInt(splits[0]);
    bid.params.height = parseInt(splits[1]);
    delete bid.sizes;
  } else if (sizesArrayExists) {
    bid.params.width = parseInt(bid.sizes[0][0]);
    bid.params.height = parseInt(bid.sizes[0][1]);
  }
}

function _initConf() {
  var conf = {};
  conf.pageURL = utils.getTopWindowUrl();
  conf.refURL = utils.getTopWindowReferrer();
  return conf;
}

function _handleCustomParams(params, conf) {
  if (!conf.kadpageurl) {
    conf.kadpageurl = conf.pageURL;
  }

  var key, value, entry;
  for (key in CUSTOM_PARAMS) {
    if (CUSTOM_PARAMS.hasOwnProperty(key)) {
      value = params[key];
      if (value) {
        entry = CUSTOM_PARAMS[key];

        if (typeof entry === 'object') {
          // will be used in future when we want to process a custom param before using
          // 'keyname': {f: function() {}}
          value = entry.f(value, conf);
        }

        if (utils.isStr(value)) {
          conf[key] = value;
        } else {
          utils.logWarn('PubMatic: Ignoring param : ' + key + ' with value : ' + CUSTOM_PARAMS[key] + ', expects string-value, found ' + typeof value);
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
    cur: [DEFAULT_CURRENCY],
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

// similar functionality as parseSlotParam. Check if the 2 functions can be clubbed.
function _checkParamDataType(key, value, datatype) {
  var errMsg = 'PubMatic: Ignoring param key: ' + key + ', expects ' + datatype + ', found ' + typeof value;
  switch (datatype) {
    case constants.DATA_TYPES.BOOLEAN:
      if (!utils.isBoolean(value)) {
        utils.logWarn(errMsg);
        return UNDEFINED;
      }
      return value;
    case constants.DATA_TYPES.NUMBER:
      if (!utils.isNumber(value)) {
        utils.logWarn(errMsg);
        return UNDEFINED;
      }
      return value;
    case constants.DATA_TYPES.STRING:
      if (!utils.isStr(value)) {
        utils.logWarn(errMsg);
        return UNDEFINED;
      }
      return value;
    case constants.DATA_TYPES.ARRAY:
      if (!utils.isArray(value)) {
        utils.logWarn(errMsg);
        return UNDEFINED;
      }
      return value;
  }
}

function _createImpressionObject(bid, conf) {
  var impObj = {};
  var bannerObj = {};
  var videoObj = {};
  var sizes = bid.hasOwnProperty('sizes') ? bid.sizes : [];

  impObj = {
    id: bid.bidId,
    tagid: bid.params.adUnit,
    bidfloor: _parseSlotParam('kadfloor', bid.params.kadfloor),
    secure: window.location.protocol === 'https:' ? 1 : 0,
    ext: {
      pmZoneId: _parseSlotParam('pmzoneid', bid.params.pmzoneid)
    },
    bidfloorcur: bid.params.bidfloorcur ? _parseSlotParam('bidfloorcur', bid.params.bidfloorcur) : DEFAULT_CURRENCY
  };

  if (bid.params.hasOwnProperty('video')) {
    var videoData = bid.params.video;

    for (var key in VIDEO_CUSTOM_PARAMS) {
      if (videoData.hasOwnProperty(key)) {
        videoObj[key] = _checkParamDataType(key, videoData[key], VIDEO_CUSTOM_PARAMS[key])
      }
    }
    // read playersize and assign to h and w.
    if (utils.isArray(bid.mediaTypes.video.playerSize[0])) {
      videoObj.w = bid.mediaTypes.video.playerSize[0][0];
      videoObj.h = bid.mediaTypes.video.playerSize[0][1];
    } else if (utils.isNumber(bid.mediaTypes.video.playerSize[0])) {
      videoObj.w = bid.mediaTypes.video.playerSize[0];
      videoObj.h = bid.mediaTypes.video.playerSize[1];
    }
    if (bid.params.video.hasOwnProperty('skippable')) {
      videoObj.ext = {
        'video_skippable': bid.params.video.skippable ? 1 : 0
      }
    }

    impObj.video = videoObj;
  } else {
    bannerObj = {
      pos: 0,
      w: bid.params.width,
      h: bid.params.height,
      topframe: utils.inIframe() ? 0 : 1,
    }
    if (utils.isArray(sizes) && sizes.length > 1) {
      sizes = sizes.splice(1);
      var format = [];
      sizes.forEach(size => {
        format.push({w: size[0], h: size[1]});
      });
      bannerObj.format = format;
    }
    impObj.banner = bannerObj;
  }
  return impObj;
}

export const spec = {
  code: BIDDER_CODE,
  supportedMediaTypes: [BANNER, VIDEO],
  /**
  * Determines whether or not the given bid request is valid. Valid bid request must have placementId and hbid
  *
  * @param {BidRequest} bid The bid params to validate.
  * @return boolean True if this is a valid bid, and false otherwise.
  */
  isBidRequestValid: bid => {
    if (bid && bid.params) {
      if (!utils.isStr(bid.params.publisherId)) {
        utils.logWarn('PubMatic Error: publisherId is mandatory and cannot be numeric. Call to OpenBid will not be sent.');
        return false;
      }
      if (!utils.isStr(bid.params.adSlot)) {
        utils.logWarn('PubMatic: adSlotId is mandatory and cannot be numeric. Call to OpenBid will not be sent.');
        return false;
      }
      // video ad validation
      if (bid.params.hasOwnProperty('video')) {
        if (!bid.params.video.hasOwnProperty('mimes') || !utils.isArray(bid.params.video.mimes) || bid.params.video.mimes.length === 0) {
          utils.logWarn('PubMatic: For video ads, mimes is mandatory and must specify atlease 1 mime value. Call to OpenBid will not be sent.');
          return false;
        }
      }
      return true;
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
    var conf = _initConf();
    var payload = _createOrtbTemplate(conf);
    var bidCurrency = '';
    validBidRequests.forEach(bid => {
      _parseAdSlot(bid);
      if (bid.params.hasOwnProperty('video')) {
        if (!(bid.params.adSlot && bid.params.adUnit && bid.params.adUnitIndex)) {
          utils.logWarn(BIDDER_CODE + ': Skipping the non-standard adslot: ', bid.params.adSlot, bid);
          return;
        }
      } else {
        if (!(bid.params.adSlot && bid.params.adUnit && bid.params.adUnitIndex && bid.params.width && bid.params.height)) {
          utils.logWarn(BIDDER_CODE + ': Skipping the non-standard adslot: ', bid.params.adSlot, bid);
          return;
        }
      }
      conf.pubId = conf.pubId || bid.params.publisherId;
      conf = _handleCustomParams(bid.params, conf);
      conf.transactionId = bid.transactionId;
      if (bidCurrency === '') {
        bidCurrency = bid.params.bidfloorcur || undefined;
      } else if (bid.params.hasOwnProperty('bidfloorcur') && bidCurrency !== bid.params.bidfloorcur) {
        utils.logWarn(BIDDER_CODE + ': Currency specifier ignored. Only one currency permitted.');
      }
      bid.params.bidfloorcur = bidCurrency
      payload.imp.push(_createImpressionObject(bid, conf));
    });

    if (payload.imp.length == 0) {
      return;
    }

    payload.site.publisher.id = conf.pubId.trim();
    publisherId = conf.pubId.trim();
    payload.ext.wrapper = {};
    payload.ext.wrapper.profile = parseInt(conf.profId) || UNDEFINED;
    payload.ext.wrapper.version = parseInt(conf.verId) || UNDEFINED;
    payload.ext.wrapper.wiid = conf.wiid || UNDEFINED;
    payload.ext.wrapper.wv = constants.REPO_AND_VERSION;
    payload.ext.wrapper.transactionId = conf.transactionId;
    payload.ext.wrapper.wp = 'pbjs';
    payload.user.gender = (conf.gender ? conf.gender.trim() : UNDEFINED);
    payload.user.geo = {};

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

    payload.user.geo.lat = _parseSlotParam('lat', conf.lat);
    payload.user.geo.lon = _parseSlotParam('lon', conf.lon);
    payload.user.yob = _parseSlotParam('yob', conf.yob);
    payload.device.geo = {};
    payload.device.geo.lat = _parseSlotParam('lat', conf.lat);
    payload.device.geo.lon = _parseSlotParam('lon', conf.lon);
    payload.site.page = conf.kadpageurl.trim() || payload.site.page.trim();
    payload.site.domain = _getDomainFromURL(payload.site.page);
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
      if (response.body && response.body.seatbid && utils.isArray(response.body.seatbid)) {
        // Supporting multiple bid responses for same adSize
        response.body.seatbid.forEach(seatbidder => {
          seatbidder.bid &&
          utils.isArray(seatbidder.bid) &&
          seatbidder.bid.forEach(bid => {
            let newBid = {
              requestId: bid.impid,
              cpm: (parseFloat(bid.price) || 0).toFixed(2),
              width: bid.w,
              height: bid.h,
              creativeId: bid.crid || bid.id,
              dealId: bid.dealid,
              currency: DEFAULT_CURRENCY,
              netRevenue: NET_REVENUE,
              ttl: 300,
              referrer: utils.getTopWindowUrl(),
              ad: bid.adm
            };
            var parsedRequest = JSON.parse(request.data);
            if (parsedRequest.imp && parsedRequest.imp.length > 0) {
              parsedRequest.imp.forEach(req => {
                if (bid.impid === req.id && req.hasOwnProperty('video')) {
                  newBid.mediaType = 'video';
                  newBid.width = bid.hasOwnProperty('w') ? bid.w : req.video.w;
                  newBid.height = bid.hasOwnProperty('h') ? bid.h : req.video.h;
                  newBid.vastXml = bid.adm;
                }
              });
            }
            if (bid.ext && bid.ext.deal_channel) {
              newBid['dealChannel'] = dealChannelValues[bid.ext.deal_channel] || null;
            }

            bidResponses.push(newBid);
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
  getUserSyncs: (syncOptions, responses, gdprConsent) => {
    let syncurl = USYNCURL + publisherId;

    // Attaching GDPR Consent Params in UserSync url
    if (gdprConsent) {
      syncurl += '&gdpr=' + (gdprConsent.gdprApplies ? 1 : 0);
      syncurl += '&gdpr_consent=' + encodeURIComponent(gdprConsent.consentString || '');
    }

    if (syncOptions.iframeEnabled) {
      return [{
        type: 'iframe',
        url: syncurl
      }];
    } else {
      utils.logWarn('PubMatic: Please enable iframe based user sync.');
    }
  }
};

registerBidder(spec);
