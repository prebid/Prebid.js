import Adapter from 'src/adapters/adapter';
import bidfactory from 'src/bidfactory';
import bidmanager from 'src/bidmanager';
import { ajax } from 'src/ajax';
import * as utils from 'src/utils';
import CONSTANTS from 'src/constants';

const ENDPOINT = 'http://ib.adnxs.com/ut/v2';

/**
 * Bidder adapter for /ut endpoint. Given the list of all ad unit tag IDs,
 * sends out a bid request. When a bid response is back, registers the bid
 * to Prebid.js. This adapter supports alias bidding.
 */
function UtAdapter() {
  let baseAdapter = Adapter.createNew('ut');
  let placements = {};

  /* Prebid executes this function when the page asks to send out bid requests */
  baseAdapter.callBids = function(bidRequest) {
    const bids = bidRequest.bids || [];
    const tags = bids
      .filter(bid => valid(bid))
      .map(bid => {
        placements[bid.bidId] = bid;
        let tag = {};

        const sizes = getSizes(bid.sizes);
        tag.sizes = sizes;
        tag.primary_size = sizes[0];
        tag.uuid = bid.bidId;
        tag.id = Number.parseInt(bid.params.placementId);
        tag.prebid = true;
        tag.allow_smaller_sizes = bid.params.allowSmallerSizes || false;
        tag.disable_psa = true;

        return tag;
      });

    if (!utils.isEmpty(tags)) {
      const payload = {tags: [...tags]};
      ajax(ENDPOINT, handleResponse, JSON.stringify(payload));
    }
  };

  /* Notify Prebid of bid responses so bids can get in the auction */
  function handleResponse(response) {
    let parsed;

    try {
      parsed = JSON.parse(response);
    } catch (error) {
      utils.logError(error);
    }

    if (!parsed || parsed.error) {
      utils.logError(`Error receiving response for ${baseAdapter.getBidderCode()} adapter`);
      bidmanager.addBidResponse(null, noBid(baseAdapter.getBidderCode()));
      return;
    }

    parsed.tags.forEach(tag => {
      let bid;

      const cpm = tag.ads && tag.ads[0].cpm && tag.ads[0].cpm !== 0;
      const type = tag.ads && tag.ads[0].ad_type === 'banner';

      if (!type) {
        const unsupported = tag.ads && tag.ads[0].ad_type || 'ad type';
        utils.logError(`${unsupported} not supported`);
      }

      if (cpm && type) {
        bid = goodBid(tag, baseAdapter.getBidderCode());
      } else {
        bid = noBid(baseAdapter.getBidderCode());
      }

      if (!utils.isEmpty(bid)) {
        bidmanager.addBidResponse(placements[tag.uuid].placementCode, bid);
      }
    });
  }

  /* Check that a bid has required paramters */
  function valid(bid) {
    if (bid.params.placementId || bid.params.memberId && bid.params.invCode) {
      return bid;
    } else {
      utils.logError('bid requires placementId or memberId and invCode params');
    }
  }

  /* Turn bid request sizes into ut-compatible format */
  function getSizes(requestSizes) {
    var sizes = [];
    var sizeObj = {};
    if (utils.isArray(requestSizes) && requestSizes.length === 2 && !utils.isArray(requestSizes[0])) {
      sizeObj.width = parseInt(requestSizes[0], 10);
      sizeObj.height = parseInt(requestSizes[1], 10);
      sizes.push(sizeObj);
    } else if (typeof requestSizes === 'object') {
      for (let i = 0; i < requestSizes.length; i++) {
        var size = requestSizes[i];
        sizeObj = {};
        sizeObj.width = parseInt(size[0], 10);
        sizeObj.height = parseInt(size[1], 10);
        sizes.push(sizeObj);
      }
    }
    return sizes;
  }

  /* Create and return a valid bid object */
  function goodBid(tag, code) {
    let bid = bidfactory.createBid(CONSTANTS.STATUS.GOOD);
    bid.code = code;
    bid.bidderCode = code;
    bid.creative_id = tag.ads[0].creativeId;
    bid.cpm = tag.ads[0].cpm;
    bid.ad = tag.ads[0].rtb.banner.content;
    try {
      const url = tag.ads[0].rtb.trackers[0].impression_urls[0];
      const tracker = utils.createTrackPixelHtml(url);
      bid.ad += tracker;
    } catch (e) {
      utils.logError('Error appending tracking pixel', 'appnexusAst.js:_requestAds', e);
    }
    bid.width = tag.ads[0].rtb.banner.width;
    bid.height = tag.ads[0].rtb.banner.height;
    return bid;
  }

  /* Create and return an invalid bid object */
  function noBid(code) {
    let bid = bidfactory.createBid(CONSTANTS.STATUS.NO_BID);
    bid.code = code;
    bid.bidderCode = code;
    return bid;
  }

  return {
    createNew: exports.createNew,
    callBids: baseAdapter.callBids,
    setBidderCode: baseAdapter.setBidderCode,
  };
}

exports.createNew = () => new UtAdapter();
