import { deepAccess, generateUUID, isArray, logError, logInfo, logWarn, parseUrl } from '../src/utils.js';
import { loadExternalScript } from '../src/adloader.js';
import { registerBidder } from '../src/adapters/bidderFactory.js';
import { config } from '../src/config.js';
import { BANNER, NATIVE, VIDEO } from '../src/mediaTypes.js';
import { verify } from 'criteo-direct-rsa-validate/build/verify.js'; // ref#2
import { getStorageManager } from '../src/storageManager.js';
import { getRefererInfo } from '../src/refererDetection.js';
import { hasPurpose1Consent } from '../src/utils/gpdr.js';
import { Renderer } from '../src/Renderer.js';
import { OUTSTREAM } from '../src/video.js';
import { ajax } from '../src/ajax.js';

/**
 * @typedef {import('../src/adapters/bidderFactory.js').BidRequest} BidRequest
 * @typedef {import('../src/adapters/bidderFactory.js').Bid} Bid
 * @typedef {import('../src/adapters/bidderFactory.js').ServerRequest} ServerRequest
 * @typedef {import('../src/adapters/bidderFactory.js').BidderSpec} BidderSpec
 * @typedef {import('../src/adapters/bidderFactory.js').TimedOutBid} TimedOutBid
 */

const GVLID = 91;
export const ADAPTER_VERSION = 36;
const BIDDER_CODE = 'criteo';
const CDB_ENDPOINT = 'https://bidder.criteo.com/cdb';
const PROFILE_ID_INLINE = 207;
export const PROFILE_ID_PUBLISHERTAG = 185;
export const storage = getStorageManager({ bidderCode: BIDDER_CODE });
const LOG_PREFIX = 'Criteo: ';

/*
  If you don't want to use the FastBid adapter feature, you can lighten criteoBidAdapter size by :
  1. commenting the tryGetCriteoFastBid function inner content (see ref#1)
  2. removing the line 'verify' function import line (see ref#2)

  Unminified source code can be found in the privately shared repo: https://github.com/Prebid-org/prebid-js-external-js-criteo/blob/master/dist/prod.js
*/
const FAST_BID_VERSION_PLACEHOLDER = '%FAST_BID_VERSION%';
export const FAST_BID_VERSION_CURRENT = 144;
const FAST_BID_VERSION_LATEST = 'latest';
const FAST_BID_VERSION_NONE = 'none';
const PUBLISHER_TAG_URL_TEMPLATE = 'https://static.criteo.net/js/ld/publishertag.prebid' + FAST_BID_VERSION_PLACEHOLDER + '.js';
const PUBLISHER_TAG_OUTSTREAM_SRC = 'https://static.criteo.net/js/ld/publishertag.renderer.js'
const FAST_BID_PUBKEY_E = 65537;
const FAST_BID_PUBKEY_N = 'ztQYwCE5BU7T9CDM5he6rKoabstXRmkzx54zFPZkWbK530dwtLBDeaWBMxHBUT55CYyboR/EZ4efghPi3CoNGfGWezpjko9P6p2EwGArtHEeS4slhu/SpSIFMjG6fdrpRoNuIAMhq1Z+Pr/+HOd1pThFKeGFr2/NhtAg+TXAzaU=';

const OPTOUT_COOKIE_NAME = 'cto_optout';
const BUNDLE_COOKIE_NAME = 'cto_bundle';
const GUID_RETENTION_TIME_HOUR = 24 * 30 * 13; // 13 months
const OPTOUT_RETENTION_TIME_HOUR = 5 * 12 * 30 * 24; // 5 years

