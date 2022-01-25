import { expect } from 'chai';
import { spec } from 'modules/a4gBidAdapter.js';
import * as utils from 'src/utils.js';

describe('a4gAdapterTests', function () {
  describe('bidRequestValidity', function () {
    it('bidRequest with zoneId and deliveryUrl params', function () {
      expect(spec.isBidRequestValid({
        bidder: 'a4g',
        params: {
          zoneId: 59304,
          deliveryUrl: 'http://dev01.ad4game.com/v1/bid'
        }
      })).to.equal(true);
    });

    it('bidRequest with only zoneId', function () {
      expect(spec.isBidRequestValid({
        bidder: 'a4g',
        params: {
          zoneId: 59304
        }
      })).to.equal(true);
    });

    it('bidRequest with only deliveryUrl', function () {
      expect(spec.isBidRequestValid({
        bidder: 'a4g',
        params: {
          deliveryUrl: 'http://dev01.ad4game.com/v1/bid'
        }
      })).to.equal(false);
    });
  });

  describe('bidRequest', function () {
    const DEFAULT_OPTION = {
      refererInfo: {
        referer: 'https://www.prebid.org',
        canonicalUrl: 'https://www.prebid.org/the/link/to/the/page'
      }
    };

    const bidRequests = [{
      'bidder': 'a4g',
      'bidId': '51ef8751f9aead',
      'params': {
        'zoneId': 59304,
      },
      'adUnitCode': 'div-gpt-ad-1460505748561-0',
      'transactionId': 'd7b773de-ceaa-484d-89ca-d9f51b8d61ec',
      'mediaTypes': {
        'banner': {
          'sizes': [[300, 50], [300, 250], [300, 600]]
        }
      },
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
      'mediaTypes': {
        'banner': {
          'sizes': [[300, 50], [300, 250], [300, 600]]
        }
      },
      'bidderRequestId': '418b37f85e772c',
      'auctionId': '18fd8b8b0bd757'
    }];

    it('bidRequest method', function () {
      const request = spec.buildRequests(bidRequests, DEFAULT_OPTION);
      expect(request.method).to.equal('GET');
    });

    it('bidRequest url', function () {
      const request = spec.buildRequests(bidRequests, DEFAULT_OPTION);
      expect(request.url).to.match(new RegExp(`${bidRequests[1].params.deliveryUrl}`));
    });

    it('bidRequest data', function () {
      const request = spec.buildRequests(bidRequests, DEFAULT_OPTION);
      expect(request.data).to.exist;
    });

    it('bidRequest zoneIds', function () {
      const request = spec.buildRequests(bidRequests, DEFAULT_OPTION);
      expect(request.data.zoneId).to.equal('59304;59354');
    });

    it('bidRequest gdpr consent', function () {
      const consentString = 'consentString';
      const bidderRequest = {
        bidderCode: 'a4g',
        auctionId: '18fd8b8b0bd757',
        bidderRequestId: '418b37f85e772c',
        timeout: 3000,
        gdprConsent: {
          consentString: consentString,
          gdprApplies: true
        },
        refererInfo: {
          referer: 'https://www.prebid.org',
          canonicalUrl: 'https://www.prebid.org/the/link/to/the/page'
        }
      };

      const request = spec.buildRequests(bidRequests, bidderRequest);

      expect(request.data.gdpr).to.exist;
      expect(request.data.gdpr.applies).to.exist.and.to.be.true;
      expect(request.data.gdpr.consent).to.exist.and.to.equal(consentString);
    });
  });

  describe('interpretResponse', function () {
    const bidRequest = [{
      'bidder': 'a4g',
      'bidId': '51ef8751f9aead',
      'params': {
        'zoneId': 59304,
      },
      'adUnitCode': 'div-gpt-ad-1460505748561-0',
      'transactionId': 'd7b773de-ceaa-484d-89ca-d9f51b8d61ec',
      'mediaTypes': {
        'banner': {
          'sizes': [[300, 50], [300, 250], [300, 600]]
        }
      },
      'bidderRequestId': '418b37f85e772c',
      'auctionId': '18fd8b8b0bd757'
    }];

    const bidResponse = {
      body: [{
        'id': '51ef8751f9aead',
        'ad': 'test ad',
        'width': 320,
        'height': 250,
        'cpm': 5.2,
        'crid': '111'
      }],
      headers: {}
    };

    it('should get correct bid response for banner ad', function () {
      const expectedParse = [
        {
          requestId: '51ef8751f9aead',
          cpm: 5.2,
          creativeId: '111',
          width: 320,
          height: 250,
          ad: 'test ad',
          currency: 'USD',
          ttl: 120,
          netRevenue: true,
          meta: {
            advertiserDomains: []
          }

        }
      ];
      const result = spec.interpretResponse(bidResponse, bidRequest);
      expect(result[0]).to.deep.equal(expectedParse[0]);
    });

    it('should set creativeId to default value if not provided', function () {
      const bidResponseWithoutCrid = utils.deepClone(bidResponse);
      delete bidResponseWithoutCrid.body[0].crid;
      const expectedParse = [
        {
          requestId: '51ef8751f9aead',
          cpm: 5.2,
          creativeId: '51ef8751f9aead',
          width: 320,
          height: 250,
          ad: 'test ad',
          currency: 'USD',
          ttl: 120,
          netRevenue: true,
          meta: {
            advertiserDomains: []
          }
        }
      ];
      const result = spec.interpretResponse(bidResponseWithoutCrid, bidRequest);
      expect(result[0]).to.deep.equal(expectedParse[0]);
    })

    it('required keys', function () {
      const result = spec.interpretResponse(bidResponse, bidRequest);

      let requiredKeys = [
        'requestId',
        'creativeId',
        'adId',
        'cpm',
        'width',
        'height',
        'currency',
        'netRevenue',
        'ttl',
        'ad',
        'meta'
      ];

      let resultKeys = Object.keys(result[0]);
      resultKeys.forEach(function(key) {
        expect(requiredKeys.indexOf(key) !== -1).to.equal(true);
      });
    })

    it('adId should not be equal to requestId', function () {
      const result = spec.interpretResponse(bidResponse, bidRequest);

      expect(result[0].requestId).to.not.equal(result[0].adId);
    })

    it('advertiserDomains is included when sent by server', function () {
      bidResponse.body[0].adomain = ['test_adomain'];
      let response = spec.interpretResponse(bidResponse, bidRequest);
      expect(Object.keys(response[0].meta)).to.include.members(['advertiserDomains']);
      expect(response[0].meta.advertiserDomains).to.deep.equal(['test_adomain']);
      delete bidResponse.body[0].adomain;
    });
  });
});
