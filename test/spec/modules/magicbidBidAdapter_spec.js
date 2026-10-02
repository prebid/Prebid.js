import { expect } from 'chai';
import { spec } from 'modules/magicbidBidAdapter.js';
import { BANNER, VIDEO } from 'src/mediaTypes.js';

const PUBLISHER_HOST = 'ads-2j0kac.rtb-magicbid.ai';

// adUnitType is NOT required — inferred from mediaTypes
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

describe('MagicBid Bid Adapter', function() {
  describe('spec.code', function() {
    it('should have bidder code magicbid', function() {
      expect(spec.code).to.equal('magicbid');
    });
  });

  describe('spec.supportedMediaTypes', function() {
    it('should support banner and video', function() {
      expect(spec.supportedMediaTypes).to.include.members([BANNER, VIDEO]);
    });
  });

  describe('isBidRequestValid', function() {
    it('should return true for a valid banner bid without adUnitType', function() {
      expect(spec.isBidRequestValid(VALID_BANNER_BID)).to.be.true;
    });

    it('should return true for a valid video bid without adUnitType', function() {
      expect(spec.isBidRequestValid(VALID_VIDEO_BID)).to.be.true;
    });

    it('should return true when adUnitType is explicitly provided as banner', function() {
      const bid = {
        ...VALID_BANNER_BID,
        params: { host: PUBLISHER_HOST, adUnitId: 631967104, adUnitType: 'banner' },
      };
      expect(spec.isBidRequestValid(bid)).to.be.true;
    });

    it('should return true when adUnitType is explicitly provided as video', function() {
      const bid = {
        ...VALID_VIDEO_BID,
        params: { host: PUBLISHER_HOST, adUnitId: 631967104, adUnitType: 'video' },
      };
      expect(spec.isBidRequestValid(bid)).to.be.true;
    });

    it('should return false when adUnitType is explicitly provided but invalid', function() {
      const bid = {
        ...VALID_BANNER_BID,
        params: { host: PUBLISHER_HOST, adUnitId: 631967104, adUnitType: 'native' },
      };
      expect(spec.isBidRequestValid(bid)).to.be.false;
    });

    it('should return false when host is missing', function() {
      const bid = { ...VALID_BANNER_BID, params: { adUnitId: 631967104 } };
      expect(spec.isBidRequestValid(bid)).to.be.false;
    });

    it('should return false when host is an empty string', function() {
      const bid = { ...VALID_BANNER_BID, params: { host: '', adUnitId: 631967104 } };
      expect(spec.isBidRequestValid(bid)).to.be.false;
    });

    it('should return false when adUnitId is missing', function() {
      const bid = { ...VALID_BANNER_BID, params: { host: PUBLISHER_HOST } };
      expect(spec.isBidRequestValid(bid)).to.be.false;
    });

    it('should return false when adUnitId is a string instead of integer', function() {
      const bid = { ...VALID_BANNER_BID, params: { host: PUBLISHER_HOST, adUnitId: '631967104' } };
      expect(spec.isBidRequestValid(bid)).to.be.false;
    });

    it('should return false when adUnitId is a negative number', function() {
      const bid = { ...VALID_BANNER_BID, params: { host: PUBLISHER_HOST, adUnitId: -1 } };
      expect(spec.isBidRequestValid(bid)).to.be.false;
    });

    it('should return false when params is empty', function() {
      expect(spec.isBidRequestValid({ ...VALID_BANNER_BID, params: {} })).to.be.false;
    });
  });

  describe('buildRequests', function() {
    let bannerRequests;
    let videoRequests;

    beforeEach(function() {
      bannerRequests = spec.buildRequests([VALID_BANNER_BID], BIDDER_REQUEST);
      videoRequests = spec.buildRequests([VALID_VIDEO_BID], BIDDER_REQUEST);
    });

    it('should return an array with one request', function() {
      expect(bannerRequests).to.be.an('array').with.length(1);
    });

    it('should use POST method', function() {
      expect(bannerRequests[0].method).to.equal('POST');
    });

    it('should build the correct banner endpoint URL', function() {
      expect(bannerRequests[0].url).to.equal('https://' + PUBLISHER_HOST + '/prebid/banner');
    });

    it('should build the correct video endpoint URL', function() {
      expect(videoRequests[0].url).to.equal('https://' + PUBLISHER_HOST + '/prebid/vast');
    });

    it('should infer banner adUnitType from mediaTypes automatically', function() {
      const payload = JSON.parse(bannerRequests[0].data);
      expect(bannerRequests[0].url).to.include('/prebid/banner');
      expect(payload.bids[0].adUnitId).to.equal(631967104);
    });

    it('should infer video adUnitType from mediaTypes automatically', function() {
      expect(videoRequests[0].url).to.include('/prebid/vast');
    });

    it('should include the correct adUnitId in payload', function() {
      const payload = JSON.parse(bannerRequests[0].data);
      expect(payload.bids[0].adUnitId).to.equal(631967104);
    });

    it('should include GDPR consent in payload', function() {
      const payload = JSON.parse(bannerRequests[0].data);
      expect(payload.gdpr.applies).to.be.true;
      expect(payload.gdpr.consent).to.be.a('string').that.is.not.empty;
    });

    it('should include USP string in payload', function() {
      const payload = JSON.parse(bannerRequests[0].data);
      expect(payload.usp).to.equal('1YYY');
    });

    it('should include page and ref in site object', function() {
      const payload = JSON.parse(bannerRequests[0].data);
      expect(payload.site.page).to.equal('https://publisher.com/article');
      expect(payload.site.ref).to.equal('https://google.com');
    });

    it('should use text/plain content type to avoid preflight', function() {
      expect(bannerRequests[0].options.contentType).to.equal('text/plain');
    });

    it('should group two banner bids from same publisher into one request', function() {
      const bid2 = { ...VALID_BANNER_BID, bidId: 'bid-003', adUnitCode: 'ad-unit-3' };
      const requests = spec.buildRequests([VALID_BANNER_BID, bid2], BIDDER_REQUEST);
      expect(requests).to.have.length(1);
      expect(JSON.parse(requests[0].data).bids).to.have.length(2);
    });

    it('should create separate requests for two publishers with different hosts', function() {
      const bidPublisherB = {
        ...VALID_BANNER_BID,
        bidId: 'bid-004',
        params: { host: 'ads-x9k2lp.rtb-magicbid.ai', adUnitId: 631967104 },
      };
      const requests = spec.buildRequests([VALID_BANNER_BID, bidPublisherB], BIDDER_REQUEST);
      expect(requests).to.have.length(2);
    });

    it('should handle flat video playerSize [w, h] correctly', function() {
      const bid = {
        ...VALID_VIDEO_BID,
        mediaTypes: {
          video: { playerSize: [640, 480], mimes: ['video/mp4'] },
        },
      };
      const requests = spec.buildRequests([bid], BIDDER_REQUEST);
      const payload = JSON.parse(requests[0].data);
      expect(payload.bids[0].sizes).to.deep.equal([[640, 480]]);
    });

    it('should handle nested video playerSize [[w, h]] correctly', function() {
      const payload = JSON.parse(videoRequests[0].data);
      expect(payload.bids[0].sizes).to.deep.equal([[640, 480]]);
    });

    it('should read schain from ortb2.source.ext.schain', function() {
      const schain = { ver: '1.0', complete: 1, nodes: [] };
      const bidWithSchain = {
        ...VALID_BANNER_BID,
        ortb2: { source: { ext: { schain: schain } } },
      };
      const requests = spec.buildRequests([bidWithSchain], BIDDER_REQUEST);
      const payload = JSON.parse(requests[0].data);
      expect(payload.schain).to.deep.equal(schain);
    });
  });

  describe('interpretResponse', function() {
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
        nurl: 'https://win.rtb-magicbid.ai/win?id=123',
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
        vastUrl: 'https://' + PUBLISHER_HOST + '/vast?id=123',
        creativeId: 'cr-002',
        ttl: 300,
        adomain: ['brand.com'],
      }],
    };

    it('should return a valid banner bid object', function() {
      const bids = spec.interpretResponse(bannerServerResponse, { _adUnitType: 'banner' });
      expect(bids).to.have.length(1);
      expect(bids[0].cpm).to.equal(1.5);
      expect(bids[0].mediaType).to.equal(BANNER);
      expect(bids[0].ad).to.equal('<div>banner markup</div>');
    });

    it('should preserve nurl for win notification', function() {
      const bids = spec.interpretResponse(bannerServerResponse, { _adUnitType: 'banner' });
      expect(bids[0].nurl).to.equal('https://win.rtb-magicbid.ai/win?id=123');
    });

    it('should return a valid video bid object with vastUrl', function() {
      const bids = spec.interpretResponse(videoServerResponse, { _adUnitType: 'video' });
      expect(bids).to.have.length(1);
      expect(bids[0].cpm).to.equal(3.0);
      expect(bids[0].mediaType).to.equal(VIDEO);
      expect(bids[0].vastUrl).to.include('rtb-magicbid.ai');
    });

    it('should return empty array for an empty response', function() {
      expect(spec.interpretResponse({}, { _adUnitType: 'banner' })).to.be.empty;
    });

    it('should filter out bids with zero CPM', function() {
      const bad = { body: [{ bidId: 'bid-x', cpm: 0 }] };
      expect(spec.interpretResponse(bad, { _adUnitType: 'banner' })).to.be.empty;
    });

    it('should include advertiserDomains in meta', function() {
      const bids = spec.interpretResponse(bannerServerResponse, { _adUnitType: 'banner' });
      expect(bids[0].meta.advertiserDomains).to.deep.equal(['advertiser.com']);
    });
  });

  describe('getUserSyncs', function() {
    const responseWithSyncs = {
      body: {
        userSyncs: [
          { type: 'image', url: 'https://sync.rtb-magicbid.ai/pixel' },
          { type: 'iframe', url: 'https://sync.rtb-magicbid.ai/iframe' },
        ],
      },
    };

    it('should return pixel sync when pixelEnabled', function() {
      const syncs = spec.getUserSyncs({ pixelEnabled: true }, [responseWithSyncs]);
      expect(syncs).to.deep.include({ type: 'image', url: 'https://sync.rtb-magicbid.ai/pixel' });
    });

    it('should return iframe sync when iframeEnabled', function() {
      const syncs = spec.getUserSyncs({ iframeEnabled: true }, [responseWithSyncs]);
      expect(syncs).to.deep.include({ type: 'iframe', url: 'https://sync.rtb-magicbid.ai/iframe' });
    });

    it('should return empty array when no server responses', function() {
      expect(spec.getUserSyncs({ pixelEnabled: true }, [])).to.be.empty;
    });
  });

  describe('onBidWon', function() {
    it('should fire win notification when nurl is present', function() {
      const bid = { nurl: 'https://win.rtb-magicbid.ai/win?id=123' };
      expect(function() { spec.onBidWon(bid); }).to.not.throw();
    });

    it('should not throw when nurl is absent', function() {
      expect(function() { spec.onBidWon({}); }).to.not.throw();
    });
  });
});
