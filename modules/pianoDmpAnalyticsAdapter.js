import adapter from '../src/AnalyticsAdapter.js';
import adapterManager from '../src/adapterManager.js';

const pianoDmpAnalytics = adapter({ analyticsType: 'bundle', handler: 'on' });

const { enableAnalytics: _enableAnalytics } = pianoDmpAnalytics;

Object.assign(pianoDmpAnalytics, {
  /**
   * Save event in the global array that will be consumed later by cx.js
   */
  track: ({ eventType, args: params }) => {
    window.cX.callQueue.push([
      'prebid',
      { eventType, params, time: Date.now() },
    ]);
  },

  /**
   * Before forwarding the call to the original enableAnalytics function -
   * create (if needed) the global array that is used to pass events to the cx.js library
   * by the 'track' function above.
   */
  enableAnalytics: function (...args) {
    window.cX = window.cX || {};
    window.cX.callQueue = window.cX.callQueue || [];

    return _enableAnalytics.call(this, ...args);
  },
});

adapterManager.registerAnalyticsAdapter({
  adapter: pianoDmpAnalytics,
  code: 'pianoDmp',
  gvlid: 412,
});

export default pianoDmpAnalytics;
