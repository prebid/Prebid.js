import { expect } from 'chai';
import { spec, API_SERVERS_MAP } from 'modules/appierBidAdapter';
import { newBidder } from 'src/adapters/bidderFactory';
import { config } from 'src/config';

describe('AppierAdapter', function () {
  const adapter = newBidder(spec);

  describe('inherited functions', function () {
    it('exists and is a function', function () {
      expect(adapter.callBids).to.exist.and.to.be.a('function');
    });
  });

  describe('isBidRequestValid', function () {
    let bid = {
      'bidder': 'appier',
      'params': {
        'hzid': 'abcd'
      },
      'adUnitCode': 'adunit-code',
      'sizes': [[300, 250], [300, 600]],
      'bidId': '30b31c1838de1e',
      'bidderRequestId': '22edbae2733bf6',
      'auctionId': '1d1a030790a475',
    };

    it('should return true when required params zoneId found', function () {
      expect(spec.isBidRequestValid(bid)).to.equal(true);
    });

    it('should return false when required param zoneId is missing', function () {
      let bid = Object.assign({}, bid);
      bid.params = {};
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });

    it('should return false when required param zoneId has wrong type', function () {
      let bid = Object.assign({}, bid);
      bid.params = {
        'hzid': null
      };
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });
  });

  describe('buildRequests', function() {
    it('should return an empty list when there are no bid requests', function() {
      let fakeBidRequests = [];
      let fakeBidderRequest = {};
      expect(spec.buildRequests(fakeBidRequests, fakeBidderRequest)).to.be.an('array').that.is.empty;
    });

    it('should generate a POST bid request with method, url, and data fields', function() {
      let bid = {
        'bidder': 'appier',
        'params': {
          'hzid': 'abcd'
        },
        'adUnitCode': 'adunit-code',
        'sizes': [[300, 250], [300, 600]],
        'bidId': '30b31c1838de1e',
        'bidderRequestId': '22edbae2733bf6',
        'auctionId': '1d1a030790a475',
      };
      let fakeBidRequests = [bid];
      let fakeBidderRequest = {};

      let builtRequests = spec.buildRequests(fakeBidRequests, fakeBidderRequest);
      expect(builtRequests.length).to.equal(1);
      expect(builtRequests[0].method).to.equal('POST');
      expect(builtRequests[0].url).match(/v1\/prebid\/bid/);
      expect(builtRequests[0].data).deep.equal(fakeBidRequests);
    });
  });

  describe('interpretResponse', function() {
    let bid = {
      'bidder': 'appier',
      'params': {
        'hzid': 'abcd'
      },
      'adUnitCode': 'adunit-code',
      'sizes': [[300, 250], [300, 600]],
      'bidId': '30b31c1838de1e',
      'bidderRequestId': '22edbae2733bf6',
      'auctionId': '1d1a030790a475',
    };
    let fakeBidRequests = [bid];

    it('should return an empty aray to indicate no valid bids', function() {
      let fakeServerResponse = {};

      let bidResponses = spec.interpretResponse(fakeServerResponse, fakeBidRequests);

      expect(bidResponses).is.an('array').that.is.empty;
    });

    it('should generate correct response array for bidder', function() {
      let fakeBidResult = {
        'requestId': '30b31c1838de1e',
        'cpm': 0.0029346001,
        'creativeId': 'Idl0P0d5S3Ca5kVWcia-wQ',
        'width': 300,
        'height': 250,
        'currency': 'USD',
        'netRevenue': true,
        'ttl': 300,
        'ad': '<div>fake html</div>',
        'appierParams': {
          'hzid': 'test_hzid'
        }
      };
      let fakeServerResponse = {
        headers: [],
        body: [fakeBidResult]
      };

      const bidResponses = spec.interpretResponse(fakeServerResponse, fakeBidRequests);
      expect(bidResponses).deep.equal([fakeBidResult]);
    });
  });

  describe('onBidWon', function() {
    let fakeBid = {
      'bidder': 'appier',
      'width': 300,
      'height': 250,
      'adId': '330a22bdea4cac',
      'mediaType': 'banner',
      'cpm': 0.28,
      'ad': '<div>test creative</div>',
      'requestId': '418b37f85e772c',
      'adUnitCode': 'div-gpt-ad-1460505748561-0',
      'size': '350x250',
      'adserverTargeting': {
        'hb_bidder': 'appier',
        'hb_adid': '330a22bdea4cac',
        'hb_pb': '0.20',
        'hb_size': '350x250'
      },
      // FIXME: not sure if the following fields are available here. They are not documented.
      'currency': 'TWD',
      'appierParams': {
        'hzid': 'test_hzid'
      }
    };

    it('should generate beacon URL for show callback', function() {
      spec.onBidWon(fakeBid);

      const beaconUrl = spec.generateShowCallbackUrl('test_hzid', '0.20', 'TWD', '418b37f85e772c');
      const imgTag = `<img src="${beaconUrl}">`;

      expect(fakeBid.ad).contains(imgTag);
    });
  });

  describe('generateShowCallbackUrl', function() {
    it('should generate a show callback url passing cpm and currency', function() {
      const beaconUrl = spec.generateShowCallbackUrl('test_hzid', '0.20', 'TWD', '418b37f85e772c');

      expect(beaconUrl).matches(/hzid=test_hzid/);
      expect(beaconUrl).matches(/cpm=0.20/);
      expect(beaconUrl).matches(/currency=TWD/);
      expect(beaconUrl).matches(/rid=418b37f85e772c/);
    });
  });

  describe('getApiServer', function() {
    it('should use the server specified by setConfig(appier.server)', function() {
      config.setConfig({
        'appier': {'server': 'fake_server'}
      });

      const server = spec.getApiServer();

      expect(server).equals('fake_server');
    });

    it('should retrieve a farm specific hostname if server is not specpfied', function() {
      config.setConfig({
        'appier': {'farm': 'tw'}
      });

      const server = spec.getApiServer();

      expect(server).equals(API_SERVERS_MAP['tw']);
    });

    it('if farm is not recognized, use the default farm', function() {
      config.setConfig({
        'appier': {'farm': 'no_this_farm'}
      });

      const server = spec.getApiServer();

      expect(server).equals(API_SERVERS_MAP['default']);
    });

    it('if farm is not specified, use the default farm', function() {
      config.setConfig({
        'appier': {}
      });

      const server = spec.getApiServer();

      expect(server).equals(API_SERVERS_MAP['default']);
    });
  });
});
