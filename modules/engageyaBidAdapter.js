import {
  BANNER,
  NATIVE
} from '../src/mediaTypes.js';
import { createTrackPixelHtml } from '../src/utils.js';

const {
  registerBidder
} = require('../src/adapters/bidderFactory.js');
const BIDDER_CODE = 'engageya';
const ENDPOINT_URL = 'https://recs.engageya.com/rec-api/getrecs.json';
const ENDPOINT_METHOD = 'GET';

function getPageUrl() {
  var pUrl = window.location.href;
  if (isInIframe()) {
    pUrl = document.referrer ? document.referrer : pUrl;
  }
  pUrl = encodeURIComponent(pUrl);
  return pUrl;
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

function getImpressionTrackers(rec) {
  if (!rec.trackers) {
    return [];
  }
  const impressionTrackers = rec.trackers.impressionPixels || [];
  const viewTrackers = rec.trackers.viewPixels || [];
  return [...impressionTrackers, ...viewTrackers];
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
    impressionTrackers: getImpressionTrackers(rec),
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
  const trackers = getImpressionTrackers(rec)
    .map(createTrackPixelHtml)
    .join('');
  return `<html><body>${style}<div id="ENG_TAG"><a href="${rec.clickUrl}" target=_blank><img class="eng_tag_img" src="${getImageSrc(rec)}" style="width:${response.imageWidth}px;height:${response.imageHeight}px;" alt="${rec.title}"/>${displayName}${title}</a>${trackers}</div></body></html>`;
}

export const spec = {
  code: BIDDER_CODE,
  supportedMediaTypes: [BANNER, NATIVE],
  isBidRequestValid: function (bid) {
    return bid && bid.params && bid.params.hasOwnProperty('widgetId') && bid.params.hasOwnProperty('websiteId') && !isNaN(bid.params.widgetId) && !isNaN(bid.params.websiteId);
  },

  buildRequests: function (validBidRequests, bidderRequest) {
    var bidRequests = [];
    if (validBidRequests && validBidRequests.length > 0) {
      validBidRequests.forEach(function (bidRequest) {
        if (bidRequest.params) {
          var mediaType = bidRequest.hasOwnProperty('nativeParams') ? 1 : 2;
          var imageWidth = -1;
          var imageHeight = -1;
          if (bidRequest.sizes && bidRequest.sizes.length > 0) {
            imageWidth = bidRequest.sizes[0][0];
            imageHeight = bidRequest.sizes[0][1];
          } else if (bidRequest.nativeParams && bidRequest.nativeParams.image && bidRequest.nativeParams.image.sizes) {
            imageWidth = bidRequest.nativeParams.image.sizes[0];
            imageHeight = bidRequest.nativeParams.image.sizes[1];
          }

          var widgetId = bidRequest.params.widgetId;
          var websiteId = bidRequest.params.websiteId;
          var pageUrl = (bidRequest.params.pageUrl && bidRequest.params.pageUrl != '[PAGE_URL]') ? bidRequest.params.pageUrl : '';
          if (!pageUrl) {
            pageUrl = (bidderRequest && bidderRequest.refererInfo && bidderRequest.refererInfo.referer) ? bidderRequest.refererInfo.referer : getPageUrl();
          }
          var bidId = bidRequest.bidId;
          var finalUrl = ENDPOINT_URL + '?pubid=0&webid=' + websiteId + '&wid=' + widgetId + '&url=' + pageUrl + '&ireqid=' + bidId + '&pbtpid=' + mediaType + '&imw=' + imageWidth + '&imh=' + imageHeight;
          if (bidderRequest && bidderRequest.gdprConsent && bidderRequest.gdprApplies && bidderRequest.consentString) {
            finalUrl += '&is_gdpr=1&gdpr_consent=' + bidderRequest.consentString;
          }
          bidRequests.push({
            url: finalUrl,
            method: ENDPOINT_METHOD,
            data: ''
          });
        }
      });
    }

    return bidRequests;
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
        cpm: rec.ecpm,
        width: response.imageWidth,
        height: response.imageHeight,
        creativeId: rec.postId,
        currency: 'USD',
        netRevenue: false,
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
