import { expect} from 'chai';
import { spec } from 'modules/a4gBidAdapter';

describe('a4gAdapterTests', () => {
  describe('bidRequestValidity', () => {
    it('bidRequest with zoneId and deliveryUrl params', () => {
      expect(spec.isBidRequestValid({
        bidder: 'a4g',
        params: {
          zoneId: 59304,
          deliveryUrl: 'http://dev01.ad4game.com/v1/bid'
        }
      })).to.equal(true);
    });

    it('bidRequest with only zoneId', () => {
      expect(spec.isBidRequestValid({
        bidder: 'a4g',
        params: {
          zoneId: 59304
        }
      })).to.equal(true);
    });

    it('bidRequest with only deliveryUrl', () => {
      expect(spec.isBidRequestValid({
        bidder: 'a4g',
        params: {
          deliveryUrl: 'http://dev01.ad4game.com/v1/bid'
        }
      })).to.equal(false);
    });
  });

  describe('bidRequest', () => {
    const bidRequests = [{
      'bidder': 'a4g',
      'bidId': '51ef8751f9aead',
      'params': {
        'zoneId': 59304,
      },
      'adUnitCode': 'div-gpt-ad-1460505748561-0',
      'transactionId': 'd7b773de-ceaa-484d-89ca-d9f51b8d61ec',
      'sizes': [[320, 50], [300, 250], [300, 600]],
      'bidderRequestId': '418b37f85e772c',
      'auctionId': '18fd8b8b0bd757'
    }, {
      'bidder': 'a4g',
      'bidId': '51ef8751f9aead',
      'params': {
        'zoneId': 59354,
        'deliveryUrl': '//dev01.ad4game.com/v1/bid'
      },
      'adUnitCode': 'div-gpt-ad-1460505748561-0',
      'transactionId': 'd7b773de-ceaa-484d-89ca-d9f51b8d61ec',
      'sizes': [[320, 50], [300, 250], [300, 600]],
      'bidderRequestId': '418b37f85e772c',
      'auctionId': '18fd8b8b0bd757'
    }];

    it('bidRequest method', () => {
      const request = spec.buildRequests(bidRequests);
      expect(request.method).to.equal('GET');
    });

    it('bidRequest url', () => {
      const request = spec.buildRequests(bidRequests);
      expect(request.url).to.match(new RegExp(`${bidRequests[1].params.deliveryUrl}`));
    });

    it('bidRequest data', () => {
      const request = spec.buildRequests(bidRequests);
      expect(request.data).to.exists;
    });

    it('bidRequest zoneIds', () => {
      const request = spec.buildRequests(bidRequests);
      expect(request.data.zoneId).to.equal('59304;59354');
    });
  });

  describe('interpretResponse', () => {
    const bidRequest = [{
      'bidder': 'a4g',
      'bidId': '51ef8751f9aead',
      'params': {
        'zoneId': 59304,
      },
      'adUnitCode': 'div-gpt-ad-1460505748561-0',
      'transactionId': 'd7b773de-ceaa-484d-89ca-d9f51b8d61ec',
      'sizes': [[320, 50], [300, 250], [300, 600]],
      'bidderRequestId': '418b37f85e772c',
      'auctionId': '18fd8b8b0bd757'
    }];

    const bidResponse = {
      body: [{
        'id': 'div-gpt-ad-1460505748561-0',
        'ad': 'test ad',
        'width': 320,
        'height': 250,
        'cpm': 5.2
      }],
      headers: {}
    };

    it('required keys', () => {
      const result = spec.interpretResponse(bidResponse, bidRequest);

      let requiredKeys = [
        'requestId',
        'cpm',
        'width',
        'height',
        'ad',
        'ttl',
        'creativeId',
        'netRevenue',
        'currency'
      ];

      let resultKeys = Object.keys(result[0]);
      resultKeys.forEach(function(key) {
        expect(requiredKeys.indexOf(key) !== -1).to.equal(true);
      });
    })
  });
});
