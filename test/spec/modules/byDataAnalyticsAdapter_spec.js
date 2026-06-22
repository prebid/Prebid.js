import ascAdapter from 'modules/byDataAnalyticsAdapter';
import { expect } from 'chai';
import { EVENTS } from 'src/constants.js';

const adapterManager = require('src/adapterManager').default;
const events = require('src/events');
const auctionId = 'b70ef967-5c5b-4602-831e-f2cf16e59af2';
const bidWonAuctionId = 'c80ef967-5c5b-4602-831e-f2cf16e59af3';
const bidResponseAuctionId = 'd90ef967-5c5b-4602-831e-f2cf16e59af4';
const initOptions = {
  clientId: 'asc00000',
  logFrequency: 1,
};
const userData = {
  'uid': '271a8-2b86-f4a4-f59bc',
  'cid': 'asc00000',
  'pid': 'www.letsrun.com',
  'os': 'Macintosh',
  'osv': 10.157,
  'br': 'Chrome',
  'brv': 103,
  'ss': {
    'width': 1792,
    'height': 1120
  },
  'de': 'Desktop',
  'tz': 'Asia/Calcutta'
};
const bidTimeoutArgs = [{
  auctionId,
  bidId: '12e90cb5ddc5dea',
  bidder: 'appnexus',
  adUnitCode: 'div-gpt-ad-mrec1'
}];
const noBidArgs = {
  adUnitCode: 'div-gpt-ad-mrec1',
  auctionId,
  bidId: '14480e9832f2d2b',
  bidder: 'appnexus',
  bidderRequestId: '13b87b6c20d3636',
  mediaTypes: { banner: { sizes: [[300, 250], [250, 250]] } },
  sizes: [[300, 250], [250, 250]],
  src: 'client',
  transactionId: 'c8ee3914-1ee0-4ce6-9126-748d5692188c'
};
const bidWonArgs = {
  auctionId: bidWonAuctionId,
  adUnitCode: 'div-gpt-ad-mrec1',
  size: '300x250',
  requestId: '24480e9832f2d2c',
  bidder: 'appnexus',
  timeToRespond: 114,
  currency: 'USD',
  mediaType: 'display',
  cpm: 0.50
};

