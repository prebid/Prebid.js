import adapter from '../src/AnalyticsAdapter';
import adapterManager from '../src/adapterManager';
import CONSTANTS from '../src/constants.json';
import { ajax } from '../src/ajax';
import { config } from '../src/config';
import * as utils from '../src/utils';

/*
    TODO:
        send one logger call
        send one tracker call
        configurations
            pub-id
            profile-id
            version-id
        what about video bids?
            first version only banner?
            can we support as a basic version?
        remove un-necessary export statements from Rubicon analytics adapter
        grossEcpm / netEcpm?
*/

////////////// CONSTANTS ////////////// 

const SEND_TIMEOUT = 3000;
const DEFAULT_INTEGRATION = 'pbjs';
const END_POINT_HOST = 'https://t.pubmatic.com/';
const END_POINT_BID_LOGGER = END_POINT_HOST + 'wl/?';
const END_POINT_WIN_BID_LOGGER = END_POINT_HOST + 'wt/?';
const LOG_PRE_FIX = 'PubMatic-Analytics: ';
const cache = {
    auctions: {},
    targeting: {},
    timeouts: {},
};
const SUCCESS = 'success';
const NO_BID = 'no-bid';
const ERROR = 'error';
const REQUEST_ERROR = 'request-error';
const TIMEOUT_ERROR = 'timeout-error';

////////////// VARIABLES ////////////// 

let serverConfig;
config.getConfig('s2sConfig', ({s2sConfig}) => {
    serverConfig = s2sConfig;
});
let publisherId = 0; // int: mandatory 
let profileId = 0; // int: optional //todo: defaults to 0 or 1?
let profileVersionId = 0; // int: optional //todo: defaults to 0 or 1?

////////////// HELPER FUNCTIONS ////////////// 

