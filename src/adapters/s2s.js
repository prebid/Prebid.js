import Adapter from 'src/adapters/adapter';
import bidfactory from 'src/bidfactory';
import bidmanager from 'src/bidmanager';
import * as utils from 'src/utils';
import { ajax } from 'src/ajax';
import { STATUS } from 'src/constants';

const TYPE = 's2s';

/**
 * Bidder adapter for /ut endpoint. Given the list of all ad unit tag IDs,
 * sends out a bid request. When a bid response is back, registers the bid
 * to Prebid.js. This adapter supports alias bidding.
 */
function S2SAdapter() {

  let baseAdapter = Adapter.createNew('s2s');
  
  /* Prebid executes this function when the page asks to send out bid requests */
  baseAdapter.callBids = function(bidRequest, config) {

    const payload = JSON.stringify(bidRequest);
    ajax(config.endpoint, handleResponse, payload, {
      contentType: 'text/plain',
      withCredentials : true
    });
  };

  /* Notify Prebid of bid responses so bids can get in the auction */
  function handleResponse(response) {
    let result;
    try {
      result = JSON.parse(response);
      //TODO: Possible statuses, move in constants file

      if(result.status === 'OK') {
        result.bids.forEach(bidObj => {
          //TODO: current response does not have type of creative, hence not checking anything
          bidObj.bidId = bidObj.bid_id;
          let cpm = bidObj.price.first;
          let status;
          if (cpm !== 0) {
            status = STATUS.GOOD;
          } else {
            status = STATUS.NO_BID;
          }

          let bid = bidfactory.createBid(status, bidObj);
          bid.creative_id = bidObj.creative_id;
          bid.bidderCode = bidObj.bidder;
          bid.cpm = cpm;
          bid.ad = bidObj.adm;
          bid.width = bidObj.width;
          bid.height = bidObj.height;

          bidmanager.addBidResponse(bidObj.code, bid);
        });
      }
    } catch (error) {
      utils.logError(error);
    }

    if (!result || result.status.includes('Error')) {
      utils.logError('error parsing resposne');
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
    callBids: baseAdapter.callBids,
    setBidderCode: baseAdapter.setBidderCode,
    type : TYPE
  };

}

S2SAdapter.createNew = function() {
  return new S2SAdapter();
};

module.exports = S2SAdapter;
