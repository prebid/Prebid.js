/**
*
*********************************************************
*
* Optimon.io Prebid Analytics Adapter
*
*********************************************************
*
*/

import adapter from '../src/AnalyticsAdapter.js';
import adapterManager from '../src/adapterManager.js';

const optimonAnalyticsAdapter = adapter({
  global: 'OptimonAnalyticsAdapter',
  handler: 'on',
  analyticsType: 'bundle'
});

adapterManager.registerAnalyticsAdapter({
  adapter: optimonAnalyticsAdapter,
  code: 'optimon',
});

export default optimonAnalyticsAdapter;
