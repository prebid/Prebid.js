import { cleanObj, deepAccess, getDNT, deepSetValue, logInfo, logError, isEmpty, getAdUnitSizes, fill, chunk, getMaxValueFromArray, getMinValueFromArray } from '../src/utils.js';
import {registerBidder} from '../src/adapters/bidderFactory.js';
import {config} from '../src/config.js';
import {ADPOD, BANNER, VIDEO, NATIVE} from '../src/mediaTypes.js';

const BIDDER_CODE = 'smaato';
const SMAATO_ENDPOINT = 'https://prebid.ad.smaato.net/oapi/prebid';
const SMAATO_CLIENT = 'prebid_js_$prebid.version$_1.7'
const CURRENCY = 'USD';

const NATIVE_DATA = {
  ASSET_TYPES: {
    TITLE: 'title',
    IMG: 'img',
    DATA: 'data',
  },
  ASSETS: {
    title: {id: 0, assetType: 'title'},

    image: {id: 4, assetType: 'img', type: 3, name: 'image'},
    icon: {id: 2, assetType: 'img', type: 2, name: 'icon'},

    sponsoredBy: {id: 1, assetType: 'data', type: 1, name: 'sponsoredBy'},
    body: {id: 3, assetType: 'data', type: 2, name: 'body'},
    rating: {id: 5, assetType: 'data', type: 3, name: 'rating'},
    likes: {id: 6, assetType: 'data', type: 4, name: 'likes'},
    downloads: {id: 7, assetType: 'data', type: 5, name: 'downloads'},
    price: {id: 8, assetType: 'data', type: 6, name: 'price'},
    salePrice: {id: 9, assetType: 'data', type: 7, name: 'salePrice'},
    phone: {id: 10, assetType: 'data', type: 8, name: 'phone'},
    address: {id: 11, assetType: 'data', type: 9, name: 'address'},
    body2: {id: 12, assetType: 'data', type: 10, name: 'body2'},
    displayUrl: {id: 13, assetType: 'data', type: 11, name: 'displayUrl'},
    cta: {id: 14, assetType: 'data', type: 12, name: 'cta'},
  },
  getAssetById(id) {
    return Object.values(this.ASSETS).find(asset => id === asset.id);
  }
};

const buildOpenRtbBidRequest = (bidRequest, bidderRequest) => {
  const requestTemplate = {
    id: bidderRequest.auctionId,
    at: 1,
    cur: [CURRENCY],
    tmax: bidderRequest.timeout,
    site: {
      id: window.location.hostname,
      // TODO: do the fallbacks make sense here?
      domain: bidderRequest.refererInfo.domain || window.location.hostname,
      page: bidderRequest.refererInfo.page || window.location.href,
      ref: bidderRequest.refererInfo.ref
    },
    device: {
      language: (navigator && navigator.language) ? navigator.language.split('-')[0] : '',
      ua: navigator.userAgent,
      dnt: getDNT() ? 1 : 0,
      h: screen.height,
      w: screen.width
    },
    regs: {
      coppa: config.getConfig('coppa') === true ? 1 : 0,
      ext: {}
    },
    user: {
      ext: {}
    },
    source: {
      ext: {
        schain: bidRequest.schain
      }
    },
    ext: {
      client: SMAATO_CLIENT
    }
  };

  let ortb2 = bidderRequest.ortb2 || {};
  Object.assign(requestTemplate.user, ortb2.user);
  Object.assign(requestTemplate.site, ortb2.site);

  deepSetValue(requestTemplate, 'site.publisher.id', deepAccess(bidRequest, 'params.publisherId'));

  if (bidderRequest.gdprConsent && bidderRequest.gdprConsent.gdprApplies === true) {
    deepSetValue(requestTemplate, 'regs.ext.gdpr', bidderRequest.gdprConsent.gdprApplies ? 1 : 0);
    deepSetValue(requestTemplate, 'user.ext.consent', bidderRequest.gdprConsent.consentString);
  }

  if (bidderRequest.uspConsent !== undefined) {
    deepSetValue(requestTemplate, 'regs.ext.us_privacy', bidderRequest.uspConsent);
  }

  if (deepAccess(bidRequest, 'params.app')) {
    const geo = deepAccess(bidRequest, 'params.app.geo');
    deepSetValue(requestTemplate, 'device.geo', geo);
    const ifa = deepAccess(bidRequest, 'params.app.ifa');
    deepSetValue(requestTemplate, 'device.ifa', ifa);
  }

  const eids = deepAccess(bidRequest, 'userIdAsEids');
  if (eids && eids.length) {
    deepSetValue(requestTemplate, 'user.ext.eids', eids);
  }

  let requests = [];

  if (deepAccess(bidRequest, 'mediaTypes.banner')) {
    const bannerRequest = Object.assign({}, requestTemplate, createBannerImp(bidRequest));
    requests.push(bannerRequest);
  }

  const videoMediaType = deepAccess(bidRequest, 'mediaTypes.video');
  if (videoMediaType) {
    if (videoMediaType.context === ADPOD) {
      const adPodRequest = Object.assign({}, requestTemplate, createAdPodImp(bidRequest, videoMediaType));
      addOptionalAdpodParameters(adPodRequest, videoMediaType);
      requests.push(adPodRequest);
    } else {
      const videoRequest = Object.assign({}, requestTemplate, createVideoImp(bidRequest, videoMediaType));
      requests.push(videoRequest);
    }
  }

  const nativeMediaType = deepAccess(bidRequest, 'mediaTypes.native');
  if (nativeMediaType) {
    const nativeRequest = Object.assign({}, requestTemplate, createNativeImp(bidRequest, nativeMediaType));
    requests.push(nativeRequest);
  }

  return requests;
}

