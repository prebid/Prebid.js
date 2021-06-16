import * as utils from '../src/utils.js';
import { registerBidder } from '../src/adapters/bidderFactory.js';
import { config } from '../src/config.js';
import { ADPOD, BANNER, VIDEO } from '../src/mediaTypes.js';

const BIDDER_CODE = 'smaato';
const SMAATO_ENDPOINT = 'https://prebid.ad.smaato.net/oapi/prebid';
const SMAATO_CLIENT = 'prebid_js_$prebid.version$_1.2'

const buildOpenRtbBidRequest = (bidRequest, bidderRequest) => {
  const request = {
    id: bidderRequest.auctionId,
    at: 1,
    imp: [{
      id: bidRequest.bidId,
      tagid: utils.deepAccess(bidRequest, 'params.adspaceId')
    }],
    cur: ['USD'],
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

  if (utils.deepAccess(bidRequest, 'mediaTypes.banner')) {
    const sizes = utils.getAdUnitSizes(bidRequest).map((size) => ({w: size[0], h: size[1]}));
    request.imp[0].banner = {
      w: sizes[0].w,
      h: sizes[0].h,
      format: sizes
    }
  }

  const videoMediaType = utils.deepAccess(bidRequest, 'mediaTypes.video');
  if (videoMediaType) {
    if (videoMediaType.context === ADPOD) {
      request.imp[0].tagid = utils.deepAccess(bidRequest, 'params.adbreakId')
      request.imp[0].video = createVideoImpObjectFromRequiredAdpodParameters(videoMediaType);
      addOptionalAdpodParameters(request, videoMediaType);
    } else {
      request.imp[0].video = {
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
    }
  }

  let ortb2 = config.getConfig('ortb2') || {};
  Object.assign(request.user, ortb2.user);
  Object.assign(request.site, ortb2.site);

  if (bidderRequest.gdprConsent && bidderRequest.gdprConsent.gdprApplies === true) {
    utils.deepSetValue(request, 'regs.ext.gdpr', bidderRequest.gdprConsent.gdprApplies ? 1 : 0);
    utils.deepSetValue(request, 'user.ext.consent', bidderRequest.gdprConsent.consentString);
  }

  if (bidderRequest.uspConsent !== undefined) {
    utils.deepSetValue(request, 'regs.ext.us_privacy', bidderRequest.uspConsent);
  }

  if (utils.deepAccess(bidRequest, 'params.app')) {
    const geo = utils.deepAccess(bidRequest, 'params.app.geo');
    utils.deepSetValue(request, 'device.geo', geo);
    const ifa = utils.deepAccess(bidRequest, 'params.app.ifa')
    utils.deepSetValue(request, 'device.ifa', ifa);
  }

  const eids = utils.deepAccess(bidRequest, 'userIdAsEids');
  if (eids && eids.length) {
    utils.deepSetValue(request, 'user.ext.eids', eids);
  }

  return request
}

export const spec = {
  code: BIDDER_CODE,
  supportedMediaTypes: [BANNER, VIDEO, ADPOD],

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
      const openRtbBidRequest = buildOpenRtbBidRequest(validBidRequest, bidderRequest);
      utils.logInfo('[SMAATO] OpenRTB Request:', openRtbBidRequest);

      return {
        method: 'POST',
        url: validBidRequest.params.endpoint || SMAATO_ENDPOINT,
        data: JSON.stringify(openRtbBidRequest),
        options: {
          withCredentials: true,
          crossOrigin: true,
        }
      };
    });
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

const createVideoImpObjectFromRequiredAdpodParameters = (videoMediaType) => {
  const bce = config.getConfig('adpod.brandCategoryExclusion')

  return {
    w: videoMediaType.playerSize[0][0],
    h: videoMediaType.playerSize[0][1],
    ext: {
      context: ADPOD,
      adpodduration: videoMediaType.adPodDurationSec,
      durationrange: videoMediaType.durationRangeSec,
      brandcategoryexclusion: bce !== undefined && bce
    }
  }
}

const addOptionalAdpodParameters = (request, video) => {
  if (typeof video.requireExactDuration === 'boolean') {
    request.imp[0].video.ext.requireexactduration = video.requireExactDuration;
  }

  const content = {};

  if (video.tvSeriesName) {
    content.series = video.tvSeriesName;
  }
  if (video.tvEpisodeName) {
    content.title = video.tvEpisodeName;
  }
  if (typeof video.tvSeasonNumber === "number") {
    content.season = video.tvSeasonNumber.toString(); // conversion to string as in OpenRTB season is a string
  }
  if (typeof video.tvEpisodeNumber === "number") {
    content.episode = video.tvEpisodeNumber;
  }
  if (typeof video.contentLengthSec === "number") {
    content.len = video.contentLengthSec;
  }
  if (video.contentMode && ['live', 'on-demand'].includes(video.contentMode)) {
    content.livestream = video.contentMode === 'live' ? 1 : 0;
  }

  if (!utils.isEmpty(content)) {
    request.site.content = content;
  }
}
