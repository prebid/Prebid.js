import CONSTANTS from 'src/constants.json';
import { loadScript } from 'src/adloader';
import { ajax } from 'src/ajax';

const events = require('src/events');
const utils = require('../../utils');

const AUCTION_INIT = CONSTANTS.EVENTS.AUCTION_INIT;
const BID_REQUESTED = CONSTANTS.EVENTS.BID_REQUESTED;
const BID_TIMEOUT = CONSTANTS.EVENTS.BID_TIMEOUT;
const BID_RESPONSE = CONSTANTS.EVENTS.BID_RESPONSE;
const BID_WON = CONSTANTS.EVENTS.BID_WON;
const BID_ADJUSTMENT = CONSTANTS.EVENTS.BID_ADJUSTMENT;

const LIBRARY = 'library';
const ENDPOINT = 'endpoint';
const BUNDLE = 'bundle';

var _timedOutBidders = [];

export default function AnalyticsAdapter({ url, analyticsType, global, handler }) {
  var _queue = [];
  var _eventCount = 0;
  var _enableCheck = true;

  if (analyticsType === LIBRARY) {
    loadScript(url, _emptyQueue);
  }

  if (analyticsType === ENDPOINT || BUNDLE) {
    _emptyQueue();
  }

  return {
    track: _track,
    enqueue: _enqueue,
    enableAnalytics: _enable,
    getAdapterType: () => analyticsType,
    getGlobal: () => global,
    getHandler: () => handler,
    getUrl: () => url
  };

  function _track({ eventType, args }) {
    if (this.getAdapterType() === LIBRARY || BUNDLE) {
      window[global](handler, eventType, args);
    }

    if (this.getAdapterType() === ENDPOINT) {
      _callEndpoint(...arguments);
    }
  }

  function _callEndpoint({ eventType, args, callback }) {
    ajax(url, callback, JSON.stringify({ eventType, args }));
  }

  function _enqueue({ eventType, args }) {
    const _this = this;

    if (global && window[global] && eventType && args) {
      this.track({ eventType, args });
    } else {
      _queue.push(function () {
        _eventCount++;
        _this.track({ eventType, args });
      });
    }
  }

  function _enable(config) {
    var _this = this;

    //first send all events fired before enableAnalytics called
    events.getEvents().forEach(event => {
      if (!event) {
        return;
      }

      const { eventType, args } = event;

      if (eventType === BID_TIMEOUT) {
        _timedOutBidders = args.bidderCode;
      } else {
        _enqueue.call(_this, { eventType, args });
      }
    });

    //Next register event listeners to send data immediately

    //bidRequests
    events.on(BID_REQUESTED, args => this.enqueue({ eventType: BID_REQUESTED, args }));
    events.on(BID_RESPONSE, args => this.enqueue({ eventType: BID_RESPONSE, args }));
    events.on(BID_TIMEOUT, args => this.enqueue({ eventType: BID_TIMEOUT, args }));
    events.on(BID_WON, args => this.enqueue({ eventType: BID_WON, args }));
    events.on(BID_ADJUSTMENT, args => this.enqueue({ eventType: BID_ADJUSTMENT, args }));
    events.on(AUCTION_INIT, args => {
      args.config = config.options;  // enableAnaltyics configuration object
      this.enqueue({ eventType: AUCTION_INIT, args });
    });

    // finally set this function to return log message, prevents multiple adapter listeners
    this.enableAnalytics = function _enable() {
      return utils.logMessage(`Analytics adapter for "${global}" already enabled, unnecessary call to \`enableAnalytics\`.`);
    };
  }

  function _emptyQueue() {
    if (_enableCheck) {
      for (var i = 0; i < _queue.length; i++) {
        _queue[i]();
      }

      //override push to execute the command immediately from now on
      _queue.push = function (fn) {
        fn();
      };

      _enableCheck = false;
    }

    utils.logMessage(`event count sent to ${global}: ${_eventCount}`);
  }
}
