import * as utils from 'src/utils.js';
import optimonAnalyticsAdapter from '../../../modules/optimonAnalyticsAdapter.js';
import adapterManager from 'src/adapterManager';
import events from 'src/events';
import constants from 'src/constants.json'

const {
  EVENTS: { BID_TIMEOUT, BID_WON, AUCTION_END },
  AD_UNIT_CODE = 'demo-adunit-1',
  PUBLISHER_CONFIG = {
    pubId: 'optimon_test',
    pubAdxAccount: 123456789,
    pubTimezone: 'Asia/Jerusalem'
  }
} = CONSTANTS;

describe('Optimon Analytics Adapter', () => {
  const optmn_currentWindow = utils.getWindowSelf();
  let optmn_queue = [];

  beforeEach(() => {
    optmn_currentWindow.optimonAnalyticsAdapter = (...arguments) => queue.push(arguments);
    adapterManager.enableAnalytics({
      provider: 'optimon'
    });
    optmn_queue = []
  });

  afterEach(() => {
    optimonAnalyticsAdapter.finishedSendingAnalyticsData();
  });

  it('should forward all events to the queue', () => {
    const optmn_arguments = [ AD_UNIT_CODE, PUBLISHER_CONFIG, ...arguments[0]];

    for(var i = 0; i < CONSTANTS.EVENTS.length; i++) {
      events.emit(constants.EVENTS[CONSTANTS.EVENTS[i]], optmn_arguments);
    }

    expect(queue.length).to.eql(3);
  });
});

describe('when auction ended', function () {
  let auction;

  beforeEach(function () {
    simulateAuction([
      [AUCTION_END, optmn_handleAuctionEnd],
    ]);
    auction = JSON.parse(server.requests[0].requestBody)[0];
  });

  afterEach(function () {
    optimonAnalyticsAdapter.sendAuctionToServer(auction);
  });

  it('should track the adunit code', function () {
    expect(auction.adUnits[0].code).to.equal(AD_UNIT_CODE);
  });
});

describe('when bid won', function () {
  let auction;

  beforeEach(function () {
    simulateAuction([
      [BID_WON, optmn_handleBidWon],
    ]);
    auction = JSON.parse(server.requests[0].requestBody)[0];
  });

  afterEach(function () {
    optimonAnalyticsAdapter.sendAuctionToServer(auction);
  });

  it('should track the adunit code', function () {
    expect(auction.adUnits[0].code).to.equal(AD_UNIT_CODE);
  });
});

describe('when bid timeout', function () {
  let auction;

  beforeEach(function () {
    simulateAuction([
      [BID_TIMEOUT, optmn_handleBidTimeout],
    ]);
    auction = JSON.parse(server.requests[0].requestBody)[0];
  });

  afterEach(function () {
    optimonAnalyticsAdapter.sendAuctionToServer(auction);
  });

  it('should track the adunit code', function () {
    expect(auction.adUnits[0].code).to.equal(AD_UNIT_CODE);
  });
});
