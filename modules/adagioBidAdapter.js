import { BANNER, NATIVE, VIDEO } from '../src/mediaTypes.js';
import {
  canAccessWindowTop,
  cleanObj,
  deepAccess,
  deepClone,
  generateUUID,
  getWindowSelf,
  isArray,
  isFn,
  isNumber,
  isStr,
  logError,
  logInfo,
  logWarn,
  mergeDeep,
} from '../src/utils.js';
import { getRefererInfo, parseDomain } from '../src/refererDetection.js';
import { OUTSTREAM } from '../src/video.js';
import { Renderer } from '../src/Renderer.js';
import { _ADAGIO } from '../libraries/adagioUtils/adagioUtils.js';
import { config } from '../src/config.js';
import { convertOrtbRequestToProprietaryNative } from '../src/native.js';
import { getGptSlotInfoForAdUnitCode } from '../libraries/gptUtils/gptUtils.js';
import { registerBidder } from '../src/adapters/bidderFactory.js';
import { userSync } from '../src/userSync.js';
import { validateOrtbFields } from '../src/prebid.js';

const BIDDER_CODE = 'adagio';
const LOG_PREFIX = 'Adagio:';
export const ENDPOINT = 'https://mp.4dex.io/prebid';
const SUPPORTED_MEDIA_TYPES = [BANNER, NATIVE, VIDEO];
const GVLID = 617;

const BB_PUBLICATION = 'adagio';
const BB_RENDERER_DEFAULT = 'renderer';
export const BB_RENDERER_URL = `https://${BB_PUBLICATION}.bbvms.com/r/$RENDERER.js`;

const CURRENCY = 'USD';

/**
 * Get device data object, with some properties
 * deviated from the OpenRTB spec.
 * @param {Object} ortb2Data
 * @returns {Object} Device data object
 */
function getDevice(ortb2Data) {
  const _device = {};

  // Merge the device object from ORTB2 data.
  if (ortb2Data?.device) {
    mergeDeep(_device, ortb2Data.device);
  }

  // If the geo object is not defined, create it.
  if (!_device.geo) {
    _device.geo = {};
  }

  const language = navigator.language ? 'language' : 'userLanguage';
  mergeDeep(_device, {
    userAgent: navigator.userAgent,
    language: navigator[language],
    js: 1
  });

  return _device;
}

function getSite(bidderRequest) {
  const { refererInfo } = bidderRequest;
  return {
    domain: parseDomain(refererInfo.topmostLocation) || '',
    page: refererInfo.topmostLocation || '',
    referrer: refererInfo.ref || getWindowSelf().document.referrer || '',
    top: refererInfo.reachedTop
  };
};

function autoDetectAdUnitElementIdFromGpt(adUnitCode) {
  const autoDetectedAdUnit = getGptSlotInfoForAdUnitCode(adUnitCode);

  if (autoDetectedAdUnit.divId) {
    return autoDetectedAdUnit.divId;
  }
};

function isRendererPreferredFromPublisher(bidRequest) {
  // renderer defined at adUnit level
  const adUnitRenderer = deepAccess(bidRequest, 'renderer');
  const hasValidAdUnitRenderer = !!(adUnitRenderer && adUnitRenderer.url && adUnitRenderer.render);

  // renderer defined at adUnit.mediaTypes level
  const mediaTypeRenderer = deepAccess(bidRequest, 'mediaTypes.video.renderer');
  const hasValidMediaTypeRenderer = !!(mediaTypeRenderer && mediaTypeRenderer.url && mediaTypeRenderer.render);

  return !!(
    (hasValidAdUnitRenderer && !(adUnitRenderer.backupOnly === true)) ||
    (hasValidMediaTypeRenderer && !(mediaTypeRenderer.backupOnly === true))
  );
}

/**
 * Check if the publisher has defined its own video player and uses it for all ad-units.
 * If not or if the `backupOnly` flag is true, this means we use our own player (BlueBillywig) defined in this adapter.
 */
function getPlayerName(bidRequest) {
  return _internal.isRendererPreferredFromPublisher(bidRequest) ? 'other' : 'adagio'; ;
}

function hasRtd() {
  const rtdConfigs = config.getConfig('realTimeData.dataProviders') || [];
  return rtdConfigs.find(provider => provider.name === 'adagio');
};

