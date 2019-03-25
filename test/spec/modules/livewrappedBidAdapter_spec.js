import {expect} from 'chai';
import {spec} from 'modules/livewrappedBidAdapter';
import {config} from 'src/config';
import * as utils from 'src/utils';

describe('Livewrapped adapter tests', function () {
  let sandbox,
    bidderRequest;

  beforeEach(function () {
    sandbox = sinon.sandbox.create();

    bidderRequest = {
      bidderCode: 'livewrapped',
      auctionId: 'c45dd708-a418-42ec-b8a7-b70a6c6fab0a',
      bidderRequestId: '178e34bad3658f',
      bids: [
        {
          bidder: 'livewrapped',
          params: {
            adUnitId: '9E153CED-61BC-479E-98DF-24DC0D01BA37',
            publisherId: '26947112-2289-405D-88C1-A7340C57E63E',
            userId: 'user id',
            url: 'http://www.domain.com',
            seats: {'dsp': ['seat 1']}
          },
          adUnitCode: 'panorama_d_1',
          sizes: [[980, 240], [980, 120]],
          bidId: '2ffb201a808da7',
          bidderRequestId: '178e34bad3658f',
          auctionId: 'F7557995-65F5-4682-8782-7D5D34D82A8C',
          transactionId: '3D1C8CF7-D288-4D7F-8ADD-97C553056C3D'
        }
      ],
      start: 1472239426002,
      auctionStart: 1472239426000,
      timeout: 5000
    };
  });

  afterEach(function () {
    sandbox.restore();
  });

  describe('isBidRequestValid', function() {
    it('should accept a request with id only as valid', function() {
      let bid = {params: {adUnitId: '9E153CED-61BC-479E-98DF-24DC0D01BA37'}};

      let result = spec.isBidRequestValid(bid);

      expect(result).to.be.true;
    });

    it('should accept a request with adUnitName and PublisherId as valid', function() {
      let bid = {params: {adUnitName: 'panorama_d_1', publisherId: '26947112-2289-405D-88C1-A7340C57E63E'}};

      let result = spec.isBidRequestValid(bid);

      expect(result).to.be.true;
    });

    it('should accept a request with adUnitCode and PublisherId as valid', function() {
      let bid = {adUnitCode: 'panorama_d_1', params: {publisherId: '26947112-2289-405D-88C1-A7340C57E63E'}};

      let result = spec.isBidRequestValid(bid);

      expect(result).to.be.true;
    });

    it('should accept a request with placementCode and PublisherId as valid', function() {
      let bid = {placementCode: 'panorama_d_1', params: {publisherId: '26947112-2289-405D-88C1-A7340C57E63E'}};

      let result = spec.isBidRequestValid(bid);

      expect(result).to.be.true;
    });

    it('should not accept a request with adUnitName, adUnitCode, placementCode but no PublisherId as valid', function() {
      let bid = {placementCode: 'panorama_d_1', adUnitCode: 'panorama_d_1', params: {adUnitName: 'panorama_d_1'}};

      let result = spec.isBidRequestValid(bid);

      expect(result).to.be.false;
    });
  });

  describe('buildRequests', function() {
    it('should make a well-formed single request object', function() {
      sandbox.stub(utils, 'isSafariBrowser').callsFake(() => false);
      sandbox.stub(utils, 'cookiesAreEnabled').callsFake(() => true);
      let result = spec.buildRequests(bidderRequest.bids, bidderRequest);
      let data = JSON.parse(result.data);

      expect(result.url).to.equal('//lwadm.com/ad');

      let expectedQuery = {
        auctionId: 'F7557995-65F5-4682-8782-7D5D34D82A8C',
        publisherId: '26947112-2289-405D-88C1-A7340C57E63E',
        userId: 'user id',
        url: 'http://www.domain.com',
        seats: {'dsp': ['seat 1']},
        version: '1.1',
        cookieSupport: true,
        adRequests: [{
          adUnitId: '9E153CED-61BC-479E-98DF-24DC0D01BA37',
          callerAdUnitId: 'panorama_d_1',
          bidId: '2ffb201a808da7',
          transactionId: '3D1C8CF7-D288-4D7F-8ADD-97C553056C3D',
          formats: [{width: 980, height: 240}, {width: 980, height: 120}]
        }]
      };

      expect(data).to.deep.equal(expectedQuery);
    });

    it('should make a well-formed multiple request object', function() {
      sandbox.stub(utils, 'isSafariBrowser').callsFake(() => false);
      sandbox.stub(utils, 'cookiesAreEnabled').callsFake(() => true);
      let multiplebidRequest = clone(bidderRequest);
      multiplebidRequest.bids.push(clone(bidderRequest.bids[0]));
      multiplebidRequest.bids[1].adUnitCode = 'box_d_1';
      multiplebidRequest.bids[1].sizes = [[300, 250]];
      multiplebidRequest.bids[1].bidId = '3ffb201a808da7';
      delete multiplebidRequest.bids[1].params.adUnitId;

      let result = spec.buildRequests(multiplebidRequest.bids, multiplebidRequest);
      let data = JSON.parse(result.data);

      expect(result.url).to.equal('//lwadm.com/ad');

      let expectedQuery = {
        auctionId: 'F7557995-65F5-4682-8782-7D5D34D82A8C',
        publisherId: '26947112-2289-405D-88C1-A7340C57E63E',
        userId: 'user id',
        url: 'http://www.domain.com',
        seats: {'dsp': ['seat 1']},
        version: '1.1',
        cookieSupport: true,
        adRequests: [{
          adUnitId: '9E153CED-61BC-479E-98DF-24DC0D01BA37',
          callerAdUnitId: 'panorama_d_1',
          bidId: '2ffb201a808da7',
          transactionId: '3D1C8CF7-D288-4D7F-8ADD-97C553056C3D',
          formats: [{width: 980, height: 240}, {width: 980, height: 120}]
        }, {
          callerAdUnitId: 'box_d_1',
          bidId: '3ffb201a808da7',
          transactionId: '3D1C8CF7-D288-4D7F-8ADD-97C553056C3D',
          formats: [{width: 300, height: 250}]
        }]
      };

      expect(data).to.deep.equal(expectedQuery);
    });

    it('should make a well-formed single request object with AdUnitName', function() {
      sandbox.stub(utils, 'isSafariBrowser').callsFake(() => false);
      sandbox.stub(utils, 'cookiesAreEnabled').callsFake(() => true);
      let testbidRequest = clone(bidderRequest);
      testbidRequest.bids[0].params.adUnitName = 'caller id 1';
      delete testbidRequest.bids[0].params.adUnitId;
      let result = spec.buildRequests(testbidRequest.bids, testbidRequest);
      let data = JSON.parse(result.data);

      expect(result.url).to.equal('//lwadm.com/ad');

      let expectedQuery = {
        auctionId: 'F7557995-65F5-4682-8782-7D5D34D82A8C',
        publisherId: '26947112-2289-405D-88C1-A7340C57E63E',
        userId: 'user id',
        url: 'http://www.domain.com',
        seats: {'dsp': ['seat 1']},
        version: '1.1',
        cookieSupport: true,
        adRequests: [{
          callerAdUnitId: 'caller id 1',
          bidId: '2ffb201a808da7',
          transactionId: '3D1C8CF7-D288-4D7F-8ADD-97C553056C3D',
          formats: [{width: 980, height: 240}, {width: 980, height: 120}]
        }]
      };

      expect(data).to.deep.equal(expectedQuery);
    });

    it('should make a well-formed single request object with less parameters', function() {
      sandbox.stub(utils, 'isSafariBrowser').callsFake(() => false);
      sandbox.stub(utils, 'cookiesAreEnabled').callsFake(() => true);
      let testbidRequest = clone(bidderRequest);
      delete testbidRequest.bids[0].params.userId;
      delete testbidRequest.bids[0].params.seats;
      delete testbidRequest.bids[0].params.adUnitId;
      let result = spec.buildRequests(testbidRequest.bids, testbidRequest);
      let data = JSON.parse(result.data);

      expect(result.url).to.equal('//lwadm.com/ad');

      let expectedQuery = {
        auctionId: 'F7557995-65F5-4682-8782-7D5D34D82A8C',
        publisherId: '26947112-2289-405D-88C1-A7340C57E63E',
        url: 'http://www.domain.com',
        version: '1.1',
        cookieSupport: true,
        adRequests: [{
          callerAdUnitId: 'panorama_d_1',
          bidId: '2ffb201a808da7',
          transactionId: '3D1C8CF7-D288-4D7F-8ADD-97C553056C3D',
          formats: [{width: 980, height: 240}, {width: 980, height: 120}]
        }]
      };

      expect(data).to.deep.equal(expectedQuery);
    });

    it('should make a well-formed single request object with less parameters, no publisherId', function() {
      sandbox.stub(utils, 'isSafariBrowser').callsFake(() => false);
      sandbox.stub(utils, 'cookiesAreEnabled').callsFake(() => true);
      let testbidRequest = clone(bidderRequest);
      delete testbidRequest.bids[0].params.userId;
      delete testbidRequest.bids[0].params.seats;
      delete testbidRequest.bids[0].params.publisherId;
      let result = spec.buildRequests(testbidRequest.bids, testbidRequest);
      let data = JSON.parse(result.data);

      expect(result.url).to.equal('//lwadm.com/ad');

      let expectedQuery = {
        auctionId: 'F7557995-65F5-4682-8782-7D5D34D82A8C',
        url: 'http://www.domain.com',
        version: '1.1',
        cookieSupport: true,
        adRequests: [{
          adUnitId: '9E153CED-61BC-479E-98DF-24DC0D01BA37',
          callerAdUnitId: 'panorama_d_1',
          bidId: '2ffb201a808da7',
          transactionId: '3D1C8CF7-D288-4D7F-8ADD-97C553056C3D',
          formats: [{width: 980, height: 240}, {width: 980, height: 120}]
        }]
      };

      expect(data).to.deep.equal(expectedQuery);
    });

    it('should make a well-formed single request object with app parameters', function() {
      sandbox.stub(utils, 'isSafariBrowser').callsFake(() => false);
      sandbox.stub(utils, 'cookiesAreEnabled').callsFake(() => true);
      let testbidRequest = clone(bidderRequest);
      delete testbidRequest.bids[0].params.userId;
      delete testbidRequest.bids[0].params.seats;
      delete testbidRequest.bids[0].params.adUnitId;
      testbidRequest.bids[0].params.deviceId = 'deviceid';
      testbidRequest.bids[0].params.ifa = 'ifa';
      let result = spec.buildRequests(testbidRequest.bids, testbidRequest);
      let data = JSON.parse(result.data);

      let expectedQuery = {
        auctionId: 'F7557995-65F5-4682-8782-7D5D34D82A8C',
        publisherId: '26947112-2289-405D-88C1-A7340C57E63E',
        url: 'http://www.domain.com',
        version: '1.1',
        deviceId: 'deviceid',
        ifa: 'ifa',
        cookieSupport: true,
        adRequests: [{
          callerAdUnitId: 'panorama_d_1',
          bidId: '2ffb201a808da7',
          transactionId: '3D1C8CF7-D288-4D7F-8ADD-97C553056C3D',
          formats: [{width: 980, height: 240}, {width: 980, height: 120}]
        }]
      };

      expect(data).to.deep.equal(expectedQuery);
    });

    it('should make a well-formed single request object with debug parameters', function() {
      sandbox.stub(utils, 'isSafariBrowser').callsFake(() => false);
      sandbox.stub(utils, 'cookiesAreEnabled').callsFake(() => true);
      let testbidRequest = clone(bidderRequest);
      delete testbidRequest.bids[0].params.userId;
      delete testbidRequest.bids[0].params.seats;
      delete testbidRequest.bids[0].params.adUnitId;
      testbidRequest.bids[0].params.tid = 'tracking id';
      testbidRequest.bids[0].params.test = true;
      let result = spec.buildRequests(testbidRequest.bids, testbidRequest);
      let data = JSON.parse(result.data);

      let expectedQuery = {
        auctionId: 'F7557995-65F5-4682-8782-7D5D34D82A8C',
        publisherId: '26947112-2289-405D-88C1-A7340C57E63E',
        url: 'http://www.domain.com',
        version: '1.1',
        tid: 'tracking id',
        test: true,
        cookieSupport: true,
        adRequests: [{
          callerAdUnitId: 'panorama_d_1',
          bidId: '2ffb201a808da7',
          transactionId: '3D1C8CF7-D288-4D7F-8ADD-97C553056C3D',
          formats: [{width: 980, height: 240}, {width: 980, height: 120}]
        }]
      };

      expect(data).to.deep.equal(expectedQuery);
    });

    it('should pass gdpr true parameters', function() {
      sandbox.stub(utils, 'isSafariBrowser').callsFake(() => false);
      sandbox.stub(utils, 'cookiesAreEnabled').callsFake(() => true);
      let testRequest = clone(bidderRequest);
      testRequest.gdprConsent = {
        gdprApplies: true,
        consentString: 'test'
      };
      let result = spec.buildRequests(testRequest.bids, testRequest);
      let data = JSON.parse(result.data);

      expect(result.url).to.equal('//lwadm.com/ad');

      let expectedQuery = {
        auctionId: 'F7557995-65F5-4682-8782-7D5D34D82A8C',
        publisherId: '26947112-2289-405D-88C1-A7340C57E63E',
        userId: 'user id',
        url: 'http://www.domain.com',
        seats: {'dsp': ['seat 1']},
        version: '1.1',
        cookieSupport: true,
        gdprApplies: true,
        gdprConsent: 'test',
        adRequests: [{
          adUnitId: '9E153CED-61BC-479E-98DF-24DC0D01BA37',
          callerAdUnitId: 'panorama_d_1',
          bidId: '2ffb201a808da7',
          transactionId: '3D1C8CF7-D288-4D7F-8ADD-97C553056C3D',
          formats: [{width: 980, height: 240}, {width: 980, height: 120}]
        }]
      };

      expect(data).to.deep.equal(expectedQuery);
    });

    it('should pass gdpr false parameters', function() {
      sandbox.stub(utils, 'isSafariBrowser').callsFake(() => false);
      sandbox.stub(utils, 'cookiesAreEnabled').callsFake(() => true);
      let testRequest = clone(bidderRequest);
      testRequest.gdprConsent = {
        gdprApplies: false
      };
      let result = spec.buildRequests(testRequest.bids, testRequest);
      let data = JSON.parse(result.data);

      expect(result.url).to.equal('//lwadm.com/ad');

      let expectedQuery = {
        auctionId: 'F7557995-65F5-4682-8782-7D5D34D82A8C',
        publisherId: '26947112-2289-405D-88C1-A7340C57E63E',
        userId: 'user id',
        url: 'http://www.domain.com',
        seats: {'dsp': ['seat 1']},
        version: '1.1',
        cookieSupport: true,
        gdprApplies: false,
        adRequests: [{
          adUnitId: '9E153CED-61BC-479E-98DF-24DC0D01BA37',
          callerAdUnitId: 'panorama_d_1',
          bidId: '2ffb201a808da7',
          transactionId: '3D1C8CF7-D288-4D7F-8ADD-97C553056C3D',
          formats: [{width: 980, height: 240}, {width: 980, height: 120}]
        }]
      };

      expect(data).to.deep.equal(expectedQuery);
    });

    it('should pass no cookie support', function() {
      sandbox.stub(utils, 'cookiesAreEnabled').callsFake(() => false);
      sandbox.stub(utils, 'isSafariBrowser').callsFake(() => false);
      let result = spec.buildRequests(bidderRequest.bids, bidderRequest);
      let data = JSON.parse(result.data);

      expect(result.url).to.equal('//lwadm.com/ad');

      let expectedQuery = {
        auctionId: 'F7557995-65F5-4682-8782-7D5D34D82A8C',
        publisherId: '26947112-2289-405D-88C1-A7340C57E63E',
        userId: 'user id',
        url: 'http://www.domain.com',
        seats: {'dsp': ['seat 1']},
        version: '1.1',
        cookieSupport: false,
        adRequests: [{
          adUnitId: '9E153CED-61BC-479E-98DF-24DC0D01BA37',
          callerAdUnitId: 'panorama_d_1',
          bidId: '2ffb201a808da7',
          transactionId: '3D1C8CF7-D288-4D7F-8ADD-97C553056C3D',
          formats: [{width: 980, height: 240}, {width: 980, height: 120}]
        }]
      };

      expect(data).to.deep.equal(expectedQuery);
    });

    it('should pass no cookie support Safari', function() {
      sandbox.stub(utils, 'cookiesAreEnabled').callsFake(() => true);
      sandbox.stub(utils, 'isSafariBrowser').callsFake(() => true);
      let result = spec.buildRequests(bidderRequest.bids, bidderRequest);
      let data = JSON.parse(result.data);

      expect(result.url).to.equal('//lwadm.com/ad');

      let expectedQuery = {
        auctionId: 'F7557995-65F5-4682-8782-7D5D34D82A8C',
        publisherId: '26947112-2289-405D-88C1-A7340C57E63E',
        userId: 'user id',
        url: 'http://www.domain.com',
        seats: {'dsp': ['seat 1']},
        version: '1.1',
        cookieSupport: false,
        adRequests: [{
          adUnitId: '9E153CED-61BC-479E-98DF-24DC0D01BA37',
          callerAdUnitId: 'panorama_d_1',
          bidId: '2ffb201a808da7',
          transactionId: '3D1C8CF7-D288-4D7F-8ADD-97C553056C3D',
          formats: [{width: 980, height: 240}, {width: 980, height: 120}]
        }]
      };

      expect(data).to.deep.equal(expectedQuery);
    });

    it('should use params.url, then config pageUrl, then getTopWindowUrl', function() {
      let testRequest = clone(bidderRequest);
      sandbox.stub(utils, 'getTopWindowUrl').callsFake(() => 'http://www.topurl.com');

      let result = spec.buildRequests(testRequest.bids, testRequest);
      let data = JSON.parse(result.data);

      expect(data.url).to.equal('http://www.domain.com');

      delete testRequest.bids[0].params.url;

      result = spec.buildRequests(testRequest.bids, testRequest);
      data = JSON.parse(result.data);

      expect(data.url).to.equal('http://www.topurl.com');

      let origGetConfig = config.getConfig;
      sandbox.stub(config, 'getConfig').callsFake(function (key) {
        if (key === 'pageUrl') {
          return 'http://www.configurl.com';
        }
        return origGetConfig.apply(config, arguments);
      });

      result = spec.buildRequests(testRequest.bids, testRequest);
      data = JSON.parse(result.data);

      expect(data.url).to.equal('http://www.configurl.com');
    });

    it('should make use of pubcid if available', function() {
      sandbox.stub(utils, 'isSafariBrowser').callsFake(() => false);
      sandbox.stub(utils, 'cookiesAreEnabled').callsFake(() => true);
      let testbidRequest = clone(bidderRequest);
      delete testbidRequest.bids[0].params.userId;
      testbidRequest.bids[0].crumbs = {pubcid: 'pubcid 123'};
      let result = spec.buildRequests(testbidRequest.bids, testbidRequest);
      let data = JSON.parse(result.data);

      expect(result.url).to.equal('//lwadm.com/ad');

      let expectedQuery = {
        auctionId: 'F7557995-65F5-4682-8782-7D5D34D82A8C',
        publisherId: '26947112-2289-405D-88C1-A7340C57E63E',
        userId: 'pubcid 123',
        url: 'http://www.domain.com',
        seats: {'dsp': ['seat 1']},
        version: '1.1',
        cookieSupport: true,
        adRequests: [{
          adUnitId: '9E153CED-61BC-479E-98DF-24DC0D01BA37',
          callerAdUnitId: 'panorama_d_1',
          bidId: '2ffb201a808da7',
          transactionId: '3D1C8CF7-D288-4D7F-8ADD-97C553056C3D',
          formats: [{width: 980, height: 240}, {width: 980, height: 120}]
        }]
      };

      expect(data).to.deep.equal(expectedQuery);
    });

    it('should make userId take precedence over pubcid', function() {
      sandbox.stub(utils, 'isSafariBrowser').callsFake(() => false);
      sandbox.stub(utils, 'cookiesAreEnabled').callsFake(() => true);
      let testbidRequest = clone(bidderRequest);
      testbidRequest.bids[0].crumbs = {pubcid: 'pubcid 123'};
      let result = spec.buildRequests(testbidRequest.bids, testbidRequest);
      let data = JSON.parse(result.data);

      expect(result.url).to.equal('//lwadm.com/ad');

      let expectedQuery = {
        auctionId: 'F7557995-65F5-4682-8782-7D5D34D82A8C',
        publisherId: '26947112-2289-405D-88C1-A7340C57E63E',
        userId: 'user id',
        url: 'http://www.domain.com',
        seats: {'dsp': ['seat 1']},
        version: '1.1',
        cookieSupport: true,
        adRequests: [{
          adUnitId: '9E153CED-61BC-479E-98DF-24DC0D01BA37',
          callerAdUnitId: 'panorama_d_1',
          bidId: '2ffb201a808da7',
          transactionId: '3D1C8CF7-D288-4D7F-8ADD-97C553056C3D',
          formats: [{width: 980, height: 240}, {width: 980, height: 120}]
        }]
      };

      expect(data).to.deep.equal(expectedQuery);
    });
  });

  describe('interpretResponse', function () {
    it('should handle single success response', function() {
      let lwResponse = {
        ads: [
          {
            id: '28e5ddf4-3c01-11e8-86a7-0a44794250d4',
            callerId: 'site_outsider_0',
            tag: '<span>ad</span>',
            width: 300,
            height: 250,
            cpmBid: 2.565917,
            bidId: '32e50fad901ae89',
            auctionId: '13e674db-d4d8-4e19-9d28-ff38177db8bf',
            creativeId: '52cbd598-2715-4c43-a06f-229fc170f945:427077',
            ttl: 120
          }
        ],
        currency: 'USD'
      };

      let expectedResponse = [{
        requestId: '32e50fad901ae89',
        bidderCode: 'livewrapped',
        cpm: 2.565917,
        width: 300,
        height: 250,
        ad: '<span>ad</span>',
        ttl: 120,
        creativeId: '52cbd598-2715-4c43-a06f-229fc170f945:427077',
        netRevenue: true,
        currency: 'USD'
      }];

      let bids = spec.interpretResponse({body: lwResponse});

      expect(bids).to.deep.equal(expectedResponse);
    })

    it('should handle multiple success response', function() {
      let lwResponse = {
        ads: [
          {
            id: '28e5ddf4-3c01-11e8-86a7-0a44794250d4',
            callerId: 'site_outsider_0',
            tag: '<span>ad1</span>',
            width: 300,
            height: 250,
            cpmBid: 2.565917,
            bidId: '32e50fad901ae89',
            auctionId: '13e674db-d4d8-4e19-9d28-ff38177db8bf',
            creativeId: '52cbd598-2715-4c43-a06f-229fc170f945:427077',
            ttl: 120
          },
          {
            id: '38e5ddf4-3c01-11e8-86a7-0a44794250d4',
            callerId: 'site_outsider_1',
            tag: '<span>ad2</span>',
            width: 980,
            height: 240,
            cpmBid: 3.565917,
            bidId: '42e50fad901ae89',
            auctionId: '13e674db-d4d8-4e19-9d28-ff38177db8bf',
            creativeId: '62cbd598-2715-4c43-a06f-229fc170f945:427077',
            ttl: 120
          }
        ],
        currency: 'USD'
      };

      let expectedResponse = [{
        requestId: '32e50fad901ae89',
        bidderCode: 'livewrapped',
        cpm: 2.565917,
        width: 300,
        height: 250,
        ad: '<span>ad1</span>',
        ttl: 120,
        creativeId: '52cbd598-2715-4c43-a06f-229fc170f945:427077',
        netRevenue: true,
        currency: 'USD'
      }, {
        requestId: '42e50fad901ae89',
        bidderCode: 'livewrapped',
        cpm: 3.565917,
        width: 980,
        height: 240,
        ad: '<span>ad2</span>',
        ttl: 120,
        creativeId: '62cbd598-2715-4c43-a06f-229fc170f945:427077',
        netRevenue: true,
        currency: 'USD'
      }];

      let bids = spec.interpretResponse({body: lwResponse});

      expect(bids).to.deep.equal(expectedResponse);
    })
  });

  describe('user sync', function () {
    let serverResponses;

    beforeEach(function () {
      serverResponses = [{
        body: {
          pixels: [
            {type: 'Redirect', url: 'http://pixelsync'},
            {type: 'Iframe', url: 'http://iframesync'}
          ]
        }
      }];
    });

    it('should return empty if no server responses', function() {
      let syncs = spec.getUserSyncs({
        pixelEnabled: true,
        iframeEnabled: true
      }, []);

      let expectedResponse = [];

      expect(syncs).to.deep.equal(expectedResponse)
    });

    it('should return empty if no user sync', function() {
      let syncs = spec.getUserSyncs({
        pixelEnabled: true,
        iframeEnabled: true
      }, [{body: {}}]);

      let expectedResponse = [];

      expect(syncs).to.deep.equal(expectedResponse)
    });

    it('should returns pixel and iframe user sync', function() {
      let syncs = spec.getUserSyncs({
        pixelEnabled: true,
        iframeEnabled: true
      }, serverResponses);

      let expectedResponse = [{type: 'image', url: 'http://pixelsync'}, {type: 'iframe', url: 'http://iframesync'}];

      expect(syncs).to.deep.equal(expectedResponse)
    });

    it('should returns pixel only if iframe not supported user sync', function() {
      let syncs = spec.getUserSyncs({
        pixelEnabled: true,
        iframeEnabled: false
      }, serverResponses);

      let expectedResponse = [{type: 'image', url: 'http://pixelsync'}];

      expect(syncs).to.deep.equal(expectedResponse)
    });

    it('should returns iframe only if pixel not supported user sync', function() {
      let syncs = spec.getUserSyncs({
        pixelEnabled: false,
        iframeEnabled: true
      }, serverResponses);

      let expectedResponse = [{type: 'iframe', url: 'http://iframesync'}];

      expect(syncs).to.deep.equal(expectedResponse)
    });
  });
});

function clone(obj) {
  return JSON.parse(JSON.stringify(obj));
}
