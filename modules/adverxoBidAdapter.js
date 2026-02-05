import * as utils from '../src/utils.js';
import {registerBidder} from '../src/adapters/bidderFactory.js';
import {BANNER, VIDEO, NATIVE} from '../src/mediaTypes.js';
import {ortbConverter as OrtbConverter} from '../libraries/ortbConverter/converter.js';
import {Renderer} from '../src/Renderer.js';
import {deepAccess, deepSetValue} from '../src/utils.js';
import {config} from '../src/config.js';

/**
 * @typedef {import('../src/adapters/bidderFactory.js').Bid} Bid
 * @typedef {import('../src/adapters/bidderFactory.js').BidRequest} BidRequest
 * @typedef {import('../src/adapters/bidderFactory.js').ServerRequest} ServerRequest
 * @typedef {import('../src/adapters/bidderFactory.js').ServerResponse} ServerResponse
 * @typedef {import('../src/auction.js').BidderRequest} BidderRequest
 * @typedef {import('../src/adapters/bidderFactory.js').SyncOptions} SyncOptions
 * @typedef {import('../src/adapters/bidderFactory.js').UserSync} UserSync
 */

const BIDDER_CODE = 'adverxo';

const ALIASES = [
  {code: 'adport', skipPbsAliasing: true},
  {code: 'bidsmind', skipPbsAliasing: true},
  {code: 'harrenmedia', skipPbsAliasing: true},
  {code: 'alchemyx', skipPbsAliasing: true}
];

const AUCTION_URLS = {
  adverxo: 'js.pbsadverxo.com',
  adport: 'ayuetina.com',
  bidsmind: 'arcantila.com',
  harrenmedia: 'harrenmediaprebid.com',
  alchemyx: 'alchemyx.one'
};

const ENDPOINT_URL_AD_UNIT_PLACEHOLDER = '{AD_UNIT}';
const ENDPOINT_URL_AUTH_PLACEHOLDER = '{AUTH}';
const ENDPOINT_URL_HOST_PLACEHOLDER = '{HOST}';

const ENDPOINT_URL = `https://${ENDPOINT_URL_HOST_PLACEHOLDER}/pickpbs?id=${ENDPOINT_URL_AD_UNIT_PLACEHOLDER}&auth=${ENDPOINT_URL_AUTH_PLACEHOLDER}`;

const ORTB_MTYPES = {
  1: BANNER,
  2: VIDEO,
  4: NATIVE
};

const USYNC_TYPES = {
  IFRAME: 'iframe',
  REDIRECT: 'image'
};

const DEFAULT_CURRENCY = 'USD';

const ortbConverter = OrtbConverter({
  context: {
    netRevenue: true,
    ttl: 60,
  },
  request: function request(buildRequest, imps, bidderRequest, context) {
    const request = buildRequest(imps, bidderRequest, context);

    utils.deepSetValue(request, 'device.ip', 'caller');
    utils.deepSetValue(request, 'ext.avx_add_vast_url', 1);

    const eids = deepAccess(bidderRequest, 'bids.0.userIdAsEids');

    if (eids && eids.length) {
      deepSetValue(request, 'user.ext.eids', eids);
    }

    return request;
  },
  imp(buildImp, bidRequest, context) {
    const imp = buildImp(bidRequest, context);
    const floor = adverxoUtils.getBidFloor(bidRequest);

    if (floor) {
      imp.bidfloor = floor;
      imp.bidfloorcur = DEFAULT_CURRENCY;
    }

    return imp;
  },
  bidResponse: function (buildBidResponse, bid, context) {
    bid.adm = bid.adm.replaceAll(`\${AUCTION_PRICE}`, bid.price);

    if (FEATURES.NATIVE && ORTB_MTYPES[bid.mtype] === NATIVE) {
      if (typeof bid?.adm === 'string') {
        bid.adm = JSON.parse(bid.adm);
      }

      if (bid?.adm?.native) {
        bid.adm = bid.adm.native;
      }
    }

    const result = buildBidResponse(bid, context);

    if (FEATURES.VIDEO) {
      if (bid?.ext?.avx_vast_url) {
        result.vastUrl = bid.ext.avx_vast_url;
      }

      if (bid?.ext?.avx_video_renderer_url) {
        result.avxVideoRendererUrl = bid.ext.avx_video_renderer_url;
      }
    }

    return result;
  }
});

