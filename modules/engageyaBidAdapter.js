import {
  BANNER,
  NATIVE
} from '../src/mediaTypes.js';

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

export const spec = {
  code: BIDDER_CODE,
  supportedMediaTypes: [BANNER, NATIVE],
  isBidRequestValid: function(bid) {
    return bid && bid.params && bid.params.hasOwnProperty('widgetId') && bid.params.hasOwnProperty('websiteId') && !isNaN(bid.params.widgetId) && !isNaN(bid.params.websiteId);
  },

  buildRequests: function(validBidRequests, bidderRequest) {
    var bidRequests = [];
    if (validBidRequests && validBidRequests.length > 0) {
      validBidRequests.forEach(function(bidRequest) {
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

  interpretResponse: function(serverResponse, bidRequest) {
    const bidResponses = [];
    if (serverResponse.body && serverResponse.body.recs && serverResponse.body.recs.length > 0) {
      var response = serverResponse.body;
      var isNative = response.pbtypeId == 1;
      response.recs.forEach(function(rec) {
        var imageSrc = rec.thumbnail_path.indexOf('http') == -1 ? 'https:' + rec.thumbnail_path : rec.thumbnail_path;
        if (isNative) {
          bidResponses.push({
            requestId: response.ireqId,
            cpm: rec.ecpm,
            width: response.imageWidth,
            height: response.imageHeight,
            creativeId: rec.postId,
            currency: 'USD',
            netRevenue: false,
            ttl: 360,
            native: {
              title: rec.title,
              body: '',
              image: {
                url: imageSrc,
                width: response.imageWidth,
                height: response.imageHeight
              },
              privacyLink: '',
              clickUrl: rec.clickUrl,
              displayUrl: rec.url,
              cta: '',
              sponsoredBy: rec.displayName,
              impressionTrackers: [],
            },
          });
        } else {
          // var htmlTag = "<img src='https://www.google.com/images/branding/googlelogo/1x/googlelogo_color_272x92dp.png' style='position: absolute; left: 50%; top:50%; margin-left: -113px; margin-top:-79px;'>";
          var htmlTag = '<html><div id="ENG_TAG"><a href="' + rec.clickUrl + '" target=_blank><img src="' + imageSrc + '" style="width:' + response.imageWidth + 'px;height:' + response.imageHeight + 'px;"/></a></div></html>';
          var tag = rec.tag ? rec.tag : htmlTag;
          bidResponses.push({
            requestId: response.ireqId,
            cpm: rec.ecpm,
            width: response.imageWidth,
            height: response.imageHeight,
            creativeId: rec.postId,
            currency: 'USD',
            netRevenue: false,
            ttl: 360,
            ad: tag,
          });
        }
      });
    }

    return bidResponses;
  }
};

registerBidder(spec);
