import * as utils from '../src/utils.js';
import {registerBidder} from '../src/adapters/bidderFactory.js';
import {config} from '../src/config.js';
import {ADPOD, BANNER, VIDEO} from '../src/mediaTypes.js';

const BIDDER_CODE = 'smaato';
const SMAATO_ENDPOINT = 'https://prebid.ad.smaato.net/oapi/prebid';
const SMAATO_CLIENT = 'prebid_js_$prebid.version$_1.4'
const CURRENCY = 'USD';

const buildOpenRtbBidRequest = (bidRequest, bidderRequest) => {
  const requestTemplate = {
    id: bidderRequest.auctionId,
    at: 1,
    cur: [CURRENCY],
    tmax: bidderRequest.timeout,
    site: {
      id: window.location.hostname,
      publisher: {
        id: utils.deepAccess(bidRequest, 'params.publisherId')
      },
      domain: window.location.hostname,
      page: window.location.href,
      ref: bidderRequest.refererInfo.referer
    },
    device: {
      language: (navigator && navigator.language) ? navigator.language.split('-')[0] : '',
      ua: navigator.userAgent,
      dnt: utils.getDNT() ? 1 : 0,
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
    ext: {
      client: SMAATO_CLIENT
    }
  };

  let ortb2 = config.getConfig('ortb2') || {};
  Object.assign(requestTemplate.user, ortb2.user);
  Object.assign(requestTemplate.site, ortb2.site);

  if (bidderRequest.gdprConsent && bidderRequest.gdprConsent.gdprApplies === true) {
    utils.deepSetValue(requestTemplate, 'regs.ext.gdpr', bidderRequest.gdprConsent.gdprApplies ? 1 : 0);
    utils.deepSetValue(requestTemplate, 'user.ext.consent', bidderRequest.gdprConsent.consentString);
  }

  if (bidderRequest.uspConsent !== undefined) {
    utils.deepSetValue(requestTemplate, 'regs.ext.us_privacy', bidderRequest.uspConsent);
  }

  if (utils.deepAccess(bidRequest, 'params.app')) {
    const geo = utils.deepAccess(bidRequest, 'params.app.geo');
    utils.deepSetValue(requestTemplate, 'device.geo', geo);
    const ifa = utils.deepAccess(bidRequest, 'params.app.ifa')
    utils.deepSetValue(requestTemplate, 'device.ifa', ifa);
  }

  const eids = utils.deepAccess(bidRequest, 'userIdAsEids');
  if (eids && eids.length) {
    utils.deepSetValue(requestTemplate, 'user.ext.eids', eids);
  }

  let requests = [];

  if (utils.deepAccess(bidRequest, 'mediaTypes.banner')) {
    const bannerRequest = Object.assign({}, requestTemplate, createBannerImp(bidRequest));
    requests.push(bannerRequest);
  }

  const videoMediaType = utils.deepAccess(bidRequest, 'mediaTypes.video');
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

  return requests;
}

const buildServerRequest = (validBidRequest, data) => {
  utils.logInfo('[SMAATO] OpenRTB Request:', data);
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
  supportedMediaTypes: [BANNER, VIDEO],

  /**
   * Determines whether or not the given bid request is valid.
   *
   * @param {BidRequest} bid The bid params to validate.
   * @return boolean True if this is a valid bid, and false otherwise.
   */
  isBidRequestValid: (bid) => {
    if (typeof bid.params !== 'object') {
      utils.logError('[SMAATO] Missing params object');
      return false;
    }

    if (typeof bid.params.publisherId !== 'string') {
      utils.logError('[SMAATO] Missing mandatory publisherId param');
      return false;
    }

    if (utils.deepAccess(bid, 'mediaTypes.video.context') === ADPOD) {
      utils.logInfo('[SMAATO] Verifying adpod bid request');

      if (typeof bid.params.adbreakId !== 'string') {
        utils.logError('[SMAATO] Missing for adpod request mandatory adbreakId param');
        return false;
      }

      if (bid.params.adspaceId) {
        utils.logError('[SMAATO] The adspaceId param is not allowed in an adpod bid request');
        return false;
      }
    } else {
      utils.logInfo('[SMAATO] Verifying a non adpod bid request');

      if (typeof bid.params.adspaceId !== 'string') {
        utils.logError('[SMAATO] Missing mandatory adspaceId param');
        return false;
      }

      if (bid.params.adbreakId) {
        utils.logError('[SMAATO] The adbreakId param is only allowed in an adpod bid request');
        return false;
      }
    }

    utils.logInfo('[SMAATO] Verification done, all good');
    return true;
  },

  buildRequests: (validBidRequests, bidderRequest) => {
    utils.logInfo('[SMAATO] Client version:', SMAATO_CLIENT);

    return validBidRequests.map((validBidRequest) => {
      const openRtbBidRequests = buildOpenRtbBidRequest(validBidRequest, bidderRequest);
      return openRtbBidRequests.map((openRtbBidRequest) => buildServerRequest(validBidRequest, openRtbBidRequest));
    }).reduce((acc, item) => item != null && acc.concat(item), []);
  },
  /**
   * Unpack the response from the server into a list of bids.
   *
   * @param {ServerResponse} serverResponse A successful response from the server.
   * @return {Bid[]} An array of bids which were nested inside the server.
   */
  interpretResponse: (serverResponse, bidRequest) => {
    // response is empty (HTTP 204)
    if (utils.isEmpty(serverResponse.body)) {
      utils.logInfo('[SMAATO] Empty response body HTTP 204, no bids');
      return []; // no bids
    }

    const serverResponseHeaders = serverResponse.headers;

    const smtExpires = serverResponseHeaders.get('X-SMT-Expires');
    utils.logInfo('[SMAATO] Expires:', smtExpires);
    const ttlInSec = smtExpires ? Math.floor((smtExpires - Date.now()) / 1000) : 300;

    const response = serverResponse.body;
    utils.logInfo('[SMAATO] OpenRTB Response:', response);

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
          netRevenue: utils.deepAccess(bid, 'ext.net', true),
          currency: response.cur,
          meta: {
            advertiserDomains: bid.adomain,
            networkName: bid.bidderName,
            agencyId: seatbid.seat
          }
        };

        const videoContext = utils.deepAccess(JSON.parse(bidRequest.data).imp[0], 'video.ext.context')
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
            default:
              utils.logInfo('[SMAATO] Invalid ad type:', smtAdType);
          }
        }
        resultingBid.meta.mediaType = resultingBid.mediaType;
      });
    });

    utils.logInfo('[SMAATO] Prebid bids:', bids);
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

