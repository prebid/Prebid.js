import { config } from '../src/config.js';
import { registerBidder } from '../src/adapters/bidderFactory.js';
import { VIDEO } from '../src/mediaTypes.js';
import { deepAccess } from '../src/utils.js';

/**
 * Get video metadata from bid request
 *
 * @param {BidRequest} bidRequest A valid bid requests that should be sent to the Server.
 * @return video metadata
 */
function getVideoMetadata(bidRequest) {
  const videoAdUnit = deepAccess(bidRequest, 'mediaTypes.video', {});
  const videoBidderParams = deepAccess(bidRequest, 'params.video', {});

  const videoParams = {
    ...videoAdUnit,
    ...videoBidderParams, // Bidder Specific overrides
  };

  const videoMetadata = {
    description: videoParams.description || '',
    duration: videoParams.duration || 0,
    iabcat2: Array.isArray(videoParams.iabcat2) ? videoParams.iabcat2 : [],
    id: videoParams.id || '',
    lang: videoParams.lang || '',
    private: videoParams.private || false,
    tags: videoParams.tags || '',
    title: videoParams.title || '',
    topics: videoParams.topics || '',
    xid: videoParams.xid || '',
  };

  return videoMetadata;
}

export const spec = {
  code: 'dailymotion',
  gvlid: 573,
  supportedMediaTypes: [VIDEO],

  /**
   * Determines whether or not the given bid request is valid.
   * The only mandatory parameter for a bid to be valid is the API key.
   * Other parameters are optional.
   *
   * @return boolean True if this is a valid bid, and false otherwise.
   */
  isBidRequestValid: function (bid) {
    return (typeof bid.params.apiKey !== 'undefined');
  },

  /**
   * Make a server request from the list of valid BidRequests (that already passed the isBidRequestValid call)
   *
   * @param {BidRequest[]} validBidRequests A non-empty list of valid bid requests that should be sent to the Server.
   * @param {BidderRequest} bidderRequest
   * @return ServerRequest Info describing the request to the server.
   */
  buildRequests: (validBidRequests = [], bidderRequest) => validBidRequests.map(bid => ({
    method: 'POST',
    url: 'https://pb.dmxleo.com',
    data: {
      bidder_request: {
        gdprConsent: {
          apiVersion: bidderRequest?.gdprConsent?.apiVersion || 1,
          consentString: bidderRequest?.gdprConsent?.consentString || '',
          // Cast boolean in any case (eg: if value is int) to ensure type
          gdprApplies: !!bidderRequest?.gdprConsent?.gdprApplies,
        },
        refererInfo: {
          page: bidderRequest?.refererInfo?.page || '',
        },
        uspConsent: bidderRequest?.uspConsent || '',
      },
      config: {
        api_key = bid.params.apiKey
      },
      coppa: config.getConfig('coppa'),
      request: {
        adUnitCode: bid.adUnitCode || '',
        auctionId: bid.auctionId || '',
        bidId: bid.bidId || '',
        mediaTypes: {
          video: {
            playerSize: bid.mediaTypes?.[VIDEO]?.playerSize || [],
            api: bid.mediaTypes?.[VIDEO]?.api || [],
            startDelay: bid.mediaTypes?.[VIDEO]?.startdelay || 0,
          },
        },
        sizes: bid.sizes || [],
      },
      video_metadata: getVideoMetadata(bid),
    },
    options: {
      withCredentials: true,
      crossOrigin: true,
    },
  })),

  /**
   * Map the response from the server into a list of bids.
   * As dailymotion prebid server returns an entry with the correct Prebid structure,
   * we directly include it as the only bid in the response.
   *
   * @param {*} serverResponse A successful response from the server.
   * @return {Bid[]} An array of bids which were nested inside the server.
   */
  interpretResponse: serverResponse => serverResponse?.body ? [serverResponse.body] : [],
};

registerBidder(spec);
