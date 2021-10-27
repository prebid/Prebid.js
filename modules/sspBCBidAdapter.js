import { isArray, deepAccess, logWarn, parseUrl } from '../src/utils.js';
import { ajax } from '../src/ajax.js';
import { registerBidder } from '../src/adapters/bidderFactory.js';
import { BANNER, NATIVE, VIDEO } from '../src/mediaTypes.js';
import strIncludes from 'core-js-pure/features/string/includes.js';

const BIDDER_CODE = 'sspBC';
const BIDDER_URL = 'https://ssp.wp.pl/bidder/';
const SYNC_URL = 'https://ssp.wp.pl/bidder/usersync';
const NOTIFY_URL = 'https://ssp.wp.pl/bidder/notify';
const TMAX = 450;
const BIDDER_VERSION = '5.2';
const W = window;
const { navigator } = W;
const oneCodeDetection = {};
const adSizesCalled = {};
var consentApiVersion;

/**
 * Get bid parameters for notification
 * @param {*} bidData - bid (bidWon), or array of bids (timeout)
 */
const getNotificationPayload = bidData => {
  if (bidData) {
    const bids = isArray(bidData) ? bidData : [bidData];
    if (bids.length > 0) {
      const result = {
        requestId: undefined,
        siteId: [],
        adUnit: [],
        slotId: [],
      }
      bids.forEach(bid => {
        let params = isArray(bid.params) ? bid.params[0] : bid.params;
        params = params || {};

        // check for stored detection
        if (oneCodeDetection[bid.requestId]) {
          params.siteId = oneCodeDetection[bid.requestId][0];
          params.id = oneCodeDetection[bid.requestId][1];
        }

        if (params.siteId) {
          result.siteId.push(params.siteId);
        }
        if (params.id) {
          result.slotId.push(params.id);
        }
        if (bid.cpm) {
          const meta = bid.meta || {};
          result.cpm = bid.cpm;
          result.creativeId = bid.creativeId;
          result.adomain = meta.advertiserDomains && meta.advertiserDomains[0];
          result.networkName = meta.networkName;
        }
        result.adUnit.push(bid.adUnitCode)
        result.requestId = bid.auctionId || result.requestId;
        result.timeout = bid.timeout || result.timeout;
      })
      return result;
    }
  }
}

const cookieSupport = () => {
  const isSafari = /^((?!chrome|android|crios|fxios).)*safari/i.test(navigator.userAgent);
  const useCookies = navigator.cookieEnabled || !!document.cookie.length;

  return !isSafari && useCookies;
};

const applyClientHints = ortbRequest => {
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
    }];

  ortbRequest.user = Object.assign(ortbRequest.user, { data });
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
    ortbRequest.regs = Object.assign(ortbRequest.regs, { '[ortb_extensions.gdpr]': gdprApplies ? 1 : 0 });
    ortbRequest.user = Object.assign(ortbRequest.user, { '[ortb_extensions.consent]': consentString });
  }
}

/**
 * Get value for first occurence of key within the collection
 */
const setOnAny = (collection, key) => collection.reduce((prev, next) => prev || deepAccess(next, key), false);

/**
 * Send payload to notification endpoint
 */