export const _internal = {
  canAccessWindowTop,
  getAdagioNs: function() {
    return _ADAGIO;
  },
  getDevice,
  getSite,
  getRefererInfo,
  hasRtd,
  isRendererPreferredFromPublisher,
};

function _getGdprConsent(bidderRequest) {
  if (!deepAccess(bidderRequest, 'gdprConsent')) {
    return false;
  }

  const {
    apiVersion,
    gdprApplies,
    consentString,
    allowAuctionWithoutConsent
  } = bidderRequest.gdprConsent;

  return cleanObj({
    apiVersion,
    consentString,
    consentRequired: gdprApplies ? 1 : 0,
    allowAuctionWithoutConsent: allowAuctionWithoutConsent ? 1 : 0
  });
}

function _getCoppa() {
  return {
    required: config.getConfig('coppa') === true ? 1 : 0
  };
}

function _getUspConsent(bidderRequest) {
  return (deepAccess(bidderRequest, 'uspConsent')) ? { uspConsent: bidderRequest.uspConsent } : false;
}

function _getSchain(bidRequest) {
  return deepAccess(bidRequest, 'ortb2.source.ext.schain');
}

function _getEids(bidRequest) {
  if (deepAccess(bidRequest, 'userIdAsEids')) {
    return bidRequest.userIdAsEids;
  }
}

/**
 * Merge and compute video params set at mediaTypes and bidder params level
 *
 * @param {object} bidRequest - copy of the original bidRequest object.
 * @returns {void}
 */
function _buildVideoBidRequest(bidRequest) {
  const videoAdUnitParams = deepAccess(bidRequest, 'mediaTypes.video', {});
  const videoBidderParams = deepAccess(bidRequest, 'params.video', {});
  const computedParams = {};

  // Special case for playerSize.
  // Eeach props will be overrided if they are defined in config.
  if (Array.isArray(videoAdUnitParams.playerSize)) {
    const tempSize = (Array.isArray(videoAdUnitParams.playerSize[0])) ? videoAdUnitParams.playerSize[0] : videoAdUnitParams.playerSize;
    computedParams.w = tempSize[0];
    computedParams.h = tempSize[1];
  }

  const videoParams = {
    ...computedParams,
    ...videoAdUnitParams,
    ...videoBidderParams
  };

  if (videoParams.context && videoParams.context === OUTSTREAM) {
    videoParams.playerName = getPlayerName(bidRequest);
  }

  bidRequest.mediaTypes.video = videoParams;
  validateOrtbFields(bidRequest, 'video');
}

function _parseNativeBidResponse(bid) {
  if (!bid.admNative || !Array.isArray(bid.admNative.assets)) {
    logError(`${LOG_PREFIX} Invalid native response`);
    return;
  }

  const native = {}

  function addAssetDataValue(data) {
    const map = {
      1: 'sponsoredBy', // sponsored
      2: 'body', // desc
      3: 'rating',
      4: 'likes',
      5: 'downloads',
      6: 'price',
      7: 'salePrice',
      8: 'phone',
      9: 'address',
      10: 'body2', // desc2
      11: 'displayUrl',
      12: 'cta'
    }
    if (map.hasOwnProperty(data.type) && typeof data.value === 'string') {
      native[map[data.type]] = data.value;
    }
  }

  // assets
  bid.admNative.assets.forEach(asset => {
    if (asset.title) {
      native.title = asset.title.text
    } else if (asset.data) {
      addAssetDataValue(asset.data)
    } else if (asset.img) {
      switch (asset.img.type) {
        case 1:
          native.icon = {
            url: asset.img.url,
            width: asset.img.w,
            height: asset.img.h
          };
          break;
        default:
          native.image = {
            url: asset.img.url,
            width: asset.img.w,
            height: asset.img.h
          };
          break;
      }
    }
  });

  if (bid.admNative.link) {
    if (bid.admNative.link.url) {
      native.clickUrl = bid.admNative.link.url;
    }
    if (Array.isArray(bid.admNative.link.clicktrackers)) {
      native.clickTrackers = bid.admNative.link.clicktrackers
    }
  }

  if (Array.isArray(bid.admNative.eventtrackers)) {
    native.impressionTrackers = [];
    bid.admNative.eventtrackers.forEach(tracker => {
      // Only Impression events are supported. Prebid does not support Viewability events yet.
      if (tracker.event !== 1) {
        return;
      }

      // methods:
      // 1: image
      // 2: js
      // note: javascriptTrackers is a string. If there's more than one JS tracker in bid response, the last script will be used.
      switch (tracker.method) {
        case 1:
          native.impressionTrackers.push(tracker.url);
          break;
        case 2:
          const script = `<script async src="${tracker.url}"></script>`;
          if (!native.javascriptTrackers) {
            native.javascriptTrackers = script;
          } else {
            native.javascriptTrackers += `\n${script}`;
          }
          break;
      }
    });
  } else {
    native.impressionTrackers = Array.isArray(bid.admNative.imptrackers) ? bid.admNative.imptrackers : [];
    if (bid.admNative.jstracker) {
      native.javascriptTrackers = bid.admNative.jstracker;
    }
  }

  if (bid.admNative.privacy) {
    native.privacyLink = bid.admNative.privacy;
  }

  if (bid.admNative.ext) {
    native.ext = {}

    if (bid.admNative.ext.bvw) {
      native.ext.adagio_bvw = bid.admNative.ext.bvw;
    }
  }

  bid.native = native
}

