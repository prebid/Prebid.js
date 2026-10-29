import { expect } from 'chai';
import { spec } from 'modules/mulBidAdapter.js';
import { BANNER, VIDEO } from 'src/mediaTypes.js';

describe('mulBidAdapter', function () {
  const bannerBid = {
    bidder: 'mul',
    params: {
      placementId: 'test-placement-123'
    },
    mediaTypes: {
      banner: {
        sizes: [[300, 250]]
      }
    },
    bidId: '22c4871113f461'
  };

  const videoBid = {
    bidder: 'mul',
    params: {
      placementId: 'test-placement-video'
    },
    mediaTypes: {
      video: {
        playerSize: [[640, 480]],
        context: 'instream',
        mimes: ['video/mp4'],
        protocols: [2, 3, 5, 6],
        minduration: 5,
        maxduration: 30,
        startdelay: 0,
        playbackmethod: [1, 2],
        api: [1, 2]
      }
    },
    bidId: '33d5982224e572'
  };

  const bidderRequest = {
    auctionId: 'b06c5141-fe8f-4cdf-9d7d-54415490a917',
    refererInfo: {
      page: 'https://publisher.com/article',
      domain: 'publisher.com',
      ref: 'https://google.com'
    },
    gdprConsent: {
      gdprApplies: true,
      consentString: 'BOtmiBKOtmiBKABABAENAFAAAAACeAAA'
    },
    uspConsent: '1---',
    ortb2: {
      site: {
        name: 'Publisher Site'
      },
      user: {
        ext: {
          eids: [{ source: 'pubcid.org', uids: [{ id: 'uid-123' }] }]
        }
      },
      source: {
        ext: {
          schain: { ver: '1.0', complete: 1, nodes: [] }
        }
      }
    }
  };

  describe('spec metadata', function () {
    it('should support both BANNER and VIDEO mediaTypes', function () {
      expect(spec.supportedMediaTypes).to.deep.equal([BANNER, VIDEO]);
    });
  });

  describe('isBidRequestValid', function () {
    it('should return true when placementId is specified', function () {
      expect(spec.isBidRequestValid(bannerBid)).to.be.true;
      expect(spec.isBidRequestValid(videoBid)).to.be.true;
    });

    it('should return true when zoneId is specified', function () {
      expect(spec.isBidRequestValid({ params: { zoneId: 'zone-99' } })).to.be.true;
    });

    it('should return false when params is empty or missing required fields', function () {
      expect(spec.isBidRequestValid({})).to.be.false;
      expect(spec.isBidRequestValid({ params: {} })).to.be.false;
    });
  });

  describe('buildRequests', function () {
    it('should build a valid POST request with banner and video payloads and FPD', function () {
      const serverRequest = spec.buildRequests([bannerBid, videoBid], bidderRequest);
      expect(serverRequest.method).to.equal('POST');
      expect(serverRequest.url).to.contain('/api/bid');
      expect(serverRequest.options.contentType).to.equal('text/plain');

      const data = JSON.parse(serverRequest.data);
      expect(data.id).to.equal(bidderRequest.auctionId);
      expect(data.page).to.equal('https://publisher.com/article');
      expect(data.consent.gdprApplies).to.be.true;
      expect(data.consent.consentString).to.equal('BOtmiBKOtmiBKABABAENAFAAAAACeAAA');
      expect(data.consent.uspConsent).to.equal('1---');
      expect(data.eids).to.have.lengthOf(1);
      expect(data.schain.ver).to.equal('1.0');

      expect(data.bids).to.have.lengthOf(2);

      // Banner bid check
      expect(data.bids[0].bidId).to.equal('22c4871113f461');
      expect(data.bids[0].placementId).to.equal('test-placement-123');
      expect(data.bids[0].banner.sizes).to.deep.equal([[300, 250]]);

      // Video bid check
      expect(data.bids[1].bidId).to.equal('33d5982224e572');
      expect(data.bids[1].placementId).to.equal('test-placement-video');
      expect(data.bids[1].video.context).to.equal('instream');
      expect(data.bids[1].video.playerSize).to.deep.equal([[640, 480]]);
      expect(data.bids[1].video.mimes).to.deep.equal(['video/mp4']);
      expect(data.bids[1].video.protocols).to.deep.equal([2, 3, 5, 6]);
      expect(data.bids[1].video.minduration).to.equal(5);
      expect(data.bids[1].video.maxduration).to.equal(30);
    });

    it('should respect getFloor and custom bidfloor params', function () {
      const floorBid = {
        ...bannerBid,
        getFloor: () => ({ currency: 'USD', floor: 1.75 })
      };
      const req = spec.buildRequests([floorBid], bidderRequest);
      const data = JSON.parse(req.data);
      expect(data.bids[0].floor).to.equal(1.75);
    });
  });

  describe('interpretResponse', function () {
    it('should map banner server response to Prebid banner response', function () {
      const mockServerResponse = {
        body: [
          {
            bidId: '22c4871113f461',
            cpm: 2.45,
            currency: 'USD',
            width: 300,
            height: 250,
            creativeId: 'crid_12345',
            adHtml: '<div>Ad Banner</div>',
            adomain: ['monetiseup.com'],
            demandSource: 'Adagio'
          }
        ]
      };

      const result = spec.interpretResponse(mockServerResponse, {});
      expect(result).to.have.lengthOf(1);
      const bidResponse = result[0];

      expect(bidResponse.requestId).to.equal('22c4871113f461');
      expect(bidResponse.cpm).to.equal(2.45);
      expect(bidResponse.currency).to.equal('USD');
      expect(bidResponse.width).to.equal(300);
      expect(bidResponse.height).to.equal(250);
      expect(bidResponse.ad).to.equal('<div>Ad Banner</div>');
      expect(bidResponse.netRevenue).to.be.true;
      expect(bidResponse.ttl).to.equal(300);
      expect(bidResponse.mediaType).to.equal(BANNER);
      expect(bidResponse.meta.advertiserDomains).to.deep.equal(['monetiseup.com']);
      expect(bidResponse.meta.demandSource).to.equal('Adagio');
      expect(bidResponse.meta.mediaType).to.equal(BANNER);
    });

    it('should map video server response with vastUrl and vastXml to Prebid video response', function () {
      const mockVideoServerResponse = {
        body: [
          {
            bidId: '33d5982224e572',
            cpm: 5.50,
            currency: 'USD',
            width: 640,
            height: 480,
            creativeId: 'crid_video_1',
            vastUrl: 'https://bid5up.monetiseup.com/vast/123.xml',
            vastXml: '<VAST version="3.0"></VAST>',
            mediaType: 'video',
            adomain: ['advertiser.com'],
            demandSource: 'PubMatic'
          }
        ]
      };

      const result = spec.interpretResponse(mockVideoServerResponse, {});
      expect(result).to.have.lengthOf(1);
      const videoResponse = result[0];

      expect(videoResponse.requestId).to.equal('33d5982224e572');
      expect(videoResponse.cpm).to.equal(5.50);
      expect(videoResponse.mediaType).to.equal(VIDEO);
      expect(videoResponse.vastUrl).to.equal('https://bid5up.monetiseup.com/vast/123.xml');
      expect(videoResponse.vastXml).to.equal('<VAST version="3.0"></VAST>');
      expect(videoResponse.playerSize).to.deep.equal([640, 480]);
      expect(videoResponse.meta.mediaType).to.equal(VIDEO);
    });

    it('should return empty array on empty or invalid response', function () {
      expect(spec.interpretResponse({ body: [] }, {})).to.deep.equal([]);
      expect(spec.interpretResponse({ body: null }, {})).to.deep.equal([]);
      expect(spec.interpretResponse({}, {})).to.deep.equal([]);
    });
  });

  describe('getUserSyncs', function () {
    it('should return iframe sync when iframeEnabled is true', function () {
      const syncs = spec.getUserSyncs({ iframeEnabled: true }, [], { gdprApplies: true, consentString: 'consent_123' }, '1---', null, false);
      expect(syncs).to.have.lengthOf(1);
      expect(syncs[0].type).to.equal('iframe');
      expect(syncs[0].url).to.contain('gdpr=1');
      expect(syncs[0].url).to.contain('consent_123');
      expect(syncs[0].url).to.contain('us_privacy=1---');
    });

    it('should return image sync when pixelEnabled is true', function () {
      const syncs = spec.getUserSyncs({ pixelEnabled: true }, [], null, '', null, false);
      expect(syncs).to.have.lengthOf(1);
      expect(syncs[0].type).to.equal('image');
      expect(syncs[0].url).to.contain('/api/usersync');
    });

    it('should return empty array when syncing is disabled', function () {
      const syncs = spec.getUserSyncs({}, [], null, '', null, false);
      expect(syncs).to.deep.equal([]);
    });

    it('should suppress user sync when coppa is true', function () {
      const syncs = spec.getUserSyncs({ iframeEnabled: true, pixelEnabled: true }, [], null, '', null, true);
      expect(syncs).to.deep.equal([]);
    });
  });
});
