import * as utils from '../src/utils.js';
import { registerBidder } from '../src/adapters/bidderFactory.js';
import { config } from '../src/config.js';
import { BANNER, VIDEO, NATIVE } from '../src/mediaTypes.js';
import { Renderer } from '../src/Renderer.js';
import { OUTSTREAM } from '../src/video.js';

const BIDDER_CODE = 'operaads';

const ENDPOINT = 'https://s.adx.opera.com/ortb/v2/';

const OUTSTREAM_RENDERER_URL = 'https://acdn.adnxs.com/video/outstream/ANOutstreamVideo.js';

const DEFAULT_CURRENCY = 'USD';
const DEFAULT_LANGUAGE = 'en';
const NET_REVENUE = true;

const BANNER_DEFAULTS = {
  SIZE: [300, 250]
}

const VIDEO_DEFAULTS = {
  PROTOCOLS: [2, 3, 5, 6],
  MIMES: ['video/mp4'],
  PLAYBACK_METHODS: [1, 2, 3, 4],
  DELIVERY: [1],
  API: [1, 2, 5],
  SIZE: [640, 480]
}

const NATIVE_DEFAULTS = {
  IMAGE_TYPE: {
    ICON: 1,
    MAIN: 3,
  },
  ASSET_ID: {
    TITLE: 1,
    IMAGE: 2,
    ICON: 3,
    BODY: 4,
    SPONSORED: 5,
    CTA: 6
  },
  DATA_ASSET_TYPE: {
    SPONSORED: 1,
    DESC: 2,
    CTA_TEXT: 12,
  },
  LENGTH: {
    TITLE: 90,
    BODY: 140,
    SPONSORED: 25,
    CTA: 20
  }
}

export const spec = {
  code: BIDDER_CODE,

  // short code
  aliases: ['opera'],

  supportedMediaTypes: [BANNER, VIDEO, NATIVE],

  /**
   * Determines whether or not the given bid request is valid.
   *
   * @param {BidRequest} bid
   * @returns boolean True if this is a valid bid, and false otherwise.
   */
  isBidRequestValid: function (bid) {
    if (!bid) {
      utils.logWarn(BIDDER_CODE, 'Invalid bid,', bid);
      return false;
    }

    if (!bid.params) {
      utils.logWarn(BIDDER_CODE, 'bid.params is required.')
      return false;
    }

    if (!bid.params.placementId) {
      utils.logWarn(BIDDER_CODE, 'bid.params.placementId is required.')
      return false;
    }

    if (!bid.params.endpointId) {
      utils.logWarn(BIDDER_CODE, 'bid.params.endpointId is required.')
      return false;
    }

    if (!bid.params.publisherId) {
      utils.logWarn(BIDDER_CODE, 'bid.params.publisherId is required.')
      return false;
    }

    return true;
  },

  /**
   * Make a server request from the list of BidRequests.
   *
   * @param {validBidRequests[]} validBidRequests An array of bidRequest objects
   * @param {bidderRequest} bidderRequest The master bidRequest object.
   * @return ServerRequest Info describing the request to the server.
   */
  buildRequests: function (validBidRequests, bidderRequest) {
    return validBidRequests.map(validBidRequest => (buildOpenRtbBidRequest(validBidRequest, bidderRequest)))
  },

  /**
   * Unpack the response from the server into a list of bids.
   *
   * @param {ServerResponse} serverResponse A successful response from the server.
   * @return {Bid[]} An array of bids which were nested inside the server.
   */
  interpretResponse: function (serverResponse, bidRequest) {
    let bidResponses = [];

    let serverBody;
    if ((serverBody = serverResponse.body) && serverBody.seatbid && utils.isArray(serverBody.seatbid)) {
      serverBody.seatbid.forEach((seatbidder) => {
        if (seatbidder.bid && utils.isArray(seatbidder.bid)) {
          bidResponses = seatbidder.bid.map((bid) => buildBidResponse(bid, bidRequest.originalBidRequest, serverBody));
        }
      });
    }

    return bidResponses;
  },

  /**
   * Register the user sync pixels which should be dropped after the auction.
   *
   * @param {SyncOptions} syncOptions Which user syncs are allowed?
   * @param {ServerResponse[]} serverResponses List of server's responses.
   * @return {UserSync[]} The user syncs which should be dropped.
   */
  getUserSyncs: function (syncOptions, serverResponses, gdprConsent, uspConsent) {
    return [];
  },

  /**
   * Register bidder specific code, which will execute if bidder timed out after an auction
   *
   * @param {data} timeoutData Containing timeout specific data
   */
  onTimeout: function (timeoutData) { },

  /**
   * Register bidder specific code, which will execute if a bid from this bidder won the auction
   *
   * @param {Bid} bid The bid that won the auction
   */
  onBidWon: function (bid) {
    if (!bid || !utils.isStr(bid.nurl)) {
      return;
    }

    let winCpm, winCurr;
    if (Object.prototype.hasOwnProperty.call(bid, 'originalCpm')) {
      winCpm = bid.originalCpm;
      winCurr = bid.originalCurrency;
    } else {
      winCpm = bid.cpm;
      winCurr = bid.currency;
    }

    utils.triggerPixel(
      bid.nurl
        .replace(/\$\{AUCTION_PRICE\}/g, winCpm)
        .replace(/\$\{AUCTION_CURRENCY\}/g, winCurr)
    );
  },

  /**
   * Register bidder specific code, which will execute when the adserver targeting has been set for a bid from this bidder
   *
   * @param {Bid} bid The bid of which the targeting has been set
   */
  onSetTargeting: function (bid) { }
}

