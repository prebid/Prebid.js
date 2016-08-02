import bidfactory from 'src/bidfactory';
import bidmanager from 'src/bidmanager';
import { ajax } from 'src/ajax';
import * as utils from 'src/utils';
import CONSTANTS from 'src/constants';

const ENDPOINT = 'http://ib.adnxs.com/ut/v2';
const CODE = 'ut';

function UtAdapter() {

  let placements = {};

  function callBids(params) {
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

    const payload = {tags: [...tags]};

    ajax(ENDPOINT, handleResponse, JSON.stringify(payload));
  }

  function handleResponse(response) {
    const parsed = JSON.parse(response);
    if (!parsed || parsed.error) {return;}

    parsed.tags.forEach(tag => {
      let bid;

      if (!tag.error && !utils.isEmpty(tag)) {
        bid = bidfactory.createBid(CONSTANTS.STATUS.GOOD);
        const ad = tag.ads[0];
        bid.code = CODE;
        bid.bidderCode = CODE;
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
      } else {
        bid = bidfactory.createBid(CONSTANTS.STATUS.NO_BID);
        bid.code = CODE;
        bid.bidderCode = CODE;
      }

      bidmanager.addBidResponse(placements[tag.uuid], bid);
    });
  }

  return {callBids};

}

module.exports = UtAdapter;
