import { ajax } from 'src/ajax';
import adapter from 'AnalyticsAdapter';
const utils = require('../../utils');

const analyticsType = 'endpoint';

let freestarAnalytics = Object.assign(adapter(
  {
    analyticsType
  }
),
{
  // Override AnalyticsAdapter functions by supplying custom methods
  track({ eventType, args }) {
    // to see loggin add '?pbjs_debug=true' to the end of the URL
    utils.logInfo('Sending Freestar Analytics Event ' + eventType, args);
    if (freestar.msg && freestar.msg.que) {
      freestar.msg.que.push({ eventType, args });
    }
  }
});
export default freestarAnalytics;