/**
 * Buid openRtb request from bidRequest and bidderRequest
 *
 * @param {BidRequest} bidRequest
 * @param {BidderRequest} bidderRequest
 * @returns {Request}
 */
function buildOpenRtbBidRequest(bidRequest, bidderRequest) {
  const currencies = getCurrencies(bidRequest);

  const pageReferrer = utils.deepAccess(bidderRequest, 'refererInfo.referer');

  // build OpenRTB request body
  const payload = {
    id: bidderRequest.auctionId,
    tmax: bidderRequest.timeout || config.getConfig('bidderTimeout'),
    test: config.getConfig('debug') ? 1 : 0,
    imp: createImp(bidRequest, currencies[0]),
    device: getDevice(),
    site: {
      id: String(utils.deepAccess(bidRequest, 'params.publisherId')),
      domain: getDomain(pageReferrer),
      page: pageReferrer,
      ref: window.self === window.top ? document.referrer : '',
    },
    at: 1,
    bcat: getBcat(bidRequest),
    cur: currencies,
    regs: {
      coppa: config.getConfig('coppa') ? 1 : 0,
      ext: {}
    },
    user: {
      id: getUserId(bidRequest)
    }
  }

  const gdprConsent = utils.deepAccess(bidderRequest, 'gdprConsent');
  if (!!gdprConsent && gdprConsent.gdprApplies) {
    utils.deepSetValue(payload, 'regs.ext.gdpr', 1);
    utils.deepSetValue(payload, 'user.ext.consent', gdprConsent.consentString);
  }

  const uspConsent = utils.deepAccess(bidderRequest, 'uspConsent');
  if (uspConsent) {
    utils.deepSetValue(payload, 'regs.ext.us_privacy', uspConsent);
  }

  const eids = utils.deepAccess(bidRequest, 'userIdAsEids', []);
  if (eids.length > 0) {
    utils.deepSetValue(payload, 'user.eids', eids);
  }

  return {
    method: 'POST',
    url: ENDPOINT + String(utils.deepAccess(bidRequest, 'params.publisherId')) +
      '?ep=' + String(utils.deepAccess(bidRequest, 'params.endpointId')),
    data: JSON.stringify(payload),
    options: {
      contentType: 'application/json',
      customHeaders: {
        'x-openrtb-version': 2.5
      }
    },
    // set original bid request, so we can get it from interpretResponse
    originalBidRequest: bidRequest
  }
}

