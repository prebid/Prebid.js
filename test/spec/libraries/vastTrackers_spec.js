import {
  getVastTrackers,
  registerVastTrackers,
  reset, updateVastHook,
  enable,
  disable
} from 'libraries/vastTrackers/vastTrackers.js';
import { insertVastTrackers } from '../../../src/utils/vast.js';
import { MODULE_TYPE_ANALYTICS } from '../../../src/activities/modules.js';
import { AuctionIndex } from '../../../src/auctionIndex.js';
import { handleVideoBidCaching, store, updateVast } from '../../../src/videoCache.js';
import { auctionManager } from '../../../src/auctionManager.js';
import { config } from '../../../src/config.js';
import { cachedVideoImpressionVerifier, tracker as bidTracker } from 'modules/videoModule/videoImpressionVerifier.js';
import { vastXmlEditorFactory } from 'libraries/video/shared/vastXmlEditor.js';

// Helper functions to reduce code duplication
function createPlaybackTracker() {
  return sinon.stub().callsFake(function () {
    return {
      impression: [],
      error: [],
      trackingEvents: [
        { event: 'start', url: 'https://tracking.mydomain.com/start' }
      ]
    };
  });
}

function createEmptyTracker() {
  return sinon.stub().callsFake(function () {
    return {
      impression: [],
      error: [],
      trackingEvents: []
    };
  });
}

function createBidWithTrackers(baseBid) {
  return {
    ...baseBid,
    vastTrackers: {
      impression: ['https://bidder.com/impression'],
      error: ['https://bidder.com/error'],
      trackingEvents: [{ event: 'start', url: 'https://bidder.com/start' }]
    }
  };
}

