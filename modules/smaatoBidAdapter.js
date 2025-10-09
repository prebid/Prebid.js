import { getDNT } from '../libraries/navigatorData/dnt.js';
import {deepAccess, deepSetValue, isEmpty, isNumber, logError, logInfo} from '../src/utils.js';
import {registerBidder} from '../src/adapters/bidderFactory.js';
import {config} from '../src/config.js';
import {ADPOD, BANNER, NATIVE, VIDEO} from '../src/mediaTypes.js';
import {NATIVE_IMAGE_TYPES} from '../src/constants.js';
import {getAdUnitSizes} from '../libraries/sizeUtils/sizeUtils.js';
import {fill} from '../libraries/appnexusUtils/anUtils.js';
import {chunk} from '../libraries/chunk/chunk.js';
import {ortbConverter} from '../libraries/ortbConverter/converter.js';

/**
 * @typedef {import('../src/adapters/bidderFactory.js').BidRequest} BidRequest
 * @typedef {import('../src/adapters/bidderFactory.js').Bid} Bid
 * @typedef {import('../src/adapters/bidderFactory.js').ServerResponse} ServerResponse
 * @typedef {import('../src/adapters/bidderFactory.js').SyncOptions} SyncOptions
 * @typedef {import('../src/adapters/bidderFactory.js').UserSync} UserSync
 */

const BIDDER_CODE = 'smaato';
const SMAATO_ENDPOINT = 'https://prebid.ad.smaato.net/oapi/prebid';
const SMAATO_CLIENT = 'prebid_js_$prebid.version$_3.3'
const TTL = 300;
const CURRENCY = 'USD';
const SUPPORTED_MEDIA_TYPES = [BANNER, VIDEO, NATIVE];
const IMAGE_SYNC_URL = 'https://s.ad.smaato.net/c/?adExInit=p'
const IFRAME_SYNC_URL = 'https://s.ad.smaato.net/i/?adExInit=p'

