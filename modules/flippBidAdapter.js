import {isEmpty, parseUrl} from '../src/utils.js';
import { registerBidder } from '../src/adapters/bidderFactory.js';
import { BANNER } from '../src/mediaTypes.js';
const NETWORK_ID = 11090;
const AD_TYPES = [4309, 641];
const TARGET_NAME = 'inline';
const BIDDER_CODE = 'flipp';
const ENDPOINT = 'https://gateflipp.flippback.com/flyer-locator-service/prebid_campaigns';
const DEFAULT_TTL = 30;
const DEFAULT_CURRENCY = 'USD';

const generateUUID = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

export const spec = {
  code: BIDDER_CODE,
  supportedMediaTypes: [BANNER],
  /**
   * Determines whether or not the given bid request is valid.
   *
   * @param {BidRequest} bid The bid params to validate.
   * @return boolean True if this is a valid bid, and false otherwise.
   */
  isBidRequestValid: function(bid) {
    return !!(bid.params.siteId) && !!(bid.params.publisherNameIdentifier);
  },
  /**
   * Make a server request from the list of BidRequests.
   *
   * @param {BidRequest[]} validBidRequests[] an array of bids
   * @param {BidderRequest} bidderRequest master bidRequest object
   * @return ServerRequest Info describing the request to the server.
   */
  buildRequests: function(validBidRequests, bidderRequest) {
    const urlParams = parseUrl(bidderRequest.refererInfo.page).search;
    const contentCode = urlParams['flipp-content-code'];
    const userKey = isEmpty(validBidRequests[0]?.params.userKey) ? generateUUID() : validBidRequests[0]?.params.userKey;
    const placements = validBidRequests.map((bid, index) => {
      return {
        divName: TARGET_NAME,
        networkId: NETWORK_ID,
        siteId: bid.params.siteId,
        adTypes: AD_TYPES,
        count: 1,
        ...(!isEmpty(bid.params.zoneIds) && {zoneIds: bid.params.zoneIds}),
        properties: {
          ...(!isEmpty(contentCode) && {contentCode: contentCode.slice(0, 32)}),
        },
        prebid: {
          requestId: bid.bidId,
          publisherNameIdentifier: bid.params.publisherNameIdentifier,
          height: bid.mediaTypes.banner.sizes[index][0],
          width: bid.mediaTypes.banner.sizes[index][1],
        }
      }
    });
    return {
      method: 'POST',
      url: ENDPOINT,
      data: {
        placements,
        url: bidderRequest.refererInfo.page,
        user: {
          key: userKey,
        },
      },
    }
  },
  /**
   * Unpack the response from the server into a list of bids.
   *
   * @param {ServerResponse} serverResponse A successful response from the server.
   * @param {BidRequest} bidRequest A bid request object
   * @return {Bid[]} An array of bids which were nested inside the server.
   */
  interpretResponse: function(serverResponse, bidRequest) {
    if (!serverResponse?.body) return [];
    const res = serverResponse.body;
    if (!isEmpty(res) && !isEmpty(res.decisions) && !isEmpty(res.decisions.inline)) {
      return res.decisions.inline.map(decision => ({
        bidderCode: BIDDER_CODE,
        requestId: decision.prebid?.requestId,
        cpm: decision.prebid?.cpm,
        width: decision.width,
        height: decision.height,
        creativeId: decision.adId,
        currency: DEFAULT_CURRENCY,
        netRevenue: true,
        ttl: DEFAULT_TTL,
        ad: decision.prebid?.creative,
      }));
    }
    return [];
  },

  /**
   * Register the user sync pixels which should be dropped after the auction.
   *
   * @param {SyncOptions} syncOptions Which user syncs are allowed?
   * @param {ServerResponse[]} serverResponses List of server's responses.
   * @return {UserSync[]} The user syncs which should be dropped.
   */
  getUserSyncs: (syncOptions, serverResponses) => [],
}
registerBidder(spec);
