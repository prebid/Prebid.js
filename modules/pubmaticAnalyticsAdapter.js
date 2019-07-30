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

////////////// VARIABLES ////////////// 

let serverConfig;
config.getConfig('s2sConfig', ({s2sConfig}) => {
    serverConfig = s2sConfig;
});
let publisherId = 0; // int: mandatory
let profileId = 0; // int: optional
let profileVersionId = 0; // int: optional

////////////// HELPER FUNCTIONS ////////////// 

function validMediaType(type) {
    //todo: support Video and Native in futures
    return ({'banner':1}).hasOwnProperty(type);
}

function formatSource(src) {
    if (typeof src === 'undefined') {
        src = 'client';
    } else if (src === 's2s') {
        src = 'server';
    }
    return src.toLowerCase();
}

function copyRequiredBidDetails(bid){
    return utils.pick(bid, [
        'bidder', bidder => bidder.toLowerCase(),
        'bidId',
        'status', () => 'no-bid', // default a bid to no-bid until response is recieved or bid is timed out
        'finalSource as source',
        'params',
        'adUnit', () => utils.pick(bid, [
            'adUnitCode',
            'transactionId',
            'sizes as dimensions', sizes => sizes.map(sizeToDimensions),
            'mediaTypes', (types) => {
                //todo: move to a smaller function
                if (bid.mediaType && validMediaType(bid.mediaType)) {
                    return [bid.mediaType];
                }
                if (Array.isArray(types)) {
                    return types.filter(validMediaType);
                }
                if (typeof types === 'object') {
                    if (!bid.sizes) {
                        bid.dimensions = [];
                        utils._each(types, (type) =>
                            bid.dimensions = bid.dimensions.concat(
                                type.sizes.map(sizeToDimensions)
                            )
                        );
                    }
                    return Object.keys(types).filter(validMediaType);
                }
                return ['banner'];
            }
        ])
    ]);
}

function setBidStatus(bid, args){
    switch (args.getStatusCode()) {
        case GOOD:
        bid.status = 'success';
        delete bid.error; // it's possible for this to be set by a previous timeout
        break;
        case NO_BID:
        bid.status = 'no-bid';
        delete bid.error;
        break;
        default:
        bid.status = 'error';
        bid.error = {
            code: 'request-error'
        };
    }
}

function parseBidResponse(bid){
    return utils.pick(bid, [
        'bidPriceUSD', () => {
            //todo: check whether currency cases are handled here
            if (typeof bid.currency === 'string' && bid.currency.toUpperCase() === 'USD') {
                return Number(bid.cpm);
            }
            // use currency conversion function if present
            if (typeof bid.getCpmInNewCurrency === 'function') {
                return Number(bid.getCpmInNewCurrency('USD'));
            }
            utils.logWarn(LOG_PRE_FIX + 'Could not determine the bidPriceUSD of the bid ', bid);
        },
        'dealId',
        'status',
        'mediaType',
        'dimensions', () => utils.pick(bid, [
            'width',
            'height'
        ])
    ]);
}

// todo: can we split this function in two for bid-logger and bid-win-logger?
function sendMessage(auctionId, bidWonId){

}

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
    Object.assign(cache.auctions[args.auctionId].bids, args.bids.reduce((accumulator, bid) => {
        cache.auctions[args.auctionId].bidsWon[bid.adUnitCode] = false;
        accumulator[bid.bidId] = copyRequiredBidDetails(bid);
        return accumulator;
    }, {}));
}

function bidResponseHandler(args){
    console.log(LOG_PRE_FIX, 'bidResponseHandler');
    console.log(args);
    let bid = cache.auctions[args.auctionId].bids[args.requestId];
    if (!bid) {
        utils.logError(LOG_PRE_FIX + 'Could not find associated bid request for bid response with requestId: ', args.requestId);
        break; //todo: break or return?
    }
    bid.source = formatSource(bid.source || args.source);
    setBidStatus(bid, args);
    bid.clientLatencyMillis = Date.now() - cache.auctions[args.auctionId].timestamp;
    bid.bidResponse = parseBidResponse(args);
}

function bidderDoneHandler(args){
    console.log(LOG_PRE_FIX, 'bidderDoneHandler');
    console.log(args);
    args.bids.forEach(bid => {
        let cachedBid = cache.auctions[bid.auctionId].bids[bid.bidId || bid.requestId];
        if (typeof bid.serverResponseTimeMs !== 'undefined') {
            cachedBid.serverLatencyMillis = bid.serverResponseTimeMs; // todo: serverLatencyMillis => serverLatencyTimeMs
        }
        if (!cachedBid.status) {
            cachedBid.status = 'no-bid';
        }
        if (!cachedBid.clientLatencyMillis) {
            cachedBid.clientLatencyMillis = Date.now() - cache.auctions[bid.auctionId].timestamp; // todo: clientLatencyMillis => clientLatencyTimeMs
        }
    });
}

function setTargetingHandler(args){
    console.log(LOG_PRE_FIX, 'setTargetingHandler');
    console.log(args);
    Object.assign(cache.targeting, args);
}

function bidWonHandler(args){
    let auctionCache = cache.auctions[args.auctionId];
    auctionCache.bidsWon[args.adUnitCode] = args.requestId;

    // check if this BID_WON missed the boat, if so send by itself
    if (auctionCache.sent === true) {
        sendMessage.call(this, args.auctionId, args.requestId);
        //todo: move following condition code to a function, isBidWonEventReceivedForAllAdUnits
    } else if (Object.keys(auctionCache.bidsWon).reduce((memo, adUnitCode) => {
        // only send if we've received bidWon events for all adUnits in auction
        memo = memo && auctionCache.bidsWon[adUnitCode];
        return memo;
    }, true)) {
        clearTimeout(cache.timeouts[args.auctionId]);
        delete cache.timeouts[args.auctionId];
        sendMessage.call(this, args.auctionId);
    }
}

function auctionEndHandler(args){
    console.log(LOG_PRE_FIX, 'auctionEndHandler');
    console.log(args);
    // start timer to send batched payload just in case we don't hear any BID_WON events
    cache.timeouts[args.auctionId] = setTimeout(() => {
        sendMessage.call(this, args.auctionId);
    }, SEND_TIMEOUT);
}

function bidTimeoutHandler(args){
    console.log(LOG_PRE_FIX, 'bidTimeoutHandler');
    console.log(args);
    args.forEach(badBid => {
        let auctionCache = cache.auctions[badBid.auctionId];
        let bid = auctionCache.bids[badBid.bidId || badBid.requestId];
        bid.status = 'error'; //todo: move to const
        bid.error = {
            code: 'timeout-error' //todo: move to const
        };
    });
}

////////////// ADAPTER DEFINITION ////////////// 

let baseAdapter = adapter({analyticsType: 'endpoint'});
let pubmaticAdapter = Object.assign({}, baseAdapter, {
    
    enableAnalytics(config = {}) {
        // todo: move to a function
        let error = false;
        if (typeof config.options === 'object') {
            if (config.options.publisherId) {
                publisherId = Number(config.options.publisherId);
            }
            // todo: input profileId and profileVersionId ; defaults to zero
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

            case CONSTANTS.EVENTS.BID_WON:
                bidWonHandler(args);
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