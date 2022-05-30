/* eslint-disable no-console */
/** @module example */

window.ExampleAnalyticsGlobalObject = function(hander, type, data) {
  console.log(`call to Example Analytics library: example('${hander}', '${type}', ${JSON.stringify(data)})`);
};

window[window.ExampleAnalyticsGlobalObject] = function() {};

// var utils = require('utils');
// var events = require('events');
// var pbjsHandlers = require('prebid-event-handlers');
var utils = { errorless: function(fn) { return fn; } };

var events = { init: function() { return arguments; } };

var pbjsHandlers = {
  onBidAdjustment: args => console.log('pbjsHandlers onBidAdjustment args:', args),
  onBidTimeout: args => console.log('pbjsHandlers bidTimeout args:', args),
  onBidRequested: args => console.log('pbjsHandlers bidRequested args:', args),
  onBidResponse: args => console.log('pbjsHandlers bidResponse args:', args),
  onBidWon: args => console.log('pbjsHandlers bidWon args:', args)
};

// init
var example = window[window.ExampleAnalyticsGlobalObject];
var bufferedQueries = example.q || [];

events.init();

// overwrite example object and handle 'on' callbacks
window[window.ExampleAnalyticsGlobalObject] = example = utils.errorless(function() {
  if (arguments[0] && arguments[0] === 'on') {
    var eventName = arguments[1] && arguments[1];
    var args = arguments[2] && arguments[2];
    if (eventName && args) {
      if (eventName === 'bidAdjustment') {
        pbjsHandlers.onBidAdjustment.apply(this, [args]);
      }
      if (eventName === 'bidTimeout') {
        pbjsHandlers.onBidTimeout.apply(this, [args]);
      }
      if (eventName === 'bidRequested') {
        pbjsHandlers.onBidRequested.apply(this, [args]);
      }
      if (eventName === 'bidResponse') {
        pbjsHandlers.onBidResponse.apply(this, [args]);
      }
      if (eventName === 'bidWon') {
        pbjsHandlers.onBidWon.apply(this, [args]);
      }
    }
  }
});

// apply bufferedQueries
bufferedQueries.forEach(function(args) {
  example.apply(this, args);
});
