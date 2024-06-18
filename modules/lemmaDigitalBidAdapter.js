import * as utils from '../src/utils.js';
import { config } from '../src/config.js';
import { registerBidder } from '../src/adapters/bidderFactory.js';
import { BANNER, VIDEO } from '../src/mediaTypes.js';

/**
 * @typedef {import('../src/adapters/bidderFactory.js').BidRequest} BidRequest
 * @typedef {import('../src/adapters/bidderFactory.js').Bid} Bid
 * @typedef {import('../src/adapters/bidderFactory.js').ServerResponse} ServerResponse
 * @typedef {import('../src/adapters/bidderFactory.js').SyncOptions} SyncOptions
 * @typedef {import('../src/adapters/bidderFactory.js').UserSync} UserSync
 * @typedef {import('../src/adapters/bidderFactory.js').validBidRequests} validBidRequests
 */

var BIDDER_CODE = 'lemmadigital';
var LOG_WARN_PREFIX = 'LEMMADIGITAL: ';
var ENDPOINT = 'https://bid.lemmadigital.com/lemma/servad';
var USER_SYNC = 'https://sync.lemmadigital.com/js/usersync.html?';
var DEFAULT_CURRENCY = 'USD';
var AUCTION_TYPE = 2;
var DEFAULT_TMAX = 300;
var DEFAULT_NET_REVENUE = false;
var DEFAULT_SECURE = 1;
var RESPONSE_TTL = 300;
var pubId = 0;
var adunitId = 0;

