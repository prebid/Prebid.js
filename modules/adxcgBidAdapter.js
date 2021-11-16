import { logWarn, isStr, deepAccess, inIframe, checkCookieSupport, timestamp, getBidIdParameter, parseSizesInput, buildUrl, logMessage, isArray, deepSetValue, isPlainObject, triggerPixel, replaceAuctionPrice, isFn } from '../src/utils.js';
import {config} from '../src/config.js'
import {registerBidder} from '../src/adapters/bidderFactory.js'
import {BANNER, NATIVE, VIDEO} from '../src/mediaTypes.js'
import includes from 'core-js-pure/features/array/includes.js'

/**
 * Adapter for requesting bids from adxcg.net
 * updated to latest prebid repo on 2017.10.20
 * updated for gdpr compliance on 2018.05.22 -requires gdpr compliance module
 * updated to pass aditional auction and impression level parameters. added pass for video targeting parameters
 * updated to fix native support for image width/height and icon 2019.03.17
 * updated support for userid - pubcid,ttid 2019.05.28
 * updated to support prebid 3.0 - remove non https, move to banner.xx.sizes, remove utils.getTopWindowLocation,remove utils.getTopWindowUrl(),remove utils.getTopWindowReferrer()
 * updated to support prebid 4.0 - standardized video params, updated video validation, add onBidWon, onTimeOut, use standardized getFloor
 */

const BIDDER_CODE = 'adxcg'
const SUPPORTED_AD_TYPES = [BANNER, VIDEO, NATIVE]
const SOURCE = 'pbjs10'
const VIDEO_TARGETING = ['id', 'minduration', 'maxduration', 'startdelay', 'skippable', 'playback_method', 'frameworks']
const USER_PARAMS_AUCTION = ['forcedDspIds', 'forcedCampaignIds', 'forcedCreativeIds', 'gender', 'dnt', 'language']
const USER_PARAMS_BID = ['lineparam1', 'lineparam2', 'lineparam3']
const BIDADAPTERVERSION = 'r20210330PB40'
const DEFAULT_MIN_FLOOR = 0;

