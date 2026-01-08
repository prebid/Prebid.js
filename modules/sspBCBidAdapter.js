import { deepAccess, getWinDimensions, getWindowTop, isArray, logInfo, logWarn } from '../src/utils.js';
import { getDevicePixelRatio } from '../libraries/devicePixelRatio/devicePixelRatio.js';
import { ajax } from '../src/ajax.js';
import { registerBidder } from '../src/adapters/bidderFactory.js';
import { BANNER, NATIVE, VIDEO } from '../src/mediaTypes.js';

import { convertOrtbRequestToProprietaryNative } from '../src/native.js';
import { getCurrencyFromBidderRequest } from '../libraries/ortb2Utils/currency.js';

const BIDDER_CODE = 'sspBC';
const BIDDER_URL = 'https://ssp.wp.pl/bidder/';
const SYNC_URL_IFRAME = 'https://ssp.wp.pl/bidder/usersync';
const SYNC_URL_IMAGE = 'https://ssp.wp.pl/v1/sync/pixel';
const NOTIFY_URL = 'https://ssp.wp.pl/bidder/notify';
const GVLID = 676;
const TMAX = 450;
const BIDDER_VERSION = '6.11';
const DEFAULT_CURRENCY = 'PLN';
const W = window;
const { navigator } = W;
const oneCodeDetection = {};
const adUnitsCalled = {};
const adSizesCalled = {};
const bidderRequestsMap = {};
const pageView = {};

/**
 * Native asset mapping - we use constant id per type
 * id > 10 indicates additional images
 */
var nativeAssetMap = {
  title: 0,
  cta: 1,
  icon: 2,
  image: 3,
  body: 4,
  sponsoredBy: 5
};

/**
 * currency used in bidRequest - updated on request
 */
var requestCurrency = DEFAULT_CURRENCY;

/**
 * return native asset type, based on asset id
 * @param {number} id - native asset id
 * @returns {string} asset type
 */
const getNativeAssetType = id => {
  // id>10 will always be an image...
  if (id > 10) {
    return 'image';
  }

  // ...others should be decoded from nativeAssetMap
  for (const assetName in nativeAssetMap) {
    const assetId = nativeAssetMap[assetName];
    if (assetId === id) {
      return assetName;
    }
  }
}

/**
 * Get preferred language of browser (i.e. user)
 * @returns {string} languageCode - ISO language code
 */
const getBrowserLanguage = () => navigator.language || (navigator.languages && navigator.languages[0]);

/**
 * Get language of top level html object
 * @returns {string} languageCode - ISO language code
 */
const getContentLanguage = () => {
  try {
    const topWindow = getWindowTop();
    return topWindow.document.body.parentNode.lang;
  } catch (err) {
    logWarn('Could not read language from top-level html', err);
  }
};

/**
 * Get host name of the top level html object
 * @returns {string} host name
 */
const getTopHost = () => {
  try {
    const topWindow = getWindowTop();
    return topWindow.location.host;
  } catch (err) {
    logWarn('Could not read host from top-level window', err);
  }
};

/**
 * Get Bid parameters - returns bid params from Object, or 1el array
 * @param {*} bidParams - bid (bidWon), or array of bids (timeout)
 * @returns {object} params object
 */
const unpackParams = (bidParams) => {
  const result = isArray(bidParams) ? bidParams[0] : bidParams;
  return result || {};
}

/**
 * Get bid parameters for notification
 * @param {*} bidData - bid (bidWon), or array of bids (timeout)
 */
const getNotificationPayload = bidData => {
  if (bidData) {
    const bids = isArray(bidData) ? bidData : [bidData];
    if (bids.length > 0) {
      let result = {
        siteId: [],
        slotId: [],
        tagid: [],
      }
      bids.forEach(bid => {
        const { adUnitCode, cpm, creativeId, meta = {}, mediaType, params: bidParams, bidderRequestId, requestId, timeout } = bid;
        const { platform = 'wpartner' } = meta;
        const params = unpackParams(bidParams);

        // basic notification data
        const bidBasicData = {
          requestId: bidderRequestId || bidderRequestsMap[requestId],
          timeout: timeout || result.timeout,
          pvid: pageView.id,
          platform
        }
        result = { ...result, ...bidBasicData }

        result.tagid.push(adUnitCode);

        // check for stored detection
        if (oneCodeDetection[requestId]) {
          params.siteId = oneCodeDetection[requestId][0];
          params.id = oneCodeDetection[requestId][1];
        }
        if (params.siteId) {
          result.siteId.push(params.siteId);
        }
        if (params.id) {
          result.slotId.push(params.id);
        }

        if (cpm) {
          // non-empty bid data
          const { advertiserDomains = [], networkName, pricepl } = meta;
          const bidNonEmptyData = {
            cpm,
            cpmpl: pricepl,
            creativeId,
            adomain: advertiserDomains[0],
            adtype: mediaType,
            networkName,
          }
          result = { ...result, ...bidNonEmptyData }
        }
      })
      return result;
    }
  }
}

