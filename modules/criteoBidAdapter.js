import {loadExternalScript} from '../src/adloader.js';
import {registerBidder} from '../src/adapters/bidderFactory.js';
import {config} from '../src/config.js';
import {BANNER, NATIVE, VIDEO} from '../src/mediaTypes.js';
import * as utils from '../src/utils.js';
import find from 'core-js-pure/features/array/find.js';
import { verify } from 'criteo-direct-rsa-validate/build/verify.js';
import { getStorageManager } from '../src/storageManager.js';

const GVLID = 91;
export const ADAPTER_VERSION = 33;
const BIDDER_CODE = 'criteo';
const CDB_ENDPOINT = 'https://bidder.criteo.com/cdb';
const PROFILE_ID_INLINE = 207;
export const PROFILE_ID_PUBLISHERTAG = 185;
const storage = getStorageManager(GVLID);
const LOG_PREFIX = 'Criteo: ';

// Unminified source code can be found in: https://github.com/Prebid-org/prebid-js-external-js-criteo/blob/master/dist/prod.js
const PUBLISHER_TAG_URL = 'https://static.criteo.net/js/ld/publishertag.prebid.js';

const FAST_BID_PUBKEY_E = 65537;
const FAST_BID_PUBKEY_N = 'ztQYwCE5BU7T9CDM5he6rKoabstXRmkzx54zFPZkWbK530dwtLBDeaWBMxHBUT55CYyboR/EZ4efghPi3CoNGfGWezpjko9P6p2EwGArtHEeS4slhu/SpSIFMjG6fdrpRoNuIAMhq1Z+Pr/+HOd1pThFKeGFr2/NhtAg+TXAzaU=';

