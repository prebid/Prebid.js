// RealVu Analytics Adapter
import adapter from 'src/AnalyticsAdapter';
import adaptermanager from 'src/adaptermanager';

var adloader = require('src/adloader');

const url = '//ac.realvu.net/realvu_boost.js';

var realvuAnalyticsAdapter = adapter({global:'RealVuPrebidAnalytics', handler:'on', analyticsType: 'library'}); 

adaptermanager.registerAnalyticsAdapter({
  adapter: realvuAnalyticsAdapter,
  code: 'realvu'
});

adloader.loadScript(url, null, true);
export default realvuAnalyticsAdapter;