const applyClientHints = ortbRequest => {
  const { location } = document;
  const { connection = {}, userAgentData = {} } = navigator;
  const viewport = getWinDimensions().visualViewport || false;
  const segments = [];
  const hints = {
    'CH-Ect': connection.effectiveType,
    'CH-Rtt': connection.rtt,
    'CH-SaveData': connection.saveData,
    'CH-Downlink': connection.downlink,
    'CH-DeviceMemory': null,
    'CH-Dpr': getDevicePixelRatio(W),
    'CH-ViewportWidth': viewport.width,
    'CH-BrowserBrands': JSON.stringify(userAgentData.brands),
    'CH-isMobile': userAgentData.mobile,
  };

  /**
    Check / generate page view id
    Should be generated dureing first call to applyClientHints(),
    and re-generated if pathname has changed
   */
  if (!pageView.id || location.pathname !== pageView.path) {
    pageView.path = location.pathname;
    pageView.id = Math.floor(1E20 * Math.random()).toString();
  }

  Object.keys(hints).forEach(key => {
    const hint = hints[key];

    if (hint) {
      segments.push({
        name: key,
        value: hint.toString(),
      });
    }
  });
  const data = [
    {
      id: '12',
      name: 'NetInfo',
      segment: segments,
    }, {
      id: '7',
      name: 'pvid',
      segment: [
        {
          value: pageView.id
        }
      ]
    }];

  const ch = { data };
  ortbRequest.user = { ...ortbRequest.user, ...ch };
};

const applyTopics = (validBidRequest, ortbRequest) => {
  const userData = validBidRequest.ortb2?.user?.data || [];
  const topicsData = userData.filter(dataObj => {
    const segtax = dataObj.ext?.segtax;
    return segtax >= 600 && segtax <= 609;
  })[0];

  // format topics obj for exchange
  if (topicsData) {
    topicsData.id = `${topicsData.ext.segtax}`;
    topicsData.name = 'topics';
    delete (topicsData.ext);
    ortbRequest.user.data.push(topicsData);
  }
};

const applyUserIds = (validBidRequest, ortbRequest) => {
  const { userIdAsEids: eidsVbr = [], ortb2 = {} } = validBidRequest;
  const eidsOrtb = ortb2.user?.ext?.data?.eids || [];
  const eids = [...eidsVbr, ...eidsOrtb];

  if (eids.length) {
    const ids = { eids };
    ortbRequest.user = { ...ortbRequest.user, ...ids };
  }
};

/**
 * Add GDPR data to oRTB request
 * Store conset API version (will be required by user sync)
 */
const applyGdpr = (bidderRequest, ortbRequest) => {
  const { gdprConsent } = bidderRequest;
  if (gdprConsent) {
    const { gdprApplies, consentString } = gdprConsent;
    ortbRequest.regs = Object.assign(ortbRequest.regs || {}, { 'gdpr': gdprApplies ? 1 : 0 });
    ortbRequest.user = Object.assign(ortbRequest.user || {}, { 'consent': consentString });
  }
}

/**
 * Get highest floorprice for a given adslot
 * (sspBC adapter accepts one floor per imp)
 * returns floor = 0 if getFloor() is not defined
 *
 * @param {object} slot bid request adslot
 * @returns {number} floorprice
 */
