import {_map, isArray} from '../src/utils.js';
import {registerBidder} from '../src/adapters/bidderFactory.js';
import {BANNER, VIDEO} from '../src/mediaTypes.js';
import {createRenderer, getMediaTypeFromBid, hasVideoMandatoryParams} from '../libraries/hybridVoxUtils/index.js';

/**
 * @typedef {import('../src/adapters/bidderFactory.js').BidRequest} BidRequest
 * @typedef {import('../src/adapters/bidderFactory.js').Bid} Bid
 * @typedef {import('../src/adapters/bidderFactory.js').ServerResponse} ServerResponse
 * @typedef {import('../src/adapters/bidderFactory.js').validBidRequests} validBidRequests
 */

const BIDDER_CODE = 'hybrid';
const GVLID = 206;
const DSP_ENDPOINT = 'https://hbe198.hybrid.ai/prebidhb';
const TRAFFIC_TYPE_WEB = 1;
const PLACEMENT_TYPE_BANNER = 1;
const PLACEMENT_TYPE_VIDEO = 2;
const PLACEMENT_TYPE_IN_IMAGE = 3;
const TTL = 60;
const RENDERER_URL = 'https://acdn.adnxs.com/video/outstream/ANOutstreamVideo.js';

const placementTypes = {
  'banner': PLACEMENT_TYPE_BANNER,
  'video': PLACEMENT_TYPE_VIDEO,
  'inImage': PLACEMENT_TYPE_IN_IMAGE
};

function buildBidRequests(validBidRequests) {
  return _map(validBidRequests, function(validBidRequest) {
    const params = validBidRequest.params;
    const bidRequest = {
      bidId: validBidRequest.bidId,
      transactionId: validBidRequest.ortb2Imp?.ext?.tid,
      sizes: validBidRequest.sizes,
      placement: placementTypes[params.placement],
      placeId: params.placeId,
      imageUrl: params.imageUrl || ''
    };

    return bidRequest;
  })
}

function buildBid(bidData) {
  const bid = {
    requestId: bidData.bidId,
    cpm: bidData.price,
    width: bidData.width,
    height: bidData.height,
    creativeId: bidData.bidId,
    currency: bidData.currency,
    netRevenue: true,
    ttl: TTL,
    meta: {
      advertiserDomains: bidData.advertiserDomains || []}
  };

  if (bidData.placement === PLACEMENT_TYPE_VIDEO) {
    bid.vastXml = bidData.content;
    bid.mediaType = VIDEO;

    const video = bidData.mediaTypes?.video;

    if (video) {
      bid.width = video.playerSize[0][0];
      bid.height = video.playerSize[0][1];

      if (video.context === 'outstream') {
        bid.renderer = createRenderer(bid, RENDERER_URL);
      }
    }
  } else if (bidData.placement === PLACEMENT_TYPE_IN_IMAGE) {
    bid.mediaType = BANNER;
    bid.inImageContent = {
      content: {
        content: bidData.content,
        actionUrls: {}
      }
    };
    const actionUrls = bid.inImageContent.content.actionUrls;
    actionUrls.loadUrls = bidData.inImage.loadtrackers || [];
    actionUrls.impressionUrls = bidData.inImage.imptrackers || [];
    actionUrls.scrollActUrls = bidData.inImage.startvisibilitytrackers || [];
    actionUrls.viewUrls = bidData.inImage.viewtrackers || [];
    actionUrls.stopAnimationUrls = bidData.inImage.stopanimationtrackers || [];
    actionUrls.closeBannerUrls = bidData.inImage.closebannertrackers || [];

    if (bidData.inImage.but) {
      const inImageOptions = bid.inImageContent.content.inImageOptions = {};
      inImageOptions.hasButton = true;
      inImageOptions.buttonLogoUrl = bidData.inImage.but_logo;
      inImageOptions.buttonProductUrl = bidData.inImage.but_prod;
      inImageOptions.buttonHead = bidData.inImage.but_head;
      inImageOptions.buttonHeadColor = bidData.inImage.but_head_colour;
      inImageOptions.dynparams = bidData.inImage.dynparams || {};
    }

    bid.ad = wrapAd(bid, bidData);
  } else {
    bid.ad = bidData.content;
    bid.mediaType = BANNER;
  }

  return bid;
}