/**
 * Build bid response from openrtb bid response.
 *
 * @param {OpenRtbBid} bid
 * @param {BidRequest} bidRequest
 * @param {OpenRtbResponseBody} responseBody
 * @returns {BidResponse}
 */
function buildBidResponse(bid, bidRequest, responseBody) {
  let mediaType = BANNER;
  let nativeResponse;

  if (/VAST\s+version/.test(bid.adm)) {
    mediaType = VIDEO;
  } else {
    let markup;
    try {
      markup = JSON.parse(bid.adm);
    } catch (e) {
      markup = null;
    }

    // OpenRtb Markup Response Object
    // https://www.iab.com/wp-content/uploads/2016/03/OpenRTB-Native-Ads-Specification-1-1_2016.pdf#5.1
    if (markup && utils.isPlainObject(markup.native)) {
      mediaType = NATIVE;
      nativeResponse = markup.native;
    }
  }

  const currency = responseBody.cur || DEFAULT_CURRENCY;
  const cpm = (parseFloat(bid.price) || 0).toFixed(2);

  const categories = utils.deepAccess(bid, 'cat', []);

  const bidResponse = {
    requestId: bid.impid,
    cpm: cpm,
    currency: currency,
    mediaType: mediaType,
    ttl: 300,
    creativeId: bid.crid || bid.id,
    netRevenue: NET_REVENUE,
    nurl: bid.nurl,
    lurl: bid.lurl,
    meta: {
      mediaType: mediaType,
      primaryCatId: categories[0],
      secondaryCatIds: categories.slice(1),
    }
  };

  if (bid.adomain && utils.isArray(bid.adomain) && bid.adomain.length > 0) {
    bidResponse.meta.advertiserDomains = bid.adomain;
    bidResponse.meta.clickUrl = bid.adomain[0];
  }

  switch (mediaType) {
    case VIDEO: {
      const playerSize = utils.deepAccess(bidRequest, 'mediaTypes.video.playerSize', VIDEO_DEFAULTS.SIZE);
      const size = canonicalizeSizesArray(playerSize)[0];

      bidResponse.vastXml = bid.adm;

      bidResponse.width = bid.w || size[0];
      bidResponse.height = bid.h || size[1];

      const context = utils.deepAccess(bidRequest, 'mediaTypes.video.context');

      // if outstream video, add a default render for it.
      if (context === OUTSTREAM) {
        // fill adResponse, will be used in ANOutstreamVideo.renderAd
        bidResponse.adResponse = {
          content: bidResponse.vastXml,
          width: bidResponse.width,
          height: bidResponse.height,
          player_width: size[0],
          player_height: size[1],
        };
        bidResponse.renderer = createRenderer(bidRequest);
      }
      break;
    }
    case NATIVE: {
      bidResponse.native = interpretNativeAd(nativeResponse, currency, cpm);
      break;
    }
    default: {
      bidResponse.ad = bid.adm;

      bidResponse.width = bid.w;
      bidResponse.height = bid.h;
    }
  }
  return bidResponse;
}

/**
 * Convert OpenRtb native response to bid native object.
 *
 * @param {OpenRtbNativeResponse} nativeResponse
 * @param {String} currency
 * @param {String} cpm
 * @returns {BidNative} native
 */
