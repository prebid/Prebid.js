import { expect } from 'chai';
import { spec } from 'modules/piximediaBidAdapter';

describe('piximediaAdapterTest', function() {
  describe('bidRequestValidity', function() {
    it('bidRequest with site ID and placement ID param', function() {
      expect(spec.isBidRequestValid({
        bidder: 'piximedia',
        params: {
          'siteId': 'PIXIMEDIA_PREBID10',
          'placementId': 'RG'
        },
      })).to.equal(true);
    });

    it('bidRequest with no required params', function() {
      expect(spec.isBidRequestValid({
        bidder: 'piximedia',
        params: {
        },
      })).to.equal(false);
    });
  });

  describe('bidRequest', function() {
    const bidRequests = [{
      'bidder': 'piximedia',
      'params': {
        'siteId': 'PIXIMEDIA_PREBID10',
        'placementId': 'RG'
      },
      'adUnitCode': 'div-gpt-ad-1460505748561-0',
      'transactionId': 'd7b773de-ceaa-484d-89ca-d9f51b8d61ec',
      'sizes': [300, 250],
      'bidId': '51ef8751f9aead',
      'bidderRequestId': '418b37f85e772c',
      'auctionId': '18fd8b8b0bd757'
    }];

    it('bidRequest HTTP method', function() {
      const requests = spec.buildRequests(bidRequests);
      requests.forEach(function(requestItem) {
        expect(requestItem.method).to.equal('GET');
      });
    });

    it('bidRequest data', function() {
      const requests = spec.buildRequests(bidRequests);
      expect(typeof requests[0].data.timestamp).to.equal('number');
      expect(requests[0].data.pbsizes).to.equal('["300x250"]');
      expect(requests[0].data.pver).to.equal('1.0');
      expect(requests[0].data.pbparams).to.equal(JSON.stringify(bidRequests[0].params));
      expect(requests[0].data.pbwidth).to.equal('300');
      expect(requests[0].data.pbheight).to.equal('250');
      expect(requests[0].data.pbbidid).to.equal('51ef8751f9aead');
    });
  });

  describe('interpretResponse', function() {
    const bidRequest = {
      'method': 'GET',
      'url': 'https://ad.piximedia.com/',
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
        'bidId': '51ef8751f9aead',
        'cpm': 4.2,
        'width': '300',
        'height': '250',
        'creative_id': '1234',
        'currency': 'EUR',
        'adm': '<div></div>',
      },
      headers: {}
    };

    it('result is correct', function() {
      const result = spec.interpretResponse(bidResponse, bidRequest);
      expect(result[0].requestId).to.equal('51ef8751f9aead');
      expect(result[0].cpm).to.equal(4.2);
      expect(result[0].width).to.equal('300');
      expect(result[0].height).to.equal('250');
      expect(result[0].creativeId).to.equal('1234');
      expect(result[0].currency).to.equal('EUR');
      expect(result[0].ttl).to.equal(300);
      expect(result[0].ad).to.equal('<div></div>');
    });
  });
});
