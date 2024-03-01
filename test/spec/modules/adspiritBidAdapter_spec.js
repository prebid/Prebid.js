import { expect } from 'chai';
import { spec } from 'modules/adspiritBidAdapter.js';
import * as utils from 'src/utils.js';
import { registerBidder } from 'src/adapters/bidderFactory.js';
import { BANNER, NATIVE } from 'src/mediaTypes.js';
const RTB_URL = '/rtb/getbid.php?rtbprovider=prebid';
const SCRIPT_URL = '/adasync.min.js';

describe('Adspirit Bidder Spec', function () {
  // isBidRequestValid ---case
  describe('isBidRequestValid', function () {
    it('should return true if the bid request is valid', function () {
      const validBid = { bidder: 'adspirit', params: { placementId: '57', host: 'test.adspirit.de' } };
      const result = spec.isBidRequestValid(validBid);
      expect(result).to.be.true;
    });

    it('should return false if the bid request is invalid', function () {
      const invalidBid = { bidder: 'adspirit', params: {} };
      const result = spec.isBidRequestValid(invalidBid);
      expect(result).to.be.false;
    });
  });

  // getBidderHost Case
  describe('getBidderHost', function () {
    it('should return host for adspirit bidder', function () {
      const bid = { bidder: 'adspirit', params: { host: 'test.adspirit.de' } };
      const result = spec.getBidderHost(bid);
      expect(result).to.equal('test.adspirit.de');
    });

    it('should return host for twiago bidder', function () {
      const bid = { bidder: 'twiago' };
      const result = spec.getBidderHost(bid);
      expect(result).to.equal('a.twiago.com');
    });
    it('should return null for unsupported bidder', function () {
      const bid = { bidder: 'unsupportedBidder', params: {} };
      const result = spec.getBidderHost(bid);
      expect(result).to.be.null;
    });
  });

  // Test cases for buildRequests
  describe('buildRequests', function () {
    const bidRequestWithGDPRAndSchain = [
      {
        id: '26c1ee0038ac11',
        bidder: 'adspirit',
        params: {
          placementId: '57'
        },
        schain: {
          ver: '1.0',
          nodes: [
            {
              asi: 'exchange1.com',
              sid: '1234',
              hp: 1,
              rid: 'bidRequest123',
              name: 'Publisher',
              domain: 'publisher.com'
            },
            {
              asi: 'network1.com',
              sid: '5678',
              hp: 1,
              rid: 'bidderRequest123',
              name: 'Network',
              domain: 'network1.com'
            }
          ]
        }
      }
    ];

    const mockBidderRequestWithGDPR = {
      refererInfo: {
        topmostLocation: 'test.adspirit.de'
      },
      gdprConsent: {
        gdprApplies: true,
        consentString: 'consentString'
      },
      schain: {
        ver: '1.0',
        nodes: [
          {
            asi: 'network1.com',
            sid: '5678',
            hp: 1,
            rid: 'bidderRequest123',
            name: 'Network',
            domain: 'network1.com'
          }
        ]
      }
    };

    it('should construct valid bid requests with GDPR consent and schain', function () {
      const requests = spec.buildRequests(bidRequestWithGDPRAndSchain, mockBidderRequestWithGDPR);
      expect(requests).to.be.an('array').that.is.not.empty;
      const request = requests[0];
      expect(request.method).to.equal('GET');
      expect(request.url).to.include('test.adspirit.de');
      expect(request.url).to.include('pid=57');
      expect(request.data).to.have.property('schain');
      expect(request.data.schain).to.be.an('object');
      if (request.data.schain && Array.isArray(request.data.schain.nodes)) {
        const nodeWithGdpr = request.data.schain.nodes.find(node => node.gdpr);
        if (nodeWithGdpr) {
          expect(nodeWithGdpr).to.have.property('gdpr');
          expect(nodeWithGdpr.gdpr).to.be.an('object');
          expect(nodeWithGdpr.gdpr).to.have.property('applies', true);
          expect(nodeWithGdpr.gdpr).to.have.property('consent', 'consentString');
        }
      }
    });

    it('should construct valid bid requests without GDPR consent and schain', function () {
      const bidRequestWithoutGDPR = [
        {
          id: '26c1ee0038ac11',
          bidder: 'adspirit',
          params: {
            placementId: '57'
          }
        }
      ];

      const mockBidderRequestWithoutGDPR = {
        refererInfo: {
          topmostLocation: 'test.adspirit.de'
        }
      };

      const requests = spec.buildRequests(bidRequestWithoutGDPR, mockBidderRequestWithoutGDPR);
      expect(requests).to.be.an('array').that.is.not.empty;
      const request = requests[0];
      expect(request.method).to.equal('GET');
      expect(request.url).to.include('test.adspirit.de');
      expect(request.url).to.include('pid=57');
      expect(request.data).to.deep.equal({});
    });
  });

  // interpretResponse For Native
  describe('interpretResponse', function () {
    const nativeBidRequestMock = {
      bidRequest: {
        bidId: '123456',
        params: {
          placementId: '57',
          adomain: ['test.adspirit.de']
        },
        mediaTypes: {
          native: true
        }
      }
    };

    it('should handle native media type bids and missing cpm in the server response body', function () {
      const serverResponse = {
        body: {
          w: 320,
          h: 50,
          title: 'Ad Title',
          body: 'Ad Body',
          cta: 'Click Here',
          image: 'img_url',
          click: 'click_url',
          view: 'view_tracker_url'
        }
      };

      const result = spec.interpretResponse(serverResponse, nativeBidRequestMock);
      expect(result.length).to.equal(0);
    });

    it('should handle native media type bids', function () {
      const serverResponse = {
        body: {
          cpm: 1.0,
          w: 320,
          h: 50,
          title: 'Ad Title',
          body: 'Ad Body',
          cta: 'Click Here',
          image: 'img_url',
          click: 'click_url',
          view: 'view_tracker_url'
        }
      };

      const result = spec.interpretResponse(serverResponse, nativeBidRequestMock);
      expect(result.length).to.equal(1);
      const bid = result[0];
      expect(bid).to.include({
        requestId: '123456',
        cpm: 1.0,
        width: 320,
        height: 50,
        creativeId: '57',
        currency: 'EUR',
        netRevenue: true,
        ttl: 300,
        mediaType: 'native'
      });
      expect(bid.native).to.deep.include({
        title: 'Ad Title',
        body: 'Ad Body',
        cta: 'Click Here',
        image: { url: 'img_url' },
        clickUrl: 'click_url',
        impressionTrackers: ['view_tracker_url']
      });
    });

    const bannerBidRequestMock = {
      bidRequest: {
        bidId: '123456',
        params: {
          placementId: '57',
          adomain: ['siva.adspirit.de']
        },
        mediaTypes: {
          banner: true
        }
      }
    };

    // Test cases for various scenarios
    it('should return empty array when serverResponse is missing', function () {
      const result = spec.interpretResponse(null, { bidRequest: {} });
      expect(result).to.be.an('array').that.is.empty;
    });

    it('should return empty array when serverResponse.body is missing', function () {
      const result = spec.interpretResponse({}, { bidRequest: {} });
      expect(result).to.be.an('array').that.is.empty;
    });

    it('should return empty array when bidObj is missing', function () {
      const result = spec.interpretResponse({ body: { cpm: 1.0 } }, { bidRequest: null });
      expect(result).to.be.an('array').that.is.empty;
    });

    it('should return empty array when all required parameters are missing', function () {
      const result = spec.interpretResponse(null, { bidRequest: null });
      expect(result).to.be.an('array').that.is.empty;
    });

    it('should handle banner media type bids and missing cpm in the server response body', function () {
      const serverResponseBanner = {
        body: {
          w: 728,
          h: 90,
          adm: '<div>Ad Content</div>'
        }
      };
      const result = spec.interpretResponse(serverResponseBanner, bannerBidRequestMock);
      expect(result.length).to.equal(0);
    });

    it('should handle banner media type bids', function () {
      const serverResponse = {
        body: {
          cpm: 2.0,
          w: 728,
          h: 90,
          adm: '<div>Ad Content</div>'
        }
      };
      const result = spec.interpretResponse(serverResponse, bannerBidRequestMock);
      expect(result.length).to.equal(1);
      const bid = result[0];
      expect(bid).to.include({
        requestId: '123456',
        cpm: 2.0,
        width: 728,
        height: 90,
        creativeId: '57',
        currency: 'EUR',
        netRevenue: true,
        ttl: 300,
        mediaType: 'banner'
      });
      expect(bid.ad).to.equal('<script>window.inDapIF=false</script><script src="//null/adasync.min.js"></script><ins id="undefined"></ins><div>Ad Content</div>');
    });
  });
});