const getHighestFloor = (slot) => {
  const currency = requestCurrency
  const result = { floor: 0, currency };

  if (typeof slot.getFloor === 'function') {
    let bannerFloor = 0;

    if (slot.sizes.length) {
      bannerFloor = slot.sizes.reduce(function (prev, next) {
        const { floor: currentFloor = 0 } = slot.getFloor({
          mediaType: 'banner',
          size: next,
          currency,
        }) || {};
        return prev > currentFloor ? prev : currentFloor;
      }, 0);
    }

    const { floor: nativeFloor = 0 } = slot.getFloor({
      mediaType: 'native', currency
    }) || {};

    const { floor: videoFloor = 0 } = slot.getFloor({
      mediaType: 'video', currency
    }) || {};

    result.floor = Math.max(bannerFloor, nativeFloor, videoFloor);
  }

  return result;
};

/**
 * Get currency (either default or adserver)
 * @returns {string} currency name
 */
const getCurrency = (bidderRequest) => getCurrencyFromBidderRequest(bidderRequest) || DEFAULT_CURRENCY;

/**
 * Get value for first occurrence of key within the collection
 */
const setOnAny = (collection, key) => collection.reduce((prev, next) => prev || deepAccess(next, key), false);

/**
 * Send payload to notification endpoint
 */
const sendNotification = payload => {
  ajax(NOTIFY_URL, null, JSON.stringify(payload), {
    contentType: 'application/json',
    withCredentials: false,
    method: 'POST',
    crossOrigin: true
  });
}

/**
 * @param {object} slot Ad Unit Params by Prebid
 * @returns {object} Banner by OpenRTB 2.5 §3.2.6
 */
const mapBanner = slot => {
  if (slot.mediaType === 'banner' ||
    deepAccess(slot, 'mediaTypes.banner') ||
    (!slot.mediaType && !slot.mediaTypes)) {
    const format = slot.sizes.map(size => ({
      w: size[0],
      h: size[1],
    }));

    return {
      format,
      id: slot.bidId,
    };
  }
}

/**
 * @param {string} paramName Native parameter name
 * @param {object} paramValue Native parameter value
 * @returns {object} native asset object that conforms to ortb native ads spec
 */
var mapAsset = function mapAsset(paramName, paramValue) {
  const { required, sizes, wmin, hmin, len } = paramValue;
  var id = nativeAssetMap[paramName];
  var assets = [];

  if (id !== undefined) {
    switch (paramName) {
      case 'title':
        assets.push({
          id: id,
          required: required,
          title: {
            len: len || 140
          }
        });
        break;

      case 'cta':
        assets.push({
          id: id,
          required: required,
          data: {
            type: 12
          }
        });
        break;

      case 'icon':
        assets.push({
          id: id,
          required: required,
          img: {
            type: 1,
            w: sizes && sizes[0],
            h: sizes && sizes[1]
          }
        });
        break;

      case 'image':
        var hasMultipleImages = sizes && Array.isArray(sizes[0]);
        var imageSizes = hasMultipleImages ? sizes : [sizes];

        for (var i = 0; i < imageSizes.length; i++) {
          assets.push({
            id: i > 0 ? 10 + i : id,
            required: required,
            img: {
              type: 3,
              w: imageSizes[i][0],
              h: imageSizes[i][1],
              wmin: wmin,
              hmin: hmin
            }
          });
        }

        break;

      case 'body':
        assets.push({
          id: id,
          required: required,
          data: {
            type: 2
          }
        });
        break;

      case 'sponsoredBy':
        assets.push({
          id: id,
          required: required,
          data: {
            type: 1
          }
        });
        break;
    }
  }

  return assets;
};

/**
 * @param {object} slot Ad Unit Params by Prebid
 * @returns {object} native object that conforms to ortb native ads spec
 */
const mapNative = (slot) => {
  const native = deepAccess(slot, 'mediaTypes.native');
  if (native) {
    var nativeParams = Object.keys(native);
    var assets = [];
    nativeParams.forEach(function (par) {
      var newAssets = mapAsset(par, native[par]);
      assets = assets.concat(newAssets);
    });
    return {
      request: JSON.stringify({
        native: {
          assets: assets
        }
      })
    };
  }
}

