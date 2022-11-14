import { logInfo, logError, deepAccess, logWarn, deepSetValue, isArray, contains, parseUrl } from '../src/utils.js';
import { registerBidder } from '../src/adapters/bidderFactory.js';
import { BANNER, NATIVE } from '../src/mediaTypes.js';
import {config} from '../src/config.js';
import {getPriceBucketString} from '../src/cpmBucketManager.js';
import {getRefererInfo} from '../src/refererDetection.js';
const BIDDER_CODE = 'newspassid';
const ORIGIN = 'https://bidder.newspassid.com' // applies only to auction & cookie
const AUCTIONURI = '/openrtb2/auction';
const NEWSPASSCOOKIESYNC = '/static/load-cookie.html';
const NEWSPASSVERSION = '1.0.1';
export const spec = {
  version: NEWSPASSVERSION,
  code: BIDDER_CODE,
  supportedMediaTypes: [BANNER],
  cookieSyncBag: {publisherId: null, siteId: null, userIdObject: {}}, // variables we want to make available to cookie sync
  propertyBag: {config: null, pageId: null, buildRequestsStart: 0, buildRequestsEnd: 0, endpointOverride: null}, /* allow us to store vars in instance scope - needs to be an object to be mutable */
  config_defaults: {
    'logId': 'NEWSPASSID',
    'bidder': 'newspassid',
    'auctionUrl': ORIGIN + AUCTIONURI,
    'cookieSyncUrl': ORIGIN + NEWSPASSCOOKIESYNC
  },
  loadConfiguredData(bid) {
    if (this.propertyBag.config) { return; }
    this.propertyBag.config = JSON.parse(JSON.stringify(this.config_defaults));
    let bidder = bid.bidder || 'newspassid';
    this.propertyBag.config.logId = bidder.toUpperCase();
    this.propertyBag.config.bidder = bidder;
    let bidderConfig = config.getConfig(bidder) || {};
    logInfo('got bidderConfig: ', JSON.parse(JSON.stringify(bidderConfig)));
    let arrGetParams = this.getGetParametersAsObject();
    if (bidderConfig.endpointOverride) {
      if (bidderConfig.endpointOverride.origin) {
        this.propertyBag.endpointOverride = bidderConfig.endpointOverride.origin;
        this.propertyBag.config.auctionUrl = bidderConfig.endpointOverride.origin + AUCTIONURI;
        this.propertyBag.config.cookieSyncUrl = bidderConfig.endpointOverride.origin + NEWSPASSCOOKIESYNC;
      }
      if (bidderConfig.endpointOverride.cookieSyncUrl) {
        this.propertyBag.config.cookieSyncUrl = bidderConfig.endpointOverride.cookieSyncUrl;
      }
      if (bidderConfig.endpointOverride.auctionUrl) {
        this.propertyBag.endpointOverride = bidderConfig.endpointOverride.auctionUrl;
        this.propertyBag.config.auctionUrl = bidderConfig.endpointOverride.auctionUrl;
      }
    }
    try {
      if (arrGetParams.hasOwnProperty('auction')) {
        logInfo('GET: setting auction endpoint to: ' + arrGetParams.auction);
        this.propertyBag.config.auctionUrl = arrGetParams.auction;
      }
      if (arrGetParams.hasOwnProperty('cookiesync')) {
        logInfo('GET: setting cookiesync to: ' + arrGetParams.cookiesync);
        this.propertyBag.config.cookieSyncUrl = arrGetParams.cookiesync;
      }
    } catch (e) {}
    logInfo('set propertyBag.config to', this.propertyBag.config);
  },
  getAuctionUrl() {
    return this.propertyBag.config.auctionUrl;
  },
  getCookieSyncUrl() {
    return this.propertyBag.config.cookieSyncUrl;
  },
  isBidRequestValid(bid) {
    this.loadConfiguredData(bid);
    logInfo('isBidRequestValid : ', config.getConfig(), bid);
    let adUnitCode = bid.adUnitCode; // adunit[n].code
    let err1 = 'VALIDATION FAILED : missing {param} : siteId, placementId and publisherId are REQUIRED';
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
      logError('VALIDATION FAILED : publisherId must be exactly 12 alphanumeric characters including hyphens', adUnitCode);
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
    return true;
  },
  isValidPlacementId(placementId) {
    return placementId.toString().match(/^[0-9]{10}$/);
  },
  buildRequests(validBidRequests, bidderRequest) {
    this.loadConfiguredData(validBidRequests[0]);
    this.propertyBag.buildRequestsStart = new Date().getTime();
    logInfo(`buildRequests time: ${this.propertyBag.buildRequestsStart} v ${NEWSPASSVERSION} validBidRequests`, JSON.parse(JSON.stringify(validBidRequests)), 'bidderRequest', JSON.parse(JSON.stringify(bidderRequest)));
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
    let singleRequest = config.getConfig('newspassid.singleRequest');
    singleRequest = singleRequest !== false; // undefined & true will be true
    logInfo(`config newspassid.singleRequest : `, singleRequest);
    let npRequest = {}; // we only want to set specific properties on this, not validBidRequests[0].params
    logInfo('going to get ortb2 from bidder request...');
    let fpd = deepAccess(bidderRequest, 'ortb2', null);
    logInfo('got fpd: ', fpd);
    if (fpd && deepAccess(fpd, 'user')) {
      logInfo('added FPD user object');
      npRequest.user = fpd.user;
    }
    const getParams = this.getGetParametersAsObject();
    const isTestMode = getParams['nptestmode'] || null; // this can be any string, it's used for testing ads
    npRequest.device = {'w': window.innerWidth, 'h': window.innerHeight};
    let placementIdOverrideFromGetParam = this.getPlacementIdOverrideFromGetParam(); // null or string
    let schain = null;
    let tosendtags = validBidRequests.map(npBidRequest => {
      var obj = {};
      let placementId = placementIdOverrideFromGetParam || this.getPlacementId(npBidRequest); // prefer to use a valid override param, else the bidRequest placement Id
      obj.id = npBidRequest.bidId; // this causes an error if we change it to something else, even if you update the bidRequest object: "WARNING: Bidder newspass made bid for unknown request ID: mb7953.859498327448. Ignoring."
      obj.tagid = placementId;
      let parsed = parseUrl(getRefererInfo().page);
      obj.secure = parsed.protocol === 'https' ? 1 : 0;
      let arrBannerSizes = [];
      if (!npBidRequest.hasOwnProperty('mediaTypes')) {
        if (npBidRequest.hasOwnProperty('sizes')) {
          logInfo('no mediaTypes detected - will use the sizes array in the config root');
          arrBannerSizes = npBidRequest.sizes;
        } else {
          logInfo('Cannot set sizes for banner type');
        }
      } else {
        if (npBidRequest.mediaTypes.hasOwnProperty(BANNER)) {
          arrBannerSizes = npBidRequest.mediaTypes[BANNER].sizes; /* Note - if there is a sizes element in the config root it will be pushed into here */
          logInfo('setting banner size from the mediaTypes.banner element for bidId ' + obj.id + ': ', arrBannerSizes);
        }
        if (npBidRequest.mediaTypes.hasOwnProperty(NATIVE)) {
          obj.native = npBidRequest.mediaTypes[NATIVE];
          logInfo('setting native object from the mediaTypes.native element: ' + obj.id + ':', obj.native);
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
      obj.ext['newspassid'] = {};
      obj.ext['newspassid'].adUnitCode = npBidRequest.adUnitCode; // eg. 'mpu'
      obj.ext['newspassid'].transactionId = npBidRequest.transactionId; // this is the transactionId PER adUnit, common across bidders for this unit
      if (npBidRequest.params.hasOwnProperty('customData')) {
        obj.ext['newspassid'].customData = npBidRequest.params.customData;
      }
      logInfo(`obj.ext.newspassid is `, obj.ext['newspassid']);
      if (isTestMode != null) {
        logInfo('setting isTestMode to ', isTestMode);
        if (obj.ext['newspassid'].hasOwnProperty('customData')) {
          for (let i = 0; i < obj.ext['newspassid'].customData.length; i++) {
            obj.ext['newspassid'].customData[i]['targeting']['nptestmode'] = isTestMode;
          }
        } else {
          obj.ext['newspassid'].customData = [{'settings': {}, 'targeting': {}}];
          obj.ext['newspassid'].customData[0].targeting['nptestmode'] = isTestMode;
        }
      }
      if (fpd && deepAccess(fpd, 'site')) {
        logInfo('adding fpd.site');
        if (deepAccess(obj, 'ext.newspassid.customData.0.targeting', false)) {
          obj.ext.newspassid.customData[0].targeting = Object.assign(obj.ext.newspassid.customData[0].targeting, fpd.site);
        } else {
          deepSetValue(obj, 'ext.newspassid.customData.0.targeting', fpd.site);
        }
      }
      if (!schain && deepAccess(npBidRequest, 'schain')) {
        schain = npBidRequest.schain;
      }
      return obj;
    });
    let extObj = {};
    extObj['newspassid'] = {};
    extObj['newspassid']['np_pb_v'] = NEWSPASSVERSION;
    extObj['newspassid']['np_rw'] = placementIdOverrideFromGetParam ? 1 : 0;
    if (validBidRequests.length > 0) {
      let userIds = this.cookieSyncBag.userIdObject; // 2021-01-06 - slight optimisation - we've already found this info
      if (userIds.hasOwnProperty('pubcid')) {
        extObj['newspassid'].pubcid = userIds.pubcid;
      }
    }
    extObj['newspassid'].pv = this.getPageId(); // attach the page ID that will be common to all auction calls for this page if refresh() is called
    let whitelistAdserverKeys = config.getConfig('newspassid.np_whitelist_adserver_keys');
    let useWhitelistAdserverKeys = isArray(whitelistAdserverKeys) && whitelistAdserverKeys.length > 0;
    extObj['newspassid']['np_kvp_rw'] = useWhitelistAdserverKeys ? 1 : 0;
    if (getParams.hasOwnProperty('npf')) { extObj['newspassid']['npf'] = getParams.npf === 'true' || getParams.npf === '1' ? 1 : 0; }
    if (getParams.hasOwnProperty('nppf')) { extObj['newspassid']['nppf'] = getParams.nppf === 'true' || getParams.nppf === '1' ? 1 : 0; }
    if (getParams.hasOwnProperty('nprp') && getParams.nprp.match(/^[0-3]$/)) { extObj['newspassid']['nprp'] = parseInt(getParams.nprp); }
    if (getParams.hasOwnProperty('npip') && getParams.npip.match(/^\d+$/)) { extObj['newspassid']['npip'] = parseInt(getParams.npip); }
    if (this.propertyBag.endpointOverride != null) { extObj['newspassid']['origin'] = this.propertyBag.endpointOverride; }
    let userExtEids = deepAccess(validBidRequests, '0.userIdAsEids', []); // generate the UserIDs in the correct format for UserId module
    npRequest.site = {
      'publisher': {'id': htmlParams.publisherId},
      'page': getRefererInfo().page,
      'id': htmlParams.siteId
    };
    npRequest.test = config.getConfig('debug') ? 1 : 0;
    if (bidderRequest && bidderRequest.uspConsent) {
      logInfo('ADDING USP consent info');
      deepSetValue(npRequest, 'regs.ext.us_privacy', bidderRequest.uspConsent);
    } else {
      logInfo('WILL NOT ADD USP consent info; no bidderRequest.uspConsent.');
    }
    if (schain) { // we set this while iterating over the bids
      logInfo('schain found');
      deepSetValue(npRequest, 'source.ext.schain', schain);
    }
    if (config.getConfig('coppa') === true) {
      deepSetValue(npRequest, 'regs.coppa', 1);
    }
    if (singleRequest) {
      logInfo('buildRequests starting to generate response for a single request');
      npRequest.id = bidderRequest.auctionId; // Unique ID of the bid request, provided by the exchange.
      npRequest.auctionId = bidderRequest.auctionId; // not sure if this should be here?
      npRequest.imp = tosendtags;
      npRequest.ext = extObj;
      deepSetValue(npRequest, 'source.tid', bidderRequest.auctionId);// RTB 2.5 : tid is Transaction ID that must be common across all participants in this bid request (e.g., potentially multiple exchanges).
      deepSetValue(npRequest, 'user.ext.eids', userExtEids);
      var ret = {
        method: 'POST',
        url: this.getAuctionUrl(),
        data: JSON.stringify(npRequest),
        bidderRequest: bidderRequest
      };
      logInfo('buildRequests request data for single = ', JSON.parse(JSON.stringify(npRequest)));
      this.propertyBag.buildRequestsEnd = new Date().getTime();
      logInfo(`buildRequests going to return for single at time ${this.propertyBag.buildRequestsEnd} (took ${this.propertyBag.buildRequestsEnd - this.propertyBag.buildRequestsStart}ms): `, ret);
      return ret;
    }
    let arrRet = tosendtags.map(imp => {
      logInfo('buildRequests starting to generate non-single response, working on imp : ', imp);
      let npRequestSingle = Object.assign({}, npRequest);
      imp.ext['newspassid'].pageAuctionId = bidderRequest['auctionId']; // make a note in the ext object of what the original auctionId was, in the bidderRequest object
      npRequestSingle.id = imp.ext['newspassid'].transactionId; // Unique ID of the bid request, provided by the exchange.
      npRequestSingle.auctionId = imp.ext['newspassid'].transactionId; // not sure if this should be here?
      npRequestSingle.imp = [imp];
      npRequestSingle.ext = extObj;
      deepSetValue(npRequestSingle, 'source.tid', imp.ext['newspassid'].transactionId);// RTB 2.5 : tid is Transaction ID that must be common across all participants in this bid request (e.g., potentially multiple exchanges).
      deepSetValue(npRequestSingle, 'user.ext.eids', userExtEids);
      logInfo('buildRequests RequestSingle (for non-single) = ', npRequestSingle);
      return {
        method: 'POST',
        url: this.getAuctionUrl(),
        data: JSON.stringify(npRequestSingle),
        bidderRequest: bidderRequest
      };
    });
    this.propertyBag.buildRequestsEnd = new Date().getTime();
    logInfo(`buildRequests going to return for non-single at time ${this.propertyBag.buildRequestsEnd} (took ${this.propertyBag.buildRequestsEnd - this.propertyBag.buildRequestsStart}ms): `, arrRet);
    return arrRet;
  },
  interpretResponse(serverResponse, request) {
    if (request && request.bidderRequest && request.bidderRequest.bids) { this.loadConfiguredData(request.bidderRequest.bids[0]); }
    let startTime = new Date().getTime();
    logInfo(`interpretResponse time: ${startTime}. buildRequests done -> interpretResponse start was ${startTime - this.propertyBag.buildRequestsEnd}ms`);
    logInfo(`serverResponse, request`, JSON.parse(JSON.stringify(serverResponse)), JSON.parse(JSON.stringify(request)));
    serverResponse = serverResponse.body || {};
    if (!serverResponse.hasOwnProperty('seatbid')) {
      return [];
    }
    if (typeof serverResponse.seatbid !== 'object') {
      return [];
    }
    let arrAllBids = [];
    let enhancedAdserverTargeting = config.getConfig('newspassid.enhancedAdserverTargeting');
    logInfo('enhancedAdserverTargeting', enhancedAdserverTargeting);
    if (typeof enhancedAdserverTargeting == 'undefined') {
      enhancedAdserverTargeting = true;
    }
    logInfo('enhancedAdserverTargeting', enhancedAdserverTargeting);
    serverResponse.seatbid = injectAdIdsIntoAllBidResponses(serverResponse.seatbid); // we now make sure that each bid in the bidresponse has a unique (within page) adId attribute.
    serverResponse.seatbid = this.removeSingleBidderMultipleBids(serverResponse.seatbid);
    let whitelistAdserverKeys = config.getConfig('newspassid.np_whitelist_adserver_keys');
    let useWhitelistAdserverKeys = isArray(whitelistAdserverKeys) && whitelistAdserverKeys.length > 0;
    for (let i = 0; i < serverResponse.seatbid.length; i++) {
      let sb = serverResponse.seatbid[i];
      for (let j = 0; j < sb.bid.length; j++) {
        let thisRequestBid = this.getBidRequestForBidId(sb.bid[j].impid, request.bidderRequest.bids);
        logInfo(`seatbid:${i}, bid:${j} Going to set default w h for seatbid/bidRequest`, sb.bid[j], thisRequestBid);
        const {defaultWidth, defaultHeight} = defaultSize(thisRequestBid);
        let thisBid = this.addStandardProperties(sb.bid[j], defaultWidth, defaultHeight);
        thisBid.meta = {advertiserDomains: thisBid.adomain || []};
        let bidType = deepAccess(thisBid, 'ext.prebid.type');
        logInfo(`this bid type is : ${bidType}`, j);
        let adserverTargeting = {};
        if (enhancedAdserverTargeting) {
          let allBidsForThisBidid = this.getAllBidsForBidId(thisBid.bidId, serverResponse.seatbid);
          logInfo('Going to iterate allBidsForThisBidId', allBidsForThisBidid);
          Object.keys(allBidsForThisBidid).forEach((bidderName, index, ar2) => {
            logInfo(`adding adserverTargeting for ${bidderName} for bidId ${thisBid.bidId}`);
            adserverTargeting['np_' + bidderName] = bidderName;
            adserverTargeting['np_' + bidderName + '_crid'] = String(allBidsForThisBidid[bidderName].crid);
            adserverTargeting['np_' + bidderName + '_adv'] = String(allBidsForThisBidid[bidderName].adomain);
            adserverTargeting['np_' + bidderName + '_adId'] = String(allBidsForThisBidid[bidderName].adId);
            adserverTargeting['np_' + bidderName + '_pb_r'] = getRoundedBid(allBidsForThisBidid[bidderName].price, allBidsForThisBidid[bidderName].ext.prebid.type);
            if (allBidsForThisBidid[bidderName].hasOwnProperty('dealid')) {
              adserverTargeting['np_' + bidderName + '_dealid'] = String(allBidsForThisBidid[bidderName].dealid);
            }
          });
        } else {
          logInfo(`newspassid.enhancedAdserverTargeting is set to false, no per-bid keys will be sent to adserver.`);
        }
        let {seat: winningSeat, bid: winningBid} = this.getWinnerForRequestBid(thisBid.bidId, serverResponse.seatbid);
        adserverTargeting['np_auc_id'] = String(request.bidderRequest.auctionId);
        adserverTargeting['np_winner'] = String(winningSeat);
        adserverTargeting['np_bid'] = 'true';
        if (enhancedAdserverTargeting) {
          adserverTargeting['np_imp_id'] = String(winningBid.impid);
          adserverTargeting['np_pb_r'] = getRoundedBid(winningBid.price, bidType);
          adserverTargeting['np_adId'] = String(winningBid.adId);
          adserverTargeting['np_size'] = `${winningBid.width}x${winningBid.height}`;
        }
        if (useWhitelistAdserverKeys) { // delete any un-whitelisted keys
          logInfo('Going to filter out adserver targeting keys not in the whitelist: ', whitelistAdserverKeys);
          Object.keys(adserverTargeting).forEach(function(key) { if (whitelistAdserverKeys.indexOf(key) === -1) { delete adserverTargeting[key]; } });
        }
        thisBid.adserverTargeting = adserverTargeting;
        arrAllBids.push(thisBid);
      }
    }
    let endTime = new Date().getTime();
    logInfo(`interpretResponse going to return at time ${endTime} (took ${endTime - startTime}ms) Time from buildRequests Start -> interpretRequests End = ${endTime - this.propertyBag.buildRequestsStart}ms`, arrAllBids);
    return arrAllBids;
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
  getUserSyncs(optionsType, serverResponse, gdprConsent, usPrivacy) {
    logInfo('getUserSyncs optionsType', optionsType, 'serverResponse', serverResponse, 'usPrivacy', usPrivacy, 'cookieSyncBag', this.cookieSyncBag);
    if (!serverResponse || serverResponse.length === 0) {
      return [];
    }
    if (optionsType.iframeEnabled) {
      var arrQueryString = [];
      if (config.getConfig('debug')) {
        arrQueryString.push('pbjs_debug=true');
      }
      arrQueryString.push('usp_consent=' + (usPrivacy || ''));
      for (let keyname in this.cookieSyncBag.userIdObject) {
        arrQueryString.push(keyname + '=' + this.cookieSyncBag.userIdObject[keyname]);
      }
      arrQueryString.push('publisherId=' + this.cookieSyncBag.publisherId);
      arrQueryString.push('siteId=' + this.cookieSyncBag.siteId);
      arrQueryString.push('cb=' + Date.now());
      arrQueryString.push('bidder=' + this.propertyBag.config.bidder);
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
    }
    if (!ret.hasOwnProperty('pubcid')) {
      let pubcid = deepAccess(bidRequest, 'crumbs.pubcid');
      if (pubcid) {
        ret['pubcid'] = pubcid; // if built with old pubCommonId module
      }
    }
    return ret;
  },
  getPlacementId(bidRequest) {
    return (bidRequest.params.placementId).toString();
  },
  getPlacementIdOverrideFromGetParam() {
    let arr = this.getGetParametersAsObject();
    if (arr.hasOwnProperty('npstoredrequest')) {
      if (this.isValidPlacementId(arr['npstoredrequest'])) {
        logInfo(`using GET npstoredrequest ` + arr['npstoredrequest'] + ' to replace placementId');
        return arr['npstoredrequest'];
      } else {
        logError(`GET npstoredrequest FAILED VALIDATION - will not use it`);
      }
    }
    return null;
  },
  getGetParametersAsObject() {
    let parsed = parseUrl(getRefererInfo().page);
    logInfo('getGetParametersAsObject found:', parsed.search);
    return parsed.search;
  },
  blockTheRequest() {
    let npRequest = config.getConfig('newspassid.np_request');
    if (typeof npRequest == 'boolean' && !npRequest) {
      logWarn(`Will not allow auction : np_request is set to false`);
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
  addStandardProperties(seatBid, defaultWidth, defaultHeight) {
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
  },
  getWinnerForRequestBid(requestBidId, serverResponseSeatBid) {
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
  },
  getAllBidsForBidId(matchBidId, serverResponseSeatBid) {
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
};
export function injectAdIdsIntoAllBidResponses(seatbid) {
  logInfo('injectAdIdsIntoAllBidResponses', seatbid);
  for (let i = 0; i < seatbid.length; i++) {
    let sb = seatbid[i];
    for (let j = 0; j < sb.bid.length; j++) {
      sb.bid[j]['adId'] = `${sb.bid[j]['impid']}-${i}-np-${j}`;
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
registerBidder(spec);
logInfo(`*BidAdapter ${NEWSPASSVERSION} was loaded`);
