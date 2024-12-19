import { expect } from 'chai';
import { spec, storage } from 'modules/blueBidAdapter.js';

describe('blue Adapter', function () {
  describe('isBidRequestValid', function () {
    const validBid = {
      bidder: 'blue',
      params: {
        bidFloor: 0.05,
        currency: 'USD',
        placementId: 13144370,
        publisherId: 13144370,
      },
    };

    const invalidBid = {
      bidder: 'blue',
      params: {
        bidFloor: 0.05,
        currency: 'USD',
      },
    };

    it('should return true for valid bid', function () {
      expect(spec.isBidRequestValid(validBid)).to.equal(true);
    });

    it('should return false for invalid bid', function () {
      expect(spec.isBidRequestValid(invalidBid)).to.equal(false);
    });
  });

  describe('buildRequests', function () {
    const bidRequest = {
      bidder: 'blue',
      params: {
        bidFloor: 0.05,
        currency: 'USD',
        placementId: 13144370,
        publisherId: 13144370,
      },
      adUnitCode: 'div-gpt-ad-1460505748561-0',
      sizes: [[300, 250]],
    };

    const bidderRequest = {
      refererInfo: {
        referer: 'https://example.com',
      },
    };

    it('should include cookie ID if available', function () {
      const cookieStub = sinon.stub(storage, 'getCookie').returns('test-cookie-id');
      const request = spec.buildRequests([bidRequest], bidderRequest);
      const payload = request.data;

      expect(payload.user.ext.buyerid).to.equal('test-cookie-id');
      cookieStub.restore();
    });
  });

  describe('Additional Tests', function () {
    it('should support banner media type', function () {
      expect(spec.supportedMediaTypes).to.include('banner');
    });
  });
});