var mapVideo = (slot, videoFromBid) => {
  var videoFromSlot = deepAccess(slot, 'mediaTypes.video');
  var videoParamsUsed = ['api', 'context', 'linearity', 'maxduration', 'mimes', 'protocols', 'playbackmethod'];
  var videoAssets;

  if (videoFromSlot) {
    const video = videoFromBid ? Object.assign(videoFromSlot, videoFromBid) : videoFromSlot;
    var videoParams = Object.keys(video);
    var playerSize = video.playerSize;
    videoAssets = {}; // player width / height

    if (playerSize) {
      var maxSize = playerSize.reduce(function (prev, next) {
        return next[0] >= prev[0] && next[1] >= prev[1] ? next : prev;
      }, [1, 1]);
      videoAssets.w = maxSize[0];
      videoAssets.h = maxSize[1];
    } // remaining supported params

    videoParams.forEach(function (par) {
      if (videoParamsUsed.indexOf(par) >= 0) {
        videoAssets[par] = video[par];
      }

      ;
    });
  }

  return videoAssets;
};

const mapImpression = slot => {
  const { adUnitCode, bidderRequestId, bidId, params = {}, ortb2Imp = {} } = slot;
  const { id, siteId, video } = params;
  const { instl, ext = {} } = ortb2Imp;

  /*
    store bidId <-> bidderRequestId mapping for bidWon notification
  */
  bidderRequestsMap[bidId] = bidderRequestId;

  /*
     check max size for this imp, and check/store number this size was called (for current view)
     send this info as ext.pbsize
  */
  const slotSize = slot.sizes.length ? slot.sizes.reduce((prev, next) => prev[0] * prev[1] <= next[0] * next[1] ? next : prev).join('x') : '1x1';

  if (!adUnitsCalled[adUnitCode]) {
    // this is a new adunit - assign & save pbsize
    adSizesCalled[slotSize] = adSizesCalled[slotSize] ? adSizesCalled[slotSize] += 1 : 1;
    adUnitsCalled[adUnitCode] = `${slotSize}_${adSizesCalled[slotSize]}`;
  }

  ext.data = Object.assign({ pbsize: adUnitsCalled[adUnitCode] }, ext.data);

  const imp = {
    id: id && siteId ? id.padStart(3, '0') : 'bidid-' + bidId,
    banner: mapBanner(slot),
    native: mapNative(slot, bidId),
    video: mapVideo(slot, video),
    tagid: adUnitCode,
    ext,
    instl,
  };

  // Check floorprices for this imp
  const { floor, currency } = getHighestFloor(slot);

  imp.bidfloor = floor;
  imp.bidfloorcur = currency;

  return imp;
}

const isVideoAd = bid => {
  const xmlTester = new RegExp(/^<\?xml|<VAST/, 'i');
  return bid.adm && bid.adm.match(xmlTester);
}