export const spec = {
  code: BIDDER_CODE,
  supportedMediaTypes: SUPPORTED_AD_TYPES,

  /**
   * Determines whether or not the given bid request is valid.
   *
   * @param {object} bid The bid params to validate.
   * @return boolean True if this is a valid bid, and false otherwise.
   */
  isBidRequestValid: function (bid) {
    if (!bid || !bid.params) {
      logWarn(BIDDER_CODE + ': Missing bid parameters');
      return false
    }

    if (!isStr(bid.params.adzoneid)) {
      logWarn(BIDDER_CODE + ': adzoneid must be specified as a string');
      return false
    }

    if (isBannerRequest(bid)) {
      const banneroAdUnit = deepAccess(bid, 'mediaTypes.banner');
      if (!banneroAdUnit.sizes) {
        logWarn(BIDDER_CODE + ': banner sizes must be specified');
        return false;
      }
    }

    if (isVideoRequest(bid)) {
      // prebid 4.0 use standardized Video parameters
      const videoAdUnit = deepAccess(bid, 'mediaTypes.video');

      if (!Array.isArray(videoAdUnit.playerSize)) {
        logWarn(BIDDER_CODE + ': video playerSize must be an array of integers');
        return false;
      }

      if (!videoAdUnit.context) {
        logWarn(BIDDER_CODE + ': video context must be specified');
        return false;
      }

      if (!Array.isArray(videoAdUnit.mimes) || videoAdUnit.mimes.length === 0) {
        logWarn(BIDDER_CODE + ': video mimes must be an array of strings');
        return false;
      }

      if (!Array.isArray(videoAdUnit.protocols) || videoAdUnit.protocols.length === 0) {
        logWarn(BIDDER_CODE + ': video protocols must be an array of integers');
        return false;
      }
    }

    return true
  },

  /**
   * Make a server request from the list of BidRequests.
   *
   * an array of validBidRequests
   * Info describing the request to the server.
   */
  buildRequests: function (validBidRequests, bidderRequest) {
    let dt = new Date();
    let ratio = window.devicePixelRatio || 1;
    let iobavailable = window && window.IntersectionObserver && window.IntersectionObserverEntry && window.IntersectionObserverEntry.prototype && 'intersectionRatio' in window.IntersectionObserverEntry.prototype

    let bt = config.getConfig('bidderTimeout');
    if (window.PREBID_TIMEOUT) {
      bt = Math.min(window.PREBID_TIMEOUT, bt);
    }

    let referrer = deepAccess(bidderRequest, 'refererInfo.referer');
    let page = deepAccess(bidderRequest, 'refererInfo.canonicalUrl') || config.getConfig('pageUrl') || deepAccess(window, 'location.href');

    // add common parameters
    let beaconParams = {
      renderformat: 'javascript',
      ver: BIDADAPTERVERSION,
      secure: '1',
      source: SOURCE,
      uw: window.screen.width,
      uh: window.screen.height,
      dpr: ratio,
      bt: bt,
      isinframe: inIframe(),
      cookies: checkCookieSupport() ? '1' : '0',
      tz: dt.getTimezoneOffset(),
      dt: timestamp(),
      iob: iobavailable ? '1' : '0',
      pbjs: '$prebid.version$',
      rndid: Math.floor(Math.random() * (999999 - 100000 + 1)) + 100000,
      ref: encodeURIComponent(referrer),
      url: encodeURIComponent(page)
    };

    if (bidderRequest && bidderRequest.gdprConsent && bidderRequest.gdprConsent.gdprApplies) {
      beaconParams.gdpr = bidderRequest.gdprConsent.gdprApplies ? '1' : '0';
      beaconParams.gdpr_consent = bidderRequest.gdprConsent.consentString;
    }

    if (isStr(deepAccess(validBidRequests, '0.userId.pubcid'))) {
      beaconParams.pubcid = validBidRequests[0].userId.pubcid;
    }

    if (isStr(deepAccess(validBidRequests, '0.userId.tdid'))) {
      beaconParams.tdid = validBidRequests[0].userId.tdid;
    }

    if (isStr(deepAccess(validBidRequests, '0.userId.id5id.uid'))) {
      beaconParams.id5id = validBidRequests[0].userId.id5id.uid;
    }

    if (isStr(deepAccess(validBidRequests, '0.userId.idl_env'))) {
      beaconParams.idl_env = validBidRequests[0].userId.idl_env;
    }

    let biddercustom = config.getConfig(BIDDER_CODE);
    if (biddercustom) {
      Object.keys(biddercustom)
        .filter(param => includes(USER_PARAMS_AUCTION, param))
        .forEach(param => beaconParams[param] = encodeURIComponent(biddercustom[param]))
    }

    // per impression parameters
    let adZoneIds = [];
    let prebidBidIds = [];
    let sizes = [];
    let bidfloors = [];

    validBidRequests.forEach((bid, index) => {
      adZoneIds.push(getBidIdParameter('adzoneid', bid.params));
      prebidBidIds.push(bid.bidId);

      let bidfloor = getFloor(bid);
      bidfloors.push(bidfloor);

      // copy all custom parameters impression level parameters not supported above
      let customBidParams = getBidIdParameter('custom', bid.params) || {}
      if (customBidParams) {
        Object.keys(customBidParams)
          .filter(param => includes(USER_PARAMS_BID, param))
          .forEach(param => beaconParams[param + '.' + index] = encodeURIComponent(customBidParams[param]))
      }

      if (isBannerRequest(bid)) {
        sizes.push(parseSizesInput(bid.mediaTypes.banner.sizes).join('|'));
      }

      if (isNativeRequest(bid)) {
        sizes.push('0x0');
      }

      if (isVideoRequest(bid)) {
        if (bid.params.video) {
          Object.keys(bid.params.video)
            .filter(param => includes(VIDEO_TARGETING, param))
            .forEach(param => beaconParams['video.' + param + '.' + index] = encodeURIComponent(bid.params.video[param]))
        }
        // copy video standarized params
        beaconParams['video.context' + '.' + index] = deepAccess(bid, 'mediaTypes.video.context');
        sizes.push(parseSizesInput(bid.mediaTypes.video.playerSize).join('|'));
        beaconParams['video.mimes' + '.' + index] = deepAccess(bid, 'mediaTypes.video.mimes').join(',');
        beaconParams['video.protocols' + '.' + index] = deepAccess(bid, 'mediaTypes.video.protocols').join(',');
      }
    })

    beaconParams.adzoneid = adZoneIds.join(',');
    beaconParams.format = sizes.join(',');
    beaconParams.prebidBidIds = prebidBidIds.join(',');
    beaconParams.bidfloors = bidfloors.join(',');

    let adxcgRequestUrl = buildUrl({
      protocol: 'https',
      hostname: 'hbps.adxcg.net',
      pathname: '/get/adi',
      search: beaconParams
    });

    logMessage(`calling adi adxcg`);
    return {
      contentType: 'text/plain',
      method: 'GET',
      url: adxcgRequestUrl,
      withCredentials: true
    };
  },
  /**
   * Unpack the response from the server into a list of bids.
   *
   * @param {*} serverResponse A successful response from the server.
   * @return {bidRequests[]} An array of bids which were nested inside the server.
   */
  interpretResponse:
    function (serverResponse) {
      logMessage(`interpretResponse adxcg`);
      let bidsAll = [];

      if (!serverResponse || !serverResponse.body || !isArray(serverResponse.body.seatbid) || !serverResponse.body.seatbid.length) {
        logWarn(BIDDER_CODE + ': empty bid response');
        return bidsAll;
      }

      serverResponse.body.seatbid.forEach((bids) => {
        bids.bid.forEach((serverResponseOneItem) => {
          let bid = {}
          // parse general fields
          bid.requestId = serverResponseOneItem.impid;
          bid.cpm = serverResponseOneItem.price;
          bid.creativeId = parseInt(serverResponseOneItem.crid);
          bid.currency = serverResponseOneItem.currency ? serverResponseOneItem.currency : 'USD';
          bid.netRevenue = serverResponseOneItem.netRevenue ? serverResponseOneItem.netRevenue : true;
          bid.ttl = serverResponseOneItem.ttl ? serverResponseOneItem.ttl : 300;
          bid.width = serverResponseOneItem.w;
          bid.height = serverResponseOneItem.h;
          bid.burl = serverResponseOneItem.burl || '';

          if (serverResponseOneItem.dealid != null && serverResponseOneItem.dealid.trim().length > 0) {
            bid.dealId = serverResponseOneItem.dealid;
          }

          if (serverResponseOneItem.ext.crType === 'banner') {
            bid.ad = serverResponseOneItem.adm;
          } else if (serverResponseOneItem.ext.crType === 'video') {
            bid.vastUrl = serverResponseOneItem.nurl;
            bid.vastXml = serverResponseOneItem.adm;
            bid.mediaType = 'video';
          } else if (serverResponseOneItem.ext.crType === 'native') {
            bid.mediaType = 'native';
            bid.native = parseNative(JSON.parse(serverResponseOneItem.adm));
          } else {
            logWarn(BIDDER_CODE + ': unknown or undefined crType');
          }

          // prebid 4.0 meta taxonomy
          if (isArray(serverResponseOneItem.adomain)) {
            deepSetValue(bid, 'meta.advertiserDomains', serverResponseOneItem.adomain);
          }
          if (isArray(serverResponseOneItem.cat)) {
            deepSetValue(bid, 'meta.secondaryCatIds', serverResponseOneItem.cat);
          }
          if (isPlainObject(serverResponseOneItem.ext)) {
            if (isStr(serverResponseOneItem.ext.advertiser_id)) {
              deepSetValue(bid, 'meta.mediaType', serverResponseOneItem.ext.mediaType);
            }
            if (isStr(serverResponseOneItem.ext.advertiser_id)) {
              deepSetValue(bid, 'meta.advertiserId', serverResponseOneItem.ext.advertiser_id);
            }
            if (isStr(serverResponseOneItem.ext.advertiser_name)) {
              deepSetValue(bid, 'meta.advertiserName', serverResponseOneItem.ext.advertiser_name);
            }
            if (isStr(serverResponseOneItem.ext.agency_name)) {
              deepSetValue(bid, 'meta.agencyName', serverResponseOneItem.ext.agency_name);
            }
          }
          bidsAll.push(bid)
        })
      })
      return bidsAll
    },

  onBidWon: (bid) => {
    if (bid.burl) {
      triggerPixel(replaceAuctionPrice(bid.burl, bid.originalCpm));
    }
  },

  onTimeout(timeoutData) {
    if (timeoutData == null) {
      return;
    }

    let beaconParams = {
      A: timeoutData.bidder,
      bid: timeoutData.bidId,
      a: timeoutData.adUnitCode,
      cn: timeoutData.timeout,
      aud: timeoutData.auctionId,
    };
    let adxcgRequestUrl = buildUrl({
      protocol: 'https',
      hostname: 'hbps.adxcg.net',
      pathname: '/event/timeout.gif',
      search: beaconParams
    });
    logWarn(BIDDER_CODE + ': onTimeout called');
    triggerPixel(adxcgRequestUrl);
  },

  getUserSyncs: function (syncOptions, serverResponses, gdprConsent) {
    let params = '';
    if (gdprConsent && 'gdprApplies' in gdprConsent) {
      if (gdprConsent.consentString) {
        if (typeof gdprConsent.gdprApplies === 'boolean') {
          params += `?gdpr=${Number(gdprConsent.gdprApplies)}&gdpr_consent=${gdprConsent.consentString}`;
        } else {
          params += `?gdpr=0&gdpr_consent=${gdprConsent.consentString}`;
        }
      }
    }

    if (syncOptions.iframeEnabled) {
      return [{
        type: 'iframe',
        url: 'https://cdn.adxcg.net/pb-sync.html' + params
      }];
    }
  }
}

