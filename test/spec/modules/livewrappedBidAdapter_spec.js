import {expect} from 'chai';
import {spec, storage} from 'modules/livewrappedBidAdapter.js';
import {config} from 'src/config.js';
import * as utils from 'src/utils.js';
import { NATIVE, VIDEO } from 'src/mediaTypes.js';

describe('Livewrapped adapter tests', function () {
  let sandbox,
    bidderRequest;

  beforeEach(function () {
    sandbox = sinon.sandbox.create();

    window.livewrapped = undefined;

    config.setConfig({
      device: { w: 100, h: 100 }
    });

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
            url: 'https://www.domain.com',
            seats: {'dsp': ['seat 1']}
          },
          adUnitCode: 'panorama_d_1',
          sizes: [[980, 240], [980, 120]],
          bidId: '2ffb201a808da7',
          bidderRequestId: '178e34bad3658f',
          auctionId: 'F7557995-65F5-4682-8782-7D5D34D82A8C',
          ortb2Imp: {
            ext: {
              tid: '3D1C8CF7-D288-4D7F-8ADD-97C553056C3D',
            }
          },
        }
      ],
      start: 1472239426002,
      auctionStart: 1472239426000,
      timeout: 5000
    };
  });

  afterEach(function () {
    sandbox.restore();
    config.resetConfig();
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
      sandbox.stub(storage, 'cookiesAreEnabled').callsFake(() => true);
      let result = spec.buildRequests(bidderRequest.bids, bidderRequest);
      let data = JSON.parse(result.data);

      expect(result.url).to.equal('https://lwadm.com/ad');

      let expectedQuery = {
        auctionId: 'F7557995-65F5-4682-8782-7D5D34D82A8C',
        publisherId: '26947112-2289-405D-88C1-A7340C57E63E',
        userId: 'user id',
        url: 'https://www.domain.com',
        seats: {'dsp': ['seat 1']},
        version: '1.4',
        width: 100,
        height: 100,
        cookieSupport: true,
        adRequests: [{
          adUnitId: '9E153CED-61BC-479E-98DF-24DC0D01BA37',
          callerAdUnitId: 'panorama_d_1',
          bidId: '2ffb201a808da7',
          formats: [{width: 980, height: 240}, {width: 980, height: 120}],
          rtbData: {
            ext: {
              tid: '3D1C8CF7-D288-4D7F-8ADD-97C553056C3D'
            },
          }
        }]
      };

      expect(data).to.deep.equal(expectedQuery);
    });

    it('should send ortb2Imp', function() {
      sandbox.stub(utils, 'isSafariBrowser').callsFake(() => false);
      sandbox.stub(storage, 'cookiesAreEnabled').callsFake(() => true);
      let ortb2ImpRequest = clone(bidderRequest);
      ortb2ImpRequest.bids[0].ortb2Imp.ext.data = {key: 'value'};
      let result = spec.buildRequests(ortb2ImpRequest.bids, ortb2ImpRequest);
      let data = JSON.parse(result.data);

      expect(result.url).to.equal('https://lwadm.com/ad');

      let expectedQuery = {
        auctionId: 'F7557995-65F5-4682-8782-7D5D34D82A8C',
        publisherId: '26947112-2289-405D-88C1-A7340C57E63E',
        userId: 'user id',
        url: 'https://www.domain.com',
        seats: {'dsp': ['seat 1']},
        version: '1.4',
        width: 100,
        height: 100,
        cookieSupport: true,
        adRequests: [{
          adUnitId: '9E153CED-61BC-479E-98DF-24DC0D01BA37',
          callerAdUnitId: 'panorama_d_1',
          bidId: '2ffb201a808da7',
          formats: [{width: 980, height: 240}, {width: 980, height: 120}],
          rtbData: {
            ext: {
              data: {key: 'value'},
              tid: '3D1C8CF7-D288-4D7F-8ADD-97C553056C3D'
            },
          }
        }]
      };

      expect(data).to.deep.equal(expectedQuery);
    });

    it('should make a well-formed multiple request object', function() {
      sandbox.stub(utils, 'isSafariBrowser').callsFake(() => false);
      sandbox.stub(storage, 'cookiesAreEnabled').callsFake(() => true);
      let multiplebidRequest = clone(bidderRequest);
      multiplebidRequest.bids.push(clone(bidderRequest.bids[0]));
      multiplebidRequest.bids[1].adUnitCode = 'box_d_1';
      multiplebidRequest.bids[1].sizes = [[300, 250]];
      multiplebidRequest.bids[1].bidId = '3ffb201a808da7';
      delete multiplebidRequest.bids[1].params.adUnitId;

      let result = spec.buildRequests(multiplebidRequest.bids, multiplebidRequest);
      let data = JSON.parse(result.data);

      expect(result.url).to.equal('https://lwadm.com/ad');

      let expectedQuery = {
        auctionId: 'F7557995-65F5-4682-8782-7D5D34D82A8C',
        publisherId: '26947112-2289-405D-88C1-A7340C57E63E',
        userId: 'user id',
        url: 'https://www.domain.com',
        seats: {'dsp': ['seat 1']},
        version: '1.4',
        width: 100,
        height: 100,
        cookieSupport: true,
        adRequests: [{
          adUnitId: '9E153CED-61BC-479E-98DF-24DC0D01BA37',
          callerAdUnitId: 'panorama_d_1',
          bidId: '2ffb201a808da7',
          rtbData: {
            ext: {
              tid: '3D1C8CF7-D288-4D7F-8ADD-97C553056C3D'
            },
          },
          formats: [{width: 980, height: 240}, {width: 980, height: 120}]
        }, {
          callerAdUnitId: 'box_d_1',
          bidId: '3ffb201a808da7',
          rtbData: {
            ext: {
              tid: '3D1C8CF7-D288-4D7F-8ADD-97C553056C3D'
            },
          },
          formats: [{width: 300, height: 250}]
        }]
      };

      expect(data).to.deep.equal(expectedQuery);
    });

    it('should make a well-formed single request object with AdUnitName', function() {
      sandbox.stub(utils, 'isSafariBrowser').callsFake(() => false);
      sandbox.stub(storage, 'cookiesAreEnabled').callsFake(() => true);
      let testbidRequest = clone(bidderRequest);
      testbidRequest.bids[0].params.adUnitName = 'caller id 1';
      delete testbidRequest.bids[0].params.adUnitId;
      let result = spec.buildRequests(testbidRequest.bids, testbidRequest);
      let data = JSON.parse(result.data);

      expect(result.url).to.equal('https://lwadm.com/ad');

      let expectedQuery = {
        auctionId: 'F7557995-65F5-4682-8782-7D5D34D82A8C',
        publisherId: '26947112-2289-405D-88C1-A7340C57E63E',
        userId: 'user id',
        url: 'https://www.domain.com',
        seats: {'dsp': ['seat 1']},
        version: '1.4',
        width: 100,
        height: 100,
        cookieSupport: true,
        adRequests: [{
          callerAdUnitId: 'caller id 1',
          bidId: '2ffb201a808da7',
          rtbData: {
            ext: {
              tid: '3D1C8CF7-D288-4D7F-8ADD-97C553056C3D'
            },
          },
          formats: [{width: 980, height: 240}, {width: 980, height: 120}]
        }]
      };

      expect(data).to.deep.equal(expectedQuery);
    });

    it('should make a well-formed single request object with less parameters', function() {
      sandbox.stub(utils, 'isSafariBrowser').callsFake(() => false);
      sandbox.stub(storage, 'cookiesAreEnabled').callsFake(() => true);
      let testbidRequest = clone(bidderRequest);
      delete testbidRequest.bids[0].params.userId;
      delete testbidRequest.bids[0].params.seats;
      delete testbidRequest.bids[0].params.adUnitId;
      let result = spec.buildRequests(testbidRequest.bids, testbidRequest);
      let data = JSON.parse(result.data);

      expect(result.url).to.equal('https://lwadm.com/ad');

      let expectedQuery = {
        auctionId: 'F7557995-65F5-4682-8782-7D5D34D82A8C',
        publisherId: '26947112-2289-405D-88C1-A7340C57E63E',
        url: 'https://www.domain.com',
        version: '1.4',
        width: 100,
        height: 100,
        cookieSupport: true,
        adRequests: [{
          callerAdUnitId: 'panorama_d_1',
          bidId: '2ffb201a808da7',
          rtbData: {
            ext: {
              tid: '3D1C8CF7-D288-4D7F-8ADD-97C553056C3D'
            },
          },
          formats: [{width: 980, height: 240}, {width: 980, height: 120}]
        }]
      };

      expect(data).to.deep.equal(expectedQuery);
    });

    it('should make a well-formed single request object with less parameters, no publisherId', function() {
      sandbox.stub(utils, 'isSafariBrowser').callsFake(() => false);
      sandbox.stub(storage, 'cookiesAreEnabled').callsFake(() => true);
      let testbidRequest = clone(bidderRequest);
      delete testbidRequest.bids[0].params.userId;
      delete testbidRequest.bids[0].params.seats;
      delete testbidRequest.bids[0].params.publisherId;
      let result = spec.buildRequests(testbidRequest.bids, testbidRequest);
      let data = JSON.parse(result.data);

      expect(result.url).to.equal('https://lwadm.com/ad');

      let expectedQuery = {
        auctionId: 'F7557995-65F5-4682-8782-7D5D34D82A8C',
        url: 'https://www.domain.com',
        version: '1.4',
        width: 100,
        height: 100,
        cookieSupport: true,
        adRequests: [{
          adUnitId: '9E153CED-61BC-479E-98DF-24DC0D01BA37',
          callerAdUnitId: 'panorama_d_1',
          bidId: '2ffb201a808da7',
          rtbData: {
            ext: {
              tid: '3D1C8CF7-D288-4D7F-8ADD-97C553056C3D'
            },
          },
          formats: [{width: 980, height: 240}, {width: 980, height: 120}]
        }]
      };

      expect(data).to.deep.equal(expectedQuery);
    });

    it('should make a well-formed single request object with app parameters', function() {
      sandbox.stub(utils, 'isSafariBrowser').callsFake(() => false);
      sandbox.stub(storage, 'cookiesAreEnabled').callsFake(() => true);
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
        url: 'https://www.domain.com',
        version: '1.4',
        width: 100,
        height: 100,
        deviceId: 'deviceid',
        ifa: 'ifa',
        cookieSupport: true,
        adRequests: [{
          callerAdUnitId: 'panorama_d_1',
          bidId: '2ffb201a808da7',
          rtbData: {
            ext: {
              tid: '3D1C8CF7-D288-4D7F-8ADD-97C553056C3D'
            },
          },
          formats: [{width: 980, height: 240}, {width: 980, height: 120}]
        }]
      };

      expect(data).to.deep.equal(expectedQuery);
    });

    it('should make a well-formed single request object with debug parameters', function() {
      sandbox.stub(utils, 'isSafariBrowser').callsFake(() => false);
      sandbox.stub(storage, 'cookiesAreEnabled').callsFake(() => true);
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
        url: 'https://www.domain.com',
        version: '1.4',
        width: 100,
        height: 100,
        tid: 'tracking id',
        test: true,
        cookieSupport: true,
        adRequests: [{
          callerAdUnitId: 'panorama_d_1',
          bidId: '2ffb201a808da7',
          rtbData: {
            ext: {
              tid: '3D1C8CF7-D288-4D7F-8ADD-97C553056C3D'
            },
          },
          formats: [{width: 980, height: 240}, {width: 980, height: 120}]
        }]
      };

      expect(data).to.deep.equal(expectedQuery);
    });

    it('should make a well-formed single request object with optional parameters', function() {
      sandbox.stub(utils, 'isSafariBrowser').callsFake(() => false);
      sandbox.stub(storage, 'cookiesAreEnabled').callsFake(() => true);
      let testbidRequest = clone(bidderRequest);
      delete testbidRequest.bids[0].params.userId;
      delete testbidRequest.bids[0].params.seats;
      delete testbidRequest.bids[0].params.adUnitId;
      testbidRequest.bids[0].params.options = {keyvalues: [{key: 'key', value: 'value'}]};
      let result = spec.buildRequests(testbidRequest.bids, testbidRequest);
      let data = JSON.parse(result.data);

      let expectedQuery = {
        auctionId: 'F7557995-65F5-4682-8782-7D5D34D82A8C',
        publisherId: '26947112-2289-405D-88C1-A7340C57E63E',
        url: 'https://www.domain.com',
        version: '1.4',
        width: 100,
        height: 100,
        cookieSupport: true,
        adRequests: [{
          callerAdUnitId: 'panorama_d_1',
          bidId: '2ffb201a808da7',
          rtbData: {
            ext: {
              tid: '3D1C8CF7-D288-4D7F-8ADD-97C553056C3D'
            },
          },
          formats: [{width: 980, height: 240}, {width: 980, height: 120}],
          options: {keyvalues: [{key: 'key', value: 'value'}]}
        }]
      };

      expect(data).to.deep.equal(expectedQuery);
    });

    it('should make a well-formed single request object with ad blocker recovered parameter', function() {
      sandbox.stub(utils, 'getWindowTop').returns({ I12C: { Morph: 1 } });
      sandbox.stub(utils, 'isSafariBrowser').callsFake(() => false);
      sandbox.stub(storage, 'cookiesAreEnabled').callsFake(() => true);
      let testbidRequest = clone(bidderRequest);
      delete testbidRequest.bids[0].params.userId;
      delete testbidRequest.bids[0].params.seats;
      delete testbidRequest.bids[0].params.adUnitId;
      let result = spec.buildRequests(testbidRequest.bids, testbidRequest);
      let data = JSON.parse(result.data);

      let expectedQuery = {
        auctionId: 'F7557995-65F5-4682-8782-7D5D34D82A8C',
        publisherId: '26947112-2289-405D-88C1-A7340C57E63E',
        url: 'https://www.domain.com',
        version: '1.4',
        width: 100,
        height: 100,
        cookieSupport: true,
        rcv: true,
        adRequests: [{
          callerAdUnitId: 'panorama_d_1',
          bidId: '2ffb201a808da7',
          rtbData: {
            ext: {
              tid: '3D1C8CF7-D288-4D7F-8ADD-97C553056C3D'
            },
          },
          formats: [{width: 980, height: 240}, {width: 980, height: 120}]
        }]
      };

      expect(data).to.deep.equal(expectedQuery);
    });

    it('should make a well-formed single request object with native only parameters', function() {
      sandbox.stub(utils, 'isSafariBrowser').callsFake(() => false);
      sandbox.stub(storage, 'cookiesAreEnabled').callsFake(() => true);
      let testbidRequest = clone(bidderRequest);
      delete testbidRequest.bids[0].params.userId;
      delete testbidRequest.bids[0].params.seats;
      delete testbidRequest.bids[0].params.adUnitId;
      testbidRequest.bids[0].mediaTypes = {'native': {'nativedata': 'content parsed serverside only'}};
      let result = spec.buildRequests(testbidRequest.bids, testbidRequest);
      let data = JSON.parse(result.data);

      let expectedQuery = {
        auctionId: 'F7557995-65F5-4682-8782-7D5D34D82A8C',
        publisherId: '26947112-2289-405D-88C1-A7340C57E63E',
        url: 'https://www.domain.com',
        version: '1.4',
        width: 100,
        height: 100,
        cookieSupport: true,
        adRequests: [{
          callerAdUnitId: 'panorama_d_1',
          bidId: '2ffb201a808da7',
          rtbData: {
            ext: {
              tid: '3D1C8CF7-D288-4D7F-8ADD-97C553056C3D'
            },
          },
          formats: [{width: 980, height: 240}, {width: 980, height: 120}],
          native: {'nativedata': 'content parsed serverside only'}
        }]
      };

      expect(data).to.deep.equal(expectedQuery);
    });

    it('should make a well-formed single request object with native and banner parameters', function() {
      sandbox.stub(utils, 'isSafariBrowser').callsFake(() => false);
      sandbox.stub(storage, 'cookiesAreEnabled').callsFake(() => true);
      let testbidRequest = clone(bidderRequest);
      delete testbidRequest.bids[0].params.userId;
      delete testbidRequest.bids[0].params.seats;
      delete testbidRequest.bids[0].params.adUnitId;
      testbidRequest.bids[0].mediaTypes = {'native': {'nativedata': 'content parsed serverside only'}, 'banner': {'sizes': [[980, 240], [980, 120]]}};
      let result = spec.buildRequests(testbidRequest.bids, testbidRequest);
      let data = JSON.parse(result.data);

      let expectedQuery = {
        auctionId: 'F7557995-65F5-4682-8782-7D5D34D82A8C',
        publisherId: '26947112-2289-405D-88C1-A7340C57E63E',
        url: 'https://www.domain.com',
        version: '1.4',
        width: 100,
        height: 100,
        cookieSupport: true,
        adRequests: [{
          callerAdUnitId: 'panorama_d_1',
          bidId: '2ffb201a808da7',
          rtbData: {
            ext: {
              tid: '3D1C8CF7-D288-4D7F-8ADD-97C553056C3D'
            },
          },
          formats: [{width: 980, height: 240}, {width: 980, height: 120}],
          native: {'nativedata': 'content parsed serverside only'},
          banner: true
        }]
      };

      expect(data).to.deep.equal(expectedQuery);
    });

    it('should make a well-formed single request object with video only parameters', function() {
      sandbox.stub(utils, 'isSafariBrowser').callsFake(() => false);
      sandbox.stub(storage, 'cookiesAreEnabled').callsFake(() => true);
      let testbidRequest = clone(bidderRequest);
      delete testbidRequest.bids[0].params.userId;
      delete testbidRequest.bids[0].params.seats;
      delete testbidRequest.bids[0].params.adUnitId;
      testbidRequest.bids[0].mediaTypes = {'video': {'videodata': 'content parsed serverside only'}};
      let result = spec.buildRequests(testbidRequest.bids, testbidRequest);
      let data = JSON.parse(result.data);

      let expectedQuery = {
        auctionId: 'F7557995-65F5-4682-8782-7D5D34D82A8C',
        publisherId: '26947112-2289-405D-88C1-A7340C57E63E',
        url: 'https://www.domain.com',
        version: '1.4',
        width: 100,
        height: 100,
        cookieSupport: true,
        adRequests: [{
          callerAdUnitId: 'panorama_d_1',
          bidId: '2ffb201a808da7',
          rtbData: {
            ext: {
              tid: '3D1C8CF7-D288-4D7F-8ADD-97C553056C3D'
            },
          },
          formats: [{width: 980, height: 240}, {width: 980, height: 120}],
          video: {'videodata': 'content parsed serverside only'}
        }]
      };

      expect(data).to.deep.equal(expectedQuery);
    });

    it('should use app objects', function() {
      sandbox.stub(utils, 'isSafariBrowser').callsFake(() => false);
      sandbox.stub(storage, 'cookiesAreEnabled').callsFake(() => true);

      let testbidRequest = clone(bidderRequest);
      delete testbidRequest.bids[0].params.url;

      let origGetConfig = config.getConfig;
      sandbox.stub(config, 'getConfig').callsFake(function (key) {
        if (key === 'app') {
          return {bundle: 'bundle', domain: 'https://appdomain.com'};
        }
        if (key === 'device') {
          return {ifa: 'ifa', w: 300, h: 200};
        }
        return origGetConfig.apply(config, arguments);
      });

      let result = spec.buildRequests(testbidRequest.bids, testbidRequest);
      let data = JSON.parse(result.data);

      expect(result.url).to.equal('https://lwadm.com/ad');

      let expectedQuery = {
        auctionId: 'F7557995-65F5-4682-8782-7D5D34D82A8C',
        publisherId: '26947112-2289-405D-88C1-A7340C57E63E',
        userId: 'user id',
        url: 'https://appdomain.com',
        seats: {'dsp': ['seat 1']},
        version: '1.4',
        width: 300,
        height: 200,
        ifa: 'ifa',
        bundle: 'bundle',
        cookieSupport: true,
        adRequests: [{
          adUnitId: '9E153CED-61BC-479E-98DF-24DC0D01BA37',
          callerAdUnitId: 'panorama_d_1',
          bidId: '2ffb201a808da7',
          rtbData: {
            ext: {
              tid: '3D1C8CF7-D288-4D7F-8ADD-97C553056C3D'
            },
          },
          formats: [{width: 980, height: 240}, {width: 980, height: 120}]
        }]
      };

      expect(data).to.deep.equal(expectedQuery);
    });

    it('should use mediaTypes.banner.sizes before legacy sizes', function() {
      sandbox.stub(utils, 'isSafariBrowser').callsFake(() => false);
      sandbox.stub(storage, 'cookiesAreEnabled').callsFake(() => true);
      let testbidRequest = clone(bidderRequest);
      delete testbidRequest.bids[0].params.userId;
      delete testbidRequest.bids[0].params.seats;
      delete testbidRequest.bids[0].params.adUnitId;
      testbidRequest.bids[0].mediaTypes = {'banner': {'sizes': [[728, 90]]}};
      let result = spec.buildRequests(testbidRequest.bids, testbidRequest);
      let data = JSON.parse(result.data);

      let expectedQuery = {
        auctionId: 'F7557995-65F5-4682-8782-7D5D34D82A8C',
        publisherId: '26947112-2289-405D-88C1-A7340C57E63E',
        url: 'https://www.domain.com',
        version: '1.4',
        width: 100,
        height: 100,
        cookieSupport: true,
        adRequests: [{
          callerAdUnitId: 'panorama_d_1',
          bidId: '2ffb201a808da7',
          rtbData: {
            ext: {
              tid: '3D1C8CF7-D288-4D7F-8ADD-97C553056C3D'
            },
          },
          formats: [{width: 728, height: 90}]
        }]
      };

      expect(data).to.deep.equal(expectedQuery);
    });

    it('should pass gdpr true parameters', function() {
      sandbox.stub(utils, 'isSafariBrowser').callsFake(() => false);
      sandbox.stub(storage, 'cookiesAreEnabled').callsFake(() => true);
      let testRequest = clone(bidderRequest);
      testRequest.gdprConsent = {
        gdprApplies: true,
        consentString: 'test'
      };
      let result = spec.buildRequests(testRequest.bids, testRequest);
      let data = JSON.parse(result.data);

      expect(result.url).to.equal('https://lwadm.com/ad');

      let expectedQuery = {
        auctionId: 'F7557995-65F5-4682-8782-7D5D34D82A8C',
        publisherId: '26947112-2289-405D-88C1-A7340C57E63E',
        userId: 'user id',
        url: 'https://www.domain.com',
        seats: {'dsp': ['seat 1']},
        version: '1.4',
        width: 100,
        height: 100,
        cookieSupport: true,
        gdprApplies: true,
        gdprConsent: 'test',
        adRequests: [{
          adUnitId: '9E153CED-61BC-479E-98DF-24DC0D01BA37',
          callerAdUnitId: 'panorama_d_1',
          bidId: '2ffb201a808da7',
          rtbData: {
            ext: {
              tid: '3D1C8CF7-D288-4D7F-8ADD-97C553056C3D'
            },
          },
          formats: [{width: 980, height: 240}, {width: 980, height: 120}]
        }]
      };

      expect(data).to.deep.equal(expectedQuery);
    });

    it('should pass gdpr false parameters', function() {
      sandbox.stub(utils, 'isSafariBrowser').callsFake(() => false);
      sandbox.stub(storage, 'cookiesAreEnabled').callsFake(() => true);
      let testRequest = clone(bidderRequest);
      testRequest.gdprConsent = {
        gdprApplies: false
      };
      let result = spec.buildRequests(testRequest.bids, testRequest);
      let data = JSON.parse(result.data);

      expect(result.url).to.equal('https://lwadm.com/ad');

      let expectedQuery = {
        auctionId: 'F7557995-65F5-4682-8782-7D5D34D82A8C',
        publisherId: '26947112-2289-405D-88C1-A7340C57E63E',
        userId: 'user id',
        url: 'https://www.domain.com',
        seats: {'dsp': ['seat 1']},
        version: '1.4',
        width: 100,
        height: 100,
        cookieSupport: true,
        gdprApplies: false,
        adRequests: [{
          adUnitId: '9E153CED-61BC-479E-98DF-24DC0D01BA37',
          callerAdUnitId: 'panorama_d_1',
          bidId: '2ffb201a808da7',
          rtbData: {
            ext: {
              tid: '3D1C8CF7-D288-4D7F-8ADD-97C553056C3D'
            },
          },
          formats: [{width: 980, height: 240}, {width: 980, height: 120}]
        }]
      };

      expect(data).to.deep.equal(expectedQuery);
    });

    it('should pass us privacy parameter', function() {
      sandbox.stub(utils, 'isSafariBrowser').callsFake(() => false);
      sandbox.stub(storage, 'cookiesAreEnabled').callsFake(() => true);
      let testRequest = clone(bidderRequest);
      testRequest.uspConsent = '1---';
      let result = spec.buildRequests(testRequest.bids, testRequest);
      let data = JSON.parse(result.data);

      expect(result.url).to.equal('https://lwadm.com/ad');

      let expectedQuery = {
        auctionId: 'F7557995-65F5-4682-8782-7D5D34D82A8C',
        publisherId: '26947112-2289-405D-88C1-A7340C57E63E',
        userId: 'user id',
        url: 'https://www.domain.com',
        seats: {'dsp': ['seat 1']},
        version: '1.4',
        width: 100,
        height: 100,
        cookieSupport: true,
        usPrivacy: '1---',
        adRequests: [{
          adUnitId: '9E153CED-61BC-479E-98DF-24DC0D01BA37',
          callerAdUnitId: 'panorama_d_1',
          bidId: '2ffb201a808da7',
          rtbData: {
            ext: {
              tid: '3D1C8CF7-D288-4D7F-8ADD-97C553056C3D'
            },
          },
          formats: [{width: 980, height: 240}, {width: 980, height: 120}]
        }]
      };

      expect(data).to.deep.equal(expectedQuery);
    });

    it('should pass coppa parameter', function() {
      sandbox.stub(utils, 'isSafariBrowser').callsFake(() => false);
      sandbox.stub(storage, 'cookiesAreEnabled').callsFake(() => true);

      let origGetConfig = config.getConfig;
      sandbox.stub(config, 'getConfig').callsFake(function (key) {
        if (key === 'coppa') {
          return true;
        }
        return origGetConfig.apply(config, arguments);
      });

      let result = spec.buildRequests(bidderRequest.bids, bidderRequest);
      let data = JSON.parse(result.data);

      expect(result.url).to.equal('https://lwadm.com/ad');

      let expectedQuery = {
        auctionId: 'F7557995-65F5-4682-8782-7D5D34D82A8C',
        publisherId: '26947112-2289-405D-88C1-A7340C57E63E',
        userId: 'user id',
        url: 'https://www.domain.com',
        seats: {'dsp': ['seat 1']},
        version: '1.4',
        width: 100,
        height: 100,
        cookieSupport: true,
        coppa: true,
        adRequests: [{
          adUnitId: '9E153CED-61BC-479E-98DF-24DC0D01BA37',
          callerAdUnitId: 'panorama_d_1',
          bidId: '2ffb201a808da7',
          rtbData: {
            ext: {
              tid: '3D1C8CF7-D288-4D7F-8ADD-97C553056C3D'
            },
          },
          formats: [{width: 980, height: 240}, {width: 980, height: 120}]
        }]
      };

      expect(data).to.deep.equal(expectedQuery);
    });

    it('should pass no cookie support', function() {
      sandbox.stub(storage, 'cookiesAreEnabled').callsFake(() => false);
      sandbox.stub(utils, 'isSafariBrowser').callsFake(() => false);
      let result = spec.buildRequests(bidderRequest.bids, bidderRequest);
      let data = JSON.parse(result.data);

      expect(result.url).to.equal('https://lwadm.com/ad');

      let expectedQuery = {
        auctionId: 'F7557995-65F5-4682-8782-7D5D34D82A8C',
        publisherId: '26947112-2289-405D-88C1-A7340C57E63E',
        userId: 'user id',
        url: 'https://www.domain.com',
        seats: {'dsp': ['seat 1']},
        version: '1.4',
        width: 100,
        height: 100,
        cookieSupport: false,
        adRequests: [{
          adUnitId: '9E153CED-61BC-479E-98DF-24DC0D01BA37',
          callerAdUnitId: 'panorama_d_1',
          bidId: '2ffb201a808da7',
          rtbData: {
            ext: {
              tid: '3D1C8CF7-D288-4D7F-8ADD-97C553056C3D'
            },
          },
          formats: [{width: 980, height: 240}, {width: 980, height: 120}]
        }]
      };

      expect(data).to.deep.equal(expectedQuery);
    });

    it('should pass no cookie support Safari', function() {
      sandbox.stub(storage, 'cookiesAreEnabled').callsFake(() => true);
      sandbox.stub(utils, 'isSafariBrowser').callsFake(() => true);
      let result = spec.buildRequests(bidderRequest.bids, bidderRequest);
      let data = JSON.parse(result.data);

      expect(result.url).to.equal('https://lwadm.com/ad');

      let expectedQuery = {
        auctionId: 'F7557995-65F5-4682-8782-7D5D34D82A8C',
        publisherId: '26947112-2289-405D-88C1-A7340C57E63E',
        userId: 'user id',
        url: 'https://www.domain.com',
        seats: {'dsp': ['seat 1']},
        version: '1.4',
        width: 100,
        height: 100,
        cookieSupport: false,
        adRequests: [{
          adUnitId: '9E153CED-61BC-479E-98DF-24DC0D01BA37',
          callerAdUnitId: 'panorama_d_1',
          bidId: '2ffb201a808da7',
          rtbData: {
            ext: {
              tid: '3D1C8CF7-D288-4D7F-8ADD-97C553056C3D'
            },
          },
          formats: [{width: 980, height: 240}, {width: 980, height: 120}]
        }]
      };

      expect(data).to.deep.equal(expectedQuery);
    });

    it('should use params.url, then bidderRequest.refererInfo.page', function() {
      let testRequest = clone(bidderRequest);
      testRequest.refererInfo = {page: 'https://www.topurl.com'};

      let result = spec.buildRequests(testRequest.bids, testRequest);
      let data = JSON.parse(result.data);

      expect(data.url).to.equal('https://www.domain.com');

      delete testRequest.bids[0].params.url;

      result = spec.buildRequests(testRequest.bids, testRequest);
      data = JSON.parse(result.data);

      expect(data.url).to.equal('https://www.topurl.com');
    });

    it('should make use of pubcid if available', function() {
      sandbox.stub(utils, 'isSafariBrowser').callsFake(() => false);
      sandbox.stub(storage, 'cookiesAreEnabled').callsFake(() => true);
      let testbidRequest = clone(bidderRequest);
      delete testbidRequest.bids[0].params.userId;
      testbidRequest.bids[0].crumbs = {pubcid: 'pubcid 123'};
      let result = spec.buildRequests(testbidRequest.bids, testbidRequest);
      let data = JSON.parse(result.data);

      expect(result.url).to.equal('https://lwadm.com/ad');

      let expectedQuery = {
        auctionId: 'F7557995-65F5-4682-8782-7D5D34D82A8C',
        publisherId: '26947112-2289-405D-88C1-A7340C57E63E',
        userId: 'pubcid 123',
        url: 'https://www.domain.com',
        seats: {'dsp': ['seat 1']},
        version: '1.4',
        width: 100,
        height: 100,
        cookieSupport: true,
        adRequests: [{
          adUnitId: '9E153CED-61BC-479E-98DF-24DC0D01BA37',
          callerAdUnitId: 'panorama_d_1',
          bidId: '2ffb201a808da7',
          rtbData: {
            ext: {
              tid: '3D1C8CF7-D288-4D7F-8ADD-97C553056C3D'
            },
          },
          formats: [{width: 980, height: 240}, {width: 980, height: 120}]
        }]
      };

      expect(data).to.deep.equal(expectedQuery);
    });

    it('should make userId take precedence over pubcid', function() {
      sandbox.stub(utils, 'isSafariBrowser').callsFake(() => false);
      sandbox.stub(storage, 'cookiesAreEnabled').callsFake(() => true);
      let testbidRequest = clone(bidderRequest);
      testbidRequest.bids[0].crumbs = {pubcid: 'pubcid 123'};
      let result = spec.buildRequests(testbidRequest.bids, testbidRequest);
      let data = JSON.parse(result.data);

      expect(result.url).to.equal('https://lwadm.com/ad');

      let expectedQuery = {
        auctionId: 'F7557995-65F5-4682-8782-7D5D34D82A8C',
        publisherId: '26947112-2289-405D-88C1-A7340C57E63E',
        userId: 'user id',
        url: 'https://www.domain.com',
        seats: {'dsp': ['seat 1']},
        version: '1.4',
        width: 100,
        height: 100,
        cookieSupport: true,
        adRequests: [{
          adUnitId: '9E153CED-61BC-479E-98DF-24DC0D01BA37',
          callerAdUnitId: 'panorama_d_1',
          bidId: '2ffb201a808da7',
          rtbData: {
            ext: {
              tid: '3D1C8CF7-D288-4D7F-8ADD-97C553056C3D'
            },
          },
          formats: [{width: 980, height: 240}, {width: 980, height: 120}]
        }]
      };

      expect(data).to.deep.equal(expectedQuery);
    });

    it('width and height should default to values from window when not set in config', function() {
      sandbox.stub(utils, 'isSafariBrowser').callsFake(() => false);
      sandbox.stub(storage, 'cookiesAreEnabled').callsFake(() => true);

      config.resetConfig();

      let testbidRequest = clone(bidderRequest);
      let result = spec.buildRequests(testbidRequest.bids, testbidRequest);
      let data = JSON.parse(result.data);

      expect(result.url).to.equal('https://lwadm.com/ad');

      let expectedQuery = {
        auctionId: 'F7557995-65F5-4682-8782-7D5D34D82A8C',
        publisherId: '26947112-2289-405D-88C1-A7340C57E63E',
        userId: 'user id',
        url: 'https://www.domain.com',
        seats: {'dsp': ['seat 1']},
        version: '1.4',
        width: window.innerWidth,
        height: window.innerHeight,
        cookieSupport: true,
        adRequests: [{
          adUnitId: '9E153CED-61BC-479E-98DF-24DC0D01BA37',
          callerAdUnitId: 'panorama_d_1',
          bidId: '2ffb201a808da7',
          rtbData: {
            ext: {
              tid: '3D1C8CF7-D288-4D7F-8ADD-97C553056C3D'
            },
          },
          formats: [{width: 980, height: 240}, {width: 980, height: 120}]
        }]
      };

      expect(data).to.deep.equal(expectedQuery);
    });
  });

  describe('price floors module', function() {
    it('price floors module disabled', function() {
      sandbox.stub(utils, 'isSafariBrowser').callsFake(() => false);
      sandbox.stub(storage, 'cookiesAreEnabled').callsFake(() => true);

      let testbidRequest = clone(bidderRequest);
      let result = spec.buildRequests(testbidRequest.bids, testbidRequest);
      let data = JSON.parse(result.data);

      expect(result.url).to.equal('https://lwadm.com/ad');

      let expectedQuery = {
        auctionId: 'F7557995-65F5-4682-8782-7D5D34D82A8C',
        publisherId: '26947112-2289-405D-88C1-A7340C57E63E',
        userId: 'user id',
        url: 'https://www.domain.com',
        seats: {'dsp': ['seat 1']},
        version: '1.4',
        width: 100,
        height: 100,
        cookieSupport: true,
        adRequests: [{
          adUnitId: '9E153CED-61BC-479E-98DF-24DC0D01BA37',
          callerAdUnitId: 'panorama_d_1',
          bidId: '2ffb201a808da7',
          rtbData: {
            ext: {
              tid: '3D1C8CF7-D288-4D7F-8ADD-97C553056C3D'
            },
          },
          formats: [{width: 980, height: 240}, {width: 980, height: 120}]
        }]
      };

      expect(data).to.deep.equal(expectedQuery);
    });

    it('getFloor does not return an object', function() {
      sandbox.stub(utils, 'isSafariBrowser').callsFake(() => false);
      sandbox.stub(storage, 'cookiesAreEnabled').callsFake(() => true);

      let testbidRequest = clone(bidderRequest);
      let bids = testbidRequest.bids.map(b => {
        b.getFloor = function () { return undefined; }
        return b;
      });
      let result = spec.buildRequests(bids, testbidRequest);
      let data = JSON.parse(result.data);

      expect(result.url).to.equal('https://lwadm.com/ad');

      let expectedQuery = {
        auctionId: 'F7557995-65F5-4682-8782-7D5D34D82A8C',
        publisherId: '26947112-2289-405D-88C1-A7340C57E63E',
        userId: 'user id',
        url: 'https://www.domain.com',
        seats: {'dsp': ['seat 1']},
        version: '1.4',
        width: 100,
        height: 100,
        cookieSupport: true,
        adRequests: [{
          adUnitId: '9E153CED-61BC-479E-98DF-24DC0D01BA37',
          callerAdUnitId: 'panorama_d_1',
          bidId: '2ffb201a808da7',
          rtbData: {
            ext: {
              tid: '3D1C8CF7-D288-4D7F-8ADD-97C553056C3D'
            },
          },
          formats: [{width: 980, height: 240}, {width: 980, height: 120}]
        }]
      };

      expect(data).to.deep.equal(expectedQuery);
    });

    it('getFloor returns a NaN floor', function() {
      sandbox.stub(utils, 'isSafariBrowser').callsFake(() => false);
      sandbox.stub(storage, 'cookiesAreEnabled').callsFake(() => true);

      let testbidRequest = clone(bidderRequest);
      let bids = testbidRequest.bids.map(b => {
        b.getFloor = function () { return { floor: undefined }; }
        return b;
      });
      let result = spec.buildRequests(bids, testbidRequest);
      let data = JSON.parse(result.data);

      expect(result.url).to.equal('https://lwadm.com/ad');

      let expectedQuery = {
        auctionId: 'F7557995-65F5-4682-8782-7D5D34D82A8C',
        publisherId: '26947112-2289-405D-88C1-A7340C57E63E',
        userId: 'user id',
        url: 'https://www.domain.com',
        seats: {'dsp': ['seat 1']},
        version: '1.4',
        width: 100,
        height: 100,
        cookieSupport: true,
        adRequests: [{
          adUnitId: '9E153CED-61BC-479E-98DF-24DC0D01BA37',
          callerAdUnitId: 'panorama_d_1',
          bidId: '2ffb201a808da7',
          rtbData: {
            ext: {
              tid: '3D1C8CF7-D288-4D7F-8ADD-97C553056C3D'
            },
          },
          formats: [{width: 980, height: 240}, {width: 980, height: 120}]
        }]
      };

      expect(data).to.deep.equal(expectedQuery);
    });

    it('getFloor returns unexpected currency', function() {
      sandbox.stub(utils, 'isSafariBrowser').callsFake(() => false);
      sandbox.stub(storage, 'cookiesAreEnabled').callsFake(() => true);

      let testbidRequest = clone(bidderRequest);
      let bids = testbidRequest.bids.map(b => {
        b.getFloor = function () { return { floor: 10, currency: 'EUR' }; }
        return b;
      });
      let result = spec.buildRequests(bids, testbidRequest);
      let data = JSON.parse(result.data);

      expect(result.url).to.equal('https://lwadm.com/ad');

      let expectedQuery = {
        auctionId: 'F7557995-65F5-4682-8782-7D5D34D82A8C',
        publisherId: '26947112-2289-405D-88C1-A7340C57E63E',
        userId: 'user id',
        url: 'https://www.domain.com',
        seats: {'dsp': ['seat 1']},
        version: '1.4',
        width: 100,
        height: 100,
        cookieSupport: true,
        adRequests: [{
          adUnitId: '9E153CED-61BC-479E-98DF-24DC0D01BA37',
          callerAdUnitId: 'panorama_d_1',
          bidId: '2ffb201a808da7',
          rtbData: {
            ext: {
              tid: '3D1C8CF7-D288-4D7F-8ADD-97C553056C3D'
            },
          },
          formats: [{width: 980, height: 240}, {width: 980, height: 120}]
        }]
      };

      expect(data).to.deep.equal(expectedQuery);
    });

    it('getFloor returns valid floor - ad server currency', function() {
      sandbox.stub(utils, 'isSafariBrowser').callsFake(() => false);
      sandbox.stub(storage, 'cookiesAreEnabled').callsFake(() => true);

      let origGetConfig = config.getConfig;
      sandbox.stub(config, 'getConfig').callsFake(function (key) {
        if (key === 'currency.adServerCurrency') {
          return 'EUR';
        }
        return origGetConfig.apply(config, arguments);
      });

      let testbidRequest = clone(bidderRequest);
      let bids = testbidRequest.bids.map(b => {
        b.getFloor = function () { return { floor: 10, currency: 'EUR' }; }
        return b;
      });
      let result = spec.buildRequests(bids, testbidRequest);
      let data = JSON.parse(result.data);

      expect(result.url).to.equal('https://lwadm.com/ad');

      let expectedQuery = {
        auctionId: 'F7557995-65F5-4682-8782-7D5D34D82A8C',
        publisherId: '26947112-2289-405D-88C1-A7340C57E63E',
        userId: 'user id',
        url: 'https://www.domain.com',
        seats: {'dsp': ['seat 1']},
        version: '1.4',
        width: 100,
        height: 100,
        cookieSupport: true,
        flrCur: 'EUR',
        adRequests: [{
          adUnitId: '9E153CED-61BC-479E-98DF-24DC0D01BA37',
          callerAdUnitId: 'panorama_d_1',
          bidId: '2ffb201a808da7',
          rtbData: {
            ext: {
              tid: '3D1C8CF7-D288-4D7F-8ADD-97C553056C3D'
            },
          },
          formats: [{width: 980, height: 240}, {width: 980, height: 120}],
          flr: 10
        }]
      };

      expect(data).to.deep.equal(expectedQuery);
    });

    it('getFloor returns valid floor - default currency', function() {
      sandbox.stub(utils, 'isSafariBrowser').callsFake(() => false);
      sandbox.stub(storage, 'cookiesAreEnabled').callsFake(() => true);

      let testbidRequest = clone(bidderRequest);
      let bids = testbidRequest.bids.map(b => {
        b.getFloor = function () { return { floor: 10, currency: 'USD' }; }
        return b;
      });
      let result = spec.buildRequests(bids, testbidRequest);
      let data = JSON.parse(result.data);

      expect(result.url).to.equal('https://lwadm.com/ad');

      let expectedQuery = {
        auctionId: 'F7557995-65F5-4682-8782-7D5D34D82A8C',
        publisherId: '26947112-2289-405D-88C1-A7340C57E63E',
        userId: 'user id',
        url: 'https://www.domain.com',
        seats: {'dsp': ['seat 1']},
        version: '1.4',
        width: 100,
        height: 100,
        cookieSupport: true,
        flrCur: 'USD',
        adRequests: [{
          adUnitId: '9E153CED-61BC-479E-98DF-24DC0D01BA37',
          callerAdUnitId: 'panorama_d_1',
          bidId: '2ffb201a808da7',
          rtbData: {
            ext: {
              tid: '3D1C8CF7-D288-4D7F-8ADD-97C553056C3D'
            },
          },
          formats: [{width: 980, height: 240}, {width: 980, height: 120}],
          flr: 10
        }]
      };

      expect(data).to.deep.equal(expectedQuery);
    });
  });

  it('should make use of user ids if available', function() {
    sandbox.stub(utils, 'isSafariBrowser').callsFake(() => false);
    sandbox.stub(storage, 'cookiesAreEnabled').callsFake(() => true);
    let testbidRequest = clone(bidderRequest);
    delete testbidRequest.bids[0].params.userId;
    testbidRequest.bids[0].userIdAsEids = [
      {
        'source': 'id5-sync.com',
        'uids': [{
          'id': 'ID5-id',
          'atype': 1,
          'ext': {
            'linkType': 2
          }
        }]
      },
      {
        'source': 'pubcid.org',
        'uids': [{
          'id': 'publisher-common-id',
          'atype': 1
        }]
      }
    ];

    let result = spec.buildRequests(testbidRequest.bids, testbidRequest);
    let data = JSON.parse(result.data);

    expect(data.rtbData.user.ext.eids).to.deep.equal(testbidRequest.bids[0].userIdAsEids);
  });

  it('should merge user ids with existing ortb2', function() {
    sandbox.stub(utils, 'isSafariBrowser').callsFake(() => false);
    sandbox.stub(storage, 'cookiesAreEnabled').callsFake(() => true);

    const ortb2 = {user: {ext: {prop: 'value'}}};

    let testbidRequest = {...clone(bidderRequest), ortb2};
    delete testbidRequest.bids[0].params.userId;
    testbidRequest.bids[0].userIdAsEids = [
      {
        'source': 'pubcid.org',
        'uids': [{
          'id': 'publisher-common-id',
          'atype': 1
        }]
      }
    ];

    let result = spec.buildRequests(testbidRequest.bids, testbidRequest);
    let data = JSON.parse(result.data);
    var expected = {user: {ext: {prop: 'value', eids: testbidRequest.bids[0].userIdAsEids}}}

    expect(data.rtbData).to.deep.equal(expected);
    expect(ortb2).to.deep.equal({user: {ext: {prop: 'value'}}});
  });

  it('should send schain object if available', function() {
    sandbox.stub(utils, 'isSafariBrowser').callsFake(() => false);
    sandbox.stub(storage, 'cookiesAreEnabled').callsFake(() => true);
    let testbidRequest = clone(bidderRequest);
    let schain = {
      'ver': '1.0',
      'complete': 1,
      'nodes': [
        {
          'asi': 'directseller.com',
          'sid': '00001',
          'rid': 'BidRequest1',
          'hp': 1
        }
      ]
    };

    testbidRequest.bids[0].schain = schain;

    let result = spec.buildRequests(testbidRequest.bids, testbidRequest);
    let data = JSON.parse(result.data);

    expect(data.schain).to.deep.equal(schain);
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
            ttl: 120,
            meta: undefined
          }
        ],
        currency: 'USD'
      };

      let expectedResponse = [{
        requestId: '32e50fad901ae89',
        cpm: 2.565917,
        width: 300,
        height: 250,
        ad: '<span>ad</span>',
        ttl: 120,
        creativeId: '52cbd598-2715-4c43-a06f-229fc170f945:427077',
        netRevenue: true,
        currency: 'USD',
        meta: undefined
      }];

      let bids = spec.interpretResponse({body: lwResponse});

      expect(bids).to.deep.equal(expectedResponse);
    })

    it('should handle single native success response', function() {
      let lwResponse = {
        ads: [
          {
            id: '28e5ddf4-3c01-11e8-86a7-0a44794250d4',
            callerId: 'site_outsider_0',
            tag: '{\'native\':\'native\'}',
            width: 300,
            height: 250,
            cpmBid: 2.565917,
            bidId: '32e50fad901ae89',
            auctionId: '13e674db-d4d8-4e19-9d28-ff38177db8bf',
            creativeId: '52cbd598-2715-4c43-a06f-229fc170f945:427077',
            native: {'native': 'native'},
            ttl: 120,
            meta: undefined
          }
        ],
        currency: 'USD'
      };

      let expectedResponse = [{
        requestId: '32e50fad901ae89',
        cpm: 2.565917,
        width: 300,
        height: 250,
        ad: '{\'native\':\'native\'}',
        ttl: 120,
        creativeId: '52cbd598-2715-4c43-a06f-229fc170f945:427077',
        netRevenue: true,
        currency: 'USD',
        meta: undefined,
        native: {'native': 'native'},
        mediaType: NATIVE
      }];

      let bids = spec.interpretResponse({body: lwResponse});

      expect(bids).to.deep.equal(expectedResponse);
    })

    it('should handle single video success response', function() {
      let lwResponse = {
        ads: [
          {
            id: '28e5ddf4-3c01-11e8-86a7-0a44794250d4',
            callerId: 'site_outsider_0',
            tag: 'VAST XML',
            video: {},
            width: 300,
            height: 250,
            cpmBid: 2.565917,
            bidId: '32e50fad901ae89',
            auctionId: '13e674db-d4d8-4e19-9d28-ff38177db8bf',
            creativeId: '52cbd598-2715-4c43-a06f-229fc170f945:427077',
            ttl: 120,
            meta: undefined
          }
        ],
        currency: 'USD'
      };

      let expectedResponse = [{
        requestId: '32e50fad901ae89',
        cpm: 2.565917,
        width: 300,
        height: 250,
        ad: 'VAST XML',
        ttl: 120,
        creativeId: '52cbd598-2715-4c43-a06f-229fc170f945:427077',
        netRevenue: true,
        currency: 'USD',
        meta: undefined,
        vastXml: 'VAST XML',
        mediaType: VIDEO
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
            ttl: 120,
            meta: undefined
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
            ttl: 120,
            meta: undefined
          }
        ],
        currency: 'USD'
      };

      let expectedResponse = [{
        requestId: '32e50fad901ae89',
        cpm: 2.565917,
        width: 300,
        height: 250,
        ad: '<span>ad1</span>',
        ttl: 120,
        creativeId: '52cbd598-2715-4c43-a06f-229fc170f945:427077',
        netRevenue: true,
        currency: 'USD',
        meta: undefined
      }, {
        requestId: '42e50fad901ae89',
        cpm: 3.565917,
        width: 980,
        height: 240,
        ad: '<span>ad2</span>',
        ttl: 120,
        creativeId: '62cbd598-2715-4c43-a06f-229fc170f945:427077',
        netRevenue: true,
        currency: 'USD',
        meta: undefined
      }];

      let bids = spec.interpretResponse({body: lwResponse});

      expect(bids).to.deep.equal(expectedResponse);
    })

    it('should return meta-data', function() {
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
            ttl: 120,
            meta: {metadata: 'metadata'}
          }
        ],
        currency: 'USD'
      };

      let expectedResponse = [{
        requestId: '32e50fad901ae89',
        cpm: 2.565917,
        width: 300,
        height: 250,
        ad: '<span>ad</span>',
        ttl: 120,
        creativeId: '52cbd598-2715-4c43-a06f-229fc170f945:427077',
        netRevenue: true,
        currency: 'USD',
        meta: {metadata: 'metadata'}
      }];

      let bids = spec.interpretResponse({body: lwResponse});

      expect(bids).to.deep.equal(expectedResponse);
    })

    it('should send debug-data to external debugger', function() {
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
        currency: 'USD',
        dbg: 'debugdata'
      };

      let debugData;

      window.livewrapped = {
        s2sDebug: function(dbg) {
          debugData = dbg;
        }
      };

      spec.interpretResponse({body: lwResponse});

      expect(debugData).to.equal(lwResponse.dbg);
    })
  });

  describe('user sync', function () {
    let serverResponses;

    beforeEach(function () {
      serverResponses = [{
        body: {
          pixels: [
            {type: 'Redirect', url: 'https://pixelsync'},
            {type: 'Iframe', url: 'https://iframesync'}
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

      let expectedResponse = [{type: 'image', url: 'https://pixelsync'}, {type: 'iframe', url: 'https://iframesync'}];

      expect(syncs).to.deep.equal(expectedResponse)
    });

    it('should returns pixel only if iframe not supported user sync', function() {
      let syncs = spec.getUserSyncs({
        pixelEnabled: true,
        iframeEnabled: false
      }, serverResponses);

      let expectedResponse = [{type: 'image', url: 'https://pixelsync'}];

      expect(syncs).to.deep.equal(expectedResponse)
    });

    it('should returns iframe only if pixel not supported user sync', function() {
      let syncs = spec.getUserSyncs({
        pixelEnabled: false,
        iframeEnabled: true
      }, serverResponses);

      let expectedResponse = [{type: 'iframe', url: 'https://iframesync'}];

      expect(syncs).to.deep.equal(expectedResponse)
    });
  });
});

function clone(obj) {
  return JSON.parse(JSON.stringify(obj));
}
