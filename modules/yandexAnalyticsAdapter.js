import buildAdapter from '../libraries/analyticsAdapter/AnalyticsAdapter.js';
import adapterManager from '../src/adapterManager.js';
import { logError, logInfo } from '../src/utils.js';
import CONSTANTS from '../src/constants.json';
import * as events from '../src/events.js';

const tagTlds = ['com', 'ru'];
const fileNames = ['tag', 'int']
const tagUrlTemplate = 'https://mc.yandex.{tld}/metrika/{file}.js';
export const tagURLs = tagTlds.flatMap((tld) => {
  const partialTemplate = tagUrlTemplate.replace('{tld}', tld);
  return fileNames.map((file) => partialTemplate.replace('{file}', file));
});

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
  BID_REQUESTED,
  BID_RESPONSE,
  BID_ADJUSTMENT,
  BID_WON,
  BIDDER_DONE,
  AUCTION_END,
  BID_TIMEOUT,
} = CONSTANTS.EVENTS;

export const EVENTS_TO_TRACK = [
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

  getCounterScript: () => {
    const presentScript = document.querySelector(
      tagURLs.map((tagUrl) => `script[src="${tagUrl}"]`).join(',')
    );
    if (presentScript) {
      return presentScript;
    }

    logInfo('Inserting metrika tag script');
    const script = window.document.createElement('script');
    script.setAttribute('src', tagURLs[0]);
    window.document.body.appendChild(script);
    return script;
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
      yandexAnalytics.bufferedEvents = [];
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
    const presentCounters = validCounters.map(
      (options) => typeof options === 'object' ? options.id : options
    );
    let allCountersInited = false;
    if (presentCounters.length) {
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
        }, true);
      });
    }

    // Inserting counter script and initializing counters
    if (!allCountersInited) {
      const coutnersToInit = validCounters.filter((options) => {
        const id = options === 'object' ? options.id : options;
        return !yandexAnalytics.counters[id];
      });
      waitFor('body', () => window.document.body, () => {
        const tag = yandexAnalytics.getCounterScript();
        const onScriptLoad = () => {
          coutnersToInit.forEach((counterOptions) => {
            const id = counterOptions === 'object'
              ? counterOptions.id
              : counterOptions;
            window[`yaCounter${id}`] =
              new window.Ya.Metrika2(counterOptions);
            yandexAnalytics.onCounterInit(id);
          });
        };
        // Script not only present but loaded
        if (window.Ya && window.Ya.Metrika2) {
          onScriptLoad();
        } else {
          unsubscribeCallbacks.push(() => {
            tag.removeEventListener('load', onScriptLoad);
          });
          tag.addEventListener('load', onScriptLoad);
        }
      });
    }
  },
});

adapterManager.registerAnalyticsAdapter({
  adapter: yandexAnalytics,
  code: 'yandexAnalytics'
});

export default yandexAnalytics;
