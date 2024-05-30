import { BANNER, NATIVE } from '../src/mediaTypes.js';
import { createTrackPixelHtml } from '../src/utils.js';
import {registerBidder} from '../src/adapters/bidderFactory.js';
import { convertOrtbRequestToProprietaryNative } from '../src/native.js';

const BIDDER_CODE = 'engageya';
const ENDPOINT_URL = 'https://recs.engageya.com/rec-api/getrecs.json';
const ENDPOINT_METHOD = 'GET';
const MAX_DEVIATION = 0.05;
const SUPPORTED_SIZES = [
  [100, 75], [236, 202], [100, 100], [130, 130], [200, 200], [250, 250], [300, 272], [300, 250], [300, 230], [300, 214], [300, 187], [300, 166], [300, 150], [300, 133], [300, 120], [400, 200], [300, 200], [250, 377], [620, 410], [207, 311], [310, 166], [310, 333], [190, 106], [228, 132], [300, 174], [80, 60], [600, 500], [600, 600], [1080, 610], [1080, 610], [624, 350], [650, 1168], [1080, 1920], [300, 374], [336, 280]
];

function getPageUrl(bidRequest, bidderRequest) {
  if (bidRequest.params.pageUrl && bidRequest.params.pageUrl != '[PAGE_URL]') {
    return bidRequest.params.pageUrl;
  }
  if (bidderRequest && bidderRequest.refererInfo && bidderRequest.refererInfo.page) {
    return bidderRequest.refererInfo.page;
  }
  // TODO: does this fallback make sense?
  const pageUrl = (isInIframe() && document.referrer)
    ? document.referrer
    : window.location.href;
  return encodeURIComponent(pageUrl);
}

function isInIframe() {
  try {
    var isInIframe = (window.self !== window.top);
  } catch (e) {
    isInIframe = true;
  }
  return isInIframe;
}

function getImageSrc(rec) {
  return rec.thumbnail_path.indexOf('http') === -1 ? 'https:' + rec.thumbnail_path : rec.thumbnail_path;
}

function getImpressionTrackers(rec, response) {
  const responseTrackers = [response.viewPxl];
  if (!rec.trackers) {
    return responseTrackers;
  }
  const impressionTrackers = rec.trackers.impressionPixels || [];
  const viewTrackers = rec.trackers.viewPixels || [];
  return [...impressionTrackers, ...viewTrackers, ...responseTrackers];
}

function parseNativeResponse(rec, response) {
  return {
    title: rec.title,
    body: '',
    image: {
      url: getImageSrc(rec),
      width: response.imageWidth,
      height: response.imageHeight
    },
    privacyLink: '',
    clickUrl: rec.clickUrl,
    displayUrl: rec.url,
    cta: '',
    sponsoredBy: rec.displayName,
    impressionTrackers: getImpressionTrackers(rec, response),
  };
}

function parseBannerResponse(rec, response) {
  if (rec.tag) {
    return rec.tag;
  }
  let style;
  try {
    let additionalData = JSON.parse(response.widget.additionalData);
    const css = additionalData.css || '';
    style = css ? `<style>${css}</style>` : '';
  } catch (e) {
    style = '';
  }
  const title = rec.title && rec.title.trim() ? `<div class="eng_tag_ttl" style="display: none">${rec.title}</div>` : '';
  const displayName = rec.displayName && title ? `<div class="eng_tag_brnd" style="display: none">${rec.displayName}</div>` : '';
  const trackers = getImpressionTrackers(rec, response)
    .map((url) => createTrackPixelHtml(url))
    .join('');
  return `<html><body>${style}<div id="ENG_TAG"><a href="${rec.clickUrl}" target=_blank><img class="eng_tag_img" src="${getImageSrc(rec)}" style="width:${response.imageWidth}px;height:${response.imageHeight}px;" alt="${rec.title}"/>${displayName}${title}</a>${trackers}</div></body></html>`;
}

function getImageSize(bidRequest) {
  if (bidRequest.sizes && bidRequest.sizes.length > 0) {
    return bidRequest.sizes[0];
  } else if (bidRequest.nativeParams && bidRequest.nativeParams.image && bidRequest.nativeParams.image.sizes) {
    return bidRequest.nativeParams.image.sizes;
  }
  return [-1, -1];
}

function isValidSize([width, height]) {
  if (!width || !height) {
    return false;
  }
  return SUPPORTED_SIZES.some(([supportedWidth, supportedHeight]) => {
    if (supportedWidth === width && supportedHeight === height) {
      return true;
    }
    const supportedRatio = supportedWidth / supportedHeight;
    const ratioDeviation = supportedRatio / width * height;
    if (Math.abs(ratioDeviation - 1) > MAX_DEVIATION) {
      return false;
    }
    return supportedWidth > width ||
      (width - supportedWidth) / width <= MAX_DEVIATION;
  });
}

export const spec = {
  code: BIDDER_CODE,
  supportedMediaTypes: [BANNER, NATIVE],

  isBidRequestValid: function (bidRequest) {
    return bidRequest &&
      bidRequest.params &&
      bidRequest.params.hasOwnProperty('widgetId') &&
      bidRequest.params.hasOwnProperty('websiteId') &&
      !isNaN(bidRequest.params.widgetId) &&
      !isNaN(bidRequest.params.websiteId) &&
      isValidSize(getImageSize(bidRequest));
  },

  buildRequests: function (validBidRequests, bidderRequest) {
    // convert Native ORTB definition to old-style prebid native definition
    validBidRequests = convertOrtbRequestToProprietaryNative(validBidRequests);

    if (!validBidRequests) {
      return [];
    }
    return validBidRequests.map(bidRequest => {
      if (bidRequest.params) {
        const mediaType = bidRequest.hasOwnProperty('nativeParams') ? 1 : 2;
        const [imageWidth, imageHeight] = getImageSize(bidRequest);
        const widgetId = bidRequest.params.widgetId;
        const websiteId = bidRequest.params.websiteId;
        const pageUrl = getPageUrl(bidRequest, bidderRequest);
        const bidId = bidRequest.bidId;
        let finalUrl = ENDPOINT_URL + '?pubid=0&webid=' + websiteId + '&wid=' + widgetId + '&url=' + pageUrl + '&ireqid=' + bidId + '&pbtpid=' + mediaType + '&imw=' + imageWidth + '&imh=' + imageHeight;
        if (bidderRequest && bidderRequest.gdprConsent && bidderRequest.gdprApplies && bidderRequest.consentString) {
          finalUrl += '&is_gdpr=1&gdpr_consent=' + bidderRequest.consentString;
        }
        return {
          url: finalUrl,
          method: ENDPOINT_METHOD,
          data: ''
        };
      }
    }).filter(Boolean);
  },

  interpretResponse: function (serverResponse, bidRequest) {
    if (!serverResponse.body || !serverResponse.body.recs || !serverResponse.body.recs.length) {
      return [];
    }
    var response = serverResponse.body;
    var isNative = response.pbtypeId == 1;
    return response.recs.map(rec => {
      let bid = {
        requestId: response.ireqId,
        width: response.imageWidth,
        height: response.imageHeight,
        creativeId: rec.postId,
        cpm: rec.pecpm || (rec.ecpm / 100),
        currency: 'USD',
        netRevenue: !!rec.pecpm,
        ttl: 360,
        meta: { advertiserDomains: rec.domain ? [rec.domain] : [] },
      }
      if (isNative) {
        bid.native = parseNativeResponse(rec, response);
      } else {
        bid.ad = parseBannerResponse(rec, response);
      }
      return bid;
    });
  }
};

registerBidder(spec);
