'use strict';

import {ajax} from 'src/ajax';
import adapter from 'src/AnalyticsAdapter';
import CONSTANTS from 'src/constants.json';
import adaptermanager from 'src/adapterManager';
import {logInfo} from '../src/utils';

// Standard Analytics Adapter code
const analyticsType = 'endpoint';
const AUCTION_END = CONSTANTS.EVENTS.AUCTION_END;
const AUCTION_INIT = CONSTANTS.EVENTS.AUCTION_INIT;

// Internal controls
let hummingbirdUrl = false;
const BATCH_MESSAGE_FREQUENCY = 1000; // Send results batched on a 1s delay

// Store our auction event data
const currentAuctions = {};
// Track internal states
let currentBatch = [],
    initialized = false,
    options,
    sampling,
    verbose = false,
    connectionEffectiveType;

if (navigator.connection) {
    const setConnectionEffectiveType = function() {
        connectionEffectiveType = navigator.connection.effectiveType;
    };
    navigator.connection.addEventListener('change', setConnectionEffectiveType);
    setConnectionEffectiveType();
}

let mavenAnalytics = Object.assign(adapter({hummingbirdUrl, analyticsType}), {
    
    track({ eventType, args }) {
        try {
            // We track only two events.
            if ([AUCTION_INIT, AUCTION_END].indexOf(eventType) === -1) {
                return;
            }
            if (args && args.auctionId && currentAuctions[args.auctionId] && currentAuctions[args.auctionId].status === 'complete') {
                throw new Error('Tracked event received after auction end for', args.auctionId);
            }
            let id = args && args.auctionId;
            let auctionObj;
            switch (eventType) {
                case AUCTION_INIT:
                    logMsg('AUCTION STARTED', args, options);
                    // TODO: A possible improvement would be splitting out the
                    // page-level values (content item, correlator, country
                    // code, path, pod, screen size, domain/channel, and
                    // timeout period), leaving only the auction ID as
                    // duplicated in our batched values. (NB: We want to push
                    // this information over the wire, but should be able to
                    // cut down on bandwidth by sending all this identical
                    // information only once per batch.)
                    auctionObj = {
                        auctionId: id,
                        browserType: options.browserType,
                        connectionEffectiveType,
                        contentItemId: options.contentItemId,
                        correlator: window.hummingbirdCorrelator,
                        countryCode: options.countryCode,
                        mavenChannel: options.mavenChannel,
                        path: location.pathname,
                        pod: Number(options.pod),
                        productionDomain: options.productionDomain,
                        screenSize: options.screenSize,
                        status: 'inProgress',
                        timeoutPeriod: undefined,
                        gdprApplies: false,
                        consentString: null,
                    };
                    // Sanity check on POD
                    if (isNaN(auctionObj.pod) || auctionObj.pod > 999) {
                        auctionObj.pod = 0;
                    };
                    // GDPR values are stored with at the bidRequest level
                    // If set for any bidRequest, set for auction
                    args.bidderRequests.forEach(request => {
                        if (request.hasOwnProperty('gdprApplies')) {
                            auctionObj.gdprApplies = request.gdprApplies;
                        }
                        if (request.hasOwnProperty('consentString')) {
                            auctionObj.consentString = request.consentString;
                        }
                    });
                    currentAuctions[id] = auctionObj;
                    break;
                case AUCTION_END:
                    if (currentAuctions[id] && currentAuctions[id].status === 'inProgress') {
                        currentAuctions[id].status = 'complete';
                    } else {
                        throw new Error('Auction end received for unknown auction', id);
                    }
                    auctionObj = currentAuctions[id];
                    auctionObj.timeoutPeriod = args.timeout;
                    // Update this property just in case connectionEffectiveType was determined
                    // after the auction began. Assign a value of 'other' if we have no
                    // connectionEffectiveType to report (likely due to browser limitation).
                    if (!auctionObj.connectionEffectiveType) {
                        auctionObj.connectionEffectiveType = connectionEffectiveType || 'other';
                    }
                    // Strip down to a set of information we're interested in.
                    // bidUnit is used for easy generation of our timed-out bid
                    // list, but does not need to go over the wire.
                    //
                    // NOTE: We are skipping sizes (available from
                    // bidderRequests.bids.foo.sizes) for the initial MVP of
                    // Hummingbird.
                    //
                    // NOTE: A possible future improvement would be gathering
                    // a deal flag, if present.
                    //
                    // ADZONES: unitId => { adzone, index }
                    // BIDUNIT: unitId => [ bidder1, bidders2, ... ]
                    // NOBID: unitId => [ bidder1, bidder2, ... ]
                    // BID: unitId => [{ bidder, cpm, timeToRespond }, ... ]
                    // TIMEDOUT: unitId => [ bidder1, bidder2, ... ]
                    ['bidUnit', 'nobid', 'bid', 'timedout'].forEach(key => {
                        auctionObj[key] = {};
                    });
                    let bidUnits = [];
                    args.bidderRequests.forEach(request => {
                        let bidder = request.bidderCode;
                        request.bids.forEach(bid => {
                            let auc = bid.adUnitCode;
                            if (!auctionObj.bidUnit[auc]) {
                                auctionObj.bidUnit[auc] = [];
                            }
                            auctionObj.bidUnit[auc].push(bid.bidder);
                            auctionObj.nobid[auc] = [];
                            auctionObj.bid[auc] = [];
                            auctionObj.timedout[auc] = [];
                        });
                    });
                    args.noBids.forEach(noBid => {
                        let auc = noBid.adUnitCode;
                        auctionObj.nobid[auc].push(noBid.bidder);
                    });
                    args.bidsReceived.forEach(bid => {
                        let auc = bid.adUnitCode;
                        auctionObj.bid[auc].push({
                            bidder: bid.bidderCode,
                            cpm: bid.cpm,
                            timeToRespond: bid.timeToRespond,
                            dealId: bid.dealId
                        });
                    });
                    // Zone info for all zones in play.
                    auctionObj.adzones = {};
                    Object.keys(options.zoneMap).map(key => {
                        if (auctionObj.bidUnit[key]) {
                            auctionObj.adzones[key] = options.zoneMap[key];
                        }
                    });
                    // Figure out which bids have not responded yet.
                    Object.keys(auctionObj.bidUnit).map(auc => {
                        let bidders = auctionObj.bid[auc].map(bidInfo => bidInfo.bidder);
                        let nonbidders = auctionObj.nobid[auc];
                        auctionObj.bidUnit[auc].map(bidderCode => {
                            if (bidders.indexOf(bidderCode) === -1 && nonbidders.indexOf(bidderCode) === -1) {
                                auctionObj.timedout[auc].push(bidderCode);
                            }
                        });
                    });
                    // bidUnit currently contains no info not found in
                    // bid/noBid/timedout
                    delete auctionObj.bidUnit;
                    // Additionally we don't care about status by the time this
                    // reaches Tempest; nothing is submitted from incomplete
                    // auctions.
                    delete auctionObj.status;
                    // Now, push it into our batch and set a timer.
                    currentBatch.push(auctionObj);
                    setTimeout(() => { sendBatch(); }, BATCH_MESSAGE_FREQUENCY);
                    // Clear it out of the currentAucutions object, since we're
                    // done with it.
                    delete currentAuctions[id];
                    break;
            }
        } catch (e) {
            // Log error
            logInfo('HUMMINGBIRD ADAPTER ERROR', e);
        }
    },
});

