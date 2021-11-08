import { expect } from 'chai';
import { spec } from 'modules/mytargetBidAdapter';

describe('MyTarget Adapter', function() {
  describe('isBidRequestValid', function () {
    it('should return true when required params found', function () {
      let validBid = {
        bidder: 'mytarget',
        params: {
          placementId: '1'
        }
      };

      expect(spec.isBidRequestValid(validBid)).to.equal(true);
    });

    it('should return false for when required params are not passed', function () {
      let invalidBid = {
        bidder: 'mytarget',
        params: {}
      };

      expect(spec.isBidRequestValid(invalidBid)).to.equal(false);
    });
  });

  describe('buildRequests', function () {
    let bidRequests = [
      {
        bidId: 'bid1',
        bidder: 'mytarget',
        params: {
          placementId: '1'
        }
      },
      {
        bidId: 'bid2',
        bidder: 'mytarget',
        params: {
          placementId: '2',
          position: 1,
          response: 1,
          bidfloor: 10000
        }
      }
    ];
    let bidderRequest = {
      refererInfo: {
        referer: 'https://example.com?param=value'
      }
    };

    let bidRequest = spec.buildRequests(bidRequests, bidderRequest);

    it('should build single POST request for multiple bids', function() {
      expect(bidRequest.method).to.equal('POST');
      expect(bidRequest.url).to.equal('//ad.mail.ru/hbid_prebid/');
      expect(bidRequest.data).to.be.an('object');
      expect(bidRequest.data.places).to.be.an('array');
      expect(bidRequest.data.places).to.have.lengthOf(2);
    });

    it('should pass bid parameters', function() {
      let place1 = bidRequest.data.places[0];
      let place2 = bidRequest.data.places[1];

      expect(place1.placementId).to.equal('1');
      expect(place2.placementId).to.equal('2');
      expect(place1.id).to.equal('bid1');
      expect(place2.id).to.equal('bid2');
    });

    it('should pass default position and response type', function() {
      let place = bidRequest.data.places[0];

      expect(place.position).to.equal(0);
      expect(place.response).to.equal(0);
    });

    it('should pass provided position and response type', function() {
      let place = bidRequest.data.places[1];

      expect(place.position).to.equal(1);
      expect(place.response).to.equal(1);
    });

    it('should not pass default bidfloor', function() {
      let place = bidRequest.data.places[0];

      expect(place.bidfloor).not.to.exist;
    });

    it('should not pass provided bidfloor', function() {
      let place = bidRequest.data.places[1];

      expect(place.bidfloor).to.exist;
      expect(place.bidfloor).to.equal(10000);
    });

    it('should pass site parameters', function() {
      let site = bidRequest.data.site;

      expect(site).to.be.an('object');
      expect(site.sitename).to.equal('example.com');
      expect(site.page).to.equal('https://example.com?param=value');
    });

    it('should pass settings', function() {
      let settings = bidRequest.data.settings;

      expect(settings).to.be.an('object');
      expect(settings.currency).to.equal('RUB');
      expect(settings.windowSize).to.be.an('object');
      expect(settings.windowSize.width).to.equal(window.screen.width);
      expect(settings.windowSize.height).to.equal(window.screen.height);
    });
  });

  describe('interpretResponse', function () {
    let serverResponse = {
      body: {
        'bidder_status':
          [
            {
              'bidder': 'mail.ru',
              'response_time_ms': 100,
              'num_bids': 2
            }
          ],
        'bids':
          [
            {
              'displayUrl': 'https://ad.mail.ru/hbid_imp/12345',
              'size':
                {
                  'height': '400',
                  'width': '240'
                },
              'id': '1',
              'currency': 'RUB',
              'price': 100,
              'ttl': 360,
              'creativeId': '123456'
            },
            {
              'adm': '<p>Ad</p>',
              'size':
                {
                  'height': '250',
                  'width': '300'
                },
              'id': '2',
              'price': 200
            }
          ]
      }
    };

    let bids = spec.interpretResponse(serverResponse);

    it('should return empty array for response with no bids', function() {
      let emptyBids = spec.interpretResponse({ body: {} });

      expect(emptyBids).to.have.lengthOf(0);
    });

    it('should parse all bids from response', function() {
      expect(bids).to.have.lengthOf(2);
    });

    it('should parse bid with ad url', function() {
      expect(bids[0].requestId).to.equal('1');
      expect(bids[0].cpm).to.equal(100);
      expect(bids[0].width).to.equal('240');
      expect(bids[0].height).to.equal('400');
      expect(bids[0].ttl).to.equal(360);
      expect(bids[0].currency).to.equal('RUB');
      expect(bids[0]).to.have.property('creativeId');
      expect(bids[0].creativeId).to.equal('123456');
      expect(bids[0].netRevenue).to.equal(true);
      expect(bids[0].adUrl).to.equal('https://ad.mail.ru/hbid_imp/12345');
      expect(bids[0]).to.not.have.property('ad');
    });

    it('should parse bid with ad markup', function() {
      expect(bids[1].requestId).to.equal('2');
      expect(bids[1].cpm).to.equal(200);
      expect(bids[1].width).to.equal('300');
      expect(bids[1].height).to.equal('250');
      expect(bids[1].ttl).to.equal(180);
      expect(bids[1].currency).to.equal('RUB');
      expect(bids[1]).to.have.property('creativeId');
      expect(bids[1].creativeId).not.to.equal('123456');
      expect(bids[1].netRevenue).to.equal(true);
      expect(bids[1].ad).to.equal('<p>Ad</p>');
      expect(bids[1]).to.not.have.property('adUrl');
    });
  });
});
