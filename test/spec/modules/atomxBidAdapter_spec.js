import { expect } from 'chai';
import { spec } from 'modules/atomxBidAdapter.js';

describe('atomxAdapterTest', function () {
  describe('bidRequestValidity', function () {
    it('bidRequest with id param', function () {
      expect(spec.isBidRequestValid({
        bidder: 'atomx',
        params: {
          id: 1234,
        },
      })).to.equal(true);
    });

    it('bidRequest with no id param', function () {
      expect(spec.isBidRequestValid({
        bidder: 'atomx',
        params: {
        },
      })).to.equal(false);
    });
  });

  describe('bidRequest', function () {
    const bidRequests = [{
      'bidder': 'atomx',
      'params': {
        'id': '123'
      },
      'adUnitCode': 'aaa',
      'transactionId': '1b8389fe-615c-482d-9f1a-177fb8f7d5b0',
      'sizes': [300, 250],
      'bidId': '1abgs362e0x48a8',
      'bidderRequestId': '70deaff71c281d',
      'auctionId': '5c66da22-426a-4bac-b153-77360bef5337'
    },
    {
      'bidder': 'atomx',
      'params': {
        'id': '456',
      },
      'adUnitCode': 'bbb',
      'transactionId': '193995b4-7122-4739-959b-2463282a138b',
      'sizes': [[800, 600]],
      'bidId': '22aidtbx5eabd9',
      'bidderRequestId': '70deaff71c281d',
      'auctionId': 'e97cafd0-ebfc-4f5c-b7c9-baa0fd335a4a'
    }];

    it('bidRequest HTTP method', function () {
      const requests = spec.buildRequests(bidRequests);
      requests.forEach(function(requestItem) {
        expect(requestItem.method).to.equal('GET');
      });
    });

    it('bidRequest url', function () {
      const requests = spec.buildRequests(bidRequests);
      requests.forEach(function(requestItem) {
        expect(requestItem.url).to.match(new RegExp('p\\.ato\\.mx/placement'));
      });
    });

    it('bidRequest data', function () {
      const requests = spec.buildRequests(bidRequests);
      expect(requests[0].data.id).to.equal('123');
      expect(requests[0].data.size).to.equal('300x250');
      expect(requests[0].data.prebid).to.equal('1abgs362e0x48a8');
      expect(requests[1].data.id).to.equal('456');
      expect(requests[1].data.size).to.equal('800x600');
      expect(requests[1].data.prebid).to.equal('22aidtbx5eabd9');
    });
  });

  describe('interpretResponse', function () {
    const bidRequest = {
      'method': 'GET',
      'url': 'https://p.ato.mx/placement',
      'data': {
        'v': 12,
        'id': '123',
        'size': '300x250',
        'prebid': '22aidtbx5eabd9',
        'b': 0,
        'h': '7t3y9',
        'type': 'javascript',
        'screen': '800x600x32',
        'timezone': 0,
        'domain': 'https://example.com',
        'r': '',
      }
    };

    const bidResponse = {
      body: {
        'cpm': 0.00009,
        'width': 300,
        'height': 250,
        'url': 'https://atomx.com',
        'creative_id': 456,
        'code': '22aidtbx5eabd9',
      },
      headers: {}
    };

    it('result is correct', function () {
      const result = spec.interpretResponse(bidResponse, bidRequest);

      expect(result[0].requestId).to.equal('22aidtbx5eabd9');
      expect(result[0].cpm).to.equal(0.00009 * 1000);
      expect(result[0].width).to.equal(300);
      expect(result[0].height).to.equal(250);
      expect(result[0].creativeId).to.equal(456);
      expect(result[0].currency).to.equal('USD');
      expect(result[0].ttl).to.equal(60);
      expect(result[0].adUrl).to.equal('https://atomx.com');
    });
  });
});
