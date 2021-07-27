import { expect } from 'chai';
import { spec } from 'modules/malltvBidAdapter';

describe('malltvAdapterTest', () => {
  describe('bidRequestValidity', () => {
    it('bidRequest with propertyId and placementId', () => {
      expect(spec.isBidRequestValid({
        bidder: 'malltv',
        params: {
          propertyId: '{propertyId}',
          placementId: '{placementId}'
        }
      })).to.equal(true);
    });

    it('bidRequest without propertyId', () => {
      expect(spec.isBidRequestValid({
        bidder: 'malltv',
        params: {
          placementId: '{placementId}'
        }
      })).to.equal(false);
    });

    it('bidRequest without placementId', () => {
      expect(spec.isBidRequestValid({
        bidder: 'malltv',
        params: {
          propertyId: '{propertyId}',
        }
      })).to.equal(false);
    });

    it('bidRequest without propertyId or placementId', () => {
      expect(spec.isBidRequestValid({
        bidder: 'malltv',
        params: {}
      })).to.equal(false);
    });
  });

  describe('bidRequest', () => {
    const bidRequests = [{
      'bidder': 'malltv',
      'params': {
        'propertyId': '{propertyId}',
        'placementId': '{placementId}',
        'data': {
          'catalogs': [{
            'catalogId': 1,
            'items': ['1', '2', '3']
          }],
          'inventory': {
            'category': ['category1', 'category2'],
            'query': ['query']
          }
        }
      },
      'adUnitCode': 'hb-leaderboard',
      'transactionId': 'b6b889bb-776c-48fd-bc7b-d11a1cf0425e',
      'sizes': [[300, 250]],
      'bidId': '10bdc36fe0b48c8',
      'bidderRequestId': '70deaff71c281d',
      'auctionId': 'f9012acc-b6b7-4748-9098-97252914f9dc'
    }];

    it('bidRequest HTTP method', () => {
      const requests = spec.buildRequests(bidRequests);
      requests.forEach(function (requestItem) {
        expect(requestItem.method).to.equal('POST');
      });
    });

    it('bidRequest url', () => {
      const endpointUrl = 'https://central.mall.tv/bid';
      const requests = spec.buildRequests(bidRequests);
      requests.forEach(function (requestItem) {
        expect(requestItem.url).to.match(new RegExp(`${endpointUrl}`));
      });
    });

    it('bidRequest data', () => {
      const requests = spec.buildRequests(bidRequests);
      requests.forEach(function (requestItem) {
        expect(requestItem.data).to.exist;
      });
    });

    it('bidRequest sizes', () => {
      const requests = spec.buildRequests(bidRequests);
      requests.forEach(function (requestItem) {
        expect(requestItem.data.placements).to.exist;
        expect(requestItem.data.placements.length).to.equal(1);
        expect(requestItem.data.placements[0].sizes).to.equal('300x250');
      });
    });

    it('bidRequest data param', () => {
      const requests = spec.buildRequests(bidRequests);
      requests.forEach((requestItem) => {
        expect(requestItem.data.data).to.exist;
        expect(requestItem.data.data.catalogs).to.exist;
        expect(requestItem.data.data.inventory).to.exist;
        expect(requestItem.data.data.catalogs.length).to.equal(1);
        expect(requestItem.data.data.catalogs[0].items.length).to.equal(3);
        expect(Object.keys(requestItem.data.data.inventory).length).to.equal(2);
        expect(requestItem.data.data.inventory.category.length).to.equal(2);
        expect(requestItem.data.data.inventory.query.length).to.equal(1);
      });
    });
  });

  describe('interpretResponse', () => {
    const bidRequest = {
      'method': 'POST',
      'url': 'https://central.mall.tv/bid',
      'data': {
        'sizes': '300x250',
        'adUnitId': 'rectangle',
        'placementId': '{placementId}',
        'propertyId': '{propertyId}',
        'pageViewGuid': '{pageViewGuid}',
        'url': 'http://localhost:9999/integrationExamples/gpt/hello_world.html?pbjs_debug=true',
        'requestid': '26ee8fe87940da7',
        'bidid': '2962dbedc4768bf'
      }
    };

    const bidResponse = {
      body: [{
        'CPM': 1,
        'Width': 300,
        'Height': 250,
        'Referrer': 'http://localhost:9999/integrationExamples/gpt/hello_world.html?pbjs_debug=true',
        'Ad': '<div>Test ad</div>',
        'CreativeId': '123abc',
        'NetRevenue': false,
        'Currency': 'EUR',
        'TTL': 360,
        'ADomain': ['somedomain.com']
      }],
      headers: {}
    };

    it('all keys present', () => {
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
        'ad',
        'vastUrl',
        'mediaType',
        'meta'
      ];

      let resultKeys = Object.keys(result[0]);
      resultKeys.forEach(function (key) {
        expect(keys.indexOf(key) !== -1).to.equal(true);
      });
    })

    it('all values correct', () => {
      const result = spec.interpretResponse(bidResponse, bidRequest);

      expect(result[0].cpm).to.equal(1);
      expect(result[0].width).to.equal(300);
      expect(result[0].height).to.equal(250);
      expect(result[0].creativeId).to.equal('123abc');
      expect(result[0].currency).to.equal('EUR');
      expect(result[0].netRevenue).to.equal(false);
      expect(result[0].ttl).to.equal(360);
      expect(result[0].referrer).to.equal('http://localhost:9999/integrationExamples/gpt/hello_world.html?pbjs_debug=true');
      expect(result[0].ad).to.equal('<div>Test ad</div>');
      expect(result[0].meta.advertiserDomains).to.deep.equal(['somedomain.com']);
    })
  });
});