const sendNotification = payload => {
  ajax(NOTIFY_URL, null, JSON.stringify(payload), {
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

var mapVideo = slot => {
  var video = deepAccess(slot, 'mediaTypes.video');
  var videoParamsUsed = ['api', 'context', 'linearity', 'maxduration', 'mimes', 'protocols'];
  var videoAssets;

  if (video) {
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
  const { id, siteId } = params;
  const { ext = {} } = ortb2Imp;

  /*
     check max size for this imp, and check/store number this size was called (for current view)
     send this info as ext.pbsize
  */
  const slotSize = slot.sizes.length ? slot.sizes.reduce((prev, next) => prev[0] * prev[1] <= next[0] * next[1] ? next : prev).join('x') : '1x1';
  adSizesCalled[slotSize] = adSizesCalled[slotSize] ? adSizesCalled[slotSize] += 1 : 1;
  ext.data = Object.assign({ pbsize: `${slotSize}_${adSizesCalled[slotSize]}` }, ext.data);

  const imp = {
    id: id && siteId ? id : 'bidid-' + bidId,
    banner: mapBanner(slot),
    native: mapNative(slot),
    video: mapVideo(slot),
    tagid: adUnitCode,
    ext,
  };

  // Check floorprices for this imp
  if (typeof slot.getFloor === 'function') {
    var bannerFloor = 0;
    var nativeFloor = 0;
    var videoFloor = 0; // sspBC adapter accepts only floor per imp - check for maximum value for requested ad types and sizes

    if (slot.sizes.length) {
      bannerFloor = slot.sizes.reduce(function (prev, next) {
        var currentFloor = slot.getFloor({
          mediaType: 'banner',
          size: next
        }).floor;
        return prev > currentFloor ? prev : currentFloor;
      }, 0);
    }

    nativeFloor = slot.getFloor({
      mediaType: 'native'
    });
    videoFloor = slot.getFloor({
      mediaType: 'video'
    });
    imp.bidfloor = Math.max(bannerFloor, nativeFloor, videoFloor);
  }
  return imp;
}

const isVideoAd = bid => {
  const xmlTester = new RegExp(/^<\?xml/);
  return bid.adm && bid.adm.match(xmlTester);
}

const isNativeAd = bid => {
  const xmlTester = new RegExp(/^{['"]native['"]/);

  return bid.adm && bid.adm.match(xmlTester);
}

const parseNative = nativeData => {
  const result = {};
  nativeData.assets.forEach(asset => {
    const id = parseInt(asset.id);
    switch (id) {
      case 0:
        result.title = asset.title.text;
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
  `;

  if (gam) {
    adcode += `window.gam = ${JSON.stringify(gam)};`;
  }

  adcode += `</script>
    </head>
    <body>
    <div id="c"></div>
    <script id="wpjslib" crossorigin src="//std.wpcdn.pl/wpjslib/wpjslib-inline.js" async defer></script>
  </body>
  </html>`;

  return adcode;
}

const spec = {
  code: BIDDER_CODE,
  aliases: [],
  supportedMediaTypes: [BANNER, NATIVE, VIDEO],
  isBidRequestValid(bid) {
    // as per OneCode integration, bids without params are valid
    return true;
  },
  buildRequests(validBidRequests, bidderRequest) {
    if ((!validBidRequests) || (validBidRequests.length < 1)) {
      return false;
    }

    const siteId = setOnAny(validBidRequests, 'params.siteId');
    const publisherId = setOnAny(validBidRequests, 'params.publisherId');
    const page = setOnAny(validBidRequests, 'params.page') || bidderRequest.refererInfo.referer;
    const domain = setOnAny(validBidRequests, 'params.domain') || parseUrl(page).hostname;
    const tmax = setOnAny(validBidRequests, 'params.tmax') ? parseInt(setOnAny(validBidRequests, 'params.tmax'), 10) : TMAX;
    const pbver = '$prebid.version$';
    const testMode = setOnAny(validBidRequests, 'params.test') ? 1 : undefined;

    let ref;

    try {
      if (W.self === W.top && document.referrer) { ref = document.referrer; }
    } catch (e) {
    }

    const payload = {
      id: bidderRequest.auctionId,
      site: {
        id: siteId,
        publisher: publisherId ? { id: publisherId } : undefined,
        page,
        domain,
        ref
      },
      imp: validBidRequests.map(slot => mapImpression(slot)),
      tmax,
      user: {},
      regs: {},
      test: testMode,
    };

    applyGdpr(bidderRequest, payload);
    applyClientHints(payload);

    return {
      method: 'POST',
      url: `${BIDDER_URL}?cs=${cookieSupport()}&bdver=${BIDDER_VERSION}&pbver=${pbver}&inver=0`,
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
    let seat;

    if (response.seatbid !== undefined) {
      /*
        Match response to request, by comparing bid id's
        'bidid-' prefix indicates oneCode (parameterless) request and response
      */
      response.seatbid.forEach(seatbid => {
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
            */
            const { siteid, slotid } = ext;
            site.id = siteid || site.id;
            site.slot = slotid || site.slot;
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
            } else if (isNativeAd(serverBid)) {
              // native
              bid.mediaType = 'native';
              // check native object
              try {
                const nativeData = JSON.parse(serverBid.adm).native;
                bid.native = parseNative(nativeData);
                bid.width = 1;
                bid.height = 1;
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
  getUserSyncs(syncOptions) {
    if (syncOptions.iframeEnabled && consentApiVersion != 1) {
      return [{
        type: 'iframe',
        url: `${SYNC_URL}?tcf=${consentApiVersion}`,
      }];
    } else {
      logWarn('sspBC adapter requires iframe based user sync.');
    }
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
