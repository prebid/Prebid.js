// tests/luponmediaBidAdapter_spec.js
import { resetUserSync, spec, converter, storage } from 'modules/luponmediaBidAdapter.js';
import sinon from 'sinon';
import { expect } from 'chai';

describe('luponmediaBidAdapter', function () {
  let sandbox;

  beforeEach(function () {
    sandbox = sinon.createSandbox();
  });

  afterEach(function () {
    sandbox.restore();
  });

  describe('isBidRequestValid', function () {
    const bid = {
      bidder: 'luponmedia',
      params: { keyId: 'uid@eu_test_300_600' },
      adUnitCode: 'test-div',
      sizes: [[300, 250]],
      bidId: 'g1987234bjkads'
    };

    it('should return true when required param is found and it is valid', function () {
      expect(spec.isBidRequestValid(bid)).to.be.true;
    });

    it('should return true with required and without optional param', function () {
      bid.params = { keyId: 'uid_test_300_600' };
      expect(spec.isBidRequestValid(bid)).to.be.true;
    });

    it('should return false when keyId is not in the required format', function () {
      bid.params = { keyId: 12345 };
      expect(spec.isBidRequestValid(bid)).to.be.false;
    });
  });

  describe('buildRequests', function () {
    const bidRequests = [
      {
        bidder: 'luponmedia',
        params: { keyId: 'uid_test_300_600', placement_id: 'test-div' },
        mediaTypes: { banner: { sizes: [[300, 600]] } },
        adUnitCode: 'test-div',
        transactionId: 'txn-id',
        bidId: 'bid-id',
        ortb2: { device: { ua: 'test-agent' } }
      }
    ];

    const bidderRequest = { bidderCode: 'luponmedia' };

    it('sends bid request to default endpoint', function () {
      const req = spec.buildRequests(bidRequests, bidderRequest);
      expect(req.url).to.include('https://rtb.adxpremium.services/openrtb2/auction');
      expect(req.method).to.equal('POST');
      expect(req.data.imp[0].ext.luponmedia.placement_id).to.equal('test-div');
      expect(req.data.imp[0].ext.luponmedia.keyId).to.equal('uid_test_300_600');
    });

    it('sends bid request to endpoint specified in keyId', function () {
      bidRequests[0].params.keyId = 'uid@eu_test_300_600';
      const req = spec.buildRequests(bidRequests, bidderRequest);
      expect(req.url).to.include('https://eu.adxpremium.services/openrtb2/auction');
    });
  });

  describe('interpretResponse', function () {
    it('should get correct banner bid response', function () {
      const response = {
        id: 'resp-id',
        seatbid: [
          {
            bid: [
              {
                id: 'bid123',
                impid: 'bid123',
                price: 0.43,
                adm: '<div>Ad Markup</div>',
                crid: 'creative-id',
                w: 300,
                h: 250,
                ext: {
                  prebid: {
                    targeting: {
                      hb_bidder: 'luponmedia',
                      hb_pb: '0.40',
                      hb_size: '300x250'
                    },
                    type: 'banner'
                  }
                }
              }
            ],
            seat: 'luponmedia'
          }
        ],
        cur: 'USD'
      };

      const bidRequests = [
        {
          bidId: 'bid123',
          adUnitCode: 'test-div',
          params: { keyId: 'uid_test_300_600' },
          mediaTypes: { banner: { sizes: [[300, 250]] } }
        }
      ];

      const bidderRequest = { refererInfo: { referer: 'https://example.com' } };
      const ortbRequest = converter.toORTB({ bidRequests, bidderRequest });

      const result = spec.interpretResponse({ status: 200, body: response }, { data: ortbRequest });

      expect(result).to.be.an('array').with.lengthOf(1);
      expect(result[0]).to.include({
        requestId: 'bid123',
        cpm: 0.43,
        width: 300,
        height: 250,
        creativeId: 'creative-id',
        currency: 'USD',
        ttl: 300,
        ad: '<div>Ad Markup</div>'
      });
    });

    it('should enrich bidResponse with crid, dealId, and referrer if missing', function () {
      const response = {
        id: 'resp-id',
        seatbid: [
          {
            bid: [
              {
                id: 'bid456',
                impid: 'bid456',
                price: 0.75,
                adm: '<div>Creative</div>',
                crid: 'creative456',
                dealid: 'deal789',
                w: 300,
                h: 250
              }
            ],
            seat: 'luponmedia'
          }
        ],
        cur: 'USD'
      };
    
      const bidRequests = [
        {
          bidId: 'bid456',
          adUnitCode: 'test-div',
          params: { keyId: 'uid_test_300_600' },
          mediaTypes: { banner: { sizes: [[300, 250]] } },
          ortb2: {
            site: {
              ref: 'https://mysite.com'
            }
          }
        }
      ];
    
      const bidderRequest = {
        refererInfo: { referer: 'https://mysite.com' }
      };
    
      const ortbRequest = converter.toORTB({ bidRequests, bidderRequest });
    
      const result = spec.interpretResponse({ status: 200, body: response }, { data: ortbRequest });
    
      expect(result[0].creativeId).to.equal('creative456');
      expect(result[0].dealId).to.equal('deal789');
      expect(result[0].referrer).to.equal('https://mysite.com');
    });    
    
    it('handles nobid responses', function () {
      const response = { status: 204, body: {} };
      const result = spec.interpretResponse(response, { data: {} });
      expect(result).to.deep.equal([]);
    });

    it('should handle 206 status properly and return localStorage fallback bid', function () {
      const now = Date.now();
      const fallbackBid = {
        requestId: 'fallback123',
        cpm: 0.07,
        width: 300,
        height: 250,
        ad: '<div>Fallback Ad</div>',
        ttl: 300,
        currency: 'USD',
        creativeId: 'fallbackCreative',
        timestamp: now - 10000,
        mediaType: 'banner',
        meta: { advertiserDomains: ['fdj.fr'] }
      };

      sandbox.stub(storage, 'localStorageIsEnabled').returns(true);
      sandbox.stub(storage, 'getDataFromLocalStorage')
        .withArgs('dabStore')
        .returns(JSON.stringify({ bids: [fallbackBid] }));

      const bidRequests = [
        {
          bidId: 'fallback123',
          adUnitCode: 'test-div',
          params: { keyId: 'uid_test_300_600' },
          mediaTypes: { banner: { sizes: [[300, 250]] } }
        }
      ];

      const bidderRequest = { refererInfo: { referer: 'https://example.com' } };
      const ortbRequest = converter.toORTB({ bidRequests, bidderRequest });

      const result = spec.interpretResponse({ status: 206 }, { data: ortbRequest });

      expect(result).to.be.an('array').with.lengthOf(1);
      expect(result[0].requestId).to.equal('fallback123');
      expect(result[0].cpm).to.equal(0.07);
      expect(result[0].currency).to.equal('USD');
      expect(result[0].creativeId).to.equal('fallbackCreative');
      expect(result[0].ad).to.contain('Fallback Ad');
    });

    it('should ignore expired fallback bids from localStorage', function () {
      const oldTimestamp = Date.now() - 1000 * 1000; // way expired
      const expiredBid = {
        requestId: 'expiredBid',
        cpm: 0.05,
        width: 300,
        height: 250,
        ad: '<div>Expired Ad</div>',
        ttl: 300,
        currency: 'USD',
        creativeId: 'expiredCreative',
        timestamp: oldTimestamp,
        mediaType: 'banner',
        meta: { advertiserDomains: ['expired.com'] }
      };

      sandbox.stub(storage, 'localStorageIsEnabled').returns(true);
      sandbox.stub(storage, 'getDataFromLocalStorage')
        .withArgs('dabStore')
        .returns(JSON.stringify({ bids: [expiredBid] }));

      const bidRequests = [
        {
          bidId: 'expiredBid',
          adUnitCode: 'test-div',
          params: { keyId: 'uid_test_300_600' },
          mediaTypes: { banner: { sizes: [[300, 250]] } }
        }
      ];

      const bidderRequest = { refererInfo: { referer: 'https://example.com' } };
      const ortbRequest = converter.toORTB({ bidRequests, bidderRequest });

      const result = spec.interpretResponse({ status: 206 }, { data: ortbRequest });

      expect(result).to.deep.equal([]);
    });

    it('should return empty array when store does not exists or consent', function () {
      sandbox.stub(storage, 'localStorageIsEnabled').returns(true);
      sandbox.stub(storage, 'getDataFromLocalStorage')
        .withArgs('dabStore')
        .returns(null);

      const bidRequests = [
        {
          bidId: 'expiredBid',
          adUnitCode: 'test-div',
          params: { keyId: 'uid_test_300_600' },
          mediaTypes: { banner: { sizes: [[300, 250]] } }
        }
      ];

      const bidderRequest = { refererInfo: { referer: 'https://example.com' } };
      const ortbRequest = converter.toORTB({ bidRequests, bidderRequest });

      const result = spec.interpretResponse({ status: 206 }, { data: ortbRequest });

      expect(result).to.deep.equal([]);
    });

    it('should return empty array when store is empty', function () {
      sandbox.stub(storage, 'localStorageIsEnabled').returns(true);
      sandbox.stub(storage, 'getDataFromLocalStorage')
        .withArgs('dabStore')
        .returns(JSON.stringify([]));

      const bidRequests = [
        {
          bidId: 'expiredBid',
          adUnitCode: 'test-div',
          params: { keyId: 'uid_test_300_600' },
          mediaTypes: { banner: { sizes: [[300, 250]] } }
        }
      ];

      const bidderRequest = { refererInfo: { referer: 'https://example.com' } };
      const ortbRequest = converter.toORTB({ bidRequests, bidderRequest });

      const result = spec.interpretResponse({ status: 206 }, { data: ortbRequest });

      expect(result).to.deep.equal([]);
    });

    it('should return empty array for unhandled response', function () {
      const bidRequests = [
        {
          bidId: 'expiredBid',
          adUnitCode: 'test-div',
          params: { keyId: 'uid_test_300_600' },
          mediaTypes: { banner: { sizes: [[300, 250]] } }
        }
      ];

      const bidderRequest = { refererInfo: { referer: 'https://example.com' } };
      const ortbRequest = converter.toORTB({ bidRequests, bidderRequest });

      const result = spec.interpretResponse({ status: 400 }, { data: ortbRequest });

      expect(result).to.deep.equal([]);
    });
  });

  describe('getUserSyncs', function () {
    const bidResponse = {
      body: {
        ext: {
          usersyncs: {
            bidder_status: [
              {
                no_cookie: true,
                usersync: { url: 'https://sync.img', type: 'image' }
              },
              {
                no_cookie: true,
                usersync: { url: 'https://sync.iframe', type: 'iframe' }
              }
            ]
          }
        }
      }
    };

    it('should return empty syncs when not pixel or iframe enabled', function () {
      resetUserSync();
      const syncs = spec.getUserSyncs({ pixelEnabled: false, iframeEnabled: false }, [bidResponse]);
      expect(syncs.length).to.equal(0);
    });

    it('returns pixel syncs when pixel enabled and iframe not enabled', function () {
      resetUserSync();
      const syncs = spec.getUserSyncs({ pixelEnabled: true, iframeEnabled: false }, [bidResponse]);
      expect(syncs).to.deep.include({ type: 'image', url: 'https://sync.img' });
    });

    it('returns iframe syncs when iframe enabled and pixel not enabled', function () {
      resetUserSync();
      const syncs = spec.getUserSyncs({ pixelEnabled: false, iframeEnabled: true }, [bidResponse]);
      expect(syncs).to.deep.include({ type: 'iframe', url: 'https://sync.iframe' });
    });

    it('returns both syncs when both iframe and pixel enabled', function () {
      resetUserSync();
      const syncs = spec.getUserSyncs({ pixelEnabled: true, iframeEnabled: true }, [bidResponse]);
      expect(syncs).to.deep.include.members([
        { type: 'image', url: 'https://sync.img' },
        { type: 'iframe', url: 'https://sync.iframe' }
      ]);
    });

    it('returns no syncs when usersyncs object missing', function () {
      const emptyResponse = { body: { ext: {} } };
      const syncs = spec.getUserSyncs({ pixelEnabled: true, iframeEnabled: true }, [emptyResponse]);
      expect(syncs).to.deep.equal([]);
    });

    it('returns empty syncs on empty response array', function () {
      const syncs = spec.getUserSyncs({ pixelEnabled: true, iframeEnabled: true }, []);
      expect(syncs).to.deep.equal([]);
    });
  });
});
