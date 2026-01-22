import {
  getVastTrackers,
  insertVastTrackers,
  registerVastTrackers,
  reset, cacheVideoBidHook,
  disable
} from 'libraries/vastTrackers/vastTrackers.js';
import {MODULE_TYPE_ANALYTICS} from '../../../src/activities/modules.js';
import {AuctionIndex} from '../../../src/auctionIndex.js';

describe('vast trackers', () => {
  let sandbox, tracker, auction, bid, bidRequest, index;
  beforeEach(() => {
    bid = {
      requestId: 'bid',
      cpm: 1.0,
      auctionId: 'aid',
      mediaType: 'video',
    }
    bidRequest = {
      auctionId: 'aid',
      bidId: 'bid',
    }
    auction = {
      getAuctionId() {
        return 'aid';
      },
      getProperties() {
        return {auction: 'props'};
      },
      getBidRequests() {
        return [{bids: [bidRequest]}]
      }
    };
    sandbox = sinon.createSandbox();
    index = new AuctionIndex(() => [auction]);
    tracker = sinon.stub().callsFake(function (bidResponse) {
      return {
        impression: [`https://vasttracking.mydomain.com/vast?cpm=${bidResponse.cpm}`],
        error: [],
        trackingEvents: []
      };
    });
    registerVastTrackers(MODULE_TYPE_ANALYTICS, 'test', tracker);
  })
  afterEach(() => {
    reset();
    sandbox.restore();
  });

  after(disable);

  it('insert into tracker list', function () {
    const trackers = getVastTrackers(bid, {index});
    expect(trackers).to.be.an('object');
    expect(trackers.impression).to.be.an('array');
    expect(trackers.impression).to.include('https://vasttracking.mydomain.com/vast?cpm=1');
  });

  it('insert trackers in vastXml', function () {
    const trackers = getVastTrackers(bid, {index});
    let vastXml = '<VAST><Ad><Wrapper></Wrapper></Ad></VAST>';
    vastXml = insertVastTrackers(trackers, vastXml);
    expect(vastXml).to.equal('<VAST><Ad><Wrapper><Impression><![CDATA[https://vasttracking.mydomain.com/vast?cpm=1]]></Impression></Wrapper></Ad></VAST>');
  });

  it('should pass request and auction properties to trackerFn', () => {
    const bid = {requestId: 'bid', auctionId: 'aid'};
    getVastTrackers(bid, {index});
    sinon.assert.calledWith(tracker, bid, sinon.match({auction: auction.getProperties(), bidRequest}))
  })

  if (FEATURES.VIDEO) {
    it('should add trackers to bid response', () => {
      cacheVideoBidHook({index})(sinon.stub(), 'au', bid);
      expect(bid.vastTrackers).to.be.an('object');
      expect(bid.vastTrackers.impression).to.eql([
        'https://vasttracking.mydomain.com/vast?cpm=1'
      ]);
      expect(bid.vastTrackers.error).to.eql([]);
      expect(bid.vastTrackers.trackingEvents).to.eql([]);
    });
  }

  describe('error tracking', () => {
    beforeEach(() => {
      reset();
    });

    it('should insert error trackers in vastXml', function () {
      const errorTracker = sinon.stub().callsFake(function (bidResponse) {
        return {
          impression: [],
          error: [`https://error.mydomain.com/error?cpm=${bidResponse.cpm}`],
          trackingEvents: []
        };
      });
      registerVastTrackers(MODULE_TYPE_ANALYTICS, 'errorTest', errorTracker);

      const trackers = getVastTrackers(bid, {index});
      let vastXml = '<VAST><Ad><Wrapper></Wrapper></Ad></VAST>';
      vastXml = insertVastTrackers(trackers, vastXml);
      expect(vastXml).to.contain('<Error><![CDATA[https://error.mydomain.com/error?cpm=1]]></Error>');
    });

    it('should insert multiple error trackers', function () {
      const errorTracker = sinon.stub().callsFake(function () {
        return {
          impression: [],
          error: ['https://error1.mydomain.com/error', 'https://error2.mydomain.com/error'],
          trackingEvents: []
        };
      });
      registerVastTrackers(MODULE_TYPE_ANALYTICS, 'errorTest', errorTracker);

      const trackers = getVastTrackers(bid, {index});
      let vastXml = '<VAST><Ad><InLine></InLine></Ad></VAST>';
      vastXml = insertVastTrackers(trackers, vastXml);
      expect(vastXml).to.contain('<Error><![CDATA[https://error1.mydomain.com/error]]></Error>');
      expect(vastXml).to.contain('<Error><![CDATA[https://error2.mydomain.com/error]]></Error>');
    });

    it('should insert both impression and error trackers', function () {
      const mixedTracker = sinon.stub().callsFake(function () {
        return {
          impression: ['https://impression.mydomain.com/imp'],
          error: ['https://error.mydomain.com/error'],
          trackingEvents: []
        };
      });
      registerVastTrackers(MODULE_TYPE_ANALYTICS, 'mixedTest', mixedTracker);

      const trackers = getVastTrackers(bid, {index});
      let vastXml = '<VAST><Ad><Wrapper></Wrapper></Ad></VAST>';
      vastXml = insertVastTrackers(trackers, vastXml);
      expect(vastXml).to.contain('<Impression><![CDATA[https://impression.mydomain.com/imp]]></Impression>');
      expect(vastXml).to.contain('<Error><![CDATA[https://error.mydomain.com/error]]></Error>');
    });
  });

  describe('video playback tracking events', () => {
    beforeEach(() => {
      reset();
    });

    it('should insert video playback tracker in vastXml with existing Linear element', function () {
      const playbackTracker = sinon.stub().callsFake(function () {
        return {
          impression: [],
          error: [],
          trackingEvents: [
            {event: 'start', url: 'https://tracking.mydomain.com/start'}
          ]
        };
      });
      registerVastTrackers(MODULE_TYPE_ANALYTICS, 'playbackTest', playbackTracker);

      const trackers = getVastTrackers(bid, {index});
      let vastXml = '<VAST><Ad><InLine><Creatives><Creative><Linear><Duration>00:00:30</Duration></Linear></Creative></Creatives></InLine></Ad></VAST>';
      vastXml = insertVastTrackers(trackers, vastXml);
      expect(vastXml).to.contain('<Tracking event="start"><![CDATA[https://tracking.mydomain.com/start]]></Tracking>');
      expect(vastXml).to.contain('<TrackingEvents>');
    });

    it('should append to existing TrackingEvents element', function () {
      const playbackTracker = sinon.stub().callsFake(function () {
        return {
          impression: [],
          error: [],
          trackingEvents: [
            {event: 'start', url: 'https://tracking.mydomain.com/start'}
          ]
        };
      });
      registerVastTrackers(MODULE_TYPE_ANALYTICS, 'appendTest', playbackTracker);

      const trackers = getVastTrackers(bid, {index});
      let vastXml = '<VAST><Ad><InLine><Creatives><Creative><Linear><Duration>00:00:30</Duration><TrackingEvents><Tracking event="complete"><![CDATA[https://existing.com/complete]]></Tracking></TrackingEvents></Linear></Creative></Creatives></InLine></Ad></VAST>';
      vastXml = insertVastTrackers(trackers, vastXml);
      expect(vastXml).to.contain('<Tracking event="complete"><![CDATA[https://existing.com/complete]]></Tracking>');
      expect(vastXml).to.contain('<Tracking event="start"><![CDATA[https://tracking.mydomain.com/start]]></Tracking>');
    });

    it('should create Linear structure when not present', function () {
      const playbackTracker = sinon.stub().callsFake(function () {
        return {
          impression: [],
          error: [],
          trackingEvents: [
            {event: 'start', url: 'https://tracking.mydomain.com/start'}
          ]
        };
      });
      registerVastTrackers(MODULE_TYPE_ANALYTICS, 'createStructureTest', playbackTracker);

      const trackers = getVastTrackers(bid, {index});
      let vastXml = '<VAST><Ad><Wrapper></Wrapper></Ad></VAST>';
      vastXml = insertVastTrackers(trackers, vastXml);
      expect(vastXml).to.contain('<Creatives>');
      expect(vastXml).to.contain('<Creative>');
      expect(vastXml).to.contain('<Linear>');
      expect(vastXml).to.contain('<TrackingEvents>');
      expect(vastXml).to.contain('<Tracking event="start"><![CDATA[https://tracking.mydomain.com/start]]></Tracking>');
    });

    it('should validate tracking events have both event and url', function () {
      const invalidTracker = sinon.stub().callsFake(function () {
        return {
          impression: [],
          error: [],
          trackingEvents: [
            {event: 'start', url: 'https://tracking.mydomain.com/start'},
            {event: 'midpoint'}, // missing url
            {url: 'https://tracking.mydomain.com/invalid'}, // missing event
            {event: '', url: 'https://tracking.mydomain.com/empty'}, // empty event
            {event: 'complete', url: ''} // empty url
          ]
        };
      });
      registerVastTrackers(MODULE_TYPE_ANALYTICS, 'validationTest', invalidTracker);

      const trackers = getVastTrackers(bid, {index});
      // Only the valid tracker should be included
      expect(trackers.trackingEvents).to.have.lengthOf(1);
      expect(trackers.trackingEvents[0].event).to.equal('start');
    });
  });
})
