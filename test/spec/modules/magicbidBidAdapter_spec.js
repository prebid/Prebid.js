import { expect } from 'chai';
import { spec } from 'modules/magicbidBidAdapter.js';
import { BANNER, VIDEO } from 'src/mediaTypes.js';

// ─────────────────────────────────────────────
//  MagicBid Bid Adapter — Unit Tests
//
//  Publisher A example params (from MagicBid onboarding):
//    host      : 'ads-2j0kac.rtb-magicbid.ai'
//    adUnitId  : 631967104
//    adUnitType: 'banner'
// ─────────────────────────────────────────────

const PUBLISHER_HOST = 'ads-2j0kac.rtb-magicbid.ai';

const VALID_BANNER_BID = {
  bidder: 'magicbid',
  bidId: 'bid-001',
  adUnitCode: 'ad-unit-1',
  transactionId: 'txn-001',
  mediaTypes: {
    banner: { sizes: [[300, 250], [728, 90]] },
  },
  params: {
    host: PUBLISHER_HOST,
    adUnitId: 631967104,
    adUnitType: 'banner',
  },
};

const VALID_VIDEO_BID = {
  bidder: 'magicbid',
  bidId: 'bid-002',
  adUnitCode: 'ad-unit-2',
  transactionId: 'txn-002',
  mediaTypes: {
    video: {
      context: 'instream',
      playerSize: [[640, 480]],
      mimes: ['video/mp4'],
    },
  },
  params: {
    host: PUBLISHER_HOST,
    adUnitId: 631967104,
    adUnitType: 'video',
  },
};

const BIDDER_REQUEST = {
  auctionId: 'auction-001',
  gdprConsent: {
    gdprApplies: true,
    consentString: 'BOEFEAyOEFEAyAHABDENAI4AAAB9vABAASA',
  },
  uspConsent: '1YYY',
  refererInfo: {
    page: 'https://publisher.com/article',
    ref: 'https://google.com',
  },
};

// ─── Tests ──────────────────────────────────

