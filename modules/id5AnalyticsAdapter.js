import buildAdapter from '../src/AnalyticsAdapter.js';
import CONSTANTS from '../src/constants.json';
import adapterManager from '../src/adapterManager.js';
import { ajax } from '../src/ajax.js';
import { logWarn, logInfo, logError } from '../src/utils.js';
import events from '../src/events.js';

const GVLID = 131;
const EVENTS_TO_TRACK = [
  CONSTANTS.EVENTS.AUCTION_END,
  CONSTANTS.EVENTS.AUCTION_INIT,
  CONSTANTS.EVENTS.TCF2_ENFORCEMENT,
];
const FLUSH_EVENTS = [
  CONSTANTS.EVENTS.TCF2_ENFORCEMENT,
  CONSTANTS.EVENTS.AUCTION_END,
];
// const CONFIG_URL_PREFIX = 'https://api.id5-sync.com/analytics'
const CONFIG_URL_PREFIX = 'https://127.0.0.1:8443/analytics'
const TZ = new Date().getTimezoneOffset();
const PBJS_VERSION = $$PREBID_GLOBAL$$.version;

let id5Analytics = Object.assign(buildAdapter({analyticsType: 'endpoint'}), {
  // Keeps an array of events for each auction
  eventBuffer: {},

  track: (event) => {
    const _this = id5Analytics;

    if (!event) {
      return;
    }

    try {
      const auctionId = event.args.auctionId;
      _this.eventBuffer[auctionId] = _this.eventBuffer[auctionId] || [];

      // Collect events and send them in a batch when the auction ends
      const que = _this.eventBuffer[auctionId];
      que.push(_this.makeEvent('pbjs_' + event.eventType, event.args));

      if (FLUSH_EVENTS.indexOf(event.eventType) >= 0) {
        // Auction ended. Send the batch of collected events
        _this.sendEvents(que);

        // From now on just send events to server side as they come
        que.push = (pushedEvent) => _this.sendEvents([pushedEvent]);
      }
    } catch (error) {
      logError('id5Analytics', error);
      _this.sendErrorEvent(error);
    }
  },

  sendEvents: (eventsToSend) => {
    const _this = id5Analytics;
    // By giving some content this will be automatically a POST
    eventsToSend.forEach((event) =>
      ajax(_this.options.ingestUrl, null, JSON.stringify(event)));
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
      _this.makeEvent('pbjs_analyticsError', {
        message: error.message,
        stack: error.stack,
      })
    ]);
  },

  // Encapsulating for deterministic testing
  random: () => Math.random(),
});

// save the base class function
id5Analytics.originEnableAnalytics = id5Analytics.enableAnalytics;

// Replace enableAnalytics
const ENABLE_FUNCTION = (config) => {
  id5Analytics.options = typeof config === 'object' ? (config.options || {}) : {};

  // We do our own sampling strategy (see AnalyticsAdapter.js)
  id5Analytics.options.sampling = undefined;

  const partnerId = id5Analytics.options.partnerId;
  if (typeof partnerId !== 'number') {
    logWarn('id5Analytics: cannot find partnerId in config.options');
    return;
  }

  ajax(`${CONFIG_URL_PREFIX}/${partnerId}/pbjs`, (result) => {
    const id5Config = JSON.parse(result);

    // Store our sampling in id5Sampling as opposed to standard property sampling
    const sampling = id5Analytics.options.id5Sampling =
      typeof id5Config.sampling === 'number' ? id5Config.sampling : 0;

    if (typeof id5Config.ingestUrl !== 'string') {
      logWarn('id5Analytics: cannot find ingestUrl in config endpoint response');
      return;
    }
    id5Analytics.options.ingestUrl = id5Config.ingestUrl;

    logInfo('id5Analytics: Configuration is ' + JSON.stringify(id5Analytics.options));
    if (sampling > 0 && id5Analytics.random() < (1 / sampling)) {
      // Init the module only if we got lucky
      logInfo('id5Analytics: Selected by sampling. Starting up!')

      // Clean start
      id5Analytics.eventBuffer = {};

      // Replay all events until now
      events.getEvents().forEach(event => {
        if (!!event && EVENTS_TO_TRACK.indexOf(event.eventType) >= 0) {
          id5Analytics.enqueue(event);
        }
      });

      // Register to the events of interest
      EVENTS_TO_TRACK.forEach((eventType) => {
        events.on(eventType, (event) => id5Analytics.enqueue(event));
      });
    }
  });

  // Make only one init possible within a lifecycle
  id5Analytics.enableAnalytics = () => {};
};

id5Analytics.enableAnalytics = ENABLE_FUNCTION;
id5Analytics.disableAnalytics = () => {
  // Make re-init possible
  id5Analytics.enableAnalytics = ENABLE_FUNCTION;
};

adapterManager.registerAnalyticsAdapter({
  adapter: id5Analytics,
  code: 'id5Analytics',
  gvlid: GVLID
});

export default id5Analytics;
