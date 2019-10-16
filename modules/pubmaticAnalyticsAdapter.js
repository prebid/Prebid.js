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
        what about video bids?
            first version only banner?
            can we support as a basic version?
*/

////////////// CONSTANTS ////////////// 

const SEND_TIMEOUT = 3000;
const DEFAULT_INTEGRATION = 'pbjs';
const END_POINT_HOST = 'https://t.pubmatic.com/';
const END_POINT_BID_LOGGER = END_POINT_HOST + 'wl?';
const END_POINT_WIN_BID_LOGGER = END_POINT_HOST + 'wt?';
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
const EMPTY_STRING = '';
const MEDIA_TYPE_BANNER = 'banner';
const CURRENCY_USD = 'USD';
// todo: input profileId and profileVersionId ; defaults to zero or one
const DEFAULT_PUBLISHER_ID = 0;
const DEFAULT_PROFILE_ID = 0;
const DEFAULT_PROFILE_VERSION_ID = 0;

////////////// VARIABLES ////////////// 

let serverConfig;
config.getConfig('s2sConfig', ({s2sConfig}) => {
    serverConfig = s2sConfig;
});
let publisherId = DEFAULT_PUBLISHER_ID; // int: mandatory 
let profileId = DEFAULT_PROFILE_ID; // int: optional
let profileVersionId = DEFAULT_PROFILE_VERSION_ID; // int: optional

////////////// HELPER FUNCTIONS ////////////// 

function sizeToDimensions(size) {
    return {
        width: size.w || size[0],
        height: size.h || size[1]
    };
}

function validMediaType(type) {
    return ({'banner':1, 'native':1, 'video':1}).hasOwnProperty(type);
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
        'mi', // todo: need to test
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
                return [MEDIA_TYPE_BANNER];
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
            if (typeof bid.currency === 'string' && bid.currency.toUpperCase() === CURRENCY_USD) {
                return Number(bid.cpm);
            }
            // use currency conversion function if present
            if (typeof bid.getCpmInNewCurrency === 'function') {
                return Number(bid.getCpmInNewCurrency(CURRENCY_USD));
            }
            utils.logWarn(LOG_PRE_FIX + 'Could not determine the bidPriceUSD of the bid ', bid);
        },
        'dealId',
        'currency',
        'cpm',
        'dealChannel',
        'meta',
        'status',
        'error',
        'bidId',
        'mediaType',
        'params',
        'dimensions', () => utils.pick(bid, [
            'width',
            'height'
        ])
    ]);
}

// todo: delete this function
// function isWinningBidReceivedForAllAdUnitsInAuction(auctionCache){
//     return Object.keys(auctionCache.adUnitCodes).reduce((accumulator, adUnitCode) => {
//         // only send if we've received bidWon events for all adUnits in auction
//         accumulator = accumulator && adUnitCode.bidWon;
//         return accumulator;
//     }, true)
// }

//todo: delete this function
// function formatBidToSend(bid) {
//     return utils.pick(bid, [
//         'bidder',
//         'bidId',
//         'status',
//         'error',
//         'source', (source, bid) => {
//             if (source) {
//                 return source;
//             }
//             return serverConfig && Array.isArray(serverConfig.bidders) && serverConfig.bidders.indexOf(bid.bidder) !== -1
//                 ? 'server' : 'client'
//         },
//         'clientLatencyTimeMs',
//         'serverLatencyTimeMs',
//         'params', // todo: from openwrap we can send the value of kgpv in params , we need to check if we will get it here
//         'bidResponse', bidResponse => bidResponse ? utils.pick(bidResponse, [
//             'bidPriceUSD',
//             'dealId',
//             'dimensions',
//             'mediaType'
//         ]) : undefined
//     ]);
// }

//todo: delete this function
// function formatBidWonToSend(bid) {
//     return Object.assign(formatBid(bid), utils.pick(bid.adUnit, [
//         'adUnitCode',
//         'transactionId',
//         'videoAdFormat', () => bid.videoAdFormat,
//         'mediaTypes'
//     ]), {
//         adserverTargeting: stringProperties(cache.targeting[bid.adUnit.adUnitCode] || {}),
//         bidwonStatus: SUCCESS,
//         accountId,
//         siteId: bid.siteId, // todo: what is it?
//         zoneId: bid.zoneId // todo: what is it?
//     });
// }