export var spec = {

  code: BIDDER_CODE,
  supportedMediaTypes: [BANNER, VIDEO],

  /**
   * Determines whether or not the given bid request is valid.
   *
   * @param {BidRequest} bid The bid params to validate.
   * @return boolean True if this is a valid bid, and false otherwise.
   */
  isBidRequestValid: (bid) => {
    if (!bid || !bid.params) {
      utils.logError(LOG_WARN_PREFIX, 'nil/empty bid object');
      return false;
    }
    if (!utils.isEmpty(bid.params.pubId) || !utils.isNumber(bid.params.pubId)) {
      utils.logWarn(LOG_WARN_PREFIX + 'Error: publisherId is mandatory and cannot be string. Call to OpenBid will not be sent for ad unit: ' + JSON.stringify(bid));
      return false;
    }
    if (!bid.params.adunitId) {
      utils.logWarn(LOG_WARN_PREFIX + 'Error: adUnitId is mandatory. Call to OpenBid will not be sent for ad unit: ' + JSON.stringify(bid));
      return false;
    }
    // video bid request validation
    if (bid.params.hasOwnProperty('video')) {
      if (!bid.params.video.hasOwnProperty('mimes') || !utils.isArray(bid.params.video.mimes) || bid.params.video.mimes.length === 0) {
        utils.logWarn(LOG_WARN_PREFIX + 'Error: For video ads, mimes is mandatory and must specify atlease 1 mime value. Call to OpenBid will not be sent for ad unit:' + JSON.stringify(bid));
        return false;
      }
    }
    return true;
  },

  /**
   * Make a server request from the list of BidRequests.
   *
   * @param {validBidRequests[]} - an array of bids
   * @return ServerRequest Info describing the request to the server.
   */
  buildRequests: (validBidRequests, bidderRequest) => {
    if (validBidRequests.length === 0) {
      return;
    }
    var refererInfo;
    if (bidderRequest && bidderRequest.refererInfo) {
      refererInfo = bidderRequest.refererInfo;
    }
    var conf = spec._setRefURL(refererInfo);
    const request = spec._createoRTBRequest(validBidRequests, conf);
    if (request && request.imp.length == 0) {
      return;
    }
    spec._setOtherParams(bidderRequest, request);
    const endPoint = spec._endPointURL(validBidRequests);
    return {
      method: 'POST',
      url: endPoint,
      data: JSON.stringify(request),
    };
  },

  /**
   * Unpack the response from the server into a list of bids.
   *
   * @param {ServerResponse} response A successful response from the server.
   * @return {Bid[]} An array of bids which were nested inside the server.
   */
  interpretResponse: (response, request) => {
    return spec._parseRTBResponse(request, response.body);
  },

  /**
   * Register the user sync pixels which should be dropped after the auction.
   * @param {SyncOptions} syncOptions Which user syncs are allowed?
   * @param {ServerResponse[]} serverResponses List of server's responses.
   * @return {UserSync[]} The user syncs which should be dropped.
   */
  getUserSyncs: (syncOptions, serverResponses) => {
    let syncurl = USER_SYNC + 'pid=' + pubId;
    if (syncOptions.iframeEnabled) {
      return [{
        type: 'iframe',
        url: syncurl
      }];
    } else {
      utils.logWarn(LOG_WARN_PREFIX + 'Please enable iframe based user sync.');
    }
  },

  /**
   * Generate UUID
   */
  _createUUID: () => {
    return new Date().getTime().toString();
  },

  /**
   * parse object
   */
  _parseJSON: function (rawPayload) {
    try {
      if (rawPayload) {
        return JSON.parse(rawPayload);
      }
    } catch (ex) {
      utils.logError(LOG_WARN_PREFIX, 'Exception: ', ex);
    }
    return null;
  },

  /**
   *
   * set referal url
   */
  _setRefURL: (refererInfo) => {
    var conf = {};
    conf.pageURL = (refererInfo && refererInfo.referer) ? refererInfo.referer : window.location.href;
    if (refererInfo && refererInfo.referer) {
      conf.refURL = refererInfo.referer;
    } else {
      conf.refURL = '';
    }
    return conf;
  },

  /**
   * set other params into oRTB request
   */
  _setOtherParams: (request, ortbRequest) => {
    var params = request && request.params ? request.params : null;
    if (params) {
      ortbRequest.tmax = params.tmax;
      ortbRequest.bcat = params.bcat;
    }
  },

  /**
   * create IAB standard OpenRTB bid request
   */
  _createoRTBRequest: (bidRequests, conf) => {
    var oRTBObject = {};
    try {
      oRTBObject = {
        id: spec._createUUID(),
        at: AUCTION_TYPE,
        tmax: DEFAULT_TMAX,
        cur: [DEFAULT_CURRENCY],
        imp: spec._getImpressionArray(bidRequests),
        user: {},
        ext: {}
      };
      var bid = bidRequests[0];

      var site = spec._getSiteObject(bid, conf);
      if (site) {
        oRTBObject.site = site;
        // add the content object from config in request
        if (typeof config.getConfig('content') === 'object') {
          oRTBObject.site.content = config.getConfig('content');
        }
      }
      var app = spec._getAppObject(bid);
      if (app) {
        oRTBObject.app = app;
        if (typeof oRTBObject.app.content !== 'object' && typeof config.getConfig('content') === 'object') {
          oRTBObject.app.content =
            config.getConfig('content') || undefined;
        }
      }
      var device = spec._getDeviceObject(bid);
      if (device) {
        oRTBObject.device = device;
      }
      var source = spec._getSourceObject(bid);
      if (source) {
        oRTBObject.source = source;
      }
      return oRTBObject;
    } catch (ex) {
      utils.logError(LOG_WARN_PREFIX, 'ERROR ', ex);
    }
  },

  /**
   * create impression array objects
   */
  _getImpressionArray: (request) => {
    var impArray = [];
    var map = request.map(bid => spec._getImpressionObject(bid));
    if (map) {
      map.forEach(o => {
        if (o) {
          impArray.push(o);
        }
      });
    }
    return impArray;
  },

  /**
   * create impression (single) object
   */
  _getImpressionObject: (bid) => {
    var impression = {};
    var bObj;
    var vObj;
    var sizes = bid.hasOwnProperty('sizes') ? bid.sizes : [];
    var mediaTypes = '';
    var format = [];
    var params = bid && bid.params ? bid.params : null;
    impression = {
      id: bid.bidId,
      tagid: params.adunitId ? params.adunitId.toString() : undefined,
      secure: DEFAULT_SECURE,
      bidfloorcur: params.currency ? params.currency : DEFAULT_CURRENCY
    };
    if (params.bidFloor) {
      impression.bidfloor = params.bidFloor;
    }
    if (bid.hasOwnProperty('mediaTypes')) {
      for (mediaTypes in bid.mediaTypes) {
        switch (mediaTypes) {
          case BANNER:
            bObj = spec._getBannerRequest(bid);
            if (bObj) {
              impression.banner = bObj;
            }
            break;
          case VIDEO:
            vObj = spec._getVideoRequest(bid);
            if (vObj) {
              impression.video = vObj;
            }
            break;
        }
      }
    } else {
      bObj = {
        pos: 0,
        w: sizes && sizes[0] ? sizes[0][0] : 0,
        h: sizes && sizes[0] ? sizes[0][1] : 0,
      };
      if (utils.isArray(sizes) && sizes.length > 1) {
        sizes = sizes.splice(1, sizes.length - 1);
        sizes.forEach(size => {
          format.push({
            w: size[0],
            h: size[1]
          });
        });
        bObj.format = format;
      }
      impression.banner = bObj;
    }
    spec._setFloor(impression, bid);
    return impression.hasOwnProperty(BANNER) ||
      impression.hasOwnProperty(VIDEO) ? impression : undefined;
  },

  /**
   * set bid floor
   */
  _setFloor: (impObj, bid) => {
    let bidFloor = -1;
    // get lowest floor from floorModule
    if (typeof bid.getFloor === 'function') {
      [BANNER, VIDEO].forEach(mediaType => {
        if (impObj.hasOwnProperty(mediaType)) {
          let floorInfo = bid.getFloor({ currency: impObj.bidfloorcur, mediaType: mediaType, size: '*' });
          if (typeof floorInfo === 'object' && floorInfo.currency === impObj.bidfloorcur && !isNaN(parseInt(floorInfo.floor))) {
            let mediaTypeFloor = parseFloat(floorInfo.floor);
            bidFloor = (bidFloor == -1 ? mediaTypeFloor : Math.min(mediaTypeFloor, bidFloor));
          }
        }
      });
    }
    // get highest from impObj.bidfllor and floor from floor module
    // as we are using Math.max, it is ok if we have not got any floor from floorModule, then value of bidFloor will be -1
    if (impObj.bidfloor) {
      bidFloor = Math.max(bidFloor, impObj.bidfloor);
    }

    // assign value only if bidFloor is > 0
    impObj.bidfloor = ((!isNaN(bidFloor) && bidFloor > 0) ? bidFloor : undefined);
  },

  /**
   * parse Open RTB response
   */
  _parseRTBResponse: (request, response) => {
    var bidResponses = [];
    try {
      if (response.seatbid) {
        var currency = response.curr || DEFAULT_CURRENCY;
        var seatbid = response.seatbid;
        seatbid.forEach(seatbidder => {
          var bidder = seatbidder.bid;
          bidder.forEach(bid => {
            var req = spec._parseJSON(request.data);
            var newBid = {
              requestId: bid.impid,
              cpm: parseFloat(bid.price).toFixed(2),
              width: bid.w,
              height: bid.h,
              creativeId: bid.crid,
              currency: currency,
              netRevenue: DEFAULT_NET_REVENUE,
              ttl: RESPONSE_TTL,
              referrer: req.site.ref,
              ad: bid.adm
            };
            if (bid.dealid) {
              newBid.dealId = bid.dealid;
            }
            if (req.imp && req.imp.length > 0) {
              req.imp.forEach(robj => {
                if (bid.impid === robj.id) {
                  spec._checkMediaType(bid.adm, newBid);
                  switch (newBid.mediaType) {
                    case BANNER:
                      break;
                    case VIDEO:
                      newBid.width = bid.hasOwnProperty('w') ? bid.w : robj.video.w;
                      newBid.height = bid.hasOwnProperty('h') ? bid.h : robj.video.h;
                      newBid.vastXml = bid.adm;
                      break;
                  }
                }
              });
            }
            bidResponses.push(newBid);
          });
        });
      }
    } catch (error) {
      utils.logError(LOG_WARN_PREFIX, 'ERROR ', error);
    }
    return bidResponses;
  },

  /**
   * get bid request api end point url
   */
  _endPointURL: (request) => {
    var params = request && request[0].params ? request[0].params : null;
    if (params) {
      pubId = params.pubId ? params.pubId : 0;
      adunitId = params.adunitId ? params.adunitId : 0;
      return ENDPOINT + '?pid=' + pubId + '&aid=' + adunitId;
    }
    return null;
  },

  /**
   * get domain name from url
   */
  _getDomain: (url) => {
    var a = document.createElement('a');
    a.setAttribute('href', url);
    return a.hostname;
  },

  /**
   * create the site object
   */
  _getSiteObject: (request, conf) => {
    var params = request && request.params ? request.params : null;
    if (params) {
      pubId = params.pubId ? params.pubId : '0';
      var siteId = params.siteId ? params.siteId : '0';
      var appParams = params.app;
      if (!appParams) {
        return {
          publisher: {
            id: pubId.toString()
          },
          domain: spec._getDomain(conf.pageURL),
          id: siteId.toString(),
          ref: conf.refURL,
          page: conf.pageURL,
          cat: params.category,
          pagecat: params.page_category
        };
      }
    }
    return null;
  },

  /**
   * create the app object
   */
  _getAppObject: (request) => {
    var params = request && request.params ? request.params : null;
    if (params) {
      pubId = params.pubId ? params.pubId : 0;
      var appParams = params.app;
      if (appParams) {
        return {
          publisher: {
            id: pubId.toString(),
          },
          id: appParams.id,
          name: appParams.name,
          bundle: appParams.bundle,
          storeurl: appParams.storeUrl,
          domain: appParams.domain,
          cat: appParams.cat || params.category,
          pagecat: appParams.pagecat || params.page_category
        };
      }
    }
    return null;
  },

  /**
   * create the device object
   */
  _getDeviceObject: (request) => {
    var params = request && request.params ? request.params : null;
    if (params) {
      return {
        dnt: utils.getDNT() ? 1 : 0,
        ua: navigator.userAgent,
        language: (navigator.language || navigator.browserLanguage || navigator.userLanguage || navigator.systemLanguage),
        w: (window.screen.width || window.innerWidth),
        h: (window.screen.height || window.innerHeigh),
        geo: {
          country: params.country,
          lat: params.latitude,
          lon: params.longitude,
          accuracy: params.accuracy,
          region: params.region,
          city: params.city,
          zip: params.zip
        },
        ip: params.ip,
        make: params.make,
        model: params.model,
        os: params.os,
        carrier: params.carrier,
        devicetype: params.device_type,
        ifa: params.ifa,
      };
    }
    return null;
  },

  /**
   * create source object
   */
  _getSourceObject: (request) => {
    var params = request && request.params ? request.params : null;
    if (params) {
      return {
        pchain: params.pchain,
        ext: {
          schain: request.schain
        },
      };
    }
    return null;
  },

  /**
   * get request ad sizes
   */
  _getSizes: (request) => {
    if (request && request.sizes && utils.isArray(request.sizes[0]) && request.sizes[0].length > 0) {
      return request.sizes[0];
    }
    return null;
  },

  /**
   * create the banner object
   */
  _getBannerRequest: (bid) => {
    var bObj;
    var adFormat = [];
    if (utils.deepAccess(bid, 'mediaTypes.banner')) {
      var params = bid ? bid.params : null;
      var bannerData = params && params.banner;
      var sizes = spec._getSizes(bid) || [];
      if (sizes && sizes.length == 0) {
        sizes = bid.mediaTypes.banner.sizes[0];
      }
      if (sizes && sizes.length > 0) {
        bObj = {};
        bObj.w = sizes[0];
        bObj.h = sizes[1];
        bObj.pos = 0;
        if (bannerData) {
          bObj = utils.deepClone(bannerData);
        }
        sizes = bid.mediaTypes.banner.sizes;
        if (sizes.length > 0) {
          adFormat = [];
          sizes.forEach(function (size) {
            if (size.length > 1) {
              adFormat.push({ w: size[0], h: size[1] });
            }
          });
          if (adFormat.length > 0) {
            bObj.format = adFormat;
          }
        }
      } else {
        utils.logWarn(LOG_WARN_PREFIX + 'Error: mediaTypes.banner.sizes missing for adunit: ' + bid.params.adunitId);
      }
    }
    return bObj;
  },

  /**
   * create the video object
   */
  _getVideoRequest: (bid) => {
    var vObj;
    if (utils.deepAccess(bid, 'mediaTypes.video')) {
      var params = bid ? bid.params : null;
      var videoData = utils.mergeDeep(utils.deepAccess(bid.mediaTypes, 'video'), params.video);
      var sizes = bid.mediaTypes.video ? bid.mediaTypes.video.playerSize : []
      if (sizes && sizes.length > 0) {
        vObj = {};
        if (videoData) {
          vObj = utils.deepClone(videoData);
        }
        vObj.w = sizes[0];
        vObj.h = sizes[1];
      } else {
        utils.logWarn(LOG_WARN_PREFIX + 'Error: mediaTypes.video.sizes missing for adunit: ' + bid.params.adunitId);
      }
    }
    return vObj;
  },

  /**
   * check media type
   */
  _checkMediaType: (adm, newBid) => {
    // Create a regex here to check the strings
    var videoRegex = new RegExp(/VAST.*version/);
    if (videoRegex.test(adm)) {
      newBid.mediaType = VIDEO;
    } else {
      newBid.mediaType = BANNER;
    }
  }
};

registerBidder(spec);
