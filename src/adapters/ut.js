import bidfactory from 'src/bidfactory';
import bidmanager from 'src/bidmanager';
import { ajax } from 'src/ajax';
import { createTrackPixelHtml, getSizes, logError } from 'src/utils';
import CONSTANTS from 'src/constants';

const ENDPOINT = 'http://ib.adnxs.com/ut/v2';

function UtAdapter() {

  let placements = {};

  function callBids(params) {
    // TODO: validate params
    const bids = params.bids || [];
    const tags = bids.map(bid => {
      let tag = {};

      const sizes = getSizes(bid.sizes);
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

    ajax(ENDPOINT, registerResponse, JSON.stringify(payload));
  }

  function registerResponse(response) {
    const tags = JSON.parse(response).tags || [];

    tags.forEach(tag => {
      const ad = tag.ads[0];
      const bid = bidfactory.createBid(CONSTANTS.STATUS.GOOD);
      bid.code = 'ut';
      bid.bidderCode = 'ut';
      bid.creative_id = ad.creativeId;
      bid.cpm = ad.cpm;
      bid.ad = ad.rtb.banner.content;
      try {
        const url = ad.rtb.trackers[0].impression_urls[0];
        const tracker = createTrackPixelHtml(url);
        bid.ad += tracker;
      } catch (e) {
        logError('Error appending tracking pixel', 'appnexusAst.js:_requestAds', e);
      }

      bid.width = ad.rtb.banner.width;
      bid.height = ad.rtb.banner.height;

      bidmanager.addBidResponse(placements[tag.uuid], bid);
    });
  }

  return {callBids};

}

// using this instead of ES2015 equivalent because `export default` compiles to
// `exports.default`, not `module.exports` as needed in build system
module.exports = UtAdapter;
