import * as utils from '../src/utils';
import { registerBidder } from '../src/adapters/bidderFactory';
import { BANNER, NATIVE, VIDEO } from '../src/mediaTypes';
import {config} from '../src/config';
import {getPriceBucketString} from '../src/cpmBucketManager';
import { Renderer } from '../src/Renderer'

const BIDDER_CODE = 'ozone';

const OZONEURI = 'https://elb.the-ozone-project.com/openrtb2/auction';
const OZONECOOKIESYNC = 'https://elb.the-ozone-project.com/static/load-cookie.html';
const OZONE_RENDERER_URL = 'https://prebid.the-ozone-project.com/ozone-renderer.js';

const OZONEVERSION = '2.1.2';

export const spec = {
  code: BIDDER_CODE,
  supportedMediaTypes: [VIDEO, BANNER],

  /**
   * Basic check to see whether required parameters are in the request.
   * @param bid
   * @returns {boolean}
   */
  isBidRequestValid(bid) {
    if (!(bid.params.hasOwnProperty('placementId'))) {
      utils.logInfo('OZONE: OZONE BID ADAPTER VALIDATION FAILED : missing placementId : siteId, placementId and publisherId are REQUIRED');
      return false;
    }
    if (!(bid.params.placementId).toString().match(/^[0-9]{10}$/)) {
      utils.logInfo('OZONE: OZONE BID ADAPTER VALIDATION FAILED : placementId must be exactly 10 numeric characters');
      return false;
    }
    if (!(bid.params.hasOwnProperty('publisherId'))) {
      utils.logInfo('OZONE: OZONE BID ADAPTER VALIDATION FAILED : missing publisherId : siteId, placementId and publisherId are REQUIRED');
      return false;
    }
    if (!(bid.params.publisherId).toString().match(/^[a-zA-Z0-9\-]{12}$/)) {
      utils.logInfo('OZONE: OZONE BID ADAPTER VALIDATION FAILED : publisherId must be exactly 12 alphanumieric characters including hyphens');
      return false;
    }
    if (!(bid.params.hasOwnProperty('siteId'))) {
      utils.logInfo('OZONE: OZONE BID ADAPTER VALIDATION FAILED : missing siteId : siteId, placementId and publisherId are REQUIRED');
      return false;
    }
    if (!(bid.params.siteId).toString().match(/^[0-9]{10}$/)) {
      utils.logInfo('OZONE: OZONE BID ADAPTER VALIDATION FAILED : siteId must be exactly 10 numeric characters');
      return false;
    }
    if (bid.params.hasOwnProperty('customData')) {
      if (typeof bid.params.customData !== 'object') {
        utils.logInfo('OZONE: OZONE BID ADAPTER VALIDATION FAILED : customData is not an object');
        return false;
      }
    }
    if (bid.params.hasOwnProperty('customParams')) {
      utils.logInfo('OZONE: OZONE BID ADAPTER VALIDATION FAILED : customParams should be renamed to customData');
      return false;
    }
    if (bid.params.hasOwnProperty('lotameData')) {
      if (typeof bid.params.lotameData !== 'object') {
        utils.logInfo('OZONE: OZONE BID ADAPTER VALIDATION FAILED : lotameData is not an object');
        return false;
      }
    }
    if (bid.hasOwnProperty('mediaTypes') && bid.mediaTypes.hasOwnProperty(VIDEO)) {
      if (!bid.mediaTypes.video.hasOwnProperty('context')) {
        utils.logInfo('OZONE: [WARNING] No context key/value in bid. Rejecting bid: ', bid);
        return false;
      }
      if (bid.mediaTypes.video.context !== 'outstream') {
        utils.logInfo('OZONE: [WARNING] Only outstream video is supported. Rejecting bid: ', bid);
        return false;
      }
    }
    return true;
  },

  buildRequests(validBidRequests, bidderRequest) {
    utils.logInfo('OZONE: ozone v' + OZONEVERSION + ' validBidRequests', validBidRequests, 'bidderRequest', bidderRequest);
    let singleRequest = config.getConfig('ozone.singleRequest');
    singleRequest = singleRequest !== false; // undefined & true will be true
    utils.logInfo('OZONE: config ozone.singleRequest : ', singleRequest);
    let htmlParams = validBidRequests[0].params; // the html page config params will be included in each element
    let ozoneRequest = {}; // we only want to set specific properties on this, not validBidRequests[0].params
    delete ozoneRequest.test; // don't allow test to be set in the config - ONLY use $_GET['pbjs_debug']

    if (bidderRequest && bidderRequest.gdprConsent) {
      utils.logInfo('OZONE: ADDING GDPR info');
      ozoneRequest.regs = {};
      ozoneRequest.regs.ext = {};
      ozoneRequest.regs.ext.gdpr = bidderRequest.gdprConsent.gdprApplies ? 1 : 0;
      if (ozoneRequest.regs.ext.gdpr) {
        ozoneRequest.user = ozoneRequest.user || {};
        if (
          bidderRequest.gdprConsent.vendorData &&
          bidderRequest.gdprConsent.vendorData.vendorConsents &&
          typeof bidderRequest.gdprConsent.consentString !== 'undefined'
        ) {
          utils.logInfo('OZONE: found all info we need for GDPR - will add info to request object');
          ozoneRequest.user.ext = {'consent': bidderRequest.gdprConsent.consentString};
          // are we able to make this request?
          let vendorConsents = bidderRequest.gdprConsent.vendorData.vendorConsents;
          let boolGdprConsentForOzone = vendorConsents[524];
          let arrGdprConsents = toFlatArray(bidderRequest.gdprConsent.vendorData.purposeConsents);
          ozoneRequest.regs.ext.oz_con = boolGdprConsentForOzone ? 1 : 0;
          ozoneRequest.regs.ext.gap = arrGdprConsents;
        }
      } else {
        utils.logInfo('OZONE: **** Failed to find required info for GDPR for request object, even though bidderRequest.gdprConsent is TRUE ****');
      }
    } else {
      utils.logInfo('OZONE: WILL NOT ADD GDPR info; no bidderRequest.gdprConsent object was present.');
    }

    ozoneRequest.device = {'w': window.innerWidth, 'h': window.innerHeight};
    let tosendtags = validBidRequests.map(ozoneBidRequest => {
      var obj = {};
      obj.id = ozoneBidRequest.bidId; // this causes an error if we change it to something else, even if you update the bidRequest object: "WARNING: Bidder ozone made bid for unknown request ID: mb7953.859498327448. Ignoring."
      obj.tagid = (ozoneBidRequest.params.placementId).toString();
      obj.secure = window.location.protocol === 'https:' ? 1 : 0;
      // is there a banner (or nothing declared, so banner is the default)?
      let arrBannerSizes = [];
      /* NOTE - if there is sizes element in the config root then there will be a mediaTypes.banner element automatically generated for us, so this code is deprecated */
      if (!ozoneBidRequest.hasOwnProperty('mediaTypes')) {
        if (ozoneBidRequest.hasOwnProperty('sizes')) {
          utils.logInfo('OZONE: no mediaTypes detected - will use the sizes array in the config root');
          arrBannerSizes = ozoneBidRequest.sizes;
        } else {
          utils.logInfo('OZONE: no mediaTypes detected, no sizes array in the config root either. Cannot set sizes for banner type');
        }
      } else {
        if (ozoneBidRequest.mediaTypes.hasOwnProperty(BANNER)) {
          arrBannerSizes = ozoneBidRequest.mediaTypes[BANNER].sizes; /* Note - if there is a sizes element in the config root it will be pushed into here */
          utils.logInfo('OZONE: setting banner size from the mediaTypes.banner element for bidId ' + obj.id + ': ', arrBannerSizes);
        }
        if (ozoneBidRequest.mediaTypes.hasOwnProperty(VIDEO)) {
          obj.video = ozoneBidRequest.mediaTypes[VIDEO];
          // we need to duplicate some of the video values
          let wh = getWidthAndHeightFromVideoObject(obj.video);
          utils.logInfo('OZONE: setting video object from the mediaTypes.video element: ' + obj.id + ':', obj.video, 'wh=', wh);
          if (wh && typeof wh === 'object') {
            obj.video.w = wh['w'];
            obj.video.h = wh['h'];
            if (playerSizeIsNestedArray(obj.video)) { // this should never happen; it was in the original spec for this change though.
              utils.logInfo('OZONE: setting obj.video.format to be an array of objects');
              obj.video.format = [wh];
            } else {
              utils.logInfo('OZONE: setting obj.video.format to be an object');
              obj.video.format = wh;
            }
          } else {
            utils.logInfo('OZONE: cannot set w, h & format values for video; the config is not right');
          }
        }
        // Native integration is not complete yet
        if (ozoneBidRequest.mediaTypes.hasOwnProperty(NATIVE)) {
          obj.native = ozoneBidRequest.mediaTypes[NATIVE];
          utils.logInfo('OZONE: setting native object from the mediaTypes.native element: ' + obj.id + ':', obj.native);
        }
      }
      // build the banner request using banner sizes we found in either possible location:
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
      // these 3 MUST exist - we check them in the validation method
      obj.placementId = (ozoneBidRequest.params.placementId).toString();
      obj.publisherId = (ozoneBidRequest.params.publisherId).toString();
      obj.siteId = (ozoneBidRequest.params.siteId).toString();
      // build the imp['ext'] object
      obj.ext = {'prebid': {'storedrequest': {'id': (ozoneBidRequest.params.placementId).toString()}}, 'ozone': {}};
      obj.ext.ozone.adUnitCode = ozoneBidRequest.adUnitCode; // eg. 'mpu'
      obj.ext.ozone.transactionId = ozoneBidRequest.transactionId; // this is the transactionId PER adUnit, common across bidders for this unit
      obj.ext.ozone.oz_pb_v = OZONEVERSION;
      if (ozoneBidRequest.params.hasOwnProperty('customData')) {
        obj.ext.ozone.customData = ozoneBidRequest.params.customData;
      }
      if (ozoneBidRequest.params.hasOwnProperty('lotameData')) {
        obj.ext.ozone.lotameData = ozoneBidRequest.params.lotameData;
      }
      if (utils.deepAccess(ozoneBidRequest, 'crumbs.pubcid')) {
        obj.ext.ozone.pubcid = ozoneBidRequest.crumbs.pubcid;
      }
      return obj;
    });

    ozoneRequest.site = {'publisher': {'id': htmlParams.publisherId}, 'page': document.location.href};
    ozoneRequest.test = parseInt(getTestQuerystringValue()); // will be 1 or 0
    // return the single request object OR the array:
    if (singleRequest) {
      utils.logInfo('OZONE: buildRequests starting to generate response for a single request');
      ozoneRequest.id = bidderRequest.auctionId; // Unique ID of the bid request, provided by the exchange.
      ozoneRequest.auctionId = bidderRequest.auctionId; // not sure if this should be here?
      ozoneRequest.imp = tosendtags;
      ozoneRequest.source = {'tid': bidderRequest.auctionId}; // RTB 2.5 : tid is Transaction ID that must be common across all participants in this bid request (e.g., potentially multiple exchanges).
      var ret = {
        method: 'POST',
        url: OZONEURI,
        data: JSON.stringify(ozoneRequest),
        bidderRequest: bidderRequest
      };
      utils.logInfo('OZONE: buildRequests ozoneRequest for single = ', ozoneRequest);
      utils.logInfo('OZONE: buildRequests going to return for single: ', ret);
      return ret;
    }
    // not single request - pull apart the tosendtags array & return an array of objects each containing one element in the imp array.
    let arrRet = tosendtags.map(imp => {
      utils.logInfo('OZONE: buildRequests starting to generate non-single response, working on imp : ', imp);
      let ozoneRequestSingle = Object.assign({}, ozoneRequest);
      imp.ext.ozone.pageAuctionId = bidderRequest['auctionId']; // make a note in the ext object of what the original auctionId was, in the bidderRequest object
      ozoneRequestSingle.id = imp.ext.ozone.transactionId; // Unique ID of the bid request, provided by the exchange.
      ozoneRequestSingle.auctionId = imp.ext.ozone.transactionId; // not sure if this should be here?
      ozoneRequestSingle.imp = [imp];
      ozoneRequestSingle.source = {'tid': imp.ext.ozone.transactionId};
      utils.logInfo('OZONE: buildRequests ozoneRequestSingle (for non-single) = ', ozoneRequestSingle);
      return {
        method: 'POST',
        url: OZONEURI,
        data: JSON.stringify(ozoneRequestSingle),
        bidderRequest: bidderRequest
      };
    });
    utils.logInfo('OZONE: buildRequests going to return for non-single: ', arrRet);
    return arrRet;
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
    serverResponse = serverResponse.body || {};
    if (!serverResponse.hasOwnProperty('seatbid')) { return []; }
    if (typeof serverResponse.seatbid !== 'object') { return []; }
    let arrAllBids = [];
    serverResponse.seatbid = injectAdIdsIntoAllBidResponses(serverResponse.seatbid); // we now make sure that each bid in the bidresponse has a unique (within page) adId attribute.
    for (let i = 0; i < serverResponse.seatbid.length; i++) {
      let sb = serverResponse.seatbid[i];
      for (let j = 0; j < sb.bid.length; j++) {
        const {defaultWidth, defaultHeight} = defaultSize(request.bidderRequest.bids[j]); // there should be the same number of bids as requests, so index [j] should always exist.
        let thisBid = ozoneAddStandardProperties(sb.bid[j], defaultWidth, defaultHeight);

        // from https://github.com/prebid/Prebid.js/pull/1082
        if (utils.deepAccess(thisBid, 'ext.prebid.type') === VIDEO) {
          utils.logInfo('OZONE: going to attach a renderer to:', j);
          let renderConf = createObjectForInternalVideoRender(thisBid);
          thisBid.renderer = Renderer.install(renderConf);
        } else {
          utils.logInfo('OZONE: bid is not a video, will not attach a renderer: ', j);
        }

        let ozoneInternalKey = thisBid.bidId;
        let adserverTargeting = {};
        // all keys for all bidders for this bid have to be added to all objects returned, else some keys will not be sent to ads?
        let allBidsForThisBidid = ozoneGetAllBidsForBidId(ozoneInternalKey, serverResponse.seatbid);
        // add all the winning & non-winning bids for this bidId:
        utils.logInfo('OZONE: Going to iterate allBidsForThisBidId', allBidsForThisBidid);
        Object.keys(allBidsForThisBidid).forEach(function(bidderName, index, ar2) {
          adserverTargeting['oz_' + bidderName] = bidderName;
          adserverTargeting['oz_' + bidderName + '_pb'] = String(allBidsForThisBidid[bidderName].price);
          adserverTargeting['oz_' + bidderName + '_crid'] = String(allBidsForThisBidid[bidderName].crid);
          adserverTargeting['oz_' + bidderName + '_adv'] = String(allBidsForThisBidid[bidderName].adomain);
          adserverTargeting['oz_' + bidderName + '_imp_id'] = String(allBidsForThisBidid[bidderName].impid);
          adserverTargeting['oz_' + bidderName + '_adId'] = String(allBidsForThisBidid[bidderName].adId);
          adserverTargeting['oz_' + bidderName + '_pb_r'] = getRoundedBid(allBidsForThisBidid[bidderName].price, allBidsForThisBidid[bidderName].ext.prebid.type);
          if (allBidsForThisBidid[bidderName].hasOwnProperty('dealid')) {
            adserverTargeting['oz_' + bidderName + '_dealid'] = String(allBidsForThisBidid[bidderName].dealid);
          }
        });
        // also add in the winning bid, to be sent to dfp
        let {seat: winningSeat, bid: winningBid} = ozoneGetWinnerForRequestBid(ozoneInternalKey, serverResponse.seatbid);
        adserverTargeting['oz_auc_id'] = String(request.bidderRequest.auctionId);
        adserverTargeting['oz_winner'] = String(winningSeat);
        adserverTargeting['oz_winner_auc_id'] = String(winningBid.id);
        adserverTargeting['oz_winner_imp_id'] = String(winningBid.impid);
        adserverTargeting['oz_response_id'] = String(serverResponse.id);
        adserverTargeting['oz_pb_v'] = OZONEVERSION;
        thisBid.adserverTargeting = adserverTargeting;
        arrAllBids.push(thisBid);
      }
    }
    return arrAllBids;
  },
  getUserSyncs(optionsType, serverResponse) {
    if (!serverResponse || serverResponse.length === 0) {
      return [];
    }
    if (optionsType.iframeEnabled) {
      return [{
        type: 'iframe',
        url: OZONECOOKIESYNC
      }];
    }
  }
}
/**
 * add a page-level-unique adId element to all server response bids.
 * NOTE that this is distructive - it mutates the serverResponse object sent in as a parameter
 * @param seatbid  object (serverResponse.seatbid)
 * @returns seatbid object
 */
