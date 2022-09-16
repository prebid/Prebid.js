/* eslint-disable no-console */
import { ajax } from '../../../src/ajax.js';

/**
 * example2.js - analytics adapter for Example2 Analytics Endpoint example
 */

import adapter from '../AnalyticsAdapter.js';

const url = 'https://httpbin.org/post';
const analyticsType = 'endpoint';

export default Object.assign(adapter(
  {
    url,
    analyticsType
  }
),
{
  // Override AnalyticsAdapter functions by supplying custom methods
  track({ eventType, args }) {
    console.log('track function override for Example2 Analytics');
    ajax(url, (result) => console.log('Analytics Endpoint Example2: result = ' + result), JSON.stringify({ eventType, args }));
  }
});