export const spec = {
  code: BIDDER_CODE,
  supportedMediaTypes: SUPPORTED_MEDIA_TYPES,
  gvlid: 82,

  /**
   * Determines whether the given bid request is valid.
   *
   * @param {BidRequest} bid The bid params to validate.
   * @return boolean True if this is a valid bid, and false otherwise.
   */
  isBidRequestValid: (bid) => {
    if (typeof bid.params !== 'object') {
      logError('[SMAATO] Missing params object');
      return false;
    }

    if (typeof bid.params.publisherId !== 'string') {
      logError('[SMAATO] Missing mandatory publisherId param');
      return false;
    }

    if (deepAccess(bid, 'mediaTypes.video.context') === ADPOD) {
      logInfo('[SMAATO] Verifying adpod bid request');

      if (typeof bid.params.adbreakId !== 'string') {
        logError('[SMAATO] Missing for adpod request mandatory adbreakId param');
        return false;
      }

      if (bid.params.adspaceId) {
        logError('[SMAATO] The adspaceId param is not allowed in an adpod bid request');
        return false;
      }
    } else {
      logInfo('[SMAATO] Verifying a non adpod bid request');

      if (typeof bid.params.adspaceId !== 'string') {
        logError('[SMAATO] Missing mandatory adspaceId param');
        return false;
      }

      if (bid.params.adbreakId) {
        logError('[SMAATO] The adbreakId param is only allowed in an adpod bid request');
        return false;
      }
    }

    logInfo('[SMAATO] Verification done, all good');
    return true;
  },

  buildRequests: (bidRequests, bidderRequest) => {
    logInfo('[SMAATO] Client version:', SMAATO_CLIENT);

    const requests = [];
    bidRequests.forEach(bid => {
      // separate requests per mediaType
      SUPPORTED_MEDIA_TYPES.forEach(mediaType => {
        if ((bid.mediaTypes && bid.mediaTypes[mediaType]) || (mediaType === NATIVE && bid.nativeOrtbRequest)) {
          const data = converter.toORTB({bidderRequest, bidRequests: [bid], context: {mediaType}});
          requests.push({
            method: 'POST',
            url: bid.params.endpoint || SMAATO_ENDPOINT,
            data: JSON.stringify(data),
            options: {
              withCredentials: true,
              crossOrigin: true},
            bidderRequest
          })
        }
      });
    });

    return requests;
  },
  /**
   * Unpack the response from the server into a list of bids.
   *
   * @param {ServerResponse} serverResponse A successful response from the server.
   * @param {BidRequest} bidRequest
   * @return {Bid[]} An array of bids which were nested inside the server.
   */
  interpretResponse: (serverResponse, bidRequest) => {
    // response is empty (HTTP 204)
    if (isEmpty(serverResponse.body)) {
      logInfo('[SMAATO] Empty response body HTTP 204, no bids');
      return []; // no bids
    }

    const serverResponseHeaders = serverResponse.headers;

    const smtExpires = serverResponseHeaders.get('X-SMT-Expires');
    logInfo('[SMAATO] Expires:', smtExpires);
    const ttlInSec = smtExpires ? Math.floor((smtExpires - Date.now()) / 1000) : 300;

    const response = serverResponse.body;
    logInfo('[SMAATO] OpenRTB Response:', response);

    const smtAdType = serverResponseHeaders.get('X-SMT-ADTYPE');
    const bids = [];
    response.seatbid.forEach(seatbid => {
      seatbid.bid.forEach(bid => {
        const resultingBid = {
          requestId: bid.impid,
          cpm: bid.price || 0,
          width: bid.w,
          height: bid.h,
          ttl: ttlInSec,
          creativeId: bid.crid,
          dealId: bid.dealid || null,
          netRevenue: deepAccess(bid, 'ext.net', true),
          currency: CURRENCY,
          meta: {
            advertiserDomains: bid.adomain,
            networkName: bid.bidderName,
            agencyId: seatbid.seat,
            ...(bid.ext?.dsa && {dsa: bid.ext.dsa})
          }
        };

        const videoContext = deepAccess(JSON.parse(bidRequest.data).imp[0], 'video.ext.context');
        if (videoContext === ADPOD) {
          resultingBid.vastXml = bid.adm;
          resultingBid.mediaType = VIDEO;
          if (config.getConfig('adpod.brandCategoryExclusion')) {
            resultingBid.meta.primaryCatId = bid.cat[0];
          }
          resultingBid.video = {
            context: ADPOD,
            durationSeconds: bid.ext.duration
          };
          bids.push(resultingBid);
        } else {
          switch (smtAdType) {
            case 'Img':
            case 'Richmedia':
              resultingBid.ad = createBannerAd(bid);
              resultingBid.mediaType = BANNER;
              bids.push(resultingBid);
              break;
            case 'Video':
              resultingBid.vastXml = bid.adm;
              resultingBid.mediaType = VIDEO;
              bids.push(resultingBid);
              break;
            case 'Native':
              resultingBid.native = createNativeAd(bid.adm);
              resultingBid.mediaType = NATIVE;
              bids.push(resultingBid);
              break;
            default:
              logInfo('[SMAATO] Invalid ad type:', smtAdType);
          }
        }
        resultingBid.meta.mediaType = resultingBid.mediaType;
      });
    });

    logInfo('[SMAATO] Prebid bids:', bids);
    return bids;
  },

  /**
   * Register the user sync pixels which should be dropped after the auction.
   *
   * @param {SyncOptions} syncOptions Which user syncs are allowed?
   * @param {ServerResponse[]} serverResponses List of server's responses.
   * @return {UserSync[]} The user syncs which should be dropped.
   */
  getUserSyncs: (syncOptions, serverResponses, gdprConsent, uspConsent) => {
    if (syncOptions) {
      let gdprParams = '';
      if (gdprConsent && gdprConsent.consentString) {
        if (typeof gdprConsent.gdprApplies === 'boolean') {
          gdprParams = `&gdpr=${Number(gdprConsent.gdprApplies)}&gdpr_consent=${gdprConsent.consentString}`;
        } else {
          gdprParams = `&gdpr_consent=${gdprConsent.consentString}`;
        }
      }

      if (syncOptions.iframeEnabled) {
        let maxUrlsParam = '';
        if (config.getConfig('userSync') && config.getConfig('userSync').syncsPerBidder) {
          maxUrlsParam = `&maxUrls=${config.getConfig('userSync').syncsPerBidder}`;
        }

        return [{
          type: 'iframe',
          url: IFRAME_SYNC_URL + gdprParams + maxUrlsParam
        }];
      } else if (syncOptions.pixelEnabled) {
        return [{
          type: 'image',
          url: IMAGE_SYNC_URL + gdprParams
        }];
      }
    }

    return [];
  }
}
registerBidder(spec);

