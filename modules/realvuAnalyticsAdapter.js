// RealVu Analytics Adapter
import adapter from 'src/AnalyticsAdapter';
import adaptermanager from 'src/adaptermanager';

var realvuAnalyticsAdapter = adapter({
  global: 'realVuAnalytics',
  handler: 'on',
  analyticsType: 'library',
  url: '//ac.realvu.net/realvu_boost.js'
});

realvuAnalyticsAdapter.enableAnalytics = function (config) {
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

realvuAnalyticsAdapter.queue = function (callback) {
  if (typeof callback === 'function') {
    top1.boost_fifo = top.boost_fifo || [];
    top1.boost_fifo.push(callback);
  }
}

adaptermanager.registerAnalyticsAdapter({
  adapter: realvuAnalyticsAdapter,
  code: 'realvu'
});

module.exports = realvuAnalyticsAdapter;
