import { registerBidder } from '../src/adapters/bidderFactory.js';
import { config } from '../src/config.js';
import { BANNER, NATIVE } from '../src/mediaTypes.js';
import { convertOrtbRequestToProprietaryNative } from '../src/native.js';
import { _each, _map, deepAccess, deepSetValue, formatQS, triggerPixel } from '../src/utils.js';

/**
 * @typedef {import('../src/adapters/bidderFactory.js').Bid} Bid
 * @typedef {import('../src/adapters/bidderFactory.js').BidRequest} BidRequest
 * @typedef {import('../src/adapters/bidderFactory.js').BidderSpec} BidderSpec
 * @typedef {import('../src/adapters/bidderFactory.js').ServerRequest} ServerRequest
 * @typedef {import('../src/adapters/bidderFactory.js').ServerResponse} ServerResponse
 * @typedef {import('../src/adapters/bidderFactory.js').SyncOptions} SyncOptions
 * @typedef {import('../src/adapters/bidderFactory.js').UserSync} UserSync
 * @typedef {import('../src/auction.js').BidderRequest} BidderRequest
 * @typedef {import('../src/mediaTypes.js').MediaType} MediaType
 * @typedef {import('../src/utils.js').MediaTypes} MediaTypes
 * @typedef {import('../modules/priceFloors.js').getFloor} GetFloor
 */

/**
 * @typedef {Object} CustomServerRequestFields
 * @property {BidRequest} bidRequest
 */

/**
 * @typedef {ServerRequest & CustomServerRequestFields} YandexServerRequest
 */

/**
 * Yandex bidder-specific params which the publisher used in their bid request.
 *
 * @typedef {Object} YandexBidRequestParams
 * @property {string} placementId Possible formats: `R-I-123456-2`, `R-123456-1`, `123456-789`.
 * @property {number} [pageId] Deprecated. Please use `placementId` instead.
 * @property {number} [impId] Deprecated. Please use `placementId` instead.
 */

/**
 * @typedef {Object} AdditionalBidRequestFields
 * @property {GetFloor} [getFloor]
 * @property {MediaTypes} [mediaTypes]
 */

/**
 * @typedef {BidRequest & AdditionalBidRequestFields} ExtendedBidRequest
 */

const BIDDER_CODE = 'yandex';
const BIDDER_URL = 'https://bs.yandex.ru/prebid';
const DEFAULT_TTL = 180;
const DEFAULT_CURRENCY = 'EUR';
/**
 * @type {MediaType[]}
 */
const SUPPORTED_MEDIA_TYPES = [BANNER, NATIVE];
const SSP_ID = 10500;

const IMAGE_ASSET_TYPES = {
  ICON: 1,
  IMAGE: 3,
};
const DATA_ASSET_TYPES = {
  TITLE: 0,
  SPONSORED: 1,
  DESC: 2,
  RATING: 3,
  LIKES: 4,
  ADDRESS: 9,
  DESC2: 10,
  DISPLAY_URL: 11,
  CTA_TEXT: 12,
  E_504: 504,
};
export const NATIVE_ASSETS = {
  title: [1, DATA_ASSET_TYPES.TITLE],
  body: [2, DATA_ASSET_TYPES.DESC],
  body2: [3, DATA_ASSET_TYPES.DESC2],
  sponsoredBy: [4, DATA_ASSET_TYPES.SPONSORED],
  icon: [5, IMAGE_ASSET_TYPES.ICON],
  image: [6, IMAGE_ASSET_TYPES.IMAGE],
  displayUrl: [7, DATA_ASSET_TYPES.DISPLAY_URL],
  cta: [8, DATA_ASSET_TYPES.CTA_TEXT],
  rating: [9, DATA_ASSET_TYPES.RATING],
  likes: [10, DATA_ASSET_TYPES.LIKES],
}
const NATIVE_ASSETS_IDS = {};
_each(NATIVE_ASSETS, (asset, key) => { NATIVE_ASSETS_IDS[asset[0]] = key });

