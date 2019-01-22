import { expect } from 'chai';
import { spec } from 'modules/timBidAdapter';

describe('timAdapterTests', function () {
  describe('bidRequestValidity', function () {
    it('bidRequest with publisherid and placementCode params', function () {
      expect(spec.isBidRequestValid({
        bidder: 'tim',
        params: {
          publisherid: 'testid',
          placementCode: 'testplacement'
        }
      })).to.equal(true);
    });

    it('bidRequest with only publisherid', function () {
      expect(spec.isBidRequestValid({
        bidder: 'tim',
        params: {
          publisherid: 'testid'
        }
      })).to.equal(false);
    });

    it('bidRequest with only placementCode', function () {
      expect(spec.isBidRequestValid({
        bidder: 'tim',
        params: {
          placementCode: 'testplacement'
        }
      })).to.equal(false);
    });

    it('bidRequest without params', function () {
      expect(spec.isBidRequestValid({
        bidder: 'tim',
      })).to.equal(false);
    });
  });

  describe('buildRequests', function () {
    const validBidRequests = [{
      'bidder': 'tim',
      'params': {'placementCode': 'header-bid-tag-0', 'publisherid': 'testpublisherid'},
      'mediaTypes': {'banner': {'sizes': [[300, 250]]}},
      'adUnitCode': '99',
      'transactionId': '6d2fd360-90fb-482d-aa57-2337b7873f48',
      'sizes': [[300, 250]],
      'bidId': '26351bb64298e3',
      'bidderRequestId': '1fee45c6e599eb',
      'auctionId': '4321e9f7-b4dc-4139-8e2d-ea932c31b46f',
      'src': 'client',
      'bidRequestsCount': 1
    }];

    it('bidRequest method', function () {
      const requests = spec.buildRequests(validBidRequests);
      expect(requests[0].method).to.equal('GET');
    });

    it('bidRequest url', function () {
      const requests = spec.buildRequests(validBidRequests);
      expect(requests[0].url).to.exists;
    });
  });
});
