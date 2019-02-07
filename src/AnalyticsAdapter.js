import CONSTANTS from './constants';
import { ajax } from './ajax';

const events = require('./events');
const utils = require('./utils');

const {
  EVENTS: {
    AUCTION_INIT,
    AUCTION_END,
    BID_REQUESTED,
    BID_TIMEOUT,
    BID_RESPONSE,
    NO_BID,
    BID_WON,
    BID_ADJUSTMENT,
    BIDDER_DONE,
    SET_TARGETING,
    AD_RENDER_FAILED
  }
} = CONSTANTS;

const ENDPOINT = 'endpoint';
const BUNDLE = 'bundle';

var _sampled = true;

export default function AnalyticsAdapter({ url, analyticsType, global, handler }) {
  var _queue = [];
  var _eventCount = 0;
  var _enableCheck = true;
  var _handlers;

  if (analyticsType === ENDPOINT || BUNDLE) {
    _emptyQueue();
  }

  return {
    track: _track,
    enqueue: _enqueue,
    enableAnalytics: _enable,
    disableAnalytics: _disable,
    getAdapterType: () => analyticsType,
    getGlobal: () => global,
    getHandler: () => handler,
    getUrl: () => url
  };

  function _track({ eventType, args }) {
    if (this.getAdapterType() === BUNDLE) {
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

    if (typeof config === 'object' && typeof config.options === 'object') {
      _sampled = typeof config.options.sampling === 'undefined' || Math.random() < parseFloat(config.options.sampling);
    } else {
      _sampled = true;
    }

    if (_sampled) {
      // first send all events fired before enableAnalytics called
      events.getEvents().forEach(event => {
        if (!event) {
          return;
        }

        const { eventType, args } = event;

        if (eventType !== BID_TIMEOUT) {
          _enqueue.call(_this, { eventType, args });
        }
      });

      // Next register event listeners to send data immediately

      _handlers = {
        [BID_REQUESTED]: args => this.enqueue({ eventType: BID_REQUESTED, args }),
        [BID_RESPONSE]: args => this.enqueue({ eventType: BID_RESPONSE, args }),
        [NO_BID]: args => this.enqueue({ eventType: NO_BID, args }),
        [BID_TIMEOUT]: args => this.enqueue({ eventType: BID_TIMEOUT, args }),
        [BID_WON]: args => this.enqueue({ eventType: BID_WON, args }),
        [BID_ADJUSTMENT]: args => this.enqueue({ eventType: BID_ADJUSTMENT, args }),
        [BIDDER_DONE]: args => this.enqueue({ eventType: BIDDER_DONE, args }),
        [SET_TARGETING]: args => this.enqueue({ eventType: SET_TARGETING, args }),
        [AUCTION_END]: args => this.enqueue({ eventType: AUCTION_END, args }),
        [AD_RENDER_FAILED]: args => this.enqueue({ eventType: AD_RENDER_FAILED, args }),
        [AUCTION_INIT]: args => {
          args.config = typeof config === 'object' ? config.options || {} : {}; // enableAnaltyics configuration object
          this.enqueue({ eventType: AUCTION_INIT, args });
        }
      };

      utils._each(_handlers, (handler, event) => {
        events.on(event, handler);
      });
    } else {
      utils.logMessage(`Analytics adapter for "${global}" disabled by sampling`);
    }

    // finally set this function to return log message, prevents multiple adapter listeners
    this._oldEnable = this.enableAnalytics;
    this.enableAnalytics = function _enable() {
      return utils.logMessage(`Analytics adapter for "${global}" already enabled, unnecessary call to \`enableAnalytics\`.`);
    };
  }

  function _disable() {
    utils._each(_handlers, (handler, event) => {
      events.off(event, handler);
    });
    this.enableAnalytics = this._oldEnable ? this._oldEnable : _enable;
  }

  function _emptyQueue() {
    if (_enableCheck) {
      for (var i = 0; i < _queue.length; i++) {
        _queue[i]();
      }

      // override push to execute the command immediately from now on
      _queue.push = function (fn) {
        fn();
      };

      _enableCheck = false;
    }

    utils.logMessage(`event count sent to ${global}: ${_eventCount}`);
  }
}
