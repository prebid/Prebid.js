import roxotAnalytic from 'modules/roxotAnalyticsAdapter';
import {expect, assert} from 'chai';

let events = require('src/events');
let adaptermanager = require('src/adaptermanager');
let constants = require('src/constants.json');

let bidRequestedEvent = {
    "bidderCode": "brealtime",
    "requestId": "0000-0000-0001",
    "bids": [
        {
            "bidder": "brealtime",
            "placementCode": "div-gpt-ad-1",
            "requestId": "0000-0000-0001",
        },
        {
            "bidder": "brealtime",
            "placementCode": "div-gpt-ad-2",
            "requestId": "0000-0000-0001",
        },
        {
            "bidder": "brealtime",
            "placementCode": "div-gpt-ad-3",
            "requestId": "0000-0000-0001",
        },
    ],
    "start": 1507811035954,
    "auctionStart": 1507811035953,
    "timeout": 2000
};
let auctionStartEvent = {
    "timestamp": 1507811035953,
    "requestId": "0000-0000-0001",
};

let bidAdjustmentEmpty = {
    "bidderCode": "brealtime",
    "width": 0,
    "height": 0,
    "statusMessage": "Bid returned empty or error response",
    "requestId": "0000-0000-0001",
    "cpm": 0,
    "adUnitCode": "div-gpt-ad-1",
    "timeToRespond": 601
};
let bidAdjustmentWin = {
    "bidderCode": "brealtime",
    "width": 100,
    "height": 300,
    "requestId": "0000-0000-0001",
    "cpm": 10,
    "adUnitCode": "div-gpt-ad-3",
    "timeToRespond": 300
};

let bidWon = {
    "bidderCode": "brealtime",
    "width": 100,
    "height": 300,
    "requestId": "0000-0000-0001",
    "cpm": 10,
    "adUnitCode": "div-gpt-ad-3",
    "timeToRespond": 300
};


let bidAdjustmentAfterAuctionEnd = {
    "bidderCode": "brealtime",
    "width": 0,
    "height": 0,
    "statusMessage": "Bid returned empty or error response",
    "requestId": "0000-0000-0001",
    "cpm": 0,
    "bidder": "brealtime",
    "adUnitCode": "div-gpt-ad-2",
    "timeToRespond": 5601
};

adaptermanager.registerAnalyticsAdapter({
    code: 'roxot',
    adapter: roxotAnalytic
});

adaptermanager.enableAnalytics({
    provider: 'roxot',
    options: {
        publisherIds: ["000-001"]
    }
});

describe('Roxot Prebid Analytic', function () {
    describe('enableAnalytics', function () {
        beforeEach(() => {
            // sinon.spy(roxotAnalytic, 'track');
        });

        afterEach(() => {
        });

        it('should catch all events', function () {

            events.emit(constants.EVENTS.AUCTION_INIT, auctionStartEvent);
            events.emit(constants.EVENTS.BID_REQUESTED, bidRequestedEvent);
            events.emit(constants.EVENTS.BID_ADJUSTMENT, bidAdjustmentEmpty);
            events.emit(constants.EVENTS.BID_ADJUSTMENT, bidAdjustmentWin);
            events.emit(constants.EVENTS.AUCTION_END);
            events.emit(constants.EVENTS.BID_ADJUSTMENT, bidAdjustmentAfterAuctionEnd);
            events.emit(constants.EVENTS.BID_WON, bidWon);

            assert.equal(Object.keys(roxotAnalytic.eventStack.stack).length, 2);
            let request = roxotAnalytic.eventStack.stack['0000-0000-0001'];
            assert.equal(request['publisherId'], "000-001" );
            assert.equal(Object.keys(request.auctions).length, 3);
        });
    });
});