function isVideoRequest(bid) {
  return bid.mediaType === 'video' || !!deepAccess(bid, 'mediaTypes.video');
}

function isBannerRequest(bid) {
  return bid.mediaType === 'banner' || !!deepAccess(bid, 'mediaTypes.banner');
}

function isNativeRequest(bid) {
  return bid.mediaType === 'native' || !!deepAccess(bid, 'mediaTypes.native');
}

function getFloor(bid) {
  if (!isFn(bid.getFloor)) {
    return deepAccess(bid, 'params.floor', DEFAULT_MIN_FLOOR);
  }

  try {
    const floor = bid.getFloor({
      currency: 'EUR',
      mediaType: '*',
      size: '*',
      bidRequest: bid
    });
    return floor.floor;
  } catch (e) {
    logWarn(BIDDER_CODE + ': call to getFloor failed:' + e.message);
    return DEFAULT_MIN_FLOOR;
  }
}

function parseNative(nativeResponse) {
  let bidNative = {};
  bidNative = {
    clickUrl: nativeResponse.link.url,
    impressionTrackers: nativeResponse.imptrackers,
    clickTrackers: nativeResponse.clktrackers,
    javascriptTrackers: nativeResponse.jstrackers
  };

  nativeResponse.assets.forEach(asset => {
    if (asset.title && asset.title.text) {
      bidNative.title = asset.title.text;
    }

    if (asset.img && asset.img.url) {
      bidNative.image = {
        url: asset.img.url,
        height: asset.img.h,
        width: asset.img.w
      };
    }

    if (asset.icon && asset.icon.url) {
      bidNative.icon = {
        url: asset.icon.url,
        height: asset.icon.h,
        width: asset.icon.w
      };
    }

    if (asset.data && asset.data.label === 'DESC' && asset.data.value) {
      bidNative.body = asset.data.value;
    }

    if (asset.data && asset.data.label === 'SPONSORED' && asset.data.value) {
      bidNative.sponsoredBy = asset.data.value;
    }
  })
  return bidNative;
}

registerBidder(spec)