// bidRequest param must be the `bidRequest` object with the original `auctionId` value.
function _getFloors(bidRequest) {
  if (!isFn(bidRequest.getFloor)) {
    return false;
  }

  const floors = [];

  const getAndPush = (mediaType, size) => {
    const info = bidRequest.getFloor({
      currency: CURRENCY,
      mediaType,
      size
    });

    floors.push(cleanObj({
      mt: mediaType,
      s: isArray(size) ? `${size[0]}x${size[1]}` : undefined,
      f: (!isNaN(info?.floor) && info?.currency === CURRENCY) ? info?.floor : undefined
    }));
  }

  Object.keys(bidRequest.mediaTypes).forEach(mediaType => {
    if (SUPPORTED_MEDIA_TYPES.indexOf(mediaType) !== -1) {
      const sizeProp = mediaType === VIDEO ? 'playerSize' : 'sizes';

      if (bidRequest.mediaTypes[mediaType][sizeProp] && bidRequest.mediaTypes[mediaType][sizeProp].length) {
        if (isArray(bidRequest.mediaTypes[mediaType][sizeProp][0])) {
          bidRequest.mediaTypes[mediaType][sizeProp].forEach(size => {
            getAndPush(mediaType, [size[0], size[1]]);
          });
        } else {
          getAndPush(mediaType, [bidRequest.mediaTypes[mediaType][sizeProp][0], bidRequest.mediaTypes[mediaType][sizeProp][1]]);
        }
      } else {
        getAndPush(mediaType, '*');
      }
    }
  });

  return floors;
}

/**
 * Try to find the value of `paramName` and set it to adUnit.params if
 * it has not already been set.
 * This function will check through:
 * - bidderSettings object
 * - ortb2.site.ext.data FPD…
 *
 * @param {*} bid
 * @param {String} paramName
 */
export function setExtraParam(bid, paramName) {
  bid.params = bid.params || {};

  // eslint-disable-next-line
  if (!!(bid.params[paramName])) {
    return;
  }

  const adgGlobalConf = config.getConfig('adagio') || {};
  const ortb2Conf = bid.ortb2;

  const detected = adgGlobalConf[paramName] || deepAccess(ortb2Conf, `site.ext.data.${paramName}`, null);
  if (detected) {
    // First Party Data can be an array.
    // As we consider that params detected from FPD are fallbacks, we just keep the 1st value.
    if (Array.isArray(detected)) {
      if (detected.length) {
        bid.params[paramName] = detected[0].toString();
      }
      return;
    }

    bid.params[paramName] = detected.toString();
  }
}

