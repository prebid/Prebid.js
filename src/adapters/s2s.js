import Adapter from 'src/adapters/adapter';
import bidfactory from 'src/bidfactory';
import bidmanager from 'src/bidmanager';
import * as utils from 'src/utils';
import { ajax } from 'src/ajax';
import { STATUS } from 'src/constants';

const ENDPOINT = '//prebid.adnxs.com/auction';
const TYPE = 's2s';

/**
 * Bidder adapter for /ut endpoint. Given the list of all ad unit tag IDs,
 * sends out a bid request. When a bid response is back, registers the bid
 * to Prebid.js. This adapter supports alias bidding.
 */
function S2SAdapter() {

  let baseAdapter = Adapter.createNew('s2s');
  let bidRequests = {};

  /* Prebid executes this function when the page asks to send out bid requests */
  baseAdapter.callBids = function(bidRequest) {

    const payload = JSON.stringify(bidRequest);
    ajax(ENDPOINT, handleResponse, payload, {
      contentType: 'text/plain',
      withCredentials : true
    });
  };

  /* Notify Prebid of bid responses so bids can get in the auction */
  function handleResponse(response) {
    let parsed;

    try {
      parsed = JSON.parse(response);
    } catch (error) {
      utils.logError(error);
    }

    if (!parsed || parsed.status.includes('Error')) {
      console.log('error parsing resposne');
    }



  }

  /* Check that a bid has required paramters */
  function valid(bid) {
    if (bid.params.placementId || bid.params.member && bid.params.invCode) {
      return bid;
    } else {
      utils.logError('bid requires placementId or (member and invCode) params');
    }
  }

  /* Turn keywords parameter into ut-compatible format */
  function getKeywords(keywords) {
    let arrs = [];

    utils._each(keywords, (v, k) => {
      if (utils.isArray(v)) {
        let values = [];
        utils._each(v, (val) => {
          val = utils.getValueString('keywords.' + k, val);
          if (val) {values.push(val);}
        });
        v = values;
      } else {
        v = utils.getValueString('keywords.' + k, v);
        if (utils.isStr(v)) {v = [v];}
        else {return;} // unsuported types - don't send a key
      }
      arrs.push({key: k, value: v});
    });

    return arrs;
  }

  /* Turn bid request sizes into ut-compatible format */
  function getSizes(requestSizes) {
    let sizes = [];
    let sizeObj = {};

    if (utils.isArray(requestSizes) && requestSizes.length === 2 &&
       !utils.isArray(requestSizes[0])) {
      sizeObj.width = parseInt(requestSizes[0], 10);
      sizeObj.height = parseInt(requestSizes[1], 10);
      sizes.push(sizeObj);
    } else if (typeof requestSizes === 'object') {
      for (let i = 0; i < requestSizes.length; i++) {
        let size = requestSizes[i];
        sizeObj = {};
        sizeObj.width = parseInt(size[0], 10);
        sizeObj.height = parseInt(size[1], 10);
        sizes.push(sizeObj);
      }
    }

    return sizes;
  }

  function getRtbBid(tag) {
    return tag && tag.ads && tag.ads.length && tag.ads.find(ad => ad.rtb);
  }

  /* Create and return a bid object based on status and tag */
  function createBid(status, tag) {
    const ad = getRtbBid(tag);
    let bid = bidfactory.createBid(status, tag);
    bid.code = baseAdapter.getBidderCode();
    bid.bidderCode = baseAdapter.getBidderCode();

    if (ad && status === STATUS.GOOD) {
      bid.cpm = ad.cpm;
      bid.creative_id = ad.creative_id;
      bid.dealId = ad.deal_id;

      if (ad.rtb.video) {
        bid.width = ad.rtb.video.player_width;
        bid.height = ad.rtb.video.player_height;
        bid.vastUrl = ad.rtb.video.asset_url;
        bid.descriptionUrl = ad.rtb.video.asset_url;
      } else {
        bid.width = ad.rtb.banner.width;
        bid.height = ad.rtb.banner.height;
        bid.ad = ad.rtb.banner.content;
        try {
          const url = ad.rtb.trackers[0].impression_urls[0];
          const tracker = utils.createTrackPixelHtml(url);
          bid.ad += tracker;
        } catch (error) {
          utils.logError('Error appending tracking pixel', error);
        }
      }
    }

    return bid;
  }

  return {
    createNew: S2SAdapter.createNew,
    callBids: S2SAdapter.callBids,
    setBidderCode: S2SAdapter.setBidderCode,
    type : TYPE
  };

}

S2SAdapter.createNew = function() {
  return new S2SAdapter();
};

module.exports = S2SAdapter;
