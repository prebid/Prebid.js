import adapter from '../src/AnalyticsAdapter.js';
import adapterManager from '../src/adapterManager.js';

const relevantAnalytics = adapter({ analyticsType: 'bundle', handler: 'on' });

const { enableAnalytics: orgEnableAnalytics } = relevantAnalytics;

Object.assign(relevantAnalytics, {
  /**
   * Save event in the global array that will be consumed later by the Relevant Yield library
   */
  track: ({ eventType: ev, args }) => {
    window.relevantDigital.pbEventLog.push({ ev, args, ts: new Date() });
  },

  /**
   * Before forwarding the call to the original enableAnalytics function -
   * create (if needed) the global array that is used to pass events to the Relevant Yield library
   * by the 'track' function above.
   */
  enableAnalytics: function(...args) {
    window.relevantDigital = window.relevantDigital || {};
    window.relevantDigital.pbEventLog = window.relevantDigital.pbEventLog || [];
    return orgEnableAnalytics.call(this, ...args);
  },
});

adapterManager.registerAnalyticsAdapter({
  adapter: relevantAnalytics,
  code: 'relevant',
});

export default relevantAnalytics;