function wrapAd(bid, bidData) {
  return `<!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <title></title>
        <script src="https://st.hybrid.ai/prebidrenderer.js"></script>
        <style>html, body {width: 100%; height: 100%; margin: 0;}</style>
    </head>
    <body>
        <div data-hyb-ssp-in-image-overlay="${bidData.placeId}" style="width: 100%; height: 100%;"></div>
        <script>
            if (parent.window.frames[window.name]) {
                var parentDocument = window.parent.document.getElementById(parent.window.frames[window.name].name);
                parentDocument.style.height = "100%";
                parentDocument.style.width = "100%";
            }
            var _content = "${encodeURIComponent(JSON.stringify(bid.inImageContent))}";
            window._hyb_prebid_ssp.registerInImage(JSON.parse(decodeURIComponent(_content)));
        </script>
    </body>
  </html>`;
}

export const spec = {
  code: BIDDER_CODE,
  gvlid: GVLID,
  supportedMediaTypes: [BANNER, VIDEO],
  placementTypes: placementTypes,

  /**
   * Determines whether or not the given bid request is valid.
   *
   * @param {BidRequest} bid The bid params to validate.
   * @return boolean True if this is a valid bid, and false otherwise.
   */
  isBidRequestValid(bid) {
    return (
      !!bid.params.placeId &&
      !!bid.params.placement &&
      (
        (getMediaTypeFromBid(bid) === BANNER && bid.params.placement === 'banner') ||
        (getMediaTypeFromBid(bid) === BANNER && bid.params.placement === 'inImage' && !!bid.params.imageUrl) ||
        (getMediaTypeFromBid(bid) === VIDEO && bid.params.placement === 'video' && hasVideoMandatoryParams(bid.mediaTypes))
      )
    );
  },

  /**
   * Make a server request from the list of BidRequests.
   *
   * @param {Array} validBidRequests - an array of bids
   * @param {Object} bidderRequest
   * @return {Object} Info describing the request to the server.
   */
  buildRequests(validBidRequests, bidderRequest) {
    const payload = {
      // TODO: is 'page' the right value here?
      url: bidderRequest.refererInfo.page,
      cmp: !!bidderRequest.gdprConsent,
      trafficType: TRAFFIC_TYPE_WEB,
      bidRequests: buildBidRequests(validBidRequests)
    };

    if (payload.cmp) {
      const gdprApplies = bidderRequest.gdprConsent.gdprApplies;
      if (gdprApplies !== undefined) payload['ga'] = gdprApplies;
      payload['cs'] = bidderRequest.gdprConsent.consentString;
    }

    const payloadString = JSON.stringify(payload);
    return {
      method: 'POST',
      url: DSP_ENDPOINT,
      data: payloadString,
      options: {
        contentType: 'application/json'
      }
    }
  },

  /**
   * Unpack the response from the server into a list of bids.
   *
   * @param {ServerResponse} serverResponse A successful response from the server.
   * @return {Bid[]} An array of bids which were nested inside the server.
   */
  interpretResponse: function(serverResponse, bidRequest) {
    const bidRequests = JSON.parse(bidRequest.data).bidRequests;
    const serverBody = serverResponse.body;

    if (serverBody && serverBody.bids && isArray(serverBody.bids)) {
      return _map(serverBody.bids, function(bid) {
        const rawBid = ((bidRequests) || []).find(function (item) {
          return item.bidId === bid.bidId;
        });
        bid.placement = rawBid.placement;
        bid.placeId = rawBid.placeId;
        return buildBid(bid);
      });
    } else {
      return [];
    }
  }

}
registerBidder(spec);