const userSyncUtils = {
  buildUsyncParams: function (gdprConsent, uspConsent, gppConsent) {
    const params = [];

    if (gdprConsent) {
      params.push('gdpr=' + (gdprConsent.gdprApplies ? 1 : 0));
      params.push('gdpr_consent=' + encodeURIComponent(gdprConsent.consentString || ''));
    }

    if (config.getConfig('coppa') === true) {
      params.push('coppa=1');
    }

    if (uspConsent) {
      params.push('us_privacy=' + encodeURIComponent(uspConsent));
    }

    if (gppConsent?.gppString && gppConsent?.applicableSections?.length) {
      params.push('gpp=' + encodeURIComponent(gppConsent.gppString));
      params.push('gpp_sid=' + encodeURIComponent(gppConsent?.applicableSections?.join(',')));
    }

    return params.length ? params.join('&') : '';
  }
};

const videoUtils = {
  createOutstreamVideoRenderer: function (bid) {
    const renderer = Renderer.install({
      id: bid.bidId,
      url: bid.avxVideoRendererUrl,
      loaded: false,
      adUnitCode: bid.adUnitCode
    });

    try {
      renderer.setRender(this.outstreamRender.bind(this));
    } catch (err) {
      utils.logWarn('Prebid Error calling setRender on renderer', err);
    }

    return renderer;
  },

  outstreamRender: function (bid, doc) {
    bid.renderer.push(() => {
      const win = (doc) ? doc.defaultView : window;

      win.adxVideoRenderer.renderAd({
        targetId: bid.adUnitCode,
        adResponse: {content: bid.vastXml}
      });
    });
  }
};

const adverxoUtils = {
  buildAuctionUrl: function (bidderCode, host, adUnitId, adUnitAuth) {
    const auctionUrl = host || AUCTION_URLS[bidderCode];

    return ENDPOINT_URL
      .replace(ENDPOINT_URL_HOST_PLACEHOLDER, auctionUrl)
      .replace(ENDPOINT_URL_AD_UNIT_PLACEHOLDER, adUnitId)
      .replace(ENDPOINT_URL_AUTH_PLACEHOLDER, adUnitAuth);
  },

  groupBidRequestsByAdUnit: function (bidRequests) {
    const groupedBidRequests = new Map();

    bidRequests.forEach(bidRequest => {
      const adUnit = {
        host: bidRequest.params.host,
        id: Number(bidRequest.params.adUnitId),
        auth: bidRequest.params.auth,
      };

      if (!groupedBidRequests.get(adUnit)) {
        groupedBidRequests.set(adUnit, []);
      }

      groupedBidRequests.get(adUnit).push(bidRequest);
    });

    return groupedBidRequests;
  },

  getBidFloor: function (bid) {
    if (utils.isFn(bid.getFloor)) {
      const floor = bid.getFloor({
        currency: DEFAULT_CURRENCY,
        mediaType: '*',
        size: '*',
      });

      if (utils.isPlainObject(floor) && !isNaN(floor.floor) && floor.currency === DEFAULT_CURRENCY) {
        return floor.floor;
      }
    }

    return null;
  }
};