/** @type {BidderSpec} */
export const spec = {
  code: BIDDER_CODE,
  aliases: ['ya'], // short code
  supportedMediaTypes: SUPPORTED_MEDIA_TYPES,

  /**
   * Determines whether or not the given bid request is valid.
   *
   * @param {BidRequest} bid The bid request to validate.
   * @returns {boolean} True if this is a valid bid, and false otherwise.
   */
  isBidRequestValid: function(bid) {
    const { params } = bid;
    if (!params) {
      return false;
    }
    const { pageId, impId } = extractPlacementIds(params);
    if (!(pageId && impId)) {
      return false;
    }
    return true;
  },

  /**
   * Make a server request from the list of BidRequests.
   *
   * @param {ExtendedBidRequest[]} validBidRequests An array of bids.
   * @param {BidderRequest} bidderRequest Bidder request object.
   * @returns {YandexServerRequest[]} Objects describing the requests to the server.
   */
  buildRequests: function(validBidRequests, bidderRequest) {
    validBidRequests = convertOrtbRequestToProprietaryNative(validBidRequests);

    const ortb2 = bidderRequest.ortb2;

    let timeout = null;
    if (bidderRequest) {
      timeout = bidderRequest.timeout;
    }

    const adServerCurrency = config.getConfig('currency.adServerCurrency');

    return validBidRequests.map((bidRequest) => {
      const { params } = bidRequest;
      const { targetRef, withCredentials = true, cur } = params;

      const { pageId, impId } = extractPlacementIds(params);

      const queryParams = {
        'imp-id': impId,
        'target-ref': targetRef || ortb2?.site?.domain,
        'ssp-id': SSP_ID,
      };

      const gdprApplies = Boolean(deepAccess(bidderRequest, 'gdprConsent.gdprApplies'));
      if (gdprApplies) {
        const consentString = deepAccess(bidderRequest, 'gdprConsent.consentString');
        queryParams['gdpr'] = 1;
        queryParams['tcf-consent'] = consentString;
      }

      const imp = {
        id: impId,
        banner: mapBanner(bidRequest),
        native: mapNative(bidRequest),
      };

      const bidfloor = getBidfloor(bidRequest);
      if (bidfloor) {
        imp.bidfloor = bidfloor.floor;
        imp.bidfloorcur = bidfloor.currency;
      }

      const currency = cur || adServerCurrency;
      if (currency) {
        queryParams['ssp-cur'] = currency;
      }

      const data = {
        id: bidRequest.bidId,
        imp: [imp],
        site: ortb2?.site,
        tmax: timeout,
        user: ortb2?.user,
        device: ortb2?.device,
      };

      const eids = deepAccess(bidRequest, 'userIdAsEids');
      if (eids && eids.length) {
        deepSetValue(data, 'user.ext.eids', eids);
      }

      const queryParamsString = formatQS(queryParams);
      return {
        method: 'POST',
        url: BIDDER_URL + `/${pageId}?${queryParamsString}`,
        data,
        options: {
          withCredentials,
        },
        bidRequest,
      };
    });
  },

  interpretResponse: interpretResponse,

  /**
   * Register bidder specific code, which will execute if a bid from this bidder won the auction.
   * @param {Bid} bid The bid that won the auction.
   */
  onBidWon: function(bid) {
    const nurl = addRTT(bid['nurl'], bid.timeToRespond);

    if (!nurl) {
      return;
    }

    triggerPixel(nurl);
  }
}

/**
 * @param {YandexBidRequestParams} bidRequestParams
 */
function extractPlacementIds(bidRequestParams) {
  const { placementId } = bidRequestParams;
  const result = { pageId: null, impId: null };

  let pageId, impId;
  if (placementId) {
    /*
     * Possible formats
     * R-I-123456-2
     * R-123456-1
     * 123456-789
     */
    const num = placementId.lastIndexOf('-');
    if (num === -1) {
      return result;
    }
    const num2 = placementId.lastIndexOf('-', num - 1);
    pageId = placementId.slice(num2 + 1, num);
    impId = placementId.slice(num + 1);
  } else {
    pageId = bidRequestParams.pageId;
    impId = bidRequestParams.impId;
  }

  if (!parseInt(pageId, 10) || !parseInt(impId, 10)) {
    return result;
  }

  result.pageId = pageId;
  result.impId = impId;

  return result;
}

/**
 * @param {ExtendedBidRequest} bidRequest
 */
function getBidfloor(bidRequest) {
  const floors = [];

  if (typeof bidRequest.getFloor === 'function') {
    SUPPORTED_MEDIA_TYPES.forEach(type => {
      if (bidRequest.hasOwnProperty(type)) {
        const floorInfo = bidRequest.getFloor({
          currency: DEFAULT_CURRENCY,
          mediaType: type,
          size: bidRequest.sizes || '*'
        })
        floors.push(floorInfo);
      }
    });
  }

  return floors.sort((a, b) => b.floor - a.floor)[0];
}

/**
 * @param {ExtendedBidRequest} bidRequest
 */
function mapBanner(bidRequest) {
  if (deepAccess(bidRequest, 'mediaTypes.banner')) {
    const sizes = bidRequest.sizes || bidRequest.mediaTypes.banner.sizes;
    const format = sizes.map((size) => ({
      w: size[0],
      h: size[1],
    }));
    const { w, h } = format[0];

    return {
      format,
      w,
      h,
    }
  }
}

/**
 * @param {ExtendedBidRequest} bidRequest
 */
function mapNative(bidRequest) {
  const adUnitNativeAssets = deepAccess(bidRequest, 'mediaTypes.native');
  if (adUnitNativeAssets) {
    const assets = [];

    Object.keys(adUnitNativeAssets).forEach((assetCode) => {
      if (NATIVE_ASSETS.hasOwnProperty(assetCode)) {
        const nativeAsset = NATIVE_ASSETS[assetCode];
        const adUnitAssetParams = adUnitNativeAssets[assetCode];
        const asset = mapAsset(assetCode, adUnitAssetParams, nativeAsset);
        assets.push(asset);
      }
    });

    return {
      ver: 1.1,
      request: JSON.stringify({
        ver: 1.1,
        assets
      }),
    };
  }
}