const isNativeAd = bid => {
  const xmlTester = new RegExp(/^{['"]native['"]/);

  return bid.admNative || (bid.adm && bid.adm.match(xmlTester));
}

const isHTML = bid => {
  const xmlTester = new RegExp(/^<html|<iframe/, 'i');
  return bid.adm && bid.adm.match(xmlTester);
}

const parseNative = (nativeData, adUnitCode) => {
  const { link = {}, imptrackers: impressionTrackers, jstracker } = nativeData;
  const { url: clickUrl, clicktrackers: clickTrackers = [] } = link;
  const macroReplacer = tracker => tracker.replace(new RegExp('%native_dom_id%', 'g'), adUnitCode);
  let javascriptTrackers = isArray(jstracker) ? jstracker : jstracker && [jstracker];

  // replace known macros in js trackers
  javascriptTrackers = javascriptTrackers && javascriptTrackers.map(macroReplacer);

  const result = {
    clickUrl,
    clickTrackers,
    impressionTrackers,
    javascriptTrackers,
  };

  nativeData.assets.forEach(asset => {
    const { id, img = {}, title = {}, data = {} } = asset;
    const { w: imgWidth, h: imgHeight, url: imgUrl, type: imgType } = img;
    const { type: dataType, value: dataValue } = data;
    const { text: titleText } = title;
    const detectedType = getNativeAssetType(id);
    if (titleText) {
      result.title = titleText;
    }
    if (imgUrl) {
      // image or icon
      const thisImage = {
        url: imgUrl,
        width: imgWidth,
        height: imgHeight,
      };
      if (imgType === 3 || detectedType === 'image') {
        result.image = thisImage;
      } else if (imgType === 1 || detectedType === 'icon') {
        result.icon = thisImage;
      }
    }
    if (dataValue) {
      // call-to-action, sponsored-by or body
      if (dataType === 1 || detectedType === 'sponsoredBy') {
        result.sponsoredBy = dataValue;
      } else if (dataType === 2 || detectedType === 'body') {
        result.body = dataValue;
      } else if (dataType === 12 || detectedType === 'cta') {
        result.cta = dataValue;
      }
    }
  });

  return result;
}

const spec = {
  code: BIDDER_CODE,
  gvlid: GVLID,
  aliases: [],
  supportedMediaTypes: [BANNER, NATIVE, VIDEO],
  isBidRequestValid(bid) {
    // as per OneCode integration, bids without params are valid
    return true;
  },
  buildRequests(validBidRequests, bidderRequest) {
    // convert Native ORTB definition to old-style prebid native definition
    validBidRequests = convertOrtbRequestToProprietaryNative(validBidRequests);

    // update auction currency
    requestCurrency = getCurrency(bidderRequest);

    if ((!validBidRequests) || (validBidRequests.length < 1)) {
      return false;
    }

    const ortb2 = setOnAny(validBidRequests, 'ortb2');
    const siteId = setOnAny(validBidRequests, 'params.siteId');
    const publisherId = setOnAny(validBidRequests, 'params.publisherId');
    const page = setOnAny(validBidRequests, 'params.page') || bidderRequest.refererInfo.page;
    const domain = setOnAny(validBidRequests, 'params.domain') || bidderRequest.refererInfo.domain;
    const tmax = setOnAny(validBidRequests, 'params.tmax') ? parseInt(setOnAny(validBidRequests, 'params.tmax'), 10) : TMAX;
    const pbver = '$prebid.version$';
    const testMode = setOnAny(validBidRequests, 'params.test') ? 1 : undefined;
    const ref = bidderRequest.refererInfo.ref;
    const { source = {}, regs = {} } = ortb2 || {};

    source.schain = setOnAny(validBidRequests, 'ortb2.source.ext.schain');

    const payload = {
      id: bidderRequest.bidderRequestId,
      site: {
        id: siteId ? `${siteId}` : undefined,
        publisher: publisherId ? { id: publisherId } : undefined,
        page,
        domain,
        ref,
        content: { language: getContentLanguage() },
      },
      imp: validBidRequests.map(slot => mapImpression(slot)),
      cur: [requestCurrency],
      tmax,
      user: {},
      regs,
      source,
      device: {
        language: getBrowserLanguage(),
        w: screen.width,
        h: screen.height,
      },
      test: testMode,
    };

    applyGdpr(bidderRequest, payload);
    applyClientHints(payload);
    applyUserIds(validBidRequests[0], payload);
    applyTopics(bidderRequest, payload);

    return {
      method: 'POST',
      url: `${BIDDER_URL}?bdver=${BIDDER_VERSION}&pbver=${pbver}&inver=0`,
      data: JSON.stringify(payload),
      bidderRequest,
    };
  },

  interpretResponse(serverResponse, request) {
    const { bidderRequest } = request;
    const { body: response = {} } = serverResponse;
    const { seatbid: responseSeat, ext: responseExt = {} } = response;
    const { paapi: fledgeAuctionConfigs = [] } = responseExt;
    const bids = [];
    let site = JSON.parse(request.data).site; // get page and referer data from request
    site.sn = response.sn || 'mc_adapter'; // WPM site name (wp_sn)
    pageView.sn = site.sn; // store site_name (for syncing and notifications)

    if (responseSeat !== undefined) {
      /*
        Match response to request, by comparing bid id's
        'bidid-' prefix indicates oneCode (parameterless) request and response
      */
      responseSeat.forEach(seatbid => {
        const { seat, bid } = seatbid;
        bid.forEach(serverBid => {
          // get data from bid response
          const { adomain, crid = `mcad_${bidderRequest.auctionId}_${site.slot}`, impid, exp = 300, ext = {}, price, w, h } = serverBid;

          const bidRequest = bidderRequest.bids.filter(b => {
            const { bidId, params: requestParams = {} } = b;
            const params = unpackParams(requestParams);
            const { id, siteId } = params;
            const currentBidId = id && siteId ? id : 'bidid-' + bidId;
            return currentBidId === impid;
          })[0];

          // get bidid from linked bidRequest
          const { bidId } = bidRequest || {};

          // get ext data from bid
          const { siteid = site.id, slotid = site.slot, pubid, adlabel, cache: creativeCache, vurls = [], dsa, platform = 'wpartner', pricepl } = ext;

          // update site data
          site = {
            ...site,
            ...{
              id: siteid,
              slot: slotid,
              publisherId: pubid,
              adLabel: adlabel
            }
          };

          if (bidRequest && site.id && !site.id.includes('bidid')) {
            // found a matching request; add this bid
            const { adUnitCode } = bidRequest;

            // store site data for future notification
            oneCodeDetection[bidId] = [site.id, site.slot];

            const bid = {
              requestId: bidId,
              creativeId: crid,
              cpm: price,
              currency: response.cur,
              ttl: exp,
              width: w,
              height: h,
              meta: {
                advertiserDomains: adomain,
                networkName: seat,
                pricepl,
                dsa,
                platform,
              },
              netRevenue: true,
              vurls,
            };

            // mediaType and ad data for instream / native / banner
            if (isVideoAd(serverBid)) {
              // video
              bid.adType = 'instream';
              bid.mediaType = 'video';
              bid.vastXml = serverBid.adm;
              bid.vastContent = serverBid.adm;
              bid.vastUrl = creativeCache;

              logInfo(`Bid ${bid.creativeId} is a video ad`);
            } else if (isNativeAd(serverBid)) {
              // native
              bid.mediaType = 'native';
              // check native object
              try {
                const nativeData = serverBid.admNative || JSON.parse(serverBid.adm).native;
                bid.native = parseNative(nativeData, adUnitCode);
                bid.width = 1;
                bid.height = 1;
              } catch (err) {
                logWarn('Could not parse native data', serverBid.adm);
                bid.cpm = 0;
              }
              logInfo(`Bid ${bid.creativeId} as a native ad`);
            } else if (isHTML(serverBid)) {
              // banner ad (preformatted)
              bid.mediaType = 'banner';
              logInfo(`Bid ${bid.creativeId} as a preformatted banner`);
              bid.ad = serverBid.adm;
            } else {
              // unsupported bid format - send notification and set CPM to zero
              const payload = getNotificationPayload(bid);
              payload.event = 'parseError';
              sendNotification(payload);
              bid.cpm = 0;
            }

            if (bid.cpm > 0) {
              // push this bid
              bids.push(bid);
            }
          } else {
            logWarn('Discarding response - no matching request / site id', serverBid.impid);
          }
        });
      });
    }

    return fledgeAuctionConfigs.length ? { bids, fledgeAuctionConfigs } : bids;
  },

  getUserSyncs(syncOptions, _, gdprConsent = {}) {
    const {iframeEnabled, pixelEnabled} = syncOptions;
    const {gdprApplies, consentString = ''} = gdprConsent;
    const mySyncs = [];
    if (iframeEnabled) {
      mySyncs.push({
        type: 'iframe',
        url: `${SYNC_URL_IFRAME}?tcf=2&pvid=${pageView.id}&sn=${pageView.sn}`,
      });
    } else if (pixelEnabled) {
      mySyncs.push({
        type: 'image',
        url: `${SYNC_URL_IMAGE}?inver=0&platform=wpartner&host=${getTopHost() || ''}&gdpr=${gdprApplies ? 1 : 0}&gdpr_consent=${consentString}`,
      });
    }
    return mySyncs;
  },

  onTimeout(timeoutData) {
    const payload = getNotificationPayload(timeoutData);
    if (payload) {
      payload.event = 'timeout';
      sendNotification(payload);
      return payload;
    }
  },

  onBidderError(errorData) {
    const payload = getNotificationPayload(errorData);
    if (payload) {
      payload.event = 'parseError';
      sendNotification(payload);
      return payload;
    }
  },

  onBidViewable(bid) {
    const payload = getNotificationPayload(bid);
    if (payload) {
      payload.event = 'bidViewable';
      sendNotification(payload);
      return payload;
    }
  },

  onBidBillable(bid) {
    const payload = getNotificationPayload(bid);
    if (payload) {
      payload.event = 'bidBillable';
      sendNotification(payload);
      return payload;
    }
  },

  onBidWon(bid) {
    const payload = getNotificationPayload(bid);
    if (payload) {
      payload.event = 'bidWon';
      sendNotification(payload);
      return payload;
    }
  },

};

registerBidder(spec);

export {
  spec,
};