describe('MagicBid Bid Adapter', () => {

  describe('spec.code', () => {
    it('should have bidder code "magicbid"', () => {
      expect(spec.code).to.equal('magicbid');
    });
  });

  describe('spec.supportedMediaTypes', () => {
    it('should support banner and video', () => {
      expect(spec.supportedMediaTypes).to.include.members([BANNER, VIDEO]);
    });
  });

  // ─── isBidRequestValid ──────────────────────
  describe('isBidRequestValid', () => {
    it('should return true for a valid banner bid', () => {
      expect(spec.isBidRequestValid(VALID_BANNER_BID)).to.be.true;
    });

    it('should return true for a valid video bid', () => {
      expect(spec.isBidRequestValid(VALID_VIDEO_BID)).to.be.true;
    });

    it('should return true without publisherId — it is optional', () => {
      const bid = {
        ...VALID_BANNER_BID,
        params: { host: PUBLISHER_HOST, adUnitId: 631967104, adUnitType: 'banner' },
      };
      expect(spec.isBidRequestValid(bid)).to.be.true;
    });

    it('should return false when host is missing', () => {
      const bid = { ...VALID_BANNER_BID, params: { ...VALID_BANNER_BID.params, host: undefined } };
      expect(spec.isBidRequestValid(bid)).to.be.false;
    });

    it('should return false when host is an empty string', () => {
      const bid = { ...VALID_BANNER_BID, params: { ...VALID_BANNER_BID.params, host: '' } };
      expect(spec.isBidRequestValid(bid)).to.be.false;
    });

    it('should return false when adUnitId is missing', () => {
      const bid = { ...VALID_BANNER_BID, params: { ...VALID_BANNER_BID.params, adUnitId: undefined } };
      expect(spec.isBidRequestValid(bid)).to.be.false;
    });

    it('should return false when adUnitId is a string instead of integer', () => {
      const bid = { ...VALID_BANNER_BID, params: { ...VALID_BANNER_BID.params, adUnitId: '631967104' } };
      expect(spec.isBidRequestValid(bid)).to.be.false;
    });

    it('should return false when adUnitId is a negative number', () => {
      const bid = { ...VALID_BANNER_BID, params: { ...VALID_BANNER_BID.params, adUnitId: -1 } };
      expect(spec.isBidRequestValid(bid)).to.be.false;
    });

    it('should return false when adUnitType is missing', () => {
      const bid = { ...VALID_BANNER_BID, params: { host: PUBLISHER_HOST, adUnitId: 631967104 } };
      expect(spec.isBidRequestValid(bid)).to.be.false;
    });

    it('should return false when adUnitType is invalid', () => {
      const bid = { ...VALID_BANNER_BID, params: { ...VALID_BANNER_BID.params, adUnitType: 'native' } };
      expect(spec.isBidRequestValid(bid)).to.be.false;
    });

    it('should return false when params is empty', () => {
      expect(spec.isBidRequestValid({ ...VALID_BANNER_BID, params: {} })).to.be.false;
    });
  });

  // ─── buildRequests ──────────────────────────
  describe('buildRequests', () => {
    let bannerRequests;
    let videoRequests;

    beforeEach(() => {
      bannerRequests = spec.buildRequests([VALID_BANNER_BID], BIDDER_REQUEST);
      videoRequests  = spec.buildRequests([VALID_VIDEO_BID], BIDDER_REQUEST);
    });

    it('should return an array with one request', () => {
      expect(bannerRequests).to.be.an('array').with.length(1);
    });

    it('should use POST method', () => {
      expect(bannerRequests[0].method).to.equal('POST');
    });

    it('should build the correct banner endpoint URL using the publisher host', () => {
      expect(bannerRequests[0].url).to.equal(`https://${PUBLISHER_HOST}/prebid/banner`);
    });

    it('should build the correct video endpoint URL using the publisher host', () => {
      expect(videoRequests[0].url).to.equal(`https://${PUBLISHER_HOST}/prebid/vast`);
    });

    it('should include the correct adUnitId in payload', () => {
      const payload = JSON.parse(bannerRequests[0].data);
      expect(payload.bids[0].adUnitId).to.equal(631967104);
    });

    it('should include GDPR consent in payload', () => {
      const payload = JSON.parse(bannerRequests[0].data);
      expect(payload.gdpr.applies).to.be.true;
      expect(payload.gdpr.consent).to.be.a('string').that.is.not.empty;
    });

    it('should include USP string in payload', () => {
      const payload = JSON.parse(bannerRequests[0].data);
      expect(payload.usp).to.equal('1YYY');
    });

    it('should include page and ref in site object', () => {
      const payload = JSON.parse(bannerRequests[0].data);
      expect(payload.site.page).to.equal('https://publisher.com/article');
      expect(payload.site.ref).to.equal('https://google.com');
    });

    it('should group two banner bids from the same publisher into one request', () => {
      const bid2 = { ...VALID_BANNER_BID, bidId: 'bid-003', adUnitCode: 'ad-unit-3' };
      const requests = spec.buildRequests([VALID_BANNER_BID, bid2], BIDDER_REQUEST);
      expect(requests).to.have.length(1);
      expect(JSON.parse(requests[0].data).bids).to.have.length(2);
    });

    it('should create separate requests for two publishers with different hosts', () => {
      const bidPublisherB = {
        ...VALID_BANNER_BID,
        bidId: 'bid-004',
        params: { ...VALID_BANNER_BID.params, host: 'ads-x9k2lp.rtb-magicbid.ai' },
      };
      const requests = spec.buildRequests([VALID_BANNER_BID, bidPublisherB], BIDDER_REQUEST);
      expect(requests).to.have.length(2);
    });

    it('should include optional custom params when provided', () => {
      const bid = {
        ...VALID_BANNER_BID,
        params: { ...VALID_BANNER_BID.params, custom1: 'sports', custom2: 'en' },
      };
      const payload = JSON.parse(spec.buildRequests([bid], BIDDER_REQUEST)[0].data);
      expect(payload.bids[0].custom1).to.equal('sports');
      expect(payload.bids[0].custom2).to.equal('en');
    });
  });

  // ─── interpretResponse ──────────────────────
  describe('interpretResponse', () => {
    const bannerServerResponse = {
      body: [{
        bidId: 'bid-001',
        cpm: 1.5,
        currency: 'USD',
        width: 300,
        height: 250,
        ad: '<div>banner markup</div>',
        creativeId: 'cr-001',
        ttl: 300,
        adomain: ['advertiser.com'],
      }],
    };

    const videoServerResponse = {
      body: [{
        bidId: 'bid-002',
        cpm: 3.0,
        currency: 'USD',
        width: 640,
        height: 480,
        vastUrl: `https://${PUBLISHER_HOST}/vast?id=123`,
        creativeId: 'cr-002',
        ttl: 300,
        adomain: ['brand.com'],
      }],
    };

    it('should return a valid banner bid object', () => {
      const bids = spec.interpretResponse(bannerServerResponse, { _adUnitType: 'banner' });
      expect(bids).to.have.length(1);
      expect(bids[0].cpm).to.equal(1.5);
      expect(bids[0].mediaType).to.equal(BANNER);
      expect(bids[0].ad).to.equal('<div>banner markup</div>');
    });

    it('should return a valid video bid object with vastUrl', () => {
      const bids = spec.interpretResponse(videoServerResponse, { _adUnitType: 'video' });
      expect(bids).to.have.length(1);
      expect(bids[0].cpm).to.equal(3.0);
      expect(bids[0].mediaType).to.equal(VIDEO);
      expect(bids[0].vastUrl).to.include('rtb-magicbid.ai');
    });

    it('should return empty array for an empty response', () => {
      expect(spec.interpretResponse({}, { _adUnitType: 'banner' })).to.be.empty;
    });

    it('should filter out bids with zero CPM', () => {
      const bad = { body: [{ bidId: 'bid-x', cpm: 0 }] };
      expect(spec.interpretResponse(bad, { _adUnitType: 'banner' })).to.be.empty;
    });

    it('should include advertiserDomains in meta', () => {
      const bids = spec.interpretResponse(bannerServerResponse, { _adUnitType: 'banner' });
      expect(bids[0].meta.advertiserDomains).to.deep.equal(['advertiser.com']);
    });
  });

  // ─── getUserSyncs ───────────────────────────
  describe('getUserSyncs', () => {
    const responseWithSyncs = {
      body: {
        userSyncs: [
          { type: 'image',  url: `https://sync.rtb-magicbid.ai/pixel` },
          { type: 'iframe', url: `https://sync.rtb-magicbid.ai/iframe` },
        ],
      },
    };

    it('should return pixel sync when pixelEnabled', () => {
      const syncs = spec.getUserSyncs({ pixelEnabled: true }, [responseWithSyncs]);
      expect(syncs).to.deep.include({ type: 'image', url: 'https://sync.rtb-magicbid.ai/pixel' });
    });

    it('should return iframe sync when iframeEnabled', () => {
      const syncs = spec.getUserSyncs({ iframeEnabled: true }, [responseWithSyncs]);
      expect(syncs).to.deep.include({ type: 'iframe', url: 'https://sync.rtb-magicbid.ai/iframe' });
    });

    it('should return empty array when no server responses', () => {
      expect(spec.getUserSyncs({ pixelEnabled: true }, [])).to.be.empty;
    });
  });
});
