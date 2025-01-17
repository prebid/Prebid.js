import {expect} from 'chai';
import {spec} from 'modules/freepassBidAdapter.js';
import {newBidder} from 'src/adapters/bidderFactory.js';

describe('FreePass adapter', function () {
  const adapter = newBidder(spec);
  describe('inherited functions', function () {
    it('exists and is a function', function () {
      expect(adapter.callBids).to.exist.and.to.be.a('function');
    });
  });

  describe('isBidRequestValid', function () {
    const bid = {
      bidder: 'freepass',
      userId: {
        freepassId: {
          userId: 'fpid'
        }
      },
      adUnitCode: 'adunit-code',
      params: {
        publisherId: 'publisherIdValue'
      }
    };

    it('should return true when required params found', function () {
      expect(spec.isBidRequestValid(bid)).to.equal(true);
    });

    it('should return false when adUnitCode is missing', function () {
      let localBid = Object.assign({}, bid);
      delete localBid.adUnitCode;
      expect(spec.isBidRequestValid(localBid)).to.equal(false);
    });

    it('should return false when params.publisherId is missing', function () {
      let localBid = Object.assign({}, bid);
      delete localBid.params.publisherId;
      expect(spec.isBidRequestValid(localBid)).to.equal(false);
    });
  });

  describe('buildRequests', function () {
    let bidRequests, bidderRequest;
    beforeEach(function () {
      bidRequests = [{
        'bidder': 'freepass',
        'userId': {
          'freepassId': {
            'userIp': '172.21.0.1',
            'userId': '56c4c789-71ce-46f5-989e-9e543f3d5f96',
            'commonId': 'commonIdValue'
          }
        },
        'adUnitCode': 'adunit-code',
        'params': {
          'publisherId': 'publisherIdValue'
        }
      }];
      bidderRequest = {};
    });

    it('should return an empty array when no bid requests', function () {
      const bidRequest = spec.buildRequests([], bidderRequest);
      expect(bidRequest).to.be.an('array');
      expect(bidRequest.length).to.equal(0);
    });

    it('should return a valid bid request object', function () {
      const bidRequest = spec.buildRequests(bidRequests, bidderRequest);
      expect(bidRequest).to.be.an('object');
      expect(bidRequest.data).to.be.an('object');
      expect(bidRequest.method).to.equal('POST');
      expect(bidRequest.url).to.not.equal('');
      expect(bidRequest.url).to.not.equal(undefined);
      expect(bidRequest.url).to.not.equal(null);
    });

    it('should add user id to user information', function () {
      const bidRequest = spec.buildRequests(bidRequests, bidderRequest);
      const ortbData = bidRequest.data;
      expect(ortbData.user).to.be.an('object');
      expect(ortbData.user.id).to.equal('56c4c789-71ce-46f5-989e-9e543f3d5f96');
    });

    it('should add freepass commonId to extended user information', function () {
      const bidRequest = spec.buildRequests(bidRequests, bidderRequest);
      const ortbData = bidRequest.data;
      expect(ortbData.user).to.be.an('object');
      expect(ortbData.user.ext).to.be.an('object');
      expect(ortbData.user.ext.fuid).to.equal('commonIdValue');
    });

    it('should skip freepass commonId when not available', function () {
      let localBidRequests = [Object.assign({}, bidRequests[0])];
      delete localBidRequests[0].userId.freepassId.commonId;
      const bidRequest = spec.buildRequests(localBidRequests, bidderRequest);
      const ortbData = bidRequest.data;
      expect(ortbData.user).to.be.an('object');
      expect(ortbData.user.ext).to.be.an('object');
      expect(ortbData.user.ext.fuid).to.be.undefined;
    });

    it('should add IP information to extended device information', function () {
      const bidRequest = spec.buildRequests(bidRequests, bidderRequest);
      const ortbData = bidRequest.data;
      expect(ortbData.device).to.be.an('object');
      expect(ortbData.device.ip).to.equal('172.21.0.1');
      expect(ortbData.device.ext).to.be.an('object');
      expect(ortbData.device.ext.is_accurate_ip).to.equal(1);
    });

    it('should skip IP information when not available', function () {
      let localBidRequests = [Object.assign({}, bidRequests[0])];
      delete localBidRequests[0].userId.freepassId.userIp;
      const bidRequest = spec.buildRequests(localBidRequests, bidderRequest);
      const ortbData = bidRequest.data;
      expect(ortbData.device).to.be.an('object');
      expect(ortbData.device.ip).to.be.undefined;
      expect(ortbData.device.ext).to.be.an('object');
      expect(ortbData.device.ext.is_accurate_ip).to.equal(0);
    });

    it('it should add publisher related information w/o publisherUrl', function () {
      const bidRequest = spec.buildRequests(bidRequests, bidderRequest);
      const ortbData = bidRequest.data;
      expect(ortbData.site).to.be.an('object');
      expect(ortbData.site.publisher.id).to.equal('publisherIdValue');
      // publisher.domain is optional
      expect(ortbData.site.publisher.domain).to.be.undefined;
    });

    it('it should add publisher related information w/ publisherUrl', function () {
      const PUBLISHER_URL = 'publisherUrlValue';
      let localBidRequests = [Object.assign({}, bidRequests[0])];
      localBidRequests[0].params.publisherUrl = PUBLISHER_URL;
      const bidRequest = spec.buildRequests(localBidRequests, bidderRequest);
      const ortbData = bidRequest.data;
      expect(ortbData.site).to.be.an('object');
      expect(ortbData.site.publisher.id).to.equal('publisherIdValue');
      // publisher.domain is optional. set when given
      expect(ortbData.site.publisher.domain).to.equal(PUBLISHER_URL);
    });

    it('it should imp.tagId from adUnitCode', function () {
      const bidRequest = spec.buildRequests(bidRequests, bidderRequest);
      const ortbData = bidRequest.data;
      expect(ortbData.imp[0].tagId).to.equal('adunit-code');
    });
  });

  describe('interpretResponse', function () {
    let bidRequests, bidderRequest;
    beforeEach(function () {
      bidRequests = [{
        'bidId': '28ffdf2a952532',
        'bidder': 'freepass',
        'userId': {
          'freepassId': {
            'userIp': '172.21.0.1',
            'userId': '56c4c789-71ce-46f5-989e-9e543f3d5f96',
            'commonId': 'commonIdValue'
          }
        },
        'adUnitCode': 'adunit-code',
        'params': {
          'publisherId': 'publisherIdValue'
        }
      }];
      bidderRequest = {};
    });

    const ad = '<iframe src=\'http://127.0.0.1:8081/banner.html?w=300&h=250&cr=0\' width=\'300\' height=\'250\' style=\'border:none;\'></iframe>';
    const serverResponse = {
      body: {
        'cur': 'JPY',
        'seatbid': [{
          'bid': [{
            'impid': '28ffdf2a952532',
            'price': 97,
            'adm': ad,
            'w': 300,
            'h': 250,
            'crid': 'creative0'
          }]
        }]
      }
    };
    it('should interpret server response', function () {
      const bidRequest = spec.buildRequests(bidRequests, bidderRequest);
      const bids = spec.interpretResponse(serverResponse, bidRequest);
      expect(bids).to.be.an('array');

      const bid = bids[0];
      expect(bid).to.be.an('object');
      expect(bid.currency).to.equal('JPY');
      expect(bid.cpm).to.equal(97);
      expect(bid.ad).to.equal(ad)
      expect(bid.width).to.equal(300);
      expect(bid.height).to.equal(250);
      expect(bid.creativeId).to.equal('creative0');
    });
  });
});
