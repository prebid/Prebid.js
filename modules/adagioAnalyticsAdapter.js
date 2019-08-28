/**
 * Analytics Adapter for Adagio
 */

import adapter from 'src/AnalyticsAdapter';
import adapterManager from 'src/adapterManager';
import CONSTANTS from 'src/constants.json';
import * as utils from 'src/utils';

const emptyUrl = '';
const analyticsType = 'endpoint';
const events = Object.keys(CONSTANTS.EVENTS).map(key => CONSTANTS.EVENTS[key]);
const VERSION = '1.3.0';

const adagioEnqueue = function adagioEnqueue(action, data) {
  utils.getWindowTop().ADAGIO.queue.push({ action, data, ts: Date.now() });
}

function canAccessTopWindow() {
  try {
    if (utils.getWindowTop().location.href) {
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

  window.top.ADAGIO = window.top.ADAGIO || {};
  window.top.ADAGIO.queue = window.top.ADAGIO.queue || [];
  window.top.ADAGIO.versions = window.top.ADAGIO.versions || {};
  window.top.ADAGIO.versions.adagioAnalyticsAdapter = VERSION;

  adagioAdapter.originEnableAnalytics(config);
}

adapterManager.registerAnalyticsAdapter({
  adapter: adagioAdapter,
  code: 'adagio'
});

export default adagioAdapter;
