import {find} from '../src/polyfill.js';
import {getBidRequest} from '../src/utils.js';
import {BANNER, VIDEO} from '../src/mediaTypes.js';
import {registerBidder} from '../src/adapters/bidderFactory.js';

/**
 * @typedef {import('../src/adapters/bidderFactory.js').BidRequest} BidRequest
 * @typedef {import('../src/adapters/bidderFactory.js').Bid} Bid
 */

const SOURCE = 'pbjs';
const BIDDER_CODE = 'targetVideo';
const ENDPOINT_URL = 'https://ib.adnxs.com/ut/v3/prebid';
const MARGIN = 1.35;
const GVLID = 786;

export const spec = {

  code: BIDDER_CODE,
  gvlid: GVLID,
  supportedMediaTypes: [BANNER],

  /**
   * Determines whether or not the given bid request is valid.
   *
   * @param {object} bid The bid to validate.
   * @return boolean True if this is a valid bid, and false otherwise.
   */
  isBidRequestValid: function(bid) {
    return !!(bid && bid.params && bid.params.placementId);
  },

  /**
   * Make a server request from the list of BidRequests.
   *
   * @param {BidRequest[]} bidRequests A non-empty list of bid requests which should be sent to the Server.
   * @return ServerRequest Info describing the request to the server.
   */
  buildRequests: function(bidRequests, bidderRequest) {
    const tags = bidRequests.map(createVideoTag);
    const schain = bidRequests[0].schain;
    const payload = {
      tags: tags,
      sdk: {
        source: SOURCE,
        version: '$prebid.version$'
      },
      schain: schain
    };

    if (bidderRequest && bidderRequest.gdprConsent) {
      payload.gdpr_consent = {
        consent_string: bidderRequest.gdprConsent.consentString,
        consent_required: bidderRequest.gdprConsent.gdprApplies
      };

      if (bidderRequest.gdprConsent.addtlConsent && bidderRequest.gdprConsent.addtlConsent.indexOf('~') !== -1) {
        let ac = bidderRequest.gdprConsent.addtlConsent;
        let acStr = ac.substring(ac.indexOf('~') + 1);
        payload.gdpr_consent.addtl_consent = acStr.split('.').map(id => parseInt(id, 10));
      }
    }

    if (bidderRequest && bidderRequest.uspConsent) {
      payload.us_privacy = bidderRequest.uspConsent
    }

    return formatRequest(payload, bidderRequest);
  },

  /**
   * Unpack the response from the server into a list of bids.
   *
   * @param {*} serverResponse A successful response from the server.
   * @return {Bid[]} An array of bids which were nested inside the server.
   */
  interpretResponse: function(serverResponse, { bidderRequest }) {
    serverResponse = serverResponse.body;
    const bids = [];

    if (serverResponse.tags) {
      serverResponse.tags.forEach(serverBid => {
        const rtbBid = getRtbBid(serverBid);
        if (rtbBid && rtbBid.cpm !== 0 && rtbBid.ad_type == VIDEO) {
          bids.push(newBid(serverBid, rtbBid, bidderRequest));
        }
      });
    }

    return bids;
  }

}

function getSizes(request) {
  let sizes = request.sizes;
  if (!sizes && request.mediaTypes && request.mediaTypes.banner && request.mediaTypes.banner.sizes) {
    sizes = request.mediaTypes.banner.sizes;
  }
  if (Array.isArray(sizes) && !Array.isArray(sizes[0])) {
    sizes = [sizes[0], sizes[1]];
  }
  if (!Array.isArray(sizes) || !Array.isArray(sizes[0])) {
    sizes = [[0, 0]];
  }

  return sizes;
}

function formatRequest(payload, bidderRequest) {
  const options = {
    withCredentials: true
  };
  const request = {
    method: 'POST',
    url: ENDPOINT_URL,
    data: JSON.stringify(payload),
    bidderRequest,
    options
  };

  return request;
}

/**
 * Create video auction.
 *
 * @param {*} serverResponse A successful response from the server.
 * @return {Bid[]} An array of bids which were nested inside the server.
 */
function createVideoTag(bid) {
  const tag = {};
  tag.id = parseInt(bid.params.placementId, 10);
  tag.gpid = 'targetVideo';
  tag.sizes = getSizes(bid);
  tag.primary_size = tag.sizes[0];
  tag.ad_types = [VIDEO];
  tag.uuid = bid.bidId;
  tag.allow_smaller_sizes = false;
  tag.use_pmt_rule = false;
  tag.prebid = true;
  tag.disable_psa = true;
  tag.hb_source = 1;
  tag.require_asset_url = true;
  tag.video = {
    playback_method: 2,
    skippable: true
  };

  return tag;
}

/**
 * Unpack the Server's Bid into a Prebid-compatible one.
 * @param serverBid
 * @param rtbBid
 * @param bidderRequest
 * @return Bid
 */
function newBid(serverBid, rtbBid, bidderRequest) {
  const bidRequest = getBidRequest(serverBid.uuid, [bidderRequest]);
  const sizes = getSizes(bidRequest);
  const bid = {
    requestId: serverBid.uuid,
    cpm: rtbBid.cpm / MARGIN,
    creativeId: rtbBid.creative_id,
    dealId: rtbBid.deal_id,
    currency: 'USD',
    netRevenue: true,
    width: sizes[0][0],
    height: sizes[0][1],
    ttl: 300,
    adUnitCode: bidRequest.adUnitCode,
    appnexus: {
      buyerMemberId: rtbBid.buyer_member_id,
      dealPriority: rtbBid.deal_priority,
      dealCode: rtbBid.deal_code
    }
  };

  if (rtbBid.rtb.video) {
    Object.assign(bid, {
      vastImpUrl: rtbBid.notify_url,
      ad: getBannerHtml(rtbBid.notify_url + '&redir=' + encodeURIComponent(rtbBid.rtb.video.asset_url)),
      ttl: 3600
    });
  }

  return bid;
}

function getRtbBid(tag) {
  return tag && tag.ads && tag.ads.length && find(tag.ads, ad => ad.rtb);
}

function getBannerHtml(vastUrl) {
  return `<!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <title></title>
      <style>html, body {width: 100%; height: 100%; margin: 0;}</style>
    </head>
    <body>
      <div id="targetVideoPlayer"></div>
      <script src="https://player.target-video.com/custom/targetvideo-banner.js"></script>
      <script>initPlayer("${vastUrl}");</script>
    </body>
  </html>`;
}

registerBidder(spec);
