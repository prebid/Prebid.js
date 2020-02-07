import { expect } from 'chai';
import { spec } from 'modules/hpmdnetworkBidAdapter';

describe('HPMDNetwork Adapter', function() {
  describe('isBidRequestValid', function () {
    it('should return true when required params found', function () {
      const validBid = {
        bidder: 'hpmdnetwork',
        params: {
          placementId: '1'
        }
      };

      expect(spec.isBidRequestValid(validBid)).to.equal(true);
    });

    it('should return false for when required params are not passed', function () {
      const invalidBid = {
        bidder: 'hpmdnetwork',
        params: {}
      };

      expect(spec.isBidRequestValid(invalidBid)).to.equal(false);
    });
  });

  describe('buildRequests', function () {
    const bidRequests = [
      {
        bidId: 'bid1',
        bidder: 'hpmdnetwork',
        params: {
          placementId: '1'
        }
      },
      {
        bidId: 'bid2',
        bidder: 'hpmdnetwork',
        params: {
          placementId: '2',
        }
      }
    ];
    const bidderRequest = {
      refererInfo: {
        referer: 'https://example.com?foo=bar'
      }
    };

    const bidRequest = spec.buildRequests(bidRequests, bidderRequest);

    it('should build single POST request for multiple bids', function() {
      expect(bidRequest.method).to.equal('POST');
      expect(bidRequest.url).to.equal('https://banner.hpmdnetwork.ru/bidder/request');
      expect(bidRequest.data).to.be.an('object');
      expect(bidRequest.data.places).to.be.an('array');
      expect(bidRequest.data.places).to.have.lengthOf(2);
    });

    it('should pass bid parameters', function() {
      const place1 = bidRequest.data.places[0];
      const place2 = bidRequest.data.places[1];

      expect(place1.placementId).to.equal('1');
      expect(place2.placementId).to.equal('2');
      expect(place1.id).to.equal('bid1');
      expect(place2.id).to.equal('bid2');
    });

    it('should pass site parameters', function() {
      const url = bidRequest.data.url;

      expect(url).to.be.an('String');
      expect(url).to.equal('https://example.com?foo=bar');
    });

    it('should pass settings', function() {
      const settings = bidRequest.data.settings;

      expect(settings).to.be.an('object');
      expect(settings.currency).to.equal('RUB');
    });
  });

  describe('interpretResponse', function () {
    const serverResponse = {
      body: {
        'bids':
          [
            {
              'cpm': 20,
              'currency': 'RUB',
              'displayUrl': 'https://banner.hpmdnetwork.ru/bidder/display?dbid=0&vbid=168',
              'id': '1',
              'creativeId': '11111',
            },
            {
              'cpm': 30,
              'currency': 'RUB',
              'displayUrl': 'https://banner.hpmdnetwork.ru/bidder/display?dbid=0&vbid=170',
              'id': '2',
              'creativeId': '22222',
              'width': 300,
              'height': 250,
            },
          ]
      }
    };

    const bids = spec.interpretResponse(serverResponse);

    it('should return empty array for response with no bids', function() {
      const emptyBids = spec.interpretResponse({ body: {} });

      expect(emptyBids).to.have.lengthOf(0);
    });

    it('should parse all bids from response', function() {
      expect(bids).to.have.lengthOf(2);
    });

    it('should parse bid without sizes', function() {
      expect(bids[0].requestId).to.equal('1');
      expect(bids[0].cpm).to.equal(20);
      expect(bids[0].width).to.equal(1);
      expect(bids[0].height).to.equal(1);
      expect(bids[0].ttl).to.equal(300);
      expect(bids[0].currency).to.equal('RUB');
      expect(bids[0]).to.have.property('creativeId');
      expect(bids[0].creativeId).to.equal('11111');
      expect(bids[0].netRevenue).to.equal(true);
      expect(bids[0].ad).to.include('<script async src="https://banner.hpmdnetwork.ru/bidder/display?dbid=0&vbid=168"></script>');
    });

    it('should parse bid with sizes', function() {
      expect(bids[1].requestId).to.equal('2');
      expect(bids[1].cpm).to.equal(30);
      expect(bids[1].width).to.equal(300);
      expect(bids[1].height).to.equal(250);
      expect(bids[1].ttl).to.equal(300);
      expect(bids[1].currency).to.equal('RUB');
      expect(bids[1]).to.have.property('creativeId');
      expect(bids[1].creativeId).to.equal('22222');
      expect(bids[1].netRevenue).to.equal(true);
      expect(bids[1].ad).to.include('<script async src="https://banner.hpmdnetwork.ru/bidder/display?dbid=0&vbid=170"></script>');
    });
  });
});