function sizeToDimensions(size) {
    return {
        width: size.w || size[0],
        height: size.h || size[1]
    };
}

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
        'status', () => NO_BID, // default a bid to NO_BID until response is recieved or bid is timed out
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
        case CONSTANTS.STATUS.GOOD:
            bid.status = SUCCESS;
            delete bid.error; // it's possible for this to be set by a previous timeout
            break;
        case CONSTANTS.STATUS.NO_BID:
            bid.status = NO_BID;
            delete bid.error;
            break;
        default:
            bid.status = ERROR;
            bid.error = {
                code: REQUEST_ERROR
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

function isWinningBidReceivedForAllAdUnitsInAuction(auctionCache){
    return Object.keys(auctionCache.adUnitCodes).reduce((accumulator, adUnitCode) => {
        // only send if we've received bidWon events for all adUnits in auction
        accumulator = accumulator && adUnitCode.bidWon;
        return accumulator;
    }, true)
}

function formatBidToSend(bid) {
    return utils.pick(bid, [
        'bidder',
        'bidId',
        'status',
        'error',
        'source', (source, bid) => {
            if (source) {
                return source;
            }
            return serverConfig && Array.isArray(serverConfig.bidders) && serverConfig.bidders.indexOf(bid.bidder) !== -1
                ? 'server' : 'client'
        },
        'clientLatencyTimeMs',
        'serverLatencyTimeMs',
        'params', // todo: from openwrap we can send the value of kgpv in params , we need to check if we will get it here
        'bidResponse', bidResponse => bidResponse ? utils.pick(bidResponse, [
            'bidPriceUSD',
            'dealId',
            'dimensions',
            'mediaType'
        ]) : undefined
    ]);
}

function formatBidWonToSend(bid) {
    return Object.assign(formatBid(bid), utils.pick(bid.adUnit, [
        'adUnitCode',
        'transactionId',
        'videoAdFormat', () => bid.videoAdFormat,
        'mediaTypes'
    ]), {
        adserverTargeting: stringProperties(cache.targeting[bid.adUnit.adUnitCode] || {}),
        bidwonStatus: SUCCESS,
        accountId,
        siteId: bid.siteId, // todo: what is it?
        zoneId: bid.zoneId // todo: what is it?
    });
}

// todo: can we split this function in two for bid-logger and bid-win-logger?
function sendMessage(auctionId, bidWonId){
    let referrer = config.getConfig('pageUrl') || utils.getTopWindowUrl();
    let message = {
        eventTimeMillis: Date.now(),
        integration: config.getConfig('rubicon.int_type') || DEFAULT_INTEGRATION, //todo: we can take this as analytics-adapter-config along with publisherId
        version: '$prebid.version$',
        referrerUri: referrer
    };
    const wrapperName = config.getConfig('rubicon.wrapperName');//todo: not needed?

    if (wrapperName) { //todo: not needed?
        message.wrapperName = wrapperName;
    }

    let auctionCache = cache.auctions[auctionId];

    console.log("sendMessage: cache", cache);
    console.log("sendMessage: auctionId", auctionId);
    return;

    if (auctionCache && !auctionCache.sent) {
        
        // todo: move to a function
        let adUnitMap = Object.keys(auctionCache.bids).reduce((adUnits, bidId) => {
            let bid = auctionCache.bids[bidId];
            let adUnit = adUnits[bid.adUnit.adUnitCode];
            if (!adUnit) {
                adUnit = adUnits[bid.adUnit.adUnitCode] = utils.pick(bid.adUnit, [
                    'adUnitCode',
                    'transactionId',
                    'mediaTypes',
                    'dimensions',
                    'adserverTargeting', () => stringProperties(cache.targeting[bid.adUnit.adUnitCode] || {})
                ]);
                adUnit.bids = [];
            }

            // Add site and zone id if not there and if we found a rubicon bidder 
            //todo: not needed?
            if ((!adUnit.siteId || !adUnit.zoneId) && rubiconAliases.indexOf(bid.bidder) !== -1) {
                if (utils.deepAccess(bid, 'params.accountId') == accountId) {
                    adUnit.accountId = parseInt(accountId);
                    adUnit.siteId = parseInt(utils.deepAccess(bid, 'params.siteId'));
                    adUnit.zoneId = parseInt(utils.deepAccess(bid, 'params.zoneId'));
                }
            }

            //todo: not needed?
            if (bid.videoAdFormat && !adUnit.videoAdFormat) {
                adUnit.videoAdFormat = bid.videoAdFormat;
            }

            // determine adUnit.status from its bid statuses.  Use priority below to determine, higher index is better
            let statusPriority = [ERROR, NO_BID, SUCCESS]; //todo: move to const in an obj
            if (statusPriority.indexOf(bid.status) > statusPriority.indexOf(adUnit.status)) { //todo: change to hasOwnProperty
                adUnit.status = bid.status;
            }

            adUnit.bids.push(formatBid(bid));

            return adUnits;
        }, {});

        //todo: not needed?
        // We need to mark each cached bid response with its appropriate rubicon site-zone id
        // This allows the bidWon events to have these params even in the case of a delayed render
        Object.keys(auctionCache.bids).forEach(function (bidId) {
            let adCode = auctionCache.bids[bidId].adUnit.adUnitCode;
            Object.assign(auctionCache.bids[bidId], utils.pick(adUnitMap[adCode], ['accountId', 'siteId', 'zoneId']));
        });

        let auction = {
            clientTimeoutMillis: auctionCache.timeout,
            samplingFactor,
            accountId,
            adUnits: Object.keys(adUnitMap).map(i => adUnitMap[i])
        };

        if (serverConfig) {
            auction.serverTimeoutMillis = serverConfig.timeout;
        }

        // todo: i think we need to send each auction separately    
        message.auctions = [auction];

        let bidsWon = Object.keys(auctionCache.bidsWon).reduce((memo, adUnitCode) => {
            let bidId = auctionCache.bidsWon[adUnitCode];
            if (bidId) {
                memo.push(formatBidWon(auctionCache.bids[bidId]));
            }
            return memo;
        }, []);

        if (bidsWon.length > 0) {
            message.bidsWon = bidsWon;
        }

        auctionCache.sent = true;

    } else if (bidWonId && auctionCache && auctionCache.bids[bidWonId]) {
        message.bidsWon = [
            formatBidWon(auctionCache.bids[bidWonId])
        ];
    }

    ajax(
        this.getUrl(),
        null,
        JSON.stringify(message),
        {
            contentType: 'application/json'
        }
    );
}

////////////// ADAPTER EVENT HANDLER FUNCTIONS ////////////// 

function auctionInitHandler(args){
    // todo: what else we get here?
    let cacheEntry = utils.pick(args, [
        'timestamp',
        'timeout'
    ]);    
    cacheEntry.adUnitCodes = {};
    cache.auctions[args.auctionId] = cacheEntry;
}

function bidRequestedHandler(args){
    console.log(LOG_PRE_FIX, 'bidRequestedHandler');
    args.bids.forEach(function(bid){
        if( !cache.auctions[args.auctionId].adUnitCodes.hasOwnProperty(bid.adUnitCode) ){
            cache.auctions[args.auctionId].adUnitCodes[bid.adUnitCode] = {
                bids: {},
                bidWon: false,
                dimensions: bid.sizes
            };            
        }
        cache.auctions[args.auctionId].adUnitCodes[bid.adUnitCode].bids[bid.bidId] = copyRequiredBidDetails(bid);
    })
}

function bidResponseHandler(args){
    console.log(LOG_PRE_FIX, 'bidResponseHandler');
    //console.log(args);
    let bid = cache.auctions[args.auctionId].adUnitCodes[args.adUnitCode].bids[args.requestId]; //todo: need try-catch
    if (!bid) {
        utils.logError(LOG_PRE_FIX + 'Could not find associated bid request for bid response with requestId: ', args.requestId);
        return;    
    }
    bid.source = formatSource(bid.source || args.source);
    setBidStatus(bid, args);
    bid.clientLatencyTimeMs = Date.now() - cache.auctions[args.auctionId].timestamp;
    bid.bidResponse = parseBidResponse(args);
}

function bidderDoneHandler(args){
    console.log(LOG_PRE_FIX, 'bidderDoneHandler');
    // console.log(args);
    args.bids.forEach(bid => {        
        let cachedBid = cache.auctions[bid.auctionId].adUnitCodes[bid.adUnit.adUnitCode].bids[bid.bidId || bid.requestId]; //todo: need try-catch
        if (typeof bid.serverResponseTimeMs !== 'undefined') {
            cachedBid.serverLatencyTimeMs = bid.serverResponseTimeMs;
        }
        if (!cachedBid.status) {
            cachedBid.status = NO_BID;
        }
        if (!cachedBid.clientLatencyTimeMs) {
            cachedBid.clientLatencyTimeMs = Date.now() - cache.auctions[bid.auctionId].timestamp;
        }
    });
}

function setTargetingHandler(args){
    console.log(LOG_PRE_FIX, 'setTargetingHandler');
    // console.log(args);
    Object.assign(cache.targeting, args);
}

function bidWonHandler(args){
    console.log(LOG_PRE_FIX, 'bidWonHandler');
    // console.log(args);
    let auctionCache = cache.auctions[args.auctionId];
    auctionCache.adUnitCodes[args.adUnitCode].bidWon = args.requestId;
    // check if this BID_WON missed the boat, if so send by itself
    if (auctionCache.sent === true) {
        sendMessage.call(this, args.auctionId, args.requestId);
    } else if (isWinningBidReceivedForAllAdUnitsInAuction(auctionCache)) {
        clearTimeout(cache.timeouts[args.auctionId]);
        delete cache.timeouts[args.auctionId];
        sendMessage.call(this, args.auctionId);
    }
}

function auctionEndHandler(args){
    console.log(LOG_PRE_FIX, 'auctionEndHandler');
    // console.log(args);
    // start timer to send batched payload just in case we don't hear any BID_WON events
    cache.timeouts[args.auctionId] = setTimeout(() => {
        sendMessage.call(this, args.auctionId);
    }, SEND_TIMEOUT);
}

function bidTimeoutHandler(args){
    console.log(LOG_PRE_FIX, 'bidTimeoutHandler');
    // console.log(args);
    args.forEach(badBid => {
        let auctionCache = cache.auctions[badBid.auctionId];
        // todo: need to test
        let bid = auctionCache.adUnitCodes[badBid.adUnit.adUnitCode].bids[badBid.bidId || badBid.requestId]; //todo: need try-catch
        bid.status = ERROR;
        bid.error = {
            code: TIMEOUT_ERROR
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