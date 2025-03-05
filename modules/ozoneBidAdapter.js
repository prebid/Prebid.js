import {
  logInfo,
  logError,
  deepAccess,
  logWarn,
  deepSetValue,
  isArray,
  contains,
  mergeDeep,
  parseUrl,
  generateUUID, isInteger, deepClone, getBidIdParameter
} from '../src/utils.js';
import { registerBidder } from '../src/adapters/bidderFactory.js';
import { BANNER, NATIVE, VIDEO } from '../src/mediaTypes.js';
import {config} from '../src/config.js';
import {getPriceBucketString} from '../src/cpmBucketManager.js';
import { Renderer } from '../src/Renderer.js';
import {getRefererInfo} from '../src/refererDetection.js';
const BIDDER_CODE = 'ozone';
const ORIGIN = 'https://elb.the-ozone-project.com'; // applies only to auction & cookie
const AUCTIONURI = '/openrtb2/auction';
const OZONECOOKIESYNC = '/static/load-cookie.html';
const OZONE_RENDERER_URL = 'https://prebid.the-ozone-project.com/ozone-renderer.js';
const ORIGIN_DEV = 'https://test.ozpr.net';
const OZONEVERSION = '2.9.5';
export const spec = {
  gvlid: 524,
  aliases: [{code: 'venatus', gvlid: 524}],
  version: OZONEVERSION,
  code: BIDDER_CODE,
  supportedMediaTypes: [VIDEO, BANNER],
  cookieSyncBag: {publisherId: null, siteId: null, userIdObject: {}}, // variables we want to make available to cookie sync
  propertyBag: {pageId: null, buildRequestsStart: 0, buildRequestsEnd: 0, endpointOverride: null}, /* allow us to store vars in instance scope - needs to be an object to be mutable */
  whitelabel_defaults: {
    'logId': 'OZONE',
    'bidder': 'ozone',
    'keyPrefix': 'oz',
    'auctionUrl': ORIGIN + AUCTIONURI,
    'cookieSyncUrl': ORIGIN + OZONECOOKIESYNC,
    'rendererUrl': OZONE_RENDERER_URL,
    'batchRequests': false /* you can change this to true OR numeric OR override it in the config: config.ozone.batchRequests = true/false/number */
  },
  loadWhitelabelData(bid) {
    if (this.propertyBag.whitelabel) { return; }
    this.propertyBag.whitelabel = JSON.parse(JSON.stringify(this.whitelabel_defaults));
    let bidder = bid.bidder || 'ozone'; // eg. ozone
    this.propertyBag.whitelabel.logId = bidder.toUpperCase();
    this.propertyBag.whitelabel.bidder = bidder;
    let bidderConfig = config.getConfig(bidder) || {};
    logInfo('got bidderConfig: ', deepClone(bidderConfig));
    if (bidderConfig.kvpPrefix) {
      this.propertyBag.whitelabel.keyPrefix = bidderConfig.kvpPrefix;
    }
    let arr = this.getGetParametersAsObject();
    if (bidderConfig.endpointOverride) {
      if (bidderConfig.endpointOverride.origin) {
        this.propertyBag.endpointOverride = bidderConfig.endpointOverride.origin;
        this.propertyBag.whitelabel.auctionUrl = bidderConfig.endpointOverride.origin + AUCTIONURI;
        this.propertyBag.whitelabel.cookieSyncUrl = bidderConfig.endpointOverride.origin + OZONECOOKIESYNC;
      }
      if (arr.hasOwnProperty('renderer')) {
        if (arr.renderer.match('%3A%2F%2F')) {
          this.propertyBag.whitelabel.rendererUrl = decodeURIComponent(arr['renderer']);
        } else {
          this.propertyBag.whitelabel.rendererUrl = arr['renderer'];
        }
      } else if (bidderConfig.endpointOverride.rendererUrl) {
        this.propertyBag.whitelabel.rendererUrl = bidderConfig.endpointOverride.rendererUrl;
      }
      if (bidderConfig.endpointOverride.cookieSyncUrl) {
        this.propertyBag.whitelabel.cookieSyncUrl = bidderConfig.endpointOverride.cookieSyncUrl;
      }
      if (bidderConfig.endpointOverride.auctionUrl) {
        this.propertyBag.endpointOverride = bidderConfig.endpointOverride.auctionUrl;
        this.propertyBag.whitelabel.auctionUrl = bidderConfig.endpointOverride.auctionUrl;
      }
    }
    if (bidderConfig.hasOwnProperty('batchRequests')) {
      if (this.batchValueIsValid(bidderConfig.batchRequests)) {
        this.propertyBag.whitelabel.batchRequests = bidderConfig.batchRequests;
      } else {
        logError('invalid config: batchRequest');
      }
    }
    if (bidderConfig.hasOwnProperty('videoParams')) {
      this.propertyBag.whitelabel.videoParams = bidderConfig.videoParams;
    }
    if (arr.hasOwnProperty('batchRequests')) {
      let getBatch = parseInt(arr.batchRequests);
      if (this.batchValueIsValid(getBatch)) {
        this.propertyBag.whitelabel.batchRequests = getBatch;
      } else {
        logError('invalid GET: batchRequests');
      }
    }
    try {
      if (arr.hasOwnProperty('auction') && arr.auction === 'dev') {
        logInfo('GET: auction=dev');
        this.propertyBag.whitelabel.auctionUrl = ORIGIN_DEV + AUCTIONURI;
      }
      if (arr.hasOwnProperty('cookiesync') && arr.cookiesync === 'dev') {
        logInfo('GET: cookiesync=dev');
        this.propertyBag.whitelabel.cookieSyncUrl = ORIGIN_DEV + OZONECOOKIESYNC;
      }
    } catch (e) {}
    logInfo('whitelabel: ', this.propertyBag.whitelabel);
  },
  batchValueIsValid(batch) {
    return typeof batch === 'boolean' || (typeof batch === 'number' && batch > 0);
  },
  getAuctionUrl() {
    return this.propertyBag.whitelabel.auctionUrl;
  },
  getCookieSyncUrl() {
    return this.propertyBag.whitelabel.cookieSyncUrl;
  },
  getRendererUrl() {
    return this.propertyBag.whitelabel.rendererUrl;
  },
  getVideoPlacementValue: function(context) {
    if (['instream', 'outstream'].indexOf(context) < 0) return null; /* do not allow arbitrary strings */
    return deepAccess(this.propertyBag, `whitelabel.videoParams.${context}`, null);
  },
  getBatchRequests() {
    if (this.propertyBag.whitelabel.batchRequests === true) { return 10; }
    if (typeof this.propertyBag.whitelabel.batchRequests === 'number' && this.propertyBag.whitelabel.batchRequests > 0) {
      return this.propertyBag.whitelabel.batchRequests;
    }
    return false;
  },
  isBidRequestValid(bid) {
    let vf = 'VALIDATION FAILED';
    this.loadWhitelabelData(bid);
    logInfo('isBidRequestValid : ', config.getConfig(), bid);
    let adUnitCode = bid.adUnitCode; // adunit[n].code
    let err1 = `${vf} : missing {param} : siteId, placementId and publisherId are REQUIRED`;
    if (!(getBidIdParameter('placementId', bid.params))) {
      logError(err1.replace('{param}', 'placementId'), adUnitCode);
      return false;
    }
    if (!this.isValidPlacementId(bid.params.placementId)) {
      logError(`${vf} : placementId must be exactly 10 numbers`, adUnitCode);
      return false;
    }
    if (!(getBidIdParameter('publisherId', bid.params))) {
      logError(err1.replace('{param}', 'publisherId'), adUnitCode);
      return false;
    }
    if (!(bid.params.publisherId).toString().match(/^[a-zA-Z0-9\-]{12}$/)) {
      logError(`${vf} : publisherId must be /^[a-zA-Z0-9\\-]{12}$/`, adUnitCode);
      return false;
    }
    if (!(getBidIdParameter('siteId', bid.params))) {
      logError(err1.replace('{param}', 'siteId'), adUnitCode);
      return false;
    }
    if (!(bid.params.siteId).toString().match(/^[0-9]{10}$/)) {
      logError(`${vf} : siteId must be /^[0-9]{10}$/`, adUnitCode);
      return false;
    }
    if (bid.params.hasOwnProperty('customParams')) {
      logError(`${vf} : customParams should be renamed: customData`, adUnitCode);
      return false;
    }
    if (bid.params.hasOwnProperty('customData')) {
      if (!isArray(bid.params.customData)) {
        logError(`${vf} : customData is not an Array`, adUnitCode);
        return false;
      }
      if (bid.params.customData.length < 1) {
        logError(`${vf} : empty customData`, adUnitCode);
        return false;
      }
      if (!(bid.params.customData[0]).hasOwnProperty('targeting')) {
        logError(`${vf} :no customData[0].targeting`, adUnitCode);
        return false;
      }
      if (typeof bid.params.customData[0]['targeting'] != 'object') {
        logError(`${vf} : customData[0].targeting is not an Object`, adUnitCode);
        return false;
      }
    }
    if (bid.hasOwnProperty('mediaTypes') && bid.mediaTypes.hasOwnProperty(VIDEO)) {
      if (!bid.mediaTypes?.[VIDEO]?.context) {
        logError(`${vf} No video context key/value`);
        return false;
      }
      if (['instream', 'outstream'].indexOf(bid.mediaTypes?.[VIDEO]?.context) < 0) {
        logError(`${vf} video.context is invalid.`);
        return false;
      }
    }
    return true;
  },
  isValidPlacementId(placementId) {
    return placementId.toString().match(/^[0-9]{10}$/);
  },
  buildRequests(validBidRequests, bidderRequest) {
    this.loadWhitelabelData(validBidRequests[0]);
    this.propertyBag.buildRequestsStart = new Date().getTime();
    let whitelabelBidder = this.propertyBag.whitelabel.bidder; // by default = ozone
    let whitelabelPrefix = this.propertyBag.whitelabel.keyPrefix;
    logInfo(`buildRequests time: ${this.propertyBag.buildRequestsStart} v ${OZONEVERSION} validBidRequests`, deepClone(validBidRequests), 'bidderRequest', deepClone(bidderRequest));
    if (this.blockTheRequest()) {
      return [];
    }
    let fledgeEnabled = !!bidderRequest.fledgeEnabled; // IF true then this is added as each bid[].ext.ae=1
    let htmlParams = {'publisherId': '', 'siteId': ''};
    if (validBidRequests.length > 0) {
      Object.assign(this.cookieSyncBag.userIdObject, this.findAllUserIdsFromEids(validBidRequests[0]));
      this.cookieSyncBag.siteId = deepAccess(validBidRequests[0], 'params.siteId');
      this.cookieSyncBag.publisherId = deepAccess(validBidRequests[0], 'params.publisherId');
      htmlParams = validBidRequests[0].params;
    }
    logInfo('cookie sync bag', this.cookieSyncBag);
    let singleRequest = this.getWhitelabelConfigItem('ozone.singleRequest');
    singleRequest = singleRequest !== false; // undefined & true will be true
    let ozoneRequest = {}; // we only want to set specific properties on this, not validBidRequests[0].params
    let fpd = deepAccess(bidderRequest, 'ortb2', null);
    logInfo('got ortb2 fpd: ', fpd);
    if (fpd && deepAccess(fpd, 'user')) {
      logInfo('added FPD user object');
      ozoneRequest.user = fpd.user;
    }
    const getParams = this.getGetParametersAsObject();
    const wlOztestmodeKey = whitelabelPrefix + 'testmode';
    const isTestMode = getParams[wlOztestmodeKey] || null; // this can be any string, it's used for testing ads
    ozoneRequest.device = bidderRequest?.ortb2?.device || {}; // 20240925 rupesh changed this
    let placementIdOverrideFromGetParam = this.getPlacementIdOverrideFromGetParam(); // null or string
    let schain = null;
    var auctionId = deepAccess(validBidRequests, '0.ortb2.source.tid');
    if (auctionId === '0') {
      auctionId = null;
    }
    let tosendtags = validBidRequests.map(ozoneBidRequest => {
      var obj = {};
      let placementId = placementIdOverrideFromGetParam || this.getPlacementId(ozoneBidRequest); // prefer to use a valid override param, else the bidRequest placement Id
      obj.id = ozoneBidRequest.bidId; // this causes an error if we change it to something else, even if you update the bidRequest object: "WARNING: Bidder ozone made bid for unknown request ID: mb7953.859498327448. Ignoring."
      obj.tagid = placementId;
      obj.secure = parseUrl(getRefererInfo().page).protocol === 'https' ? 1 : 0;
      let arrBannerSizes = [];
      if (!ozoneBidRequest.hasOwnProperty('mediaTypes')) {
        if (ozoneBidRequest.hasOwnProperty('sizes')) {
          arrBannerSizes = ozoneBidRequest.sizes;
        } else {
          logInfo('no mediaTypes or sizes array. Cannot set sizes for banner type');
        }
      } else {
        if (ozoneBidRequest.mediaTypes.hasOwnProperty(BANNER)) {
          arrBannerSizes = ozoneBidRequest.mediaTypes[BANNER].sizes; /* Note - if there is a sizes element in the config root it will be pushed into here */
          logInfo('setting banner size from mediaTypes.banner for bidId ' + obj.id + ': ', arrBannerSizes);
        }
        if (ozoneBidRequest.mediaTypes.hasOwnProperty(VIDEO)) {
          logInfo('openrtb 2.5 compliant video');
          if (typeof ozoneBidRequest.mediaTypes[VIDEO] == 'object') {
            let childConfig = deepAccess(ozoneBidRequest, 'params.video', {});
            obj.video = this.unpackVideoConfigIntoIABformat(ozoneBidRequest.mediaTypes[VIDEO], childConfig);
            obj.video = this.addVideoDefaults(obj.video, ozoneBidRequest.mediaTypes[VIDEO], childConfig);
          }
          let wh = getWidthAndHeightFromVideoObject(obj.video);
          logInfo(`setting video object ${obj.id} from mediaTypes.video: `, obj.video, 'wh=', wh);
          let settingToBe = 'setting obj.video.format to be '; // partial, reusable phrase
          if (wh && typeof wh === 'object') {
            obj.video.w = wh['w'];
            obj.video.h = wh['h'];
            if (playerSizeIsNestedArray(obj.video)) { // this should never happen; it was in the original spec for this change though.
              logInfo(`${settingToBe} an array of objects`);
              obj.video.ext.format = [wh];
            } else {
              logInfo(`${settingToBe} an object`);
              obj.video.ext.format = wh;
            }
          } else {
            logWarn(`Failed ${settingToBe} anything - bad config`);
          }
        }
        if (ozoneBidRequest.mediaTypes.hasOwnProperty(NATIVE)) {
          obj.native = ozoneBidRequest.mediaTypes[NATIVE];
          logInfo(`setting native object ${obj.id} from mediaTypes.native element:`, obj.native);
        }
        if (ozoneBidRequest.hasOwnProperty('getFloor')) {
          obj.floor = this.getFloorObjectForAuction(ozoneBidRequest);
          logInfo('obj.floor is : ', obj.floor);
        } else {
          logInfo('no getFloor property');
        }
      }
      if (arrBannerSizes.length > 0) {
        obj.banner = {
          topframe: 1,
          w: arrBannerSizes[0][0] || 0,
          h: arrBannerSizes[0][1] || 0,
          format: arrBannerSizes.map(s => {
            return {w: s[0], h: s[1]};
          })
        };
      }
      obj.placementId = placementId;
      deepSetValue(obj, 'ext.prebid', {'storedrequest': {'id': placementId}});
      obj.ext[whitelabelBidder] = {};
      obj.ext[whitelabelBidder].adUnitCode = ozoneBidRequest.adUnitCode; // eg. 'mpu'
      if (ozoneBidRequest.params.hasOwnProperty('customData')) {
        obj.ext[whitelabelBidder].customData = ozoneBidRequest.params.customData;
      }
      if (ozoneBidRequest.params.hasOwnProperty('ozFloor')) {
        let ozFloorParsed = parseFloat(ozoneBidRequest.params.ozFloor);
        if (!isNaN(ozFloorParsed)) {
          obj.ext[whitelabelBidder].ozFloor = ozFloorParsed;
        } else {
          logError(`Ignoring invalid ozFloor value for adunit code: ${ozoneBidRequest.adUnitCode}`);
        }
      }
      logInfo(`obj.ext.${whitelabelBidder} is `, obj.ext[whitelabelBidder]);
      if (isTestMode != null) {
        logInfo(`setting isTestMode: ${isTestMode}`);
        if (obj.ext[whitelabelBidder].hasOwnProperty('customData')) {
          for (let i = 0; i < obj.ext[whitelabelBidder].customData.length; i++) {
            obj.ext[whitelabelBidder].customData[i]['targeting'][wlOztestmodeKey] = isTestMode;
          }
        } else {
          obj.ext[whitelabelBidder].customData = [{'settings': {}, 'targeting': {}}];
          obj.ext[whitelabelBidder].customData[0].targeting[wlOztestmodeKey] = isTestMode;
        }
      }
      if (fpd && deepAccess(fpd, 'site')) {
        logInfo('adding fpd.site');
        if (deepAccess(obj, `ext.${whitelabelBidder}.customData.0.targeting`, false)) {
          Object.assign(obj.ext[whitelabelBidder].customData[0].targeting, fpd.site);
        } else {
          deepSetValue(obj, `ext.${whitelabelBidder}.customData.0.targeting`, fpd.site);
        }
      }
      if (!schain && deepAccess(ozoneBidRequest, 'schain')) {
        schain = ozoneBidRequest.schain;
      }
      let gpid = deepAccess(ozoneBidRequest, 'ortb2Imp.ext.gpid');
      if (gpid) {
        deepSetValue(obj, 'ext.gpid', gpid);
      }
      let transactionId = deepAccess(ozoneBidRequest, 'ortb2Imp.ext.tid');
      if (transactionId) {
        obj.ext[whitelabelBidder].transactionId = transactionId; // this is the transactionId PER adUnit, common across bidders for this unit
      }
      if (auctionId) {
        obj.ext[whitelabelBidder].auctionId = auctionId; // we were sent a valid auctionId to use - this will also be used as the root id value for the request
      }
      if (fledgeEnabled) { // fledge is enabled at some config level - pbjs.setBidderConfig or pbjs.setConfig
        const auctionEnvironment = deepAccess(ozoneBidRequest, 'ortb2Imp.ext.ae'); // this will be set for one of 3 reasons; adunit, setBidderConfig, setConfig
        if (isInteger(auctionEnvironment)) {
          deepSetValue(obj, 'ext.ae', auctionEnvironment);
        } else {
          logError(`ignoring ortb2Imp.ext.ae - not an integer for obj.id=${obj.id}`);
        }
      }
      return obj;
    });
    let extObj = {};
    extObj[whitelabelBidder] = {};
    extObj[whitelabelBidder][`${whitelabelPrefix}_pb_v`] = OZONEVERSION;
    extObj[whitelabelBidder][`${whitelabelPrefix}_rw`] = placementIdOverrideFromGetParam ? 1 : 0;
    if (validBidRequests.length > 0) {
      let userIds = this.cookieSyncBag.userIdObject; // 2021-01-06 - slight optimisation - we've already found this info
      if (userIds.hasOwnProperty('pubcid.org')) {
        extObj[whitelabelBidder].pubcid = userIds['pubcid.org'];
      }
    }
    extObj[whitelabelBidder].pv = this.getPageId(); // attach the page ID that will be common to all auction calls for this page if refresh() is called
    let ozOmpFloorDollars = this.getWhitelabelConfigItem('ozone.oz_omp_floor'); // valid only if a dollar value (typeof == 'number')
    logInfo(`${whitelabelPrefix}_omp_floor dollar value = `, ozOmpFloorDollars);
    if (typeof ozOmpFloorDollars === 'number') {
      extObj[whitelabelBidder][`${whitelabelPrefix}_omp_floor`] = ozOmpFloorDollars;
    } else if (typeof ozOmpFloorDollars !== 'undefined') {
      logError(`IF set, ${whitelabelPrefix}_omp_floor must be a number eg. 1.55. Found:` + (typeof ozOmpFloorDollars));
    }
    let ozWhitelistAdserverKeys = this.getWhitelabelConfigItem('ozone.oz_whitelist_adserver_keys');
    let useOzWhitelistAdserverKeys = isArray(ozWhitelistAdserverKeys) && ozWhitelistAdserverKeys.length > 0;
    extObj[whitelabelBidder][whitelabelPrefix + '_kvp_rw'] = useOzWhitelistAdserverKeys ? 1 : 0;
    if (whitelabelBidder !== 'ozone') {
      logInfo('setting aliases object');
      extObj.prebid = {aliases: {'ozone': whitelabelBidder}};
    }
    if (this.propertyBag.endpointOverride != null) { extObj[whitelabelBidder]['origin'] = this.propertyBag.endpointOverride; }
    let userExtEids = deepAccess(validBidRequests, '0.userIdAsEids', []); // generate the UserIDs in the correct format for UserId module
    ozoneRequest.site = {
      'publisher': {'id': htmlParams.publisherId},
      'page': getRefererInfo().page,
      'id': htmlParams.siteId
    };
    ozoneRequest.test = config.getConfig('debug') ? 1 : 0;
    if (bidderRequest && bidderRequest.gdprConsent) {
      logInfo('ADDING GDPR');
      let apiVersion = deepAccess(bidderRequest, 'gdprConsent.apiVersion', 1);
      ozoneRequest.regs = {ext: {gdpr: bidderRequest.gdprConsent.gdprApplies ? 1 : 0, apiVersion: apiVersion}};
      if (deepAccess(ozoneRequest, 'regs.ext.gdpr')) {
        deepSetValue(ozoneRequest, 'user.ext.consent', bidderRequest.gdprConsent.consentString);
      } else {
        logWarn('**** Strange CMP info: bidderRequest.gdprConsent exists BUT bidderRequest.gdprConsent.gdprApplies is false. See bidderRequest logged above. ****');
      }
    } else {
      logInfo('WILL NOT ADD GDPR info; no bidderRequest.gdprConsent object');
    }
    if (bidderRequest && bidderRequest.uspConsent) {
      logInfo('ADDING USP consent info');
      deepSetValue(ozoneRequest, 'regs.ext.us_privacy', bidderRequest.uspConsent);
    } else {
      logInfo('WILL NOT ADD USP consent info; no bidderRequest.uspConsent.');
    }
    if (bidderRequest?.ortb2?.regs?.gpp) {
      deepSetValue(ozoneRequest, 'regs.gpp', bidderRequest.ortb2.regs.gpp);
      deepSetValue(ozoneRequest, 'regs.gpp_sid', bidderRequest.ortb2.regs.gpp_sid);
    }
    if (schain) { // we set this while iterating over the bids
      logInfo('schain found');
      deepSetValue(ozoneRequest, 'source.ext.schain', schain);
    }
    if (config.getConfig('coppa') === true) {
      deepSetValue(ozoneRequest, 'regs.coppa', 1);
    }
    extObj[whitelabelBidder].cookieDeprecationLabel = deepAccess(bidderRequest, 'ortb2.device.ext.cdep', 'none');
    logInfo(`cookieDeprecationLabel ortb2.device.ext.cdep = ${extObj[whitelabelBidder].cookieDeprecationLabel}`);
    let batchRequestsVal = this.getBatchRequests(); // false|numeric
    if (typeof batchRequestsVal === 'number') {
      logInfo(`Batching = ${batchRequestsVal}`);
      let arrRet = []; // return an array of objects containing data describing max 10 bids
      for (let i = 0; i < tosendtags.length; i += batchRequestsVal) {
        ozoneRequest.id = generateUUID(); // Unique ID of the bid request, provided by the exchange. (REQUIRED)
        deepSetValue(ozoneRequest, 'user.ext.eids', userExtEids);
        if (auctionId) {
          deepSetValue(ozoneRequest, 'source.tid', auctionId);
        }
        ozoneRequest.imp = tosendtags.slice(i, i + batchRequestsVal);
        ozoneRequest.ext = extObj;
        if (ozoneRequest.imp.length > 0) {
          arrRet.push({
            method: 'POST',
            url: this.getAuctionUrl(),
            data: JSON.stringify(ozoneRequest),
            bidderRequest: bidderRequest
          });
        }
      }
      logInfo('batch request going to return : ', arrRet);
      return arrRet;
    }
    if (singleRequest) {
      logInfo('single request starting');
      ozoneRequest.id = generateUUID(); // Unique ID of the bid request, provided by the exchange. (REQUIRED)
      ozoneRequest.imp = tosendtags;
      ozoneRequest.ext = extObj;
      deepSetValue(ozoneRequest, 'user.ext.eids', userExtEids);
      if (auctionId) {
        deepSetValue(ozoneRequest, 'source.tid', auctionId);
      }
      var ret = {
        method: 'POST',
        url: this.getAuctionUrl(),
        data: JSON.stringify(ozoneRequest),
        bidderRequest: bidderRequest
      };
      this.propertyBag.buildRequestsEnd = new Date().getTime();
      logInfo(`buildRequests going to return for single at time ${this.propertyBag.buildRequestsEnd} (took ${this.propertyBag.buildRequestsEnd - this.propertyBag.buildRequestsStart}ms): `, deepClone(ret));
      return ret;
    }
    let arrRet = tosendtags.map(imp => {
      logInfo('non-single response, working on imp : ', imp);
      let ozoneRequestSingle = Object.assign({}, ozoneRequest);
      ozoneRequestSingle.id = generateUUID(); // Unique ID of the bid request, provided by the exchange. (REQUIRED)
      ozoneRequestSingle.imp = [imp];
      ozoneRequestSingle.ext = extObj;
      deepSetValue(ozoneRequestSingle, 'user.ext.eids', userExtEids);
      if (auctionId) {
        deepSetValue(ozoneRequestSingle, 'source.tid', auctionId);
      }
      return {
        method: 'POST',
        url: this.getAuctionUrl(),
        data: JSON.stringify(ozoneRequestSingle),
        bidderRequest: bidderRequest
      };
    });
    this.propertyBag.buildRequestsEnd = new Date().getTime();
    logInfo(`buildRequests going to return for non-single at time ${this.propertyBag.buildRequestsEnd} (took ${this.propertyBag.buildRequestsEnd - this.propertyBag.buildRequestsStart}ms): `, arrRet);
    return arrRet;
  },
  getFloorObjectForAuction(bidRequestRef) {
    const mediaTypesSizes = {
      banner: deepAccess(bidRequestRef, 'mediaTypes.banner.sizes', null),
      video: deepAccess(bidRequestRef, 'mediaTypes.video.playerSize', null),
      native: deepAccess(bidRequestRef, 'mediaTypes.native.image.sizes', null)
    }
    logInfo('getFloorObjectForAuction mediaTypesSizes : ', mediaTypesSizes);
    let ret = {};
    if (mediaTypesSizes.banner) {
      ret.banner = bidRequestRef.getFloor({mediaType: 'banner', currency: 'USD', size: mediaTypesSizes.banner[0]});
    }
    if (mediaTypesSizes.video) {
      ret.video = bidRequestRef.getFloor({mediaType: 'video', currency: 'USD', size: mediaTypesSizes.video[0]});
    }
    if (mediaTypesSizes.native) {
      ret.native = bidRequestRef.getFloor({mediaType: 'native', currency: 'USD', size: mediaTypesSizes.native[0]});
    }
    logInfo('getFloorObjectForAuction returning : ', deepClone(ret));
    return ret;
  },
  interpretResponse(serverResponse, request) {
    if (request && request.bidderRequest && request.bidderRequest.bids) { this.loadWhitelabelData(request.bidderRequest.bids[0]); }
    let startTime = new Date().getTime();
    let whitelabelBidder = this.propertyBag.whitelabel.bidder; // by default = ozone
    let whitelabelPrefix = this.propertyBag.whitelabel.keyPrefix;
    logInfo(`interpretResponse time: ${startTime} . Time between buildRequests done and interpretResponse start was ${startTime - this.propertyBag.buildRequestsEnd}ms`);
    logInfo(`serverResponse, request`, deepClone(serverResponse), deepClone(request));
    serverResponse = serverResponse.body || {};
    let aucId = serverResponse.id; // this will be correct for single requests and non-single
    if (!serverResponse.hasOwnProperty('seatbid')) {
      return [];
    }
    if (typeof serverResponse.seatbid !== 'object') {
      return [];
    }
    let arrAllBids = [];
    let labels;
    let enhancedAdserverTargeting = this.getWhitelabelConfigItem('ozone.enhancedAdserverTargeting');
    logInfo('enhancedAdserverTargeting', enhancedAdserverTargeting);
    if (typeof enhancedAdserverTargeting == 'undefined') {
      enhancedAdserverTargeting = true;
    }
    logInfo('enhancedAdserverTargeting', enhancedAdserverTargeting);
    serverResponse.seatbid = injectAdIdsIntoAllBidResponses(serverResponse.seatbid); // we now make sure that each bid in the bidresponse has a unique (within page) adId attribute.
    serverResponse.seatbid = this.removeSingleBidderMultipleBids(serverResponse.seatbid);
    let ozOmpFloorDollars = this.getWhitelabelConfigItem('ozone.oz_omp_floor'); // valid only if a dollar value (typeof == 'number')
    let addOzOmpFloorDollars = typeof ozOmpFloorDollars === 'number';
    let ozWhitelistAdserverKeys = this.getWhitelabelConfigItem('ozone.oz_whitelist_adserver_keys');
    let useOzWhitelistAdserverKeys = isArray(ozWhitelistAdserverKeys) && ozWhitelistAdserverKeys.length > 0;
    for (let i = 0; i < serverResponse.seatbid.length; i++) {
      let sb = serverResponse.seatbid[i];
      for (let j = 0; j < sb.bid.length; j++) {
        let thisRequestBid = this.getBidRequestForBidId(sb.bid[j].impid, request.bidderRequest.bids);
        logInfo(`seatbid:${i}, bid:${j} Going to set default w h for seatbid/bidRequest`, sb.bid[j], thisRequestBid);
        let {defaultWidth, defaultHeight} = defaultSize(thisRequestBid);
        let thisBid = ozoneAddStandardProperties(sb.bid[j], defaultWidth, defaultHeight);
        thisBid.meta = {advertiserDomains: thisBid.adomain || []};
        let videoContext = null;
        let isVideo = false;
        let bidType = deepAccess(thisBid, 'ext.prebid.type');
        logInfo(`this bid type is : ${bidType}`);
        let adserverTargeting = {};
        if (bidType === VIDEO) {
          isVideo = true;
          this.setBidMediaTypeIfNotExist(thisBid, VIDEO);
          videoContext = this.getVideoContextForBidId(thisBid.bidId, request.bidderRequest.bids); // should be instream or outstream (or null if error)
          if (videoContext === 'outstream') {
            logInfo('setting thisBid.mediaType = VIDEO & attach a renderer to OUTSTREAM video');
            thisBid.renderer = newRenderer(thisBid.bidId);
          } else {
            logInfo('not an outstream video, will set thisBid.mediaType = VIDEO and thisBid.vastUrl and not attach a renderer');
            thisBid.vastUrl = `https://${deepAccess(thisBid, 'ext.prebid.targeting.hb_cache_host', 'missing_host')}${deepAccess(thisBid, 'ext.prebid.targeting.hb_cache_path', 'missing_path')}?id=${deepAccess(thisBid, 'ext.prebid.targeting.hb_cache_id', 'missing_id')}`; // need to see if this works ok for ozone
            adserverTargeting['hb_cache_host'] = deepAccess(thisBid, 'ext.prebid.targeting.hb_cache_host', 'no-host');
            adserverTargeting['hb_cache_path'] = deepAccess(thisBid, 'ext.prebid.targeting.hb_cache_path', 'no-path');
            if (!thisBid.hasOwnProperty('videoCacheKey')) {
              let videoCacheUuid = deepAccess(thisBid, 'ext.prebid.targeting.hb_uuid', 'no_hb_uuid');
              logInfo(`Adding videoCacheKey: ${videoCacheUuid}`);
              thisBid.videoCacheKey = videoCacheUuid;
            } else {
              logInfo('videoCacheKey already exists on the bid object, will not add it');
            }
          }
        } else {
          this.setBidMediaTypeIfNotExist(thisBid, BANNER);
        }
        if (enhancedAdserverTargeting) {
          let allBidsForThisBidid = ozoneGetAllBidsForBidId(thisBid.bidId, serverResponse.seatbid, defaultWidth, defaultHeight);
          logInfo('Going to iterate allBidsForThisBidId', deepClone(allBidsForThisBidid));
          Object.keys(allBidsForThisBidid).forEach((bidderName, index, ar2) => {
            logInfo(`adding adserverTargeting for ${bidderName} for bidId ${thisBid.bidId}`);
            adserverTargeting[whitelabelPrefix + '_' + bidderName] = bidderName;
            adserverTargeting[whitelabelPrefix + '_' + bidderName + '_crid'] = String(allBidsForThisBidid[bidderName].crid);
            adserverTargeting[whitelabelPrefix + '_' + bidderName + '_adv'] = String(allBidsForThisBidid[bidderName].adomain);
            adserverTargeting[whitelabelPrefix + '_' + bidderName + '_adId'] = String(allBidsForThisBidid[bidderName].adId);
            adserverTargeting[whitelabelPrefix + '_' + bidderName + '_pb_r'] = getRoundedBid(allBidsForThisBidid[bidderName].price, allBidsForThisBidid[bidderName].ext.prebid.type);
            adserverTargeting[whitelabelPrefix + '_' + bidderName + '_size'] = String(allBidsForThisBidid[bidderName].width) + 'x' + String(allBidsForThisBidid[bidderName].height);
            if (allBidsForThisBidid[bidderName].hasOwnProperty('dealid')) {
              adserverTargeting[whitelabelPrefix + '_' + bidderName + '_dealid'] = String(allBidsForThisBidid[bidderName].dealid);
            }
            if (addOzOmpFloorDollars) {
              adserverTargeting[whitelabelPrefix + '_' + bidderName + '_omp'] = allBidsForThisBidid[bidderName].price >= ozOmpFloorDollars ? '1' : '0';
            }
            if (isVideo) {
              adserverTargeting[whitelabelPrefix + '_' + bidderName + '_vid'] = videoContext; // outstream or instream
            }
            let flr = deepAccess(allBidsForThisBidid[bidderName], `ext.bidder.${whitelabelBidder}.floor`, null);
            if (flr != null) {
              adserverTargeting[whitelabelPrefix + '_' + bidderName + '_flr'] = flr;
            }
            let rid = deepAccess(allBidsForThisBidid[bidderName], `ext.bidder.${whitelabelBidder}.ruleId`, null);
            if (rid != null) {
              adserverTargeting[whitelabelPrefix + '_' + bidderName + '_rid'] = rid;
            }
            if (bidderName.match(/^ozappnexus/)) {
              adserverTargeting[whitelabelPrefix + '_' + bidderName + '_sid'] = String(allBidsForThisBidid[bidderName].cid);
            }
            labels = deepAccess(allBidsForThisBidid[bidderName], 'ext.prebid.labels', null);
            if (labels) {
              adserverTargeting[whitelabelPrefix + '_' + bidderName + '_labels'] = labels.join(',');
            }
          });
        } else {
          let perBidInfo = `${whitelabelBidder}.enhancedAdserverTargeting is set to false. No per-bid keys will be sent to adserver.`;
          if (useOzWhitelistAdserverKeys) {
            logWarn(`Your adserver keys whitelist will be ignored - ${perBidInfo}`);
          } else {
            logInfo(perBidInfo);
          }
        }
        let {seat: winningSeat, bid: winningBid} = ozoneGetWinnerForRequestBid(thisBid.bidId, serverResponse.seatbid);
        winningBid = ozoneAddStandardProperties(winningBid, defaultWidth, defaultHeight);
        adserverTargeting[whitelabelPrefix + '_auc_id'] = String(aucId); // was request.bidderRequest.auctionId
        adserverTargeting[whitelabelPrefix + '_winner'] = String(winningSeat);
        adserverTargeting[whitelabelPrefix + '_bid'] = 'true';
        adserverTargeting[whitelabelPrefix + '_cache_id'] = deepAccess(thisBid, 'ext.prebid.targeting.hb_cache_id', 'no-id');
        adserverTargeting[whitelabelPrefix + '_uuid'] = deepAccess(thisBid, 'ext.prebid.targeting.hb_uuid', 'no-id');
        if (enhancedAdserverTargeting) {
          labels = deepAccess(winningBid, 'ext.prebid.labels', null);
          if (labels) {
            adserverTargeting[whitelabelPrefix + '_labels'] = labels.join(',');
          }
          adserverTargeting[whitelabelPrefix + '_imp_id'] = String(winningBid.impid);
          adserverTargeting[whitelabelPrefix + '_pb_v'] = OZONEVERSION;
          adserverTargeting[whitelabelPrefix + '_pb'] = winningBid.price;
          adserverTargeting[whitelabelPrefix + '_pb_r'] = getRoundedBid(winningBid.price, bidType);
          adserverTargeting[whitelabelPrefix + '_adId'] = String(winningBid.adId);
          adserverTargeting[whitelabelPrefix + '_size'] = `${winningBid.width}x${winningBid.height}`;
        }
        if (useOzWhitelistAdserverKeys) { // delete any un-whitelisted keys
          logInfo('Filtering out adserver targeting keys not in the whitelist: ', ozWhitelistAdserverKeys);
          Object.keys(adserverTargeting).forEach(function(key) { if (ozWhitelistAdserverKeys.indexOf(key) === -1) { delete adserverTargeting[key]; } });
        }
        thisBid.adserverTargeting = adserverTargeting;
        arrAllBids.push(thisBid);
      }
    }
    let ret = arrAllBids;
    let fledgeAuctionConfigs = deepAccess(serverResponse, 'ext.igi') || []; // 20240606 standardising
    if (isArray(fledgeAuctionConfigs) && fledgeAuctionConfigs.length > 0) {
      fledgeAuctionConfigs = fledgeAuctionConfigs.filter(config => {
        if (!this.isValidAuctionConfig(config)) {
          logWarn('Removing malformed fledge auction config:', config);
          return false;
        }
        return true;
      });
      ret = {
        bids: arrAllBids,
        fledgeAuctionConfigs,
      };
    }
    let endTime = new Date().getTime();
    logInfo(`interpretResponse going to return at time ${endTime} (took ${endTime - startTime}ms) Time from buildRequests Start -> interpretRequests End = ${endTime - this.propertyBag.buildRequestsStart}ms`);
    logInfo('will return: ', deepClone(ret)); // this is ok to log because the renderer has not been attached yet
    return ret;
  },
  isValidAuctionConfig(config) {
    return typeof config === 'object' && config !== null;
  },
  setBidMediaTypeIfNotExist(thisBid, mediaType) {
    if (!thisBid.hasOwnProperty('mediaType')) {
      logInfo(`setting thisBid.mediaType = ${mediaType}`);
      thisBid.mediaType = mediaType;
    } else {
      logInfo(`found value for thisBid.mediaType: ${thisBid.mediaType}`);
    }
  },
  getWhitelabelConfigItem(ozoneVersion) {
    if (this.propertyBag.whitelabel.bidder === 'ozone') { return config.getConfig(ozoneVersion); }
    let whitelabelledSearch = ozoneVersion.replace('ozone', this.propertyBag.whitelabel.bidder);
    whitelabelledSearch = whitelabelledSearch.replace('oz_', this.propertyBag.whitelabel.keyPrefix + '_');
    return config.getConfig(whitelabelledSearch);
  },
  removeSingleBidderMultipleBids(seatbid) {
    var ret = [];
    for (let i = 0; i < seatbid.length; i++) {
      let sb = seatbid[i];
      var retSeatbid = {'seat': sb.seat, 'bid': []};
      var bidIds = [];
      for (let j = 0; j < sb.bid.length; j++) {
        var candidate = sb.bid[j];
        if (contains(bidIds, candidate.impid)) {
          continue; // we've already fully assessed this impid, found the highest bid from this seat for it
        }
        bidIds.push(candidate.impid);
        for (let k = j + 1; k < sb.bid.length; k++) {
          if (sb.bid[k].impid === candidate.impid && sb.bid[k].price > candidate.price) {
            candidate = sb.bid[k];
          }
        }
        retSeatbid.bid.push(candidate);
      }
      ret.push(retSeatbid);
    }
    return ret;
  },
  getUserSyncs(optionsType, serverResponse, gdprConsent, usPrivacy, gppConsent = {}) {
    logInfo('getUserSyncs optionsType', optionsType, 'serverResponse', serverResponse, 'gdprConsent', gdprConsent, 'usPrivacy', usPrivacy, 'cookieSyncBag', this.cookieSyncBag);
    if (!serverResponse || serverResponse.length === 0) {
      return [];
    }
    let { gppString = '', applicableSections = [] } = gppConsent;
    if (optionsType.iframeEnabled) {
      var arrQueryString = [];
      if (config.getConfig('debug')) {
        arrQueryString.push('pbjs_debug=true');
      }
      arrQueryString.push('gdpr=' + (deepAccess(gdprConsent, 'gdprApplies', false) ? '1' : '0'));
      arrQueryString.push('gdpr_consent=' + deepAccess(gdprConsent, 'consentString', ''));
      arrQueryString.push('usp_consent=' + (usPrivacy || ''));
      arrQueryString.push('gpp=' + gppString);
      if (isArray(applicableSections)) {
        arrQueryString.push(`gpp_sid=${applicableSections.join()}`);
      }
      for (let keyname in this.cookieSyncBag.userIdObject) {
        arrQueryString.push(keyname + '=' + this.cookieSyncBag.userIdObject[keyname]);
      }
      arrQueryString.push('publisherId=' + this.cookieSyncBag.publisherId);
      arrQueryString.push('siteId=' + this.cookieSyncBag.siteId);
      arrQueryString.push('cb=' + Date.now());
      arrQueryString.push('bidder=' + this.propertyBag.whitelabel.bidder);
      var strQueryString = arrQueryString.join('&');
      if (strQueryString.length > 0) {
        strQueryString = '?' + strQueryString;
      }
      logInfo('getUserSyncs going to return cookie sync url : ' + this.getCookieSyncUrl() + strQueryString);
      return [{
        type: 'iframe',
        url: this.getCookieSyncUrl() + strQueryString
      }];
    }
  },
  getBidRequestForBidId(bidId, arrBids) {
    for (let i = 0; i < arrBids.length; i++) {
      if (arrBids[i].bidId === bidId) { // bidId in the request comes back as impid in the seatbid bids
        return arrBids[i];
      }
    }
    return null;
  },
  getVideoContextForBidId(bidId, arrBids) {
    let requestBid = this.getBidRequestForBidId(bidId, arrBids);
    if (requestBid != null) {
      return deepAccess(requestBid, 'mediaTypes.video.context', 'unknown')
    }
    return null;
  },
  findAllUserIdsFromEids(bidRequest) {
    let ret = {};
    if (!bidRequest.hasOwnProperty('userIdAsEids')) {
      logInfo('findAllUserIdsFromEids - no bidRequest.userIdAsEids object was found on the bid!');
      this.tryGetPubCidFromOldLocation(ret, bidRequest); // legacy
      return ret;
    }
    for (let obj of bidRequest.userIdAsEids) {
      ret[obj.source] = deepAccess(obj, 'uids.0.id');
    }
    this.tryGetPubCidFromOldLocation(ret, bidRequest); // legacy
    return ret;
  },
  tryGetPubCidFromOldLocation(ret, bidRequest) {
    if (!ret.hasOwnProperty('pubcid')) {
      let pubcid = deepAccess(bidRequest, 'crumbs.pubcid');
      if (pubcid) {
        ret['pubcid.org'] = pubcid; // if built with old pubCommonId module (use the new eid key)
      }
    }
  },
  getPlacementId(bidRequest) {
    return (bidRequest.params.placementId).toString();
  },
  getPlacementIdOverrideFromGetParam() {
    let whitelabelPrefix = this.propertyBag.whitelabel.keyPrefix;
    let arr = this.getGetParametersAsObject();
    if (arr.hasOwnProperty(whitelabelPrefix + 'storedrequest')) {
      if (this.isValidPlacementId(arr[whitelabelPrefix + 'storedrequest'])) {
        logInfo(`using GET ${whitelabelPrefix}storedrequest=` + arr[whitelabelPrefix + 'storedrequest'] + ' to replace placementId');
        return arr[whitelabelPrefix + 'storedrequest'];
      } else {
        logError(`GET ${whitelabelPrefix}storedrequest FAILED VALIDATION - will not use it`);
      }
    }
    return null;
  },
  getGetParametersAsObject() {
    let parsed = parseUrl(getRefererInfo().location);
    logInfo('getGetParametersAsObject found:', parsed.search);
    return parsed.search;
  },
  blockTheRequest() {
    let ozRequest = this.getWhitelabelConfigItem('ozone.oz_request');
    if (ozRequest === false) {
      logWarn(`Will not allow the auction : ${this.propertyBag.whitelabel.keyPrefix}_request is set to false`);
      return true;
    }
    return false;
  },
  getPageId: function() {
    if (this.propertyBag.pageId == null) {
      let randPart = '';
      let allowable = '0123456789abcdefghijklmnopqrstuvwxyz';
      for (let i = 20; i > 0; i--) {
        randPart += allowable[Math.floor(Math.random() * 36)];
      }
      this.propertyBag.pageId = new Date().getTime() + '_' + randPart;
    }
    return this.propertyBag.pageId;
  },
  unpackVideoConfigIntoIABformat(videoConfig, childConfig) {
    let ret = {'ext': {}};
    ret = this._unpackVideoConfigIntoIABformat(ret, videoConfig);
    ret = this._unpackVideoConfigIntoIABformat(ret, childConfig);
    return ret;
  },
  _unpackVideoConfigIntoIABformat(ret, objConfig) {
    let arrVideoKeysAllowed = ['mimes', 'minduration', 'maxduration', 'protocols', 'w', 'h', 'startdelay', 'placement', 'plcmt', 'linearity', 'skip', 'skipmin', 'skipafter', 'sequence', 'battr', 'maxextended', 'minbitrate', 'maxbitrate', 'boxingallowed', 'playbackmethod', 'playbackend', 'delivery', 'pos', 'companionad', 'api', 'companiontype'];
    for (const key in objConfig) {
      var found = false;
      arrVideoKeysAllowed.forEach(function(arg) {
        if (arg === key) {
          ret[key] = objConfig[key];
          found = true;
        }
      });
      if (!found) {
        ret.ext[key] = objConfig[key];
      }
    }
    if (objConfig.hasOwnProperty('ext') && typeof objConfig.ext === 'object') {
      if (ret.hasOwnProperty('ext')) {
        ret.ext = mergeDeep(ret.ext, objConfig.ext);
      } else {
        ret.ext = objConfig.ext;
      }
    }
    return ret;
  },
  addVideoDefaults(objRet, videoConfig, childConfig) {
    objRet = this._addVideoDefaults(objRet, videoConfig, false);
    objRet = this._addVideoDefaults(objRet, childConfig, true); // child config will override parent config
    return objRet;
  },
  _addVideoDefaults(objRet, objConfig, addIfMissing) {
    let placementValue = this.getVideoPlacementValue(deepAccess(objConfig, 'context'));
    if (placementValue) {
      objRet.placement = placementValue;
    }
    let skippable = deepAccess(objConfig, 'skippable', null);
    if (skippable == null) {
      if (addIfMissing && !objRet.hasOwnProperty('skip')) {
        objRet.skip = 0;
      }
    } else {
      objRet.skip = skippable ? 1 : 0;
    }
    return objRet;
  },
  getLoggableBidObject(bid) {
    let logObj = {
      ad: bid.ad,
      adId: bid.adId,
      adUnitCode: bid.adUnitCode,
      adm: bid.adm,
      adomain: bid.adomain,
      adserverTargeting: bid.adserverTargeting,
      auctionId: bid.auctionId,
      bidId: bid.bidId,
      bidder: bid.bidder,
      bidderCode: bid.bidderCode,
      cpm: bid.cpm,
      creativeId: bid.creativeId,
      crid: bid.crid,
      currency: bid.currency,
      h: bid.h,
      w: bid.w,
      impid: bid.impid,
      mediaType: bid.mediaType,
      params: bid.params,
      price: bid.price,
      transactionId: bid.transactionId,
      ttl: bid.ttl,
      ortb2: deepAccess(bid, 'ortb2'),
      ortb2Imp: deepAccess(bid, 'ortb2Imp'),
    };
    if (bid.hasOwnProperty('floorData')) {
      logObj.floorData = bid.floorData;
    }
    return logObj;
  }
};
export function injectAdIdsIntoAllBidResponses(seatbid) {
  logInfo('injectAdIdsIntoAllBidResponses', deepClone(seatbid));
  for (let i = 0; i < seatbid.length; i++) {
    let sb = seatbid[i];
    for (let j = 0; j < sb.bid.length; j++) {
      sb.bid[j]['adId'] = `${sb.bid[j]['impid']}-${i}-${spec.propertyBag.whitelabel.keyPrefix}-${j}`;
    }
  }
  return seatbid;
}
export function checkDeepArray(Arr) {
  if (isArray(Arr)) {
    if (isArray(Arr[0])) {
      return Arr[0];
    } else {
      return Arr;
    }
  } else {
    return Arr;
  }
}
export function defaultSize(thebidObj) {
  if (!thebidObj) {
    logInfo('defaultSize received empty bid obj! going to return fixed default size');
    return {
      'defaultHeight': 250,
      'defaultWidth': 300
    };
  }
  const {sizes} = thebidObj;
  const returnObject = {};
  returnObject.defaultWidth = checkDeepArray(sizes)[0];
  returnObject.defaultHeight = checkDeepArray(sizes)[1];
  return returnObject;
}
export function ozoneGetWinnerForRequestBid(requestBidId, serverResponseSeatBid) {
  let thisBidWinner = null;
  let winningSeat = null;
  for (let j = 0; j < serverResponseSeatBid.length; j++) {
    let theseBids = serverResponseSeatBid[j].bid;
    let thisSeat = serverResponseSeatBid[j].seat;
    for (let k = 0; k < theseBids.length; k++) {
      if (theseBids[k].impid === requestBidId) {
        if ((thisBidWinner == null) || (thisBidWinner.price < theseBids[k].price)) {
          thisBidWinner = theseBids[k];
          winningSeat = thisSeat;
          break;
        }
      }
    }
  }
  return {'seat': winningSeat, 'bid': thisBidWinner};
}
export function ozoneGetAllBidsForBidId(matchBidId, serverResponseSeatBid, defaultWidth, defaultHeight) {
  let objBids = {};
  for (let j = 0; j < serverResponseSeatBid.length; j++) {
    let theseBids = serverResponseSeatBid[j].bid;
    let thisSeat = serverResponseSeatBid[j].seat;
    for (let k = 0; k < theseBids.length; k++) {
      if (theseBids[k].impid === matchBidId) {
        if (objBids.hasOwnProperty(thisSeat)) { // > 1 bid for an adunit from a bidder - only use the one with the highest bid
          if (objBids[thisSeat]['price'] < theseBids[k].price) {
            objBids[thisSeat] = ozoneAddStandardProperties(theseBids[k], defaultWidth, defaultHeight);
          }
        } else {
          objBids[thisSeat] = theseBids[k];
          objBids[thisSeat] = ozoneAddStandardProperties(theseBids[k], defaultWidth, defaultHeight);
        }
      }
    }
  }
  return objBids;
}
export function getRoundedBid(price, mediaType) {
  const mediaTypeGranularity = config.getConfig(`mediaTypePriceGranularity.${mediaType}`); // might be string or object or nothing; if set then this takes precedence over 'priceGranularity'
  let objBuckets = config.getConfig('customPriceBucket'); // this is always an object - {} if strBuckets is not 'custom'
  let strBuckets = config.getConfig('priceGranularity'); // priceGranularity value, always a string ** if priceGranularity is set to an object then it's always 'custom' **
  let theConfigObject = getGranularityObject(mediaType, mediaTypeGranularity, strBuckets, objBuckets);
  let theConfigKey = getGranularityKeyName(mediaType, mediaTypeGranularity, strBuckets);
  logInfo('getRoundedBid. price:', price, 'mediaType:', mediaType, 'configkey:', theConfigKey, 'configObject:', theConfigObject, 'mediaTypeGranularity:', mediaTypeGranularity, 'strBuckets:', strBuckets);
  let priceStringsObj = getPriceBucketString(
    price,
    theConfigObject,
    config.getConfig('currency.granularityMultiplier')
  );
  logInfo('priceStringsObj', priceStringsObj);
  let granularityNamePriceStringsKeyMapping = {
    'medium': 'med',
    'custom': 'custom',
    'high': 'high',
    'low': 'low',
    'dense': 'dense'
  };
  if (granularityNamePriceStringsKeyMapping.hasOwnProperty(theConfigKey)) {
    let priceStringsKey = granularityNamePriceStringsKeyMapping[theConfigKey];
    logInfo('getRoundedBid: looking for priceStringsKey:', priceStringsKey);
    return priceStringsObj[priceStringsKey];
  }
  return priceStringsObj['auto'];
}
export function getGranularityKeyName(mediaType, mediaTypeGranularity, strBuckets) {
  if (typeof mediaTypeGranularity === 'string') {
    return mediaTypeGranularity;
  }
  if (typeof mediaTypeGranularity === 'object') {
    return 'custom';
  }
  if (typeof strBuckets === 'string') {
    return strBuckets;
  }
  return 'auto'; // fall back to a default key - should literally never be needed.
}
export function getGranularityObject(mediaType, mediaTypeGranularity, strBuckets, objBuckets) {
  if (typeof mediaTypeGranularity === 'object') {
    return mediaTypeGranularity;
  }
  if (strBuckets === 'custom') {
    return objBuckets;
  }
  return '';
}
export function ozoneAddStandardProperties(seatBid, defaultWidth, defaultHeight) {
  seatBid.cpm = seatBid.price;
  seatBid.bidId = seatBid.impid;
  seatBid.requestId = seatBid.impid;
  seatBid.width = seatBid.w || defaultWidth;
  seatBid.height = seatBid.h || defaultHeight;
  seatBid.ad = seatBid.adm;
  seatBid.netRevenue = true;
  seatBid.creativeId = seatBid.crid;
  seatBid.currency = 'USD';
  seatBid.ttl = 300;
  return seatBid;
}
export function getWidthAndHeightFromVideoObject(objVideo) {
  let playerSize = getPlayerSizeFromObject(objVideo);
  if (!playerSize) {
    return null;
  }
  if (playerSize[0] && typeof playerSize[0] === 'object') {
    logInfo('getWidthAndHeightFromVideoObject found nested array inside playerSize.', playerSize[0]);
    playerSize = playerSize[0];
    if (typeof playerSize[0] !== 'number' && typeof playerSize[0] !== 'string') {
      logError('getWidthAndHeightFromVideoObject found non-number/string type inside the INNER array in playerSize. This is totally wrong - cannot continue.', playerSize[0]);
      return null;
    }
  }
  if (playerSize.length !== 2) {
    logError('getWidthAndHeightFromVideoObject found playerSize with length of ' + playerSize.length + '. This is totally wrong - cannot continue.');
    return null;
  }
  return ({'w': playerSize[0], 'h': playerSize[1]});
}
export function playerSizeIsNestedArray(objVideo) {
  let playerSize = getPlayerSizeFromObject(objVideo);
  if (!playerSize) {
    return null;
  }
  if (playerSize.length < 1) {
    return null;
  }
  return (playerSize[0] && typeof playerSize[0] === 'object');
}
function getPlayerSizeFromObject(objVideo) {
  logInfo('getPlayerSizeFromObject received object', objVideo);
  let playerSize = deepAccess(objVideo, 'playerSize');
  if (!playerSize) {
    playerSize = deepAccess(objVideo, 'ext.playerSize');
  }
  if (!playerSize) {
    logError('getPlayerSizeFromObject FAILED: no playerSize in video object or ext', objVideo);
    return null;
  }
  if (typeof playerSize !== 'object') {
    logError('getPlayerSizeFromObject FAILED: playerSize is not an object/array', objVideo);
    return null;
  }
  return playerSize;
}
function newRenderer(adUnitCode, rendererOptions = {}) {
  let isLoaded = window.ozoneVideo;
  logInfo(`newRenderer will set loaded to ${isLoaded ? 'true' : 'false'}`);
  const renderer = Renderer.install({
    url: spec.getRendererUrl(),
    config: rendererOptions,
    loaded: isLoaded,
    adUnitCode
  });
  try {
    renderer.setRender(outstreamRender);
  } catch (err) {
    logError('Prebid Error calling renderer.setRender', renderer, err);
  }
  logInfo('returning renderer object');
  return renderer;
}
function outstreamRender(bid) {
  logInfo('outstreamRender got', deepClone(spec.getLoggableBidObject(bid)));
  bid.renderer.push(() => {
    logInfo('outstreamRender: Going to execute window.ozoneVideo.outstreamRender');
    window.ozoneVideo.outstreamRender(bid);
  });
}
registerBidder(spec);
logInfo(`*BidAdapter ${OZONEVERSION} was loaded`);
