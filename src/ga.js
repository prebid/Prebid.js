/**
 * ga.js - analytics adapter for google analytics
 */

var events = require('./events');
var utils = require('./utils');
var CONSTANTS = require('./constants.json');

var BID_REQUESTED = CONSTANTS.EVENTS.BID_REQUESTED;
var BID_TIMEOUT = CONSTANTS.EVENTS.BID_TIMEOUT;
var BID_RESPONSE = CONSTANTS.EVENTS.BID_RESPONSE;
var BID_WON = CONSTANTS.EVENTS.BID_WON;

var _disibleInteraction = { nonInteraction: true };
var _analyticsQueue = [];
var _gaGlobal = null;
var _enableCheck = true;
var _category = 'Prebid.js Bids';
var _eventCount = 0;
var _enableDistribution = false;
var _timedOutBidders = [];
var _trackerSend = null;

/**
 * This will enable sending data to google analytics. Only call once, or duplicate data will be sent!
 * @param  {object} gaOptions to set distribution and GA global (if renamed);
 * @return {[type]}    [description]
 */
exports.enableAnalytics = function (gaOptions) {
  if (typeof gaOptions.global !== 'undefined') {
    _gaGlobal = gaOptions.global;
  } else {
    //default global is window.ga
    _gaGlobal = 'ga';
  }

  _trackerSend = gaOptions.trackerName ? gaOptions.trackerName + '.send' : 'send';

  if (typeof gaOptions.enableDistribution !== 'undefined') {
    _enableDistribution = gaOptions.enableDistribution;
  }

  var bid = null;

  //first send all events fired before enableAnalytics called

  var existingEvents = events.getEvents();
  utils._each(existingEvents, function (eventObj) {
    var args = eventObj.args;
    if (!eventObj) {
      return;
    }

    if (eventObj.eventType === BID_REQUESTED) {
      bid = args;
      sendBidRequestToGa(bid);
    } else if (eventObj.eventType === BID_RESPONSE) {
      //bid is 2nd args
      bid = args;
      sendBidResponseToGa(bid);

    } else if (eventObj.eventType === BID_TIMEOUT) {
      _timedOutBidders = args.bidderCode;
    } else if (eventObj.eventType === BID_WON) {
      bid = args;
      sendBidWonToGa(bid);
    }
  });

  //Next register event listeners to send data immediately

  //bidRequests
  events.on(BID_REQUESTED, function (bidRequestObj) {
    sendBidRequestToGa(bidRequestObj);
  });

  //bidResponses
  events.on(BID_RESPONSE, function (adunit, bid) {
    sendBidResponseToGa(bid);
    sendBidTimeouts(bid);
  });

  //bidTimeouts
  events.on(BID_TIMEOUT, function (bidderArray) {
    _timedOutBidders = bidderArray;
  });

  //wins
  events.on(BID_WON, function (bid) {
    sendBidWonToGa(bid);
  });
};

exports.getTrackerSend = function getTrackerSend() {
  return _trackerSend;
};

/**
 * Check if gaGlobal or window.ga is defined on page. If defined execute all the GA commands
 */
function checkAnalytics() {
  if (_enableCheck && typeof window[_gaGlobal] === 'function') {

    for (var i = 0; i < _analyticsQueue.length; i++) {
      _analyticsQueue[i].call();
    }

    //override push to execute the command immediately from now on
    _analyticsQueue.push = function (fn) {
      fn.call();
    };

    //turn check into NOOP
    _enableCheck = false;
  }

  utils.logMessage('event count sent to GA: ' + _eventCount);
}

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
    distribution = '200-300ms';
  } else if (time >= 300 && time < 400) {
    distribution = '300-400ms';
  } else if (time >= 400 && time < 500) {
    distribution = '400-500ms';
  } else if (time >= 500 && time < 600) {
    distribution = '500-600ms';
  } else if (time >= 600 && time < 800) {
    distribution = '600-800ms';
  } else if (time >= 800 && time < 1000) {
    distribution = '800-1000ms';
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

function sendBidRequestToGa(bid) {
  if (bid && bid.bidderCode) {
    _analyticsQueue.push(function () {
      _eventCount++;
      window[_gaGlobal](_trackerSend, 'event', _category, 'Requests', bid.bidderCode, 1, _disibleInteraction);
    });
  }

  //check the queue
  checkAnalytics();
}

function sendBidResponseToGa(bid) {

  if (bid && bid.bidderCode) {
    _analyticsQueue.push(function () {
      var cpmCents = convertToCents(bid.cpm);
      var bidder = bid.bidderCode;
      if (typeof bid.timeToRespond !== 'undefined' && _enableDistribution) {
        _eventCount++;
        var dis = getLoadTimeDistribution(bid.timeToRespond);
        window[_gaGlobal](_trackerSend, 'event', 'Prebid.js Load Time Distribution', dis, bidder, 1, _disibleInteraction);
      }

      if (bid.cpm > 0) {
        _eventCount = _eventCount + 2;
        var cpmDis = getCpmDistribution(bid.cpm);
        if (_enableDistribution) {
          _eventCount++;
          window[_gaGlobal](_trackerSend, 'event', 'Prebid.js CPM Distribution', cpmDis, bidder, 1, _disibleInteraction);
        }

        window[_gaGlobal](_trackerSend, 'event', _category, 'Bids', bidder, cpmCents, _disibleInteraction);
        window[_gaGlobal](_trackerSend, 'event', _category, 'Bid Load Time', bidder, bid.timeToRespond, _disibleInteraction);
      }
    });
  }

  //check the queue
  checkAnalytics();
}

function sendBidTimeouts(bid) {

  if (bid && bid.bidder) {
    _analyticsQueue.push(function () {
      utils._each(_timedOutBidders, function (bidderCode) {
        if (bid.bidder === bidderCode) {
          _eventCount++;
          window[_gaGlobal](_trackerSend, 'event', _category, 'Timeouts', bidderCode, bid.timeToRespond, _disibleInteraction);
        }
      });
    });
  }

  checkAnalytics();
}

function sendBidWonToGa(bid) {
  var cpmCents = convertToCents(bid.cpm);
  _analyticsQueue.push(function () {
    _eventCount++;
    window[_gaGlobal](_trackerSend, 'event', _category, 'Wins', bid.bidderCode, cpmCents, _disibleInteraction);
  });

  checkAnalytics();
}
