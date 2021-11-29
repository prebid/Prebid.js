/*
 * Vibrant Media Ltd.
 *
 * Prebid Adapter for sending bid requests to the Vibrant Prebid Server and bid responses back to the Prebid client
 *
 * Note: Only BANNER and VIDEO are currently supported by the Vibrant Prebid Server.
 */

import { createTrackPixelHtml, logError, logWarn, logInfo } from '../src/utils.js';
import { Renderer } from '../src/Renderer.js';
import { registerBidder } from '../src/adapters/bidderFactory.js';
import { BANNER, NATIVE, VIDEO } from '../src/mediaTypes.js';
import { OUTSTREAM } from '../src/video.js';

const BIDDER_CODE = 'vibrantmedia';
const VIBRANT_PREBID_URL = 'https://k.intellitxt.com/prebid';
const AD_TYPE_IDS = {
  BANNER: 1,
  NATIVE: 2,
  VIDEO: 3,
};
const DEFAULT_CURRENCY = 'GBP';
const BID_TTL_SECS = 5 * 60; // 5 minutes
const VIBRANT_VAST_PLAYER = 'vibrant-player';
const SUPPORTED_MEDIA_TYPES = [ BANNER, NATIVE, VIDEO ];

/**
 * Returns whether the given bid request contains at least one supported media request, which has valid data. (We can
 * ignore invalid/unsupported ones, as they will be filtered out by the prebid server.)
 *
 * @param {*} bidRequest the bid requests sent by the Prebid API.
 *
 * @return {boolean} true if the given bid request contains at least one supported media request with valid details,
 *                   otherwise false.
 */
const areValidSupportedMediaTypesPresent = function areSupportedMediaTypesPresent(bidRequest) {
  const mediaTypes = Object.keys(bidRequest.mediaTypes);

  return mediaTypes.some(function forSomeMediaTypes(mediaType) {
    if (mediaType === BANNER) {
      return bidRequest.mediaTypes[BANNER].sizes.some(function forSomeVideoSize(size) {
        return (size[0] === 300) && (size[1] === 250);
      });
    } else if (mediaType === VIDEO) {
      const videoMediaType = bidRequest.mediaTypes[VIDEO];
      const sizes = videoMediaType.sizes || videoMediaType.playerSize;

      return (videoMediaType.context === OUTSTREAM) && sizes.some(function forSomeVideoSize(size) {
        return (size[0] === 300) && (size[1] === 250);
      });
    } else {
      return false;
    }
  });
};

/**
 * Returns a new outstream video renderer for the given bidder response.
 * @param {{}} bidderResponse the bid response to create the renderer for.
 * @returns {Renderer} a new renderer for the given bidder response.
 */
const getNewRenderer = function getNewRenderer(bidderResponse) {
  const addOutstreamRenderer = function addOutstreamRenderer(bid) {
    const bidVideo = bid.adResponse.ad.video;

    bid.renderer.push(function bidRenderer() {
      window[VIBRANT_VAST_PLAYER].setAdUnit({
        vast_tag: bidVideo.vtag,
        ad_unit_code: bid.adUnitCode, // Video renderer div id
        width: bid.width,
        height: bid.height,
        progress: bidVideo.progress,
        loop: bidVideo.loop,
        inread: bidVideo.inread,
      });
    });
  };

  const renderer = Renderer.install({
    id: bidderResponse.id.prebid_id,
    url: bidderResponse.ad.video.purl,
    loaded: false,
  });

  try {
    renderer.setRender(addOutstreamRenderer);
  } catch (err) {
    logWarn('Pre-bid failed while creating new outstream renderer', err);
  }

  return renderer;
};

/**
 * Transforms the video ad bid in the given Vibrant Prebid Server response into the Prebid format and adds it to the
 * given parsed bid.
 *
 * TODO: Should this be needed? This adapter should be thin, so the correct format should be returned by the server.
 *
 * @param {*} parsedBid          the bid object to add the video bid data to.
 * @param {*} serverResponseBody the response from the Vibrant Prebid Server to get the video bid from.
 *
 * @return {void}
 */
const addVideoDataToParsedBid = function addVideoDataToParsedBid(parsedBid, serverResponseBody) {
  const videoAd = serverResponseBody.ad.video;
  const newRenderer = getNewRenderer(serverResponseBody);

  parsedBid.vastXml = videoAd.vtag;
  parsedBid.width = videoAd.w;
  parsedBid.height = videoAd.h;
  parsedBid.renderer = newRenderer;
  parsedBid.adResponse = serverResponseBody;
  parsedBid.mediaType = VIDEO;

  parsedBid.meta.advertiserDomains.push(videoAd.adomain);
};