export function injectAdIdsIntoAllBidResponses(seatbid) {
  for (let i = 0; i < seatbid.length; i++) {
    let sb = seatbid[i];
    for (let j = 0; j < sb.bid.length; j++) {
      sb.bid[j]['adId'] = sb.bid[j]['impid'] + '-' + i; // modify the bidId per-bid, so each bid has a unique adId within this response, and dfp can select one.
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
    utils.logInfo('OZONE: defaultSize received empty bid obj! going to return fixed default size');
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
      if (theseBids[k].impid === requestBidId) { // we've found a matching server response bid for this request bid
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
 * Get a list of all the bids, for this bidId
 * @param matchBidId
 * @param serverResponseSeatBid
 * @returns {} = {ozone:{obj}, appnexus:{obj}, ... }
 */
export function ozoneGetAllBidsForBidId(matchBidId, serverResponseSeatBid) {
  let objBids = {};
  for (let j = 0; j < serverResponseSeatBid.length; j++) {
    let theseBids = serverResponseSeatBid[j].bid;
    let thisSeat = serverResponseSeatBid[j].seat;
    for (let k = 0; k < theseBids.length; k++) {
      if (theseBids[k].impid === matchBidId) { // we've found a matching server response bid for the request bid we're looking for
        objBids[thisSeat] = theseBids[k];
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
  let strBuckets = config.getConfig('priceGranularity'); // priceGranularity value, always a string ** if priceGranularity is set to an object then it's always 'custom'
  let theConfigObject = getGranularityObject(mediaType, mediaTypeGranularity, strBuckets, objBuckets);
  let theConfigKey = getGranularityKeyName(mediaType, mediaTypeGranularity, strBuckets);

  utils.logInfo('OZONE: getRoundedBid. price:', price, 'mediaType:', mediaType, 'configkey:', theConfigKey, 'configObject:', theConfigObject, 'mediaTypeGranularity:', mediaTypeGranularity, 'strBuckets:', strBuckets);

  let priceStringsObj = getPriceBucketString(
    price,
    theConfigObject,
    config.getConfig('currency.granularityMultiplier')
  );
  utils.logInfo('OZONE: priceStringsObj', priceStringsObj);
  // by default, without any custom granularity set, you get granularity name : 'medium'
  let granularityNamePriceStringsKeyMapping = {
    'medium': 'med',
    'custom': 'custom',
    'high': 'high',
    'low': 'low',
    'dense': 'dense'
  };
  if (granularityNamePriceStringsKeyMapping.hasOwnProperty(theConfigKey)) {
    let priceStringsKey = granularityNamePriceStringsKeyMapping[theConfigKey];
    utils.logInfo('OZONE: looking for priceStringsKey:', priceStringsKey);
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
  return 'auto'; // fall back to a default key - should literally never be needed though.
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
  seatBid.ttl = 60;
  return seatBid;
}

/**
 * we need to add test=1 or test=0 to the get params sent to the server.
 * Get the value set as pbjs_debug= in the url, OR 0.
 * @returns {*}
 */
export function getTestQuerystringValue() {
  let searchString = window.location.search.substring(1);
  let params = searchString.split('&');
  for (let i = 0; i < params.length; i++) {
    let val = params[i].split('=');
    if (val[0] === 'pbjs_debug') {
      return val[1] === 'true' ? 1 : 0;
    }
  }
  return 0;
}

/**
 * Generate a random number per ad; I'll use the current ms timestamp, then append 8 random alpha/numeric characters
 * Randomness : 1 in 208 billion random combinations per-millisecond, non-repeating sequence.
 *
 * @returns {*}
 */
export function pgGuid() {
  return new Date().getTime() + 'xxxxxxxx'.replace(/x/g, function(c) {
    return Math.round((Math.random() * 36)).toString(36);
  });
}

function createObjectForInternalVideoRender(bid) {
  let obj = {
    url: OZONE_RENDERER_URL,
    callback: () => onOutstreamRendererLoaded(bid)
  }
  return obj;
}

function onOutstreamRendererLoaded(bid) {
  try {
    bid.renderer.setRender(outstreamRender);
  } catch (err) {
    utils.logWarn('Prebid Error calling setRender on renderer', err)
  }
}

function outstreamRender(bid) {
  window.ozoneVideo.outstreamRender(bid);
}

/**
 * convert {1: true,
            2: true,
            3: true,
            4: true,
            5: true}
   to : [1,2,3,4,5]
 * @param obj
 */
function toFlatArray(obj) {
  let ret = [];
  Object.keys(obj).forEach(function(key) { if (obj[key]) { ret.push(parseInt(key)); } });
  utils.logInfo('OZONE: toFlatArray:', obj, 'returning', ret);
  return ret;
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
    utils.logInfo('OZONE: getWidthAndHeightFromVideoObject found nested array inside playerSize.', playerSize[0]);
    playerSize = playerSize[0];
    if (typeof playerSize[0] !== 'number' && typeof playerSize[0] !== 'string') {
      utils.logInfo('OZONE: getWidthAndHeightFromVideoObject found non-number/string type inside the INNER array in playerSize. This is totally wrong - cannot continue.', playerSize[0]);
      return null;
    }
  }
  if (playerSize.length !== 2) {
    utils.logInfo('OZONE: getWidthAndHeightFromVideoObject found playerSize with length of ' + playerSize.length + '. This is totally wrong - cannot continue.');
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
  utils.logInfo('OZONE: getPlayerSizeFromObject received object', objVideo);
  if (!objVideo.hasOwnProperty('playerSize')) {
    utils.logError('OZONE: getPlayerSizeFromObject FAILED: no playerSize in video object', objVideo);
    return null;
  }
  let playerSize = objVideo.playerSize;
  if (typeof playerSize !== 'object') {
    utils.logError('OZONE: getPlayerSizeFromObject FAILED: playerSize is not an object/array', objVideo);
    return null;
  }
  return playerSize;
}

registerBidder(spec);
utils.logInfo('OZONE: ozoneBidAdapter ended');
