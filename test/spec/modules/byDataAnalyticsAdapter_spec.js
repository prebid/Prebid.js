import ascAdapter from 'modules/byDataAnalyticsAdapter';
import { expect } from 'chai';
import { EVENTS } from 'src/constants.js';
import { server } from 'test/mocks/xhr.js';

const adapterManager = require('src/adapterManager').default;
const events = require('src/events');
const auctionId = 'b70ef967-5c5b-4602-831e-f2cf16e59af2';
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
  auctionId,
  adUnitCode: 'div-gpt-ad-mrec1',
  size: '300x250',
  requestId: '15c86b6c10d3746',
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
const expectedBidWonArgs = {
  visitor_data: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1aWQiOiIyNzFhOC0yYjg2LWY0YTQtZjU5YmMiLCJjaWQiOiJhc2MwMDAwMCIsInBpZCI6Ind3dy5sZXRzcnVuLmNvbSIsIm9zIjoiTWFjaW50b3NoIiwib3N2IjoxMC4xNTcsImJyIjoiQ2hyb21lIiwiYnJ2IjoxMDMsInNzIjp7IndpZHRoIjoxNzkyLCJoZWlnaHQiOjExMjB9LCJkZSI6IkRlc2t0b3AiLCJ0eiI6IkFzaWEvQ2FsY3V0dGEifQ.Oj3qnh--t06XO-foVmrMJCGqFfOBed09A-f7LZX5rtfBf4w1_RNRZ4F3on4TMPLonSa7GgzbcEfJS9G_amnleQ',
  aid: auctionId,
  as: '',
  auctionData: [{
    au: 'div-gpt-ad-mrec1',
    auc: 'div-gpt-ad-mrec1',
    aus: '300x250',
    bid: '15c86b6c10d3746',
    bidadv: 'appnexus',
    br_pb_mg: 0.50,
    br_tr: 114,
    bradv: 'appnexus',
    brid: '15c86b6c10d3746',
    brs: '300x250',
    cur: 'USD',
    inb: 0,
    ito: 0,
    ipwb: 1,
    iwb: 1,
    mt: 'display',
  }]
};

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
      ascAdapter.enableAnalytics(initOptions);
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
    before(() => {
      ascAdapter.enableAnalytics(initOptions);
      // Step 1: Initialize adapter
      adapterManager.enableAnalytics({
        provider: 'bydata',
        options: initOptions
      });
    });
    function sentValues() {
      return server.requests
        .filter(req => req.url === 'https://pbjs-stream.bydata.com/topics/prebid')
        .map(req => JSON.parse(req.requestBody).records[0].value);
    }
    // crypto.subtle needs a secure context, which BrowserStack's http://bs-local.com page is not
    const secureIt = window.isSecureContext ? it : () => {};

    secureIt('sends and formatted auction data ', async function () {
      events.emit(EVENTS.BID_TIMEOUT, bidTimeoutArgs);
      events.emit(EVENTS.NO_BID, noBidArgs);
      events.emit(EVENTS.BID_WON, bidWonArgs);
      var userToken = await ascAdapter.getVisitorData(userData);
      var newAuData = ascAdapter.dataProcess(auctionEndArgs);
      var newBwData = ascAdapter.getBidWonData(bidWonArgs);
      newAuData['visitor_data'] = userToken;
      newBwData['visitor_data'] = userToken;
      expect(newAuData).to.deep.equal(expectedDataArgs);
      expect(newBwData).to.deep.equal(expectedBidWonArgs);
    });

    secureIt('waits for signing and snapshots each outgoing payload', async function () {
      const tokenPromise = ascAdapter.getVisitorData(userData);
      const first = { aid: 'first-auction', auctionData: [{ bid: 'first-bid' }] };
      const firstSend = ascAdapter.sendPayload(first);
      first.aid = 'second-auction';
      first.auctionData[0].bid = 'second-bid';
      const secondSend = ascAdapter.sendPayload(first);

      const sent = () => sentValues().filter(value => ['first-auction', 'second-auction'].includes(value.aid));
      expect(sent()).to.have.length(0);
      const token = await tokenPromise;
      await Promise.all([firstSend, secondSend]);

      expect(token).to.equal(expectedDataArgs.visitor_data);
      const values = sent();
      expect(values).to.have.length(2);
      expect(values[0]).to.deep.equal({
        aid: 'first-auction', auctionData: [{ bid: 'first-bid' }], visitor_data: token
      });
      expect(values[1]).to.deep.equal({
        aid: 'second-auction', auctionData: [{ bid: 'second-bid' }], visitor_data: token
      });
    });

    secureIt('retries signing after a failure', async function () {
      const sent = () => sentValues().filter(value => value.aid === 'retry-auction');
      const importKey = sinon.stub(window.crypto.subtle, 'importKey').rejects(new Error('fail'));
      try {
        await ascAdapter.getVisitorData(userData).catch(() => {});
        await ascAdapter.sendPayload({ aid: 'retry-auction' });
        expect(sent()).to.have.length(0);
      } finally {
        importKey.restore();
      }
      await ascAdapter.sendPayload({ aid: 'retry-auction' });
      expect(sent()).to.have.length(1);
      expect(sent()[0].visitor_data).to.be.a('string');
    });

    it('does not retry signing when Web Crypto is unavailable', async function () {
      const subtle = window.crypto.subtle && sinon.stub(window.crypto, 'subtle').get(() => undefined);
      const getVisitorData = sinon.spy(ascAdapter, 'getVisitorData');
      try {
        await ascAdapter.getVisitorData(userData).catch(() => {});
        await ascAdapter.sendPayload({ aid: 'no-crypto-auction' });
        await ascAdapter.sendPayload({ aid: 'no-crypto-auction' });
        expect(getVisitorData.callCount).to.equal(1);
        expect(sentValues().filter(value => value.aid === 'no-crypto-auction')).to.have.length(0);
      } finally {
        getVisitorData.restore();
        if (subtle) {
          subtle.restore();
          await ascAdapter.getVisitorData(userData);
        }
      }
    });
  });
});
