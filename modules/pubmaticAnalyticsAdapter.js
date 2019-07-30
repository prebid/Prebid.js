import adapter from '../src/AnalyticsAdapter';
import adapterManager from '../src/adapterManager';
import CONSTANTS from '../src/constants.json';
import { ajax } from '../src/ajax';
import { config } from '../src/config';
import * as utils from '../src/utils';

/*
    TODO:
        what about video bids?
        remove un-necessary export statements from Rubicon analytics adapter
        
*/

////////////// CONSTANTS ////////////// 

const SEND_TIMEOUT = 3000;
const DEFAULT_INTEGRATION = 'pbjs';// todo: refer the GLOBALS
const END_POINT_HOST = 'https://t.pubmatic.com/';
const END_POINT_BID_LOGGER = END_POINT_HOST + 'wl/?';
const END_POINT_WIN_BID_LOGGER = END_POINT_HOST + 'wt/?';
const LOG_PRE_FIX = 'PubMatic-Analytics:: ';
const cache = {
    auctions: {},
    targeting: {}, // todo: do we need this?
    timeouts: {},
};
// better refre events and statuses directly from CONSTANTS

////////////// VARIABLES ////////////// 

let serverConfig;
config.getConfig('s2sConfig', ({s2sConfig}) => {
    serverConfig = s2sConfig;
});
let publisherId = 0; // int: mandatory
let profileId = 0; // int: optional
let profileVersionId = 0; // int: optional

////////////// ADAPTER EVENT HANDLER FUNCTIONS ////////////// 

function auctionInitHandler(args){
    // todo: what else we get here?
    let cacheEntry = utils.pick(args, [
        'timestamp',
        'timeout'
    ]);
    cacheEntry.bids = {};
    cacheEntry.bidsWon = {};
    cache.auctions[args.auctionId] = cacheEntry;
}

function bidRequestedHandler(args){
    console.log(LOG_PRE_FIX, 'bidRequestedHandler');
    console.log(args);
}

function bidResponseHandler(args){
    console.log(LOG_PRE_FIX, 'bidResponseHandler');
    console.log(args);
}

function bidderDoneHandler(args){
    console.log(LOG_PRE_FIX, 'bidderDoneHandler');
    console.log(args);
}

function setTargetingHandler(args){
    console.log(LOG_PRE_FIX, 'setTargetingHandler');
    console.log(args);
}

function auctionEndHandler(args){
    console.log(LOG_PRE_FIX, 'auctionEndHandler');
    console.log(args);
}

function bidTimeoutHandler(args){
    console.log(LOG_PRE_FIX, 'bidTimeoutHandler');
    console.log(args);
}

////////////// ADAPTER DEFINITION ////////////// 

let baseAdapter = adapter({analyticsType: 'endpoint'});
let pubmaticAdapter = Object.assign({}, baseAdapter, {
    
    enableAnalytics(config = {}) {
        let error = false;
        if (typeof config.options === 'object') {
            if (config.options.publisherId) {
                publisherId = Number(config.options.publisherId);
            }
        } else {
            utils.logError(LOG_PRE_FIX + 'Config not found.');
            error = true;
        }

        if(!publisherId){
            utils.logError(LOG_PRE_FIX + 'Missing publisher id.');
            error = true;
        }

        if(error){
            utils.logError(LOG_PRE_FIX + 'Not collecting data due to error(s).');
        } else {
            baseAdapter.enableAnalytics.call(this, config);
        }
    },

    disableAnalytics() {
        publisherId = 0;
        profileId = 0;
        profileVersionId = 0;
        baseAdapter.disableAnalytics.apply(this, arguments);
    },

    track({eventType, args}) {
        switch (eventType) {
            case CONSTANTS.EVENTS.AUCTION_INIT:
                auctionInitHandler(args);
                break;

            case CONSTANTS.EVENTS.BID_REQUESTED:
                bidRequestedHandler(args);
                break;

            case CONSTANTS.EVENTS.BID_RESPONSE:
                bidResponseHandler(args);
                break;

            case CONSTANTS.EVENTS.BIDDER_DONE:
                bidderDoneHandler(args);
                break;

            case CONSTANTS.EVENTS.SET_TARGETING:
                setTargetingHandler(args);
                break;

            case CONSTANTS.EVENTS.AUCTION_END:
                auctionEndHandler(args);
                break;

            case CONSTANTS.EVENTS.BID_TIMEOUT:
                bidTimeoutHandler(args);
                break;
        }
    }
});

////////////// ADAPTER REGISTRATION ////////////// 
adapterManager.registerAnalyticsAdapter({
    adapter: pubmaticAdapter,
    code: 'pubmatic'
});

export default pubmaticAdapter;
  