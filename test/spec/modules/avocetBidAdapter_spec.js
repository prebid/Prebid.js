import { expect } from 'chai';
import { spec } from 'modules/avocetBidAdapter';
import { newBidder } from 'src/adapters/bidderFactory';
import { config } from 'src/config';

describe('Avocet adapter', function () {
  beforeEach(function () {
    config.setConfig({
      currency: {
        adServerCurrency: 'USD',
      },
      publisherDomain: 'test.com',
      fpd: {
        some: 'data',
      },
    });
  });

  afterEach(function () {
    config.resetConfig();
  });

  describe('inherited functions', function () {
    it('exists and is a function', function () {
      const adapter = newBidder(spec);
      expect(adapter.callBids).to.exist.and.to.be.a('function');
    });
  });

  describe('isBidRequestValid', function () {
    it('should return false for bid request missing params', () => {
      const invalidBidRequest = {
        bid: {},
      };
      expect(spec.isBidRequestValid(invalidBidRequest)).to.equal(false);
    });
    it('should return false for an invalid type placement param', () => {
      const invalidBidRequest = {
        params: {
          placement: 123,
        },
      };
      expect(spec.isBidRequestValid(invalidBidRequest)).to.equal(false);
    });
    it('should return false for an invalid length placement param', () => {
      const invalidBidRequest = {
        params: {
          placement: '123',
        },
      };
      expect(spec.isBidRequestValid(invalidBidRequest)).to.equal(false);
    });
    it('should return true for a valid length placement param', () => {
      const validBidRequest = {
        params: {
          placement: '012345678901234567890123',
        },
      };
      expect(spec.isBidRequestValid(validBidRequest)).to.equal(true);
    });
  });
  describe('buildRequests', function () {
    it('constructs a valid POST request', function () {
      const request = spec.buildRequests(
        [
          {
            bidder: 'avct',
            params: {
              placement: '012345678901234567890123',
            },
            userId: {
              id5id: 'test'
            }
          },
          {
            bidder: 'avct',
            params: {
              placement: '012345678901234567890123',
            },
          },
        ],
        exampleBidderRequest
      );
      expect(request.method).to.equal('POST');
      expect(request.url).to.equal('https://ads.avct.cloud/prebid');

      const requestData = JSON.parse(request.data);
      expect(requestData.ext).to.be.an('object');
      expect(requestData.ext.currency).to.equal('USD');
      expect(requestData.ext.publisherDomain).to.equal('test.com');
      expect(requestData.ext.fpd).to.deep.equal({ some: 'data' });
      expect(requestData.ext.schain).to.deep.equal({
        validation: 'strict',
        config: {
          ver: '1.0',
          complete: 1,
          nodes: [
            {
              asi: 'indirectseller.com',
              sid: '00001',
              hp: 1,
            },
          ],
        },
      });
      expect(requestData.ext.id5id).to.equal('test');
      expect(requestData.bids).to.be.an('array');
      expect(requestData.bids.length).to.equal(2);
    });
  });
  describe('interpretResponse', function () {
    it('no response', function () {
      const response = spec.interpretResponse();
      expect(response).to.be.an('array');
      expect(response.length).to.equal(0);
    });
    it('no body', function () {
      const response = spec.interpretResponse({});
      expect(response).to.be.an('array');
      expect(response.length).to.equal(0);
    });
    it('null body', function () {
      const response = spec.interpretResponse({ body: null });
      expect(response).to.be.an('array');
      expect(response.length).to.equal(0);
    });
    it('empty body', function () {
      const response = spec.interpretResponse({ body: {} });
      expect(response).to.be.an('array');
      expect(response.length).to.equal(0);
    });
    it('null body.responses', function () {
      const response = spec.interpretResponse({ body: { responses: null } });
      expect(response).to.be.an('array');
      expect(response.length).to.equal(0);
    });
    it('array body', function () {
      const response = spec.interpretResponse({ body: [{}] });
      expect(response).to.be.an('array');
      expect(response.length).to.equal(1);
    });
    it('array body.responses', function () {
      const response = spec.interpretResponse({ body: { responses: [{}] } });
      expect(response).to.be.an('array');
      expect(response.length).to.equal(1);
    });
  });
});

const exampleBidderRequest = {
  schain: {
    validation: 'strict',
    config: {
      ver: '1.0',
      complete: 1,
      nodes: [
        {
          asi: 'indirectseller.com',
          sid: '00001',
          hp: 1,
        },
      ],
    },
  },
};