const converter = ortbConverter({
  context: {
    netRevenue: true,
    ttl: TTL,
    currency: CURRENCY
  },
  request(buildRequest, imps, bidderRequest, context) {
    function isGdprApplicable() {
      return bidderRequest.gdprConsent && bidderRequest.gdprConsent.gdprApplies;
    }

    function setPublisherId(node) {
      deepSetValue(node, 'publisher.id', bidRequest.params.publisherId);
    }

    const request = buildRequest(imps, bidderRequest, context);
    const bidRequest = context.bidRequests[0];
    let content;
    const mediaType = context.mediaType;
    if (mediaType === VIDEO) {
      const videoParams = bidRequest.mediaTypes[VIDEO];
      if (videoParams.context === ADPOD) {
        request.imp = createAdPodImp(request.imp[0], videoParams);
        content = addOptionalAdpodParameters(videoParams);
      }
    }

    request.at = 1;

    if (request.user) {
      if (isGdprApplicable()) {
        deepSetValue(request.user, 'ext.consent', bidderRequest.gdprConsent.consentString);
      }
    } else {
      const eids = deepAccess(bidRequest, 'userIdAsEids');
      request.user = {
        ext: {
          consent: isGdprApplicable() ? bidderRequest.gdprConsent.consentString : null,
          eids: (eids && eids.length) ? eids : null
        }
      }
    }

    if (request.site) {
      request.site.id = window.location.hostname
      if (content) {
        request.site.content = content;
      }
      setPublisherId(request.site);
    } else if (request.dooh) {
      request.dooh.id = window.location.hostname
      if (content) {
        request.dooh.content = content;
      }
      setPublisherId(request.dooh);
    } else {
      request.site = {
        id: window.location.hostname,
        domain: bidderRequest.refererInfo.domain || window.location.hostname,
        page: bidderRequest.refererInfo.page || window.location.href,
        ref: bidderRequest.refererInfo.ref,
        content: content || null
      }
      setPublisherId(request.site);
    }

    if (request.regs) {
      if (isGdprApplicable()) {
        deepSetValue(request.regs, 'ext.gdpr', bidderRequest.gdprConsent.gdprApplies ? 1 : 0);
      }
      if (bidderRequest.uspConsent !== undefined) {
        deepSetValue(request.regs, 'ext.us_privacy', bidderRequest.uspConsent);
      }
      if (request.regs?.gpp) {
        deepSetValue(request.regs, 'ext.gpp', request.regs.gpp);
        deepSetValue(request.regs, 'ext.gpp_sid', request.regs.gpp_sid);
      }
    } else {
      request.regs = {
        coppa: config.getConfig('coppa') === true ? 1 : 0,
        ext: {
          gdpr: isGdprApplicable() ? bidderRequest.gdprConsent.gdprApplies ? 1 : 0 : null,
          us_privacy: bidderRequest.uspConsent
        }
      }
    }

    if (!request.device) {
      request.device = {
        language: (navigator && navigator.language) ? navigator.language.split('-')[0] : '',
        ua: navigator.userAgent,
        dnt: getDNT() ? 1 : 0,
        h: screen.height,
        w: screen.width
      }
    }
    if (bidRequest.params.app) {
      if (!deepAccess(request.device, 'geo')) {
        const geo = deepAccess(bidRequest, 'params.app.geo');
        deepSetValue(request.device, 'geo', geo);
      }
      if (!deepAccess(request.device, 'ifa')) {
        const ifa = deepAccess(bidRequest, 'params.app.ifa');
        deepSetValue(request.device, 'ifa', ifa);
      }
    }

    request.source = {
      ext: {
        schain: bidRequest?.ortb2?.source?.ext?.schain
      }
    };
    request.ext = {
      client: SMAATO_CLIENT
    }
    return request;
  },

  imp(buildImp, bidRequest, context) {
    const imp = buildImp(bidRequest, context);
    deepSetValue(imp, 'tagid', bidRequest.params.adbreakId || bidRequest.params.adspaceId);
    if (imp.bidfloorcur && imp.bidfloorcur !== CURRENCY) {
      delete imp.bidfloor;
      delete imp.bidfloorcur;
    }
    return imp;
  },

  overrides: {
    imp: {
      banner(orig, imp, bidRequest, context) {
        const mediaType = context.mediaType;

        if (mediaType === BANNER) {
          imp.bidfloor = getBidFloor(bidRequest, BANNER, getAdUnitSizes(bidRequest));
        }

        orig(imp, bidRequest, context);
      },

      video(orig, imp, bidRequest, context) {
        const mediaType = context.mediaType;
        if (mediaType === VIDEO) {
          const videoParams = bidRequest.mediaTypes[VIDEO];
          imp.bidfloor = getBidFloor(bidRequest, VIDEO, videoParams.playerSize);
          if (videoParams.context !== ADPOD) {
            deepSetValue(imp, 'video.ext', {
              rewarded: videoParams.ext && videoParams.ext.rewarded ? videoParams.ext.rewarded : 0
            })
          }
        }

        orig(imp, bidRequest, context);
      },

      native(orig, imp, bidRequest, context) {
        const mediaType = context.mediaType;

        if (mediaType === NATIVE) {
          imp.bidfloor = getBidFloor(bidRequest, NATIVE, getNativeMainImageSize(bidRequest.nativeOrtbRequest));
        }

        orig(imp, bidRequest, context);
      }
    },
  }
});

