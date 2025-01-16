import { expect } from 'chai';
import { spec } from 'modules/dasBidAdapter.js';
import { newBidder } from 'src/adapters/bidderFactory.js';

describe('dasBidAdapter', function () {
  const adapter = newBidder(spec);

  describe('inherited functions', function () {
    it('exists and is a function', function () {
      expect(adapter.callBids).to.exist.and.to.be.a('function');
    });
  });

  describe('isBidRequestValid', function () {
    // Istniejące testy
    const validBid = {
      params: {
        site: 'site1',
        area: 'area1',
        slot: 'slot1',
        network: 'network1'
      }
    };

    it('should return true when required params are present', function () {
      expect(spec.isBidRequestValid(validBid)).to.be.true;
    });

    it('should return false when required params are missing', function () {
      expect(spec.isBidRequestValid({})).to.be.false;
      expect(spec.isBidRequestValid({ params: {} })).to.be.false;
      expect(spec.isBidRequestValid({ params: { site: 'site1' } })).to.be.false;
      expect(spec.isBidRequestValid({ params: { area: 'area1' } })).to.be.false;
      expect(spec.isBidRequestValid({ params: { slot: 'slot1' } })).to.be.false;
    });

    // Nowe testy
    it('should return true with additional optional params', function () {
      const bidWithOptional = {
        params: {
          site: 'site1',
          area: 'area1',
          slot: 'slot1',
          network: 'network1',
          customParams: {
            param1: 'value1'
          },
          pageContext: {
            du: 'https://example.com',
            dr: 'https://referrer.com',
            dv: '1.0',
            keyWords: ['key1', 'key2'],
            capping: 'cap1',
            keyValues: {
              key1: 'value1'
            }
          }
        }
      };
      expect(spec.isBidRequestValid(bidWithOptional)).to.be.true;
    });

    it('should return false when params is undefined', function () {
      expect(spec.isBidRequestValid()).to.be.false;
    });

    it('should return false when required params are empty strings', function () {
      const bidWithEmptyStrings = {
        params: {
          site: '',
          area: '',
          slot: ''
        }
      };
      expect(spec.isBidRequestValid(bidWithEmptyStrings)).to.be.false;
    });

    it('should return false when required params are non-string values', function () {
      const bidWithNonStringValues = {
        params: {
          site: 123,
          area: true,
          slot: {}
        }
      };
      expect(spec.isBidRequestValid(bidWithNonStringValues)).to.be.false;
    });

    it('should return false when params is null', function () {
      const bidWithNullParams = {
        params: null
      };
      expect(spec.isBidRequestValid(bidWithNullParams)).to.be.false;
    });

    it('should return true with minimal valid params', function () {
      const minimalBid = {
        params: {
          site: 'site1',
          area: 'area1',
          slot: 'slot1',
          network: 'network1'
        }
      };
      expect(spec.isBidRequestValid(minimalBid)).to.be.true;
    });

    it('should return false with partial required params', function () {
      const partialBids = [
        { params: { site: 'site1', area: 'area1' } },
        { params: { site: 'site1', slot: 'slot1' } },
        { params: { area: 'area1', slot: 'slot1' } }
      ];

      partialBids.forEach(bid => {
        expect(spec.isBidRequestValid(bid)).to.be.false;
      });
    });
  });

  describe('buildRequests', function () {
    const bidRequests = [{
      bidId: 'bid123',
      params: {
        site: 'site1',
        area: 'area1',
        slot: 'slot1',
        network: 'network1',
        pageContext: {
          du: 'https://example.com',
          dr: 'https://referrer.com',
          dv: '1.0',
          keyWords: ['key1', 'key2'],
          capping: 'cap1',
          keyValues: { key1: 'value1' }
        }
      },
      mediaTypes: {
        banner: {
          sizes: [[300, 250]]
        }
      }
    }];

    const bidderRequest = {
      bidderRequestId: 'reqId123',
      timeout: 1000,
      refererInfo: {
        page: 'https://example.com',
        ref: 'https://referrer.com'
      },
      gdprConsent: {
        consentString: 'consent123',
        gdprApplies: true
      },
      ortb2: {
        site: {}
      }
    };

    it('should return proper request object', function () {
      const request = spec.buildRequests(bidRequests, bidderRequest);

      expect(request.method).to.equal('POST');
      expect(request.url).to.equal('https://csr.onet.pl/network1/bid');
      expect(request.options.withCredentials).to.be.true;
      expect(request.options.crossOrigin).to.be.true;

      const payload = request.data;
      expect(payload.id).to.equal('reqId123');
      expect(payload.imp[0].id).to.equal('bid123');
      expect(payload.imp[0].tagid).to.equal('slot1');
      expect(payload.imp[0].banner.format[0]).to.deep.equal({ w: 300, h: 250 });
    });
  });

  describe('interpretResponse', function () {
    const serverResponse = {
      body: {
        seatbid: [{
          bid: [{
            impid: 'bid123',
            price: 3.5,
            w: 300,
            h: 250,
            adm: '<creative>',
            crid: 'crid123',
            mtype: 1,
            adomain: ['advertiser.com']
          }]
        }],
        cur: 'USD'
      }
    };

    it('should return proper bid response', function () {
      const bidResponses = spec.interpretResponse(serverResponse);

      expect(bidResponses).to.be.an('array').with.lengthOf(1);
      expect(bidResponses[0]).to.deep.include({
        requestId: 'bid123',
        cpm: 3.5,
        currency: 'USD',
        width: 300,
        height: 250,
        ad: '<creative>',
        creativeId: 'crid123',
        netRevenue: true,
        ttl: 300,
        mediaType: 'banner'
      });
      expect(bidResponses[0].meta.advertiserDomains).to.deep.equal(['advertiser.com']);
    });

    it('should return empty array when no valid responses', function () {
      expect(spec.interpretResponse({ body: null })).to.be.an('array').that.is.empty;
      expect(spec.interpretResponse({ body: {} })).to.be.an('array').that.is.empty;
      expect(spec.interpretResponse({ body: { seatbid: [] } })).to.be.an('array').that.is.empty;
    });
  });
});
