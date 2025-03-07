import {
  addImpUrlToTrackers,
  addTrackersToResponse,
  getVastTrackers,
  insertVastTrackers,
  registerVastTrackers,
  reset, responseHook,
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
    sandbox = sinon.sandbox.create();
    index = new AuctionIndex(() => [auction]);
    tracker = sinon.stub().callsFake(function (bidResponse) {
      return [
        {'event': 'impressions', 'url': `https://vasttracking.mydomain.com/vast?cpm=${bidResponse.cpm}`}
      ];
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
    expect(trackers).to.be.a('map');
    expect(trackers.get('impressions')).to.exists;
    expect(trackers.get('impressions').has('https://vasttracking.mydomain.com/vast?cpm=1')).to.be.true;
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
    expect(trackers).to.be.a('map');
    expect(trackers.get('impressions')).to.exists;
    expect(trackers.get('impressions').has('imptracker.com')).to.be.true;
  });

  if (FEATURES.VIDEO) {
    it('should add trackers to bid response', () => {
      responseHook({index})(sinon.stub(), 'au', bid);
      expect(bid.vastImpUrl).to.eql([
        'https://vasttracking.mydomain.com/vast?cpm=1'
      ])
    });
  }
})
