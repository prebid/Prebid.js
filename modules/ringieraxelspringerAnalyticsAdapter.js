import adapter from '../libraries/analyticsAdapter/AnalyticsAdapter.js';
import adapterManager from '../src/adapterManager.js';

var ringieraxelspringerAdapter = adapter({
  global: 'ringieraxelspringerPrebidAnalytics',
  handler: 'on',
  analyticsType: 'bundle'
});

adapterManager.registerAnalyticsAdapter({
  adapter: ringieraxelspringerAdapter,
  code: 'ringieraxelspringer'
});

export default ringieraxelspringerAdapter;
