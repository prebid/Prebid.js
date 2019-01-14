import { expect } from 'chai';
import { spec } from 'modules/trafficrootsBidAdapter';

describe('trafficrootsAdapterTests', () => {
  describe('bidRequestValidity', () => {
    it('bidRequest with zoneId and deliveryUrl params', () => {
      expect(spec.isBidRequestValid({
        bidder: 'trafficroots',
        params: {
          zoneId: 'aa0444af31',
          deliveryUrl: 'https://service.trafficroosts.com/prebid'
        }
      })).to.equal(true);
    });

    it('bidRequest with only zoneId', () => {
      expect(spec.isBidRequestValid({
        bidder: 'trafficroots',
        params: {
          zoneId: '8f527a4835'
        }
      })).to.equal(true);
    });

    it('bidRequest with only deliveryUrl', () => {
      expect(spec.isBidRequestValid({
        bidder: 'trafficroots',
        params: {
          deliveryUrl: 'https://service.trafficroosts.com/prebid'
        }
      })).to.equal(false);
    });
  });

  describe('bidRequest', () => {
    const bidRequests = [{
      'bidder': 'trafficroots',
      'bidId': '29fa5c08928bde',
      'params': {
        'zoneId': 'aa0444af31',
      },
      'adUnitCode': 'div-gpt-ad-1460505748561-0',
      'transactionId': 'd7b773de-ceaa-484d-89ca-d9f51b8d61ec',
      'sizes': [[300, 250], [300, 600]],
      'bidderRequestId': '418b37f85e772c',
      'auctionId': '18fd8b8b0bd757'
    }, {
      'bidder': 'trafficroots',
      'bidId': '29fa5c08928bde',
      'params': {
        'zoneId': '8f527a4835',
        'deliveryUrl': 'https://service.trafficroosts.com/prebid'
      },
      'adUnitCode': 'div-gpt-ad-1460505748561-0',
      'transactionId': 'd7b773de-ceaa-484d-89ca-d9f51b8d61ec',
      'sizes': [[300, 250], [300, 600]],
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
      expect(request.data.zoneId).to.equal('aa0444af31;8f527a4835');
    });

    it('bidRequest gdpr consent', () => {
      const consentString = 'consentString';
      const bidderRequest = {
        bidderCode: 'trafficroots',
        auctionId: '18fd8b8b0bd757',
        bidderRequestId: '418b37f85e772c',
        timeout: 3000,
        gdprConsent: {
          consentString: consentString,
          gdprApplies: true
        }
      };

      const request = spec.buildRequests(bidRequests, bidderRequest);

      expect(request.data.gdpr).to.exist;
      expect(request.data.gdpr.applies).to.exist.and.to.be.true;
      expect(request.data.gdpr.consent).to.exist.and.to.equal(consentString);
    });
  });

  describe('interpretResponse', () => {
    const bidRequest = [{
      'bidder': 'trafficroots',
      'bidId': '29fa5c08928bde',
      'params': {
        'zoneId': 'aa0444af31',
      },
      'adUnitCode': 'div-gpt-ad-1460505748561-0',
      'transactionId': 'd7b773de-ceaa-484d-89ca-d9f51b8d61ec',
      'sizes': [[300, 250], [300, 600]],
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
        'creativeId',
        'adId',
        'cpm',
        'width',
        'height',
        'currency',
        'netRevenue',
        'ttl',
        'ad'
      ];

      let resultKeys = Object.keys(result[0]);
      resultKeys.forEach(function(key) {
        expect(requiredKeys.indexOf(key) !== -1).to.equal(true);
      });
    })
  });
});
