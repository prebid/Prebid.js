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
  if( typeof options.projectId === 'undefined' || typeof options.writeKey === 'undefined' ) {
    return utils.logMessage('You have to define keen.oi projectId and writeKey');
  }
  var client = new KeenTracking({
    projectId: options.projectId,
    writeKey: options.writeKey
  });
  const helpers = KeenTracking.helpers;
  // extend the model of data
  client.extendEvents(() => {
    return {
      geo: {
        info: {},
        ip_address: '${keen.ip}'
      },
      page: {
        info: {},
        title: document.title,
        url: document.location.href
      },
      referrer: {
        info: {},
        url: document.referrer
      },
      tech: {
        browser: helpers.getBrowserProfile(),
        info: {},
        user_agent: '${keen.user_agent}'
      },
      keen: {
        addons: [
          {
            name: 'keen:ip_to_geo',
            input: {
              ip: 'geo.ip_address'
            },
            output : 'geo.info'
          },
          {
            name: 'keen:ua_parser',
            input: {
              ua_string: 'tech.user_agent'
            },
            output: 'tech.info'
          },
          {
            name: 'keen:url_parser',
            input: {
              url: 'page.url'
            },
            output: 'page.info'
          },
          {
            name: 'keen:referrer_parser',
            input: {
              referrer_url: 'referrer.url',
              page_url: 'page.url'
            },
            output: 'referrer.info'
          }
        ]
      }
    }
  });
  // bidRequests
  events.on(BID_REQUESTED, function (bidRequestObj) {
    client.recordEvent('bid_requests', bidRequestObj, (err, res) => {
      if (err) {
        utils.logMessage('Error of writing request to keen.io');
      }
      else {
        utils.logMessage('A request has been written to keen.io');
      }
    });
  });

  // bidResponses
  events.on(BID_RESPONSE, function (bid) {
    if (bid && bid.bidderCode) {
      var cpmCents = convertToCents(bid.cpm);
      var bidder = bid.bidderCode;
      if (typeof bid.timeToRespond !== 'undefined') {
        var timeDis = getLoadTimeDistribution(bid.timeToRespond);
        // load time distribution
        client.recordEvent('prebid_load_time_distribution', {bidder: bidder,time: timeDis}, (err, res) => {
          if (err) {
            utils.logMessage('Error of writing prebid time distribution to keen.io');
          }
          else {
            utils.logMessage('Prebid time distribution has been written to keen.io');
          }
        });
      }
      if (bid.cpm > 0) {
        var cpmDis = getCpmDistribution(bid.cpm);
        // cpm distribution
        client.recordEvent('prebid_cpm_distribution', {bidder: bidder,cpm: cpmDis}, (err, res) => {
          if (err) {
            utils.logMessage('Error of writing prebid CPM distribution to keen.io');
          }
          else {
            utils.logMessage('Prebid CPM distribution has been written to keen.io');
          }
        });
        // bid load time
        client.recordEvent('bid_load_time', {bidder: bidder,time: bid.timeToRespond}, (err, res) => {
          if (err) {
            utils.logMessage('Error of writing bid load time to keen.io');
          }
          else {
            utils.logMessage('Bid load time has been written to keen.io');
          }
        });
        // bid CPM
        client.recordEvent('bid_cpm', {bidder: bidder,cpm: cpmCents}, (err, res) => {
          if (err) {
            utils.logMessage('Error of writing bid CPM to keen.io');
          }
          else {
            utils.logMessage('Bid CPM has been written to keen.io');
          }
        });
      }
    }
  });

  // bidTimeouts
  events.on(BID_TIMEOUT, function (bidderArray) {
    utils._each(bidderArray, function (bidderCode) {
      client.recordEvent('bidder_timeout', {bidder: bidderCode}, (err, res) => {
        if (err) {
          utils.logMessage('Error of writing bidder timeout to keen.io');
        }
        else {
          utils.logMessage('Bidder timeout has been written to keen.io');
        }
      });
    });
  });

  // wins
  events.on(BID_WON, function (bid) {
    var cpmCents = convertToCents(bid.cpm);
    client.recordEvent('bid_wins', {bidder: bid.bidderCode,cpm: cpmCents}, (err, res) => {
      if (err) {
        utils.logMessage('Error of writing bid CPM to keen.io');
      }
      else {
        utils.logMessage('Bid CPM has been written to keen.io');
      }
    });
  });

  this.enableAnalytics = function _enable() {
    return utils.logMessage('Analytics adapter already enabled');
  };
};

adaptermanager.registerAnalyticsAdapter({
  adapter: exports,
  code: 'keenio'
});
