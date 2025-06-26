import { expect } from 'chai';
import { spec } from '../../../modules/epom_dspBidAdapter.js';

const VALID_BID_REQUEST = {
  bidder: 'epom_dsp',
  params: {
    endpoint: 'https://bidder.epommarket.com/bidder/v2_5/bid?key=d0b9fb9de9dfbba694dfe75294d8e45a'
  },
  adUnitCode: 'ad-unit-1',
  sizes: [[300, 250]],
  bidId: '12345',
  mediaTypes: {
    banner: {
      sizes: [[300, 250]]
    }
  },
  imp: [
    {
      id: 'imp1',
      banner: {}
    }
  ]
};

const BIDDER_REQUEST = {
  refererInfo: { referer: 'https://example.com' },
  gdprConsent: { consentString: 'consent_string' },
  uspConsent: 'usp_string'
};

describe('epomDspBidAdapter', function () {
  describe('isBidRequestValid', () => {
    it('should validate a correct bid request', function () {
      expect(spec.isBidRequestValid(VALID_BID_REQUEST)).to.be.true;
    });

    it('should reject a bid request with missing endpoint', function () {
      const invalidBid = { ...VALID_BID_REQUEST, params: { endpoint: '' } };
      expect(spec.isBidRequestValid(invalidBid)).to.be.false;
    });

    it('should reject a bid request with an invalid endpoint', function () {
      const invalidBid = { ...VALID_BID_REQUEST, params: { endpoint: 'ftp://invalid.com' } };
      expect(spec.isBidRequestValid(invalidBid)).to.be.false;
    });
  });

  describe('buildRequests', () => {
    it('should build requests properly', function () {
      const requests = spec.buildRequests([VALID_BID_REQUEST], BIDDER_REQUEST);
      expect(requests).to.have.length(1);
      const req = requests[0];
      expect(req).to.include.keys(['method', 'url', 'data', 'options']);
      expect(req.method).to.equal('POST');
      expect(req.url).to.equal(VALID_BID_REQUEST.params.endpoint);
      expect(req.data).to.include.keys(['referer', 'gdprConsent', 'uspConsent', 'imp']);
      expect(req.options).to.deep.equal({
        contentType: 'application/json',
        withCredentials: false
      });
    });
  });

  describe('interpretResponse', () => {
    it('should interpret a valid response with bids', function () {
      const SERVER_RESPONSE = {
        body: {
          cur: 'USD',
          seatbid: [{
            bid: [{
              impid: '12345',
              price: 1.23,
              adm: '<div>Ad</div>',
              nurl: 'https://example.com/nurl',
              w: 300,
              h: 250,
              crid: 'abcd1234',
              adomain: ['advertiser.com']
            }]
          }]
        }
      };

      const REQUEST = {
        data: {
          bidId: '12345'
        }
      };

      const result = spec.interpretResponse(SERVER_RESPONSE, REQUEST);
      expect(result).to.have.length(1);
      const bid = result[0];

      expect(bid).to.include({
        requestId: '12345',
        cpm: 1.23,
        currency: 'USD',
        width: 300,
        height: 250,
        ad: '<div>Ad</div>',
        creativeId: 'abcd1234',
        ttl: 300,
        netRevenue: true
      });
      expect(bid.meta.advertiserDomains).to.deep.equal(['advertiser.com']);
    });

    it('should return empty array if adm is missing', function () {
      const SERVER_RESPONSE = {
        body: {
          seatbid: [{
            bid: [{
              impid: '12345',
              price: 1.23,
              nurl: 'https://example.com/nurl',
              w: 300,
              h: 250,
              crid: 'abcd1234'
              // adm is missing
            }]
          }]
        }
      };

      const result = spec.interpretResponse(SERVER_RESPONSE, { data: { bidId: '12345' } });
      expect(result).to.be.an('array').that.is.empty;
    });

    it('should return empty array for empty response', function () {
      const result = spec.interpretResponse({ body: {} }, {});
      expect(result).to.be.an('array').that.is.empty;
    });
  });

  describe('getUserSyncs', () => {
    it('should return iframe sync if available and iframeEnabled', function () {
      const syncOptions = { iframeEnabled: true };
      const serverResponses = [{
        body: {
          userSync: {
            iframe: 'https://sync.com/iframe'
          }
        }
      }];
      const syncs = spec.getUserSyncs(syncOptions, serverResponses);
      expect(syncs).to.deep.equal([{
        type: 'iframe',
        url: 'https://sync.com/iframe'
      }]);
    });

    it('should return pixel sync if available and pixelEnabled', function () {
      const syncOptions = { pixelEnabled: true };
      const serverResponses = [{
        body: {
          userSync: {
            pixel: 'https://sync.com/pixel'
          }
        }
      }];
      const syncs = spec.getUserSyncs(syncOptions, serverResponses);
      expect(syncs).to.deep.equal([{
        type: 'image',
        url: 'https://sync.com/pixel'
      }]);
    });

    it('should return empty array if no syncs available', function () {
      const syncs = spec.getUserSyncs({ iframeEnabled: true, pixelEnabled: true }, []);
      expect(syncs).to.be.an('array').that.is.empty;
    });
  });
});