function executeBidsLoggerCall(auctionId){
    let referrer = config.getConfig('pageUrl') || utils.getTopWindowUrl(),
        auctionCache = cache.auctions[auctionId],
        outputObj = {
            s: []
        },
        pixelURL = END_POINT_BID_LOGGER,
        impressionIDMap = {} // impID => slots[]        
    ;

    console.log('executeBidsLoggerCall');
    console.log('auctionCache', auctionCache);

    if(!auctionCache){
        return;
    }

    if(auctionCache.sent){
        return;
    }

    pixelURL += 'pubid=' + publisherId;
    outputObj['pubid'] = publisherId;
	outputObj['to'] = "" + auctionCache.timeout;
	outputObj['purl'] = referrer;
	outputObj['tst'] = (new window.Date()).getTime();
	outputObj['pid'] = profileId;
    outputObj['pdvid'] = profileVersionId;
    
    // if (CONFIG.getGdpr()) {
	// 	consentString = gdprData && gdprData.c ? encodeURIComponent(gdprData.c) : "";
	// 	outputObj[CONSTANTS.CONFIG.GDPR_CONSENT] = gdprData && gdprData.g;
	// 	outputObj[CONSTANTS.CONFIG.CONSENT_STRING] = consentString;
	// 	pixelURL += "&gdEn=" + (CONFIG.getGdpr() ? 1 : 0);
    // }

    outputObj.s = Object.keys(auctionCache.adUnitCodes).reduce(function(slotsArray, adUnitId){
        let adUnit = auctionCache.adUnitCodes[adUnitId],
            slotObject = {
            'sn': adUnitId,
            'sz': adUnit.dimensions.map(e => e[0]+"x"+e[1]),
            'ps': []
        };

        // todo: move to a function, pass the output to following function call 
        const highestsBid = Object.keys(adUnit.bids).reduce(function(currentHighestBid, bidId){
            // todo: later we will need to consider grossECPM and netECPM
            let bid = adUnit.bids[bidId];
            if(bid.bidResponse && bid.bidResponse.bidPriceUSD > currentHighestBid.bidPriceUSD ){
                currentHighestBid.bidPriceUSD = bid.bidResponse.bidPriceUSD;
                currentHighestBid.bidId = bidId;
            }
            return currentHighestBid;
        }, {bidId: '', bidPriceUSD: 0});

        slotObject.ps = Object.keys(adUnit.bids).reduce(function(partnerBids, bidId){
            let bid = adUnit.bids[bidId];
            // todo: push to a function
            // todo: number precision, is it taken care by Prebid?
            partnerBids.push({
                'pn': bid.bidder,
                'bidid': bid.bidId,
                'db': bid.bidResponse ? 0 : 1,
                'kgpv': bid.params.kgpv ? bid.params.kgpv : adUnitId,
                'psz': bid.bidResponse ? (bid.bidResponse.dimensions.width + 'x' + bid.bidResponse.dimensions.height) : '0x0',
                'eg': bid.bidResponse ? bid.bidResponse.bidPriceUSD : 0, // todo: later we will need to consider grossECPM and netECPM
                'en': bid.bidResponse ? bid.bidResponse.bidPriceUSD : 0, // todo: later we will need to consider grossECPM and netECPM
                'di': bid.bidResponse ? (bid.bidResponse.dealId || EMPTY_STRING) : EMPTY_STRING,
                'dc': bid.bidResponse ? (bid.bidResponse.dealChannel || EMPTY_STRING) : EMPTY_STRING,
                'l1': bid.clientLatencyTimeMs,
                'l2': 0,
                'ss': (bid.source === 'server' ? 1 : 0), //todo: is there any special handling required as per OW?
                't': (bid.status == ERROR && bid.error.code == TIMEOUT_ERROR) ? 1 : 0,
                'wb': highestsBid.bidId === bid.bidId ? 1 : 0,
                'mi': bid.bidResponse ? (bid.bidResponse.mi || undefined) : undefined,
                'af': bid.bidResponse ? (bid.bidResponse.mediaType || undefined) : undefined ,
                'ocpm': bid.bidResponse ? bid.bidResponse.cpm : 0,
                'ocry': bid.bidResponse ? bid.bidResponse.currency : CURRENCY_USD
            });
            return partnerBids;
        }, [])
        slotsArray.push(slotObject);        
        return slotsArray;
    }, []);
    auctionCache.sent = true;
    ajax(
        pixelURL,
        null,
        "json=" + window.encodeURIComponent(JSON.stringify(outputObj)),
        {
            contentType: 'application/x-www-form-urlencoded',
            withCredentials : true,
            method: 'POST'
        }
    );
}

