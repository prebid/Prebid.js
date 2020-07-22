import * as utils from '../src/utils.js';
import { registerBidder } from '../src/adapters/bidderFactory.js';
import { config } from '../src/config.js';
import { BANNER, VIDEO } from '../src/mediaTypes.js';

const BIDDER_CODE = 'smaato';
const SMAATO_ENDPOINT = 'https://prebid.ad.smaato.net/oapi/prebid';
const CLIENT = 'prebid_js_$prebid.version$_1.0'

/**
* Transform BidRequest to OpenRTB-formatted BidRequest Object
* @param {Array<BidRequest>} validBidRequests
* @param {any} bidderRequest
* @returns {string}
*/
const buildOpenRtbBidRequestPayload = (validBidRequests, bidderRequest) => {
  /**
   * Turn incoming prebid sizes into openRtb format mapping.
   * @param {*} sizes in format [[10, 10], [20, 20]]
   * @returns array of openRtb format mappings [{w: 10, h: 10}, {w: 20, h: 20}]
   */
  const parseSizes = (sizes) => {
    return sizes.map((size) => {
      return {w: size[0], h: size[1]};
    })
  }

  const imp = validBidRequests.map(br => {
    const bannerMediaType = utils.deepAccess(br, 'mediaTypes.banner');
    const videoMediaType = utils.deepAccess(br, 'mediaTypes.video');
    let result = {
      id: br.bidId,
      tagid: utils.deepAccess(br, 'params.adspaceId')
    }

    if (bannerMediaType) {
      const sizes = parseSizes(utils.getAdUnitSizes(br));
      result.banner = {
        w: sizes[0].w,
        h: sizes[0].h,
        format: sizes
      }
    }

    if (videoMediaType) {
      result.video = {
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

    return result;
  });

  const request = {
    id: bidderRequest.auctionId,
    at: 1,
    imp,
    cur: ['USD'],
    tmax: bidderRequest.timeout,
    site: {
      id: window.location.hostname,
      publisher: {
        id: utils.deepAccess(validBidRequests[0], 'params.publisherId')
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
      client: CLIENT
    }
  };

  Object.assign(request.user, config.getConfig('fpd.user'));
  Object.assign(request.site, config.getConfig('fpd.context'));

  if (bidderRequest.gdprConsent && bidderRequest.gdprConsent.gdprApplies === true) {
    utils.deepSetValue(request, 'regs.ext.gdpr', bidderRequest.gdprConsent.gdprApplies ? 1 : 0);
    utils.deepSetValue(request, 'user.ext.consent', bidderRequest.gdprConsent.consentString);
  }

  if (bidderRequest.uspConsent !== undefined) {
    utils.deepSetValue(request, 'regs.ext.us_privacy', bidderRequest.uspConsent);
  }

  utils.logInfo('[SMAATO] OpenRTB Request:', request);
  return JSON.stringify(request);
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
    return typeof bid.params === 'object' &&
           typeof bid.params.publisherId === 'string' &&
           typeof bid.params.adspaceId === 'string';
  },

  /**
      * Make a server request from the list of BidRequests.
      *
      * @param {validBidRequests[]} - an array of bids
      * @return ServerRequest Info describing the request to the server.
      */
  buildRequests: (validBidRequests, bidderRequest) => {
    utils.logInfo('[SMAATO] Client version:', CLIENT);
    return {
      method: 'POST',
      url: validBidRequests[0].params.endpoint || SMAATO_ENDPOINT,
      data: buildOpenRtbBidRequestPayload(validBidRequests, bidderRequest),
      options: {
        withCredentials: true,
        crossOrigin: true,
      }
    };
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

    let serverResponseHeaders = serverResponse.headers;
    const smtAdType = serverResponseHeaders.get('X-SMT-ADTYPE');

    const smtExpires = serverResponseHeaders.get('X-SMT-Expires');
    let ttlSec = 300;
    utils.logInfo('[SMAATO] Expires:', smtExpires);
    if (smtExpires) {
      ttlSec = Math.floor((smtExpires - Date.now()) / 1000);
    }

    const res = serverResponse.body;
    utils.logInfo('[SMAATO] OpenRTB Response:', res);

    var bids = [];
    res.seatbid.forEach(sb => {
      sb.bid.forEach(b => {
        let resultingBid = {
          requestId: b.impid,
          cpm: b.price || 0,
          width: b.w,
          height: b.h,
          ttl: ttlSec,
          creativeId: b.crid,
          dealId: b.dealid || null,
          netRevenue: true,
          currency: res.cur,
          meta: {
            advertiserDomains: b.adomain,
            networkName: b.bidderName,
            agencyId: sb.seat
          }
        };

        switch (smtAdType) {
          case 'Img':
            resultingBid.ad = createImgAd(b.adm);
            resultingBid.meta.mediaType = BANNER;
            bids.push(resultingBid);
            break;
          case 'Richmedia':
            resultingBid.ad = createRichmediaAd(b.adm);
            resultingBid.meta.mediaType = BANNER;
            bids.push(resultingBid);
            break;
          case 'Video':
            resultingBid.vastXml = b.adm;
            resultingBid.meta.mediaType = VIDEO;
            bids.push(resultingBid);
            break;
          default:
            utils.logInfo('[SMAATO] Invalid ad type:', smtAdType);
        }
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
    const syncs = []
    return syncs;
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