function interpretNativeAd(nativeResponse, currency, cpm) {
  const native = {};

  // OpenRtb Link Object
  // https://www.iab.com/wp-content/uploads/2016/03/OpenRTB-Native-Ads-Specification-1-1_2016.pdf#5.7
  const clickUrl = utils.deepAccess(nativeResponse, 'link.url');
  if (clickUrl && utils.isStr(clickUrl)) {
    native.clickUrl = decodeURIComponent(clickUrl);
  }

  const clickTrackers = utils.deepAccess(nativeResponse, 'link.clicktrackers');
  if (clickTrackers && utils.isArray(clickTrackers)) {
    native.clickTrackers = clickTrackers
      .filter(Boolean)
      .map(
        url => decodeURIComponent(url)
          .replace(/\$\{AUCTION_PRICE\}/g, cpm)
          .replace(/\$\{AUCTION_CURRENCY\}/g, currency)
      );
  }

  if (nativeResponse.imptrackers && utils.isArray(nativeResponse.imptrackers)) {
    native.impressionTrackers = nativeResponse.imptrackers
      .filter(Boolean)
      .map(
        url => decodeURIComponent(url)
          .replace(/\$\{AUCTION_PRICE\}/g, cpm)
          .replace(/\$\{AUCTION_CURRENCY\}/g, currency)
      );
  }

  if (nativeResponse.jstracker && utils.isStr(nativeResponse.jstracker)) {
    native.javascriptTrackers = [nativeResponse.jstracker];
  }

  let assets;
  if ((assets = nativeResponse.assets) && utils.isArray(assets)) {
    assets.forEach((asset) => {
      switch (asset.id) {
        case NATIVE_DEFAULTS.ASSET_ID.TITLE: {
          const title = utils.deepAccess(asset, 'title.text');
          if (title) {
            native.title = title;
          }
          break;
        }
        case NATIVE_DEFAULTS.ASSET_ID.IMAGE: {
          if (asset.img) {
            native.image = {
              url: decodeURIComponent(asset.img.url),
              width: asset.img.w,
              height: asset.img.h
            }
          }
          break;
        }
        case NATIVE_DEFAULTS.ASSET_ID.ICON: {
          if (asset.img) {
            native.icon = {
              url: decodeURIComponent(asset.img.url),
              width: asset.img.w,
              height: asset.img.h
            }
          }
          break;
        }
        case NATIVE_DEFAULTS.ASSET_ID.BODY: {
          const body = utils.deepAccess(asset, 'data.value');
          if (body) {
            native.body = body;
          }
          break;
        }
        case NATIVE_DEFAULTS.ASSET_ID.SPONSORED: {
          const sponsoredBy = utils.deepAccess(asset, 'data.value');
          if (sponsoredBy) {
            native.sponsoredBy = sponsoredBy;
          }
          break;
        }
        case NATIVE_DEFAULTS.ASSET_ID.CTA: {
          const cta = utils.deepAccess(asset, 'data.value');
          if (cta) {
            native.cta = cta;
          }
          break;
        }
      }
    });
  }

  return native;
}

/**
 * Create an imp array
 *
 * @param {BidRequest} bidRequest
 * @param {Currency} cur
 * @returns {Imp[]}
 */
function createImp(bidRequest, cur) {
  const imp = [];

  const floor = getBidFloor(bidRequest, cur);

  const impItem = {
    id: bidRequest.bidId,
    tagid: String(utils.deepAccess(bidRequest, 'params.placementId')),
    bidfloor: floor,
  };

  let mediaType;
  let bannerReq, videoReq, nativeReq;

  if ((bannerReq = utils.deepAccess(bidRequest, 'mediaTypes.banner'))) {
    const size = canonicalizeSizesArray(bannerReq.sizes || BANNER_DEFAULTS.SIZE)[0];

    impItem.banner = {
      w: size[0],
      h: size[1],
      pos: 0,
    };

    mediaType = BANNER;
  } else if ((videoReq = utils.deepAccess(bidRequest, 'mediaTypes.video'))) {
    const size = canonicalizeSizesArray(videoReq.playerSize || VIDEO_DEFAULTS.SIZE)[0];

    impItem.video = {
      w: size[0],
      h: size[1],
      pos: 0,
      mimes: videoReq.mimes || VIDEO_DEFAULTS.MIMES,
      protocols: videoReq.protocols || VIDEO_DEFAULTS.PROTOCOLS,
      startdelay: typeof videoReq.startdelay === 'number' ? videoReq.startdelay : 0,
      skip: typeof videoReq.skip === 'number' ? videoReq.skip : 0,
      playbackmethod: videoReq.playbackmethod || VIDEO_DEFAULTS.PLAYBACK_METHODS,
      delivery: videoReq.delivery || VIDEO_DEFAULTS.DELIVERY,
      api: videoReq.api || VIDEO_DEFAULTS.API,
      placement: videoReq.context === OUTSTREAM ? 3 : 1,
    };

    mediaType = VIDEO;
  } else if ((nativeReq = utils.deepAccess(bidRequest, 'mediaTypes.native'))) {
    const params = bidRequest.nativeParams || nativeReq;

    const request = {
      native: {
        ver: '1.1',
        assets: createNativeAssets(params),
      }
    };

    impItem.native = {
      ver: '1.1',
      request: JSON.stringify(request),
    };

    mediaType = NATIVE;
  }

  if (mediaType) {
    imp.push(impItem);
  }

  return imp;
}