/**
 * Transforms the banner ad bid in the given Vibrant Prebid Server response into the Prebid format and adds it to the
 * given parsed bid.
 *
 * TODO: Should this be needed? This adapter should be thin, so the correct format should be returned by the server.
 *
 * @param {*} parsedBid          the bid object to add the banner bid data to.
 * @param {*} serverResponseBody the response from the Vibrant Prebid Server to get the banner bid from.
 *
 * @return {void}
 */
const addBannerDataToParsedBid = function addBannerDataToParsedBid(parsedBid, serverResponseBody) {
  const bannerAd = serverResponseBody.ad.banner;

  parsedBid.width = bannerAd.w;
  parsedBid.height = bannerAd.h;
  parsedBid.ad = bannerAd.tag;
  parsedBid.mediaType = BANNER;

  bannerAd.imps.forEach(function forEachBannerAdImpression(imp) {
    try {
      const tracker = createTrackPixelHtml(imp);
      parsedBid.ad += tracker;
    } catch (err) {
      logError('Unable to create tracking pixel for ad impression');
    }

    parsedBid.meta.advertiserDomains.push(bannerAd.adomain);
  });
};

/**
 * Transforms the native ad bid in the given Vibrant Prebid Server response into the Prebid format and adds it to the
 * given parsed bid.
 *
 * TODO: Should this be needed? This adapter should be thin, so the correct format should be returned by the server.
 *
 * @param {*} parsedBid          the bid object to add the native bid data to.
 * @param {*} serverResponseBody the response from the Vibrant Prebid Server to get the native bid from.
 *
 * @return {void}
 */
const addNativeDataToParsedBid = function addNativeDataToParsedBid(parsedBid, serverResponseBody) {
  const nativeAds = serverResponseBody.ad.native.template_and_ads.ads;

  if (nativeAds.length === 0) {
    return;
  }

  const nativeAd = nativeAds[0];
  const assets = nativeAd.assets;

  parsedBid.mediaType = NATIVE;
  parsedBid.native = {
    title: assets.title,
    body: assets.description,
    cta: assets.cta_text,
    sponsoredBy: assets.sponsor,
    clickUrl: assets.lp_link,
    impressionTrackers: nativeAd.imps,
    privacyLink: assets.adchoice_url,
  };

  if (typeof assets.img_main !== 'undefined') {
    parsedBid.native.image = {
      url: assets.img_main,
      width: parseInt(assets.img_main_width, 10),
      height: parseInt(assets.img_main_height, 10),
    };
  }

  if (typeof assets.img_icon !== 'undefined') {
    parsedBid.native.icon = {
      url: assets.img_icon,
      width: parseInt(assets.img_icon_width, 10),
      height: parseInt(assets.img_icon_height, 10),
    };
  }

  parsedBid.meta.advertiserDomains.push(nativeAd.adomain);
};

/**
 * Returns transformed bid requests that are in a format native to the Vibrant Prebid Server.
 *
 * @param {*[]} bidRequests the bid requests sent by the Prebid API.
 *
 * @returns {*[]} the transformed bid requests.
 */
const transformBidRequests = function transformBidRequests(bidRequests) {
  const transformedBidRequests = [];

  bidRequests.forEach(function forEachBidRequestToTransform(bidRequest) {
    // TODO: This is a bit dodgy, we should know exactly which fields to get data from in the request
    const transformedBidRequest = {
      code: bidRequest.adUnitCode || bidRequest.code,
      id: bidRequest.bidId || bidRequest.transactionId,
      bidder: bidRequest.bidder || ((bidRequest.bids && bidRequest.bids.length !== 0) ? bidRequest.bids[0] : {}).bidder,
      mediaTypes: bidRequest.mediaTypes
    };

    if (bidRequest.sizes) {
      transformedBidRequest.sizes = bidRequest.sizes;
    }

    transformedBidRequests.push(transformedBidRequest);
  });

  return transformedBidRequests;
};

