import pubmaticAnalyticsAdapter from 'modules/pubmaticAnalyticsAdapter';
import CONSTANTS from 'src/constants.json';
import { config } from 'src/config';
import {
  setConfig,
  addBidResponseHook,
} from 'modules/currency';

// using es6 "import * as events from 'src/events'" causes the events.getEvents stub not to work...
let events = require('src/events');
let ajax = require('src/ajax');
let utils = require('src/utils');

const {
  EVENTS: {
    AUCTION_INIT,
    AUCTION_END,
    BID_REQUESTED,
    BID_RESPONSE,
    BIDDER_DONE,
    BID_WON,
    BID_TIMEOUT,
    SET_TARGETING
  }
} = CONSTANTS;