// todo: we may need adUnitId as well
function executeBidWonLoggerCall(auctionId, adUnitId){
    console.log("executeBidWonLoggerCall:", arguments); 
    console.log("cache", cache);
    const winningBidId = cache.auctions[auctionIdauctionId].adUnitCodes[adUnitId].bidWon;
    const winningBid = cache.auctions[auctionIdauctionId].adUnitCodes[adUnitId].bids[winningBidId];
    const enc = window.encodeURIComponent;

    let pixelURL = END_POINT_WIN_BID_LOGGER;
    pixelURL += "pubid=" + publisherId;
    pixelURL += "&purl=" + enc(config.getConfig('pageUrl') || utils.getTopWindowUrl(),);
    pixelURL += "&tst=" + (new window.Date()).getTime();
    pixelURL += "&iid=" + enc(window.PWT.bidMap[slotID].getImpressionID()); //todo
    pixelURL += "&bidid=" + enc(theBid.getBidID()); //todo
    pixelURL += "&pid=" + enc(profileId);
    pixelURL += "&pdvid=" + enc(profileVersionId);
    pixelURL += "&slot=" + enc(slotID);  //todo
    pixelURL += "&pn=" + enc(theBid.getAdapterID()); //todo
    pixelURL += "&en=" + enc(theBid.getNetEcpm(isAnalytics)); //todo USD
    pixelURL += "&eg=" + enc(theBid.getGrossEcpm(isAnalytics)); //todo USD
    pixelURL += "&kgpv=" + enc(theBid.getKGPV()); //todo
    // var pixelURL = CONFIG.getMonetizationPixelURL(),
    //     pubId = CONFIG.getPublisherId();
    // const isAnalytics = true; // this flag is required to get grossCpm and netCpm in dollars instead of adserver currency
    
    // refThis.setImageSrcToPixelURL(pixelURL);

}

// todo: delete this function
// todo: can we split this function in two for bid-logger and bid-win-logger?
// function sendMessage(auctionId, bidWonId){
//     let referrer = config.getConfig('pageUrl') || utils.getTopWindowUrl();
//     let message = {
//         eventTimeMillis: Date.now(),
//         integration: DEFAULT_INTEGRATION, //todo: we can take this as analytics-adapter-config along with publisherId
//         version: '$prebid.version$',
//         referrerUri: referrer
//     };
//     const wrapperName = config.getConfig('rubicon.wrapperName');//todo: not needed?

//     if (wrapperName) { //todo: not needed?
//         message.wrapperName = wrapperName;
//     }

//     let auctionCache = cache.auctions[auctionId];

//     console.log("sendMessage: cache", cache);
//     console.log("sendMessage: auctionId", auctionId);
//     return;

//     if (auctionCache && !auctionCache.sent) {
        
//         // todo: move to a function
//         let adUnitMap = Object.keys(auctionCache.bids).reduce((adUnits, bidId) => {
//             let bid = auctionCache.bids[bidId];
//             let adUnit = adUnits[bid.adUnit.adUnitCode];
//             if (!adUnit) {
//                 adUnit = adUnits[bid.adUnit.adUnitCode] = utils.pick(bid.adUnit, [
//                     'adUnitCode',
//                     'transactionId',
//                     'mediaTypes',
//                     'dimensions',
//                     'adserverTargeting', () => stringProperties(cache.targeting[bid.adUnit.adUnitCode] || {})
//                 ]);
//                 adUnit.bids = [];
//             }

//             // Add site and zone id if not there and if we found a rubicon bidder 
//             //todo: not needed?
//             if ((!adUnit.siteId || !adUnit.zoneId) && rubiconAliases.indexOf(bid.bidder) !== -1) {
//                 if (utils.deepAccess(bid, 'params.accountId') == accountId) {
//                     adUnit.accountId = parseInt(accountId);
//                     adUnit.siteId = parseInt(utils.deepAccess(bid, 'params.siteId'));
//                     adUnit.zoneId = parseInt(utils.deepAccess(bid, 'params.zoneId'));
//                 }
//             }

//             //todo: not needed?
//             if (bid.videoAdFormat && !adUnit.videoAdFormat) {
//                 adUnit.videoAdFormat = bid.videoAdFormat;
//             }

