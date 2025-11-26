import { getCurrencyFromBidderRequest } from '../libraries/ortb2Utils/currency.js';
import { registerBidder } from '../src/adapters/bidderFactory.js';
import { BANNER, NATIVE, VIDEO } from '../src/mediaTypes.js';
import { convertOrtbRequestToProprietaryNative } from '../src/native.js';
import { inIframe, _each, _map, deepAccess, deepSetValue, formatQS, triggerPixel, logInfo } from '../src/utils.js';
import { getBoundingClientRect } from '../libraries/boundingClientRect/boundingClientRect.js';
import { ajax } from '../src/ajax.js';
import { config as pbjsConfig } from '../src/config.js';
import { isWebdriverEnabled } from '../libraries/webdriver/webdriver.js';

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

const BIDDER_DOMAIN = 'yandex.com';

const BIDDER_CODE = 'yandex';
const BIDDER_URL = '/ads/prebid';
const EVENT_TRACKER_URL = '/ads/trace';
// We send data in 1% of cases
const DEFAULT_SAMPLING_RATE = 0.01;
const EVENT_LOG_RANDOM_NUMBER = Math.random();
const DEFAULT_TTL = 180;
const DEFAULT_CURRENCY = 'EUR';
/**
 * @type {MediaType[]}
 */
const SUPPORTED_MEDIA_TYPES = [BANNER, NATIVE, VIDEO];

const ORTB_MTYPES = {
  BANNER: 1,
  VIDEO: 2,
  NATIVE: 4
};

const SSP_ID = 10500;
const ADAPTER_VERSION = '2.9.0';

const TRACKER_METHODS = {
  img: 1,
  js: 2,
};

