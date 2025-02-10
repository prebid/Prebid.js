import { BANNER, NATIVE } from '../src/mediaTypes.js';
import { createTrackPixelHtml, inIframe } from '../src/utils.js';
import { registerBidder } from '../src/adapters/bidderFactory.js';
import { convertOrtbRequestToProprietaryNative } from '../src/native.js';

const BIDDER_CODE = 'condorx';
const API_URL = 'https://api.condorx.io/cxb/get.json';
const REQUEST_METHOD = 'GET';
const MAX_SIZE_DEVIATION = 0.05;
const SUPPORTED_AD_SIZES = [
  [100, 100], [200, 200], [300, 250], [400, 200], [300, 200], [600, 600], [650, 1168], [236, 202], [1080, 1920], [300, 374]
];

function getBidRequestUrl(bidRequest, bidderRequest) {
  if (bidRequest.params.url && bidRequest.params.url !== 'current url') {
    return bidRequest.params.url;
  }
  if (bidderRequest && bidderRequest.refererInfo && bidderRequest.refererInfo.page) {
    return bidderRequest.refererInfo.page;
  }
  const pageUrl = inIframe() && document.referrer ? document.referrer : window.location.href;
  return encodeURIComponent(pageUrl);
}

function getTileImageUrl(tile) {
  return tile.imageUrl.indexOf('http') === -1 ? 'https:' + tile.imageUrl : tile.imageUrl;
}

function collectImpressionTrackers(tile, response) {
  const trackers = [response.widgetViewPixel];
  if (!tile.trackers) return trackers;
  const impressionTrackers = tile.trackers.impressionPixels || [];
  const viewTrackers = tile.trackers.viewPixels || [];
  return [...impressionTrackers, ...viewTrackers, ...trackers];
}

function parseNativeAdResponse(tile, response) {
  return {
    title: tile.title,
    body: '',
    image: {
      url: getTileImageUrl(tile),
      width: response.imageWidth,
      height: response.imageHeight
    },
    privacyLink: '',
    clickUrl: tile.clickUrl,
    displayUrl: tile.url,
    cta: '',
    sponsoredBy: tile.displayName,
    impressionTrackers: collectImpressionTrackers(tile, response),
  };
}

function parseBannerAdResponse(tile, response) {
  if (tile.tag) {
    return tile.tag;
  }
  let style = '';
  try {
    const config = JSON.parse(response.widget.config);
    const css = config.css || '';
    style = css ? `<style>${css}</style>` : '';
  } catch (e) {
    style = '';
  }
  const title = tile.title && tile.title.trim() ? `<div class="__condorx_banner_title" style="display: none">${tile.title}</div>` : '';
  const displayName = tile.displayName && title ? `<div class="__condorx_banner_branding" style="display: none">${tile.displayName}</div>` : '';
  const trackers = collectImpressionTrackers(tile, response)
    .map((url) => createTrackPixelHtml(url))
    .join('');
  return `<html><body>${style}<div id="__CONDORX__BANNER"><a href="${tile.clickUrl}" target=_blank><img class="__condorx_banner_image" src="${getTileImageUrl(tile)}" style="width:${response.imageWidth}px;height:${response.imageHeight}px;" alt="${tile.title}"/>${displayName}${title}</a>${trackers}</div></body></html>`;
}

function getAdSize(bidRequest) {
  if (bidRequest.sizes && bidRequest.sizes.length > 0) {
    return bidRequest.sizes[0];
  } else if (bidRequest.nativeParams && bidRequest.nativeParams.image && bidRequest.nativeParams.image.sizes) {
    return bidRequest.nativeParams.image.sizes;
  }
  return [-1, -1];
}

function isValidAdSize([width, height]) {
  if (!width || !height) {
    return false;
  }
  return SUPPORTED_AD_SIZES.some(([supportedWidth, supportedHeight]) => {
    if (supportedWidth === width && supportedHeight === height) {
      return true;
    }
    const supportedRatio = supportedWidth / supportedHeight;
    const ratioDeviation = supportedRatio / width * height;
    return Math.abs(ratioDeviation - 1) <= MAX_SIZE_DEVIATION && (supportedWidth > width || (width - supportedWidth) / width <= MAX_SIZE_DEVIATION);
  });
}

export const bidderSpec = {
  code: BIDDER_CODE,
  supportedMediaTypes: [BANNER, NATIVE],

  isBidRequestValid: function (bidRequest) {
    return bidRequest &&
      bidRequest.params &&
      bidRequest.params.hasOwnProperty('widget') &&
      bidRequest.params.hasOwnProperty('website') &&
      !isNaN(bidRequest.params.widget) &&
      !isNaN(bidRequest.params.website) &&
      isValidAdSize(getAdSize(bidRequest));
  },

  buildRequests: function (validBidRequests, bidderRequest) {
    validBidRequests = convertOrtbRequestToProprietaryNative(validBidRequests);

    if (!validBidRequests) {
      return [];
    }
    return validBidRequests.map(bidRequest => {
      if (bidRequest.params) {
        const mediaType = bidRequest.hasOwnProperty('nativeParams') ? 1 : 2;
        const [imageWidth, imageHeight] = getAdSize(bidRequest);
        const widgetId = bidRequest.params.widget;
        const websiteId = bidRequest.params.website;
        const pageUrl = getBidRequestUrl(bidRequest, bidderRequest);
        const bidId = bidRequest.bidId;
        let apiUrl = `${API_URL}?w=${websiteId}&wg=${widgetId}&u=${pageUrl}&p=0&ireqid=${bidId}&prebid=${mediaType}&imgw=${imageWidth}&imgh=${imageHeight}`;
        if (bidderRequest && bidderRequest.gdprConsent && bidderRequest.gdprApplies && bidderRequest.consentString) {
          apiUrl += `&g=1&gc=${bidderRequest.consentString}`;
        }
        return {
          url: apiUrl,
          method: REQUEST_METHOD,
          data: ''
        };
      }
    }).filter(Boolean);
  },

  interpretResponse: function (serverResponse, bidRequest) {
    if (!serverResponse.body || !serverResponse.body.tiles || !serverResponse.body.tiles.length) {
      return [];
    }
    const response = serverResponse.body;
    const isNative = response.pbtypeId === 1;
    return response.tiles.map(tile => {
      let bid = {
        requestId: response.ireqId,
        width: response.imageWidth,
        height: response.imageHeight,
        creativeId: tile.postId,
        cpm: tile.pecpm || (tile.ecpm / 100),
        currency: 'USD',
        netRevenue: !!tile.pecpm,
        ttl: 360,
        meta: { advertiserDomains: tile.domain ? [tile.domain] : [] },
      };
      if (isNative) {
        bid.native = parseNativeAdResponse(tile, response);
      } else {
        bid.ad = parseBannerAdResponse(tile, response);
      }
      return bid;
    });
  }
};

registerBidder(bidderSpec);
