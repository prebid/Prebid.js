// RealVu Analytics Adapter
import adapter from 'src/AnalyticsAdapter';
import adaptermanager from 'src/adaptermanager';
import CONSTANTS from 'src/constants.json';
// const utils = require('src/utils');

var realvuAnalyticsAdapter = adapter({
  global: 'realvuAnalytics',
  handler: 'on',
  analyticsType: 'library',
  url: '//ac.realvu.net/realvu_boost.js'
});

var options = { };

var top1 = window;
try {
  var wnd = window;
  while ((top != top1) && (typeof (wnd.document) != 'undefined')) {
    top1 = wnd;
    wnd = wnd.parent;
  }
} catch (e) { };
top1.boost_fifo = top1.boost_fifo || [];
top1.boost_units = top1.boost_units || [];

realvuAnalyticsAdapter.originEnableAnalytics = realvuAnalyticsAdapter.enableAnalytics;

realvuAnalyticsAdapter.enableAnalytics = function (config) {
  var msg = document.getElementById('msg_an');
  if (msg) {
    msg.innerHTML += 'config:<br>' + JSON.stringify(config) + '<br>';
  }
  options = config.options;
  realvuAnalyticsAdapter.originEnableAnalytics(config);
};

realvuAnalyticsAdapter.track = function ({eventType, args}) {
  var msg = document.getElementById('msg_an');
  if (msg) {
    msg.innerHTML += 'track: ' + eventType + '; ';
  }
  if (eventType === CONSTANTS.EVENTS.AUCTION_INIT) {
    if (options.partner_id) {
      var hb = $$PREBID_GLOBAL$$;
      for (var i = 0; i < hb.adUnits.length; i++) {
        var code = hb.adUnits[i].code;
        var b = options.all_in;
        if (!b && options.unit_ids) {
          for (var j = 0; j < options.unit_ids.length; j++) {
            if (code === options.unit_ids[j]) {
              b = true;
              break;
            }
          }
        }
        if (b) {
          // register the unit in realvu_boost
          var sizes = hb.adUnits[i].sizes;
          var ui = {partner_id: options.partner_id, unit_id: code, size: sizes};
          top1.boost_units.push(ui);
        }
      }
    }
  }
}

realvuAnalyticsAdapter.inView = function (bid, partner_id) {
  return top1.realvu_boost.addUnitById({unit_id: bid.placementCode, partner_id: partner_id, size: bid.sizes});
}

// queue() is a proxy function to add a callback function to boost_fifo to be async executed in realvu_boost
realvuAnalyticsAdapter.queue = function (callback) {
  if (typeof callback === 'function') {
    top1.boost_fifo.push(callback);
  }
}

adaptermanager.registerAnalyticsAdapter({
  adapter: realvuAnalyticsAdapter,
  code: 'realvuAnalytics'
});

module.exports = realvuAnalyticsAdapter;