function createBannerImp(bidRequest) {
  const adUnitSizes = utils.getAdUnitSizes(bidRequest);
  const sizes = adUnitSizes.map((size) => ({w: size[0], h: size[1]}));
  return {
    imp: [{
      id: bidRequest.bidId,
      tagid: utils.deepAccess(bidRequest, 'params.adspaceId'),
      bidfloor: getBidFloor(bidRequest, BANNER, adUnitSizes),
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
      tagid: utils.deepAccess(bidRequest, 'params.adspaceId'),
      bidfloor: getBidFloor(bidRequest, VIDEO, videoMediaType.playerSize),
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

function createAdPodImp(bidRequest, videoMediaType) {
  const tagid = utils.deepAccess(bidRequest, 'params.adbreakId')
  const bce = config.getConfig('adpod.brandCategoryExclusion')
  let imp = {
    id: bidRequest.bidId,
    tagid: tagid,
    bidfloor: getBidFloor(bidRequest, VIDEO, videoMediaType.playerSize),
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
  let imps = utils.fill(imp, numberOfPlacements)

  const durationRangeSec = videoMediaType.durationRangeSec
  if (videoMediaType.requireExactDuration) {
    // equal distribution of numberOfPlacement over all available durations
    const divider = Math.ceil(numberOfPlacements / durationRangeSec.length)
    const chunked = utils.chunk(imps, divider)

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
    const maxDuration = utils.getMaxValueFromArray(durationRangeSec);
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
  const minAllowedDuration = utils.getMinValueFromArray(durationRangeSec)
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

  if (!utils.isEmpty(content)) {
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
