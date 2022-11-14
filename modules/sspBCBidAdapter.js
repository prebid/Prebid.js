import { deepAccess, getWindowTop, isArray, logWarn } from '../src/utils.js';
import { ajax } from '../src/ajax.js';
import { config } from '../src/config.js';
import { registerBidder } from '../src/adapters/bidderFactory.js';
import { BANNER, NATIVE, VIDEO } from '../src/mediaTypes.js';
import { includes as strIncludes } from '../src/polyfill.js';
import { convertOrtbRequestToProprietaryNative } from '../src/native.js';

const BIDDER_CODE = 'sspBC';
const BIDDER_URL = 'https://ssp.wp.pl/bidder/';
const SYNC_URL = 'https://ssp.wp.pl/bidder/usersync';
const NOTIFY_URL = 'https://ssp.wp.pl/bidder/notify';
const TRACKER_URL = 'https://bdr.wpcdn.pl/tag/jstracker.js';
const GVLID = 676;
const TMAX = 450;
const BIDDER_VERSION = '5.7';
const DEFAULT_CURRENCY = 'PLN';
const W = window;
const { navigator } = W;
const oneCodeDetection = {};
const adUnitsCalled = {};
const adSizesCalled = {};
const pageView = {};
var consentApiVersion;

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
    logWarn('Could not read language form top-level html', err);
  }
};

/**
 * Get bid parameters for notification
 * @param {*} bidData - bid (bidWon), or array of bids (timeout)
 */