/** @type {BidderSpec} */
export const spec = {
  code: BIDDER_CODE,
  gvlid: GVLID,
  supportedMediaTypes: [ BANNER, VIDEO, NATIVE ],

  /**
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

    Object.assign(bidderRequest, {
      publisherExt: config.getConfig('fpd.context'),
      userExt: config.getConfig('fpd.user'),
      ceh: config.getConfig('criteo.ceh')
    });

    // If publisher tag not already loaded try to get it from fast bid
    if (!publisherTagAvailable()) {
      window.Criteo = window.Criteo || {};
      window.Criteo.usePrebidEvents = false;

      tryGetCriteoFastBid();

      // Reload the PublisherTag after the timeout to ensure FastBid is up-to-date and tracking done properly
      setTimeout(() => {
        loadExternalScript(PUBLISHER_TAG_URL, BIDDER_CODE);
      }, bidderRequest.timeout);
    }

    if (publisherTagAvailable()) {
      // eslint-disable-next-line no-undef
      const adapter = new Criteo.PubTag.Adapters.Prebid(PROFILE_ID_PUBLISHERTAG, ADAPTER_VERSION, bidRequests, bidderRequest, '$prebid.version$');
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
   * @return {Bid[]}
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

    if (body && body.slots && utils.isArray(body.slots)) {
      body.slots.forEach(slot => {
        const bidRequest = find(request.bidRequests, b => b.adUnitCode === slot.impid && (!b.params.zoneId || parseInt(b.params.zoneId) === slot.zoneid));
        const bidId = bidRequest.bidId;
        const bid = {
          requestId: bidId,
          adId: slot.bidId || utils.getUniqueIdentifierStr(),
          cpm: slot.cpm,
          currency: slot.currency,
          netRevenue: true,
          ttl: slot.ttl || 60,
          creativeId: bidId,
          width: slot.width,
          height: slot.height,
          dealId: slot.dealCode,
        };
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
        } else {
          bid.ad = slot.creative;
        }
        bids.push(bid);
      });
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
};

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
    referrer = bidderRequest.refererInfo.referer;
  }
  const queryString = utils.parseUrl(referrer).search;

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

  if (context.amp) {
    url += '&im=1';
  }
  if (context.debug) {
    url += '&debug=1';
  }
  if (context.noLog) {
    url += '&nolog=1';
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
  const request = {
    publisher: {
      url: context.url,
      ext: bidderRequest.publisherExt
    },
    slots: bidRequests.map(bidRequest => {
      networkId = bidRequest.params.networkId || networkId;
      const slot = {
        impid: bidRequest.adUnitCode,
        transactionid: bidRequest.transactionId,
        auctionId: bidRequest.auctionId,
      };
      if (bidRequest.params.zoneId) {
        slot.zoneid = bidRequest.params.zoneId;
      }
      if (bidRequest.fpd && bidRequest.fpd.context) {
        slot.ext = bidRequest.fpd.context;
      }
      if (bidRequest.params.ext) {
        slot.ext = Object.assign({}, slot.ext, bidRequest.params.ext);
      }
      if (bidRequest.params.publisherSubId) {
        slot.publishersubid = bidRequest.params.publisherSubId;
      }
      if (bidRequest.params.nativeCallback || utils.deepAccess(bidRequest, `mediaTypes.${NATIVE}`)) {
        slot.native = true;
        if (!checkNativeSendId(bidRequest)) {
          utils.logWarn(LOG_PREFIX + 'all native assets containing URL should be sent as placeholders with sendId(icon, image, clickUrl, displayUrl, privacyLink, privacyIcon)');
        }
        slot.sizes = parseSizes(retrieveBannerSizes(bidRequest), parseNativeSize);
      } else {
        slot.sizes = parseSizes(retrieveBannerSizes(bidRequest), parseSize);
      }
      if (hasVideoMediaType(bidRequest)) {
        const video = {
          playersizes: parseSizes(utils.deepAccess(bidRequest, 'mediaTypes.video.playerSize'), parseSize),
          mimes: bidRequest.mediaTypes.video.mimes,
          protocols: bidRequest.mediaTypes.video.protocols,
          maxduration: bidRequest.mediaTypes.video.maxduration,
          api: bidRequest.mediaTypes.video.api
        };

        video.skip = bidRequest.params.video.skip;
        video.placement = bidRequest.params.video.placement;
        video.minduration = bidRequest.params.video.minduration;
        video.playbackmethod = bidRequest.params.video.playbackmethod;
        video.startdelay = bidRequest.params.video.startdelay;

        slot.video = video;
      }
      return slot;
    }),
  };
  if (networkId) {
    request.publisher.networkid = networkId;
  }
  request.user = {
    ext: bidderRequest.userExt
  };
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
  return request;
}

function retrieveBannerSizes(bidRequest) {
  return utils.deepAccess(bidRequest, 'mediaTypes.banner.sizes') || bidRequest.sizes;
}

function parseSizes(sizes, parser) {
  if (Array.isArray(sizes[0])) { // is there several sizes ? (ie. [[728,90],[200,300]])
    return sizes.map(size => parser(size));
  }
  return [parser(sizes)]; // or a single one ? (ie. [728,90])
}

function parseSize(size) {
  return size[0] + 'x' + size[1];
}

function parseNativeSize(size) {
  if (size[0] === undefined && size[1] === undefined) {
    return '2x2';
  }
  return size[0] + 'x' + size[1];
}

function hasVideoMediaType(bidRequest) {
  if (utils.deepAccess(bidRequest, 'params.video') === undefined) {
    return false;
  }
  return utils.deepAccess(bidRequest, 'mediaTypes.video') !== undefined;
}

function hasValidVideoMediaType(bidRequest) {
  let isValid = true;

  var requiredMediaTypesParams = ['mimes', 'playerSize', 'maxduration', 'protocols', 'api'];

  requiredMediaTypesParams.forEach(function(param) {
    if (utils.deepAccess(bidRequest, 'mediaTypes.video.' + param) === undefined) {
      isValid = false;
      utils.logError('Criteo Bid Adapter: mediaTypes.video.' + param + ' is required');
    }
  });

  var requiredParams = ['skip', 'placement', 'playbackmethod'];

  requiredParams.forEach(function(param) {
    if (utils.deepAccess(bidRequest, 'params.video.' + param) === undefined) {
      isValid = false;
      utils.logError('Criteo Bid Adapter: params.video.' + param + ' is required');
    }
  });

  if (isValid) {
    // We do not support long form for now, also we have to check that context & placement are consistent
    if (bidRequest.mediaTypes.video.context == 'instream' && bidRequest.params.video.placement === 1) {
      return true;
    } else if (bidRequest.mediaTypes.video.context == 'outstream' && bidRequest.params.video.placement !== 1) {
      return true;
    }
  }

  return false;
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

export function tryGetCriteoFastBid() {
  try {
    const fastBidStorageKey = 'criteo_fast_bid';
    const hashPrefix = '// Hash: ';
    const fastBidFromStorage = storage.getDataFromLocalStorage(fastBidStorageKey);

    if (fastBidFromStorage !== null) {
      // The value stored must contain the file's encrypted hash as first line
      const firstLineEndPosition = fastBidFromStorage.indexOf('\n');
      const firstLine = fastBidFromStorage.substr(0, firstLineEndPosition).trim();

      if (firstLine.substr(0, hashPrefix.length) !== hashPrefix) {
        utils.logWarn('No hash found in FastBid');
        storage.removeDataFromLocalStorage(fastBidStorageKey);
      } else {
        // Remove the hash part from the locally stored value
        const publisherTagHash = firstLine.substr(hashPrefix.length);
        const publisherTag = fastBidFromStorage.substr(firstLineEndPosition + 1);

        if (verify(publisherTag, publisherTagHash, FAST_BID_PUBKEY_N, FAST_BID_PUBKEY_E)) {
          utils.logInfo('Using Criteo FastBid');
          eval(publisherTag); // eslint-disable-line no-eval
        } else {
          utils.logWarn('Invalid Criteo FastBid found');
          storage.removeDataFromLocalStorage(fastBidStorageKey);
        }
      }
    }
  } catch (e) {
    // Unable to get fast bid
  }
}

registerBidder(spec);
