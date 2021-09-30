import ascAdapter from 'modules/byDataAnalyticsAdapter';
import { expect } from 'chai';
let adapterManager = require('src/adapterManager').default;
let events = require('src/events');
let constants = require('src/constants.json');
let auctionId = 'b70ef967-5c5b-4602-831e-f2cf16e59af2';
const initOptions = {
  clientId: 'asc00000',
  logFrequency: 1,
};
let userData = {
  userId: '5da77-ec87-277b-8e7a5',
  client_id: 'asc00000',
  plateform_name: 'Macintosh',
  os_version: 10.157,
  browser_name: 'Chrome',
  browser_version: 92.04515107,
  screen_size: {
    width: 1440,
    height: 900
  },
  device_type: 'Desktop',
  time_zone: 'Asia/Calcutta'
};
let bidTimeoutArgs = [{
  auctionId,
  bidId: '12e90cb5ddc5dea',
  bidder: 'appnexus',
  adUnitCode: 'div-gpt-ad-mrec1'
}];
let noBidArgs = {
  adUnitCode: 'div-gpt-ad-mrec1',
  auctionId,
  bidId: '14480e9832f2d2b',
  bidder: 'appnexus',
  bidderRequestId: '13b87b6c20d3636',
  mediaTypes: {banner: {sizes: [[300, 250], [250, 250]]}},
  sizes: [[300, 250], [250, 250]],
  src: 'client',
  transactionId: 'c8ee3914-1ee0-4ce6-9126-748d5692188c'
}
let auctionEndArgs = {
  adUnitCodes: ['div-gpt-ad-mrec1'],
  adUnits: [{
    code: 'div-gpt-ad-mrec1',
    mediaTypes: {banner: {sizes: [[300, 250], [250, 250]]}},
    sizes: [[300, 250], [250, 250]],
    bids: [{bidder: 'appnexus', params: {placementId: '19305195'}}],
    transactionId: 'c8ee3914-1ee0-4ce6-9126-748d5692188c'
  }],
  auctionEnd: 1627973487504,
  auctionId,
  auctionStatus: 'completed',
  timestamp: 1627973484504,
  bidsReceived: [],
  bidderRequests: [{
    auctionId,
    auctionStart: 1627973484504,
    bidderCode: 'appnexus',
    bidderRequestId: '13b87b6c20d3636',
    bids: [
      {
        adUnitCode: 'div-gpt-ad-mrec1',
        auctionId,
        bidId: '14480e9832f2d2b',
        bidder: 'appnexus',
        bidderRequestId: '13b87b6c20d3636',
        src: 'client',
        mediaTypes: {banner: {sizes: [[300, 250], [250, 250]]}},
        sizes: [[300, 250], [250, 250]],
        transactionId: 'c8ee3914-1ee0-4ce6-9126-748d5692188c'
      }
    ]
  }]
}
let expectedDataArgs = {
  visitor_data: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI1ZGE3Ny1lYzg3LTI3N2ItOGU3YTUiLCJjbGllbnRfaWQiOiJhc2MwMDAwMCIsInBsYXRlZm9ybV9uYW1lIjoiTWFjaW50b3NoIiwib3NfdmVyc2lvbiI6MTAuMTU3LCJicm93c2VyX25hbWUiOiJDaHJvbWUiLCJicm93c2VyX3ZlcnNpb24iOjkyLjA0NTE1MTA3LCJzY3JlZW5fc2l6ZSI6eyJ3aWR0aCI6MTQ0MCwiaGVpZ2h0Ijo5MDB9LCJkZXZpY2VfdHlwZSI6IkRlc2t0b3AiLCJ0aW1lX3pvbmUiOiJBc2lhL0NhbGN1dHRhIn0.jNKjsb3Q-ZjkVMcbss_dQFOmu_GdkGqd7t9MbRmqlG4YEMorcJHhUVmUuPi-9pKvC9_t4XlgjED90UieCvdxCQ',
  auction_id: auctionId,
  auction_start: 1627973484504,
  auctionData: [ {
    'adUnit': 'div-gpt-ad-mrec1',
    'size': '300x250',
    'media_type': 'display',
    'bids_bidder': 'appnexus',
    'bids_bid_id': '14480e9832f2d2b'
  }, {
    'adUnit': 'div-gpt-ad-mrec1',
    'size': '250x250',
    'media_type': 'display',
    'bids_bidder': 'appnexus',
    'bids_bid_id': '14480e9832f2d2b'
  }]
}

describe('byData Analytics Adapter ', () => {
  beforeEach(() => {
    sinon.stub(events, 'getEvents').returns([]);
  });
  afterEach(() => {
    events.getEvents.restore();
  });

  describe('enableAnalytics ', function () {
    beforeEach(() => {
      sinon.spy(ascAdapter, 'track');
    });
    afterEach(() => {
      ascAdapter.disableAnalytics();
      ascAdapter.track.restore();
    });
    it('should init with correct options', function () {
      ascAdapter.enableAnalytics(initOptions)
      // Step 1: Initialize adapter
      adapterManager.enableAnalytics({
        provider: 'bydata',
        options: initOptions
      });
      expect(ascAdapter.initOptions).to.have.property('clientId', 'asc00000');
      expect(ascAdapter.initOptions).to.have.property('logFrequency', 1);
    });
  });

  describe('track-events', function () {
    ascAdapter.enableAnalytics(initOptions)
    // Step 1: Initialize adapter
    adapterManager.enableAnalytics({
      provider: 'bydata',
      options: initOptions
    });
    it('sends and formatted auction data ', function () {
      events.emit(constants.EVENTS.BID_TIMEOUT, bidTimeoutArgs);
      events.emit(constants.EVENTS.NO_BID, noBidArgs);
      var userToken = ascAdapter.getVisitorData(userData);
      var newAuData = ascAdapter.dataProcess(auctionEndArgs);
      newAuData['visitor_data'] = userToken;
      expect(newAuData).to.deep.equal(expectedDataArgs);
    });
  });
});