function mapAsset(assetCode, adUnitAssetParams, nativeAsset) {
  const [nativeAssetId, nativeAssetType] = nativeAsset;
  const asset = {
    id: nativeAssetId,
  };

  if (adUnitAssetParams.required) {
    asset.required = 1;
  }

  if (assetCode === 'title') {
    asset.title = {
      len: adUnitAssetParams.len || 25,
    };
  } else if (assetCode === 'image' || assetCode === 'icon') {
    asset.img = mapImageAsset(adUnitAssetParams, nativeAssetType);
  } else {
    asset.data = {
      type: nativeAssetType,
      len: adUnitAssetParams.len,
    };
  }

  return asset;
}

function mapImageAsset(adUnitImageAssetParams, nativeAssetType) {
  const img = {
    type: nativeAssetType,
  };

  if (adUnitImageAssetParams.aspect_ratios) {
    const ratio = adUnitImageAssetParams.aspect_ratios[0];
    const minWidth = ratio.min_width || 100;

    img.wmin = minWidth;
    img.hmin = (minWidth / ratio.ratio_width * ratio.ratio_height);
  }

  if (adUnitImageAssetParams.sizes) {
    const size = Array.isArray(adUnitImageAssetParams.sizes[0]) ? adUnitImageAssetParams.sizes[0] : adUnitImageAssetParams.sizes;
    img.w = size[0];
    img.h = size[1];
  }

  return img;
}

/**
 * Unpack the response from the server into a list of bids.
 *
 * @param {ServerResponse} serverResponse A successful response from the server.
 * @param {YandexServerRequest} yandexServerRequest
 * @return {Bid[]} An array of bids which were nested inside the server.
 */
function interpretResponse(serverResponse, { bidRequest }) {
  let response = serverResponse.body;
  if (!response.seatbid) {
    return [];
  }
  const { seatbid, cur } = serverResponse.body;
  const bidsReceived = seatbid
    .map(seatbid => seatbid.bid)
    .reduce((a, b) => a.concat(b), []);

  const currency = cur || DEFAULT_CURRENCY;

  return bidsReceived.map(bidReceived => {
    const price = bidReceived.price;
    /** @type {Bid} */
    let prBid = {
      requestId: bidRequest.bidId,
      cpm: price,
      currency: currency,
      width: bidReceived.w,
      height: bidReceived.h,
      creativeId: bidReceived.adid,
      nurl: replaceAuctionPrice(bidReceived.nurl, price, currency),

      netRevenue: true,
      ttl: DEFAULT_TTL,

      meta: {
        advertiserDomains: bidReceived.adomain && bidReceived.adomain.length > 0 ? bidReceived.adomain : [],
      }
    };

    if (bidReceived.adm.indexOf('{') === 0) {
      prBid.mediaType = NATIVE;
      prBid.native = interpretNativeAd(bidReceived, price, currency);
    } else {
      prBid.mediaType = BANNER;
      prBid.ad = bidReceived.adm;
    }

    return prBid;
  });
}

function interpretNativeAd(bidReceived, price, currency) {
  try {
    const { adm } = bidReceived;
    const { native } = JSON.parse(adm);

    const result = {
      clickUrl: native.link.url,
    };

    native.assets.forEach(asset => {
      const assetCode = NATIVE_ASSETS_IDS[asset.id];
      if (!assetCode) {
        return;
      }
      if (assetCode === 'image' || assetCode === 'icon') {
        result[assetCode] = {
          url: asset.img.url,
          width: asset.img.w,
          height: asset.img.h
        };
      } else if (assetCode === 'title') {
        result[assetCode] = asset.title.text;
      } else {
        result[assetCode] = asset.data.value;
      }
    });

    result.impressionTrackers = _map(native.imptrackers, (tracker) =>
      replaceAuctionPrice(tracker, price, currency)
    );

    return result;
  } catch (e) {}
}

function replaceAuctionPrice(url, price, currency) {
  if (!url) return;

  return url
    .replace(/\${AUCTION_PRICE}/, price)
    .replace(/\${AUCTION_CURRENCY}/, currency);
}

function addRTT(url, rtt) {
  if (!url) return;

  if (url.indexOf(`\${RTT}`) > -1) {
    return url.replace(/\${RTT}/, rtt ?? -1);
  }

  const urlObj = new URL(url);

  if (Number.isInteger(rtt)) {
    urlObj.searchParams.set('rtt', rtt);
  } else {
    urlObj.searchParams.delete('rtt');
  }

  url = urlObj.toString();

  return url;
}

registerBidder(spec);
