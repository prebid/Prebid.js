import buildAdapter from '../libraries/analyticsAdapter/AnalyticsAdapter.js';
import adapterManager from '../src/adapterManager.js';
import { logError, logInfo } from '../src/utils.js';
import { EVENTS } from '../src/constants.js';
import * as events from '../src/events.js';

const timeoutIds = {};
const tryUntil = (operationId, conditionCb, cb) => {
  if (!conditionCb()) {
    cb();
    timeoutIds[operationId] = setTimeout(
      () => tryUntil(conditionCb, conditionCb, cb),
      100
    );
  }
};

const clearTryUntilTimeouts = (timeouts) => {
  timeouts.forEach((timeoutID) => {
    if (timeoutIds[timeoutID]) {
      clearTimeout(timeoutIds[timeoutID]);
    }
  });
};

const SEND_EVENTS_BUNDLE_TIMEOUT = 1500;
const {
  BID_REQUESTED,
  BID_RESPONSE,
  BID_ADJUSTMENT,
  BID_WON,
  BIDDER_DONE,
  AUCTION_END,
  BID_TIMEOUT,
  AD_RENDER_FAILED,
  AD_RENDER_SUCCEEDED,
  BIDDER_ERROR,
} = EVENTS;

export const EVENTS_TO_TRACK = [
  BID_REQUESTED,
  BID_RESPONSE,
  BID_ADJUSTMENT,
  BID_WON,
  BIDDER_DONE,
  AUCTION_END,
  BID_TIMEOUT,
  AD_RENDER_FAILED,
  AD_RENDER_SUCCEEDED,
  BIDDER_ERROR,
];

const yandexAnalytics = Object.assign(buildAdapter({ analyticsType: 'endpoint' }), {
  bufferedEvents: [],
  initTimeoutId: 0,
  counters: {},
  counterInitTimeouts: {},
  oneCounterInited: false,

  onEvent: (eventName, eventData) => {
    const innerEvent = {
      event: eventName,
      data: eventData,
    };
    yandexAnalytics.bufferedEvents.push(innerEvent);
  },

  sendEvents: () => {
    if (yandexAnalytics.bufferedEvents.length) {
      const data = yandexAnalytics.bufferedEvents.splice(
        0,
        yandexAnalytics.bufferedEvents.length
      );

      Object.keys(yandexAnalytics.counters).forEach((counterId) => {
        yandexAnalytics.counters[counterId].pbjs(data);
      });
    }
    setTimeout(yandexAnalytics.sendEvents, SEND_EVENTS_BUNDLE_TIMEOUT);
  },

  onCounterInit: (counterId) => {
    yandexAnalytics.counters[counterId] = window[`yaCounter${counterId}`];
    logInfo(`Found metrika counter ${counterId}`);
    if (!yandexAnalytics.oneCounterInited) {
      yandexAnalytics.oneCounterInited = true;
      setTimeout(() => {
        yandexAnalytics.sendEvents();
      }, SEND_EVENTS_BUNDLE_TIMEOUT);
      clearTimeout(yandexAnalytics.initTimeoutId);
    }
  },

  enableAnalytics: (config) => {
    yandexAnalytics.options = (config && config.options) || {};
    const { counters } = yandexAnalytics.options || {};
    const validCounters = counters.filter((counterId) => {
      if (!counterId) {
        return false;
      }

      if (isNaN(counterId)) {
        return false;
      }

      return true;
    });

    if (!validCounters.length) {
      logError('options.counters contains no valid counter ids');
      return;
    }

    const unsubscribeCallbacks = [
      () => clearTryUntilTimeouts(['countersInit']),
    ];

    yandexAnalytics.initTimeoutId = setTimeout(() => {
      yandexAnalytics.bufferedEvents = [];
      unsubscribeCallbacks.forEach((cb) => cb());
      logError(`Can't find metrika counter after 25 seconds.`);
      logError('Aborting yandex analytics provider initialization.');
    }, 25000);

    events.getEvents().forEach((event) => {
      if (event && EVENTS_TO_TRACK.indexOf(event.eventType) >= 0) {
        yandexAnalytics.onEvent(event.eventType, event);
      }
    });

    EVENTS_TO_TRACK.forEach((eventName) => {
      const eventCallback = yandexAnalytics.onEvent.bind(null, eventName);
      unsubscribeCallbacks.push(() => events.off(eventName, eventCallback));
      events.on(eventName, eventCallback);
    });

    let allCountersInited = false;
    tryUntil('countersInit', () => allCountersInited, () => {
      allCountersInited = validCounters.reduce((result, counterId) => {
        if (yandexAnalytics.counters[counterId]) {
          return result && true;
        }

        if (window[`yaCounter${counterId}`]) {
          yandexAnalytics.onCounterInit(counterId);
          return result && true;
        }

        return false;
      }, true);
    });
  },
});

adapterManager.registerAnalyticsAdapter({
  adapter: yandexAnalytics,
  code: 'yandex'
});

export default yandexAnalytics;
