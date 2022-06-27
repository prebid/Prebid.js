import { logInfo, logError, deepAccess, logWarn, deepSetValue, isArray, contains, isStr, mergeDeep } from '../src/utils.js';
import { registerBidder } from '../src/adapters/bidderFactory.js';
import { BANNER, NATIVE, VIDEO } from '../src/mediaTypes.js';
import {config} from '../src/config.js';
import {getPriceBucketString} from '../src/cpmBucketManager.js';
import { Renderer } from '../src/Renderer.js';

const BIDDER_CODE = 'ozone';

const ORIGIN = 'https://elb.the-ozone-project.com' // applies only to auction & cookie
const AUCTIONURI = '/openrtb2/auction';
const OZONECOOKIESYNC = '/static/load-cookie.html';
const OZONE_RENDERER_URL = 'https://prebid.the-ozone-project.com/ozone-renderer.js';
const ORIGIN_DEV = 'https://test.ozpr.net';

const OZONEVERSION = '2.7.0';
export const spec = {
  gvlid: 524,
  aliases: [{code: 'lmc', gvlid: 524}, {code: 'newspassid', gvlid: 524}],
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
    'rendererUrl': OZONE_RENDERER_URL
  },
  /**
   * make sure that the whitelabel/default values are available in the propertyBag
   * @param bid Object : the bid
   */
  loadWhitelabelData(bid) {
    if (this.propertyBag.whitelabel) { return; }
    this.propertyBag.whitelabel = JSON.parse(JSON.stringify(this.whitelabel_defaults));
    let bidder = bid.bidder || 'ozone'; // eg. ozone
    this.propertyBag.whitelabel.logId = bidder.toUpperCase();
    this.propertyBag.whitelabel.bidder = bidder;
    let bidderConfig = config.getConfig(bidder) || {};
    logInfo('got bidderConfig: ', JSON.parse(JSON.stringify(bidderConfig)));
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
    logInfo('set propertyBag.whitelabel to', this.propertyBag.whitelabel);
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
  /**
   * Basic check to see whether required parameters are in the request.
   * @param bid
   * @returns {boolean}
   */
  isBidRequestValid(bid) {
    this.loadWhitelabelData(bid);
    logInfo('isBidRequestValid : ', config.getConfig(), bid);
    let adUnitCode = bid.adUnitCode; // adunit[n].code
    let err1 = 'VALIDATION FAILED : missing {param} : siteId, placementId and publisherId are REQUIRED'
    if (!(bid.params.hasOwnProperty('placementId'))) {
      logError(err1.replace('{param}', 'placementId'), adUnitCode);
      return false;
    }
    if (!this.isValidPlacementId(bid.params.placementId)) {
      logError('VALIDATION FAILED : placementId must be exactly 10 numeric characters', adUnitCode);
      return false;
    }
    if (!(bid.params.hasOwnProperty('publisherId'))) {
      logError(err1.replace('{param}', 'publisherId'), adUnitCode);
      return false;
    }
    if (!(bid.params.publisherId).toString().match(/^[a-zA-Z0-9\-]{12}$/)) {
      logError('VALIDATION FAILED : publisherId must be exactly 12 alphanumieric characters including hyphens', adUnitCode);
      return false;
    }
    if (!(bid.params.hasOwnProperty('siteId'))) {
      logError(err1.replace('{param}', 'siteId'), adUnitCode);
      return false;
    }
    if (!(bid.params.siteId).toString().match(/^[0-9]{10}$/)) {
      logError('VALIDATION FAILED : siteId must be exactly 10 numeric characters', adUnitCode);
      return false;
    }
    if (bid.params.hasOwnProperty('customParams')) {
      logError('VALIDATION FAILED : customParams should be renamed to customData', adUnitCode);
      return false;
    }
    if (bid.params.hasOwnProperty('customData')) {
      if (!Array.isArray(bid.params.customData)) {
        logError('VALIDATION FAILED : customData is not an Array', adUnitCode);
        return false;
      }
      if (bid.params.customData.length < 1) {
        logError('VALIDATION FAILED : customData is an array but does not contain any elements', adUnitCode);
        return false;
      }
      if (!(bid.params.customData[0]).hasOwnProperty('targeting')) {
        logError('VALIDATION FAILED : customData[0] does not contain "targeting"', adUnitCode);
        return false;
      }
      if (typeof bid.params.customData[0]['targeting'] != 'object') {
        logError('VALIDATION FAILED : customData[0] targeting is not an object', adUnitCode);
        return false;
      }
    }
    if (bid.hasOwnProperty('mediaTypes') && bid.mediaTypes.hasOwnProperty(VIDEO)) {
      if (!bid.mediaTypes[VIDEO].hasOwnProperty('context')) {
        logError('No video context key/value in bid. Rejecting bid: ', bid);
        return false;
      }
      if (bid.mediaTypes[VIDEO].context !== 'instream' && bid.mediaTypes[VIDEO].context !== 'outstream') {
        logError('video.context is invalid. Only instream/outstream video is supported. Rejecting bid: ', bid);
        return false;
      }
    }
    return true;
  },

  /**
   * Split this out so that we can validate the placementId and also the override GET parameter ozstoredrequest
   * @param placementId
   */
  isValidPlacementId(placementId) {
    return placementId.toString().match(/^[0-9]{10}$/);
  },

  buildRequests(validBidRequests, bidderRequest) {
    this.loadWhitelabelData(validBidRequests[0]);
    this.propertyBag.buildRequestsStart = new Date().getTime();
    let whitelabelBidder = this.propertyBag.whitelabel.bidder; // by default = ozone
    let whitelabelPrefix = this.propertyBag.whitelabel.keyPrefix;
    logInfo(`buildRequests time: ${this.propertyBag.buildRequestsStart} v ${OZONEVERSION} validBidRequests`, JSON.parse(JSON.stringify(validBidRequests)), 'bidderRequest', JSON.parse(JSON.stringify(bidderRequest)));
    if (this.blockTheRequest()) {
      return [];
    }
    let htmlParams = {'publisherId': '', 'siteId': ''};
    if (validBidRequests.length > 0) {
      this.cookieSyncBag.userIdObject = Object.assign(this.cookieSyncBag.userIdObject, this.findAllUserIds(validBidRequests[0]));
      this.cookieSyncBag.siteId = deepAccess(validBidRequests[0], 'params.siteId');
      this.cookieSyncBag.publisherId = deepAccess(validBidRequests[0], 'params.publisherId');
      htmlParams = validBidRequests[0].params;
    }
    logInfo('cookie sync bag', this.cookieSyncBag);
    let singleRequest = this.getWhitelabelConfigItem('ozone.singleRequest');
    singleRequest = singleRequest !== false; // undefined & true will be true
    logInfo(`config ${whitelabelBidder}.singleRequest : `, singleRequest);
    let ozoneRequest = {}; // we only want to set specific properties on this, not validBidRequests[0].params
    delete ozoneRequest.test; // don't allow test to be set in the config - ONLY use $_GET['pbjs_debug']

    let fpd = bidderRequest.ortb2;
    if (fpd && deepAccess(fpd, 'user')) {
      logInfo('added FPD user object');
      ozoneRequest.user = fpd.user;
    }

    const getParams = this.getGetParametersAsObject();
    const wlOztestmodeKey = whitelabelPrefix + 'testmode';
    const isTestMode = getParams[wlOztestmodeKey] || null; // this can be any string, it's used for testing ads
    ozoneRequest.device = {'w': window.innerWidth, 'h': window.innerHeight};
    let placementIdOverrideFromGetParam = this.getPlacementIdOverrideFromGetParam(); // null or string
    let schain = null;
    let tosendtags = validBidRequests.map(ozoneBidRequest => {
      var obj = {};
      let placementId = placementIdOverrideFromGetParam || this.getPlacementId(ozoneBidRequest); // prefer to use a valid override param, else the bidRequest placement Id
      obj.id = ozoneBidRequest.bidId; // this causes an error if we change it to something else, even if you update the bidRequest object: "WARNING: Bidder ozone made bid for unknown request ID: mb7953.859498327448. Ignoring."
      obj.tagid = placementId;
      obj.secure = window.location.protocol === 'https:' ? 1 : 0;
      let arrBannerSizes = [];
      if (!ozoneBidRequest.hasOwnProperty('mediaTypes')) {
        if (ozoneBidRequest.hasOwnProperty('sizes')) {
          logInfo('no mediaTypes detected - will use the sizes array in the config root');
          arrBannerSizes = ozoneBidRequest.sizes;
        } else {
          logInfo('no mediaTypes detected, no sizes array in the config root either. Cannot set sizes for banner type');
        }
      } else {
        if (ozoneBidRequest.mediaTypes.hasOwnProperty(BANNER)) {
          arrBannerSizes = ozoneBidRequest.mediaTypes[BANNER].sizes; /* Note - if there is a sizes element in the config root it will be pushed into here */
          logInfo('setting banner size from the mediaTypes.banner element for bidId ' + obj.id + ': ', arrBannerSizes);
        }
        if (ozoneBidRequest.mediaTypes.hasOwnProperty(VIDEO)) {
          logInfo('openrtb 2.5 compliant video');
          if (typeof ozoneBidRequest.mediaTypes[VIDEO] == 'object') {
            let childConfig = deepAccess(ozoneBidRequest, 'params.video', {});
            obj.video = this.unpackVideoConfigIntoIABformat(ozoneBidRequest.mediaTypes[VIDEO], childConfig);
            obj.video = this.addVideoDefaults(obj.video, ozoneBidRequest.mediaTypes[VIDEO], childConfig);
          }
          let wh = getWidthAndHeightFromVideoObject(obj.video);
          logInfo('setting video object from the mediaTypes.video element: ' + obj.id + ':', obj.video, 'wh=', wh);
          if (wh && typeof wh === 'object') {
            obj.video.w = wh['w'];
            obj.video.h = wh['h'];
            if (playerSizeIsNestedArray(obj.video)) { // this should never happen; it was in the original spec for this change though.
              logInfo('setting obj.video.format to be an array of objects');
              obj.video.ext.format = [wh];
            } else {
              logInfo('setting obj.video.format to be an object');
              obj.video.ext.format = wh;
            }
          } else {
            logWarn('cannot set w, h & format values for video; the config is not right');
          }
        }
        if (ozoneBidRequest.mediaTypes.hasOwnProperty(NATIVE)) {
          obj.native = ozoneBidRequest.mediaTypes[NATIVE];
          logInfo('setting native object from the mediaTypes.native element: ' + obj.id + ':', obj.native);
        }
        if (ozoneBidRequest.hasOwnProperty('getFloor')) {
          logInfo('This bidRequest object has property: getFloor');
          obj.floor = this.getFloorObjectForAuction(ozoneBidRequest);
          logInfo('obj.floor is : ', obj.floor);
        } else {
          logInfo('This bidRequest object DOES NOT have property: getFloor');
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
      obj.ext[whitelabelBidder].transactionId = ozoneBidRequest.transactionId; // this is the transactionId PER adUnit, common across bidders for this unit
      if (ozoneBidRequest.params.hasOwnProperty('customData')) {
        obj.ext[whitelabelBidder].customData = ozoneBidRequest.params.customData;
      }
      logInfo(`obj.ext.${whitelabelBidder} is `, obj.ext[whitelabelBidder]);
      if (isTestMode != null) {
        logInfo('setting isTestMode to ', isTestMode);
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
        logInfo('added fpd.site');
        if (deepAccess(obj, 'ext.' + whitelabelBidder + '.customData.0.targeting', false)) {
          obj.ext[whitelabelBidder].customData[0].targeting = Object.assign(obj.ext[whitelabelBidder].customData[0].targeting, fpd.site);
        } else {
          deepSetValue(obj, 'ext.' + whitelabelBidder + '.customData.0.targeting', fpd.site);
        }
      }
      if (!schain && deepAccess(ozoneBidRequest, 'schain')) {
        schain = ozoneBidRequest.schain;
      }
      return obj;
    });

    let extObj = {};
    extObj[whitelabelBidder] = {};
    extObj[whitelabelBidder][whitelabelPrefix + '_pb_v'] = OZONEVERSION;
    extObj[whitelabelBidder][whitelabelPrefix + '_rw'] = placementIdOverrideFromGetParam ? 1 : 0;
    if (validBidRequests.length > 0) {
      let userIds = this.cookieSyncBag.userIdObject; // 2021-01-06 - slight optimisation - we've already found this info
      if (userIds.hasOwnProperty('pubcid')) {
        extObj[whitelabelBidder].pubcid = userIds.pubcid;
      }
    }

    extObj[whitelabelBidder].pv = this.getPageId(); // attach the page ID that will be common to all auciton calls for this page if refresh() is called
    let ozOmpFloorDollars = this.getWhitelabelConfigItem('ozone.oz_omp_floor'); // valid only if a dollar value (typeof == 'number')
    logInfo(`${whitelabelPrefix}_omp_floor dollar value = `, ozOmpFloorDollars);
    if (typeof ozOmpFloorDollars === 'number') {
      extObj[whitelabelBidder][whitelabelPrefix + '_omp_floor'] = ozOmpFloorDollars;
    } else if (typeof ozOmpFloorDollars !== 'undefined') {
      logError(`${whitelabelPrefix}_omp_floor is invalid - IF SET then this must be a number, representing dollar value eg. ${whitelabelPrefix}_omp_floor: 1.55. You have it set as a ` + (typeof ozOmpFloorDollars));
    }
    let ozWhitelistAdserverKeys = this.getWhitelabelConfigItem('ozone.oz_whitelist_adserver_keys');
    let useOzWhitelistAdserverKeys = isArray(ozWhitelistAdserverKeys) && ozWhitelistAdserverKeys.length > 0;
    extObj[whitelabelBidder][whitelabelPrefix + '_kvp_rw'] = useOzWhitelistAdserverKeys ? 1 : 0;
    if (whitelabelBidder != 'ozone') {
      logInfo('setting aliases object');
      extObj.prebid = {aliases: {'ozone': whitelabelBidder}};
    }
    if (getParams.hasOwnProperty('ozf')) { extObj[whitelabelBidder]['ozf'] = getParams.ozf == 'true' || getParams.ozf == 1 ? 1 : 0; }
    if (getParams.hasOwnProperty('ozpf')) { extObj[whitelabelBidder]['ozpf'] = getParams.ozpf == 'true' || getParams.ozpf == 1 ? 1 : 0; }
    if (getParams.hasOwnProperty('ozrp') && getParams.ozrp.match(/^[0-3]$/)) { extObj[whitelabelBidder]['ozrp'] = parseInt(getParams.ozrp); }
    if (getParams.hasOwnProperty('ozip') && getParams.ozip.match(/^\d+$/)) { extObj[whitelabelBidder]['ozip'] = parseInt(getParams.ozip); }
    if (this.propertyBag.endpointOverride != null) { extObj[whitelabelBidder]['origin'] = this.propertyBag.endpointOverride; }

    var userExtEids = this.generateEids(validBidRequests); // generate the UserIDs in the correct format for UserId module

    ozoneRequest.site = {
      'publisher': {'id': htmlParams.publisherId},
      'page': document.location.href,
      'id': htmlParams.siteId
    };
    ozoneRequest.test = (getParams.hasOwnProperty('pbjs_debug') && getParams['pbjs_debug'] === 'true') ? 1 : 0;

    if (bidderRequest && bidderRequest.gdprConsent) {
      logInfo('ADDING GDPR info');
      let apiVersion = deepAccess(bidderRequest, 'gdprConsent.apiVersion', 1);
      ozoneRequest.regs = {ext: {gdpr: bidderRequest.gdprConsent.gdprApplies ? 1 : 0, apiVersion: apiVersion}};
      if (deepAccess(ozoneRequest, 'regs.ext.gdpr')) {
        deepSetValue(ozoneRequest, 'user.ext.consent', bidderRequest.gdprConsent.consentString);
      } else {
        logInfo('**** Strange CMP info: bidderRequest.gdprConsent exists BUT bidderRequest.gdprConsent.gdprApplies is false. See bidderRequest logged above. ****');
      }
    } else {
      logInfo('WILL NOT ADD GDPR info; no bidderRequest.gdprConsent object');
    }
    if (bidderRequest && bidderRequest.uspConsent) {
      logInfo('ADDING CCPA info');
      deepSetValue(ozoneRequest, 'user.ext.uspConsent', bidderRequest.uspConsent);
    } else {
      logInfo('WILL NOT ADD CCPA info; no bidderRequest.uspConsent.');
    }
    if (schain) { // we set this while iterating over the bids
      logInfo('schain found');
      deepSetValue(ozoneRequest, 'source.ext.schain', schain);
    }

    if (config.getConfig('coppa') === true) {
      deepSetValue(ozoneRequest, 'regs.coppa', 1);
    }

    if (singleRequest) {
      logInfo('buildRequests starting to generate response for a single request');
      ozoneRequest.id = bidderRequest.auctionId; // Unique ID of the bid request, provided by the exchange.
      ozoneRequest.auctionId = bidderRequest.auctionId; // not sure if this should be here?
      ozoneRequest.imp = tosendtags;
      ozoneRequest.ext = extObj;
      deepSetValue(ozoneRequest, 'source.tid', bidderRequest.auctionId);// RTB 2.5 : tid is Transaction ID that must be common across all participants in this bid request (e.g., potentially multiple exchanges).
      deepSetValue(ozoneRequest, 'user.ext.eids', userExtEids);
      var ret = {
        method: 'POST',
        url: this.getAuctionUrl(),
        data: JSON.stringify(ozoneRequest),
        bidderRequest: bidderRequest
      };
      logInfo('buildRequests request data for single = ', JSON.parse(JSON.stringify(ozoneRequest)));
      this.propertyBag.buildRequestsEnd = new Date().getTime();
      logInfo(`buildRequests going to return for single at time ${this.propertyBag.buildRequestsEnd} (took ${this.propertyBag.buildRequestsEnd - this.propertyBag.buildRequestsStart}ms): `, ret);
      return ret;
    }
    let arrRet = tosendtags.map(imp => {
      logInfo('buildRequests starting to generate non-single response, working on imp : ', imp);
      let ozoneRequestSingle = Object.assign({}, ozoneRequest);
      imp.ext[whitelabelBidder].pageAuctionId = bidderRequest['auctionId']; // make a note in the ext object of what the original auctionId was, in the bidderRequest object
      ozoneRequestSingle.id = imp.ext[whitelabelBidder].transactionId; // Unique ID of the bid request, provided by the exchange.
      ozoneRequestSingle.auctionId = imp.ext[whitelabelBidder].transactionId; // not sure if this should be here?
      ozoneRequestSingle.imp = [imp];
      ozoneRequestSingle.ext = extObj;
      deepSetValue(ozoneRequestSingle, 'source.tid', imp.ext[whitelabelBidder].transactionId);// RTB 2.5 : tid is Transaction ID that must be common across all participants in this bid request (e.g., potentially multiple exchanges).
      deepSetValue(ozoneRequestSingle, 'user.ext.eids', userExtEids);
      logInfo('buildRequests RequestSingle (for non-single) = ', ozoneRequestSingle);
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
  /**
   * parse a bidRequestRef that contains getFloor(), get all the data from it for the sizes & media requested for this bid & return an object containing floor data you can send to auciton endpoint
   * @param bidRequestRef object = a valid bid request object reference
   * @return object
   *
   * call:
   * bidObj.getFloor({
      currency: 'USD', <- currency to return the value in
      mediaType: ‘banner’,
      size: ‘*’ <- or [300,250] or [[300,250],[640,480]]
   * });
   *
   */
  getFloorObjectForAuction(bidRequestRef) {
    const mediaTypesSizes = {
      banner: deepAccess(bidRequestRef, 'mediaTypes.banner.sizes', null),
      video: deepAccess(bidRequestRef, 'mediaTypes.video.playerSize', null),
      native: deepAccess(bidRequestRef, 'mediaTypes.native.image.sizes', null)
    }
    logInfo('getFloorObjectForAuction mediaTypesSizes : ', mediaTypesSizes);
    let ret = {};
    if (mediaTypesSizes.banner) {
      ret.banner = bidRequestRef.getFloor({mediaType: 'banner', currency: 'USD', size: mediaTypesSizes.banner});
    }
    if (mediaTypesSizes.video) {
      ret.video = bidRequestRef.getFloor({mediaType: 'video', currency: 'USD', size: mediaTypesSizes.video});
    }
    if (mediaTypesSizes.native) {
      ret.native = bidRequestRef.getFloor({mediaType: 'native', currency: 'USD', size: mediaTypesSizes.native});
    }
    logInfo('getFloorObjectForAuction returning : ', JSON.parse(JSON.stringify(ret)));
    return ret;
  },
  /**
   * Interpret the response if the array contains BIDDER elements, in the format: [ [bidder1 bid 1, bidder1 bid 2], [bidder2 bid 1, bidder2 bid 2] ]
   * NOte that in singleRequest mode this will be called once, else it will be called for each adSlot's response
   *
   * Updated April 2019 to return all bids, not just the one we decide is the 'winner'
   *
   * @param serverResponse
   * @param request
   * @returns {*}
   */
  interpretResponse(serverResponse, request) {
    if (request && request.bidderRequest && request.bidderRequest.bids) { this.loadWhitelabelData(request.bidderRequest.bids[0]); }
    let startTime = new Date().getTime();
    let whitelabelBidder = this.propertyBag.whitelabel.bidder; // by default = ozone
    let whitelabelPrefix = this.propertyBag.whitelabel.keyPrefix;
    logInfo(`interpretResponse time: ${startTime} . Time between buildRequests done and interpretResponse start was ${startTime - this.propertyBag.buildRequestsEnd}ms`);
    logInfo(`serverResponse, request`, JSON.parse(JSON.stringify(serverResponse)), JSON.parse(JSON.stringify(request)));
    serverResponse = serverResponse.body || {};
    if (!serverResponse.hasOwnProperty('seatbid')) {
      return [];
    }
    if (typeof serverResponse.seatbid !== 'object') {
      return [];
    }
    let arrAllBids = [];
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
        const {defaultWidth, defaultHeight} = defaultSize(thisRequestBid);
        let thisBid = ozoneAddStandardProperties(sb.bid[j], defaultWidth, defaultHeight);
        thisBid.meta = {advertiserDomains: thisBid.adomain || []};
        let videoContext = null;
        let isVideo = false;
        let bidType = deepAccess(thisBid, 'ext.prebid.type');
        logInfo(`this bid type is : ${bidType}`, j);
        if (bidType === VIDEO) {
          isVideo = true;
          videoContext = this.getVideoContextForBidId(thisBid.bidId, request.bidderRequest.bids); // should be instream or outstream (or null if error)
          if (videoContext === 'outstream') {
            logInfo('going to attach a renderer to OUTSTREAM video : ', j);
            thisBid.renderer = newRenderer(thisBid.bidId);
          } else {
            logInfo('bid is not an outstream video, will not attach a renderer: ', j);
          }
        }
        let adserverTargeting = {};
        if (enhancedAdserverTargeting) {
          let allBidsForThisBidid = ozoneGetAllBidsForBidId(thisBid.bidId, serverResponse.seatbid);
          logInfo('Going to iterate allBidsForThisBidId', allBidsForThisBidid);
          Object.keys(allBidsForThisBidid).forEach((bidderName, index, ar2) => {
            logInfo(`adding adserverTargeting for ${bidderName} for bidId ${thisBid.bidId}`);
            adserverTargeting[whitelabelPrefix + '_' + bidderName] = bidderName;
            adserverTargeting[whitelabelPrefix + '_' + bidderName + '_crid'] = String(allBidsForThisBidid[bidderName].crid);
            adserverTargeting[whitelabelPrefix + '_' + bidderName + '_adv'] = String(allBidsForThisBidid[bidderName].adomain);
            adserverTargeting[whitelabelPrefix + '_' + bidderName + '_adId'] = String(allBidsForThisBidid[bidderName].adId);
            adserverTargeting[whitelabelPrefix + '_' + bidderName + '_pb_r'] = getRoundedBid(allBidsForThisBidid[bidderName].price, allBidsForThisBidid[bidderName].ext.prebid.type);
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
          });
        } else {
          if (useOzWhitelistAdserverKeys) {
            logWarn(`You have set a whitelist of adserver keys but this will be ignored because ${whitelabelBidder}.enhancedAdserverTargeting is set to false. No per-bid keys will be sent to adserver.`);
          } else {
            logInfo(`${whitelabelBidder}.enhancedAdserverTargeting is set to false, so no per-bid keys will be sent to adserver.`);
          }
        }
        let {seat: winningSeat, bid: winningBid} = ozoneGetWinnerForRequestBid(thisBid.bidId, serverResponse.seatbid);
        adserverTargeting[whitelabelPrefix + '_auc_id'] = String(request.bidderRequest.auctionId);
        adserverTargeting[whitelabelPrefix + '_winner'] = String(winningSeat);
        adserverTargeting[whitelabelPrefix + '_bid'] = 'true';

        if (enhancedAdserverTargeting) {
          adserverTargeting[whitelabelPrefix + '_imp_id'] = String(winningBid.impid);
          adserverTargeting[whitelabelPrefix + '_pb_v'] = OZONEVERSION;
          adserverTargeting[whitelabelPrefix + '_pb'] = winningBid.price;
          adserverTargeting[whitelabelPrefix + '_pb_r'] = getRoundedBid(winningBid.price, bidType);
          adserverTargeting[whitelabelPrefix + '_adId'] = String(winningBid.adId);
          adserverTargeting[whitelabelPrefix + '_size'] = `${winningBid.width}x${winningBid.height}`;
        }
        if (useOzWhitelistAdserverKeys) { // delete any un-whitelisted keys
          logInfo('Going to filter out adserver targeting keys not in the whitelist: ', ozWhitelistAdserverKeys);
          Object.keys(adserverTargeting).forEach(function(key) { if (ozWhitelistAdserverKeys.indexOf(key) === -1) { delete adserverTargeting[key]; } });
        }
        thisBid.adserverTargeting = adserverTargeting;
        arrAllBids.push(thisBid);
      }
    }
    let endTime = new Date().getTime();
    logInfo(`interpretResponse going to return at time ${endTime} (took ${endTime - startTime}ms) Time from buildRequests Start -> interpretRequests End = ${endTime - this.propertyBag.buildRequestsStart}ms`, arrAllBids);
    return arrAllBids;
  },
  /**
   * Use this to get all config values
   * Now it's getting complicated with whitelabeling, this simplifies the code for getting config values.
   * eg. to get whitelabelled version you just sent the ozone default string like ozone.oz_omp_floor
   * @param ozoneVersion string like 'ozone.oz_omp_floor'
   * @return {string|object}
   */
  getWhitelabelConfigItem(ozoneVersion) {
    if (this.propertyBag.whitelabel.bidder == 'ozone') { return config.getConfig(ozoneVersion); }
    let whitelabelledSearch = ozoneVersion.replace('ozone', this.propertyBag.whitelabel.bidder);
    whitelabelledSearch = whitelabelledSearch.replace('oz_', this.propertyBag.whitelabel.keyPrefix + '_');
    return config.getConfig(whitelabelledSearch);
  },
  /**
   * If a bidder bids for > 1 size for an adslot, allow only the highest bid
   * @param seatbid object (serverResponse.seatbid)
   */
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
  getUserSyncs(optionsType, serverResponse, gdprConsent, usPrivacy) {
    logInfo('getUserSyncs optionsType', optionsType, 'serverResponse', serverResponse, 'gdprConsent', gdprConsent, 'usPrivacy', usPrivacy, 'cookieSyncBag', this.cookieSyncBag);
    if (!serverResponse || serverResponse.length === 0) {
      return [];
    }
    if (optionsType.iframeEnabled) {
      var arrQueryString = [];
      if (document.location.search.match(/pbjs_debug=true/)) {
        arrQueryString.push('pbjs_debug=true');
      }
      arrQueryString.push('gdpr=' + (deepAccess(gdprConsent, 'gdprApplies', false) ? '1' : '0'));
      arrQueryString.push('gdpr_consent=' + deepAccess(gdprConsent, 'consentString', ''));
      arrQueryString.push('usp_consent=' + (usPrivacy || ''));
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
  /**
   * Find the bid matching the bidId in the request object
   * get instream or outstream if this was a video request else null
   * @return object|null
   */
  getBidRequestForBidId(bidId, arrBids) {
    for (let i = 0; i < arrBids.length; i++) {
      if (arrBids[i].bidId === bidId) { // bidId in the request comes back as impid in the seatbid bids
        return arrBids[i];
      }
    }
    return null;
  },
  /**
   * Locate the bid inside the arrBids for this bidId, then discover the video context, and return it.
   * IF the bid cannot be found return null, else return a string.
   * @param bidId
   * @param arrBids
   * @return string|null
   */
  getVideoContextForBidId(bidId, arrBids) {
    let requestBid = this.getBidRequestForBidId(bidId, arrBids);
    if (requestBid != null) {
      return deepAccess(requestBid, 'mediaTypes.video.context', 'unknown')
    }
    return null;
  },
  /**
   * This is used for cookie sync, not auction call
   *  Look for pubcid & all the other IDs according to http://prebid.org/dev-docs/modules/userId.html
   *  @return map
   */
  findAllUserIds(bidRequest) {
    var ret = {};
    let searchKeysSingle = ['pubcid', 'tdid', 'idl_env', 'criteoId', 'lotamePanoramaId', 'fabrickId'];
    if (bidRequest.hasOwnProperty('userId')) {
      for (let arrayId in searchKeysSingle) {
        let key = searchKeysSingle[arrayId];
        if (bidRequest.userId.hasOwnProperty(key)) {
          if (typeof (bidRequest.userId[key]) == 'string') {
            ret[key] = bidRequest.userId[key];
          } else if (typeof (bidRequest.userId[key]) == 'object') {
            logError(`WARNING: findAllUserIds had to use first key in user object to get value for bid.userId key: ${key}. Prebid adapter should be updated.`);
            ret[key] = bidRequest.userId[key][Object.keys(bidRequest.userId[key])[0]]; // cannot use Object.values
          } else {
            logError(`failed to get string key value for userId : ${key}`);
          }
        }
      }
      let lipbid = deepAccess(bidRequest.userId, 'lipb.lipbid');
      if (lipbid) {
        ret['lipb'] = {'lipbid': lipbid};
      }
      let id5id = deepAccess(bidRequest.userId, 'id5id.uid');
      if (id5id) {
        ret['id5id'] = id5id;
      }
      let parrableId = deepAccess(bidRequest.userId, 'parrableId.eid');
      if (parrableId) {
        ret['parrableId'] = parrableId;
      }
      let sharedid = deepAccess(bidRequest.userId, 'sharedid.id');
      if (sharedid) {
        ret['sharedid'] = sharedid;
      }
      let sharedidthird = deepAccess(bidRequest.userId, 'sharedid.third');
      if (sharedidthird) {
        ret['sharedidthird'] = sharedidthird;
      }
    }
    if (!ret.hasOwnProperty('pubcid')) {
      let pubcid = deepAccess(bidRequest, 'crumbs.pubcid');
      if (pubcid) {
        ret['pubcid'] = pubcid; // if built with old pubCommonId module
      }
    }
    return ret;
  },
  /**
   * Convenient method to get the value we need for the placementId - ONLY from the bidRequest - NOT taking into account any GET override ID
   * @param bidRequest
   * @return string
   */
  getPlacementId(bidRequest) {
    return (bidRequest.params.placementId).toString();
  },
  /**
   * GET parameter introduced in 2.2.0 : ozstoredrequest
   * IF the GET parameter exists then it must validate for placementId correctly
   * IF there's a $_GET['ozstoredrequest'] & it's valid then return this. Else return null.
   * @returns null|string
   */
  getPlacementIdOverrideFromGetParam() {
    let whitelabelPrefix = this.propertyBag.whitelabel.keyPrefix;
    let arr = this.getGetParametersAsObject();
    if (arr.hasOwnProperty(whitelabelPrefix + 'storedrequest')) {
      if (this.isValidPlacementId(arr[whitelabelPrefix + 'storedrequest'])) {
        logInfo(`using GET ${whitelabelPrefix}storedrequest ` + arr[whitelabelPrefix + 'storedrequest'] + ' to replace placementId');
        return arr[whitelabelPrefix + 'storedrequest'];
      } else {
        logError(`GET ${whitelabelPrefix}storedrequest FAILED VALIDATION - will not use it`);
      }
    }
    return null;
  },
  /**
   * Generate an object we can append to the auction request, containing user data formatted correctly for different ssps
   * http://prebid.org/dev-docs/modules/userId.html
   * @param validBidRequests
   * @return {Array}
   */
  generateEids(validBidRequests) {
    let eids;
    const bidRequest = validBidRequests[0];
    if (bidRequest && bidRequest.userId) {
      eids = bidRequest.userIdAsEids;
      this.handleTTDId(eids, validBidRequests);
    }
    return eids;
  },
  handleTTDId(eids, validBidRequests) {
    let ttdId = null;
    let adsrvrOrgId = config.getConfig('adsrvrOrgId');
    if (isStr(deepAccess(validBidRequests, '0.userId.tdid'))) {
      ttdId = validBidRequests[0].userId.tdid;
    } else if (adsrvrOrgId && isStr(adsrvrOrgId.TDID)) {
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
  },
  getGetParametersAsObject() {
    let items = location.search.substr(1).split('&');
    let ret = {};
    let tmp = null;
    for (let index = 0; index < items.length; index++) {
      tmp = items[index].split('=');
      ret[tmp[0]] = tmp[1];
    }
    return ret;
  },
  /**
   * Do we have to block this request? Could be due to config values (no longer checking gdpr)
   * @return {boolean|*[]} true = block the request, else false
   */
  blockTheRequest() {
    let ozRequest = this.getWhitelabelConfigItem('ozone.oz_request');
    if (typeof ozRequest == 'boolean' && !ozRequest) {
      logWarn(`Will not allow auction : ${this.propertyBag.whitelabel.keyPrefix}one.${this.propertyBag.whitelabel.keyPrefix}_request is set to false`);
      return true;
    }
    return false;
  },
  /**
   * This returns a random ID for this page. It starts off with the current ms timestamp then appends a random component
   * @return {string}
   */
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
  /**
   *
   * look in ONE object to get video config (we need to call this multiple times, so child settings override parent)
   * @param ret
   * @param objConfig
   * @return {*}
   * @private
   */
  _unpackVideoConfigIntoIABformat(ret, objConfig) {
    let arrVideoKeysAllowed = ['mimes', 'minduration', 'maxduration', 'protocols', 'w', 'h', 'startdelay', 'placement', 'linearity', 'skip', 'skipmin', 'skipafter', 'sequence', 'battr', 'maxextended', 'minbitrate', 'maxbitrate', 'boxingallowed', 'playbackmethod', 'playbackend', 'delivery', 'pos', 'companionad', 'api', 'companiontype'];
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
      if (objConfig.hasOwnProperty('ext')) {
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
  /**
   * modify objRet, adding in default values
   * @param objRet
   * @param objConfig
   * @param addIfMissing
   * @return {*}
   * @private
   */
  _addVideoDefaults(objRet, objConfig, addIfMissing) {
    let context = deepAccess(objConfig, 'context');
    if (context === 'outstream') {
      objRet.placement = 3;
    } else if (context === 'instream') {
      objRet.placement = 1;
    }
    let skippable = deepAccess(objConfig, 'skippable', null);
    if (skippable == null) {
      if (addIfMissing && !objRet.hasOwnProperty('skip')) {
        objRet.skip = skippable ? 1 : 0;
      }
    } else {
      objRet.skip = skippable ? 1 : 0;
    }
    return objRet;
  }
};

/**
 * add a page-level-unique adId element to all server response bids.
 * NOTE that this is destructive - it mutates the serverResponse object sent in as a parameter
 * @param seatbid  object (serverResponse.seatbid)
 * @returns seatbid object
 */
export function injectAdIdsIntoAllBidResponses(seatbid) {
  logInfo('injectAdIdsIntoAllBidResponses', seatbid);
  for (let i = 0; i < seatbid.length; i++) {
    let sb = seatbid[i];
    for (let j = 0; j < sb.bid.length; j++) {
      sb.bid[j]['adId'] = `${sb.bid[j]['impid']}-${i}-${spec.propertyBag.whitelabel.keyPrefix}-${j}`;
    }
  }
  return seatbid;
}

export function checkDeepArray(Arr) {
  if (Array.isArray(Arr)) {
    if (Array.isArray(Arr[0])) {
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

/**
 * Do the messy searching for the best bid response in the serverResponse.seatbid array matching the requestBid.bidId
 * @param requestBid
 * @param serverResponseSeatBid
 * @returns {*} bid object
 */
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

/**
 * Get a list of all the bids, for this bidId. The keys in the response object will be {seatname} OR {seatname}{w}x{h} if seatname already exists
 * @param matchBidId
 * @param serverResponseSeatBid
 * @returns {} = {ozone|320x600:{obj}, ozone|320x250:{obj}, appnexus|300x250:{obj}, ... }
 */
export function ozoneGetAllBidsForBidId(matchBidId, serverResponseSeatBid) {
  let objBids = {};
  for (let j = 0; j < serverResponseSeatBid.length; j++) {
    let theseBids = serverResponseSeatBid[j].bid;
    let thisSeat = serverResponseSeatBid[j].seat;
    for (let k = 0; k < theseBids.length; k++) {
      if (theseBids[k].impid === matchBidId) {
        if (objBids.hasOwnProperty(thisSeat)) { // > 1 bid for an adunit from a bidder - only use the one with the highest bid
          if (objBids[thisSeat]['price'] < theseBids[k].price) {
            objBids[thisSeat] = theseBids[k];
          }
        } else {
          objBids[thisSeat] = theseBids[k];
        }
      }
    }
  }
  return objBids;
}

/**
 * Round the bid price down according to the granularity
 * @param price
 * @param mediaType = video, banner or native
 */
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

/**
 * return the key to use to get the value out of the priceStrings object, taking into account anything at
 * config.priceGranularity level or config.mediaType.xxx level
 * I've noticed that the key specified by prebid core : config.getConfig('priceGranularity') does not properly
 * take into account the 2-levels of config
 */
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

/**
 * return the object to use to create the custom value of the priceStrings object, taking into account anything at
 * config.priceGranularity level or config.mediaType.xxx level
 */
export function getGranularityObject(mediaType, mediaTypeGranularity, strBuckets, objBuckets) {
  if (typeof mediaTypeGranularity === 'object') {
    return mediaTypeGranularity;
  }
  if (strBuckets === 'custom') {
    return objBuckets;
  }
  return '';
}

/**
 * We expect to be able to find a standard set of properties on winning bid objects; add them here.
 * @param seatBid
 * @returns {*}
 */
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

/**
 *
 * @param objVideo will be like {"playerSize":[640,480],"mimes":["video/mp4"],"context":"outstream"} or POSSIBLY {"playerSize":[[640,480]],"mimes":["video/mp4"],"context":"outstream"}
 * @return object {w,h} or null
 */
export function getWidthAndHeightFromVideoObject(objVideo) {
  let playerSize = getPlayerSizeFromObject(objVideo);
  if (!playerSize) {
    return null;
  }
  if (playerSize[0] && typeof playerSize[0] === 'object') {
    logInfo('getWidthAndHeightFromVideoObject found nested array inside playerSize.', playerSize[0]);
    playerSize = playerSize[0];
    if (typeof playerSize[0] !== 'number' && typeof playerSize[0] !== 'string') {
      logInfo('getWidthAndHeightFromVideoObject found non-number/string type inside the INNER array in playerSize. This is totally wrong - cannot continue.', playerSize[0]);
      return null;
    }
  }
  if (playerSize.length !== 2) {
    logInfo('getWidthAndHeightFromVideoObject found playerSize with length of ' + playerSize.length + '. This is totally wrong - cannot continue.');
    return null;
  }
  return ({'w': playerSize[0], 'h': playerSize[1]});
}

/**
 * @param objVideo will be like {"playerSize":[640,480],"mimes":["video/mp4"],"context":"outstream"} or POSSIBLY {"playerSize":[[640,480]],"mimes":["video/mp4"],"context":"outstream"}
 * @return object {w,h} or null
 */
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

/**
 * Common functionality when looking at a video object, to get the playerSize
 * @param objVideo
 * @returns {*}
 */
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
/*
  Rendering video ads - create a renderer instance, mark it as not loaded, set a renderer function.
  The renderer function will not assume that the renderer script is loaded - it will push() the ultimate render function call
 */
function newRenderer(adUnitCode, rendererOptions = {}) {
  let isLoaded = window.ozoneVideo;
  logInfo(`newRenderer going to set loaded to ${isLoaded ? 'true' : 'false'}`);
  const renderer = Renderer.install({
    url: spec.getRendererUrl(),
    config: rendererOptions,
    loaded: isLoaded,
    adUnitCode
  });
  try {
    renderer.setRender(outstreamRender);
  } catch (err) {
    logError('Prebid Error when calling setRender on renderer', JSON.parse(JSON.stringify(renderer)), err);
  }
  return renderer;
}
function outstreamRender(bid) {
  logInfo('outstreamRender called. Going to push the call to window.ozoneVideo.outstreamRender(bid) bid =', JSON.parse(JSON.stringify(bid)));
  bid.renderer.push(() => {
    window.ozoneVideo.outstreamRender(bid);
  });
}

registerBidder(spec);
logInfo(`*BidAdapter ${OZONEVERSION} was loaded`);
