var KeenTracking = require('keen-tracking');

var events = require('src/events');
var utils = require('src/utils');
var CONSTANTS = require('src/constants.json');
var adaptermanager = require('src/adaptermanager');

var BID_REQUESTED = CONSTANTS.EVENTS.BID_REQUESTED;
var BID_TIMEOUT = CONSTANTS.EVENTS.BID_TIMEOUT;
var BID_RESPONSE = CONSTANTS.EVENTS.BID_RESPONSE;
var BID_WON = CONSTANTS.EVENTS.BID_WON;

function convertToCents(dollars) {
  if (dollars) {
    return Math.floor(dollars * 100);
  }

  return 0;
}

function getLoadTimeDistribution(time) {
  var distribution;
  if (time >= 0 && time < 200) {
    distribution = '0-200ms';
  } else if (time >= 200 && time < 300) {
    distribution = '0200-300ms';
  } else if (time >= 300 && time < 400) {
    distribution = '0300-400ms';
  } else if (time >= 400 && time < 500) {
    distribution = '0400-500ms';
  } else if (time >= 500 && time < 600) {
    distribution = '0500-600ms';
  } else if (time >= 600 && time < 800) {
    distribution = '0600-800ms';
  } else if (time >= 800 && time < 1000) {
    distribution = '0800-1000ms';
  } else if (time >= 1000 && time < 1200) {
    distribution = '1000-1200ms';
  } else if (time >= 1200 && time < 1500) {
    distribution = '1200-1500ms';
  } else if (time >= 1500 && time < 2000) {
    distribution = '1500-2000ms';
  } else if (time >= 2000) {
    distribution = '2000ms above';
  }

  return distribution;
}

function getCpmDistribution(cpm) {
  var distribution;
  if (cpm >= 0 && cpm < 0.5) {
    distribution = '$0-0.5';
  } else if (cpm >= 0.5 && cpm < 1) {
    distribution = '$0.5-1';
  } else if (cpm >= 1 && cpm < 1.5) {
    distribution = '$1-1.5';
  } else if (cpm >= 1.5 && cpm < 2) {
    distribution = '$1.5-2';
  } else if (cpm >= 2 && cpm < 2.5) {
    distribution = '$2-2.5';
  } else if (cpm >= 2.5 && cpm < 3) {
    distribution = '$2.5-3';
  } else if (cpm >= 3 && cpm < 4) {
    distribution = '$3-4';
  } else if (cpm >= 4 && cpm < 6) {
    distribution = '$4-6';
  } else if (cpm >= 6 && cpm < 8) {
    distribution = '$6-8';
  } else if (cpm >= 8) {
    distribution = '$8 above';
  }

  return distribution;
}

exports.enableAnalytics = function ({ provider, options }) {
  var client = new KeenTracking({
    projectId: options.projectId,
    writeKey: options.writeKey
  });

  // bidRequests
  events.on(BID_REQUESTED, function (bidRequestObj) {
    console.log('bids have been requested');
    client.recordEvent('bid_requested', bidRequestObj, (err, res) => {
      if (err) {
        console.log('data passed to keen.io');
      }
      else {
        console.log('error of loggin to keen.io');
      }
    });
  });

  // bidResponses
  events.on(BID_RESPONSE, function (bid) {
    // do logic
    console.log('responses have been received');
  });

  // bidTimeouts
  events.on(BID_TIMEOUT, function (bidderArray) {
    // do logic
    console.log('timeout analysis');
  });

  // wins
  events.on(BID_WON, function (bid) {
    // do logic
    console.log('winners analysis');
  });

  this.enableAnalytics = function _enable() {
    return utils.logMessage(`Analytics adapter already enabled, unnecessary call to \`enableAnalytics\`.`);
  };
};

adaptermanager.registerAnalyticsAdapter({
  adapter: exports,
  code: 'keenio'
});
