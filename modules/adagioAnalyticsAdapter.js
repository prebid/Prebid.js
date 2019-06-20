/**
 * Analytics Adapter for Adagio
 */

import adapter from 'src/AnalyticsAdapter';
import adapterManager from 'src/adapterManager';
import CONSTANTS from 'src/constants.json';

const emptyUrl = '';
const analyticsType = 'endpoint';
const events = Object.keys(CONSTANTS.EVENTS).map(key => CONSTANTS.EVENTS[key]);
const VERSION = '1.3.0';

let adagioAdapter = Object.assign(adapter({ emptyUrl, analyticsType }));

function canAccessTopWindow() {
  try {
    if (window.top.location.href) {
      return true;
    }
  } catch (error) {
    return false;
  }
}

if (canAccessTopWindow()) {
  window.top.ADAGIO = window.top.ADAGIO || {};
  window.top.ADAGIO.queue = window.top.ADAGIO.queue || [];
  window.top.ADAGIO.versions = window.top.ADAGIO.versions || {};
  window.top.ADAGIO.versions.adagioAnalyticsAdapter = VERSION;

  const adagioEnqueue = function adagioEnqueue(action, data) {
    window.top.ADAGIO.queue.push({ action, data, ts: Date.now() });
  }

  adagioAdapter = Object.assign(adapter({ emptyUrl, analyticsType }), {
    track({ eventType, args }) {
      if (typeof args !== 'undefined' && events.indexOf(eventType) !== -1) {
        adagioEnqueue('pb-analytics-event', { eventName: eventType, args });
      }
    }
  });
}

adapterManager.registerAnalyticsAdapter({
  adapter: adagioAdapter,
  code: 'adagio'
});

export default adagioAdapter;