function autoFillParams(bid) {
  // adUnitElementId …
  const adgGlobalConf = config.getConfig('adagio') || {};

  bid.params = bid.params || {};

  // adgGlobalConf.siteId is a shortcut to facilitate the integration for publisher.
  if (adgGlobalConf.siteId) {
    bid.params.organizationId = adgGlobalConf.siteId.split(':')[0];
    bid.params.site = adgGlobalConf.siteId.split(':')[1];
  }

  if (!bid.params.placement) {
    let p = deepAccess(bid, 'ortb2Imp.ext.data.adg_rtd.placement', '');
    if (!p) {
      // Use ortb2Imp.ext.data.placement for backward compatibility.
      p = deepAccess(bid, 'ortb2Imp.ext.data.placement', '');
    }

    // `useAdUnitCodeAsPlacement` is an edge case. Useful when a Prebid Manager cannot handle properly params setting.
    if (!p && bid.params.useAdUnitCodeAsPlacement === true) {
      p = bid.adUnitCode;
    }
    bid.params.placement = p;
  }

  bid.params.adUnitElementId = deepAccess(bid, 'ortb2Imp.ext.data.divId', bid.params.adUnitElementId);
  if (!bid.params.adUnitElementId) {
    if (adgGlobalConf.useAdUnitCodeAsAdUnitElementId === true || bid.params.useAdUnitCodeAsAdUnitElementId === true) {
      bid.params.adUnitElementId = bid.adUnitCode;
    } else {
      bid.params.adUnitElementId = autoDetectAdUnitElementIdFromGpt(bid.adUnitCode);
    }
  }

  // extra params
  setExtraParam(bid, 'pagetype');
  setExtraParam(bid, 'category');
}

// See https://support.bluebillywig.com/developers/vast-renderer/
const OUTSTREAM_RENDERER = {
  bootstrapPlayer: function(bid) {
    const rendererCode = bid.outstreamRendererCode;

    const config = {
      code: bid.adUnitCode,
    };

    if (bid.vastXml) {
      config.vastXml = bid.vastXml;
    } else if (bid.vastUrl) {
      config.vastUrl = bid.vastUrl;
    }

    if (!bid.vastXml && !bid.vastUrl) {
      logError(`${LOG_PREFIX} no vastXml or vastUrl on bid`);
      return;
    }

    if (!window.bluebillywig || !window.bluebillywig.renderers || !window.bluebillywig.renderers.length) {
      logError(`${LOG_PREFIX} no BlueBillywig renderers found!`);
      return;
    }

    const rendererId = this.getRendererId(BB_PUBLICATION, rendererCode);

    const override = {}
    if (bid.skipOffset) {
      override.skipOffset = bid.skipOffset.toString()
    }

    const renderer = window.bluebillywig.renderers.find(bbr => bbr._id === rendererId);
    if (!renderer) {
      logError(`${LOG_PREFIX} couldn't find a renderer with ID ${rendererId}`);
      return;
    }

    const el = document.getElementById(bid.adUnitCode);

    renderer.bootstrap(config, el, override);
  },
  newRenderer: function(adUnitCode, rendererCode) {
    const rendererUrl = BB_RENDERER_URL.replace('$RENDERER', rendererCode);

    const renderer = Renderer.install({
      url: rendererUrl,
      loaded: false,
      adUnitCode
    });

    try {
      renderer.setRender(this.outstreamRender);
    } catch (err) {
      logError(`${LOG_PREFIX} error trying to setRender`, err);
    }

    return renderer;
  },
  outstreamRender: function(bid) {
    bid.renderer.push(() => {
      OUTSTREAM_RENDERER.bootstrapPlayer(bid)
    });
  },
  getRendererId: function(publication, renderer) {
    // By convention, the RENDERER_ID is always the publication name (adagio) and the ad unit code (eg. renderer)
    // joined together by a dash. It's used to identify the correct renderer instance on the page in case there's multiple.
    return `${publication}-${renderer}`;
  }
};

