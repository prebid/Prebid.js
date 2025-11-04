import {
  logInfo,
  logError,
  deepAccess,
  logWarn,
  deepSetValue,
  isArray,
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
import {toOrtb25} from '../libraries/ortb2.5Translator/translator.js';
const BIDDER_CODE = 'ozone';
const ORIGIN = 'https://elb.the-ozone-project.com';
const AUCTIONURI = '/openrtb2/auction';
const OZONECOOKIESYNC = '/static/load-cookie.html';
const OZONE_RENDERER_URL = 'https://prebid.the-ozone-project.com/ozone-renderer.js';
const KEY_PREFIX = 'oz';
const OZONEVERSION = '4.0.2';
export const spec = {
  gvlid: 524,
  version: OZONEVERSION,
  code: BIDDER_CODE,
  supportedMediaTypes: [VIDEO, BANNER],
  cookieSyncBag: {publisherId: null, siteId: null, userIdObject: {}},
  propertyBag: {pageId: null, buildRequestsStart: 0, buildRequestsEnd: 0},
  getAuctionUrl() {
    const ep = config.getConfig('ozone.endpointOverride') || {};
    if (ep.auctionUrl) return ep.auctionUrl;
    const origin = ep.origin || ORIGIN;
    return origin + AUCTIONURI;
  },
  getCookieSyncUrl() {
    const ep = config.getConfig('ozone.endpointOverride') || {};
    if (ep.cookieSyncUrl) return ep.cookieSyncUrl;
    const origin = ep.origin || ORIGIN;
    return origin + OZONECOOKIESYNC;
  },
  getRendererUrl() {
    const ep = config.getConfig('ozone.endpointOverride') || {};
    return ep.rendererUrl || OZONE_RENDERER_URL;
  },
  getVideoPlacementValue(context) {
    if (['instream', 'outstream'].indexOf(context) < 0) return null;
    return deepAccess(config.getConfig('ozone.videoParams'), context);
  },
  getBatchRequests() {
    const g = this.getGetParametersAsObject();
    if (g['batchRequests'] && g['batchRequests'].toString().match(/^[0-9]+$/)) {
      return parseInt(g['batchRequests']);
    }
    const batch = config.getConfig('ozone.batchRequests');
    if (batch === true) return 10;
    if (typeof batch === 'number' && batch > 0) {
      return batch;
    }
    return false;
  },
  isBidRequestValid(bid) {
    const vf = 'VALIDATION FAILED';
    logInfo('isBidRequestValid : ', config.getConfig(), bid);
    const adUnitCode = bid.adUnitCode;
    const err1 = `${vf} : missing {param} : siteId, placementId and publisherId are REQUIRED`;
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
    if (!(bid.params.publisherId).toString().match(/^[a-zA-Z0-9-]{12}$/)) {
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
      if (typeof bid.params.customData[0]['targeting'] !== 'object') {
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
    logInfo('**TESTING CONFIG', config.getConfig());
    this.propertyBag.buildRequestsStart = new Date().getTime();
    const bidderKey = BIDDER_CODE;
    const prefix = KEY_PREFIX;
    logInfo(`buildRequests time: ${this.propertyBag.buildRequestsStart} v ${OZONEVERSION} validBidRequests`, deepClone(validBidRequests), 'bidderRequest', deepClone(bidderRequest));
    if (this.blockTheRequest()) {
      return [];
    }
    const fledgeEnabled = !!bidderRequest.fledgeEnabled;
    let htmlParams = {'publisherId': '', 'siteId': ''};
    if (validBidRequests.length > 0) {
      Object.assign(this.cookieSyncBag.userIdObject, this.findAllUserIdsFromEids(validBidRequests[0]));
      this.cookieSyncBag.siteId = deepAccess(validBidRequests[0], 'params.siteId');
      this.cookieSyncBag.publisherId = deepAccess(validBidRequests[0], 'params.publisherId');
      htmlParams = validBidRequests[0].params;
    }
    logInfo('cookie sync bag', this.cookieSyncBag);
    let singleRequest = config.getConfig('ozone.singleRequest');
    singleRequest = singleRequest !== false;
    const ozoneRequest = {site: {}, regs: {}, user: {}};
    const fpd = deepAccess(bidderRequest, 'ortb2', {});
    const fpdPruned = this.pruneToExtPaths(fpd, {maxTestDepth: 2});
    logInfo('got ortb2 fpd: ', fpd);
    logInfo('got ortb2 fpdPruned: ', fpdPruned);
    logInfo('going to assign the pruned (ext only) FPD ortb2 object to ozoneRequest, wholesale');
    mergeDeep(ozoneRequest, fpdPruned);
    toOrtb25(ozoneRequest);
    const getParams = this.getGetParametersAsObject();
    const wlOztestmodeKey = 'oztestmode';
    const isTestMode = getParams[wlOztestmodeKey] || null;
    mergeDeep(ozoneRequest, {device: bidderRequest?.ortb2?.device || {}});
    const placementIdOverrideFromGetParam = this.getPlacementIdOverrideFromGetParam();
    let schain = null;
    var auctionId = deepAccess(validBidRequests, '0.ortb2.source.tid');
    if (auctionId === '0') {
      auctionId = null;
    }
    const tosendtags = validBidRequests.map(ozoneBidRequest => {
      var obj = {};
      let prunedImp = this.pruneToExtPaths(ozoneBidRequest.ortb2Imp, {maxTestDepth: 2});
      logInfo('merging into bid[] from pruned ozoneBidRequest.ortb2Imp (this includes adunits ortb2imp and gpid & tid from gptPreAuction if included', prunedImp);
      mergeDeep(obj, prunedImp);
      const placementId = placementIdOverrideFromGetParam || this.getPlacementId(ozoneBidRequest);
      obj.id = ozoneBidRequest.bidId;
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
          arrBannerSizes = ozoneBidRequest.mediaTypes[BANNER].sizes;
          logInfo('setting banner size from mediaTypes.banner for bidId ' + obj.id + ': ', arrBannerSizes);
        }
        if (ozoneBidRequest.mediaTypes.hasOwnProperty(VIDEO)) {
          logInfo('openrtb 2.5 compliant video');
          if (typeof ozoneBidRequest.mediaTypes[VIDEO] === 'object') {
            const childConfig = deepAccess(ozoneBidRequest, 'params.video', {});
            obj.video = this.unpackVideoConfigIntoIABformat(ozoneBidRequest.mediaTypes[VIDEO], childConfig);
            obj.video = this.addVideoDefaults(obj.video, ozoneBidRequest.mediaTypes[VIDEO], childConfig);
          }
          const wh = getWidthAndHeightFromVideoObject(obj.video);
          logInfo(`setting video object ${obj.id} from mediaTypes.video: `, obj.video, 'wh=', wh);
          const settingToBe = 'setting obj.video.format to be ';
          if (wh && typeof wh === 'object') {
            obj.video.w = wh['w'];
            obj.video.h = wh['h'];
            const ps = getPlayerSizeFromObject(obj.video);
            if (ps && Array.isArray(ps[0])) {
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
      mergeDeep(obj, {ext: {prebid: {'storedrequest': {'id': placementId}}}});
      obj.ext[bidderKey] = obj.ext[bidderKey] || {};
      obj.ext[bidderKey].adUnitCode = ozoneBidRequest.adUnitCode;
      if (ozoneBidRequest.params.hasOwnProperty('customData')) {
        obj.ext[bidderKey].customData = ozoneBidRequest.params.customData;
      }
      if (ozoneBidRequest.params.hasOwnProperty('ozFloor')) {
        const ozFloorParsed = parseFloat(ozoneBidRequest.params.ozFloor);
        if (!isNaN(ozFloorParsed)) {
          obj.ext[bidderKey].ozFloor = ozFloorParsed;
        } else {
          logError(`Ignoring invalid ozFloor value for adunit code: ${ozoneBidRequest.adUnitCode}`);
        }
      }
      logInfo(`obj.ext.${bidderKey} is `, obj.ext[bidderKey]);
      if (isTestMode != null) {
        logInfo(`setting isTestMode: ${isTestMode}`);
        if (obj.ext[bidderKey].hasOwnProperty('customData')) {
          for (let i = 0; i < obj.ext[bidderKey].customData.length; i++) {
            obj.ext[bidderKey].customData[i]['targeting'][wlOztestmodeKey] = isTestMode;
          }
        } else {
          obj.ext[bidderKey].customData = [{'settings': {}, 'targeting': {}}];
          obj.ext[bidderKey].customData[0].targeting[wlOztestmodeKey] = isTestMode;
        }
      }
      if (fpd && deepAccess(fpd, 'site')) {
        logInfo('adding fpd.site');
        if (deepAccess(obj, `ext.${bidderKey}.customData.0.targeting`, false)) {
          Object.assign(obj.ext[bidderKey].customData[0].targeting, fpd.site);
        } else {
          deepSetValue(obj, `ext.${bidderKey}.customData.0.targeting`, fpd.site);
        }
      }
      if (!schain && deepAccess(ozoneBidRequest, 'ortb2.source.ext.schain')) {
        schain = ozoneBidRequest.ortb2.source.ext.schain;
      }
      if (auctionId) {
        obj.ext.auctionId = auctionId;
      }
      if (fledgeEnabled) {
        const auctionEnvironment = deepAccess(ozoneBidRequest, 'ortb2Imp.ext.ae');
        if (isInteger(auctionEnvironment)) {
          deepSetValue(obj, 'ext.ae', auctionEnvironment);
        } else {
          logError(`ignoring ortb2Imp.ext.ae - not an integer for obj.id=${obj.id}`);
        }
      }
      return obj;
    });
    const extObj = {};
    extObj[bidderKey] = {};
    extObj[bidderKey][`${prefix}_pb_v`] = OZONEVERSION;
    extObj[bidderKey][`${prefix}_rw`] = placementIdOverrideFromGetParam ? 1 : 0;
    if (validBidRequests.length > 0) {
      const userIds = this.cookieSyncBag.userIdObject;
      if (userIds.hasOwnProperty('pubcid.org')) {
        extObj[bidderKey].pubcid = userIds['pubcid.org'];
      }
    }
    extObj[bidderKey].pv = this.getPageId();
    const ozOmpFloorDollars = config.getConfig('ozone.oz_omp_floor');
    logInfo(`${prefix}_omp_floor dollar value = `, ozOmpFloorDollars);
    if (typeof ozOmpFloorDollars === 'number') {
      extObj[bidderKey][`${prefix}_omp_floor`] = ozOmpFloorDollars;
    } else if (typeof ozOmpFloorDollars !== 'undefined') {
      logError(`IF set, ${prefix}_omp_floor must be a number eg. 1.55. Found:` + (typeof ozOmpFloorDollars));
    }
    const ozWhitelistAdserverKeys = config.getConfig('ozone.oz_whitelist_adserver_keys');
    const useOzWhitelistAdserverKeys = isArray(ozWhitelistAdserverKeys) && ozWhitelistAdserverKeys.length > 0;
    extObj[bidderKey][prefix + '_kvp_rw'] = useOzWhitelistAdserverKeys ? 1 : 0;
    const endpointOverride = config.getConfig('ozone.endpointOverride');
    if (endpointOverride?.origin || endpointOverride?.auctionUrl) {
      extObj[bidderKey].origin = endpointOverride.auctionUrl || endpointOverride.origin;
    }
    const userExtEids = deepAccess(validBidRequests, '0.userIdAsEids', []);
    mergeDeep(ozoneRequest.site, {
      'publisher': {'id': htmlParams.publisherId},
      'page': getRefererInfo().page,
      'id': htmlParams.siteId
    });
    ozoneRequest.test = config.getConfig('debug') ? 1 : 0;
    if (bidderRequest && bidderRequest.gdprConsent) {
      logInfo('ADDING GDPR');
      const apiVersion = deepAccess(bidderRequest, 'gdprConsent.apiVersion', 1);
      mergeDeep(ozoneRequest.regs, {ext: {gdpr: bidderRequest.gdprConsent.gdprApplies ? 1 : 0, apiVersion: apiVersion}});
      if (bidderRequest.gdprConsent.gdprApplies) {
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
      deepSetValue(ozoneRequest, 'regs.ext.gpp', bidderRequest.ortb2.regs.gpp);
      deepSetValue(ozoneRequest, 'regs.ext.gpp_sid', bidderRequest.ortb2.regs.gpp_sid);
    }
    if (schain) {
      logInfo('schain found');
      deepSetValue(ozoneRequest, 'source.ext.schain', schain);
    }
    if (config.getConfig('coppa') === true) {
      deepSetValue(ozoneRequest, 'regs.coppa', 1);
    }
    extObj[bidderKey].cookieDeprecationLabel = deepAccess(bidderRequest, 'ortb2.device.ext.cdep', 'none');
    logInfo(`cookieDeprecationLabel ortb2.device.ext.cdep = ${extObj[bidderKey].cookieDeprecationLabel}`);
    const batchRequestsVal = this.getBatchRequests();
    if (typeof batchRequestsVal === 'number') {
      logInfo(`Batching = ${batchRequestsVal}`);
      const arrRet = [];
      for (let i = 0; i < tosendtags.length; i += batchRequestsVal) {
        ozoneRequest.id = generateUUID();
        mergeDeep(ozoneRequest, {user: {ext: {eids: userExtEids}}});
        if (auctionId) {
          deepSetValue(ozoneRequest, 'source.tid', auctionId);
        }
        ozoneRequest.imp = tosendtags.slice(i, i + batchRequestsVal);
        mergeDeep(ozoneRequest, {ext: extObj});
        toOrtb25(ozoneRequest);
        if (ozoneRequest.imp.length > 0) {
          arrRet.push({
            method: 'POST',
            url: this.getAuctionUrl(),
            data: JSON.stringify(ozoneRequest),
            bidderRequest: bidderRequest
          });
        }
      }
      this.propertyBag.buildRequestsEnd = new Date().getTime();
      logInfo(`buildRequests batch request going to return at time ${this.propertyBag.buildRequestsEnd} (took ${this.propertyBag.buildRequestsEnd - this.propertyBag.buildRequestsStart}ms):`, arrRet);
      return arrRet;
    }
    if (singleRequest) {
      logInfo('single request starting');
      ozoneRequest.id = generateUUID();
      ozoneRequest.imp = tosendtags;
      mergeDeep(ozoneRequest, {ext: extObj});
      toOrtb25(ozoneRequest);
      mergeDeep(ozoneRequest, {user: {ext: {eids: userExtEids}}});
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
    const arrRet = tosendtags.map(imp => {
      logInfo('non-single response, working on imp : ', imp);
      const ozoneRequestSingle = Object.assign({}, ozoneRequest);
      ozoneRequestSingle.id = generateUUID();
      ozoneRequestSingle.imp = [imp];
      mergeDeep(ozoneRequestSingle, {ext: extObj});
      mergeDeep(ozoneRequestSingle, {user: {ext: {eids: userExtEids}}});
      if (auctionId) {
        deepSetValue(ozoneRequestSingle, 'source.tid', auctionId);
      }
      toOrtb25(ozoneRequestSingle);
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
    const ret = {};
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
    const startTime = new Date().getTime();
    const bidderKey = BIDDER_CODE;
    const prefix = KEY_PREFIX;
    logInfo(`interpretResponse time: ${startTime} . Time between buildRequests done and interpretResponse start was ${startTime - this.propertyBag.buildRequestsEnd}ms`);
    logInfo(`serverResponse, request`, deepClone(serverResponse), deepClone(request));
    serverResponse = serverResponse.body || {};
    const aucId = serverResponse.id;
    if (!serverResponse.hasOwnProperty('seatbid')) {
      return [];
    }
    if (typeof serverResponse.seatbid !== 'object') {
      return [];
    }
    const arrAllBids = [];
    let labels;
    let enhancedAdserverTargeting = config.getConfig('ozone.enhancedAdserverTargeting');
    logInfo('enhancedAdserverTargeting', enhancedAdserverTargeting);
    if (typeof enhancedAdserverTargeting === 'undefined') {
      enhancedAdserverTargeting = true;
    }
    logInfo('enhancedAdserverTargeting', enhancedAdserverTargeting);
    serverResponse.seatbid = injectAdIdsIntoAllBidResponses(serverResponse.seatbid);
    serverResponse.seatbid = this.removeSingleBidderMultipleBids(serverResponse.seatbid);
    const ozOmpFloorDollars = config.getConfig('ozone.oz_omp_floor');
    const addOzOmpFloorDollars = typeof ozOmpFloorDollars === 'number';
    const ozWhitelistAdserverKeys = config.getConfig('ozone.oz_whitelist_adserver_keys');
    const useOzWhitelistAdserverKeys = isArray(ozWhitelistAdserverKeys) && ozWhitelistAdserverKeys.length > 0;
    for (let i = 0; i < serverResponse.seatbid.length; i++) {
      const sb = serverResponse.seatbid[i];
      for (let j = 0; j < sb.bid.length; j++) {
        const thisRequestBid = this.getBidRequestForBidId(sb.bid[j].impid, request.bidderRequest.bids);
        logInfo(`seatbid:${i}, bid:${j} Going to set default w h for seatbid/bidRequest`, sb.bid[j], thisRequestBid);
        const {defaultWidth, defaultHeight} = defaultSize(thisRequestBid);
        const thisBid = ozoneAddStandardProperties(sb.bid[j], defaultWidth, defaultHeight);
        thisBid.meta = {advertiserDomains: thisBid.adomain || []};
        let videoContext = null;
        let isVideo = false;
        const bidType = deepAccess(thisBid, 'ext.prebid.type');
        logInfo(`this bid type is : ${bidType}`);
        let adserverTargeting = {};
        if (bidType === VIDEO) {
          isVideo = true;
          this.setBidMediaTypeIfNotExist(thisBid, VIDEO);
          videoContext = this.getVideoContextForBidId(thisBid.bidId, request.bidderRequest.bids);
          if (videoContext === 'outstream') {
            logInfo('setting thisBid.mediaType = VIDEO & attach a renderer to OUTSTREAM video');
            thisBid.renderer = newRenderer(thisBid.bidId);
            thisBid.vastUrl = `https://${deepAccess(thisBid, 'ext.prebid.targeting.hb_cache_host', 'missing_host')}${deepAccess(thisBid, 'ext.prebid.targeting.hb_cache_path', 'missing_path')}?uuid=${deepAccess(thisBid, 'ext.prebid.targeting.hb_uuid', 'missing_uuid')}`;
            thisBid.vastXml = thisBid.adm;
          } else {
            logInfo('not an outstream video (presumably instream), will set thisBid.mediaType = VIDEO and thisBid.vastUrl and not attach a renderer');
            thisBid.vastUrl = `https://${deepAccess(thisBid, 'ext.prebid.targeting.hb_cache_host', 'missing_host')}${deepAccess(thisBid, 'ext.prebid.targeting.hb_cache_path', 'missing_path')}?uuid=${deepAccess(thisBid, 'ext.prebid.targeting.hb_uuid', 'missing_uuid')}`;
            if (!thisBid.hasOwnProperty('videoCacheKey')) {
              const videoCacheUuid = deepAccess(thisBid, 'ext.prebid.targeting.hb_uuid', 'no_hb_uuid');
              logInfo(`Adding videoCacheKey: ${videoCacheUuid}`);
              thisBid.videoCacheKey = videoCacheUuid;
            } else {
              logInfo('videoCacheKey already exists on the bid object, will not add it');
            }
          }
        } else {
          this.setBidMediaTypeIfNotExist(thisBid, BANNER);
        }
        adserverTargeting = Object.assign(adserverTargeting, deepAccess(thisBid, 'ext.prebid.targeting', {}));
        if (enhancedAdserverTargeting) {
          const allBidsForThisBidid = ozoneGetAllBidsForBidId(thisBid.bidId, serverResponse.seatbid, defaultWidth, defaultHeight);
          logInfo('Going to iterate allBidsForThisBidId', deepClone(allBidsForThisBidid));
          Object.keys(allBidsForThisBidid).forEach((seat, index, ar2) => {
            logInfo(`adding adserverTargeting for ${seat} for bidId ${thisBid.bidId}`);
            adserverTargeting[prefix + '_' + seat] = seat;
            adserverTargeting[prefix + '_' + seat + '_crid'] = String(allBidsForThisBidid[seat].crid);
            adserverTargeting[prefix + '_' + seat + '_adv'] = String(allBidsForThisBidid[seat].adomain);
            adserverTargeting[prefix + '_' + seat + '_adId'] = String(allBidsForThisBidid[seat].adId);
            adserverTargeting[prefix + '_' + seat + '_pb_r'] = getRoundedBid(allBidsForThisBidid[seat].price, allBidsForThisBidid[seat].ext.prebid.type);
            adserverTargeting[prefix + '_' + seat + '_size'] = String(allBidsForThisBidid[seat].width) + 'x' + String(allBidsForThisBidid[seat].height);
            if (allBidsForThisBidid[seat].hasOwnProperty('dealid')) {
              adserverTargeting[prefix + '_' + seat + '_dealid'] = String(allBidsForThisBidid[seat].dealid);
            }
            if (addOzOmpFloorDollars) {
              adserverTargeting[prefix + '_' + seat + '_omp'] = allBidsForThisBidid[seat].price >= ozOmpFloorDollars ? '1' : '0';
            }
            if (isVideo) {
              adserverTargeting[prefix + '_' + seat + '_vid'] = videoContext;
            }
            const flr = deepAccess(allBidsForThisBidid[seat], `ext.bidder.${bidderKey}.floor`, null);
            if (flr != null) {
              adserverTargeting[prefix + '_' + seat + '_flr'] = flr;
            }
            const rid = deepAccess(allBidsForThisBidid[seat], `ext.bidder.${bidderKey}.ruleId`, null);
            if (rid != null) {
              adserverTargeting[prefix + '_' + seat + '_rid'] = rid;
            }
            if (seat.match(/^ozappnexus/)) {
              adserverTargeting[prefix + '_' + seat + '_sid'] = String(allBidsForThisBidid[seat].cid);
            }
            labels = deepAccess(allBidsForThisBidid[seat], 'ext.prebid.labels', null) || deepAccess(allBidsForThisBidid[seat], 'ext.bidder.prebid.label', null);
            if (labels) {
              adserverTargeting[prefix + '_' + seat + '_labels'] = labels.join(',');
            }
          });
        } else {
          const perBidInfo = `${bidderKey}.enhancedAdserverTargeting is set to false. No per-bid keys will be sent to adserver.`;
          if (useOzWhitelistAdserverKeys) {
            logWarn(`Your adserver keys whitelist will be ignored - ${perBidInfo}`);
          } else {
            logInfo(perBidInfo);
          }
        }
        let {seat: winningSeat, bid: winningBid} = ozoneGetWinnerForRequestBid(thisBid.bidId, serverResponse.seatbid);
        winningBid = ozoneAddStandardProperties(winningBid, defaultWidth, defaultHeight);
        adserverTargeting[prefix + '_auc_id'] = String(aucId);
        adserverTargeting[prefix + '_winner'] = String(winningSeat);
        adserverTargeting[prefix + '_bid'] = 'true';
        adserverTargeting[prefix + '_cache_id'] = deepAccess(thisBid, 'ext.prebid.targeting.hb_cache_id', 'no-id');
        adserverTargeting[prefix + '_uuid'] = deepAccess(thisBid, 'ext.prebid.targeting.hb_uuid', 'no-id');
        if (enhancedAdserverTargeting) {
          labels = deepAccess(winningBid, 'ext.prebid.labels', null) || deepAccess(winningBid, 'ext.bidder.prebid.label', null);
          if (labels) {
            adserverTargeting[prefix + '_labels'] = labels.join(',');
          }
          adserverTargeting[prefix + '_imp_id'] = String(winningBid.impid);
          adserverTargeting[prefix + '_pb_v'] = OZONEVERSION;
          adserverTargeting[prefix + '_pb'] = winningBid.price;
          adserverTargeting[prefix + '_pb_r'] = getRoundedBid(winningBid.price, bidType);
          adserverTargeting[prefix + '_adId'] = String(winningBid.adId);
          adserverTargeting[prefix + '_size'] = `${winningBid.width}x${winningBid.height}`;
        }
        if (useOzWhitelistAdserverKeys) {
          logInfo('Filtering out adserver targeting keys not in the whitelist: ', ozWhitelistAdserverKeys);
          Object.keys(adserverTargeting).forEach(function(key) { if (ozWhitelistAdserverKeys.indexOf(key) === -1) { delete adserverTargeting[key]; } });
        }
        thisBid.adserverTargeting = adserverTargeting;
        arrAllBids.push(thisBid);
      }
    }
    let ret = arrAllBids;
    let fledgeAuctionConfigs = deepAccess(serverResponse, 'ext.igi') || [];
    if (isArray(fledgeAuctionConfigs) && fledgeAuctionConfigs.length > 0) {
      fledgeAuctionConfigs = fledgeAuctionConfigs.filter(cfg => {
        if (typeof cfg !== 'object' || cfg === null) {
          logWarn('Removing malformed fledge auction config:', cfg);
          return false;
        }
        return true;
      });
      ret = {
        bids: arrAllBids,
        fledgeAuctionConfigs,
      };
    }
    const endTime = new Date().getTime();
    logInfo(`interpretResponse going to return at time ${endTime} (took ${endTime - startTime}ms) Time from buildRequests Start -> interpretRequests End = ${endTime - this.propertyBag.buildRequestsStart}ms`);
    logInfo('will return: ', deepClone(ret));
    return ret;
  },
  setBidMediaTypeIfNotExist(thisBid, mediaType) {
    if (!thisBid.hasOwnProperty('mediaType')) {
      logInfo(`setting thisBid.mediaType = ${mediaType}`);
      thisBid.mediaType = mediaType;
    } else {
      logInfo(`found value for thisBid.mediaType: ${thisBid.mediaType}`);
    }
  },
  removeSingleBidderMultipleBids(seatbid) {
    var ret = [];
    for (let i = 0; i < seatbid.length; i++) {
      const sb = seatbid[i];
      var retSeatbid = {'seat': sb.seat, 'bid': []};
      var bidIds = [];
      for (let j = 0; j < sb.bid.length; j++) {
        var candidate = sb.bid[j];
        if (bidIds.includes(candidate.impid)) {
          continue;
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
    const { gppString = '', applicableSections = [] } = gppConsent;
    if (optionsType.iframeEnabled) {
      const arrQueryString = [];
      if (config.getConfig('debug')) {
        arrQueryString.push('pbjs_debug=true');
      }
      arrQueryString.push('gdpr=' + (deepAccess(gdprConsent, 'gdprApplies', false) ? '1' : '0'));
      arrQueryString.push('gdpr_consent=' + deepAccess(gdprConsent, 'consentString', ''));
      arrQueryString.push('usp_consent=' + (usPrivacy || ''));
      arrQueryString.push('gpp=' + gppString);
      if (Array.isArray(applicableSections)) {
        arrQueryString.push(`gpp_sid=${applicableSections.join()}`);
      }
      for (const keyname in this.cookieSyncBag.userIdObject) {
        arrQueryString.push(keyname + '=' + this.cookieSyncBag.userIdObject[keyname]);
      }
      arrQueryString.push('publisherId=' + this.cookieSyncBag.publisherId);
      arrQueryString.push('siteId=' + this.cookieSyncBag.siteId);
      arrQueryString.push('cb=' + Date.now());
      arrQueryString.push('bidder=' + BIDDER_CODE);
      let strQueryString = arrQueryString.join('&');
      if (strQueryString.length > 0) {
        strQueryString = '?' + strQueryString;
      }
      logInfo('getUserSyncs going to return cookie sync url : ' + this.getCookieSyncUrl() + strQueryString);
      return [{ type: 'iframe', url: this.getCookieSyncUrl() + strQueryString }];
    }
  },
  getBidRequestForBidId(bidId, arrBids) {
    for (let i = 0; i < arrBids.length; i++) {
      if (arrBids[i].bidId === bidId) {
        return arrBids[i];
      }
    }
    return null;
  },
  getVideoContextForBidId(bidId, arrBids) {
    const requestBid = this.getBidRequestForBidId(bidId, arrBids);
    if (requestBid != null) {
      return deepAccess(requestBid, 'mediaTypes.video.context', 'unknown')
    }
    return null;
  },
  findAllUserIdsFromEids(bidRequest) {
    const ret = {};
    let userIdAsEids = bidRequest.userIdAsEids || [];
    for (const obj of userIdAsEids) {
      ret[obj.source] = deepAccess(obj, 'uids.0.id');
    }
    this.tryGetPubCidFromOldLocation(ret, bidRequest);
    return ret;
  },
  tryGetPubCidFromOldLocation(ret, bidRequest) {
    if (!ret.hasOwnProperty('pubcid')) {
      const pubcid = deepAccess(bidRequest, 'crumbs.pubcid');
      if (pubcid) {
        ret['pubcid.org'] = pubcid;
      }
    }
  },
  getPlacementId(bidRequest) {
    return (bidRequest.params.placementId).toString();
  },
  getPlacementIdOverrideFromGetParam() {
    const arr = this.getGetParametersAsObject();
    if (arr.hasOwnProperty(KEY_PREFIX + 'storedrequest')) {
      if (this.isValidPlacementId(arr[KEY_PREFIX + 'storedrequest'])) {
        logInfo(`using GET ${KEY_PREFIX}storedrequest=` + arr[KEY_PREFIX + 'storedrequest'] + ' to replace placementId');
        return arr[KEY_PREFIX + 'storedrequest'];
      } else {
        logError(`GET ${KEY_PREFIX}storedrequest FAILED VALIDATION - will not use it`);
      }
    }
    return null;
  },
  getGetParametersAsObject() {
    const parsed = parseUrl(getRefererInfo().location);
    logInfo('getGetParametersAsObject found:', parsed.search);
    return parsed.search;
  },
  blockTheRequest() {
    const ozRequest = config.getConfig('ozone.oz_request');
    if (ozRequest === false) {
      logWarn('Will not allow the auction : oz_request is set to false');
      return true;
    }
    return false;
  },
  getPageId: function() {
    if (this.propertyBag.pageId == null) {
      let randPart = '';
      const allowable = '0123456789abcdefghijklmnopqrstuvwxyz';
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
    const arrVideoKeysAllowed = ['mimes', 'minduration', 'maxduration', 'protocols', 'w', 'h', 'startdelay', 'placement', 'plcmt', 'linearity', 'skip', 'skipmin', 'skipafter', 'sequence', 'battr', 'maxextended', 'minbitrate', 'maxbitrate', 'boxingallowed', 'playbackmethod', 'playbackend', 'delivery', 'pos', 'companionad', 'api', 'companiontype'];
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
    const apply = (cfg, addIfMissing) => {
      if (!cfg) return;
      const placement = this.getVideoPlacementValue(deepAccess(cfg, 'context'));
      if (placement) {
        objRet.placement = placement;
      }
      const skippable = deepAccess(cfg, 'skippable', null);
      if (skippable == null) {
        if (addIfMissing && !objRet.hasOwnProperty('skip')) {
          objRet.skip = 0;
        }
      } else {
        objRet.skip = skippable ? 1 : 0;
      }
    };
    apply(videoConfig, false);
    apply(childConfig, true);
    return objRet;
  },
  getLoggableBidObject(bid) {
    const logObj = {
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
  },
  pruneToExtPaths: function (input, { testKey = 'ext', maxTestDepth = Infinity } = {}) {
    const isPlainObj = v => v && typeof v === 'object' && !Array.isArray(v);
    const deepClone = node => {
      if (Array.isArray(node)) return node.map(deepClone);
      if (isPlainObj(node)) {
        const out = {};
        for (const [k, v] of Object.entries(node)) out[k] = deepClone(v);
        return out;
      }
      return node;
    };
    const isEmpty = v =>
      v == null ||
        (Array.isArray(v) ? v.length === 0
          : isPlainObj(v) ? Object.keys(v).length === 0 : false);
    function prune(node, inExt, depth) {
      if (node == null) return undefined;
      if (typeof node !== 'object') return inExt ? node : undefined;
      if (inExt) return deepClone(node);
      if (Array.isArray(node)) {
        const kept = node
          .map(el => prune(el, false, depth))
          .filter(el => el !== undefined && !isEmpty(el));
        return kept.length ? kept : undefined;
      }
      const out = {};
      for (const [k, v] of Object.entries(node)) {
        const kDepth = depth + 1;
        const enterExt = (k === testKey) && (kDepth <= maxTestDepth);
        const child = prune(v, enterExt, kDepth);
        if (child !== undefined && !isEmpty(child)) out[k] = child;
      }
      return Object.keys(out).length ? out : undefined;
    }
    const result = prune(input, false, 0);
    return result ?? (Array.isArray(input) ? [] : {});
  }
};
export function injectAdIdsIntoAllBidResponses(seatbid) {
  logInfo('injectAdIdsIntoAllBidResponses', deepClone(seatbid));
  for (let i = 0; i < seatbid.length; i++) {
    const sb = seatbid[i];
    for (let j = 0; j < sb.bid.length; j++) {
      sb.bid[j]['adId'] = `${sb.bid[j]['impid']}-${i}-${KEY_PREFIX}-${j}`;
    }
  }
  return seatbid;
}
export function defaultSize(thebidObj) {
  if (!thebidObj) {
    logInfo('defaultSize received empty bid obj! going to return fixed default size');
    return {
      'defaultHeight': 250,
      'defaultWidth': 300
    };
  }
  const sizes = thebidObj.sizes || [];
  const first = Array.isArray(sizes[0]) ? sizes[0] : sizes;
  return {
    defaultWidth: first[0],
    defaultHeight: first[1]
  };
}
export function ozoneGetWinnerForRequestBid(requestBidId, serverResponseSeatBid) {
  let thisBidWinner = null;
  let winningSeat = null;
  for (let j = 0; j < serverResponseSeatBid.length; j++) {
    const theseBids = serverResponseSeatBid[j].bid;
    const thisSeat = serverResponseSeatBid[j].seat;
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
  const objBids = {};
  for (let j = 0; j < serverResponseSeatBid.length; j++) {
    const theseBids = serverResponseSeatBid[j].bid;
    const thisSeat = serverResponseSeatBid[j].seat;
    for (let k = 0; k < theseBids.length; k++) {
      if (theseBids[k].impid === matchBidId) {
        if (objBids.hasOwnProperty(thisSeat)) {
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
  const mediaTypeGranularity = config.getConfig(`mediaTypePriceGranularity.${mediaType}`);
  let key = 'auto';
  let buckets = config.getConfig('customPriceBucket');
  if (typeof mediaTypeGranularity === 'string') {
    key = mediaTypeGranularity;
  } else if (typeof mediaTypeGranularity === 'object') {
    key = 'custom';
    buckets = mediaTypeGranularity;
  } else {
    const strBuckets = config.getConfig('priceGranularity');
    if (typeof strBuckets === 'string') {
      key = strBuckets;
    }
    if (strBuckets === 'custom') {
      key = 'custom';
    }
  }
  const mapping = {medium: 'med', custom: 'custom', high: 'high', low: 'low', dense: 'dense'};
  const priceStrings = getPriceBucketString(price, buckets, config.getConfig('currency.granularityMultiplier'));
  logInfo('getRoundedBid price:', price, 'mediaType:', mediaType, 'bucketKey:', key);
  return priceStrings[mapping[key] || 'auto'];
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
let rendererInstance;
function newRenderer(adUnitCode, rendererOptions = {}) {
  if (!rendererInstance) {
    rendererInstance = Renderer.install({
      url: spec.getRendererUrl(),
      config: rendererOptions,
      loaded: false,
      adUnitCode
    });
    try {
      rendererInstance.setRender(outstreamRender);
    } catch (err) {
      logError('Prebid Error calling renderer.setRender', rendererInstance, err);
    }
    logInfo('created renderer object');
  }
  return rendererInstance;
}
function outstreamRender(bid) {
  logInfo('outstreamRender got', deepClone(bid));
  bid.renderer.push(() => {
    logInfo('outstreamRender: Going to execute window.ozoneVideo.outstreamRender');
    window.ozoneVideo.outstreamRender(bid);
  });
}
registerBidder(spec);
logInfo(`*BidAdapter ${OZONEVERSION} was loaded`);