const sendBatch = function() {
    if (currentBatch.length === 0) {
        return;
    }
    logMsg('SENDING ANALYTICS', currentBatch);
    if (hummingbirdUrl) {
        ajax(
            hummingbirdUrl,
            null,
            JSON.stringify({ auctions: currentBatch }),
            {
                contentType: 'application/json',
            }
        );
    }
    currentBatch = [];
}

const logMsg = (...args) => {
    if (verbose) {
        logInfo('HUMMINGBIRD:', ...args);
    }
}

// save the base class function
mavenAnalytics.originEnableAnalytics = mavenAnalytics.enableAnalytics;

// override enableAnalytics so we can get access to the config passed in from the page
mavenAnalytics.enableAnalytics = function (config) {
    if (initialized) {
        return;
    }
    options = config.options;
    options.browserType = this.generateBrowserType();
    mavenAnalytics.originEnableAnalytics(config); // call the base class function
    initialized = true;
    hummingbirdUrl = options.url; 
    verbose = !!options.verbose;
};

mavenAnalytics.generateBrowserType = function() {
    // Browser sniffing -- this gets us all browser families with >1% of
    // traffic, according to the 2019 Wikimedia report. This set of tests
    // is largely based on
    // https://developer.mozilla.org/en-US/docs/Web/HTTP/Browser_detection_using_the_user_agent
    // and should be relatively resilient to changes in user-agent behavior.
    //
    // We can't use String.prototype.includes to allow support of IE.
    let ua = navigator.userAgent;
    if (ua.indexOf('Chrome/') >= 0) {
        if (ua.indexOf('OPR/') >= 0) {
            return 'opera';
        } else if (ua.indexOf('Edg/') >= 0 || ua.indexOf('Edge') >= 0) {
            return 'edge';
        } else if (ua.indexOf('SamsungBrowser') >= 0) {
            return 'samsung';
        } else if (ua.indexOf('Chromium/') == -1) {
            // Chromium could be Chromium, Brave, etc.
            return 'chrome';
        }
    } else if (ua.indexOf('Safari/') >= 0) {
        return 'safari';
    } else if (ua.indexOf('Firefox/') >= 0) {
        if (ua.indexOf('Seamonkey/') == -1) {
            return 'firefox';
        }
    } else if (ua.indexOf('Trident/') >= 0 || ua.indexOf('MSIE') >= 0) {
        return 'ie';
    } else if (ua.indexOf('OPR/') >= 0 || ua.indexOf('Opera/') >= 0) {
        return 'opera';
    }
    return 'other';
}

adaptermanager.registerAnalyticsAdapter({
    adapter: mavenAnalytics,
    code: 'maven'
});

export default mavenAnalytics;

