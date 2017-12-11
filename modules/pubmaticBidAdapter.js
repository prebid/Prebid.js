import * as utils from 'src/utils';
import { registerBidder } from 'src/adapters/bidderFactory';
const constants = require('src/constants.json');

const BIDDER_CODE = 'pubmatic';
const ENDPOINT = '//openbid.pubmatic.com/translator?source=prebid-client';
const USYNCURL = '//ads.pubmatic.com/AdServer/js/showad.js#PIX&kdntuid=1&p=';
const CURRENCY = 'USD';
const AUCTION_TYPE = 2; //todo ?? is auction type correct ? second price auction
//todo: now what is significance of value ? 
const CUSTOM_PARAMS = {
  'kadpageurl': 'kadpageurl',
  'gender': 'gender', // User gender
  'yob': 'yob', // User year of birth
  'dctr': 'dctr', // Custom Targeting //todo : remove ????
  'lat': 'lat', // User location - Latitude
  'lon': 'lon', // User Location - Longitude
  'wiid': 'wiid', // OpenWrap Wrapper Impression ID
  'profId': 'profId', // OpenWrap Legacy: Profile ID
  'verId': 'verId' // OpenWrap Legacy: version ID  
};

let publisherId = 0;

function _processPmZoneId(zoneId) {
  if (utils.isStr(zoneId)) {
    return zoneId.split(',').slice(0, 50).join();
  } else {
    utils.logWarn('PubMatic: Ignoring param key: pmzoneid, expects string-value, found ' + typeof zoneId);
    return undefined;
  }
}

function _processFloor(floor){
  if (utils.isStr(floor)) {
    return parseFloat(floor) || undefined;
  } else {
    utils.logWarn('PubMatic: Ignoring param key: kadfloor, expects string-value, found ' + typeof floor);
    return undefined;
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

//todo: remove commented code
function _initConf() {
  var conf = {};
  var currTime = new Date();
  conf.sec = 0;
  //todo remove
  let _protocol = (window.location.protocol === 'https:' ? (conf.sec = 1, 'https') : 'http') + '://';
  conf.wp = 'PreBid';//todo : do we need to send this ?
  conf.wv = constants.REPO_AND_VERSION;
  // istanbul ignore else
  //if (window.navigator.cookieEnabled === false) {
  //  conf.fpcd = '1';
  //}
  try {
    conf.pageURL = window.top.location.href;
    conf.hostname = window.top.location.hostname;
    conf.refurl = window.top.document.referrer;
  } catch (e) {
    conf.pageURL = window.location.href;
    conf.hostname = window.location.hostname;
    conf.refurl = window.document.referrer;
  }
  /*conf.kltstamp = currTime.getFullYear() +
    '-' + (currTime.getMonth() + 1) +
    '-' + currTime.getDate() +
    ' ' + currTime.getHours() +
    ':' + currTime.getMinutes() +
    ':' + currTime.getSeconds();
  */  
  //conf.timezone = currTime.getTimezoneOffset() / 60 * -1;
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
          value = entry.m(value, conf);
          key = entry.n;
        } else {
          key = CUSTOM_PARAMS[key];
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
    bidfloor: _processFloor(bid.params.kadfloor),
    secure: conf.sec,
    banner: {
      pos: 0,
      w: bid.params.width, 
      h: bid.params.height,
      topframe: 1, //todo: may need to change for postbid : check with open bid 
    },
    ext: {
        pmZoneId: _processPmZoneId(bid.params.pmzoneid)
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
    //if(bid && bid.params && bid.params.publisherId){
      //_parseAdSlot(bid);
      //return !!(bid.params.adSlot && bid.params.adUnit && bid.params.adUnitIndex && bid.params.width && bid.params.height);
    //}else{
    //  return false;
    //}
    return !!(bid && bid.params && bid.params.publisherId && bid.params.adSlot);
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
    payload.ext.wrapper.profile = conf.profId || undefined;
    payload.ext.wrapper.version = conf.verId || undefined;
    payload.ext.wrapper.wiid = conf.wiid || undefined;
    payload.ext.wrapper.wv = conf.wv || undefined;
    payload.ext.wrapper.transactionId = conf.transactionId;
    payload.user.gender = conf.gender || undefined;
    payload.user.lat = conf.lat || undefined;
    payload.user.lon = conf.lon || undefined;
    payload.user.yob = conf.yob || undefined;
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
    }
  }
};

registerBidder(spec);