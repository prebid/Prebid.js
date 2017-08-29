// RealVu Analytics Adapter
import adapter from 'src/AnalyticsAdapter';
import adaptermanager from 'src/adaptermanager';

var adloader = require('src/adloader');

const utils = require('src/utils');
const url = '//ac.realvu.net/realvu_boost.js';

var realvuAdapter = adapter({global:'realvu_ana', handler:'on', analyticsType: 'library'}); 

adaptermanager.registerAnalyticsAdapter({
  adapter: realvuAdapter,
  code: 'realvu_code'
});

adloader.loadScript(url,null,true);
