import {expect} from 'chai';
import {spec} from 'modules/mantisBidAdapter';
import {newBidder} from 'src/adapters/bidderFactory';

describe('MantisAdapter', function () {
  const adapter = newBidder(spec);

  describe('isBidRequestValid', function () {
    let bid = {
      'bidder': 'mantis',
      'params': {
        'property': '10433394',
        'zone': 'zone'
      },
      'adUnitCode': 'adunit-code',
      'sizes': [[300, 250], [300, 600]],
      'bidId': '30b31c1838de1e',
      'bidderRequestId': '22edbae2733bf6',
      'auctionId': '1d1a030790a475',
    };

    it('should return true when required params found', function () {
      expect(spec.isBidRequestValid(bid)).to.equal(true);
    });

    it('should return false when required params are not passed', function () {
      let bid = Object.assign({}, bid);
      delete bid.params;
      bid.params = {};
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });
  });

  describe('buildRequests', function () {
    let bidRequests = [
      {
        'bidder': 'mantis',
        'params': {
          'property': '10433394',
          'zone': 'zone'
        },
        'adUnitCode': 'adunit-code',
        'sizes': [[300, 250], [300, 600]],
        'bidId': '30b31c1838de1e',
        'bidderRequestId': '22edbae2733bf6',
        'auctionId': '1d1a030790a475',
      }
    ];

    it('domain override', function () {
      window.mantis_domain = 'https://foo';
      const request = spec.buildRequests(bidRequests);

      expect(request.url).to.include('https://foo');

      delete window.mantis_domain;
    });

    it('standard request', function () {
      const request = spec.buildRequests(bidRequests);

      expect(request.url).to.include('property=10433394');
      expect(request.url).to.include('bids[0][bidId]=30b31c1838de1e');
      expect(request.url).to.include('bids[0][config][zone]=zone');
      expect(request.url).to.include('bids[0][sizes][0][width]=300');
      expect(request.url).to.include('bids[0][sizes][0][height]=250');
      expect(request.url).to.include('bids[0][sizes][1][width]=300');
      expect(request.url).to.include('bids[0][sizes][1][height]=600');
    });

    it('use window uuid', function () {
      window.mantis_uuid = 'foo';

      const request = spec.buildRequests(bidRequests);

      expect(request.url).to.include('uuid=foo');

      delete window.mantis_uuid;
    });

    it('use storage uuid', function () {
      window.localStorage.setItem('mantis:uuid', 'bar');

      const request = spec.buildRequests(bidRequests);

      expect(request.url).to.include('uuid=bar');

      window.localStorage.removeItem('mantis:uuid');
    });

    it('detect amp', function () {
      var oldContext = window.context;

      window.context = {};
      window.context.tagName = 'AMP-AD';
      window.context.canonicalUrl = 'foo';

      const request = spec.buildRequests(bidRequests);

      expect(request.url).to.include('amp=true');
      expect(request.url).to.include('url=foo');

      delete window.context.tagName;
      delete window.context.canonicalUrl;

      window.context = oldContext;
    });
  });

  describe('getUserSyncs', function () {
    it('iframe', function () {
      let result = spec.getUserSyncs({
        iframeEnabled: true
      });

      expect(result[0].type).to.equal('iframe');
      expect(result[0].url).to.include('https://mantodea.mantisadnetwork.com/prebid/iframe');
    });

    it('pixel', function () {
      let result = spec.getUserSyncs({
        pixelEnabled: true
      });

      expect(result[0].type).to.equal('image');
      expect(result[0].url).to.include('https://mantodea.mantisadnetwork.com/prebid/pixel');
    });
  });

  describe('interpretResponse', function () {
    it('use ad ttl if provided', function () {
      let response = {
        body: {
          ttl: 360,
          uuid: 'uuid',
          ads: [
            {
              bid: 'bid',
              cpm: 1,
              view: 'view',
              width: 300,
              ttl: 250,
              height: 250,
              html: '<!-- Creative -->'
            }
          ]
        }
      };

      let expectedResponse = [
        {
          requestId: 'bid',
          cpm: 1,
          width: 300,
          height: 250,
          ttl: 250,
          ad: '<!-- Creative -->',
          creativeId: 'view',
          netRevenue: true,
          currency: 'USD'
        }
      ];
      let bidderRequest;

      let result = spec.interpretResponse(response, {bidderRequest});
      expect(result[0]).to.deep.equal(expectedResponse[0]);
    });

    it('use global ttl if provded', function () {
      let response = {
        body: {
          ttl: 360,
          uuid: 'uuid',
          ads: [
            {
              bid: 'bid',
              cpm: 1,
              view: 'view',
              width: 300,
              height: 250,
              html: '<!-- Creative -->'
            }
          ]
        }
      };

      let expectedResponse = [
        {
          requestId: 'bid',
          cpm: 1,
          width: 300,
          height: 250,
          ttl: 360,
          ad: '<!-- Creative -->',
          creativeId: 'view',
          netRevenue: true,
          currency: 'USD'
        }
      ];
      let bidderRequest;

      let result = spec.interpretResponse(response, {bidderRequest});
      expect(result[0]).to.deep.equal(expectedResponse[0]);
    });

    it('display ads returned', function () {
      let response = {
        body: {
          uuid: 'uuid',
          ads: [
            {
              bid: 'bid',
              cpm: 1,
              view: 'view',
              width: 300,
              height: 250,
              html: '<!-- Creative -->'
            }
          ]
        }
      };

      let expectedResponse = [
        {
          requestId: 'bid',
          cpm: 1,
          width: 300,
          height: 250,
          ttl: 86400,
          ad: '<!-- Creative -->',
          creativeId: 'view',
          netRevenue: true,
          currency: 'USD'
        }
      ];
      let bidderRequest;

      let result = spec.interpretResponse(response, {bidderRequest});
      expect(result[0]).to.deep.equal(expectedResponse[0]);
      expect(window.mantis_uuid).to.equal(response.body.uuid);
      expect(window.localStorage.getItem('mantis:uuid')).to.equal(response.body.uuid);
    });

    it('no ads returned', function () {
      let response = {
        body: {
          ads: []
        }
      };
      let bidderRequest;

      let result = spec.interpretResponse(response, {bidderRequest});
      expect(result.length).to.equal(0);
    });
  });
});
