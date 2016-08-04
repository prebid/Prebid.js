import Adapter from 'src/adapters/adapter';
import bidfactory from 'src/bidfactory';
import bidmanager from 'src/bidmanager';
import { ajax } from 'src/ajax';
import * as utils from 'src/utils';
import CONSTANTS from 'src/constants';

const ENDPOINT = 'http://ib.adnxs.com/ut/v2';
const REQUIRED = ['bidderCode', 'bids'];

function UtAdapter() {

  let baseAdapter = Adapter.createNew('ut');
  let placements = {};

  baseAdapter.callBids = function(params) {
    if (!utils.hasValidBidRequest(params, REQUIRED, params.bidderCode)) {return;}

    placements.code = params.bidderCode;

    const bids = params.bids || [];
    const tags = bids.map(bid => {
      let tag = {};

      const sizes = utils.getSizes(bid.sizes);
      tag.sizes = sizes;
      tag.primary_size = sizes[0];

      tag.uuid = bid.bidId;
      tag.id = Number.parseInt(bid.params.placementId);
      placements[bid.bidId] = bid.placementCode;

      tag.prebid = true;
      tag.allow_smaller_sizes = false;
      tag.disable_psa = true;
      tag.ad_types = [0];

      return tag;
    });

    if (tags) {
      const payload = {tags: [...tags]};
      ajax(ENDPOINT, handleResponse, JSON.stringify(payload));
    }
  };

  function handleResponse(response) {
    const parsed = JSON.parse(response);

    if (!parsed || parsed.error) {
      utils.logError(`Error receiving response for ${placements.code} adapter`);
      return;
    }

    parsed.tags.forEach(tag => {
      let bid;

      if (tag.ads && tag.ads[0].cpm && tag.ads[0].cpm !== 0) {
        bid = bidfactory.createBid(CONSTANTS.STATUS.GOOD);
        const ad = tag.ads[0];
        bid.code = placements.code;
        bid.bidderCode = placements.code;
        bid.creative_id = ad.creativeId;
        bid.cpm = ad.cpm;
        bid.ad = ad.rtb.banner.content;
        try {
          const url = ad.rtb.trackers[0].impression_urls[0];
          const tracker = utils.createTrackPixelHtml(url);
          bid.ad += tracker;
        } catch (e) {
          utils.logError('Error appending tracking pixel', 'appnexusAst.js:_requestAds', e);
        }
        bid.width = ad.rtb.banner.width;
        bid.height = ad.rtb.banner.height;
        bidmanager.addBidResponse(placements[tag.uuid], bid);
      } else {
        bid = bidfactory.createBid(CONSTANTS.STATUS.NO_BID);
        bid.code = placements.code;
        bid.bidderCode = placements.code;
        bidmanager.addBidResponse(placements[tag.uuid], bid);
      }
    });
  }

  return {
    callBids: baseAdapter.callBids,
    createNew: exports.createNew,
    setBidderCode: baseAdapter.setBidderCode
  };

}

exports.createNew = () => new UtAdapter();
