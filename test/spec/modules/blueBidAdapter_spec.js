import { expect } from 'chai';
import sinon from 'sinon';
import { spec, storage } from 'modules/blueBidAdapter.js';

const BIDDER_CODE = 'blue';
const ENDPOINT_URL = 'https://bidder-us-east-1.getblue.io/engine/?src=prebid';
const GVLID = 620;
const COOKIE_NAME = 'ckid';
const CURRENCY = 'USD';

describe('blueBidAdapter:', function () {
  let sandbox;

  beforeEach(function () {
    sandbox = sinon.createSandbox();
  });

  afterEach(function () {
    sandbox.restore();
  });

  describe('isBidRequestValid:', function () {
    it('should return true for valid bid requests', function () {
      const validBid = {
        params: {
          placementId: '12345',
          publisherId: '67890',
        },
      };
      expect(spec.isBidRequestValid(validBid)).to.be.true;
    });

    it('should return false for invalid bid requests', function () {
      const invalidBid = {
        params: {
          placementId: '12345',
        },
      };
      expect(spec.isBidRequestValid(invalidBid)).to.be.false;
    });
  });

  describe('buildRequests:', function () {
    let validBidRequests;
    let bidderRequest;

    beforeEach(function () {
      validBidRequests = [
        {
          bidId: 'bid1',
          params: {
            placementId: '12345',
            publisherId: '67890',
          },
          getFloor: () => ({ currency: CURRENCY, floor: 1.5 }),
        },
      ];

      bidderRequest = {
        refererInfo: {
          page: 'https://example.com',
        },
      };

      sandbox.stub(storage, 'getDataFromLocalStorage').returns('testBuyerId');
    });

    it('should build a valid OpenRTB request', function () {
      const request = spec.buildRequests(validBidRequests, bidderRequest);

      expect(request.method).to.equal('POST');
      expect(request.url).to.equal(ENDPOINT_URL);
      expect(request.options.contentType).to.equal('text/plain');

      const ortbRequest = JSON.parse(request.data);
      expect(ortbRequest.ext.gvlid).to.equal(GVLID);
      expect(ortbRequest.user.ext.buyerid).to.equal('testBuyerId');
      expect(ortbRequest.imp[0].bidfloor).to.equal(1.5);
      expect(ortbRequest.imp[0].bidfloorcur).to.equal(CURRENCY);
    });

    it('should omit bidfloor if getFloor is not implemented', function () {
      validBidRequests[0].getFloor = undefined;

      const request = spec.buildRequests(validBidRequests, bidderRequest);
      const ortbRequest = JSON.parse(request.data);

      expect(ortbRequest.imp[0].bidfloor).to.be.undefined;
    });
  });
});
