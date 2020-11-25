import * as utils from '../src/utils.js';
import { config } from '../src/config.js';
import { registerBidder } from '../src/adapters/bidderFactory.js';
import { BANNER, VIDEO, NATIVE } from '../src/mediaTypes.js';
const NET_REVENUE = false;
const VERSION = '0.0.1';
const UNDEFINED = undefined;
const DEFAULT_CURRENCY = 'USD';
const AUCTION_TYPE = 1;
const BIDDER_CODE = 'pubwise';
const ENDPOINT_URL = 'https://bid.pubwise.io/prebid';
const LOG_WARN_PREFIX = 'PubWise: ';
const DEFAULT_WIDTH = 0;
const DEFAULT_HEIGHT = 0;
const PREBID_NATIVE_HELP_LINK = 'http://prebid.org/dev-docs/show-native-ads.html';
// const USERSYNC_URL = '//127.0.0.1:8080/usersync'

const CUSTOM_PARAMS = {
  'gender': '', // User gender
  'yob': '', // User year of birth
  'lat': '', // User location - Latitude
  'lon': '', // User Location - Longitude
};

const NATIVE_ASSETS = {
  'TITLE': { ID: 1, KEY: 'title', TYPE: 0 },
  'IMAGE': { ID: 2, KEY: 'image', TYPE: 0 },
  'ICON': { ID: 3, KEY: 'icon', TYPE: 0 },
  'SPONSOREDBY': { ID: 4, KEY: 'sponsoredBy', TYPE: 1 },
  'BODY': { ID: 5, KEY: 'body', TYPE: 2 },
  'CLICKURL': { ID: 6, KEY: 'clickUrl', TYPE: 0 },
  'VIDEO': { ID: 7, KEY: 'video', TYPE: 0 },
  'EXT': { ID: 8, KEY: 'ext', TYPE: 0 },
  'DATA': { ID: 9, KEY: 'data', TYPE: 0 },
  'LOGO': { ID: 10, KEY: 'logo', TYPE: 0 },
  'SPONSORED': { ID: 11, KEY: 'sponsored', TYPE: 1 },
  'DESC': { ID: 12, KEY: 'data', TYPE: 2 },
  'RATING': { ID: 13, KEY: 'rating', TYPE: 3 },
  'LIKES': { ID: 14, KEY: 'likes', TYPE: 4 },
  'DOWNLOADS': { ID: 15, KEY: 'downloads', TYPE: 5 },
  'PRICE': { ID: 16, KEY: 'price', TYPE: 6 },
  'SALEPRICE': { ID: 17, KEY: 'saleprice', TYPE: 7 },
  'PHONE': { ID: 18, KEY: 'phone', TYPE: 8 },
  'ADDRESS': { ID: 19, KEY: 'address', TYPE: 9 },
  'DESC2': { ID: 20, KEY: 'desc2', TYPE: 10 },
  'DISPLAYURL': { ID: 21, KEY: 'displayurl', TYPE: 11 },
  'CTA': { ID: 22, KEY: 'cta', TYPE: 12 }
};

const NATIVE_ASSET_IMAGE_TYPE = {
  'ICON': 1,
  'LOGO': 2,
  'IMAGE': 3
}

// to render any native unit we have to have a few items
const NATIVE_MINIMUM_REQUIRED_IMAGE_ASSETS = [
  {
    id: NATIVE_ASSETS.SPONSOREDBY.ID,
    required: true,
    data: {
      type: 1
    }
  },
  {
    id: NATIVE_ASSETS.TITLE.ID,
    required: true,
  },
  {
    id: NATIVE_ASSETS.IMAGE.ID,
    required: true,
  }
]

let isInvalidNativeRequest = false
let NATIVE_ASSET_ID_TO_KEY_MAP = {};
let NATIVE_ASSET_KEY_TO_ASSET_MAP = {};

// together allows traversal of NATIVE_ASSETS_LIST in any direction
// id -> key
utils._each(NATIVE_ASSETS, anAsset => { NATIVE_ASSET_ID_TO_KEY_MAP[anAsset.ID] = anAsset.KEY });
// key -> asset
utils._each(NATIVE_ASSETS, anAsset => { NATIVE_ASSET_KEY_TO_ASSET_MAP[anAsset.KEY] = anAsset });

