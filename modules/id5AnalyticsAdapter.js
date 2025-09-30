import buildAdapter from '../libraries/analyticsAdapter/AnalyticsAdapter.js';
import {EVENTS} from '../src/constants.js';
import adapterManager from '../src/adapterManager.js';
import {ajax} from '../src/ajax.js';
import {logError, logInfo} from '../src/utils.js';
import * as events from '../src/events.js';

const {
  AUCTION_END,
  TCF2_ENFORCEMENT,
  BID_WON
} = EVENTS

const GVLID = 131;

const STANDARD_EVENTS_TO_TRACK = [
  AUCTION_END,
  TCF2_ENFORCEMENT,
  BID_WON,
];

const CONFIG_URL_PREFIX = 'https://api.id5-sync.com/analytics'
const TZ = new Date().getTimezoneOffset();
const PBJS_VERSION = 'v' + '$prebid.version$';
const ID5_REDACTED = '__ID5_REDACTED__';
const isArray = Array.isArray;

const id5Analytics = Object.assign(buildAdapter({analyticsType: 'endpoint'}), {
  eventsToTrack: STANDARD_EVENTS_TO_TRACK,

  track: (event) => {
    const _this = id5Analytics;

    if (!event || !event.args) {
      return;
    }

    try {
      _this.sendEvent(_this.makeEvent(event.eventType, event.args));
    } catch (error) {
      logError('id5Analytics: ERROR', error);
      _this.sendErrorEvent(error);
    }
  },

  sendEvent: (eventToSend) => {
    // By giving some content this will be automatically a POST
    ajax(id5Analytics.options.ingestUrl, null, JSON.stringify(eventToSend));
  },

  makeEvent: (event, payload) => {
    const _this = id5Analytics;
    const filteredPayload = deepTransformingClone(payload,
      transformFnFromCleanupRules(event));
    return {
      source: 'pbjs',
      event,
      payload: filteredPayload,
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
    _this.sendEvent([
      _this.makeEvent('analyticsError', {
        message: error.message,
        stack: error.stack,
      })
    ]);
  },

  random: () => Math.random(),
});

const ENABLE_FUNCTION = (config) => {
  const _this = id5Analytics;
  _this.options = (config && config.options) || {};

  const partnerId = _this.options.partnerId;
  if (typeof partnerId !== 'number') {
    logError('id5Analytics: partnerId in config.options must be a number representing the id5 partner ID');
    return;
  }

  ajax(`${CONFIG_URL_PREFIX}/${partnerId}/pbjs`, (result) => {
    logInfo('id5Analytics: Received from configuration endpoint', result);

    const configFromServer = JSON.parse(result);

    const sampling = _this.options.id5Sampling =
      typeof configFromServer.sampling === 'number' ? configFromServer.sampling : 0;

    if (typeof configFromServer.ingestUrl !== 'string') {
      logError('id5Analytics: cannot find ingestUrl in config endpoint response; no analytics will be available');
      return;
    }
    _this.options.ingestUrl = configFromServer.ingestUrl;

    // 3-way fallback for which events to track: server > config > standard
    _this.eventsToTrack = configFromServer.eventsToTrack || _this.options.eventsToTrack || STANDARD_EVENTS_TO_TRACK;
    _this.eventsToTrack = isArray(_this.eventsToTrack) ? _this.eventsToTrack : STANDARD_EVENTS_TO_TRACK;

    logInfo('id5Analytics: Configuration is', _this.options);
    logInfo('id5Analytics: Tracking events', _this.eventsToTrack);
    if (sampling > 0 && _this.random() < (1 / sampling)) {
      // Init the module only if we got lucky
      logInfo('id5Analytics: Selected by sampling. Starting up!');

      // allow for replacing cleanup rules - remove existing ones and apply from server
      if (configFromServer.replaceCleanupRules) {
        cleanupRules = {};
      }
      // Merge in additional cleanup rules
      if (configFromServer.additionalCleanupRules) {
        const newRules = configFromServer.additionalCleanupRules;
        _this.eventsToTrack.forEach((key) => {
          // Some protective checks in case we mess up server side
          if (
            isArray(newRules[key]) &&
            newRules[key].every((eventRules) =>
              isArray(eventRules.match) &&
              (eventRules.apply in TRANSFORM_FUNCTIONS))
          ) {
            logInfo('id5Analytics: merging additional cleanup rules for event ' + key);
            if (!Array.isArray(cleanupRules[key])) {
              cleanupRules[key] = newRules[key];
            } else {
              cleanupRules[key].push(...newRules[key]);
            }
          }
        });
      }

      // Replay all events until now
      if (!config.disablePastEventsProcessing) {
        events.getEvents().forEach((event) => {
          if (event && _this.eventsToTrack.indexOf(event.eventType) >= 0) {
            _this.track(event);
          }
        });
      }

      // Register to the events of interest
      _this.handlers = {};
      _this.eventsToTrack.forEach((eventType) => {
        const handler = _this.handlers[eventType] = (args) =>
          _this.track({ eventType, args });
        events.on(eventType, handler);
      });
    }
  });

  // Make only one init possible within a lifecycle
  _this.enableAnalytics = () => {};
};

id5Analytics.enableAnalytics = ENABLE_FUNCTION;
id5Analytics.disableAnalytics = () => {
  const _this = id5Analytics;
  // Un-register to the events of interest
  _this.eventsToTrack.forEach((eventType) => {
    if (_this.handlers && _this.handlers[eventType]) {
      events.off(eventType, _this.handlers[eventType]);
    }
  });

  // Make re-init possible. Work around the fact that past events cannot be forgotten
  _this.enableAnalytics = (config) => {
    config.disablePastEventsProcessing = true;
    ENABLE_FUNCTION(config);
  };
};

adapterManager.registerAnalyticsAdapter({
  adapter: id5Analytics,
  code: 'id5Analytics',
  gvlid: GVLID
});

export default id5Analytics;

function redact(obj, key) {
  obj[key] = ID5_REDACTED;
}

function erase(obj, key) {
  delete obj[key];
}

// The transform function matches against a path and applies
// required transformation if match is found.
function deepTransformingClone(obj, transform, currentPath = []) {
  const result = isArray(obj) ? [] : {};
  const recursable = typeof obj === 'object' && obj !== null;
  if (recursable) {
    const keys = Object.keys(obj);
    if (keys.length > 0) {
      keys.forEach((key) => {
        const newPath = currentPath.concat(key);
        result[key] = deepTransformingClone(obj[key], transform, newPath);
        transform(newPath, result, key);
      });
      return result;
    }
  }
  return obj;
}

// Every set of rules is an object where "match" is an array and
// "apply" is the function to apply in case of match. The function to apply
// takes (obj, prop) and transforms property "prop" in object "obj".
// The "match" is an array of path parts. Each part is either a string or an array.
// In case of array, it represents alternatives which all would match.
// Special path part '*' matches any subproperty or array index.
// Prefixing a part with "!" makes it negative match (doesn't work with multiple alternatives)
let cleanupRules = {};
cleanupRules[AUCTION_END] = [{
  match: [['adUnits', 'bidderRequests'], '*', 'bids', '*', ['userId', 'crumbs'], '!id5id'],
  apply: 'redact'
}, {
  match: [['adUnits', 'bidderRequests'], '*', 'bids', '*', ['userId', 'crumbs'], 'id5id', 'uid'],
  apply: 'redact'
}, {
  match: [['adUnits', 'bidderRequests'], '*', 'bids', '*', 'userIdAsEids', '*', 'uids', '*', ['id', 'ext']],
  apply: 'redact'
}, {
  match: ['bidderRequests', '*', 'gdprConsent', 'vendorData'],
  apply: 'erase'
}, {
  match: ['bidsReceived', '*', ['ad', 'native']],
  apply: 'erase'
}, {
  match: ['noBids', '*', ['userId', 'crumbs'], '*'],
  apply: 'redact'
}, {
  match: ['noBids', '*', 'userIdAsEids', '*', 'uids', '*', ['id', 'ext']],
  apply: 'redact'
}];

cleanupRules[BID_WON] = [{
  match: [['ad', 'native']],
  apply: 'erase'
}];

const TRANSFORM_FUNCTIONS = {
  'redact': redact,
  'erase': erase,
};

// Builds a rule function depending on the event type
function transformFnFromCleanupRules(eventType) {
  const rules = cleanupRules[eventType] || [];
  return (path, obj, key) => {
    for (let i = 0; i < rules.length; i++) {
      let match = true;
      const ruleMatcher = rules[i].match;
      const transformation = rules[i].apply;
      if (ruleMatcher.length !== path.length) {
        continue;
      }
      for (let fragment = 0; fragment < ruleMatcher.length && match; fragment++) {
        const choices = makeSureArray(ruleMatcher[fragment]);
        match = !choices.every((choice) => choice !== '*' &&
          (choice.charAt(0) === '!'
            ? path[fragment] === choice.substring(1)
            : path[fragment] !== choice));
      }
      if (match) {
        const transformfn = TRANSFORM_FUNCTIONS[transformation];
        transformfn(obj, key);
        break;
      }
    }
  };
}

function makeSureArray(object) {
  return isArray(object) ? object : [object];
}