export const spec = {
  code: BIDDER_CODE,
  gvlid: GVLID,
  supportedMediaTypes: SUPPORTED_MEDIA_TYPES,

  isBidRequestValid(bid) {
    bid.params = bid.params || {};

    autoFillParams(bid);

    // Note: `bid.params.placement` is not related to the video param `placement`.
    if (!(bid.params.organizationId && bid.params.site && bid.params.placement)) {
      logWarn(`${LOG_PREFIX} at least one required param is missing.`);
      return false;
    }

    return true;
  },

  buildRequests(validBidRequests, bidderRequest) {
    // convert Native ORTB definition to old-style prebid native definition
    validBidRequests = convertOrtbRequestToProprietaryNative(validBidRequests);

    const secure = (location.protocol === 'https:') ? 1 : 0;
    const device = _internal.getDevice(bidderRequest?.ortb2);
    const site = _internal.getSite(bidderRequest);
    const pageviewId = _internal.getAdagioNs().pageviewId;
    const gdprConsent = _getGdprConsent(bidderRequest) || {};
    const uspConsent = _getUspConsent(bidderRequest) || {};
    const coppa = _getCoppa();
    const { gpp, gpp_sid: gppSid } = deepAccess(bidderRequest, 'ortb2.regs', {});
    const schain = _getSchain(validBidRequests[0]);
    const eids = _getEids(validBidRequests[0]) || [];
    const syncEnabled = deepAccess(config.getConfig('userSync'), 'syncEnabled')
    const canSyncWithIframe = syncEnabled && userSync.canBidderRegisterSync('iframe', 'adagio')

    // We don't validate the dsa object in adapter and let our server do it.
    const dsa = deepAccess(bidderRequest, 'ortb2.regs.ext.dsa');

    // If no session data is provided, we always generate a new one.
    const sessionData = deepAccess(bidderRequest, 'ortb2.site.ext.data.adg_rtd.session', {});
    if (!Object.keys(sessionData).length) {
      logInfo(LOG_PREFIX, 'No session data provided. A new session is be generated.')
      sessionData.new = true;
      sessionData.rnd = Math.random()
    }

    const aucId = deepAccess(bidderRequest, 'ortb2.site.ext.data.adg_rtd.uid') || generateUUID()

    const adUnits = validBidRequests.map(rawBidRequest => {
      const bidRequest = deepClone(rawBidRequest);

      // Fix https://github.com/prebid/Prebid.js/issues/9781
      bidRequest.auctionId = aucId

      // Force the Split Keyword to be a String
      if (bidRequest.params.splitKeyword) {
        if (isStr(bidRequest.params.splitKeyword) || isNumber(bidRequest.params.splitKeyword)) {
          bidRequest.params.splitKeyword = bidRequest.params.splitKeyword.toString();
        } else {
          delete bidRequest.params.splitKeyword;

          logWarn(LOG_PREFIX, 'The splitKeyword param have been removed because the type is invalid, accepted type: number or string.');
        }
      }

      // Enforce the organizationId param to be a string
      bidRequest.params.organizationId = bidRequest.params.organizationId.toString();

      // Force the Data Layer key and value to be a String
      if (bidRequest.params.dataLayer) {
        if (isStr(bidRequest.params.dataLayer) || isNumber(bidRequest.params.dataLayer) || isArray(bidRequest.params.dataLayer) || isFn(bidRequest.params.dataLayer)) {
          logWarn(LOG_PREFIX, 'The dataLayer param is invalid, only object is accepted as a type.');
          delete bidRequest.params.dataLayer;
        } else {
          let invalidDlParam = false;

          bidRequest.params.dl = bidRequest.params.dataLayer
          // Remove the dataLayer from the BidRequest to send the `dl` instead of the `dataLayer`
          delete bidRequest.params.dataLayer

          Object.keys(bidRequest.params.dl).forEach((key) => {
            if (bidRequest.params.dl[key]) {
              if (isStr(bidRequest.params.dl[key]) || isNumber(bidRequest.params.dl[key])) {
                bidRequest.params.dl[key] = bidRequest.params.dl[key].toString();
              } else {
                invalidDlParam = true;
                delete bidRequest.params.dl[key];
              }
            }
          });

          if (invalidDlParam) {
            logWarn(LOG_PREFIX, 'Some parameters of the dataLayer property have been removed because the type is invalid, accepted type: number or string.');
          }
        }
      }

      // Handle priceFloors module
      // We need to use `rawBidRequest` as param because:
      // - adagioBidAdapter generates its own auctionId due to transmitTid activity limitation (see https://github.com/prebid/Prebid.js/pull/10079)
      // - the priceFloors.getFloor() uses a `_floorDataForAuction` map to store the floors based on the auctionId.
      const computedFloors = _getFloors(rawBidRequest);
      if (isArray(computedFloors) && computedFloors.length) {
        bidRequest.floors = computedFloors

        if (deepAccess(bidRequest, 'mediaTypes.banner')) {
          const bannerObj = bidRequest.mediaTypes.banner

          const computeNewSizeArray = (sizeArr = []) => {
            const size = { size: sizeArr, floor: null }
            const bannerFloors = bidRequest.floors.filter(floor => floor.mt === BANNER)
            const BannerSizeFloor = bannerFloors.find(floor => floor.s === sizeArr.join('x'))
            size.floor = (bannerFloors) ? (BannerSizeFloor) ? BannerSizeFloor.f : bannerFloors[0].f : null
            return size
          }

          // `bannerSizes`, internal property name
          bidRequest.mediaTypes.banner.bannerSizes = (isArray(bannerObj.sizes[0]))
            ? bannerObj.sizes.map(sizeArr => {
              return computeNewSizeArray(sizeArr)
            })
            : computeNewSizeArray(bannerObj.sizes)
        }

        if (deepAccess(bidRequest, 'mediaTypes.video')) {
          const videoObj = bidRequest.mediaTypes.video
          const videoFloors = bidRequest.floors.filter(floor => floor.mt === VIDEO);
          const playerSize = (videoObj.playerSize && isArray(videoObj.playerSize[0])) ? videoObj.playerSize[0] : videoObj.playerSize
          const videoSizeFloor = (playerSize) ? videoFloors.find(floor => floor.s === playerSize.join('x')) : undefined

          bidRequest.mediaTypes.video.floor = (videoFloors) ? videoSizeFloor ? videoSizeFloor.f : videoFloors[0].f : null
        }

        if (deepAccess(bidRequest, 'mediaTypes.native')) {
          const nativeFloors = bidRequest.floors.filter(floor => floor.mt === NATIVE);
          if (nativeFloors.length) {
            bidRequest.mediaTypes.native.floor = nativeFloors[0].f
          }
        }
      }

      if (deepAccess(bidRequest, 'mediaTypes.video')) {
        _buildVideoBidRequest(bidRequest);
      }

      const gpid = deepAccess(bidRequest, 'ortb2Imp.ext.gpid');
      if (gpid) {
        bidRequest.gpid = gpid;
      }

      const instl = deepAccess(bidRequest, 'ortb2Imp.instl');
      if (instl !== undefined) {
        bidRequest.instl = instl === 1 || instl === '1' ? 1 : undefined;
      }
      const rwdd = deepAccess(bidRequest, 'ortb2Imp.rwdd');
      if (rwdd !== undefined) {
        bidRequest.rwdd = rwdd === 1 || rwdd === '1' ? 1 : undefined;
      }

      // features are added by the adagioRtdProvider.
      const rawFeatures = {
        ...deepAccess(bidRequest, 'ortb2.site.ext.data.adg_rtd.features', {}),
        print_number: (bidRequest.bidderRequestsCount || 1).toString(),
        adunit_position: deepAccess(bidRequest, 'ortb2Imp.ext.data.adg_rtd.adunit_position', null)
      }
      // Clean the features object from null or undefined values.
      bidRequest.features = Object.entries(rawFeatures).reduce((a, [k, v]) => {
        if (v != null) {
          a[k] = v;
        }
        return a;
      }, {})

      // Remove some params that are not needed on the server side.
      delete bidRequest.params.siteId;

      // whitelist the fields that are allowed to be sent to the server.
      const adUnit = {
        adUnitCode: bidRequest.adUnitCode,
        auctionId: bidRequest.auctionId,
        bidder: bidRequest.bidder,
        bidId: bidRequest.bidId,
        params: bidRequest.params,
        features: bidRequest.features,
        gpid: bidRequest.gpid,
        mediaTypes: bidRequest.mediaTypes,
        nativeParams: bidRequest.nativeParams,
        score: bidRequest.score,
        transactionId: bidRequest.transactionId,
        instl: bidRequest.instl,
        rwdd: bidRequest.rwdd,
      }

      return adUnit;
    });

    // Group ad units by organizationId
    const groupedAdUnits = adUnits.reduce((groupedAdUnits, adUnit) => {
      const organizationId = adUnit.params.organizationId

      groupedAdUnits[organizationId] = groupedAdUnits[organizationId] || [];
      groupedAdUnits[organizationId].push(adUnit);

      return groupedAdUnits;
    }, {});

    // Adding more params on the original bid object.
    // Those params are not sent to the server.
    // They are used for further operations on analytics adapter.
    validBidRequests.forEach(rawBidRequest => {
      rawBidRequest.params.pageviewId = pageviewId
    });

    // Build one request per organizationId
    const requests = Object.keys(groupedAdUnits).map(organizationId => {
      return {
        method: 'POST',
        url: ENDPOINT,
        data: {
          organizationId: organizationId,
          hasRtd: _internal.hasRtd() ? 1 : 0,
          secure: secure,
          device: device,
          site: site,
          pageviewId: pageviewId,
          adUnits: groupedAdUnits[organizationId],
          data: {
            session: sessionData
          },
          regs: {
            gdpr: gdprConsent,
            coppa: coppa,
            ccpa: uspConsent,
            gpp: gpp || '',
            gppSid: gppSid || [],
            dsa: dsa // populated if exists
          },
          schain: schain,
          user: {
            eids: eids
          },
          prebidVersion: '$prebid.version$',
          usIfr: canSyncWithIframe
        },
        options: {
          contentType: 'text/plain'
        }
      };
    });

    return requests;
  },

  interpretResponse(serverResponse, bidRequest) {
    const bidResponses = [];
    try {
      const response = serverResponse.body;
      if (response) {
        if (response.data) {
          if (_internal.hasRtd()) {
            _internal.getAdagioNs().queue.push({
              action: 'ssp-data',
              ts: Date.now(),
              data: response.data
            });
          }
        }
        if (response.bids) {
          response.bids.forEach(bidObj => {
            const bidReq = bidRequest.data.adUnits.find(bid => bid.bidId === bidObj.requestId);

            if (bidReq) {
              // bidObj.meta is the `bidResponse.meta` object according to https://docs.prebid.org/dev-docs/bidder-adaptor.html#interpreting-the-response
              bidObj.meta = deepAccess(bidObj, 'meta', {});
              bidObj.meta.mediaType = bidObj.mediaType;
              bidObj.meta.advertiserDomains = (Array.isArray(bidObj.aDomain) && bidObj.aDomain.length) ? bidObj.aDomain : [];

              if (bidObj.mediaType === VIDEO) {
                const mediaTypeContext = deepAccess(bidReq, 'mediaTypes.video.context');
                // Adagio SSP returns a `vastXml` only. No `vastUrl` nor `videoCacheKey`.
                if (!bidObj.vastUrl && bidObj.vastXml) {
                  bidObj.vastUrl = 'data:text/xml;charset=utf-8;base64,' + window.btoa(bidObj.vastXml.replace(/\\"/g, '"'));
                }

                if (mediaTypeContext === OUTSTREAM) {
                  bidObj.outstreamRendererCode = deepAccess(bidReq, 'params.rendererCode', BB_RENDERER_DEFAULT)

                  if (deepAccess(bidReq, 'mediaTypes.video.skip')) {
                    const skipOffset = deepAccess(bidReq, 'mediaTypes.video.skipafter', 5) // default 5s.
                    bidObj.skipOffset = skipOffset
                  }

                  bidObj.renderer = OUTSTREAM_RENDERER.newRenderer(bidObj.adUnitCode, bidObj.outstreamRendererCode);
                }
              }

              if (bidObj.mediaType === NATIVE) {
                _parseNativeBidResponse(bidObj);
              }

              bidObj.site = bidReq.params.site;
              bidObj.placement = bidReq.params.placement;
              bidObj.pagetype = bidReq.params.pagetype;
              bidObj.category = bidReq.params.category;
            }
            bidResponses.push(bidObj);
          });
        }
      }
    } catch (err) {
      logError(err);
    }
    return bidResponses;
  },

  getUserSyncs(syncOptions, serverResponses) {
    if (!serverResponses.length || serverResponses[0].body === '' || !serverResponses[0].body.userSyncs) {
      return false;
    }

    const syncs = serverResponses[0].body.userSyncs.map(sync => ({
      type: sync.t === 'p' ? 'image' : 'iframe',
      url: sync.u
    }));

    return syncs;
  },
};

registerBidder(spec);
