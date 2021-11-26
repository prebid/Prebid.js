/**
 * Analytics Adapter for Adagio
 */

import adapter from '../src/AnalyticsAdapter.js';
import adapterManager from '../src/adapterManager.js';
import CONSTANTS from '../src/constants.json';
import { getWindowTop } from '../src/utils.js';

const emptyUrl = '';
const analyticsType = 'endpoint';
const events = Object.keys(CONSTANTS.EVENTS).map(key => CONSTANTS.EVENTS[key]);
const VERSION = '2.0.0';

const adagioEnqueue = function adagioEnqueue(action, data) {
  getWindowTop().ADAGIO.queue.push({ action, data, ts: Date.now() });
}

function canAccessTopWindow() {
  try {
    if (getWindowTop().location.href) {
      return true;
    }
  } catch (error) {
    return false;
  }
}

let adagioAdapter = Object.assign(adapter({ emptyUrl, analyticsType }), {
  track: function({ eventType, args }) {
    if (typeof args !== 'undefined' && events.indexOf(eventType) !== -1) {
      adagioEnqueue('pb-analytics-event', { eventName: eventType, args });
    }
  }
});

adagioAdapter.originEnableAnalytics = adagioAdapter.enableAnalytics;

adagioAdapter.enableAnalytics = config => {
  if (!canAccessTopWindow()) {
    return;
  }

  const w = getWindowTop();

  w.ADAGIO = w.ADAGIO || {};
  w.ADAGIO.queue = w.ADAGIO.queue || [];
  w.ADAGIO.versions = w.ADAGIO.versions || {};
  w.ADAGIO.versions.adagioAnalyticsAdapter = VERSION;

  adagioAdapter.originEnableAnalytics(config);
}

adapterManager.registerAnalyticsAdapter({
  adapter: adagioAdapter,
  code: 'adagio'
});

export default adagioAdapter;