const TRACKER_EVENTS = {
  impression: 1,
  'viewable-mrc50': 2,
  'viewable-mrc100': 3,
  'viewable-video50': 4,
};

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

    const adServerCurrency = getCurrencyFromBidderRequest(bidderRequest);

    return validBidRequests.map((bidRequest) => {
      const { params } = bidRequest;
      const { targetRef, withCredentials = true, cur } = params;

      const { pageId, impId } = extractPlacementIds(params);

      const domain = getBidderDomain();

      const queryParams = {
        'imp-id': impId,
        'target-ref': targetRef || ortb2?.site?.domain,
        'adapter-version': ADAPTER_VERSION,
        'ssp-id': SSP_ID,
        domain,
      };

      const gdprApplies = Boolean(deepAccess(bidderRequest, 'gdprConsent.gdprApplies'));
      if (gdprApplies) {
        const consentString = deepAccess(bidderRequest, 'gdprConsent.consentString');
        queryParams['gdpr'] = 1;
        queryParams['tcf-consent'] = consentString;
      }

      const adUnitElement = document.getElementById(bidRequest.params.pubcontainerid || bidRequest.adUnitCode);
      const windowContext = getContext(adUnitElement);
      const isIframe = inIframe();
      const coords = isIframe ? getFramePosition() : {
        x: adUnitElement && getBoundingClientRect(adUnitElement).x,
        y: adUnitElement && getBoundingClientRect(adUnitElement).y,
      };

      const imp = {
        id: impId,
        banner: mapBanner(bidRequest),
        native: mapNative(bidRequest),
        video: mapVideo(bidRequest),
        displaymanager: 'Prebid.js',
        displaymanagerver: '$prebid.version$',
        ext: {
          isvisible: isVisible(adUnitElement),
          coords,
        }
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
        device: ortb2?.device ? { ...ortb2.device, ...(ortb2.device.ext ? { ext: { ...ortb2.device.ext } } : {}) } : undefined,
      };

      // Warning: accessing navigator.webdriver may impact fingerprinting scores when this API is included in the built script.
      if (isWebdriverEnabled()) {
        deepSetValue(data, 'device.ext.webdriver', true);
      }

      if (!data?.site?.content?.language) {
        const documentLang = deepAccess(ortb2, 'site.ext.data.documentLang');
        if (documentLang) {
          deepSetValue(data, 'site.content.language', documentLang);
        }
      }

      const eids = deepAccess(bidRequest, 'userIdAsEids');
      if (eids && eids.length) {
        deepSetValue(data, 'user.ext.eids', eids);
      }

      deepSetValue(data, 'ext.isiframe', isIframe);

      if (windowContext) {
        deepSetValue(data, 'device.ext.scroll.top', windowContext.scrollY);
        deepSetValue(data, 'device.ext.scroll.left', windowContext.scrollX);
      }

      const queryParamsString = formatQS(queryParams);

      const request = {
        method: 'POST',
        url: `https://${domain}${BIDDER_URL}/${pageId}?${queryParamsString}`,
        data,
        options: {
          withCredentials,
        },
        bidRequest,
      };

      logInfo('ServerRequest', request);

      return request;
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
  },

  /**
   * Register bidder specific code, which will execute if bidder timed out after an auction
   *
   * @param {Array} timeoutData timeout specific data
   */
  onTimeout: function(timeoutData) {
    eventLog('PREBID_TIMEOUT_EVENT', timeoutData);
  },
  onBidderError: function({ error, bidderRequest }) {
    eventLog('PREBID_BIDDER_ERROR_EVENT', {
      error,
      bidderRequest,
    });
  },
  onBidBillable: function (bid) {
    eventLog('PREBID_BID_BILLABLE_EVENT', bid);
  },
  onAdRenderSucceeded: function (bid) {
    eventLog('PREBID_AD_RENDER_SUCCEEDED_EVENT', bid);
  },
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
 * Maps video parameters from bid request to OpenRTB video object.
 * @param {ExtendedBidRequest} bidRequest
 */
function mapVideo(bidRequest) {
  const videoParams = deepAccess(bidRequest, 'mediaTypes.video');
  if (videoParams) {
    const { sizes, playerSize } = videoParams;

    const format = (playerSize || sizes)?.map((size) => ({ w: size[0], h: size[1] }));

    const [firstSize] = format || [];

    delete videoParams.sizes;

    return {
      ...videoParams,
      w: firstSize?.w,
      h: firstSize?.h,
      format,
    };
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
      ver: 1.2,
      request: JSON.stringify({
        ver: 1.2,
        assets,
        eventtrackers: [
          { event: TRACKER_EVENTS.impression, methods: [TRACKER_METHODS.img] },
        ],
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
  const response = serverResponse.body;
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
    const prBid = {
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

    if (bidReceived.lurl) {
      prBid.lurl = bidReceived.lurl;
    }

    switch (bidReceived.mtype) {
      case ORTB_MTYPES.VIDEO:
        prBid.mediaType = VIDEO;
        prBid.vastXml = bidReceived.adm;
        break;
      case ORTB_MTYPES.NATIVE:
        prBid.mediaType = NATIVE;
        prBid.native = interpretNativeAd(bidReceived, price, currency);
        break;
      case ORTB_MTYPES.BANNER:
        prBid.mediaType = BANNER;
        prBid.ad = bidReceived.adm;
        break;
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

    const impressionTrackers = _map(native.imptrackers || [], (tracker) =>
      replaceAuctionPrice(tracker, price, currency)
    );

    _each(native.eventtrackers || [], (eventtracker) => {
      if (
        eventtracker.event === TRACKER_EVENTS.impression &&
        eventtracker.method === TRACKER_METHODS.img
      ) {
        impressionTrackers.push(
          replaceAuctionPrice(eventtracker.url, price, currency)
        );
      }
    });

    result.impressionTrackers = impressionTrackers;

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

function eventLog(name, resp) {
  const bidderConfig = pbjsConfig.getConfig();

  const samplingRate = bidderConfig?.yandex?.sampling ?? DEFAULT_SAMPLING_RATE;

  if (samplingRate > EVENT_LOG_RANDOM_NUMBER) {
    resp.adapterVersion = ADAPTER_VERSION;
    resp.prebidVersion = '$prebid.version$';

    const data = {
      name: name,
      unixtime: Math.floor(Date.now() / 1000),
      data: resp,
    };

    const domain = getBidderDomain();

    ajax(`https://${domain}${EVENT_TRACKER_URL}`, undefined, JSON.stringify(data), { method: 'POST', withCredentials: true });
  }
}

function getBidderDomain() {
  const bidderConfig = pbjsConfig.getConfig();
  return bidderConfig?.yandex?.domain ?? BIDDER_DOMAIN;
}

/**
 * Determines the appropriate window context for a given DOM element by checking
 * its presence in the current window's DOM or the top-level window's DOM.
 *
 * This is useful for cross-window/frame DOM interactions where security restrictions
 * might apply (e.g., same-origin policy). The function safely handles cases where
 * cross-window access might throw errors.
 *
 * @param {Element|null|undefined} elem - The DOM element to check. Can be falsy.
 * @returns {Window|undefined} Returns the appropriate window object where the element
 * belongs (current window or top window). Returns undefined if the element is not found
 * in either context or if access is denied due to cross-origin restrictions.
 */
function getContext(elem) {
  try {
    // Check if the element exists and is in the current window's DOM
    if (elem) {
      if (window.document.body.contains(elem)) {
        return window; // Element is in current window
      } else if (window.top.document.body.contains(elem)) {
        return window.top; // Element exists in top window's DOM
      }
      return undefined; // Element not found in any accessible context}
    }
  } catch (e) {
    // Handle cases where cross-origin access to top window's DOM is blocked
    return undefined;
  }
}

/**
 * Checks if an element is visible in the DOM
 * @param {Element} elem - The element to check for visibility
 * @returns {boolean} True if the element is visible, false otherwise
 */
function isVisible(elem) {
  // Return false for non-existent elements
  if (!elem) {
    return false;
  }

  // Get the rendering context for the element
  const context = getContext(elem);

  // Return false if no context is available (element not in DOM)
  if (!context) {
    return false;
  }

  let currentElement = elem;
  let iterations = 0;
  const MAX_ITERATIONS = 250;

  // Traverse up the DOM tree to check parent elements
  while (currentElement && iterations < MAX_ITERATIONS) {
    iterations++;

    try {
      // Get computed styles for the current element
      const computedStyle = context.getComputedStyle(currentElement);

      // Check for hiding styles: display: none or visibility: hidden
      const isHidden = computedStyle.display === 'none' ||
                       computedStyle.visibility === 'hidden';

      if (isHidden) {
        return false; // Element is hidden
      }
    } catch (error) {
      // If we can't access styles, assume element is not visible
      return false;
    }

    // Move to the parent element for the next iteration
    currentElement = currentElement.parentElement;
  }

  // If we've reached the root without finding hiding styles, element is visible
  return true;
}

/**
 * Calculates the cumulative position of the current frame within nested iframes.
 * This is useful when you need the absolute position of an element within nested iframes
 * relative to the outermost main window.
 *
 * @returns {Array<number>} [totalLeft, totalTop] - Cumulative left and top offsets in pixels
 */
function getFramePosition() {
  let currentWindow = window;
  let iterationCount = 0;
  let totalLeft = 0;
  let totalTop = 0;
  const MAX_ITERATIONS = 100;

  do {
    iterationCount++;

    try {
      // After first iteration, move to parent window
      if (iterationCount > 1) {
        currentWindow = currentWindow.parent;
      }

      // Get the frame element containing current window and its position
      const frameElement = currentWindow.frameElement;
      const rect = getBoundingClientRect(frameElement);

      // Accumulate frame element's position offsets
      totalLeft += rect.left;
      totalTop += rect.top;
    } catch (error) {
      // Continue processing if we can't access frame element (e.g., cross-origin restriction)
      // Error is ignored as we can't recover frame position information in this case
    }
  } while (iterationCount < MAX_ITERATIONS && currentWindow.parent !== currentWindow.self);

  return { x: totalLeft, y: totalTop };
}

registerBidder(spec);
