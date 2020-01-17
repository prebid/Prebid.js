import * as utils from '../src/utils'
import { registerBidder } from '../src/adapters/bidderFactory'
import { VIDEO, BANNER } from '../src/mediaTypes'

const BIDDER_CODE = 'seedtag';
const SEEDTAG_ALIAS = 'st';
const SEEDTAG_SSP_ENDPOINT = 'https://s.seedtag.com/c/hb/bid';
const SEEDTAG_SSP_ONTIMEOUT_ENDPOINT = 'https://s.seedtag.com/se/hb/timeout';

const mediaTypesMap = {
  [BANNER]: 'display',
  [VIDEO]: 'video'
};

function mapMediaType(seedtagMediaType) {
  if (seedtagMediaType === 'display') return BANNER;
  if (seedtagMediaType === 'video') return VIDEO;
  else return seedtagMediaType;
}

function getMediaTypeFromBid(bid) {
  return bid.mediaTypes && Object.keys(bid.mediaTypes)[0]
}

function hasMandatoryParams(params) {
  return (
    !!params.publisherId &&
    !!params.adUnitId &&
    !!params.placement &&
    (params.placement === 'inImage' ||
      params.placement === 'inScreen' ||
      params.placement === 'banner' ||
      params.placement === 'video')
  );
}

function hasVideoMandatoryParams(mediaTypes) {
  const isVideoInStream =
    !!mediaTypes.video && mediaTypes.video.context === 'instream';
  const isPlayerSize =
    !!utils.deepAccess(mediaTypes, 'video.playerSize') &&
    utils.isArray(utils.deepAccess(mediaTypes, 'video.playerSize'));
  return isVideoInStream && isPlayerSize;
}

function buildBidRequests(validBidRequests) {
  return utils._map(validBidRequests, function(validBidRequest) {
    const params = validBidRequest.params;
    const mediaTypes = utils._map(
      Object.keys(validBidRequest.mediaTypes),
      function(pbjsType) {
        return mediaTypesMap[pbjsType];
      }
    );
    const bidRequest = {
      id: validBidRequest.bidId,
      transactionId: validBidRequest.transactionId,
      sizes: validBidRequest.sizes,
      supplyTypes: mediaTypes,
      adUnitId: params.adUnitId,
      placement: params.placement
    };

    if (params.adPosition) {
      bidRequest.adPosition = params.adPosition;
    }

    if (params.video) {
      bidRequest.videoParams = params.video || {};
      bidRequest.videoParams.w =
        validBidRequest.mediaTypes.video.playerSize[0][0];
      bidRequest.videoParams.h =
        validBidRequest.mediaTypes.video.playerSize[0][1];
    }

    return bidRequest;
  })
}

function buildBid(seedtagBid) {
  const mediaType = mapMediaType(seedtagBid.mediaType);
  const bid = {
    requestId: seedtagBid.bidId,
    cpm: seedtagBid.price,
    width: seedtagBid.width,
    height: seedtagBid.height,
    creativeId: seedtagBid.creativeId,
    currency: seedtagBid.currency,
    netRevenue: true,
    mediaType: mediaType,
    ttl: seedtagBid.ttl
  };
  if (mediaType === VIDEO) {
    bid.vastXml = seedtagBid.content;
  } else {
    bid.ad = seedtagBid.content;
  }
  return bid;
}

export function getTimeoutUrl (data) {
  let queryParams = '';
  if (
    utils.isArray(data) && data[0] &&
    utils.isArray(data[0].params) && data[0].params[0]
  ) {
    const params = data[0].params[0];
    queryParams =
      '?publisherToken=' + params.publisherId +
      '&adUnitId=' + params.adUnitId;
  }
  return SEEDTAG_SSP_ONTIMEOUT_ENDPOINT + queryParams;
}

export const spec = {
  code: BIDDER_CODE,
  aliases: [SEEDTAG_ALIAS],
  supportedMediaTypes: [BANNER, VIDEO],

  /**
   * Determines whether or not the given bid request is valid.
   *
   * @param {BidRequest} bid The bid params to validate.
   * @return boolean True if this is a valid bid, and false otherwise.
   */
  isBidRequestValid(bid) {
    return getMediaTypeFromBid(bid) === VIDEO
      ? hasMandatoryParams(bid.params) && hasVideoMandatoryParams(bid.mediaTypes)
      : hasMandatoryParams(bid.params);
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
      publisherToken: validBidRequests[0].params.publisherId,
      cmp: !!bidderRequest.gdprConsent,
      timeout: bidderRequest.timeout,
      version: '$prebid.version$',
      bidRequests: buildBidRequests(validBidRequests)
    };

    if (payload.cmp) {
      const gdprApplies = bidderRequest.gdprConsent.gdprApplies;
      if (gdprApplies !== undefined) payload['ga'] = gdprApplies;
      payload['cd'] = bidderRequest.gdprConsent.consentString;
    }

    const payloadString = JSON.stringify(payload)
    return {
      method: 'POST',
      url: SEEDTAG_SSP_ENDPOINT,
      data: payloadString
    }
  },

  /**
   * Unpack the response from the server into a list of bids.
   *
   * @param {ServerResponse} serverResponse A successful response from the server.
   * @return {Bid[]} An array of bids which were nested inside the server.
   */
  interpretResponse: function(serverResponse) {
    const serverBody = serverResponse.body;
    if (serverBody && serverBody.bids && utils.isArray(serverBody.bids)) {
      return utils._map(serverBody.bids, function(bid) {
        return buildBid(bid);
      });
    } else {
      return [];
    }
  },

  /**
   * Register the user sync pixels which should be dropped after the auction.
   *
   * @param {SyncOptions} syncOptions Which user syncs are allowed?
   * @param {ServerResponse[]} serverResponses List of server's responses.
   * @return {UserSync[]} The user syncs which should be dropped.
   */
  getUserSyncs(syncOptions, serverResponses) {
    const serverResponse = serverResponses[0];
    if (syncOptions.iframeEnabled && serverResponse) {
      const cookieSyncUrl = serverResponse.body.cookieSync;
      return cookieSyncUrl ? [{ type: 'iframe', url: cookieSyncUrl }] : [];
    } else {
      return [];
    }
  },

  /**
   * Register bidder specific code, which will execute if bidder timed out after an auction
   * @param {data} Containing timeout specific data
   */
  onTimeout(data) {
    getTimeoutUrl(data);
    utils.triggerPixel(SEEDTAG_SSP_ONTIMEOUT_ENDPOINT);
  }
}
registerBidder(spec);
