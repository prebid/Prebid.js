import { deepAccess, triggerPixel } from '../src/utils.js';
import {registerBidder} from '../src/adapters/bidderFactory.js';
import {BANNER, VIDEO} from '../src/mediaTypes.js';
import {OUTSTREAM} from '../src/video.js';
import {Renderer} from '../src/Renderer.js';

/**
 * @typedef {import('../src/adapters/bidderFactory.js').BidRequest} BidRequest
 * @typedef {import('../src/adapters/bidderFactory.js').Bid} Bid
 * @typedef {import('../src/adapters/bidderFactory.js').ServerResponse} ServerResponse
 * @typedef {import('../src/adapters/bidderFactory.js').SyncOptions} SyncOptions
 * @typedef {import('../src/adapters/bidderFactory.js').UserSync} UserSync
 */

const BIDDER_CODE = 'rtbsape';
const ENDPOINT = 'https://ssp-rtb.sape.ru/prebid';
const RENDERER_SRC = 'https://cdn-rtb.sape.ru/js/player.js';
const MATCH_SRC = 'https://www.acint.net/mc/?dp=141';

export const spec = {
  code: BIDDER_CODE,
  aliases: ['sape'],
  supportedMediaTypes: [BANNER, VIDEO],

  /**
   * Determines whether or not the given bid request is valid.
   *
   * @param {BidRequest} bid The bid params to validate.
   * @return boolean True  if this is a valid bid, and false otherwise.
   */
  isBidRequestValid: function (bid) {
    return !!(bid && bid.mediaTypes && (bid.mediaTypes.banner || bid.mediaTypes.video) && bid.params && bid.params.placeId);
  },

  /**
   * Make a server request from the list of BidRequests.
   *
   * @param {BidRequest[]} validBidRequests an array of bids
   * @param bidderRequest
   * @return ServerRequest Info describing the request to the server.
   */
  buildRequests: function (validBidRequests, bidderRequest) {
    let tz = (new Date()).getTimezoneOffset()
    let padInt = (v) => (v < 10 ? '0' + v : '' + v);

    return {
      url: ENDPOINT,
      method: 'POST',
      data: {
        // TODO: fix auctionId leak: https://github.com/prebid/Prebid.js/issues/9781
        auctionId: bidderRequest.auctionId,
        requestId: bidderRequest.bidderRequestId,
        bids: validBidRequests,
        timezone: (tz > 0 ? '-' : '+') + padInt(Math.floor(Math.abs(tz) / 60)) + ':' + padInt(Math.abs(tz) % 60),
        // TODO: please do not send internal data structures over the network
        refererInfo: bidderRequest.refererInfo.legacy
      },
    }
  },

  /**
   * Unpack the response from the server into a list of bids.
   *
   * @param {ServerResponse} serverResponse A successful response from the server.
   * @param {{data: {bids: [{mediaTypes: {banner: boolean}}]}}} bidRequest Info describing the request to the server.
   * @return {Bid[]} An array of bids which were nested inside the server.
   */
  interpretResponse: function (serverResponse, bidRequest) {
    if (!(serverResponse.body && Array.isArray(serverResponse.body.bids))) {
      return [];
    }

    let bids = {};
    bidRequest.data.bids.forEach(bid => bids[bid.bidId] = bid);

    return serverResponse.body.bids
      .filter(bid => typeof (bid.meta || {}).advertiserDomains !== 'undefined')
      .map(bid => {
        let requestBid = bids[bid.requestId];
        let context = deepAccess(requestBid, 'mediaTypes.video.context');

        if (context === OUTSTREAM && (bid.vastUrl || bid.vastXml)) {
          let renderer = Renderer.install({
            id: bid.requestId,
            url: RENDERER_SRC,
            loaded: false
          });

          let muted = deepAccess(requestBid, 'params.video.playerMuted');
          if (typeof muted === 'undefined') {
            muted = true;
          }

          bid.playerMuted = muted;
          bid.renderer = renderer

          renderer.setRender(setOutstreamRenderer);
        }

        return bid;
      });
  },

  /**
   * Register the user sync pixels which should be dropped after the auction.
   *
   * @param {SyncOptions} syncOptions Which user syncs are allowed?
   * @return {UserSync[]} The user syncs which should be dropped.
   */
  getUserSyncs: function (syncOptions) {
    const sync = [];
    if (syncOptions.iframeEnabled) {
      sync.push({
        type: 'iframe',
        url: MATCH_SRC
      });
    }
    return sync;
  },

  /**
   * Register bidder specific code, which will execute if a bid from this bidder won the auction
   * @param {Bid} bid The bid that won the auction
   */
  onBidWon: function(bid) {
    if (bid.nurl) {
      triggerPixel(bid.nurl);
    }
  }
}

/**
 * Initialize RtbSape outstream player
 *
 * @param bid
 */
function setOutstreamRenderer(bid) {
  let props = {};
  if (bid.vastUrl) {
    props.url = bid.vastUrl;
  }
  if (bid.vastXml) {
    props.xml = bid.vastXml;
  }
  bid.renderer.push(() => {
    let player = window.sapeRtbPlayerHandler(bid.adUnitCode, bid.width, bid.height, bid.playerMuted, {singleton: true});
    props.onComplete = () => player.destroy();
    props.onError = () => player.destroy();
    player.addSlot(props);
  });
}

registerBidder(spec);