/**
 * Convert bid sizes to size array
 *
 * @param {Size[]|Size[][]} sizes
 * @returns {Size[][]}
 */
function canonicalizeSizesArray(sizes) {
  if (sizes.length === 2 && !utils.isArray(sizes[0])) {
    return [sizes];
  }
  return sizes;
}

/**
 * Create Assets Object for Native request
 *
 * @param {Object} params
 * @returns {Asset[]}
 */
function createNativeAssets(params) {
  const assets = [];

  if (params.title) {
    assets.push({
      id: NATIVE_DEFAULTS.ASSET_ID.TITLE,
      required: params.title.required ? 1 : 0,
      title: {
        len: params.title.len || NATIVE_DEFAULTS.LENGTH.TITLE
      }
    })
  }

  if (params.image) {
    assets.push({
      id: NATIVE_DEFAULTS.ASSET_ID.IMAGE,
      required: params.image.required ? 1 : 0,
      img: mapNativeImage(params.image, NATIVE_DEFAULTS.IMAGE_TYPE.MAIN)
    })
  }

  if (params.icon) {
    assets.push({
      id: NATIVE_DEFAULTS.ASSET_ID.ICON,
      required: params.icon.required ? 1 : 0,
      img: mapNativeImage(params.icon, NATIVE_DEFAULTS.IMAGE_TYPE.ICON)
    })
  }

  if (params.sponsoredBy) {
    assets.push({
      id: NATIVE_DEFAULTS.ASSET_ID.SPONSORED,
      required: params.sponsoredBy.required ? 1 : 0,
      data: {
        type: NATIVE_DEFAULTS.DATA_ASSET_TYPE.SPONSORED,
        len: params.sponsoredBy.len | NATIVE_DEFAULTS.LENGTH.SPONSORED
      }
    })
  }

  if (params.body) {
    assets.push({
      id: NATIVE_DEFAULTS.ASSET_ID.BODY,
      required: params.body.required ? 1 : 0,
      data: {
        type: NATIVE_DEFAULTS.DATA_ASSET_TYPE.DESC,
        len: params.body.len || NATIVE_DEFAULTS.LENGTH.BODY
      }
    })
  }

  if (params.cta) {
    assets.push({
      id: NATIVE_DEFAULTS.ASSET_ID.CTA,
      required: params.cta.required ? 1 : 0,
      data: {
        type: NATIVE_DEFAULTS.DATA_ASSET_TYPE.CTA_TEXT,
        len: params.cta.len || NATIVE_DEFAULTS.LENGTH.CTA
      }
    })
  }

  return assets;
}

/**
 * Create native image object
 *
 * @param {Object} image
 * @param {Number} type
 * @returns {NativeImage}
 */
function mapNativeImage(image, type) {
  const img = { type: type };

  if (image.aspect_ratios) {
    const ratio = image.aspect_ratios[0];
    const minWidth = ratio.min_width || 100;

    img.wmin = minWidth;
    img.hmin = (minWidth / ratio.ratio_width * ratio.ratio_height);
  }

  if (image.sizes) {
    const size = canonicalizeSizesArray(image.sizes)[0];

    img.w = size[0];
    img.h = size[1];
  }

  return img;
}

/**
 * Get user id from bid request. if no user id module used, return a new uuid.
 *
 * @param {BidRequest} bidRequest
 * @returns {String} userId
 */