describe('vast trackers', () => {
  let sandbox, tracker, auction, bid, bidRequest, index;
  beforeEach(() => {
    bid = {
      requestId: 'bid',
      cpm: 1.0,
      auctionId: 'aid',
      mediaType: 'video',
    };
    bidRequest = {
      auctionId: 'aid',
      bidId: 'bid',
    };
    auction = {
      getAuctionId() {
        return 'aid';
      },
      getProperties() {
        return { auction: 'props' };
      },
      getBidRequests() {
        return [{ bids: [bidRequest] }];
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
  });
  afterEach(() => {
    reset();
    sandbox.restore();
  });

  after(disable);

  it('insert into tracker list', function () {
    const trackers = getVastTrackers(bid, { index });
    expect(trackers).to.be.an('object');
    expect(trackers.impression).to.be.an('array');
    expect(trackers.impression).to.include('https://vasttracking.mydomain.com/vast?cpm=1');
  });

  it('insert trackers in vastXml', function () {
    const trackers = getVastTrackers(bid, { index });
    let vastXml = '<VAST><Ad><Wrapper></Wrapper></Ad></VAST>';
    vastXml = insertVastTrackers(trackers, vastXml);
    expect(vastXml).to.equal('<VAST><Ad><Wrapper><Impression><![CDATA[https://vasttracking.mydomain.com/vast?cpm=1]]></Impression></Wrapper></Ad></VAST>');
  });

  it('should pass request and auction properties to trackerFn', () => {
    const bid = { requestId: 'bid', auctionId: 'aid' };
    getVastTrackers(bid, { index });
    sinon.assert.calledWith(tracker, bid, sinon.match({ auction: auction.getProperties(), bidRequest }));
  });

  if (FEATURES.VIDEO) {
    it('should add trackers to bid response', () => {
      updateVastHook({ index })(sinon.stub(), bid);
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

      const trackers = getVastTrackers(bid, { index });
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

      const trackers = getVastTrackers(bid, { index });
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

      const trackers = getVastTrackers(bid, { index });
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
      registerVastTrackers(MODULE_TYPE_ANALYTICS, 'playbackTest', createPlaybackTracker());

      const trackers = getVastTrackers(bid, { index });
      let vastXml = '<VAST><Ad><InLine><Creatives><Creative><Linear><Duration>00:00:30</Duration></Linear></Creative></Creatives></InLine></Ad></VAST>';
      vastXml = insertVastTrackers(trackers, vastXml);
      expect(vastXml).to.contain('<Tracking event="start"><![CDATA[https://tracking.mydomain.com/start]]></Tracking>');
      expect(vastXml).to.contain('<TrackingEvents>');
    });

    it('should append to existing TrackingEvents element', function () {
      registerVastTrackers(MODULE_TYPE_ANALYTICS, 'appendTest', createPlaybackTracker());

      const trackers = getVastTrackers(bid, { index });
      let vastXml = '<VAST><Ad><InLine><Creatives><Creative><Linear><Duration>00:00:30</Duration><TrackingEvents><Tracking event="complete"><![CDATA[https://existing.com/complete]]></Tracking></TrackingEvents></Linear></Creative></Creatives></InLine></Ad></VAST>';
      vastXml = insertVastTrackers(trackers, vastXml);
      expect(vastXml).to.contain('<Tracking event="complete"><![CDATA[https://existing.com/complete]]></Tracking>');
      expect(vastXml).to.contain('<Tracking event="start"><![CDATA[https://tracking.mydomain.com/start]]></Tracking>');
    });

    it('should create Linear structure when not present', function () {
      registerVastTrackers(MODULE_TYPE_ANALYTICS, 'createStructureTest', createPlaybackTracker());

      const trackers = getVastTrackers(bid, { index });
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
            { event: 'start', url: 'https://tracking.mydomain.com/start' },
            { event: 'midpoint' }, // missing url
            { url: 'https://tracking.mydomain.com/invalid' }, // missing event
            { event: '', url: 'https://tracking.mydomain.com/empty' }, // empty event
            { event: 'complete', url: '' } // empty url
          ]
        };
      });
      registerVastTrackers(MODULE_TYPE_ANALYTICS, 'validationTest', invalidTracker);

      const trackers = getVastTrackers(bid, { index });
      // Only the valid tracker should be included
      expect(trackers.trackingEvents).to.have.lengthOf(1);
      expect(trackers.trackingEvents[0].event).to.equal('start');
    });
  });

  it('should leave vastImpUrl for core to add', function () {
    const trackers = getVastTrackers({ ...bid, vastImpUrl: 'https://bidder.com/impression' }, { index });
    expect(trackers.impression).to.not.include('https://bidder.com/impression');
  });

  describe('vastTrackers from bid response support', () => {
    beforeEach(() => {
      reset();
    });

    it('should include vastTrackers from bid response', function () {
      registerVastTrackers(MODULE_TYPE_ANALYTICS, 'emptyTest', createEmptyTracker());

      const trackers = getVastTrackers(createBidWithTrackers(bid), { index });
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
          trackingEvents: [{ event: 'complete', url: 'https://analytics.com/complete' }]
        };
      });
      registerVastTrackers(MODULE_TYPE_ANALYTICS, 'analyticsTest', analyticsTracker);

      const trackers = getVastTrackers(createBidWithTrackers(bid), { index });
      expect(trackers.impression).to.have.lengthOf(2);
      expect(trackers.impression).to.include('https://analytics.com/impression');
      expect(trackers.impression).to.include('https://bidder.com/impression');
      expect(trackers.error).to.have.lengthOf(2);
      expect(trackers.trackingEvents).to.have.lengthOf(2);
    });
  });

  if (FEATURES.VIDEO) {
    it('should not modify vastXml', () => {
      const vastXml = '<VAST><Ad><Wrapper></Wrapper></Ad></VAST>';
      const videoBid = { ...bid, vastXml };
      updateVastHook({ index })(sinon.stub(), videoBid);
      expect(videoBid.vastXml).to.equal(vastXml);
      expect(videoBid.vastTrackers.impression).to.eql(['https://vasttracking.mydomain.com/vast?cpm=1']);
    });

    describe('with core and the video module', () => {
      function runUpdateVast(videoBid) {
        disable();
        try {
          updateVastHook({ index })(updateVast, videoBid);
        } finally {
          enable();
        }
      }

      it('should cache each tracker once', () => {
        const videoBid = { ...createBidWithTrackers(bid), adId: 'ad', adUnitCode: 'unit', vastUrl: 'https://bidder.example/vast' };
        const adUnit = {
          code: 'unit',
          video: {
            adServer: {
              tracking: {
                impression: { getUrl: () => 'https://publisher.example/impression', id: 'imp-id' },
                error: { getUrl: () => 'https://publisher.example/error' }
              }
            }
          }
        };
        cachedVideoImpressionVerifier(vastXmlEditorFactory(), bidTracker()).trackBid(videoBid, adUnit);
        runUpdateVast(videoBid);
        const ajax = sinon.stub();

        store([videoBid], sinon.stub(), () => ajax);

        const cachedXml = JSON.parse(ajax.firstCall.args[2]).puts[0].value;
        const doc = new DOMParser().parseFromString(cachedXml, 'text/xml');
        expect(doc.querySelectorAll('parsererror')).to.have.lengthOf(0);
        const urls = selector => Array.from(doc.querySelectorAll(selector), node => node.textContent);
        expect(urls('Wrapper > Impression')).to.eql([
          'https://publisher.example/impression', 'https://vasttracking.mydomain.com/vast?cpm=1', 'https://bidder.com/impression'
        ]);
        expect(doc.querySelector('Impression').getAttribute('id')).to.equal('imp-id');
        expect(urls('Wrapper > Error')).to.eql(['https://publisher.example/error', 'https://bidder.com/error']);
        expect(urls('Tracking[event="start"]')).to.eql(['https://bidder.com/start']);
      });

      it('should add each tracker once when the bid goes through handleVideoBidCaching', () => {
        sandbox.stub(auctionManager.index, 'getAuction').returns(auction);
        sandbox.stub(auctionManager.index, 'getBidRequest').returns(bidRequest);
        config.setConfig({ cache: { useLocal: true } });
        try {
          const videoBid = { ...createBidWithTrackers(bid), vastUrl: 'https://bidder.example/vast', vastImpUrl: 'https://bidder.com/legacy' };
          handleVideoBidCaching({
            bidResponse: videoBid,
            auctionInstance: { addBidReceived: sinon.stub() },
            afterBidAdded: sinon.stub(),
            videoMediaType: { context: 'instream' }
          });
          const doc = new DOMParser().parseFromString(videoBid.vastXml, 'text/xml');
          const urls = selector => Array.from(doc.querySelectorAll(selector), node => node.textContent);
          expect(urls('Wrapper > Impression')).to.eql([
            'https://vasttracking.mydomain.com/vast?cpm=1', 'https://bidder.com/impression', 'https://bidder.com/legacy'
          ]);
          expect(urls('Wrapper > Error')).to.eql(['https://bidder.com/error']);
          expect(urls('Tracking[event="start"]')).to.eql(['https://bidder.com/start']);
        } finally {
          config.resetConfig();
        }
      });

      it('should add vastImpUrl once', () => {
        const videoBid = { ...bid, vastUrl: 'https://bidder.example/vast', vastImpUrl: 'https://bidder.com/legacy' };
        runUpdateVast(videoBid);
        const doc = new DOMParser().parseFromString(videoBid.vastXml, 'text/xml');
        expect(Array.from(doc.querySelectorAll('Impression'), node => node.textContent)).to.eql([
          'https://vasttracking.mydomain.com/vast?cpm=1', 'https://bidder.com/legacy'
        ]);
      });
    });
  }
});
