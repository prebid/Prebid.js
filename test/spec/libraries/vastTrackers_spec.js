import {
  addImpUrlToTrackers,
  addTrackersToResponse,
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

  it('test addImpUrlToTrackers', function () {
    const trackers = addImpUrlToTrackers({'vastImpUrl': 'imptracker.com'}, getVastTrackers(bid, {index}));
    expect(trackers).to.be.an('object');
    expect(trackers.impression).to.be.an('array');
    expect(trackers.impression).to.include('imptracker.com');
  });

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

    it('should insert start tracker in vastXml with existing Linear element', function () {
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

    it('should insert quartile trackers in vastXml', function () {
      const playbackTracker = sinon.stub().callsFake(function () {
        return {
          impression: [],
          error: [],
          trackingEvents: [
            {event: 'firstQuartile', url: 'https://tracking.mydomain.com/firstQuartile'},
            {event: 'midpoint', url: 'https://tracking.mydomain.com/midpoint'},
            {event: 'thirdQuartile', url: 'https://tracking.mydomain.com/thirdQuartile'},
            {event: 'complete', url: 'https://tracking.mydomain.com/complete'}
          ]
        };
      });
      registerVastTrackers(MODULE_TYPE_ANALYTICS, 'quartileTest', playbackTracker);

      const trackers = getVastTrackers(bid, {index});
      let vastXml = '<VAST><Ad><InLine><Creatives><Creative><Linear><Duration>00:00:30</Duration></Linear></Creative></Creatives></InLine></Ad></VAST>';
      vastXml = insertVastTrackers(trackers, vastXml);
      expect(vastXml).to.contain('<Tracking event="firstQuartile"><![CDATA[https://tracking.mydomain.com/firstQuartile]]></Tracking>');
      expect(vastXml).to.contain('<Tracking event="midpoint"><![CDATA[https://tracking.mydomain.com/midpoint]]></Tracking>');
      expect(vastXml).to.contain('<Tracking event="thirdQuartile"><![CDATA[https://tracking.mydomain.com/thirdQuartile]]></Tracking>');
      expect(vastXml).to.contain('<Tracking event="complete"><![CDATA[https://tracking.mydomain.com/complete]]></Tracking>');
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

    it('should insert all tracker types together', function () {
      const allTracker = sinon.stub().callsFake(function () {
        return {
          impression: ['https://tracking.mydomain.com/impression'],
          error: ['https://tracking.mydomain.com/error'],
          trackingEvents: [
            {event: 'start', url: 'https://tracking.mydomain.com/start'},
            {event: 'firstQuartile', url: 'https://tracking.mydomain.com/firstQuartile'},
            {event: 'complete', url: 'https://tracking.mydomain.com/complete'}
          ]
        };
      });
      registerVastTrackers(MODULE_TYPE_ANALYTICS, 'allTypesTest', allTracker);

      const trackers = getVastTrackers(bid, {index});
      let vastXml = '<VAST><Ad><InLine><Creatives><Creative><Linear><Duration>00:00:30</Duration></Linear></Creative></Creatives></InLine></Ad></VAST>';
      vastXml = insertVastTrackers(trackers, vastXml);

      // Check impression tracker
      expect(vastXml).to.contain('<Impression><![CDATA[https://tracking.mydomain.com/impression]]></Impression>');
      // Check error tracker
      expect(vastXml).to.contain('<Error><![CDATA[https://tracking.mydomain.com/error]]></Error>');
      // Check video playback trackers
      expect(vastXml).to.contain('<Tracking event="start"><![CDATA[https://tracking.mydomain.com/start]]></Tracking>');
      expect(vastXml).to.contain('<Tracking event="firstQuartile"><![CDATA[https://tracking.mydomain.com/firstQuartile]]></Tracking>');
      expect(vastXml).to.contain('<Tracking event="complete"><![CDATA[https://tracking.mydomain.com/complete]]></Tracking>');
    });

    it('should insert additional tracking events like pause and mute', function () {
      const additionalTracker = sinon.stub().callsFake(function () {
        return {
          impression: [],
          error: [],
          trackingEvents: [
            {event: 'pause', url: 'https://tracking.mydomain.com/pause'},
            {event: 'mute', url: 'https://tracking.mydomain.com/mute'},
            {event: 'fullscreen', url: 'https://tracking.mydomain.com/fullscreen'}
          ]
        };
      });
      registerVastTrackers(MODULE_TYPE_ANALYTICS, 'additionalTest', additionalTracker);

      const trackers = getVastTrackers(bid, {index});
      let vastXml = '<VAST><Ad><InLine><Creatives><Creative><Linear><Duration>00:00:30</Duration></Linear></Creative></Creatives></InLine></Ad></VAST>';
      vastXml = insertVastTrackers(trackers, vastXml);
      expect(vastXml).to.contain('<Tracking event="pause"><![CDATA[https://tracking.mydomain.com/pause]]></Tracking>');
      expect(vastXml).to.contain('<Tracking event="mute"><![CDATA[https://tracking.mydomain.com/mute]]></Tracking>');
      expect(vastXml).to.contain('<Tracking event="fullscreen"><![CDATA[https://tracking.mydomain.com/fullscreen]]></Tracking>');
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