export const spec = {
  code: BIDDER_CODE,
  supportedMediaTypes: [BANNER, NATIVE],
  /**
   * Determines whether or not the given bid request is valid.
   *
   * @param {BidRequest} bid The bid params to validate.
   * @return boolean True if this is a valid bid, and false otherwise.
   */
  isBidRequestValid: function (bid) {
    if (bid.params && bid.params) {
      if (!utils.isStr(bid.params.siteId)) {
        utils.logWarn('siteId is required for bid', bid);
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
  buildRequests: function (validBidRequests, bidderRequest) {
    var refererInfo;
    if (bidderRequest && bidderRequest.refererInfo) {
      refererInfo = bidderRequest.refererInfo;
    }
    var conf = _initConf(refererInfo);
    var payload = _createOrtbTemplate(conf);
    var bidCurrency = '';
    var dctrArr = [];
    var bid;
    var blockedIabCategories = [];

    validBidRequests.forEach(originalBid => {
      bid = utils.deepClone(originalBid);
      bid.params.adSlot = bid.params.adSlot || '';
      _parseAdSlot(bid);
      if (bid.params.hasOwnProperty('video')) {
        // Nothing to do
      } else {
        // If we have a native mediaType configured alongside banner, its ok if the banner size is not set in width and height
        // The corresponding banner imp object will not be generated, but we still want the native object to be sent, hence the following check
        if (!(bid.hasOwnProperty('mediaTypes') && bid.mediaTypes.hasOwnProperty(NATIVE)) && bid.params.width === 0 && bid.params.height === 0) {
          utils.logWarn(LOG_WARN_PREFIX + 'Skipping the non-standard adslot: ', bid.params.adSlot, JSON.stringify(bid));
          return;
        }
      }
      conf = _handleCustomParams(bid.params, conf);
      conf.transactionId = bid.transactionId;
      if (bidCurrency === '') {
        bidCurrency = bid.params.currency || UNDEFINED;
      } else if (bid.params.hasOwnProperty('currency') && bidCurrency !== bid.params.currency) {
        utils.logWarn(LOG_WARN_PREFIX + 'Currency specifier ignored. Only one currency permitted.');
      }
      bid.params.currency = bidCurrency;
      // check if dctr is added to more than 1 adunit
      if (bid.params.hasOwnProperty('dctr') && utils.isStr(bid.params.dctr)) {
        dctrArr.push(bid.params.dctr);
      }
      if (bid.params.hasOwnProperty('bcat') && utils.isArray(bid.params.bcat)) {
        blockedIabCategories = blockedIabCategories.concat(bid.params.bcat);
      }
      var impObj = _createImpressionObject(bid, conf);
      if (impObj) {
        payload.imp.push(impObj);
      }
    });

    if (payload.imp.length == 0) {
      return;
    }

    payload.site.publisher.id = bid.params.siteId.trim();
    payload.user.gender = (conf.gender ? conf.gender.trim() : UNDEFINED);
    payload.user.geo = {};
    payload.user.geo.lat = _parseSlotParam('lat', conf.lat);
    payload.user.geo.lon = _parseSlotParam('lon', conf.lon);
    payload.user.yob = _parseSlotParam('yob', conf.yob);
    payload.device.geo = payload.user.geo;
    payload.site.page = conf.kadpageurl.trim() || payload.site.page.trim();
    payload.site.domain = _getDomainFromURL(payload.site.page);

    // add the content object from config in request
    if (typeof config.getConfig('content') === 'object') {
      payload.site.content = config.getConfig('content');
    }

    // merge the device from config.getConfig('device')
    if (typeof config.getConfig('device') === 'object') {
      payload.device = Object.assign(payload.device, config.getConfig('device'));
    }

    // passing transactionId in source.tid
    utils.deepSetValue(payload, 'source.tid', conf.transactionId);

    // test bids
    if (window.location.href.indexOf('pubmaticTest=true') !== -1) {
      payload.test = 1;
    }

    // adding schain object
    if (validBidRequests[0].schain) {
      utils.deepSetValue(payload, 'source.ext.schain', validBidRequests[0].schain);
    }

    // Attaching GDPR Consent Params
    if (bidderRequest && bidderRequest.gdprConsent) {
      utils.deepSetValue(payload, 'user.ext.consent', bidderRequest.gdprConsent.consentString);
      utils.deepSetValue(payload, 'regs.ext.gdpr', (bidderRequest.gdprConsent.gdprApplies ? 1 : 0));
    }

    // CCPA
    if (bidderRequest && bidderRequest.uspConsent) {
      utils.deepSetValue(payload, 'regs.ext.us_privacy', bidderRequest.uspConsent);
    }

    // coppa compliance
    if (config.getConfig('coppa') === true) {
      utils.deepSetValue(payload, 'regs.coppa', 1);
    }

    var options = {contentType: 'application/json'}
    if (!_hasPurpose1Consent(bidderRequest)) {
      options.withCredentials = false
    }

    return {
      method: 'POST',
      url: ENDPOINT_URL,
      data: payload,
      options: options,
      bidderRequest: bidderRequest,
    };
  },
  /**
   * Unpack the response from the server into a list of bids.
   *
   * @param {ServerResponse} serverResponse A successful response from the server.
   * @return {Bid[]} An array of bids which were nested inside the server.
   */
  interpretResponse: function (response, request) {
    const bidResponses = [];
    var respCur = DEFAULT_CURRENCY;
    utils.logInfo(request);
    let parsedRequest = request.data;
    // let parsedReferrer = parsedRequest.site && parsedRequest.site.ref ? parsedRequest.site.ref : '';

    try {
      if (response.body && response.body.seatbid && utils.isArray(response.body.seatbid)) {
        // Supporting multiple bid responses for same adSize
        respCur = response.body.cur || respCur;
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
                currency: respCur,
                netRevenue: NET_REVENUE,
                ttl: 300,
                ad: bid.adm,
                pm_seat: seatbidder.seat || null,
                pm_dspid: bid.ext && bid.ext.dspid ? bid.ext.dspid : null,
                partnerImpId: bid.id || '' // partner impression Id
              };
              if (parsedRequest.imp && parsedRequest.imp.length > 0) {
                parsedRequest.imp.forEach(req => {
                  if (bid.impid === req.id) {
                    _checkMediaType(bid.adm, newBid);
                    switch (newBid.mediaType) {
                      case BANNER:
                        break;
                      case NATIVE:
                        _parseNativeResponse(bid, newBid);
                        break;
                    }
                  }
                });
              }

              newBid.meta = {};
              if (bid.ext && bid.ext.dspid) {
                newBid.meta.networkId = bid.ext.dspid;
              }
              if (bid.ext && bid.ext.advid) {
                newBid.meta.buyerId = bid.ext.advid;
              }
              if (bid.adomain && bid.adomain.length > 0) {
                newBid.meta.advertiserDomains = bid.adomain;
                newBid.meta.clickUrl = bid.adomain[0];
              }

              // adserverTargeting
              if (seatbidder.ext && seatbidder.ext.buyid) {
                newBid.adserverTargeting = {
                  'hb_buyid_pubmatic': seatbidder.ext.buyid
                };
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
   * Register the user sync pixels which should be dropped after the auction.
   *
   * @param {SyncOptions} syncOptions Which user syncs are allowed?
   * @param {ServerResponse[]} serverResponses List of server's responses.
   * @return {UserSync[]} The user syncs which should be dropped.
   */
  getUserSyncs: function (syncOptions, serverResponses, gdprConsent, uspConsent) {
    const syncs = []

    return syncs;
  }
}

function _checkMediaType(adm, newBid) {
  // Create a regex here to check the strings
  var admStr = '';
  var videoRegex = new RegExp(/VAST\s+version/);
  if (adm.indexOf('span class="PubAPIAd"') >= 0) {
    newBid.mediaType = BANNER;
  } else if (videoRegex.test(adm)) {
    newBid.mediaType = VIDEO;
  } else {
    try {
      admStr = JSON.parse(adm.replace(/\\/g, ''));
      if (admStr && admStr.native) {
        newBid.mediaType = NATIVE;
      }
    } catch (e) {
      utils.logWarn(LOG_WARN_PREFIX + 'Error: Cannot parse native reponse for ad response: ' + adm);
    }
  }
}

function _parseNativeResponse(bid, newBid) {
  newBid.native = {};
  if (bid.hasOwnProperty('adm')) {
    var adm = '';
    try {
      adm = JSON.parse(bid.adm.replace(/\\/g, ''));
    } catch (ex) {
      utils.logWarn(LOG_WARN_PREFIX + 'Error: Cannot parse native reponse for ad response: ' + newBid.adm);
      return;
    }
    if (adm && adm.native && adm.native.assets && adm.native.assets.length > 0) {
      newBid.mediaType = NATIVE;
      for (let i = 0, len = adm.native.assets.length; i < len; i++) {
        switch (adm.native.assets[i].id) {
          case NATIVE_ASSETS.TITLE.ID:
            newBid.native.title = adm.native.assets[i].title && adm.native.assets[i].title.text;
            break;
          case NATIVE_ASSETS.IMAGE.ID:
            newBid.native.image = {
              url: adm.native.assets[i].img && adm.native.assets[i].img.url,
              height: adm.native.assets[i].img && adm.native.assets[i].img.h,
              width: adm.native.assets[i].img && adm.native.assets[i].img.w,
            };
            break;
          case NATIVE_ASSETS.ICON.ID:
            newBid.native.icon = {
              url: adm.native.assets[i].img && adm.native.assets[i].img.url,
              height: adm.native.assets[i].img && adm.native.assets[i].img.h,
              width: adm.native.assets[i].img && adm.native.assets[i].img.w,
            };
            break;
          case NATIVE_ASSETS.SPONSOREDBY.ID:
          case NATIVE_ASSETS.BODY.ID:
          case NATIVE_ASSETS.LIKES.ID:
          case NATIVE_ASSETS.DOWNLOADS.ID:
          case NATIVE_ASSETS.PRICE:
          case NATIVE_ASSETS.SALEPRICE.ID:
          case NATIVE_ASSETS.PHONE.ID:
          case NATIVE_ASSETS.ADDRESS.ID:
          case NATIVE_ASSETS.DESC2.ID:
          case NATIVE_ASSETS.CTA.ID:
          case NATIVE_ASSETS.RATING.ID:
          case NATIVE_ASSETS.DISPLAYURL.ID:
            newBid.native[NATIVE_ASSET_ID_TO_KEY_MAP[adm.native.assets[i].id]] = adm.native.assets[i].data && adm.native.assets[i].data.value;
            break;
        }
      }
      newBid.native.clickUrl = adm.native.link && adm.native.link.url;
      newBid.native.clickTrackers = (adm.native.link && adm.native.link.clicktrackers) || [];
      newBid.native.impressionTrackers = adm.native.imptrackers || [];
      newBid.native.jstracker = adm.native.jstracker || [];
      if (!newBid.width) {
        newBid.width = DEFAULT_WIDTH;
      }
      if (!newBid.height) {
        newBid.height = DEFAULT_HEIGHT;
      }
    }
  }
}

function _getDomainFromURL(url) {
  let anchor = document.createElement('a');
  anchor.href = url;
  return anchor.hostname;
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
          utils.logWarn(LOG_WARN_PREFIX + 'Ignoring param : ' + key + ' with value : ' + CUSTOM_PARAMS[key] + ', expects string-value, found ' + typeof value);
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
    ext: {
      version: VERSION
    }
  };
}

function _createImpressionObject(bid, conf) {
  var impObj = {};
  var bannerObj;
  var nativeObj = {};
  var sizes = bid.hasOwnProperty('sizes') ? bid.sizes : [];
  var mediaTypes = '';
  var format = [];

  impObj = {
    id: bid.bidId,
    tagid: bid.params.adUnit || undefined,
    bidfloor: _parseSlotParam('kadfloor', bid.params.kadfloor),
    secure: 1,
    ext: {
      pmZoneId: _parseSlotParam('pmzoneid', bid.params.pmzoneid)
    },
    bidfloorcur: bid.params.currency ? _parseSlotParam('currency', bid.params.currency) : DEFAULT_CURRENCY
  };

  if (bid.hasOwnProperty('mediaTypes')) {
    for (mediaTypes in bid.mediaTypes) {
      switch (mediaTypes) {
        case BANNER:
          bannerObj = _createBannerRequest(bid);
          if (bannerObj !== UNDEFINED) {
            impObj.banner = bannerObj;
          }
          break;
        case NATIVE:
          nativeObj['request'] = JSON.stringify(_createNativeRequest(bid.nativeParams));
          if (!isInvalidNativeRequest) {
            impObj.native = nativeObj;
          } else {
            utils.logWarn(LOG_WARN_PREFIX + 'Error: Error in Native adunit ' + bid.params.adUnit + '. Ignoring the adunit. Refer to ' + PREBID_NATIVE_HELP_LINK + ' for more details.');
          }
          break;
      }
    }
  } else {
    // mediaTypes is not present, so this is a banner only impression
    // this part of code is required for older testcases with no 'mediaTypes' to run succesfully.
    bannerObj = {
      pos: 0,
      w: bid.params.width,
      h: bid.params.height,
      topframe: utils.inIframe() ? 0 : 1
    };
    if (utils.isArray(sizes) && sizes.length > 1) {
      sizes = sizes.splice(1, sizes.length - 1);
      sizes.forEach(size => {
        format.push({
          w: size[0],
          h: size[1]
        });
      });
      bannerObj.format = format;
    }
    impObj.banner = bannerObj;
  }

  _addFloorFromFloorModule(impObj, bid);

  return impObj.hasOwnProperty(BANNER) ||
          impObj.hasOwnProperty(NATIVE) ||
            impObj.hasOwnProperty(VIDEO) ? impObj : UNDEFINED;
}

function _parseSlotParam(paramName, paramValue) {
  if (!utils.isStr(paramValue)) {
    paramValue && utils.logWarn(LOG_WARN_PREFIX + 'Ignoring param key: ' + paramName + ', expects string-value, found ' + typeof paramValue);
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

function _parseAdSlot(bid) {
  bid.params.adUnit = '';
  bid.params.adUnitIndex = '0';
  bid.params.width = 0;
  bid.params.height = 0;
  bid.params.adSlot = _cleanSlotName(bid.params.adSlot);

  var slot = bid.params.adSlot;
  var splits = slot.split(':');

  slot = splits[0];
  if (splits.length == 2) {
    bid.params.adUnitIndex = splits[1];
  }
  // check if size is mentioned in sizes array. in that case do not check for @ in adslot
  splits = slot.split('@');
  bid.params.adUnit = splits[0];
  if (splits.length > 1) {
    // i.e size is specified in adslot, so consider that and ignore sizes array
    splits = splits[1].split('x');
    if (splits.length != 2) {
      utils.logWarn('AdSlot Error: adSlot not in required format');
      return;
    }
    bid.params.width = parseInt(splits[0], 10);
    bid.params.height = parseInt(splits[1], 10);
  } else if (bid.hasOwnProperty('mediaTypes') &&
         bid.mediaTypes.hasOwnProperty(BANNER) &&
          bid.mediaTypes.banner.hasOwnProperty('sizes')) {
    var i = 0;
    var sizeArray = [];
    for (;i < bid.mediaTypes.banner.sizes.length; i++) {
      if (bid.mediaTypes.banner.sizes[i].length === 2) { // sizes[i].length will not be 2 in case where size is set as fluid, we want to skip that entry
        sizeArray.push(bid.mediaTypes.banner.sizes[i]);
      }
    }
    bid.mediaTypes.banner.sizes = sizeArray;
    if (bid.mediaTypes.banner.sizes.length >= 1) {
      // set the first size in sizes array in bid.params.width and bid.params.height. These will be sent as primary size.
      // The rest of the sizes will be sent in format array.
      bid.params.width = bid.mediaTypes.banner.sizes[0][0];
      bid.params.height = bid.mediaTypes.banner.sizes[0][1];
      bid.mediaTypes.banner.sizes = bid.mediaTypes.banner.sizes.splice(1, bid.mediaTypes.banner.sizes.length - 1);
    }
  }
}

function _cleanSlotName(slotName) {
  if (utils.isStr(slotName)) {
    return slotName.replace(/^\s+/g, '').replace(/\s+$/g, '');
  }
  return '';
}

function _initConf(refererInfo) {
  return {
    pageURL: (refererInfo && refererInfo.referer) ? refererInfo.referer : window.location.href,
    refURL: window.document.referrer
  };
}

function _commonNativeRequestObject(nativeAsset, params) {
  var key = nativeAsset.KEY;
  return {
    id: nativeAsset.ID,
    required: params[key].required ? 1 : 0,
    data: {
      type: nativeAsset.TYPE,
      len: params[key].len,
      ext: params[key].ext
    }
  };
}

function _addFloorFromFloorModule(impObj, bid) {
  let bidFloor = -1; // indicates no floor

  // get lowest floor from floorModule
  if (typeof bid.getFloor === 'function' && !config.getConfig('pubwise.disableFloors')) {
    [BANNER, NATIVE].forEach(mediaType => {
      if (impObj.hasOwnProperty(mediaType)) {
        let floorInfo = bid.getFloor({ currency: impObj.bidfloorcur, mediaType: mediaType, size: '*' });
        if (typeof floorInfo === 'object' && floorInfo.currency === impObj.bidfloorcur && !isNaN(parseInt(floorInfo.floor))) {
          let mediaTypeFloor = parseFloat(floorInfo.floor);
          bidFloor = (bidFloor == -1 ? mediaTypeFloor : Math.min(mediaTypeFloor, bidFloor))
        }
      }
    });
  }

  // get highest, if none then take the default -1
  if (impObj.bidfloor) {
    bidFloor = Math.max(bidFloor, impObj.bidfloor)
  }

  // assign if it has a valid floor - > 0
  impObj.bidfloor = ((!isNaN(bidFloor) && bidFloor > 0) ? bidFloor : UNDEFINED);
}

function _createNativeRequest(params) {
  var nativeRequestObject = {
    assets: []
  };
  for (var key in params) {
    if (params.hasOwnProperty(key)) {
      var assetObj = {};
      if (!(nativeRequestObject.assets && nativeRequestObject.assets.length > 0 && nativeRequestObject.assets.hasOwnProperty(key))) {
        switch (key) {
          case NATIVE_ASSETS.TITLE.KEY:
            if (params[key].len || params[key].length) {
              assetObj = {
                id: NATIVE_ASSETS.TITLE.ID,
                required: params[key].required ? 1 : 0,
                title: {
                  len: params[key].len || params[key].length,
                  ext: params[key].ext
                }
              };
            } else {
              utils.logWarn(LOG_WARN_PREFIX + 'Error: Title Length is required for native ad: ' + JSON.stringify(params));
            }
            break;
          case NATIVE_ASSETS.IMAGE.KEY:
            if (params[key].sizes && params[key].sizes.length > 0) {
              assetObj = {
                id: NATIVE_ASSETS.IMAGE.ID,
                required: params[key].required ? 1 : 0,
                img: {
                  type: NATIVE_ASSET_IMAGE_TYPE.IMAGE,
                  w: params[key].w || params[key].width || (params[key].sizes ? params[key].sizes[0] : UNDEFINED),
                  h: params[key].h || params[key].height || (params[key].sizes ? params[key].sizes[1] : UNDEFINED),
                  wmin: params[key].wmin || params[key].minimumWidth || (params[key].minsizes ? params[key].minsizes[0] : UNDEFINED),
                  hmin: params[key].hmin || params[key].minimumHeight || (params[key].minsizes ? params[key].minsizes[1] : UNDEFINED),
                  mimes: params[key].mimes,
                  ext: params[key].ext,
                }
              };
            } else {
              utils.logWarn(LOG_WARN_PREFIX + 'Error: Image sizes is required for native ad: ' + JSON.stringify(params));
            }
            break;
          case NATIVE_ASSETS.ICON.KEY:
            if (params[key].sizes && params[key].sizes.length > 0) {
              assetObj = {
                id: NATIVE_ASSETS.ICON.ID,
                required: params[key].required ? 1 : 0,
                img: {
                  type: NATIVE_ASSET_IMAGE_TYPE.ICON,
                  w: params[key].w || params[key].width || (params[key].sizes ? params[key].sizes[0] : UNDEFINED),
                  h: params[key].h || params[key].height || (params[key].sizes ? params[key].sizes[1] : UNDEFINED),
                }
              };
            } else {
              utils.logWarn(LOG_WARN_PREFIX + 'Error: Icon sizes is required for native ad: ' + JSON.stringify(params));
            };
            break;
          case NATIVE_ASSETS.VIDEO.KEY:
            assetObj = {
              id: NATIVE_ASSETS.VIDEO.ID,
              required: params[key].required ? 1 : 0,
              video: {
                minduration: params[key].minduration,
                maxduration: params[key].maxduration,
                protocols: params[key].protocols,
                mimes: params[key].mimes,
                ext: params[key].ext
              }
            };
            break;
          case NATIVE_ASSETS.EXT.KEY:
            assetObj = {
              id: NATIVE_ASSETS.EXT.ID,
              required: params[key].required ? 1 : 0,
            };
            break;
          case NATIVE_ASSETS.LOGO.KEY:
            assetObj = {
              id: NATIVE_ASSETS.LOGO.ID,
              required: params[key].required ? 1 : 0,
              img: {
                type: NATIVE_ASSET_IMAGE_TYPE.LOGO,
                w: params[key].w || params[key].width || (params[key].sizes ? params[key].sizes[0] : UNDEFINED),
                h: params[key].h || params[key].height || (params[key].sizes ? params[key].sizes[1] : UNDEFINED)
              }
            };
            break;
          case NATIVE_ASSETS.SPONSOREDBY.KEY:
          case NATIVE_ASSETS.BODY.KEY:
          case NATIVE_ASSETS.RATING.KEY:
          case NATIVE_ASSETS.LIKES.KEY:
          case NATIVE_ASSETS.DOWNLOADS.KEY:
          case NATIVE_ASSETS.PRICE.KEY:
          case NATIVE_ASSETS.SALEPRICE.KEY:
          case NATIVE_ASSETS.PHONE.KEY:
          case NATIVE_ASSETS.ADDRESS.KEY:
          case NATIVE_ASSETS.DESC2.KEY:
          case NATIVE_ASSETS.DISPLAYURL.KEY:
          case NATIVE_ASSETS.CTA.KEY:
            assetObj = _commonNativeRequestObject(NATIVE_ASSET_KEY_TO_ASSET_MAP[key], params);
            break;
        }
      }
    }
    if (assetObj && assetObj.id) {
      nativeRequestObject.assets[nativeRequestObject.assets.length] = assetObj;
    }
  };

  // for native image adtype prebid has to have few required assests i.e. title,sponsoredBy, image
  // if any of these are missing from the request then request will not be sent
  var requiredAssetCount = NATIVE_MINIMUM_REQUIRED_IMAGE_ASSETS.length;
  var presentrequiredAssetCount = 0;
  NATIVE_MINIMUM_REQUIRED_IMAGE_ASSETS.forEach(ele => {
    var lengthOfExistingAssets = nativeRequestObject.assets.length;
    for (var i = 0; i < lengthOfExistingAssets; i++) {
      if (ele.id == nativeRequestObject.assets[i].id) {
        presentrequiredAssetCount++;
        break;
      }
    }
  });
  if (requiredAssetCount == presentrequiredAssetCount) {
    isInvalidNativeRequest = false;
  } else {
    isInvalidNativeRequest = true;
  }
  return nativeRequestObject;
}

function _createBannerRequest(bid) {
  var sizes = bid.mediaTypes.banner.sizes;
  var format = [];
  var bannerObj;
  if (sizes !== UNDEFINED && utils.isArray(sizes)) {
    bannerObj = {};
    if (!bid.params.width && !bid.params.height) {
      if (sizes.length === 0) {
        // i.e. since bid.params does not have width or height, and length of sizes is 0, need to ignore this banner imp
        bannerObj = UNDEFINED;
        utils.logWarn(LOG_WARN_PREFIX + 'Error: mediaTypes.banner.size missing for adunit: ' + bid.params.adUnit + '. Ignoring the banner impression in the adunit.');
        return bannerObj;
      } else {
        bannerObj.w = parseInt(sizes[0][0], 10);
        bannerObj.h = parseInt(sizes[0][1], 10);
        sizes = sizes.splice(1, sizes.length - 1);
      }
    } else {
      bannerObj.w = bid.params.width;
      bannerObj.h = bid.params.height;
    }
    if (sizes.length > 0) {
      format = [];
      sizes.forEach(function (size) {
        if (size.length > 1) {
          format.push({ w: size[0], h: size[1] });
        }
      });
      if (format.length > 0) {
        bannerObj.format = format;
      }
    }
    bannerObj.pos = 0;
    bannerObj.topframe = utils.inIframe() ? 0 : 1;
  } else {
    utils.logWarn(LOG_WARN_PREFIX + 'Error: mediaTypes.banner.size missing for adunit: ' + bid.params.adUnit + '. Ignoring the banner impression in the adunit.');
    bannerObj = UNDEFINED;
  }
  return bannerObj;
}

function _hasPurpose1Consent(bidderRequest) {
  let result = true;
  if (bidderRequest && bidderRequest.gdprConsent) {
    if (bidderRequest.gdprConsent.gdprApplies && bidderRequest.gdprConsent.apiVersion === 2) {
      result = !!(utils.deepAccess(bidderRequest.gdprConsent, 'vendorData.purpose.consents.1') === true);
    }
  }
  return result;
}

registerBidder(spec);
