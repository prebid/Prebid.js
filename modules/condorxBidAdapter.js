import { BANNER, NATIVE } from '../src/mediaTypes.js';
import { createTrackPixelHtml, inIframe } from '../src/utils.js';
import { registerBidder } from '../src/adapters/bidderFactory.js';
import { convertOrtbRequestToProprietaryNative } from '../src/native.js';
import { ortbConverter } from '../libraries/ortbConverter/converter.js';

const BIDDER_CODE = 'condorx';
const API_URL = 'https://api.condorx.io/cxb/get.json';
const ORTB_API_BASE = 'https://api.condorx.io/cxb';
const REQUEST_METHOD = 'GET';
const ORTB_REQUEST_METHOD = 'POST';

const converter = ortbConverter({
  context: {
    netRevenue: true,
    ttl: 360
  },
  imp(buildImp, bidRequest, context) {
    const imp = buildImp(bidRequest, context);

    // Add CondorX specific extensions
    imp.ext = {
      widget: bidRequest.params.widget,
      website: bidRequest.params.website,
      ...imp.ext
    };

    return imp;
  },
  request(buildRequest, imps, bidderRequest, context) {
    const request = buildRequest(imps, bidderRequest, context);

    // Add CondorX specific extensions
    request.ext = {
      website: bidderRequest.bids[0].params.website,
      widget: bidderRequest.bids[0].params.widget,
      ...request.ext
    };

    return request;
  },
  bidResponse(buildBidResponse, bid, context) {
    const bidResponse = buildBidResponse(bid, context);

    // Handle CondorX specific response format
    if (bid.ext && bid.ext.condorx) {
      bidResponse.meta = {
        ...bidResponse.meta,
        advertiserDomains: bid.ext.condorx.domain ? [bid.ext.condorx.domain] : []
      };
    }

    return bidResponse;
  }
});

function getBidRequestUrl(bidRequest, bidderRequest) {
  if (bidRequest.params.url && bidRequest.params.url !== 'current url') {
    return bidRequest.params.url;
  }
  return getBidderRequestUrl(bidderRequest);
}

function getBidderRequestUrl(bidderRequest) {
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
  if (tile.adm) {
    return tile.adm;
  }
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

function getValidAdSize(bidRequest) {
  const sizes = getBidderAdSizes(bidRequest);
  return sizes.find(isValidAdSize);
}

function getBidderAdSizes(bidRequest) {
  if (bidRequest.sizes && bidRequest.sizes.length > 0) {
    return bidRequest.sizes;
  } else if (bidRequest.nativeParams && bidRequest.nativeParams.image && bidRequest.nativeParams.image.sizes) {
    return [bidRequest.nativeParams.image.sizes];
  }
  return [[-1, -1]];
}

function isValidAdSize([width, height]) {
  return width > 0 && height > 0;
}

function getAdSize(bidRequest) {
  const validSize = getValidAdSize(bidRequest);
  return validSize || [300, 250]; // Default fallback size
}

function getBidFloor(bidRequest) {
  if (bidRequest.params && bidRequest.params.bidfloor && !isNaN(bidRequest.params.bidfloor)) {
    return parseFloat(bidRequest.params.bidfloor);
  }
  if (typeof bidRequest.getFloor === 'function') {
    try {
      const floorInfo = bidRequest.getFloor({
        currency: 'USD',
        mediaType: bidRequest.nativeParams ? 'native' : 'banner',
        size: getAdSize(bidRequest) || [300, 250]
      });
      return floorInfo.floor || -1;
    } catch (e) {
      return -1;
    }
  }

  return -1;
}

function getOpenRTBEndpoint(bidRequest) {
  const websiteWidget = `${bidRequest.params.website}_${bidRequest.params.widget}`;
  const base64WebsiteWidget = btoa(websiteWidget);
  return `${ORTB_API_BASE}/${base64WebsiteWidget}/openrtb.json`;
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
      !!getValidAdSize(bidRequest);
  },

  buildRequests: function (validBidRequests, bidderRequest) {
    const useOpenRTB = validBidRequests[0].params.useOpenRTB === true;

    if (useOpenRTB) {
      // Use Prebid's ORTB converter
      const ortbRequest = converter.toORTB({
        bidderRequest,
        bidRequests: validBidRequests
      });

      return [{
        url: getOpenRTBEndpoint(validBidRequests[0]),
        method: ORTB_REQUEST_METHOD,
        data: ortbRequest,
        bids: validBidRequests,
        options: {},
        ortbRequest // Store for response processing
      }];
    }

    // Legacy format
    validBidRequests = convertOrtbRequestToProprietaryNative(validBidRequests);

    if (!validBidRequests || !validBidRequests.length) {
      return [];
    }

    return validBidRequests.map(bidRequest => {
      if (bidRequest.params) {
        const mediaType = bidRequest.hasOwnProperty('nativeParams') ? 1 : 2;
        const [imageWidth, imageHeight] = getValidAdSize(bidRequest);
        const widgetId = bidRequest.params.widget;
        const websiteId = bidRequest.params.website;
        const pageUrl = getBidRequestUrl(bidRequest, bidderRequest);
        const bidFloor = getBidFloor(bidRequest);

        let subid;
        try {
          let url
          try {
            url = new URL(pageUrl);
          } catch (e) {
            url = new URL(getBidderRequestUrl(bidderRequest))
          }
          subid = url.hostname;
        } catch (e) {
          subid = widgetId;
        }
        const bidId = bidRequest.bidId;
        let apiUrl = `${API_URL}?w=${websiteId}&wg=${widgetId}&u=${pageUrl}&s=${subid}&p=0&ireqid=${bidId}&prebid=${mediaType}&imgw=${imageWidth}&imgh=${imageHeight}&bf=${bidFloor}`;

        if (bidderRequest && bidderRequest.gdprConsent && bidderRequest.gdprApplies && bidderRequest.consentString) {
          apiUrl += `&g=1&gc=${bidderRequest.consentString}`;
        }
        return {
          url: apiUrl,
          method: REQUEST_METHOD,
          data: ''
        };
      }
      return undefined;
    }).filter(Boolean);
  },

  interpretResponse: function (serverResponse, bidRequest) {
    if (bidRequest.ortbRequest) {
      const response = converter.fromORTB({
        request: bidRequest.ortbRequest,
        response: serverResponse.body
      });
      return response.bids;
    }

    // Legacy format response
    if (!serverResponse.body || !serverResponse.body.tiles || !serverResponse.body.tiles.length) {
      return [];
    }
    const response = serverResponse.body;
    const isNative = response.pbtypeId === 1;
    return response.tiles.map(tile => {
      const bid = {
        requestId: response.ireqId,
        width: response.imageWidth,
        height: response.imageHeight,
        creativeId: tile.postId,
        cpm: tile.pcpm || (tile.ecpm / 100),
        currency: 'USD',
        netRevenue: !!tile.pcpm,
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
