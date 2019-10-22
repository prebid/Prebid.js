import { expect } from 'chai';
import { spec } from 'modules/innityBidAdapter';

describe('innityAdapterTest', function () {
  describe('bidRequestValidity', function () {
    it('bidRequest with pub ID and zone ID param', function () {
      expect(spec.isBidRequestValid({
        bidder: 'innity',
        params: {
          'pub': 267,
          'zone': 62546
        },
      })).to.equal(true);
    });

    it('bidRequest with no required params', function () {
      expect(spec.isBidRequestValid({
        bidder: 'innity',
        params: {
        },
      })).to.equal(false);
    });
  });

  describe('bidRequest', function () {
    const bidRequests = [{
      'bidder': 'innity',
      'params': {
        'pub': 267,
        'zone': 62546
      },
      'adUnitCode': 'div-gpt-ad-1460505748561-0',
      'transactionId': 'd7b773de-ceaa-484d-89ca-d9f51b8d61ec',
      'sizes': [300, 250],
      'bidId': '51ef8751f9aead',
      'bidderRequestId': '418b37f85e772c',
      'auctionId': '18fd8b8b0bd757'
    }];

    it('bidRequest HTTP method', function () {
      const requests = spec.buildRequests(bidRequests);
      requests.forEach(function(requestItem) {
        expect(requestItem.method).to.equal('GET');
      });
    });

    it('bidRequest data', function () {
      const requests = spec.buildRequests(bidRequests);
      expect(requests[0].data.pub).to.equal(267);
      expect(requests[0].data.zone).to.equal(62546);
      expect(requests[0].data.width).to.equal('300');
      expect(requests[0].data.height).to.equal('250');
      expect(requests[0].data.callback_uid).to.equal('51ef8751f9aead');
    });
  });

  describe('interpretResponse', function () {
    const bidRequest = {
      'method': 'GET',
      'url': 'https://as.innity.com/synd/?',
      'data': {
        'ver': 2,
        'hb': 1,
        'output': 'js',
        'pub': 267,
        'zone': 62546,
        'width': '300',
        'height': '250',
        'callback': 'json',
        'callback_uid': '51ef8751f9aead',
        'url': 'https://example.com',
        'cb': '',
      }
    };

    const bidResponse = {
      body: {
        'cpm': 100,
        'width': '300',
        'height': '250',
        'creative_id': '148186',
        'callback_uid': '51ef8751f9aead',
        'tag': '<script>innity=true;</script>',
      },
      headers: {}
    };

    it('result is correct', function () {
      const result = spec.interpretResponse(bidResponse, bidRequest);
      expect(result[0].requestId).to.equal('51ef8751f9aead');
      expect(result[0].cpm).to.equal(1);
      expect(result[0].width).to.equal('300');
      expect(result[0].height).to.equal('250');
      expect(result[0].creativeId).to.equal('148186');
      expect(result[0].currency).to.equal('USD');
      expect(result[0].ttl).to.equal(60);
      expect(result[0].ad).to.equal('<script src="https://cdn.innity.net/frame_util.js"></script><script>innity=true;</script>');
    });
  });
});