const getNotificationPayload = bidData => {
  if (bidData) {
    const bids = isArray(bidData) ? bidData : [bidData];
    if (bids.length > 0) {
      let result = {
        requestId: undefined,
        siteId: [],
        slotId: [],
        tagid: [],
      }
      bids.forEach(bid => {
        const { adUnitCode, auctionId, cpm, creativeId, meta, params: bidParams, requestId, timeout } = bid;
        let params = isArray(bidParams) ? bidParams[0] : bidParams;
        params = params || {};

        // basic notification data
        const bidBasicData = {
          requestId: auctionId || result.requestId,
          timeout: timeout || result.timeout,
          pvid: pageView.id,
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
          const bidNonEmptyData = {
            cpm,
            cpmpl: meta && meta.pricepl,
            creativeId,
            adomain: meta && meta.advertiserDomains && meta.advertiserDomains[0],
            networkName: meta && meta.networkName,
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
  const { connection = {}, deviceMemory, userAgentData = {} } = navigator;
  const viewport = W.visualViewport || false;
  const segments = [];
  const hints = {
    'CH-Ect': connection.effectiveType,
    'CH-Rtt': connection.rtt,
    'CH-SaveData': connection.saveData,
    'CH-Downlink': connection.downlink,
    'CH-DeviceMemory': deviceMemory,
    'CH-Dpr': W.devicePixelRatio,
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

const applyUserIds = (validBidRequest, ortbRequest) => {
  const eids = validBidRequest.userIdAsEids
  if (eids && eids.length) {
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
    const { apiVersion, gdprApplies, consentString } = gdprConsent;
    consentApiVersion = apiVersion;
    ortbRequest.regs = Object.assign(ortbRequest.regs, { 'gdpr': gdprApplies ? 1 : 0 });
    ortbRequest.user = Object.assign(ortbRequest.user, { 'consent': consentString });
  }
}

/**
 * Get currency (either default or adserver)
 * @returns {string} currency name
 */
const getCurrency = () => config.getConfig('currency.adServerCurrency') || DEFAULT_CURRENCY;

/**
 * Get value for first occurence of key within the collection
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
const mapAsset = (paramName, paramValue) => {
  let asset;
  switch (paramName) {
    case 'title':
      asset = {
        id: 0,
        required: paramValue.required,
        title: { len: paramValue.len }
      }
      break;
    case 'cta':
      asset = {
        id: 1,
        required: paramValue.required,
        data: { type: 12 }
      }
      break;
    case 'icon':
      asset = {
        id: 2,
        required: paramValue.required,
        img: { type: 1, w: paramValue.sizes[0], h: paramValue.sizes[1] }
      }
      break;
    case 'image':
      asset = {
        id: 3,
        required: paramValue.required,
        img: { type: 3, w: paramValue.sizes[0], h: paramValue.sizes[1] }
      }
      break;
    case 'body':
      asset = {
        id: 4,
        required: paramValue.required,
        data: { type: 2 }
      }
      break;
    case 'sponsoredBy':
      asset = {
        id: 5,
        required: paramValue.required,
        data: { type: 1 }
      }
      break;
  }
  return asset;
}

/**
 * @param {object} slot Ad Unit Params by Prebid
 * @returns {object} native object that conforms to ortb native ads spec
 */
const mapNative = slot => {
  const native = deepAccess(slot, 'mediaTypes.native');
  let assets;
  if (native) {
    const nativeParams = Object.keys(native);
    assets = [];
    nativeParams.forEach(par => {
      const newAsset = mapAsset(par, native[par]);
      if (newAsset) { assets.push(newAsset) };
    });
  }
  return assets ? { request: JSON.stringify({ native: { assets } }) } : undefined;
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
  const { adUnitCode, bidId, params = {}, ortb2Imp = {} } = slot;
  const { id, siteId, video } = params;
  const { ext = {} } = ortb2Imp;

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
    native: mapNative(slot),
    video: mapVideo(slot, video),
    tagid: adUnitCode,
    ext,
  };

  // Check floorprices for this imp
  const currency = getCurrency();
  if (typeof slot.getFloor === 'function') {
    var bannerFloor = 0;
    var nativeFloor = 0;
    var videoFloor = 0; // sspBC adapter accepts only floor per imp - check for maximum value for requested ad types and sizes

    if (slot.sizes.length) {
      bannerFloor = slot.sizes.reduce(function (prev, next) {
        var currentFloor = slot.getFloor({
          mediaType: 'banner',
          size: next,
          currency
        }).floor;
        return prev > currentFloor ? prev : currentFloor;
      }, 0);
    }

    nativeFloor = slot.getFloor({
      mediaType: 'native', currency
    });
    videoFloor = slot.getFloor({
      mediaType: 'video', currency
    });
    imp.bidfloor = Math.max(bannerFloor, nativeFloor, videoFloor);
  } else {
    imp.bidfloor = 0;
  }
  imp.bidfloorcur = currency;
  return imp;
}

const isVideoAd = bid => {
  const xmlTester = new RegExp(/^<\?xml/);
  return bid.adm && bid.adm.match(xmlTester);
}

const isNativeAd = bid => {
  const xmlTester = new RegExp(/^{['"]native['"]/);

  return bid.admNative || (bid.adm && bid.adm.match(xmlTester));
}

const parseNative = nativeData => {
  const result = {};
  nativeData.assets.forEach(asset => {
    const id = parseInt(asset.id);
    switch (id) {
      case 0:
        result.title = asset.title.text;
        break;
      case 1:
        result.cta = asset.data.value;
        break;
      case 2:
        result.icon = {
          url: asset.img.url,
          width: asset.img.w,
          height: asset.img.h,
        };
        break;
      case 3:
        result.image = {
          url: asset.img.url,
          width: asset.img.w,
          height: asset.img.h,
        };
        break;
      case 4:
        result.body = asset.data.value;
        break;
      case 5:
        result.sponsoredBy = asset.data.value;
        break;

      default:
        logWarn('Unrecognized native asset', asset);
    }
  });
  result.clickUrl = nativeData.link.url;
  result.impressionTrackers = nativeData.imptrackers;

  if (isArray(nativeData.jstracker)) {
    result.javascriptTrackers = nativeData.jstracker;
  } else if (nativeData.jstracker) {
    result.javascriptTrackers = [nativeData.jstracker];
  }
  return result;
}

const renderCreative = (site, auctionId, bid, seat, request) => {
  let gam;

  const mcad = {
    id: auctionId,
    seat,
    seatbid: [{
      bid: [bid],
    }],
  };

  const mcbase = btoa(encodeURI(JSON.stringify(mcad)));

  if (bid.adm) {
    // parse adm for gam config
    try {
      gam = JSON.parse(bid.adm).gam;

      if (!gam || !Object.keys(gam).length) {
        gam = undefined;
      } else {
        gam.namedSizes = ['fluid'];
        gam.div = 'div-gpt-ad-x01';
        gam.targeting = Object.assign(gam.targeting || {}, {
          OAS_retarg: '0',
          PREBID_ON: '1',
          emptygaf: '0',
        });
      }

      if (gam && !gam.targeting) {
        gam.targeting = {};
      }
    } catch (err) {
      logWarn('Could not parse adm data', bid.adm);
    }
  }

  let adcode = `<head>
  <title></title>
  <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
    body {
    background-color: transparent;
    margin: 0;
    padding: 0;
  }
</style>
  <script>
  window.rekid = ${site.id};
  window.slot = ${parseInt(site.slot, 10)};
  window.responseTimestamp = ${Date.now()};
  window.wp_sn = "${site.sn}";
  window.mcad = JSON.parse(decodeURI(atob("${mcbase}")));
  window.gdpr = ${JSON.stringify(request.gdprConsent)};
  window.page = "${site.page}";
  window.ref = "${site.ref}";
  window.adlabel = "${site.adLabel ? site.adLabel : ''}";
  window.pubid = "${site.publisherId ? site.publisherId : ''}";
  window.requestPVID = "${pageView.id}";
  `;

  if (gam) {
    adcode += `window.gam = ${JSON.stringify(gam)};`;
  }

  adcode += `</script>
    </head>
    <body>
    <div id="c"></div>
    <script async crossorigin nomodule src="https://std.wpcdn.pl/wpjslib/wpjslib-inline.js" id="wpjslib"></script>
    <script async crossorigin type="module" src="https://std.wpcdn.pl/wpjslib6/wpjslib-inline.js" id="wpjslib6"></script>
  </body>
  </html>`;

  return adcode;
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

    if ((!validBidRequests) || (validBidRequests.length < 1)) {
      return false;
    }

    const siteId = setOnAny(validBidRequests, 'params.siteId');
    const publisherId = setOnAny(validBidRequests, 'params.publisherId');
    const page = setOnAny(validBidRequests, 'params.page') || bidderRequest.refererInfo.page;
    const domain = setOnAny(validBidRequests, 'params.domain') || bidderRequest.refererInfo.domain;
    const tmax = setOnAny(validBidRequests, 'params.tmax') ? parseInt(setOnAny(validBidRequests, 'params.tmax'), 10) : TMAX;
    const pbver = '$prebid.version$';
    const testMode = setOnAny(validBidRequests, 'params.test') ? 1 : undefined;
    const ref = bidderRequest.refererInfo.ref;

    const payload = {
      id: bidderRequest.auctionId,
      site: {
        id: siteId,
        publisher: publisherId ? { id: publisherId } : undefined,
        page,
        domain,
        ref,
        content: { language: getContentLanguage() },
      },
      imp: validBidRequests.map(slot => mapImpression(slot)),
      cur: [getCurrency()],
      tmax,
      user: {},
      regs: {},
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

    return {
      method: 'POST',
      url: `${BIDDER_URL}?bdver=${BIDDER_VERSION}&pbver=${pbver}&inver=0`,
      data: JSON.stringify(payload),
      bidderRequest,
    };
  },

  interpretResponse(serverResponse, request) {
    const { bidderRequest } = request;
    const response = serverResponse.body;
    const bids = [];
    const site = JSON.parse(request.data).site; // get page and referer data from request
    site.sn = response.sn || 'mc_adapter'; // WPM site name (wp_sn)
    pageView.sn = site.sn; // store site_name (for syncing and notifications)
    let seat;

    if (response.seatbid !== undefined) {
      /*
        Match response to request, by comparing bid id's
        'bidid-' prefix indicates oneCode (parameterless) request and response
      */
      response.seatbid.forEach(seatbid => {
        let creativeCache;
        seat = seatbid.seat;
        seatbid.bid.forEach(serverBid => {
          // get data from bid response
          const { adomain, crid = `mcad_${bidderRequest.auctionId}_${site.slot}`, impid, exp = 300, ext, price, w, h } = serverBid;

          const bidRequest = bidderRequest.bids.filter(b => {
            const { bidId, params = {} } = b;
            const { id, siteId } = params;
            const currentBidId = id && siteId ? id : 'bidid-' + bidId;
            return currentBidId === impid;
          })[0];

          // get data from linked bidRequest
          const { bidId, params } = bidRequest || {};

          // get slot id for current bid
          site.slot = params && params.id;

          if (ext) {
            /*
              bid response might include ext object containing siteId / slotId, as detected by OneCode
              update site / slot data in this case

              ext also might contain publisherId and custom ad label
            */
            const { siteid, slotid, pubid, adlabel, cache } = ext;
            site.id = siteid || site.id;
            site.slot = slotid || site.slot;
            site.publisherId = pubid;
            site.adLabel = adlabel;
            creativeCache = cache;
          }

          if (bidRequest && site.id && !strIncludes(site.id, 'bidid')) {
            // found a matching request; add this bid

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
              bidderCode: BIDDER_CODE,
              meta: {
                advertiserDomains: adomain,
                networkName: seat,
                pricepl: ext && ext.pricepl,
              },
              netRevenue: true,
            };

            // mediaType and ad data for instream / native / banner
            if (isVideoAd(serverBid)) {
              // video
              bid.adType = 'instream';
              bid.mediaType = 'video';
              bid.vastXml = serverBid.adm;
              bid.vastContent = serverBid.adm;
              bid.vastUrl = creativeCache;
            } else if (isNativeAd(serverBid)) {
              // native
              bid.mediaType = 'native';
              // check native object
              try {
                const nativeData = serverBid.admNative || JSON.parse(serverBid.adm).native;
                bid.native = parseNative(nativeData);
                bid.width = 1;
                bid.height = 1;

                // append viewability tracker
                const jsData = {
                  rid: bidRequest.auctionId,
                  crid: bid.creativeId,
                  adunit: bidRequest.adUnitCode,
                  url: bid.native.clickUrl,
                  vendor: seat,
                  site: site.id,
                  slot: site.slot,
                  cpm: bid.cpm.toPrecision(4),
                };
                const jsTracker = '<script type="text/javascript" async="true" src="' + TRACKER_URL + '" ' + Object.keys(jsData).reduce((acc, current) => { return acc + ` data-wpar-${current}="${jsData[current]}"` }, '') + '><\/script>';
                if (bid.native.javascriptTrackers) {
                  bid.native.javascriptTrackers.push(jsTracker);
                } else {
                  bid.native.javascriptTrackers = [jsTracker];
                }
              } catch (err) {
                logWarn('Could not parse native data', serverBid.adm);
                bid.cpm = 0;
              }
            } else {
              // banner ad (default)
              bid.mediaType = 'banner';
              bid.ad = renderCreative(site, response.id, serverBid, seat, bidderRequest);
            }

            if (bid.cpm > 0) {
              bids.push(bid);
            }
          } else {
            logWarn('Discarding response - no matching request / site id', serverBid.impid);
          }
        });
      });
    }

    return bids;
  },
  getUserSyncs(syncOptions, serverResponses, gdprConsent) {
    let mySyncs = [];
    // TODO: the check on CMP api version does not seem to make sense here. It means "always run the usersync unless an old (v1) CMP was detected". No attention is paid to the consent choices.
    if (syncOptions.iframeEnabled && consentApiVersion != 1) {
      mySyncs.push({
        type: 'iframe',
        url: `${SYNC_URL}?tcf=${consentApiVersion}&pvid=${pageView.id}&sn=${pageView.sn}`,
      });
    };
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
