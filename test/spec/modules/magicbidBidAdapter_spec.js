import { expect } from 'chai';
import { spec } from 'modules/magicbidBidAdapter.js';
import { BANNER, VIDEO } from 'src/mediaTypes.js';
import { FEATURES } from 'src/features.js';

const PUBLISHER_HOST = 'ads-2j0kac.rtb-magicbid.ai';

// adUnitType is NOT required — inferred from mediaTypes
const VALID_BANNER_BID = {
  bidder: 'magicbid',
  bidId: 'bid-001',
  adUnitCode: 'ad-unit-1',
  transactionId: 'txn-001',
  ortb2Imp: { ext: { tid: 'txn-001' } },
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
  ortb2Imp: { ext: { tid: 'txn-002' } },
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
  ortb2: {
    site: { page: 'https://publisher.com/article' },
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

    it('should send banner request to /ortbhb endpoint', function() {
      expect(bannerRequests[0].url).to.equal('https://' + PUBLISHER_HOST + '/ortbhb');
    });

    it('should send video request to /ortbhb endpoint', function() {
      expect(videoRequests[0].url).to.equal('https://' + PUBLISHER_HOST + '/ortbhb');
    });

    it('should build a standard OpenRTB request body with imp array', function() {
      expect(bannerRequests[0].data).to.be.an('object');
      expect(bannerRequests[0].data.imp).to.be.an('array').with.length(1);
    });

    it('should embed adUnitId in imp.ext.magicbid', function() {
      const imp = bannerRequests[0].data.imp[0];
      expect(imp.ext.magicbid.adUnitId).to.equal(631967104);
    });

    it('should embed host in imp.ext.magicbid', function() {
      const imp = bannerRequests[0].data.imp[0];
      expect(imp.ext.magicbid.host).to.equal(PUBLISHER_HOST);
    });

    it('should include banner object in imp for banner bids', function() {
      const imp = bannerRequests[0].data.imp[0];
      expect(imp.banner).to.exist;
    });

    it('should include video object in imp for video bids', function() {
      if (FEATURES.VIDEO) {
        const imp = videoRequests[0].data.imp[0];
        expect(imp.video).to.exist;
      }
    });

    it('should use text/plain content type to avoid preflight', function() {
      expect(bannerRequests[0].options.contentType).to.equal('text/plain');
    });

    it('should group two banner bids from same publisher into one request with two imps', function() {
      const bid2 = { ...VALID_BANNER_BID, bidId: 'bid-003', adUnitCode: 'ad-unit-3' };
      const requests = spec.buildRequests([VALID_BANNER_BID, bid2], BIDDER_REQUEST);
      expect(requests).to.have.length(1);
      expect(requests[0].data.imp).to.have.length(2);
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

    it('should include custom params in imp.ext.magicbid when provided', function() {
      const bid = {
        ...VALID_BANNER_BID,
        params: { host: PUBLISHER_HOST, adUnitId: 631967104, custom1: 'sports', custom2: 'en' },
      };
      const requests = spec.buildRequests([bid], BIDDER_REQUEST);
      const imp = requests[0].data.imp[0];
      expect(imp.ext.magicbid.custom1).to.equal('sports');
      expect(imp.ext.magicbid.custom2).to.equal('en');
    });
  });

  describe('interpretResponse', function() {
    // ortbConverter uses a WeakMap keyed on the exact object returned by toORTB.
    // We must call buildRequests() once and reuse the same request object
    // so that the WeakMap entry is present when interpretResponse calls fromORTB.
    let bannerRequest;
    let videoRequest;

    beforeEach(function() {
      bannerRequest = spec.buildRequests([VALID_BANNER_BID], BIDDER_REQUEST)[0];
      videoRequest = spec.buildRequests([VALID_VIDEO_BID], BIDDER_REQUEST)[0];
    });

    function makeBannerResponse(impid) {
      return {
        body: {
          id: 'auction-001',
          seatbid: [{
            bid: [{
              id: 'resp-001',
              impid: impid || bannerRequest.data.imp[0].id,
              price: 1.5,
              adid: '42',
              adm: '<div>banner markup</div>',
              adomain: ['advertiser.com'],
              crid: 'cr-001',
              w: 300,
              h: 250,
              mtype: 1,
              nurl: 'https://win.rtb-magicbid.ai/win?id=123',
            }],
            seat: 'magicbid',
          }],
          cur: 'USD',
        },
      };
    }

    function makeVideoResponse() {
      return {
        body: {
          id: 'auction-001',
          seatbid: [{
            bid: [{
              id: 'resp-002',
              impid: videoRequest.data.imp[0].id,
              price: 3.0,
              adm: '<?xml version="1.0"?><VAST version="4.0"></VAST>',
              adomain: ['brand.com'],
              crid: 'cr-002',
              w: 640,
              h: 480,
              mtype: 2,
            }],
            seat: 'magicbid',
          }],
          cur: 'USD',
        },
      };
    }

    it('should return a valid banner bid from an OpenRTB response', function() {
      const bids = spec.interpretResponse(makeBannerResponse(), bannerRequest);
      expect(bids).to.have.length(1);
      expect(bids[0].cpm).to.equal(1.5);
      expect(bids[0].mediaType).to.equal(BANNER);
      expect(bids[0].ad).to.include('<div>banner markup</div>');
    });

    it('should return a valid video bid from an OpenRTB response', function() {
      if (FEATURES.VIDEO) {
        const bids = spec.interpretResponse(makeVideoResponse(), videoRequest);
        expect(bids).to.have.length(1);
        expect(bids[0].cpm).to.equal(3.0);
        expect(bids[0].mediaType).to.equal(VIDEO);
        expect(bids[0].vastXml).to.include('<VAST');
      }
    });

    it('should return empty array for an empty response', function() {
      expect(spec.interpretResponse({}, bannerRequest)).to.be.empty;
    });

    it('should filter out bids with zero CPM', function() {
      const bad = {
        body: {
          id: 'auction-001',
          seatbid: [{
            bid: [{ id: 'b1', impid: bannerRequest.data.imp[0].id, price: 0, adm: '<div/>', crid: 'c', w: 300, h: 250, mtype: 1 }],
            seat: 'magicbid',
          }],
        },
      };
      expect(spec.interpretResponse(bad, bannerRequest)).to.be.empty;
    });

    it('should include advertiserDomains in meta', function() {
      const bids = spec.interpretResponse(makeBannerResponse(), bannerRequest);
      expect(bids[0].meta.advertiserDomains).to.deep.equal(['advertiser.com']);
    });
  });

  describe('getUserSyncs', function() {
    const responseWithSyncs = {
      body: {
        ext: {
          userSyncs: [
            { type: 'image', url: 'https://sync.rtb-magicbid.ai/pixel' },
            { type: 'iframe', url: 'https://sync.rtb-magicbid.ai/iframe' },
          ],
        },
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