/** @type {BidderSpec} */
export const spec = {
  code: BIDDER_CODE,
  gvlid: GVLID,
  supportedMediaTypes: [BANNER, VIDEO, NATIVE],

  getUserSyncs: function (syncOptions, _, gdprConsent, uspConsent, gppConsent = {}) {
    let { gppString = '', applicableSections = [] } = gppConsent;

    if (syncOptions.iframeEnabled && hasPurpose1Consent(gdprConsent)) {
      const fastBidVersion = config.getConfig('criteo.fastBidVersion');
      if (canFastBid(fastBidVersion)) {
        return [];
      }

      const refererInfo = getRefererInfo();
      const origin = 'criteoPrebidAdapter';

      const queryParams = [];
      queryParams.push(`origin=${origin}`);
      queryParams.push(`topUrl=${refererInfo.domain}`);
      if (gdprConsent) {
        if (gdprConsent.gdprApplies) {
          queryParams.push(`gdpr=${gdprConsent.gdprApplies == true ? 1 : 0}`);
        }
        if (gdprConsent.consentString) {
          queryParams.push(`gdpr_consent=${gdprConsent.consentString}`);
        }
      }
      if (uspConsent) {
        queryParams.push(`us_privacy=${uspConsent}`);
      }
      queryParams.push(`gpp=${gppString}`);
      if (Array.isArray(applicableSections)) {
        for (const applicableSection of applicableSections) {
          queryParams.push(`gpp_sid=${applicableSection}`);
        }
      }

      const requestId = Math.random().toString();

      const jsonHash = {
        bundle: readFromAllStorages(BUNDLE_COOKIE_NAME),
        cw: storage.cookiesAreEnabled(),
        lsw: storage.localStorageIsEnabled(),
        optoutCookie: readFromAllStorages(OPTOUT_COOKIE_NAME),
        origin: origin,
        requestId: requestId,
        tld: refererInfo.domain,
        topUrl: refererInfo.domain,
        version: '$prebid.version$'.replace(/\./g, '_'),
      };

      window.addEventListener('message', function handler(event) {
        if (!event.data || event.origin != 'https://gum.criteo.com') {
          return;
        }

        if (event.data.requestId !== requestId) {
          return;
        }

        this.removeEventListener('message', handler);

        event.stopImmediatePropagation();

        const response = event.data;

        if (response.optout) {
          deleteFromAllStorages(BUNDLE_COOKIE_NAME);

          saveOnAllStorages(OPTOUT_COOKIE_NAME, true, OPTOUT_RETENTION_TIME_HOUR);
        } else {
          if (response.bundle) {
            saveOnAllStorages(BUNDLE_COOKIE_NAME, response.bundle, GUID_RETENTION_TIME_HOUR);
          }
        }
      }, true);

      const jsonHashSerialized = JSON.stringify(jsonHash).replace(/"/g, '%22');

      return [{
        type: 'iframe',
        url: `https://gum.criteo.com/syncframe?${queryParams.join('&')}#${jsonHashSerialized}`
      }];
    } else if (syncOptions.pixelEnabled && hasPurpose1Consent(gdprConsent)) {
      const queryParams = [];
      queryParams.push(`profile=207`);
      if (gdprConsent) {
        if (gdprConsent.gdprApplies === true) {
          queryParams.push(`gdprapplies=true`);
        }
        if (gdprConsent.consentString) {
          queryParams.push(`gdpr=${gdprConsent.consentString}`);
        }
      }
      if (uspConsent) {
        queryParams.push(`ccpa=${uspConsent}`);
      }
      queryParams.push(`gpp=${gppString}`);
      if (Array.isArray(applicableSections)) {
        for (const applicableSection of applicableSections) {
          queryParams.push(`gpp_sid=${applicableSection}`);
        }
      }
      // gpp
      // gpp_sid
      return [{
        type: 'image',
        url: `https://ssp-sync.criteo.com/user-sync/redirect?${queryParams.join('&')}`
      }];
    }
    return [];
  },

  /**
   * f
   * @param {object} bid
   * @return {boolean}
   */
  isBidRequestValid: (bid) => {
    // either one of zoneId or networkId should be set
    if (!(bid && bid.params && (bid.params.zoneId || bid.params.networkId))) {
      return false;
    }

    // video media types requires some mandatory params
    if (hasVideoMediaType(bid)) {
      if (!hasValidVideoMediaType(bid)) {
        return false;
      }
    }

    return true;
  },

  /**
   * @param {BidRequest[]} bidRequests
   * @param {*} bidderRequest
   * @return {ServerRequest}
   */
  buildRequests: (bidRequests, bidderRequest) => {
    let url;
    let data;
    let fpd = bidderRequest.ortb2 || {};

    Object.assign(bidderRequest, {
      publisherExt: fpd.site?.ext,
      userExt: fpd.user?.ext,
      ceh: config.getConfig('criteo.ceh'),
      coppa: config.getConfig('coppa')
    });

    // If publisher tag not already loaded try to get it from fast bid
    const fastBidVersion = config.getConfig('criteo.fastBidVersion');
    const canLoadPublisherTag = canFastBid(fastBidVersion);
    if (!publisherTagAvailable() && canLoadPublisherTag) {
      window.Criteo = window.Criteo || {};
      window.Criteo.usePrebidEvents = false;

      tryGetCriteoFastBid();

      const fastBidUrl = getFastBidUrl(fastBidVersion);
      // Reload the PublisherTag after the timeout to ensure FastBid is up-to-date and tracking done properly
      setTimeout(() => {
        loadExternalScript(fastBidUrl, BIDDER_CODE);
      }, bidderRequest.timeout);
    }

    if (publisherTagAvailable()) {
      // eslint-disable-next-line no-undef
      const adapter = new Criteo.PubTag.Adapters.Prebid(
        PROFILE_ID_PUBLISHERTAG,
        ADAPTER_VERSION,
        bidRequests,
        bidderRequest,
        '$prebid.version$',
        { createOutstreamVideoRenderer: createOutstreamVideoRenderer }
      );
      url = adapter.buildCdbUrl();
      data = adapter.buildCdbRequest();
    } else {
      const context = buildContext(bidRequests, bidderRequest);
      url = buildCdbUrl(context);
      data = buildCdbRequest(context, bidRequests, bidderRequest);
    }

    if (data) {
      return { method: 'POST', url, data, bidRequests };
    }
  },

  /**
   * @param {*} response
   * @param {ServerRequest} request
   * @return {Bid[] | {bids: Bid[], fledgeAuctionConfigs: object[]}}
   */
  interpretResponse: (response, request) => {
    const body = response.body || response;

    if (publisherTagAvailable()) {
      // eslint-disable-next-line no-undef
      const adapter = Criteo.PubTag.Adapters.Prebid.GetAdapter(request);
      if (adapter) {
        return adapter.interpretResponse(body, request);
      }
    }

    const bids = [];
    const fledgeAuctionConfigs = [];

    if (body && body.slots && isArray(body.slots)) {
      body.slots.forEach(slot => {
        const bidRequest = getAssociatedBidRequest(request.bidRequests, slot);
        if (bidRequest) {
          const bidId = bidRequest.bidId;
          const bid = {
            requestId: bidId,
            cpm: slot.cpm,
            currency: slot.currency,
            netRevenue: true,
            ttl: slot.ttl || 60,
            creativeId: slot.creativecode,
            width: slot.width,
            height: slot.height,
            dealId: slot.deal,
          };
          if (body.ext?.paf?.transmission && slot.ext?.paf?.content_id) {
            const pafResponseMeta = {
              content_id: slot.ext.paf.content_id,
              transmission: response.ext.paf.transmission
            };
            bid.meta = Object.assign({}, bid.meta, { paf: pafResponseMeta });
          }
          if (slot.adomain) {
            bid.meta = Object.assign({}, bid.meta, { advertiserDomains: [slot.adomain].flat() });
          }
          if (slot.ext?.meta?.networkName) {
            bid.meta = Object.assign({}, bid.meta, { networkName: slot.ext.meta.networkName })
          }
          if (slot.ext?.dsa) {
            bid.meta = Object.assign({}, bid.meta, { dsa: slot.ext.dsa })
          }
          if (slot.native) {
            if (bidRequest.params.nativeCallback) {
              bid.ad = createNativeAd(bidId, slot.native, bidRequest.params.nativeCallback);
            } else {
              bid.native = createPrebidNativeAd(slot.native);
              bid.mediaType = NATIVE;
            }
          } else if (slot.video) {
            bid.vastUrl = slot.displayurl;
            bid.mediaType = VIDEO;
            const context = deepAccess(bidRequest, 'mediaTypes.video.context');
            // if outstream video, add a default render for it.
            if (context === OUTSTREAM) {
              bid.renderer = createOutstreamVideoRenderer(slot);
            }
          } else {
            bid.ad = slot.creative;
          }
          bids.push(bid);
        }
      });
    }

    if (isArray(body.ext?.igi)) {
      body.ext.igi.forEach((igi) => {
        if (isArray(igi?.igs)) {
          igi.igs.forEach((igs) => {
            fledgeAuctionConfigs.push(igs);
          });
        }
      });
    }

    if (fledgeAuctionConfigs.length) {
      return {
        bids,
        fledgeAuctionConfigs,
      };
    }

    return bids;
  },
  /**
   * @param {TimedOutBid} timeoutData
   */
  onTimeout: (timeoutData) => {
    if (publisherTagAvailable() && Array.isArray(timeoutData)) {
      var auctionsIds = [];
      timeoutData.forEach((bid) => {
        if (auctionsIds.indexOf(bid.auctionId) === -1) {
          auctionsIds.push(bid.auctionId);
          // eslint-disable-next-line no-undef
          const adapter = Criteo.PubTag.Adapters.Prebid.GetAdapter(bid.auctionId);
          adapter.handleBidTimeout();
        }
      });
    }
  },

  /**
   * @param {Bid} bid
   */
  onBidWon: (bid) => {
    if (publisherTagAvailable() && bid) {
      // eslint-disable-next-line no-undef
      const adapter = Criteo.PubTag.Adapters.Prebid.GetAdapter(bid.auctionId);
      adapter.handleBidWon(bid);
    }
  },

  /**
   * @param {Bid} bid
   */
  onSetTargeting: (bid) => {
    if (publisherTagAvailable()) {
      // eslint-disable-next-line no-undef
      const adapter = Criteo.PubTag.Adapters.Prebid.GetAdapter(bid.auctionId);
      adapter.handleSetTargeting(bid);
    }
  },

  /**
   * @param {BidRequest[]} bidRequests
   */
  onDataDeletionRequest: (bidRequests) => {
    const id = readFromAllStorages(BUNDLE_COOKIE_NAME);
    if (id) {
      deleteFromAllStorages(BUNDLE_COOKIE_NAME);
      ajax('https://privacy.criteo.com/api/privacy/datadeletionrequest',
        null,
        JSON.stringify({ publisherUserId: id }),
        {
          contentType: 'application/json',
          method: 'POST'
        });
    }
  }
};

function readFromAllStorages(name) {
  const fromCookie = storage.getCookie(name);
  const fromLocalStorage = storage.getDataFromLocalStorage(name);

  return fromCookie || fromLocalStorage || undefined;
}

function saveOnAllStorages(name, value, expirationTimeHours) {
  const date = new Date();
  date.setTime(date.getTime() + (expirationTimeHours * 60 * 60 * 1000));
  const expires = `expires=${date.toUTCString()}`;

  storage.setCookie(name, value, expires);
  storage.setDataInLocalStorage(name, value);
}

function deleteFromAllStorages(name) {
  storage.setCookie(name, '', 0);
  storage.removeDataFromLocalStorage(name);
}

/**
 * @return {boolean}
 */
function publisherTagAvailable() {
  // eslint-disable-next-line no-undef
  return typeof Criteo !== 'undefined' && Criteo.PubTag && Criteo.PubTag.Adapters && Criteo.PubTag.Adapters.Prebid;
}

/**
 * @param {BidRequest[]} bidRequests
 * @param bidderRequest
 */
function buildContext(bidRequests, bidderRequest) {
  let referrer = '';
  if (bidderRequest && bidderRequest.refererInfo) {
    referrer = bidderRequest.refererInfo.page;
  }
  const queryString = parseUrl(bidderRequest?.refererInfo?.topmostLocation).search;

  const context = {
    url: referrer,
    debug: queryString['pbt_debug'] === '1',
    noLog: queryString['pbt_nolog'] === '1',
    amp: false,
  };

  bidRequests.forEach(bidRequest => {
    if (bidRequest.params.integrationMode === 'amp') {
      context.amp = true;
    }
  });

  return context;
}

/**
 * @param {CriteoContext} context
 * @return {string}
 */
function buildCdbUrl(context) {
  let url = CDB_ENDPOINT;
  url += '?profileId=' + PROFILE_ID_INLINE;
  url += '&av=' + String(ADAPTER_VERSION);
  url += '&wv=' + encodeURIComponent('$prebid.version$');
  url += '&cb=' + String(Math.floor(Math.random() * 99999999999));

  if (storage.localStorageIsEnabled()) {
    url += '&lsavail=1';
  } else {
    url += '&lsavail=0';
  }

  if (context.amp) {
    url += '&im=1';
  }
  if (context.debug) {
    url += '&debug=1';
  }
  if (context.noLog) {
    url += '&nolog=1';
  }

  const bundle = readFromAllStorages(BUNDLE_COOKIE_NAME);
  if (bundle) {
    url += `&bundle=${bundle}`;
  }

  const optout = readFromAllStorages(OPTOUT_COOKIE_NAME);
  if (optout) {
    url += `&optout=1`;
  }

  return url;
}

function checkNativeSendId(bidRequest) {
  return !(bidRequest.nativeParams &&
    (
      (bidRequest.nativeParams.image && ((bidRequest.nativeParams.image.sendId !== true || bidRequest.nativeParams.image.sendTargetingKeys === true))) ||
      (bidRequest.nativeParams.icon && ((bidRequest.nativeParams.icon.sendId !== true || bidRequest.nativeParams.icon.sendTargetingKeys === true))) ||
      (bidRequest.nativeParams.clickUrl && ((bidRequest.nativeParams.clickUrl.sendId !== true || bidRequest.nativeParams.clickUrl.sendTargetingKeys === true))) ||
      (bidRequest.nativeParams.displayUrl && ((bidRequest.nativeParams.displayUrl.sendId !== true || bidRequest.nativeParams.displayUrl.sendTargetingKeys === true))) ||
      (bidRequest.nativeParams.privacyLink && ((bidRequest.nativeParams.privacyLink.sendId !== true || bidRequest.nativeParams.privacyLink.sendTargetingKeys === true))) ||
      (bidRequest.nativeParams.privacyIcon && ((bidRequest.nativeParams.privacyIcon.sendId !== true || bidRequest.nativeParams.privacyIcon.sendTargetingKeys === true)))
    ));
}

/**
 * @param {CriteoContext} context
 * @param {BidRequest[]} bidRequests
 * @param bidderRequest
 * @return {*}
 */
function buildCdbRequest(context, bidRequests, bidderRequest) {
  let networkId;
  let pubid;
  let schain;
  let userIdAsEids;
  let regs = Object.assign({}, {
    coppa: bidderRequest.coppa === true ? 1 : (bidderRequest.coppa === false ? 0 : undefined)
  }, bidderRequest.ortb2?.regs);
  const request = {
    id: generateUUID(),
    publisher: {
      url: context.url,
      ext: bidderRequest.publisherExt,
    },
    regs: regs,
    slots: bidRequests.map(bidRequest => {
      if (!userIdAsEids) {
        userIdAsEids = bidRequest.userIdAsEids;
      }
      networkId = bidRequest.params.networkId || networkId;
      pubid = bidRequest.params.pubid || pubid;
      schain = bidRequest.schain || schain;
      const slot = {
        slotid: bidRequest.bidId,
        impid: bidRequest.adUnitCode,
        transactionid: bidRequest.ortb2Imp?.ext?.tid
      };
      if (bidRequest.params.zoneId) {
        slot.zoneid = bidRequest.params.zoneId;
      }
      if (deepAccess(bidRequest, 'ortb2Imp.ext')) {
        slot.ext = bidRequest.ortb2Imp.ext;
      }

      if (deepAccess(bidRequest, 'ortb2Imp.rwdd')) {
        slot.rwdd = bidRequest.ortb2Imp.rwdd;
      }

      if (bidRequest.params.ext) {
        slot.ext = Object.assign({}, slot.ext, bidRequest.params.ext);
      }
      if (bidRequest.nativeOrtbRequest?.assets) {
        slot.ext = Object.assign({}, slot.ext, { assets: bidRequest.nativeOrtbRequest.assets });
      }
      if (bidRequest.params.uid) {
        slot.ext = Object.assign({}, slot.ext, { bidder: { uid: bidRequest.params.uid } });
      }

      if (bidRequest.params.publisherSubId) {
        slot.publishersubid = bidRequest.params.publisherSubId;
      }

      if (bidRequest.params.nativeCallback || hasNativeMediaType(bidRequest)) {
        slot.native = true;
        if (!checkNativeSendId(bidRequest)) {
          logWarn(LOG_PREFIX + 'all native assets containing URL should be sent as placeholders with sendId(icon, image, clickUrl, displayUrl, privacyLink, privacyIcon)');
        }
      }

      if (hasBannerMediaType(bidRequest)) {
        slot.sizes = parseSizes(deepAccess(bidRequest, 'mediaTypes.banner.sizes'), parseSize);
      } else {
        slot.sizes = [];
      }

      if (hasVideoMediaType(bidRequest)) {
        const video = {
          context: bidRequest.mediaTypes.video.context,
          playersizes: parseSizes(deepAccess(bidRequest, 'mediaTypes.video.playerSize'), parseSize),
          mimes: bidRequest.mediaTypes.video.mimes,
          protocols: bidRequest.mediaTypes.video.protocols,
          maxduration: bidRequest.mediaTypes.video.maxduration,
          api: bidRequest.mediaTypes.video.api,
          skip: bidRequest.mediaTypes.video.skip,
          placement: bidRequest.mediaTypes.video.placement,
          minduration: bidRequest.mediaTypes.video.minduration,
          playbackmethod: bidRequest.mediaTypes.video.playbackmethod,
          startdelay: bidRequest.mediaTypes.video.startdelay,
          plcmt: bidRequest.mediaTypes.video.plcmt,
          w: bidRequest.mediaTypes.video.w,
          h: bidRequest.mediaTypes.video.h,
          linearity: bidRequest.mediaTypes.video.linearity,
          skipmin: bidRequest.mediaTypes.video.skipmin,
          skipafter: bidRequest.mediaTypes.video.skipafter,
          minbitrate: bidRequest.mediaTypes.video.minbitrate,
          maxbitrate: bidRequest.mediaTypes.video.maxbitrate,
          delivery: bidRequest.mediaTypes.video.delivery,
          pos: bidRequest.mediaTypes.video.pos,
          playbackend: bidRequest.mediaTypes.video.playbackend,
          adPodDurationSec: bidRequest.mediaTypes.video.adPodDurationSec,
          durationRangeSec: bidRequest.mediaTypes.video.durationRangeSec,
        };
        const paramsVideo = bidRequest.params.video;
        if (paramsVideo !== undefined) {
          video.skip = video.skip || paramsVideo.skip || 0;
          video.placement = video.placement || paramsVideo.placement;
          video.minduration = video.minduration || paramsVideo.minduration;
          video.playbackmethod = video.playbackmethod || paramsVideo.playbackmethod;
          video.startdelay = video.startdelay || paramsVideo.startdelay || 0;
        }

        slot.video = video;
      }

      enrichSlotWithFloors(slot, bidRequest);

      if (!bidderRequest.fledgeEnabled && slot.ext?.ae) {
        delete slot.ext.ae;
      }

      return slot;
    }),
  };
  if (networkId) {
    request.publisher.networkid = networkId;
  }

  request.source = {
    tid: bidderRequest.ortb2?.source?.tid
  };

  if (schain) {
    request.source.ext = {
      schain: schain
    };
  };
  request.user = bidderRequest.ortb2?.user || {};
  request.site = bidderRequest.ortb2?.site || {};
  request.app = bidderRequest.ortb2?.app || {};

  if (pubid) {
    request.site.publisher = {...request.site.publisher, ...{ id: pubid }};
    request.app.publisher = {...request.app.publisher, ...{ id: pubid }};
  }

  request.device = bidderRequest.ortb2?.device || {};
  if (bidderRequest && bidderRequest.ceh) {
    request.user.ceh = bidderRequest.ceh;
  }
  if (bidderRequest && bidderRequest.gdprConsent) {
    request.gdprConsent = {};
    if (typeof bidderRequest.gdprConsent.gdprApplies !== 'undefined') {
      request.gdprConsent.gdprApplies = !!(bidderRequest.gdprConsent.gdprApplies);
    }
    request.gdprConsent.version = bidderRequest.gdprConsent.apiVersion;
    if (typeof bidderRequest.gdprConsent.consentString !== 'undefined') {
      request.gdprConsent.consentData = bidderRequest.gdprConsent.consentString;
    }
  }
  if (bidderRequest && bidderRequest.uspConsent) {
    request.user.uspIab = bidderRequest.uspConsent;
  }
  if (bidderRequest && bidderRequest.ortb2?.device?.sua) {
    request.user.ext = request.user.ext || {};
    request.user.ext.sua = bidderRequest.ortb2?.device?.sua || {};
  }
  if (userIdAsEids) {
    request.user.ext = request.user.ext || {};
    request.user.ext.eids = [...userIdAsEids];
  }
  if (bidderRequest && bidderRequest.ortb2?.bcat) {
    request.bcat = bidderRequest.ortb2.bcat;
  }
  if (bidderRequest && bidderRequest.ortb2?.badv) {
    request.badv = bidderRequest.ortb2.badv;
  }
  if (bidderRequest && bidderRequest.ortb2?.bapp) {
    request.bapp = bidderRequest.ortb2.bapp;
  }
  request.tmax = bidderRequest.timeout;
  return request;
}

function parseSizes(sizes, parser = s => s) {
  if (sizes == undefined) {
    return [];
  }
  if (Array.isArray(sizes[0])) { // is there several sizes ? (ie. [[728,90],[200,300]])
    return sizes.map(size => parser(size));
  }
  return [parser(sizes)]; // or a single one ? (ie. [728,90])
}

function parseSize(size) {
  return size[0] + 'x' + size[1];
}

function hasVideoMediaType(bidRequest) {
  return deepAccess(bidRequest, 'mediaTypes.video') !== undefined;
}

function hasBannerMediaType(bidRequest) {
  return deepAccess(bidRequest, 'mediaTypes.banner') !== undefined;
}

function hasNativeMediaType(bidRequest) {
  return deepAccess(bidRequest, 'mediaTypes.native') !== undefined;
}

function hasValidVideoMediaType(bidRequest) {
  let isValid = true;

  var requiredMediaTypesParams = ['mimes', 'playerSize', 'maxduration', 'protocols', 'api', 'skip', 'placement', 'playbackmethod'];

  requiredMediaTypesParams.forEach(function (param) {
    if (deepAccess(bidRequest, 'mediaTypes.video.' + param) === undefined && deepAccess(bidRequest, 'params.video.' + param) === undefined) {
      isValid = false;
      logError('Criteo Bid Adapter: mediaTypes.video.' + param + ' is required');
    }
  });

  return isValid;
}

/**
 * Create prebid compatible native ad with native payload
 * @param {*} payload
 * @returns prebid native ad assets
 */
function createPrebidNativeAd(payload) {
  return {
    sendTargetingKeys: false, // no key is added to KV by default
    title: payload.products[0].title,
    body: payload.products[0].description,
    sponsoredBy: payload.advertiser.description,
    icon: payload.advertiser.logo,
    image: payload.products[0].image,
    clickUrl: payload.products[0].click_url,
    privacyLink: payload.privacy.optout_click_url,
    privacyIcon: payload.privacy.optout_image_url,
    cta: payload.products[0].call_to_action,
    price: payload.products[0].price,
    impressionTrackers: payload.impression_pixels.map(pix => pix.url)
  };
}

/**
 * @param {string} id
 * @param {*} payload
 * @param {*} callback
 * @return {string}
 */
function createNativeAd(id, payload, callback) {
  // Store the callback and payload in a global object to be later accessed from the creative
  var slotsName = 'criteo_prebid_native_slots';
  window[slotsName] = window[slotsName] || {};
  window[slotsName][id] = { callback, payload };

  // The creative is in an iframe so we have to get the callback and payload
  // from the parent window (doesn't work with safeframes)
  return `
<script type="text/javascript">
for (var i = 0; i < 10; ++i) {
 var slots = window.parent.${slotsName};
  if(!slots){continue;}
  var responseSlot = slots["${id}"];
  responseSlot.callback(responseSlot.payload);
  break;
}
</script>`;
}

function pickAvailableGetFloorFunc(bidRequest) {
  if (bidRequest.getFloor) {
    return bidRequest.getFloor;
  }
  if (bidRequest.params.bidFloor && bidRequest.params.bidFloorCur) {
    try {
      const floor = parseFloat(bidRequest.params.bidFloor);
      return () => {
        return {
          currency: bidRequest.params.bidFloorCur,
          floor: floor
        };
      };
    } catch { }
  }
  return undefined;
}

function enrichSlotWithFloors(slot, bidRequest) {
  try {
    const slotFloors = {};

    const getFloor = pickAvailableGetFloorFunc(bidRequest);

    if (getFloor) {
      if (bidRequest.mediaTypes?.banner) {
        slotFloors.banner = {};
        const bannerSizes = parseSizes(deepAccess(bidRequest, 'mediaTypes.banner.sizes'))
        bannerSizes.forEach(bannerSize => slotFloors.banner[parseSize(bannerSize).toString()] = getFloor.call(bidRequest, { size: bannerSize, mediaType: BANNER }));
      }

      if (bidRequest.mediaTypes?.video) {
        slotFloors.video = {};
        const videoSizes = parseSizes(deepAccess(bidRequest, 'mediaTypes.video.playerSize'))
        videoSizes.forEach(videoSize => slotFloors.video[parseSize(videoSize).toString()] = getFloor.call(bidRequest, { size: videoSize, mediaType: VIDEO }));
      }

      if (bidRequest.mediaTypes?.native) {
        slotFloors.native = {};
        slotFloors.native['*'] = getFloor.call(bidRequest, { size: '*', mediaType: NATIVE });
      }

      if (Object.keys(slotFloors).length > 0) {
        if (!slot.ext) {
          slot.ext = {}
        }
        Object.assign(slot.ext, {
          floors: slotFloors
        });
      }
    }
  } catch (e) {
    logError('Could not parse floors from Prebid: ' + e);
  }
}

export function canFastBid(fastBidVersion) {
  return fastBidVersion !== FAST_BID_VERSION_NONE;
}

export function getFastBidUrl(fastBidVersion) {
  let version;
  if (fastBidVersion === FAST_BID_VERSION_LATEST) {
    version = '';
  } else if (fastBidVersion) {
    let majorVersion = String(fastBidVersion).split('.')[0];
    if (majorVersion < 102) {
      logWarn('Specifying a Fastbid version which is not supporting version selection.')
    }
    version = '.' + fastBidVersion;
  } else {
    version = '.' + FAST_BID_VERSION_CURRENT;
  }

  return PUBLISHER_TAG_URL_TEMPLATE.replace(FAST_BID_VERSION_PLACEHOLDER, version);
}

function createOutstreamVideoRenderer(slot) {
  if (slot.ext.videoPlayerConfig === undefined || slot.ext.videoPlayerType === undefined) {
    return undefined;
  }

  const config = {
    documentResolver: (bid, sourceDocument, renderDocument) => {
      return renderDocument ?? sourceDocument;
    }
  }

  const render = (bid, renderDocument) => {
    let payload = {
      slotid: slot.impid,
      vastUrl: slot.displayurl,
      vastXml: slot.creative,
      documentContext: renderDocument,
    };

    let outstreamConfig = slot.ext.videoPlayerConfig;

    window.CriteoOutStream[slot.ext.videoPlayerType].play(payload, outstreamConfig)
  };

  const renderer = Renderer.install({ url: PUBLISHER_TAG_OUTSTREAM_SRC, config: config });
  renderer.setRender(render);
  return renderer;
}

function getAssociatedBidRequest(bidRequests, slot) {
  for (const request of bidRequests) {
    if (request.adUnitCode === slot.impid) {
      if (request.params.zoneId && parseInt(request.params.zoneId) === slot.zoneid) {
        return request;
      } else if (slot.native) {
        if (request.mediaTypes?.native || request.nativeParams) {
          return request;
        }
      } else if (slot.video) {
        if (request.mediaTypes?.video) {
          return request;
        }
      } else if (request.mediaTypes?.banner || request.sizes) {
        return request;
      }
    }
  }
  return undefined;
}

export function tryGetCriteoFastBid() {
  // begin ref#1
  try {
    const fastBidStorageKey = 'criteo_fast_bid';
    const hashPrefix = '// Hash: ';
    const fastBidFromStorage = storage.getDataFromLocalStorage(fastBidStorageKey);

    if (fastBidFromStorage !== null) {
      // The value stored must contain the file's encrypted hash as first line
      const firstLineEndPosition = fastBidFromStorage.indexOf('\n');
      const firstLine = fastBidFromStorage.substr(0, firstLineEndPosition).trim();

      if (firstLine.substr(0, hashPrefix.length) !== hashPrefix) {
        logWarn('No hash found in FastBid');
        storage.removeDataFromLocalStorage(fastBidStorageKey);
      } else {
        // Remove the hash part from the locally stored value
        const publisherTagHash = firstLine.substr(hashPrefix.length);
        const publisherTag = fastBidFromStorage.substr(firstLineEndPosition + 1);

        if (verify(publisherTag, publisherTagHash, FAST_BID_PUBKEY_N, FAST_BID_PUBKEY_E)) {
          logInfo('Using Criteo FastBid');
          eval(publisherTag); // eslint-disable-line no-eval
        } else {
          logWarn('Invalid Criteo FastBid found');
          storage.removeDataFromLocalStorage(fastBidStorageKey);
        }
      }
    }
  } catch (e) {
    // Unable to get fast bid
  }
  // end ref#1
}

registerBidder(spec);
