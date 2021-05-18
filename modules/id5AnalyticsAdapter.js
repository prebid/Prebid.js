// import {ajax} from '../src/ajax';
import buildAdapter from '../src/AnalyticsAdapter.js';
import CONSTANTS from '../src/constants.json';
import adapterManager from '../src/adapterManager.js';
import { ajax } from '../src/ajax.js';
const utils = require('../src/utils.js');

const GVLID = 131;
const EVENTS_TO_TRACK = [
  CONSTANTS.EVENTS.AUCTION_END,
  CONSTANTS.EVENTS.AUCTION_INIT,
  CONSTANTS.EVENTS.SET_TARGETING,
  CONSTANTS.EVENTS.TCF2_ENFORCEMENT,
];
const FLUSH_EVENTS = [
  CONSTANTS.EVENTS.TCF2_ENFORCEMENT,
  CONSTANTS.EVENTS.AUCTION_END,
];
const CONFIG_URL_PREFIX = 'https://api.id5-sync.com/analytics/'
const TZ = new Date().getTimezoneOffset();
const PBJS_VERSION = $$PREBID_GLOBAL$$.version;

let id5Analytics = Object.assign(buildAdapter({analyticsType: 'endpoint'}), {
  eventBuffer: {},
  track: (event) => {
    const _this = id5Analytics;
    const auctionId = event.args.auctionId;

    if (EVENTS_TO_TRACK.indexOf(event.eventType) < 0) {
      return;
    }

    try {
      _this.eventBuffer[auctionId] = _this.eventBuffer[auctionId] || [];

      // Collect events and send them in a batch when the auction ends
      const que = _this.eventBuffer[auctionId];
      que.push(_this.makeEvent('PBJS_' + event.eventType.event.args));

      if (FLUSH_EVENTS.indexOf(event.eventType) >= 0) {
        // Auction ended. Send the batch of collected events
        _this.sendEvents(que);

        // From now on just send events to server side as they come
        que.push = (pushedEvent) => _this.sendEvents([pushedEvent]);
      }
    } catch (error) {
      utils.logError('id5Analytics', error);
      _this.sendErrorEvent(error);
    }
  },

  sendEvents: (events) => {
    const _this = id5Analytics;
    events.forEach((event) => ajax(_this.options.backEndUrl, null, event));
  },

  makeEvent: (event, payload) => {
    const _this = id5Analytics;
    return {
      event,
      payload,
      partnerId: _this.options.partnerId,
      meta: {
        sampling: _this.options.id5Sampling,
        pbjs: PBJS_VERSION,
        tz: TZ,
      }
    };
  },

  sendErrorEvent: (error) => {
    const _this = id5Analytics;
    _this.sendEvents([
      _this.makeEvent('PBJS_ANALYTICS_ERROR', {
        message: error.message,
        stack: error.stack,
      })
    ]);
  },
});

// save the base class function
id5Analytics.originEnableAnalytics = id5Analytics.enableAnalytics;

// override enableAnalytics so we can get access to the config passed in from the page
id5Analytics.enableAnalytics = (config) => {
  id5Analytics.options = typeof config === 'object' ? config.options : {};

  // We do our own sampling strategy (see AnalyticsAdapter.js)
  id5Analytics.options.sampling = undefined;

  const partnerId = id5Analytics.options.partnerId;
  if (typeof partnerId !== 'number') {
    utils.logWarn('id5Analytics: cannot find partnerId in config.options');
    return;
  }

  ajax(`${CONFIG_URL_PREFIX}/${partnerId}/pbjs`, (result) => {
    // Store our sampling in id5Sampling as opposed to standard property sampling

    const sampling = id5Analytics.options.id5Sampling =
      typeof result.sampling === 'number' ? result.sampling : 0;

    if (typeof result.evtUrl !== 'string') {
      utils.logWarn('id5Analytics: cannot find evtUrl in config endpoint response');
      return;
    }
    id5Analytics.options.backEndUrl = result.evtUrl;

    if (sampling > 0 && Math.random() < (1 / sampling)) {
      // Init the module only if we got lucky
      utils.logInfo('id5Analytics: starting up!')
      id5Analytics.originEnableAnalytics(config); // call the base class function
    }
  });
};

adapterManager.registerAnalyticsAdapter({
  adapter: id5Analytics,
  code: 'id5Analytics',
  gvlid: GVLID
});

export default id5Analytics;