/** @type {BidderSpec} */
export const spec = {
  code: BIDDER_CODE,
  supportedMediaTypes: SUPPORTED_MEDIA_TYPES,

  /**
   * Transforms the 'raw' bid params into ones that this adapter can use, prior to creating the bid request.
   *
   * @param {object} bidParams the params to transform.
   *
   * @returns {object} the bid params.
   */
  transformBidParams: function transformBidParams(bidParams) {
    return bidParams;
  },

  /**
   * Determines whether or not the given bid request is valid. For all bid requests passed to the buildRequests
   * function, each will have been passed to this function and this function will have returned true.
   *
   * @param {object} bid the bid params to validate.
   *
   * @return {boolean} true if this is a valid bid, otherwise false.
   * @see SUPPORTED_MEDIA_TYPES
   */
  isBidRequestValid: function isBidRequestValid(bid) {
    const areBidRequestParamsValid = !!(bid.params.placementId || (bid.params.member && bid.params.invCode));
    const isValid = areBidRequestParamsValid && areValidSupportedMediaTypesPresent(bid);

    logInfo('Bid req valid = ' + isValid + ' for ' + JSON.stringify(bid));

    return isValid;
  },

  /**
   * Return prebid server request data from the list of bid requests.
   *
   * @param {BidRequest[]}  validBidRequests an array of bids validated via the isBidRequestValid function.
   * @param {BidderRequest} bidderRequest    an object with data common to all bid requests.
   *
   * @return ServerRequest Info describing the request to the prebid server.
   */
  buildRequests: function buildRequests(validBidRequests, bidderRequest) {
    const transformedBidRequests = transformBidRequests(validBidRequests);

    const prebidData = {
      url: window.parent.location.href,
      gdpr: bidderRequest.gdprConsent,
      window: {
        width: window.innerWidth,
        height: window.innerHeight,
      },
      biddata: transformedBidRequests,
    };

    return {
      method: 'POST',
      url: VIBRANT_PREBID_URL,
      data: JSON.stringify(prebidData)
    };
  },

  /**
   * Translate the Kormorant prebid server response into a list of bids.
   *
   * @param {ServerResponse} serverResponse a successful response from the server.
   * @param {BidRequest}     bidRequest     the original bid request associated with this response.
   *
   * @return {Bid[]} an array of bids which were nested inside the server.
   */
  interpretResponse: function interpretResponse(serverResponse, bidRequest) {
    const serverResponseBody = serverResponse.body;
    const bids = serverResponseBody.bids;

    const parsedBids = [];

    bids.forEach(function forEachBid(bid) {
      logInfo('Bid request: ' + JSON.stringify(bidRequest));

      const parsedBid = {
        requestId: bid.prebid_id,
        cpm: bid.price,
        creativeId: bid.creative_id,
        dealId: bid.deal_id,
        currency: bid.currency || DEFAULT_CURRENCY,
        netRevenue: true,
        ttl: BID_TTL_SECS,
        meta: {
          advertiserDomains: [], // This will be filled in later on
        },
      };

      const adTypeId = bid.ad_type;

      if (adTypeId === AD_TYPE_IDS.VIDEO) {
        addVideoDataToParsedBid(parsedBid, serverResponseBody);
      } else if (adTypeId === AD_TYPE_IDS.BANNER) {
        addBannerDataToParsedBid(parsedBid, serverResponseBody);
      } else if (adTypeId === AD_TYPE_IDS.NATIVE) {
        addNativeDataToParsedBid(parsedBid, serverResponseBody);
      } else {
        logError('Unsupported ad type id: ' + adTypeId);
      }

      parsedBids.push(parsedBid);
    });

    return parsedBids;
  },

  /**
   * Called if the Prebid API gives up waiting for a prebid server response.
   *
   * Example timeout data:
   *
   * [{
   *   "bidder": "example",
   *   "bidId": "51ef8751f9aead",
   *   "params": {
   *     ...
   *   },
   *   "adUnitCode": "div-gpt-ad-1460505748561-0",
   *   "timeout": 3000,
   *   "auctionId": "18fd8b8b0bd757"
   * }]
   *
   * @param {{}} timeoutData data relating to the timeout.
   */
  onTimeout: function onTimeout(timeoutData) {
    // TODO: Use logInfo
    logInfo('Timed out waiting for bids: ' + JSON.stringify(timeoutData));
  },

  /**
   * Called when a bid returned by the Vibrant Bidder Service is successful.
   *
   * Example bid won data:
   *
   * {
   *   "bidder": "example",
   *   "width": 300,
   *   "height": 250,
   *   "adId": "330a22bdea4cac",
   *   "mediaType": "banner",
   *   "cpm": 0.28
   *   "ad": "...",
   *   "requestId": "418b37f85e772c",
   *   "adUnitCode": "div-gpt-ad-1460505748561-0",
   *   "size": "350x250",
   *   "adserverTargeting": {
   *     "hb_bidder": "example",
   *     "hb_adid": "330a22bdea4cac",
   *     "hb_pb": "0.20",
   *     "hb_size": "350x250"
   *   }
   * }
   *
   * @param {*} bidData the data associated with the won bid. See example above for data format.
   */
  onBidWon: function onBidWon(bidData) {
    // TODO: Use logInfo
    logInfo('Bid won: ' + JSON.stringify(bidData));
  }
};

registerBidder(spec);
