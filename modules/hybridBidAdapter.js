import * as utils from '../src/utils.js'
import { registerBidder } from '../src/adapters/bidderFactory.js'
import { auctionManager } from '../src/auctionManager.js'
import { BANNER, VIDEO } from '../src/mediaTypes.js'
import {Renderer} from '../src/Renderer.js';
import find from 'core-js-pure/features/array/find.js';

const BIDDER_CODE = 'hybrid';
const DSP_ENDPOINT = 'https://hbe198.hybrid.ai/prebidhb';
const TRAFFIC_TYPE_WEB = 1;
const PLACEMENT_TYPE_BANNER = 1;
const PLACEMENT_TYPE_VIDEO = 2;
const TTL = 60;
const RENDERER_URL = 'https://acdn.adnxs.com/video/outstream/ANOutstreamVideo.js';

const placementTypes = {
  'banner': PLACEMENT_TYPE_BANNER,
  'video': PLACEMENT_TYPE_VIDEO
};

function buildBidRequests(validBidRequests) {
  return utils._map(validBidRequests, function(validBidRequest) {
    const params = validBidRequest.params;
    const bidRequest = {
      bidId: validBidRequest.bidId,
      transactionId: validBidRequest.transactionId,
      sizes: validBidRequest.sizes,
      placement: placementTypes[params.placement],
      placeId: params.placeId
    };

    return bidRequest;
  })
}

const outstreamRender = bid => {
  bid.renderer.push(() => {
    window.ANOutstreamVideo.renderAd({
      sizes: [bid.width, bid.height],
      targetId: bid.adUnitCode,
      rendererOptions: {
        showBigPlayButton: false,
        showProgressBar: 'bar',
        showVolume: false,
        allowFullscreen: true,
        skippable: false,
        content: bid.vastXml
      }
    });
  });
}

const createRenderer = (bid) => {
  const renderer = Renderer.install({
    targetId: bid.adUnitCode,
    url: RENDERER_URL,
    loaded: false
  });

  try {
    renderer.setRender(outstreamRender);
  } catch (err) {
    utils.logWarn('Prebid Error calling setRender on renderer', err);
  }

  return renderer;
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
    ttl: TTL
  };

  if (bidData.placement === PLACEMENT_TYPE_VIDEO) {
    bid.vastXml = bidData.content;
    bid.mediaType = VIDEO;

    let adUnit = find(auctionManager.getAdUnits(), function (unit) {
      return unit.transactionId === bidData.transactionId;
    });

    if (adUnit) {
      bid.width = adUnit.mediaTypes.video.playerSize[0][0];
      bid.height = adUnit.mediaTypes.video.playerSize[0][1];

      if (adUnit.mediaTypes.video.context === 'outstream') {
        bid.renderer = createRenderer(bid);
      }
    }
  } else {
    bid.ad = bidData.content;
    bid.mediaType = BANNER;
  }

  return bid;
}

function getMediaTypeFromBid(bid) {
  return bid.mediaTypes && Object.keys(bid.mediaTypes)[0]
}

function hasVideoMandatoryParams(mediaTypes) {
  const isHasVideoContext = !!mediaTypes.video && (mediaTypes.video.context === 'instream' || mediaTypes.video.context === 'outstream');

  const isPlayerSize =
    !!utils.deepAccess(mediaTypes, 'video.playerSize') &&
    utils.isArray(utils.deepAccess(mediaTypes, 'video.playerSize'));

  return isHasVideoContext && isPlayerSize;
}

export const spec = {
  code: BIDDER_CODE,
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
        (getMediaTypeFromBid(bid) === VIDEO && bid.params.placement === 'video' && hasVideoMandatoryParams(bid.mediaTypes))
      )
    );
  },

  /**
   * Make a server request from the list of BidRequests.
   *
   * @param {validBidRequests[]} - an array of bids
   * @return ServerRequest Info describing the request to the server.
   */
  buildRequests(validBidRequests, bidderRequest) {
    const payload = {
      url: bidderRequest.refererInfo.referer,
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
    let bidRequests = JSON.parse(bidRequest.data).bidRequests;
    const serverBody = serverResponse.body;

    if (serverBody && serverBody.bids && utils.isArray(serverBody.bids)) {
      return utils._map(serverBody.bids, function(bid) {
        let rawBid = find(bidRequests, function (item) {
          return item.bidId === bid.bidId;
        });
        bid.placement = rawBid.placement;
        bid.transactionId = rawBid.transactionId;
        bid.placeId = rawBid.placeId;
        return buildBid(bid);
      });
    } else {
      return [];
    }
  }

}
registerBidder(spec);
