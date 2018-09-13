import { expect } from 'chai';
import { spec } from 'modules/gjirafaBidAdapter';

describe('gjirafaAdapterTest', function () {
  describe('bidRequestValidity', function () {
    it('bidRequest with placementId, minCPM and minCPC params', function () {
      expect(spec.isBidRequestValid({
        bidder: 'gjirafa',
        params: {
          placementId: 'test-div',
          minCPM: 0.0001,
          minCPC: 0.001
        }
      })).to.equal(true);
    });

    it('bidRequest with only placementId param', function () {
      expect(spec.isBidRequestValid({
        bidder: 'gjirafa',
        params: {
          placementId: 'test-div'
        }
      })).to.equal(true);
    });

    it('bidRequest with minCPM and minCPC params', function () {
      expect(spec.isBidRequestValid({
        bidder: 'gjirafa',
        params: {
          minCPM: 0.0001,
          minCPC: 0.001
        }
      })).to.equal(true);
    });

    it('bidRequest with no placementId, minCPM or minCPC params', function () {
      expect(spec.isBidRequestValid({
        bidder: 'gjirafa',
        params: {
        }
      })).to.equal(false);
    });
  });

  describe('bidRequest', function () {
    const bidRequests = [{
      'bidder': 'gjirafa',
      'params': {
        'placementId': '71-3'
      },
      'adUnitCode': 'hb-leaderboard',
      'transactionId': 'b6b889bb-776c-48fd-bc7b-d11a1cf0425e',
      'sizes': [[728, 90], [980, 200], [980, 150], [970, 90], [970, 250]],
      'bidId': '10bdc36fe0b48c8',
      'bidderRequestId': '70deaff71c281d',
      'auctionId': 'f9012acc-b6b7-4748-9098-97252914f9dc',
	  'consent_string': 'consentString',
	  'consent_required': 'true'
    },
    {
      'bidder': 'gjirafa',
      'params': {
        'minCPM': 0.0001,
        'minCPC': 0.001,
        'explicit': true
      },
      'adUnitCode': 'hb-inarticle',
      'transactionId': '8757194d-ea7e-4c06-abc0-cfe92bfc5295',
      'sizes': [[300, 250]],
      'bidId': '81a6dcb65e2bd9',
      'bidderRequestId': '70deaff71c281d',
      'auctionId': 'f9012acc-b6b7-4748-9098-97252914f9dc',
	  'consent_string': 'consentString',
	  'consent_required': 'true'
    }];

    it('bidRequest HTTP method', function () {
      const requests = spec.buildRequests(bidRequests);
      requests.forEach(function(requestItem) {
        expect(requestItem.method).to.equal('GET');
      });
    });

    it('bidRequest url', function () {
      const endpointUrl = 'https://gjc.gjirafa.com/Home/GetBid';
      const requests = spec.buildRequests(bidRequests);
      requests.forEach(function(requestItem) {
        expect(requestItem.url).to.match(new RegExp(`${endpointUrl}`));
      });
    });

    it('bidRequest data', function () {
      const requests = spec.buildRequests(bidRequests);
      requests.forEach(function(requestItem) {
        expect(requestItem.data).to.exists;
      });
    });

    it('bidRequest sizes', function () {
      const requests = spec.buildRequests(bidRequests);
      expect(requests[0].data.sizes).to.equal('728x90;980x200;980x150;970x90;970x250');
      expect(requests[1].data.sizes).to.equal('300x250');
    });

    it('should add GDPR data', function () {
      const requests = spec.buildRequests(bidRequests);
	  expect(requests[0].data.consent_string).to.exists;
	  expect(requests[0].data.consent_required).to.exists;
	  expect(requests[1].data.consent_string).to.exists;
	  expect(requests[1].data.consent_required).to.exists;
    });
  });

  describe('interpretResponse', function () {
    const bidRequest = {
      'method': 'GET',
      'url': 'https://gjc.gjirafa.com/Home/GetBid',
      'data': {
        'gjid': 2323007,
        'sizes': '728x90;980x200;980x150;970x90;970x250',
        'configId': '71-3',
        'minCPM': 0,
        'minCPC': 0,
        'allowExplicit': 0,
        'referrer': 'http://localhost:9999/integrationExamples/gpt/hello_world.html?pbjs_debug=true',
        'requestid': '26ee8fe87940da7',
        'bidid': '2962dbedc4768bf'
      }
    };

    const bidResponse = {
      body: [{
        'CPM': 1,
        'Width': 728,
        'Height': 90,
        'Referrer': 'https://example.com/',
        'Ad': 'test ad',
        'CreativeId': '123abc',
        'NetRevenue': false,
        'Currency': 'EUR',
        'TTL': 360
      }],
      headers: {}
    };

    it('all keys present', function () {
      const result = spec.interpretResponse(bidResponse, bidRequest);

      let keys = [
        'requestId',
        'cpm',
        'width',
        'height',
        'creativeId',
        'currency',
        'netRevenue',
        'ttl',
        'referrer',
        'ad'
      ];

      let resultKeys = Object.keys(result[0]);
      resultKeys.forEach(function(key) {
        expect(keys.indexOf(key) !== -1).to.equal(true);
      });
    })
  });
});
