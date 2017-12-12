import * as utils from 'src/utils';
import { registerBidder } from 'src/adapters/bidderFactory';
const constants = require('src/constants.json');

const BIDDER_CODE = 'pubmatic';
const ENDPOINT = '//openbid.pubmatic.com/translator?source=prebid-client';
const USYNCURL = '//ads.pubmatic.com/AdServer/js/showad.js#PIX&kdntuid=1&p=';
const CURRENCY = 'USD';
const AUCTION_TYPE = 2;
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

let publisherId = 0;

function _parseSlotParam(paramName, paramValue){
  if (!utils.isStr(paramValue)) {    
    utils.logWarn('PubMatic: Ignoring param key: '+paramName+', expects string-value, found ' + typeof paramValue);
    return UNDEFINED;
  }

  switch(paramName){
    case 'pmzoneid':
      return paramValue.split(',').slice(0, 50).join();
    case 'kadfloor':
      return parseFloat(paramValue) || UNDEFINED;
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

function _parseAdSlot(bid){
  
  bid.params.adUnit = '';
  bid.params.adUnitIndex = '0';
  bid.params.width = 0;
  bid.params.height = 0;

  bid.params.adSlot = _cleanSlot(bid.params.adSlot);

  var slot = bid.params.adSlot;
  var splits = slot.split(':');

  slot = splits[0];
  if(splits.length == 2){
    bid.params.adUnitIndex = splits[1];
  }
  splits = slot.split('@');
  if(splits.length != 2){
    return;
  }       
  bid.params.adUnit = splits[0];
  splits = splits[1].split('x');
  if(splits.length != 2){
    return;
  }
  bid.params.width = parseInt(splits[0]);
  bid.params.height = parseInt(splits[1]);
}

function _initConf() {
  var conf = {};
  var currTime = new Date();
  conf.sec = window.location.protocol === 'https:' ? 1 : 0;
  conf.wp = 'pbjs';
  conf.wv = constants.REPO_AND_VERSION;// check later
  //todo check available api, getOrigin
  try {
    conf.pageURL = window.top.location.href;
    conf.hostname = window.top.location.hostname;// todo: domain w/o potocol
    conf.refurl = window.top.document.referrer;
  } catch (e) {
    conf.pageURL = window.location.href;
    conf.hostname = window.location.hostname;
    conf.refurl = window.document.referrer;
  }
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

        if (typeof entry === 'object') {
          // will be used in future when we want to process a custom param before using
          // 'keyname': {f: function(){}}
          value = entry.f(value, conf);
        }

        if (utils.isStr(value)) {
          conf[key] = value;
        } else {
          utils.logWarn('PubMatic: Ignoring param key: ' + CUSTOM_PARAMS[key] + ', expects string-value, found ' + typeof value);
        }
      }
    }
  }
  return conf;
}

function _createOrtbTemplate(conf){
  return {
    id : '' + new Date().getTime(),
    at: AUCTION_TYPE,
    cur: [CURRENCY],
    imp: [],
    site: {
      domain: conf.hostname,
      page: conf.pageURL,
      publisher: {}
    },
    device: {
      ua: navigator.userAgent,
      js: 1,
      dnt: (navigator.doNotTrack == "yes" || navigator.doNotTrack == "1" || navigator.msDoNotTrack == "1") ? 1 : 0,
      h: screen.height,
      w: screen.width,
      language: navigator.language
    },
    user: {},
    ext: {}
  };
}

function _createImpressionObject(bid, conf){
  return {
    id: bid.bidId,
    tagid: bid.params.adUnit,
    bidfloor: _parseSlotParam('kadfloor', bid.params.kadfloor),
    secure: conf.sec,
    banner: {
      pos: 0,
      w: bid.params.width, 
      h: bid.params.height,
      topframe: 1, //todo: use api
    },
    ext: {
      pmZoneId: _parseSlotParam('pmzoneid', bid.params.pmzoneid)
    }
  };
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
    return !!(bid && bid.params && utils.isStr(bid.params.publisherId) && utils.isStr(bid.params.adSlot));
  },

  /**
  * Make a server request from the list of BidRequests.
  *
  * @param {validBidRequests[]} - an array of bids
  * @return ServerRequest Info describing the request to the server.
  */
  buildRequests: validBidRequests => {
    var conf = _initConf();
    var payload = _createOrtbTemplate(conf);
    validBidRequests.forEach(bid => {
      _parseAdSlot(bid);
      if(! (bid.params.adSlot && bid.params.adUnit && bid.params.adUnitIndex && bid.params.width && bid.params.height)){
        utils.logWarn('PubMatic: Skipping the non-standard adslot:', bid.params.adSlot, bid);
        return;
      }
      conf.pubId = conf.pubId || bid.params.publisherId;
      conf = _handleCustomParams(bid.params, conf);
      conf.transactionId = bid.transactionId;
      payload.imp.push(_createImpressionObject(bid, conf));
    });
    
    if(payload.imp.length == 0){
      return;
    }

    payload.site.publisher.id = conf.pubId;
    publisherId = conf.pubId;
    payload.ext.wrapper = {};
    payload.ext.wrapper.profile = conf.profId || UNDEFINED;
    payload.ext.wrapper.version = conf.verId || UNDEFINED;
    payload.ext.wrapper.wiid = conf.wiid || UNDEFINED;
    payload.ext.wrapper.wv = conf.wv || UNDEFINED;
    payload.ext.wrapper.transactionId = conf.transactionId;
    payload.ext.wrapper.wp = conf.wp;
    payload.user.gender = conf.gender || UNDEFINED;
    payload.user.lat = conf.lat || UNDEFINED;
    payload.user.lon = conf.lon || UNDEFINED;
    payload.user.yob = conf.yob || UNDEFINED;
    payload.site.page = conf.kadpageurl || payload.site.page;
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
      if (response.body && response.body.seatbid && response.body.seatbid[0] && response.body.seatbid[0].bid) {
        response.body.seatbid[0].bid.forEach(bid => {
          let newBid = {
            requestId: bid.impid,
            cpm: bid.price, // Can we round to min precision ?
            //todo: keep it 2 decimal only
            width: bid.w,
            height: bid.h,
            creativeId: bid.crid || bid.id,
            dealId: bid.dealid,
            currency: CURRENCY,
            netRevenue: true,
            ttl: 300,
            referrer: utils.getTopWindowUrl(),
            ad: bid.adm
          };
          bidResponses.push(newBid);
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
  getUserSyncs: syncOptions => {
    if (syncOptions.iframeEnabled) {
      return [{
        type: 'iframe',
        url: USYNCURL + publisherId
      }];
    }else{
      utils.logWarn('PubMatic: Please enable iframe based user sync.');
    }
  }
};

registerBidder(spec);