const auctionEndArgs = {
  adUnitCodes: ['div-gpt-ad-mrec1'],
  adUnits: [{
    code: 'div-gpt-ad-mrec1',
    mediaTypes: { banner: { sizes: [[300, 250], [250, 250]] } },
    sizes: [[300, 250], [250, 250]],
    bids: [{ bidder: 'appnexus', params: { placementId: '19305195' } }],
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
        mediaTypes: { banner: { sizes: [[300, 250], [250, 250]] } },
        sizes: [[300, 250], [250, 250]],
        transactionId: 'c8ee3914-1ee0-4ce6-9126-748d5692188c'
      }
    ]
  }]
};
const bidWonAuctionEndArgs = {
  ...auctionEndArgs,
  auctionId: bidWonAuctionId,
  bidsReceived: [],
  bidderRequests: [{
    auctionId: bidWonAuctionId,
    auctionStart: 1627973484504,
    bidderCode: 'appnexus',
    bidderRequestId: '23b87b6c20d3637',
    bids: [
      {
        adUnitCode: 'div-gpt-ad-mrec1',
        auctionId: bidWonAuctionId,
        bidId: '24480e9832f2d2c',
        bidder: 'appnexus',
        bidderRequestId: '23b87b6c20d3637',
        src: 'client',
        mediaTypes: { banner: { sizes: [[300, 250], [250, 250]] } },
        sizes: [[300, 250], [250, 250]],
        transactionId: 'd8ee3914-1ee0-4ce6-9126-748d5692189d'
      }
    ]
  }]
};
const bidResponseAuctionEndArgs = {
  ...auctionEndArgs,
  auctionId: bidResponseAuctionId,
  bidsReceived: [{
    auctionId: bidResponseAuctionId,
    requestId: '34480e9832f2d2d',
    bidder: 'appnexus',
    width: 300,
    height: 250,
    cpm: 0.50,
    currency: 'USD',
    timeToRespond: 114,
    adUnitCode: 'div-gpt-ad-mrec1'
  }],
  bidderRequests: [{
    auctionId: bidResponseAuctionId,
    auctionStart: 1627973484504,
    bidderCode: 'appnexus',
    bidderRequestId: '33b87b6c20d3638',
    bids: [
      {
        adUnitCode: 'div-gpt-ad-mrec1',
        auctionId: bidResponseAuctionId,
        bidId: '34480e9832f2d2d',
        bidder: 'appnexus',
        bidderRequestId: '33b87b6c20d3638',
        src: 'client',
        mediaTypes: { banner: { sizes: [[300, 250], [250, 250]] } },
        sizes: [[300, 250], [250, 250]],
        transactionId: 'e8ee3914-1ee0-4ce6-9126-748d5692190e'
      }
    ]
  }]
};
const expectedDataArgs = {
  visitor_data: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1aWQiOiIyNzFhOC0yYjg2LWY0YTQtZjU5YmMiLCJjaWQiOiJhc2MwMDAwMCIsInBpZCI6Ind3dy5sZXRzcnVuLmNvbSIsIm9zIjoiTWFjaW50b3NoIiwib3N2IjoxMC4xNTcsImJyIjoiQ2hyb21lIiwiYnJ2IjoxMDMsInNzIjp7IndpZHRoIjoxNzkyLCJoZWlnaHQiOjExMjB9LCJkZSI6IkRlc2t0b3AiLCJ0eiI6IkFzaWEvQ2FsY3V0dGEifQ.Oj3qnh--t06XO-foVmrMJCGqFfOBed09A-f7LZX5rtfBf4w1_RNRZ4F3on4TMPLonSa7GgzbcEfJS9G_amnleQ',
  aid: auctionId,
  as: 1627973484504,
  auctionData: [{
    au: 'div-gpt-ad-mrec1',
    auc: 'div-gpt-ad-mrec1',
    aus: '300x250',
    bidadv: 'appnexus',
    bid: '14480e9832f2d2b',
    inb: 1,
    ito: 0,
    ipwb: 0,
    iwb: 0,
    mt: 'display',
  }, {
    au: 'div-gpt-ad-mrec1',
    auc: 'div-gpt-ad-mrec1',
    aus: '250x250',
    bidadv: 'appnexus',
    bid: '14480e9832f2d2b',
    inb: 1,
    ito: 0,
    ipwb: 0,
    iwb: 0,
    mt: 'display',
  }]
};
const expectedBidWonDataArgs = {
  ...expectedDataArgs,
  aid: bidWonAuctionId,
  auctionData: [{
    au: 'div-gpt-ad-mrec1',
    auc: 'div-gpt-ad-mrec1',
    aus: '300x250',
    bidadv: 'appnexus',
    bid: '24480e9832f2d2c',
    inb: 0,
    ito: 0,
    ipwb: 1,
    iwb: 1,
    mt: 'display',
  }, {
    au: 'div-gpt-ad-mrec1',
    auc: 'div-gpt-ad-mrec1',
    aus: '250x250',
    bidadv: 'appnexus',
    bid: '24480e9832f2d2c',
    inb: 0,
    ito: 0,
    ipwb: 0,
    iwb: 0,
    mt: 'display',
  }]
};

describe('byData Analytics Adapter ', () => {
  beforeEach(() => {
    window.asc_data = true;
    sinon.stub(events, 'getEvents').returns([]);
  });
  afterEach(() => {
    delete window.asc_data;
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
      adapterManager.enableAnalytics({
        provider: 'bydata',
        options: initOptions
      });
      expect(ascAdapter.initOptions).to.have.property('clientId', 'asc00000');
      expect(ascAdapter.initOptions).to.have.property('logFrequency', 1);
    });
  });

  describe('track-events', function () {
    before(() => {
      window.asc_data = true;
      adapterManager.enableAnalytics({
        provider: 'bydata',
        options: initOptions
      });
    });
    it('sends and formatted auction data ', function () {
      events.emit(EVENTS.BID_TIMEOUT, bidTimeoutArgs);
      events.emit(EVENTS.NO_BID, noBidArgs);
      var userToken = ascAdapter.getVisitorData(userData);
      var newAuData = ascAdapter.dataProcess(auctionEndArgs);
      newAuData['visitor_data'] = userToken;
      expect(newAuData).to.deep.equal(expectedDataArgs);
    });

    it('marks bid won data on auction payload ', function () {
      events.emit(EVENTS.BID_WON, bidWonArgs);
      var userToken = ascAdapter.getVisitorData(userData);
      var newAuData = ascAdapter.dataProcess(bidWonAuctionEndArgs);
      delete newAuData._wins;
      newAuData['visitor_data'] = userToken;
      expect(newAuData).to.deep.equal(expectedBidWonDataArgs);
    });

    it('does not mark every received bid as a prebid winner ', function () {
      var newAuData = ascAdapter.dataProcess(bidResponseAuctionEndArgs);
      expect(newAuData.auctionData[0]).to.include({
        brid: '34480e9832f2d2d',
        bradv: 'appnexus',
        br_pb_mg: 0.50,
        cur: 'USD',
        br_tr: 114,
        brs: '300x250',
        ipwb: 0,
        iwb: 0
      });
    });
  });
});