//             // determine adUnit.status from its bid statuses.  Use priority below to determine, higher index is better
//             let statusPriority = [ERROR, NO_BID, SUCCESS]; //todo: move to const in an obj
//             if (statusPriority.indexOf(bid.status) > statusPriority.indexOf(adUnit.status)) { //todo: change to hasOwnProperty
//                 adUnit.status = bid.status;
//             }

//             adUnit.bids.push(formatBid(bid));

//             return adUnits;
//         }, {});

//         //todo: not needed?
//         // We need to mark each cached bid response with its appropriate rubicon site-zone id
//         // This allows the bidWon events to have these params even in the case of a delayed render
//         Object.keys(auctionCache.bids).forEach(function (bidId) {
//             let adCode = auctionCache.bids[bidId].adUnit.adUnitCode;
//             Object.assign(auctionCache.bids[bidId], utils.pick(adUnitMap[adCode], ['accountId', 'siteId', 'zoneId']));
//         });

//         let auction = {
//             clientTimeoutMillis: auctionCache.timeout,
//             samplingFactor,
//             accountId,
//             adUnits: Object.keys(adUnitMap).map(i => adUnitMap[i])
//         };

//         if (serverConfig) {
//             auction.serverTimeoutMillis = serverConfig.timeout;
//         }

//         // todo: i think we need to send each auction separately    
//         message.auctions = [auction];

//         let bidsWon = Object.keys(auctionCache.bidsWon).reduce((memo, adUnitCode) => {
//             let bidId = auctionCache.bidsWon[adUnitCode];
//             if (bidId) {
//                 memo.push(formatBidWon(auctionCache.bids[bidId]));
//             }
//             return memo;
//         }, []);

//         if (bidsWon.length > 0) {
//             message.bidsWon = bidsWon;
//         }

//         auctionCache.sent = true;

//     } else if (bidWonId && auctionCache && auctionCache.bids[bidWonId]) {
//         message.bidsWon = [
//             formatBidWon(auctionCache.bids[bidWonId])
//         ];
//     }

//     ajax(
//         this.getUrl(),
//         null,
//         JSON.stringify(message),
//         {
//             contentType: 'application/json'
//         }
//     );
// }

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

// todo: do we need this function?
function setTargetingHandler(args){
    console.log(LOG_PRE_FIX, 'setTargetingHandler');
    // console.log(args);
    Object.assign(cache.targeting, args);
}

function bidWonHandler(args){
    console.log(LOG_PRE_FIX, 'bidWonHandler');
    console.log(args);
    let auctionCache = cache.auctions[args.auctionId];
    auctionCache.adUnitCodes[args.adUnitCode].bidWon = args.requestId;
    // check if this BID_WON missed the boat, if so send by itself
    // todo: i think we should remove these checks; and keep bidsLog and winBidLog separate
    // if (auctionCache.sent === true) {
    //     // sendMessage.call(this, args.auctionId, args.requestId);        
    // } else if (isWinningBidReceivedForAllAdUnitsInAuction(auctionCache)) {
    //     //todo: why isWinningBidReceivedForAllAdUnitsInAuction is important?
    //     //      execute logger only if we have got all winning bids
    //     //         here winning bid is the rendered bids
    //     //      removing delayed execution
    //     // todo: are we missing the bidWin logger call then?
    //     clearTimeout(cache.timeouts[args.auctionId]);
    //     delete cache.timeouts[args.auctionId];
    //     // sendMessage.call(this, args.auctionId);
    //     executeBidWonLoggerCall(this, args.auctionId, args.requestId);
    // }
    executeBidWonLoggerCall(args.auctionId, args.adUnitCode);
}

function auctionEndHandler(args){
    console.log(LOG_PRE_FIX, 'auctionEndHandler');
    // console.log(args);
    // start timer to send batched payload just in case we don't hear any BID_WON events
    cache.timeouts[args.auctionId] = setTimeout(() => {
        executeBidsLoggerCall.call(this, args.auctionId);
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
            profileId = Number(config.options.profileId) || DEFAULT_PROFILE_ID;
            profileVersionId = Number(config.options.profileVersionId) || DEFAULT_PROFILE_VERSION_ID;
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
        publisherId = DEFAULT_PUBLISHER_ID;
        profileId = DEFAULT_PROFILE_ID;
        profileVersionId = DEFAULT_PROFILE_VERSION_ID;
        baseAdapter.disableAnalytics.apply(this, arguments);
    },

    track({eventType, args}) {
        // todo: can we name the functions as per events then we will not need a switch case
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