function getUserId(bidRequest) {
  let sharedId = utils.deepAccess(bidRequest, 'userId.sharedid.id');
  if (sharedId) {
    return sharedId;
  }

  for (const idModule of ['pubcid', 'tdid']) {
    let userId = utils.deepAccess(bidRequest, `userId.${idModule}`);
    if (userId) {
      return userId;
    }
  }

  return utils.generateUUID();
}

/**
 * Get publisher domain
 *
 * @param {String} referer
 * @returns {String} domain
 */
function getDomain(referer) {
  let domain;

  if (!(domain = config.getConfig('publisherDomain'))) {
    const u = utils.parseUrl(referer);
    domain = u.hostname;
  }

  return domain.replace(/^https?:\/\/([\w\-\.]+)(?::\d+)?/, '$1');
}

/**
 * Get bid floor price
 *
 * @param {BidRequest} bid
 * @param {String} cur
 * @returns {Number} floor price
 */
function getBidFloor(bid, cur) {
  let floorInfo = {};

  if (typeof bid.getFloor === 'function') {
    floorInfo = bid.getFloor({
      currency: cur,
      mediaType: '*',
      size: '*'
    });
  }

  return floorInfo.floor || 0.0;
}

/**
 * Get currencies from bid request
 *
 * @param {BidRequest} bidRequest
 * @returns {String[]} currencies
 */
function getCurrencies(bidRequest) {
  let currencies = [];

  const pCur = utils.deepAccess(bidRequest, 'params.currency');
  if (pCur) {
    currencies = currencies.concat(pCur);
  }

  if (!currencies.length) {
    let currency;
    if ((currency = config.getConfig('currency')) && currency.adServerCurrency) {
      currencies.push(currency.adServerCurrency);
    } else {
      currencies.push(DEFAULT_CURRENCY);
    }
  }

  return currencies;
}

/**
 * Get bcat
 *
 * @param {BidRequest} bidRequest
 * @returns {String[]}
 */
function getBcat(bidRequest) {
  let bcat = [];

  const pBcat = utils.deepAccess(bidRequest, 'params.bcat');
  if (pBcat) {
    bcat = bcat.concat(pBcat);
  }

  return bcat;
}

/**
 * Get device info
 *
 * @returns {Object}
 */
function getDevice() {
  const device = config.getConfig('device') || {};

  device.w = device.w || window.screen.width;
  device.h = device.h || window.screen.height;
  device.ua = device.ua || navigator.userAgent;
  device.language = device.language || getLanguage();
  device.dnt = typeof device.dnt === 'number'
    ? device.dnt : (utils.getDNT() ? 1 : 0);

  return device;
}

/**
 * Get browser language
 *
 * @returns {String} language
 */
function getLanguage() {
  const lang = (navigator.languages && navigator.languages[0]) ||
    navigator.language || navigator.userLanguage;
  return lang ? lang.split('-')[0] : DEFAULT_LANGUAGE;
}

/**
 * Create render for outstream video.
 *
 * @param {BidRequest} bidRequest
 * @returns
 */
function createRenderer(bidRequest) {
  const globalRenderer = utils.deepAccess(bidRequest, 'renderer');
  const currentRenderer = utils.deepAccess(bidRequest, 'mediaTypes.video.renderer');

  let url = OUTSTREAM_RENDERER_URL;
  let config = {};
  let render = function (bid) {
    bid.renderer.push(() => {
      window.ANOutstreamVideo.renderAd({
        sizes: [bid.width, bid.height],
        targetId: bid.adUnitCode,
        adResponse: bid.adResponse,
      });
    });
  };

  if (currentRenderer) {
    url = currentRenderer.url;
    config = currentRenderer.options;
    render = currentRenderer.render;
  } else if (globalRenderer) {
    url = globalRenderer.url;
    config = globalRenderer.options;
    render = globalRenderer.render;
  }

  const renderer = Renderer.install({
    id: bidRequest.bidId,
    url: url,
    loaded: false,
    config: config,
    adUnitCode: bidRequest.adUnitCode
  });

  try {
    renderer.setRender(render);
  } catch (e) {
    utils.logError(BIDDER_CODE, 'Error calling setRender on renderer', e);
  }
  return renderer;
}

registerBidder(spec);
