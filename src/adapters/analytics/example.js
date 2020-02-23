/**
 * example.js - analytics adapter for Example Analytics Library example
 */

import adapter from '../../AnalyticsAdapter.js';

export default adapter(
  {
    url: 'http://localhost:9999/src/adapters/analytics/libraries/example.js',
    global: 'ExampleAnalyticsGlobalObject',
    handler: 'on',
    analyticsType: 'library'
  }
);