export const spec = {
  code: BIDDER_CODE,
  supportedMediaTypes: [BANNER, NATIVE, VIDEO],
  aliases: ALIASES,

  /**
   * Determines whether the given bid request is valid.
   *
   * @param {BidRequest} bid The bid params to validate.
   * @return {boolean} True if this is a valid bid, and false otherwise.
   */
  isBidRequestValid: function (bid) {
    if (!utils.isPlainObject(bid.params) || !Object.keys(bid.params).length) {
      utils.logWarn('Adverxo Bid Adapter: bid params must be provided.');
      return false;
    }

    if (!bid.params.adUnitId || isNaN(Number(bid.params.adUnitId)) || bid.params.adUnitId <= 0) {
      utils.logWarn('Adverxo Bid Adapter: adUnitId bid param is required and must be a positive number');
      return false;
    }

    if (!bid.params.auth || typeof bid.params.auth !== 'string') {
      utils.logWarn('Adverxo Bid Adapter: auth bid param is required and must be a string');
      return false;
    }

    return true;
  },

  /**
   * Make a server request from the list of BidRequests.
   *
   * @param {BidRequest[]} validBidRequests an array of bids
   * @param {BidderRequest} bidderRequest an array of bids
   * @return {ServerRequest} Info describing the request to the server.
   */
  buildRequests: function (validBidRequests, bidderRequest) {
    const result = [];

    const bidRequestsByAdUnit = adverxoUtils.groupBidRequestsByAdUnit(validBidRequests);

    bidRequestsByAdUnit.forEach((adUnitBidRequests, adUnit) => {
      const ortbRequest = ortbConverter.toORTB({
        bidRequests: adUnitBidRequests,
        bidderRequest
      });

      result.push({
        method: 'POST',
        url: adverxoUtils.buildAuctionUrl(bidderRequest.bidderCode, adUnit.host, adUnit.id, adUnit.auth),
        data: ortbRequest,
        bids: adUnitBidRequests
      });
    });

    return result;
  },

  /**
   * Unpack the response from the server into a list of bids.
   *
   * @param {ServerResponse} serverResponse A successful response from the server.
   * @param {BidRequest} bidRequest Adverxo bidRequest
   * @return {Bid[]} An array of bids which were nested inside the server.
   */
  interpretResponse: function (serverResponse, bidRequest) {
    if (!serverResponse || !bidRequest) {
      return [];
    }

    const bids = ortbConverter.fromORTB({
      response: serverResponse.body,
      request: bidRequest.data,
    }).bids;

    return bids.map((bid) => {
      const thisRequest = utils.getBidRequest(bid.requestId, [bidRequest]);
      const context = utils.deepAccess(thisRequest, 'mediaTypes.video.context');

      if (FEATURES.VIDEO && bid.mediaType === 'video' && context === 'outstream') {
        bid.renderer = videoUtils.createOutstreamVideoRenderer(bid);
      }

      return bid;
    });
  },

  /**
   * Register the user sync pixels which should be dropped after the auction.
   *
   * @param {SyncOptions} syncOptions Which user syncs are allowed?
   * @param {ServerResponse[]} responses List of server's responses.
   * @param {*} gdprConsent
   * @param {*} uspConsent
   * @param {*} gppConsent
   * @return {UserSync[]} The user syncs which should be dropped.
   */
  getUserSyncs: (syncOptions, responses, gdprConsent, uspConsent, gppConsent) => {
    if (!responses || responses.length === 0 || (!syncOptions.pixelEnabled && !syncOptions.iframeEnabled)) {
      return [];
    }

    const privacyParams = userSyncUtils.buildUsyncParams(gdprConsent, uspConsent, gppConsent);
    const syncType = syncOptions.iframeEnabled ? USYNC_TYPES.IFRAME : USYNC_TYPES.REDIRECT;

    const result = [];

    for (const response of responses) {
      const syncUrls = response.body?.ext?.avx_usync;

      if (!syncUrls || syncUrls.length === 0) {
        continue;
      }

      for (const url of syncUrls) {
        let finalUrl = url;

        if (!finalUrl.includes('?')) {
          finalUrl += '?';
        } else {
          finalUrl += '&';
        }

        finalUrl += 'type=' + syncType;

        if (privacyParams.length !== 0) {
          finalUrl += `&${privacyParams}`;
        }

        result.push({
          type: syncType,
          url: finalUrl
        });
      }
    }

    return result;
  }
}

registerBidder(spec);
