import adapter from '../libraries/analyticsAdapter/AnalyticsAdapter.js';
import adapterManager from '../src/adapterManager.js';
import { EVENTS } from '../src/constants.js';
import { MODULE_TYPE_ANALYTICS } from '../src/activities/modules.js';
import { getStorageManager } from '../src/storageManager.js';
import {
  isEmpty,
  triggerPixel
} from '../src/utils.js';

const analyticsType = 'endpoint';
const url = 'URL_TO_SERVER_ENDPOINT';
const PROVIDER_NAME = 'allox';

const TRACKER_TYPE = {
  IMP: 1,
  LOSE_NOTICE_WHEN_ALLOX_WIN: 101,
  LOSE_NOTICE_WHEN_ALLOX_LOSE: 102
};

const LURL_REG = {
  CPM: /\$\{ALLOX:AUCTION_PRICE\}/g,
  CURRENCY: /\$\{ALLOX:AUCTION_CURRENCY\}/g
};

export const STORAGE_KEY = '__allox_trackers';
export const storage = getStorageManager({ moduleType: MODULE_TYPE_ANALYTICS, moduleName: PROVIDER_NAME });

const alloxAnalytics = Object.assign(
  adapter({ url, analyticsType }), {
    track({ eventType, args }) {
      switch (eventType) {
        case EVENTS.BID_WON:
          this.onBidWon(args);
          break;
      }
    },
    onBidWon(bid) {
      if (storage.localStorageIsEnabled()) {
        const trackersValue = storage.getDataFromLocalStorage(STORAGE_KEY);
        const trackers = trackersValue ? JSON.parse(trackersValue) : {};

        if (bid.adUnitId in trackers) {
          if (bid.bidder === PROVIDER_NAME) {
            this.requestLurlFromTrackers(bid.trackers, TRACKER_TYPE.LOSE_NOTICE_WHEN_ALLOX_WIN);
          } else {
            const trackersBid = trackers[bid.adUnitId];
            if (trackersBid.lurl) {
              this.sendLurl(trackersBid.lurl, bid);
            };
            if (trackersBid.trackers) {
              this.requestLurlFromTrackers(trackersBid.trackers, TRACKER_TYPE.LOSE_NOTICE_WHEN_ALLOX_LOSE, bid);
            };
          };
        }
      }
    },
    sendLurl(url, wonBid) {
      if (wonBid) {
        const lurl = url
          .replace(LURL_REG.CPM, wonBid.originalCpm)
          .replace(LURL_REG.CURRENCY, wonBid.originalCurrency);
        triggerPixel(lurl);
      } else {
        triggerPixel(url);
      };
    },
    requestLurlFromTrackers(trackers, trackerType, wonBid) {
      const lurlTracker = trackers.filter(tracker => tracker.type === trackerType);
      if (!isEmpty(lurlTracker)) {
        lurlTracker.forEach(tracker => {
          this.sendLurl(tracker.url, wonBid);
        });
      };
    }
  }
);

alloxAnalytics.originEnableAnalytics = alloxAnalytics.enableAnalytics;

alloxAnalytics.enableAnalytics = function (config) {
  alloxAnalytics.originEnableAnalytics(config);
};

adapterManager.registerAnalyticsAdapter({
  adapter: alloxAnalytics,
  code: PROVIDER_NAME,
});

export default alloxAnalytics;