const createBannerAd = (bid) => {
  let clickEvent = '';
  if (bid.ext && bid.ext.curls) {
    let clicks = ''
    bid.ext.curls.forEach(src => {
      clicks += `fetch(decodeURIComponent('${encodeURIComponent(src)}'), {cache: 'no-cache'});`;
    })
    clickEvent = `onclick="${clicks}"`
  }

  return `<div style="cursor:pointer" ${clickEvent}>${bid.adm}</div>`;
};

const createNativeAd = (adm) => {
  const nativeResponse = JSON.parse(adm).native;
  return {
    ortb: nativeResponse
  }
};

function getNativeMainImageSize(nativeRequest) {
  const mainImage = ((nativeRequest.assets) || []).find(asset => asset.hasOwnProperty('img') && asset.img.type === NATIVE_IMAGE_TYPES.MAIN)
  if (mainImage) {
    if (isNumber(mainImage.img.w) && isNumber(mainImage.img.h)) {
      return [[mainImage.img.w, mainImage.img.h]]
    }
    if (isNumber(mainImage.img.wmin) && isNumber(mainImage.img.hmin)) {
      return [[mainImage.img.wmin, mainImage.img.hmin]]
    }
  }
  return []
}

function createAdPodImp(imp, videoMediaType) {
  const bce = config.getConfig('adpod.brandCategoryExclusion')
  imp.video.ext = {
    context: ADPOD,
    brandcategoryexclusion: bce !== undefined && bce
  };

  const numberOfPlacements = getAdPodNumberOfPlacements(videoMediaType)
  const imps = fill(imp, numberOfPlacements)

  const durationRangeSec = videoMediaType.durationRangeSec
  if (videoMediaType.requireExactDuration) {
    // equal distribution of numberOfPlacement over all available durations
    const divider = Math.ceil(numberOfPlacements / durationRangeSec.length)
    const chunked = chunk(imps, divider)

    // each configured duration is set as min/maxduration for a subset of requests
    durationRangeSec.forEach((duration, index) => {
      chunked[index].forEach(imp => {
        const sequence = index + 1;
        imp.video.minduration = duration
        imp.video.maxduration = duration
        imp.video.sequence = sequence
      });
    });
  } else {
    // all maxdurations should be the same
    const maxDuration = Math.max(...durationRangeSec);
    imps.forEach((imp, index) => {
      const sequence = index + 1;
      imp.video.maxduration = maxDuration
      imp.video.sequence = sequence
    });
  }

  return imps
}

function getAdPodNumberOfPlacements(videoMediaType) {
  const {adPodDurationSec, durationRangeSec, requireExactDuration} = videoMediaType
  const minAllowedDuration = Math.min(...durationRangeSec)
  const numberOfPlacements = Math.floor(adPodDurationSec / minAllowedDuration)

  return requireExactDuration
    ? Math.max(numberOfPlacements, durationRangeSec.length)
    : numberOfPlacements
}

const addOptionalAdpodParameters = (videoMediaType) => {
  const content = {}

  if (videoMediaType.tvSeriesName) {
    content.series = videoMediaType.tvSeriesName
  }
  if (videoMediaType.tvEpisodeName) {
    content.title = videoMediaType.tvEpisodeName
  }
  if (typeof videoMediaType.tvSeasonNumber === 'number') {
    content.season = videoMediaType.tvSeasonNumber.toString() // conversion to string as in OpenRTB season is a string
  }
  if (typeof videoMediaType.tvEpisodeNumber === 'number') {
    content.episode = videoMediaType.tvEpisodeNumber
  }
  if (typeof videoMediaType.contentLengthSec === 'number') {
    content.len = videoMediaType.contentLengthSec
  }
  if (videoMediaType.contentMode && ['live', 'on-demand'].indexOf(videoMediaType.contentMode) >= 0) {
    content.livestream = videoMediaType.contentMode === 'live' ? 1 : 0
  }

  if (!isEmpty(content)) {
    return content
  }
}

function getBidFloor(bidRequest, mediaType, sizes) {
  if (typeof bidRequest.getFloor === 'function') {
    const size = sizes.length === 1 ? sizes[0] : '*';
    const floor = bidRequest.getFloor({currency: CURRENCY, mediaType: mediaType, size: size});
    if (floor && !isNaN(floor.floor) && (floor.currency === CURRENCY)) {
      return floor.floor;
    }
  }
}
