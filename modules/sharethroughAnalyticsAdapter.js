import adapter from '../src/AnalyticsAdapter';
import adapterManager from '../src/adapterManager';
const utils = require('../src/utils');

const emptyUrl = '';
const analyticsType = 'endpoint';
const STR_BIDDER_CODE = 'sharethrough';
const STR_VERSION = '0.1.0';

var sharethroughAdapter = Object.assign(adapter(
  {
    emptyUrl,
    analyticsType
  }
),
{
  STR_BEACON_HOST: 'https://b.sharethrough.com/butler?',
  placementCodeSet: {},

  track({ eventType, args }) {
    if (eventType === 'bidRequested' && args.bidderCode === 'sharethrough') {
      var bids = args.bids;
      var keys = Object.keys(bids);
      for (var i = 0; i < keys.length; i++) {
        this.placementCodeSet[bids[keys[i]].placementCode] = args.bids[keys[i]];
      }
    }

    if (eventType === 'bidWon') {
      this.bidWon(args);
    }
  },

  bidWon(args) {
    const curBidderCode = args.bidderCode;

    if (curBidderCode !== STR_BIDDER_CODE && (args.adUnitCode in this.placementCodeSet)) {
      let strBid = this.placementCodeSet[args.adUnitCode];
      this.fireLoseBeacon(curBidderCode, args.cpm, strBid.adserverRequestId, 'headerBidLose');
    }
  },

  fireLoseBeacon(winningBidderCode, winningCPM, arid, type) {
    let loseBeaconUrl = this.STR_BEACON_HOST;
    loseBeaconUrl = utils.tryAppendQueryString(loseBeaconUrl, 'winnerBidderCode', winningBidderCode);
    loseBeaconUrl = utils.tryAppendQueryString(loseBeaconUrl, 'winnerCpm', winningCPM);
    loseBeaconUrl = utils.tryAppendQueryString(loseBeaconUrl, 'arid', arid);
    loseBeaconUrl = utils.tryAppendQueryString(loseBeaconUrl, 'type', type);
    loseBeaconUrl = this.appendEnvFields(loseBeaconUrl);

    this.fireBeacon(loseBeaconUrl);
  },
  appendEnvFields(url) {
    url = utils.tryAppendQueryString(url, 'hbVersion', '$prebid.version$');
    url = utils.tryAppendQueryString(url, 'strVersion', STR_VERSION);
    url = utils.tryAppendQueryString(url, 'hbSource', 'prebid');

    return url;
  },
  fireBeacon(theUrl) {
    const img = new Image();
    img.src = theUrl;
  }
});

adapterManager.registerAnalyticsAdapter({
  adapter: sharethroughAdapter,
  code: 'sharethrough'
});

export default sharethroughAdapter;
