// RealVu Analytics Adapter
import adapter from 'src/AnalyticsAdapter';
import adaptermanager from 'src/adaptermanager';

var realvuAnalyticsAdapter = adapter({
  global: 'realvu',
  handler: 'on',
  analyticsType: 'library',
  url: '//ac.realvu.net/realvu_boost.js'
});

// save the base class function
// QQQ realvuAnalyticsAdapter.originEnableAnalytics = adapter.enableAnalytics;

// override enableAnalytics so we can get access to the config passed in from the page
realvuAnalyticsAdapter.enableAnalytics = function (config) {
  var msg = document.getElementById("msg_an");
  if(msg) {
    msg.innerHTML += 'config:<br>' + JSON.stringify(config);
  }
// QQQ  initOptions = config.options;
// QQQ  realvuAnalyticsAdapter.originEnableAnalytics(config);  // call the base class function
};

realvuAnalyticsAdapter.track = function (eventType, args) {

}

var top1 = window;
try {
  var wnd = window;
  while ((top != top1) && (typeof (wnd.document) != 'undefined')) {
    top1 = wnd;
    wnd = wnd.parent;
  }
} catch (e) { };

realvuAnalyticsAdapter.inView = function (bid, partner_id) {
  return top1.realvu_boost.addUnitById({unit_id: bid.placementCode, partner_id: partner_id, size: bid.sizes});
}

// queue() is a proxy function to add a callback function to boost_fifo to be async executed in realvu_boost
realvuAnalyticsAdapter.queue = function (callback) {
  if (typeof callback === 'function') {
    top1.boost_fifo = top1.boost_fifo || [];
    top1.boost_fifo.push(callback);
  }
}

adaptermanager.registerAnalyticsAdapter({
  adapter: realvuAnalyticsAdapter,
  code: 'realvu'
});

module.exports = realvuAnalyticsAdapter;
