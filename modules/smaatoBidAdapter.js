import * as utils from '../src/utils.js';
import { registerBidder } from '../src/adapters/bidderFactory.js';
import { config } from '../src/config.js';
import { BANNER } from '../src/mediaTypes.js';

const BIDDER_CODE = 'smaato';
const SMAATO_ENDPOINT = 'https://prebid-test.smaatolabs.net/bidder';

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
    const sizes = parseSizes(br.sizes);
    return {
      id: br.bidId,
      banner: {
        w: sizes[0].w,
        h: sizes[0].h,
        format: sizes
      },
      tagid: utils.deepAccess(br, 'params.adspaceId'),
      // secure: 1,
      // bidfloor: parseFloat(utils.deepAccess(br, 'params.bidfloorCpm') || 0)
    };
  });

  const request = {
    id: bidderRequest.auctionId,
    at: 1,
    imp,
    cur: ['USD'],
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
      language: navigator.language,
      ua: navigator.userAgent
    },
    regs: {
      coppa: config.getConfig('coppa') === true ? 1 : 0,
      ext: {
        gdpr: bidderRequest.gdprConsent && bidderRequest.gdprConsent.gdprApplies ? 1 : 0,
      }
    },
    ext: {
      client: 'prebidjs_$prebid.version$'
    }
  };

  if (bidderRequest.uspConsent !== undefined) {
    utils.deepSetValue(request, 'regs.ext.us_privacy', bidderRequest.uspConsent);
  }

  return JSON.stringify(request);
}

export const spec = {
  code: BIDDER_CODE,
  aliases: [BIDDER_CODE], // short code
  supportedMediaTypes: [BANNER],

  /**
      * Determines whether or not the given bid request is valid.
      *
      * @param {BidRequest} bid The bid params to validate.
      * @return boolean True if this is a valid bid, and false otherwise.
      */
  isBidRequestValid: function(bid) {
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
  buildRequests: function(validBidRequests, bidderRequest) {
    return {
      method: 'POST',
      url: validBidRequests[0].params.endpoint || SMAATO_ENDPOINT,
      data: buildOpenRtbBidRequestPayload(validBidRequests, bidderRequest)
    };
  },
  /**
      * Unpack the response from the server into a list of bids.
      *
      * @param {ServerResponse} serverResponse A successful response from the server.
      * @return {Bid[]} An array of bids which were nested inside the server.
      */
  interpretResponse: function(serverResponse, bidRequest) {
    // const serverBody  = serverResponse.body;
    let serverResponseHeaders = serverResponse.headers;
    const smtAdType = serverResponseHeaders.get('X-SMT-ADTYPE');

    const res = serverResponse.body;
    var bids = []
    if (res) {
      res.seatbid.forEach(sb => {
        sb.bid.forEach(b => {
          let ad = '';
          switch (smtAdType) {
            case 'Img':
              ad = createImgAd(b.adm);
              break;
            case 'Richmedia':
              ad = createRichmediaAd(b.adm);
              break;
            case 'Video':
              break;
            default:
              ad = '';
          }

          bids.push({
            requestId: b.impid,
            cpm: b.price || 0,
            width: b.w,
            height: b.h,
            ad: ad,
            ttl: 1000,
            creativeId: b.crid,
            netRevenue: false,
            currency: res.cur
          })
        })
      });
    }

    return bids;
  },

  /**
      * Register the user sync pixels which should be dropped after the auction.
      *
      * @param {SyncOptions} syncOptions Which user syncs are allowed?
      * @param {ServerResponse[]} serverResponses List of server's responses.
      * @return {UserSync[]} The user syncs which should be dropped.
      */
  getUserSyncs: function(syncOptions, serverResponses, gdprConsent, uspConsent) {
    const syncs = []
    return syncs;
  }
}
registerBidder(spec);

function createImgAd(adm) {
  const image = JSON.parse(adm).image;
  let markup = `<div><img src="${image.img.url}"/></div>`;

  image.impressiontrackers.map(src => {
    markup += `<img src="${src}" alt="" width="1" height="1"/>`;
  });

  return markup;
}

function createRichmediaAd(adm) {
  const rich = JSON.parse(adm).richmedia.mediadata;
  return rich.content;
}