const buildServerRequest = (validBidRequest, data) => {
  logInfo('[SMAATO] OpenRTB Request:', data);
  return {
    method: 'POST',
    url: validBidRequest.params.endpoint || SMAATO_ENDPOINT,
    data: JSON.stringify(data),
    options: {
      withCredentials: true,
      crossOrigin: true,
    }
  };
}

export const spec = {
  code: BIDDER_CODE,
  supportedMediaTypes: [BANNER, VIDEO, NATIVE],
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

  buildRequests: (validBidRequests, bidderRequest) => {
    logInfo('[SMAATO] Client version:', SMAATO_CLIENT);

    return validBidRequests.map((validBidRequest) => {
      const openRtbBidRequests = buildOpenRtbBidRequest(validBidRequest, bidderRequest);
      return openRtbBidRequests.map((openRtbBidRequest) => buildServerRequest(validBidRequest, openRtbBidRequest));
    }).reduce((acc, item) => item != null && acc.concat(item), []);
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
        let resultingBid = {
          requestId: bid.impid,
          cpm: bid.price || 0,
          width: bid.w,
          height: bid.h,
          ttl: ttlInSec,
          creativeId: bid.crid,
          dealId: bid.dealid || null,
          netRevenue: deepAccess(bid, 'ext.net', true),
          currency: response.cur,
          meta: {
            advertiserDomains: bid.adomain,
            networkName: bid.bidderName,
            agencyId: seatbid.seat
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
              resultingBid.ad = createImgAd(bid.adm);
              resultingBid.mediaType = BANNER;
              bids.push(resultingBid);
              break;
            case 'Richmedia':
              resultingBid.ad = createRichmediaAd(bid.adm);
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
    return [];
  }
}
registerBidder(spec);

const createImgAd = (adm) => {
  const image = JSON.parse(adm).image;

  let clickEvent = '';
  image.clicktrackers.forEach(src => {
    clickEvent += `fetch(decodeURIComponent('${encodeURIComponent(src)}'), {cache: 'no-cache'});`;
  })

  let markup = `<div style="cursor:pointer" onclick="${clickEvent};window.open(decodeURIComponent('${encodeURIComponent(image.img.ctaurl)}'));"><img src="${image.img.url}" width="${image.img.w}" height="${image.img.h}"/>`;

  image.impressiontrackers.forEach(src => {
    markup += `<img src="${src}" alt="" width="0" height="0"/>`;
  });

  return markup + '</div>';
};

const createRichmediaAd = (adm) => {
  const rich = JSON.parse(adm).richmedia;
  let clickEvent = '';
  rich.clicktrackers.forEach(src => {
    clickEvent += `fetch(decodeURIComponent('${encodeURIComponent(src)}'), {cache: 'no-cache'});`;
  })

  let markup = `<div onclick="${clickEvent}">${rich.mediadata.content}`;

  rich.impressiontrackers.forEach(src => {
    markup += `<img src="${src}" alt="" width="0" height="0"/>`;
  });

  return markup + '</div>';
};

const createNativeAd = (adm) => {
  const nativeResponse = JSON.parse(adm).native;
  const nativeAd = {
    clickUrl: deepAccess(nativeResponse, 'link.url'),
    clickTrackers: deepAccess(nativeResponse, 'link.clicktrackers'),
    privacyLink: nativeResponse.privacy,
    impressionTrackers: [],
  }

  nativeResponse.eventtrackers.forEach(tracker => {
    if (tracker.event !== 1) return;
    switch (tracker.method) {
      case 1: // img
        nativeAd.impressionTrackers.push(tracker.url);
        break;
      case 2: // js
        nativeAd.javascriptTrackers = `<script src=\"${tracker.url}\"></script>`;
        break;
    }
  });

  nativeResponse.assets.map(asset => {
    const assetParams = NATIVE_DATA.getAssetById(asset.id);
    switch (assetParams.assetType) {
      case NATIVE_DATA.ASSET_TYPES.TITLE:
        nativeAd.title = asset.title.text;
        break;
      case NATIVE_DATA.ASSET_TYPES.DATA:
        nativeAd[assetParams.name] = asset.data.value;
        break;
      case NATIVE_DATA.ASSET_TYPES.IMG:
        nativeAd[assetParams.name] = {
          url: asset.img.url,
          width: asset.img.w,
          height: asset.img.h,
        };
        break;
    }
  });
  return nativeAd;
};

function createBannerImp(bidRequest) {
  const adUnitSizes = getAdUnitSizes(bidRequest);
  const sizes = adUnitSizes.map((size) => ({w: size[0], h: size[1]}));
  return {
    imp: [{
      id: bidRequest.bidId,
      tagid: deepAccess(bidRequest, 'params.adspaceId'),
      bidfloor: getBidFloor(bidRequest, BANNER, adUnitSizes),
      instl: deepAccess(bidRequest.ortb2Imp, 'instl'),
      banner: {
        w: sizes[0].w,
        h: sizes[0].h,
        format: sizes
      }
    }]
  };
}

function createVideoImp(bidRequest, videoMediaType) {
  return {
    imp: [{
      id: bidRequest.bidId,
      tagid: deepAccess(bidRequest, 'params.adspaceId'),
      bidfloor: getBidFloor(bidRequest, VIDEO, videoMediaType.playerSize),
      instl: deepAccess(bidRequest.ortb2Imp, 'instl'),
      video: {
        mimes: videoMediaType.mimes,
        minduration: videoMediaType.minduration,
        startdelay: videoMediaType.startdelay,
        linearity: videoMediaType.linearity,
        w: videoMediaType.playerSize[0][0],
        h: videoMediaType.playerSize[0][1],
        maxduration: videoMediaType.maxduration,
        skip: videoMediaType.skip,
        protocols: videoMediaType.protocols,
        ext: {
          rewarded: videoMediaType.ext && videoMediaType.ext.rewarded ? videoMediaType.ext.rewarded : 0
        },
        skipmin: videoMediaType.skipmin,
        api: videoMediaType.api
      }
    }]
  };
}

function createNativeImp(bidRequest, nativeMediaType) {
  const mainImageSize = nativeMediaType.image.sizes
  const assets = []

  for (const nativeAssetName of Object.keys(nativeMediaType)) {
    const assetFromParams = NATIVE_DATA.ASSETS[nativeAssetName];
    if (assetFromParams) {
      const assetParams = nativeMediaType[nativeAssetName];
      const asset = {
        id: assetFromParams.id,
        required: Number(assetParams.required),
      };
      switch (assetFromParams.assetType) {
        case NATIVE_DATA.ASSET_TYPES.TITLE:
          asset.title = {len: assetParams.len}
          break;
        case NATIVE_DATA.ASSET_TYPES.DATA:
          asset.data = cleanObj({type: assetFromParams.type, len: assetParams.len})
          break;
        case NATIVE_DATA.ASSET_TYPES.IMG:
          asset.img = cleanObj({
            type: assetFromParams.type,
            w: deepAccess(assetParams, 'sizes.0'),
            h: deepAccess(assetParams, 'sizes.1'),
            wmin: deepAccess(assetParams, 'aspect_ratios.0.min_width'),
            hmin: deepAccess(assetParams, 'aspect_ratios.0.min_height')
          });
          break;
        default:
          return;
      }
      assets.push(asset);
    }
  }

  return {
    imp: [{
      id: bidRequest.bidId,
      tagid: deepAccess(bidRequest, 'params.adspaceId'),
      bidfloor: getBidFloor(bidRequest, NATIVE, mainImageSize),
      native: {
        ver: '1.2',
        privacy: nativeMediaType.privacyLink ? 1 : 0,
        assets: assets
      }
    }]
  };
}

function createAdPodImp(bidRequest, videoMediaType) {
  const tagid = deepAccess(bidRequest, 'params.adbreakId')
  const bce = config.getConfig('adpod.brandCategoryExclusion')
  let imp = {
    id: bidRequest.bidId,
    tagid: tagid,
    bidfloor: getBidFloor(bidRequest, VIDEO, videoMediaType.playerSize),
    instl: deepAccess(bidRequest.ortb2Imp, 'instl'),
    video: {
      w: videoMediaType.playerSize[0][0],
      h: videoMediaType.playerSize[0][1],
      mimes: videoMediaType.mimes,
      startdelay: videoMediaType.startdelay,
      linearity: videoMediaType.linearity,
      skip: videoMediaType.skip,
      protocols: videoMediaType.protocols,
      skipmin: videoMediaType.skipmin,
      api: videoMediaType.api,
      ext: {
        context: ADPOD,
        brandcategoryexclusion: bce !== undefined && bce
      }
    }
  }

  const numberOfPlacements = getAdPodNumberOfPlacements(videoMediaType)
  let imps = fill(imp, numberOfPlacements)

  const durationRangeSec = videoMediaType.durationRangeSec
  if (videoMediaType.requireExactDuration) {
    // equal distribution of numberOfPlacement over all available durations
    const divider = Math.ceil(numberOfPlacements / durationRangeSec.length)
    const chunked = chunk(imps, divider)

    // each configured duration is set as min/maxduration for a subset of requests
    durationRangeSec.forEach((duration, index) => {
      chunked[index].map(imp => {
        const sequence = index + 1;
        imp.video.minduration = duration
        imp.video.maxduration = duration
        imp.video.sequence = sequence
      });
    });
  } else {
    // all maxdurations should be the same
    const maxDuration = getMaxValueFromArray(durationRangeSec);
    imps.map((imp, index) => {
      const sequence = index + 1;
      imp.video.maxduration = maxDuration
      imp.video.sequence = sequence
    });
  }

  return {
    imp: imps
  }
}

function getAdPodNumberOfPlacements(videoMediaType) {
  const {adPodDurationSec, durationRangeSec, requireExactDuration} = videoMediaType
  const minAllowedDuration = getMinValueFromArray(durationRangeSec)
  const numberOfPlacements = Math.floor(adPodDurationSec / minAllowedDuration)

  return requireExactDuration
    ? Math.max(numberOfPlacements, durationRangeSec.length)
    : numberOfPlacements
}

const addOptionalAdpodParameters = (request, videoMediaType) => {
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
    request.site.content = content
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
