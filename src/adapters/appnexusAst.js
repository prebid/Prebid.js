import { BaseAdapter } from './baseAdapter';
const utils = require('../utils');
const adloader = require('../adloader.js');
const bidmanager = require('../bidmanager');
const bidfactory = require('../bidfactory');
const CONSTANTS = require('../constants.json');

const AST_URL = 'https://acdn.adnxs.com/ast/alpha/ast.js';

export class AppnexusAst extends BaseAdapter {
  constructor(code) {
    super(code);
    this._bidRequests = null;
  }

  callBids(params) {
    window.apntag = window.apntag || {};
    window.apntag.anq = window.apntag.anq || [];
    this._bidRequests = params.bids;
    adloader.loadScript(AST_URL, () => {
      this._requestAds(this.code);
    }, true);
  }

  _requestAds(code) {
    if (utils.debugTurnedOn()) {
      window.apntag.debug = true;
    }

    window.apntag.clearRequest();

    for (let bidRequest of this._bidRequests) {
      const astTag = this._buildTag(bidRequest);
      const requestTag = window.apntag.defineTag(astTag);
      const placementCode = bidRequest.placementCode;

      //successful bid
      /*jshint -W083 */
      requestTag.on('adAvailable', function(ad) {
        const bid = bidfactory.createBid(CONSTANTS.STATUS.GOOD);
        bid.code = code;
        bid.bidderCode = code;
        bid.creative_id = ad.creativeId;
        bid.cpm = ad.cpm;
        bid.ad = ad.banner.content;
        try {
          const url = ad.banner.trackers[0].impression_urls[0];
          const tracker = utils.createTrackPixelHtml(url);
          bid.ad += tracker;
        } catch (e) {
          utils.logError('Error appending tracking pixel', 'appnexusAst.js:_requestAds', e);
        }

        bid.width = ad.banner.width;
        bid.height = ad.banner.height;
        bidmanager.addBidResponse(placementCode, bid);
      });

      //no bid
      requestTag.on('adNoBid', function() {
        const bid = bidfactory.createBid(CONSTANTS.STATUS.NO_BID);
        bid.code = code;
        bid.bidderCode = code;
        bidmanager.addBidResponse(placementCode, bid);
      });
    }

    window.apntag.loadTags();
  }

  _buildTag(bid) {
    let tag = {};
    const uuid = utils.getUniqueIdentifierStr();

    //clone bid.params to tag
    const jsonBid = JSON.stringify(bid.params);
    tag = JSON.parse(jsonBid);

    //append member if available. Should not use multiple member IDs.
    utils._each(tag, function(value, key) {
      if (key === 'member') {
        window.apntag.setPageOpts({
          member: value
        });
      }

      if (key === 'keywords') {
        window.apntag.setPageOpts({
          keywords: value
        });
      }
    });

    tag.targetId = uuid;
    tag.prebid = true;
    if (!tag.sizes) {
      tag.sizes = bid.sizes;
    }

    tag.tagId = Number.parseInt(bid.params.placementId);
    tag.disablePsa = true;
    return tag;
  }
}
