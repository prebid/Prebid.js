import buildAdapter from '../libraries/analyticsAdapter/AnalyticsAdapter.js';
import adapterManager from '../src/adapterManager.js';
import { logError, logInfo } from '../src/utils.js';
import CONSTANTS from '../src/constants.json';
import * as events from '../src/events.js';

const tagURL = `https://mc.yandex.com/metrika/tag.js`;

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
const waitFor = (operationId, conditionCb, cb) => {
  if (conditionCb()) {
    cb();
  } else {
    timeoutIds[operationId] = setTimeout(() => waitFor(conditionCb, cb), 100);
  }
};

const clearWaitForTimeouts = (timeouts) => {
  timeouts.forEach((timeoutID) => {
    if (timeoutIds[timeoutID]) {
      clearTimeout(timeoutIds[timeoutID]);
    }
  });
};

const SEND_EVENTS_BUNDLE_TIMEOUT = 1500;
const {
  EVENTS: {
    BID_REQUESTED,
    BID_RESPONSE,
    BID_ADJUSTMENT,
    BID_WON,
    BIDDER_DONE,
    AUCTION_END,
    BID_TIMEOUT,
  },
} = CONSTANTS;

const EVENTS_TO_TRACK = [
  BID_REQUESTED,
  BID_RESPONSE,
  BID_ADJUSTMENT,
  BID_WON,
  BIDDER_DONE,
  AUCTION_END,
  BID_TIMEOUT,
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
    logInfo(`Initialized metrika counter ${counterId}`);
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
    const validCounters = counters.filter((counterOptions) => {
      if (!counterOptions) {
        return false;
      }

      if (isNaN(counterOptions) && isNaN(counterOptions.id)) {
        return false;
      }

      return true;
    });

    if (!validCounters.length) {
      logError('options.counters contains no valid counter ids');
      return;
    }

    const unsubscribeCallbacks = [
      () => clearWaitForTimeouts(['body', 'countersInit']),
    ];

    yandexAnalytics.initTimeoutId = setTimeout(() => {
      yandexAnalytics.bufferedEvents = null;
      unsubscribeCallbacks.forEach((cb) => cb());
      logError(`Can't find metrika counter after 25 seconds.`);
      logError('Aborting analytics provider initialization.');
    }, 25000);

    events.getEvents().forEach((event) => {
      if (event && EVENTS_TO_TRACK.indexOf(event.eventType) >= 0) {
        yandexAnalytics.onEvent(event.eventType, event);
      }
    });

    const eventsCallbacks = [];
    EVENTS_TO_TRACK.forEach((eventName) => {
      const eventCallback = yandexAnalytics.onEvent.bind(null, eventName);
      eventsCallbacks.push([eventName, eventCallback]);
      events.on(eventName, eventCallback);
    });

    unsubscribeCallbacks.push(() => {
      eventsCallbacks.forEach(([eventName, cb]) => events.off(eventName, cb));
    });

    // Waiting for counters appearing on the page
    const presentCounters = validCounters.filter((options) => typeof options !== 'object');
    if (presentCounters.length) {
      let allCountersInited = false;
      tryUntil('countersInit', () => allCountersInited, () => {
        allCountersInited = presentCounters.reduce((result, counterId) => {
          if (yandexAnalytics.counters[counterId]) {
            return result && true;
          }

          if (window[`yaCounter${counterId}`]) {
            yandexAnalytics.onCounterInit(counterId);
            return result && true;
          }

          return false;
        });
      });
    }

    // Inserting counter script and initializing counters
    const coutnersToInit = validCounters.filter((options) => typeof options === 'object');
    if (coutnersToInit.length) {
      waitFor('body', () => document.body, () => {
        const tag = document.createElement('script');
        tag.setAttribute('src', tagURL);
        const onScriptLoad = () => {
          coutnersToInit.forEach((counterOptions) => {
            window[`yaCounter${counterOptions.id}`] =
              new window.Ya.Metrika2(counterOptions);
            yandexAnalytics.onCounterInit(counterOptions.id);
          });
        };
        unsubscribeCallbacks.push(() => {
          tag.removeEventListener('load', onScriptLoad);
        });
        tag.addEventListener('load', onScriptLoad);
        document.body.appendChild(tag);
        logInfo('Inserting metrika tag script');
      });
    }
  },
});

adapterManager.registerAnalyticsAdapter({
  adapter: yandexAnalytics,
  code: 'yandexAnalytics'
});

export default yandexAnalytics;
