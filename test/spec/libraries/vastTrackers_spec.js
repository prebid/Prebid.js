import {
  getVastTrackers,
  insertVastTrackers,
  registerVastTrackers,
  reset, cacheVideoBidHook,
  disable,
  getTrackersFromBidResponse
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

  describe('vastImpUrl fallback support', () => {
    beforeEach(() => {
      reset();
    });

    it('should include vastImpUrl from bid response as string', function () {
      const emptyTracker = sinon.stub().callsFake(function () {
        return {
          impression: [],
          error: [],
          trackingEvents: []
        };
      });
      registerVastTrackers(MODULE_TYPE_ANALYTICS, 'emptyTest', emptyTracker);

      const bidWithImpUrl = {
        ...bid,
        vastImpUrl: 'https://bidder.com/impression'
      };

      const trackers = getVastTrackers(bidWithImpUrl, {index});
      expect(trackers).to.be.an('object');
      expect(trackers.impression).to.include('https://bidder.com/impression');
    });

    it('should include vastImpUrl from bid response as array', function () {
      const emptyTracker = sinon.stub().callsFake(function () {
        return {
          impression: [],
          error: [],
          trackingEvents: []
        };
      });
      registerVastTrackers(MODULE_TYPE_ANALYTICS, 'emptyTest', emptyTracker);

      const bidWithImpUrls = {
        ...bid,
        vastImpUrl: ['https://bidder1.com/impression', 'https://bidder2.com/impression']
      };

      const trackers = getVastTrackers(bidWithImpUrls, {index});
      expect(trackers).to.be.an('object');
      expect(trackers.impression).to.include('https://bidder1.com/impression');
      expect(trackers.impression).to.include('https://bidder2.com/impression');
    });

    it('should ignore empty vastImpUrl', function () {
      const emptyTracker = sinon.stub().callsFake(function () {
        return {
          impression: ['https://analytics.com/impression'],
          error: [],
          trackingEvents: []
        };
      });
      registerVastTrackers(MODULE_TYPE_ANALYTICS, 'emptyImpTest', emptyTracker);

      const bidWithEmptyImpUrl = {
        ...bid,
        vastImpUrl: ''
      };

      const trackers = getVastTrackers(bidWithEmptyImpUrl, {index});
      expect(trackers.impression).to.have.lengthOf(1);
      expect(trackers.impression).to.include('https://analytics.com/impression');
    });

    it('getTrackersFromBidResponse should include string vastImpUrl in impression', function () {
      const trackers = getTrackersFromBidResponse({vastImpUrl: 'https://bidder.com/impression'});

      expect(trackers).to.be.an('object');
      expect(trackers.impression).to.have.lengthOf(1);
      expect(trackers.impression).to.include('https://bidder.com/impression');
    });

    it('getTrackersFromBidResponse should include array vastImpUrl in impression', function () {
      const trackers = getTrackersFromBidResponse({vastImpUrl: ['https://bidder1.com/imp', 'https://bidder2.com/imp']});

      expect(trackers).to.be.an('object');
      expect(trackers.impression).to.have.lengthOf(2);
      expect(trackers.impression).to.include('https://bidder1.com/imp');
      expect(trackers.impression).to.include('https://bidder2.com/imp');
    });

    it('getTrackersFromBidResponse should return null when no trackers present', function () {
      const trackers = getTrackersFromBidResponse({});

      expect(trackers).to.be.null;
    });

    it('getTrackersFromBidResponse should merge vastTrackers and vastImpUrl', function () {
      const trackers = getTrackersFromBidResponse({
        vastTrackers: {
          impression: ['https://tracker.com/imp']
        },
        vastImpUrl: 'https://bidder.com/imp'
      });

      expect(trackers.impression).to.have.lengthOf(2);
      expect(trackers.impression).to.include('https://tracker.com/imp');
      expect(trackers.impression).to.include('https://bidder.com/imp');
    });
  });

  describe('vastTrackers from bid response support', () => {
    beforeEach(() => {
      reset();
    });

    it('should include vastTrackers from bid response', function () {
      const emptyTracker = sinon.stub().callsFake(function () {
        return {
          impression: [],
          error: [],
          trackingEvents: []
        };
      });
      registerVastTrackers(MODULE_TYPE_ANALYTICS, 'emptyTest', emptyTracker);

      const bidWithTrackers = {
        ...bid,
        vastTrackers: {
          impression: ['https://bidder.com/impression'],
          error: ['https://bidder.com/error'],
          trackingEvents: [{event: 'start', url: 'https://bidder.com/start'}]
        }
      };

      const trackers = getVastTrackers(bidWithTrackers, {index});
      expect(trackers).to.be.an('object');
      expect(trackers.impression).to.include('https://bidder.com/impression');
      expect(trackers.error).to.include('https://bidder.com/error');
      expect(trackers.trackingEvents).to.have.lengthOf(1);
      expect(trackers.trackingEvents[0].event).to.equal('start');
    });

    it('should merge vastTrackers from bid response with analytics trackers', function () {
      const analyticsTracker = sinon.stub().callsFake(function () {
        return {
          impression: ['https://analytics.com/impression'],
          error: ['https://analytics.com/error'],
          trackingEvents: [{event: 'complete', url: 'https://analytics.com/complete'}]
        };
      });
      registerVastTrackers(MODULE_TYPE_ANALYTICS, 'analyticsTest', analyticsTracker);

      const bidWithTrackers = {
        ...bid,
        vastTrackers: {
          impression: ['https://bidder.com/impression'],
          error: ['https://bidder.com/error'],
          trackingEvents: [{event: 'start', url: 'https://bidder.com/start'}]
        }
      };

      const trackers = getVastTrackers(bidWithTrackers, {index});
      expect(trackers.impression).to.have.lengthOf(2);
      expect(trackers.impression).to.include('https://analytics.com/impression');
      expect(trackers.impression).to.include('https://bidder.com/impression');
      expect(trackers.error).to.have.lengthOf(2);
      expect(trackers.trackingEvents).to.have.lengthOf(2);
    });

    it('getTrackersFromBidResponse should return normalized object', function () {
      const bidWithTrackers = {
        vastTrackers: {
          impression: ['https://imp1.com', 'https://imp2.com'],
          error: ['https://error.com'],
          trackingEvents: [{event: 'start', url: 'https://start.com'}]
        }
      };

      const trackers = getTrackersFromBidResponse(bidWithTrackers);
      expect(trackers).to.be.an('object');
      expect(trackers.impression).to.have.lengthOf(2);
      expect(trackers.error).to.have.lengthOf(1);
      expect(trackers.trackingEvents).to.have.lengthOf(1);
    });

    it('getTrackersFromBidResponse should return null when no vastTrackers', function () {
      const trackers = getTrackersFromBidResponse({});
      expect(trackers).to.be.null;
    });

    it('getTrackersFromBidResponse should handle partial vastTrackers object', function () {
      const bidWithPartialTrackers = {
        vastTrackers: {
          impression: ['https://imp.com']
          // error and trackingEvents not provided
        }
      };

      const trackers = getTrackersFromBidResponse(bidWithPartialTrackers);
      expect(trackers).to.be.an('object');
      expect(trackers.impression).to.have.lengthOf(1);
      expect(trackers.error).to.be.an('array').that.is.empty;
      expect(trackers.trackingEvents).to.be.an('array').that.is.empty;
    });

    it('should validate trackers from bid response same as analytics trackers', function () {
      const emptyTracker = sinon.stub().callsFake(function () {
        return {impression: [], error: [], trackingEvents: []};
      });
      registerVastTrackers(MODULE_TYPE_ANALYTICS, 'emptyTest', emptyTracker);

      const bidWithInvalidTrackers = {
        ...bid,
        vastTrackers: {
          impression: ['https://valid.com', '', null, 123],
          error: ['https://valid-error.com', ''],
          trackingEvents: [
            {event: 'start', url: 'https://valid-start.com'},
            {event: '', url: 'https://invalid.com'},
            {event: 'complete'} // missing url
          ]
        }
      };

      const trackers = getVastTrackers(bidWithInvalidTrackers, {index});
      expect(trackers.impression).to.have.lengthOf(1);
      expect(trackers.impression).to.include('https://valid.com');
      expect(trackers.error).to.have.lengthOf(1);
      expect(trackers.error).to.include('https://valid-error.com');
      expect(trackers.trackingEvents).to.have.lengthOf(1);
      expect(trackers.trackingEvents[0].event).to.equal('start');
    });
  });
})
