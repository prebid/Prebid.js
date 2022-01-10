import { expect } from 'chai';

import { processBids, errorMessages } from 'modules/konduitWrapper.js';
import { config } from 'src/config.js';
import { server } from 'test/mocks/xhr.js';

describe('The Konduit vast wrapper module', function () {
  const konduitId = 'test';
  beforeEach(function() {
    config.setConfig({ konduit: { konduitId } });
  });

  describe('processBids function (send one bid)', () => {
    beforeEach(function() {
      config.setConfig({ enableSendAllBids: false });
    });

    it(`should make a correct processBids request and add kCpm and konduitCacheKey
     to the passed bids and to the adserverTargeting object`, function () {
      const bid = createBid(10, 'video1', 15, '10.00_15s', '123', '395');

      server.respondWith(JSON.stringify({
        kCpmData: { [`${bid.bidderCode}:${bid.creativeId}`]: bid.cpm },
        cacheData: { [`${bid.bidderCode}:${bid.creativeId}`]: 'test_cache_key' },
      }));

      processBids({ bid });
      server.respond();

      expect(server.requests.length).to.equal(1);

      const requestBody = JSON.parse(server.requests[0].requestBody);

      expect(requestBody.clientId).to.equal(konduitId);

      expect(bid.konduitCacheKey).to.equal('test_cache_key');
      expect(bid.kCpm).to.equal(bid.cpm);

      expect(bid.adserverTargeting).to.be.an('object');

      expect(bid.adserverTargeting.k_cpm).to.equal(bid.pbCg || bid.pbAg);
      expect(bid.adserverTargeting.k_cache_key).to.equal('test_cache_key');
      expect(bid.adserverTargeting.konduit_id).to.equal(konduitId);
    });

    it(`should call callback with error object in arguments if cacheData is empty in the response`, function () {
      const bid = createBid(10, 'video1', 15, '10.00_15s', '123', '395');

      server.respondWith(JSON.stringify({
        kCpmData: { [`${bid.bidderCode}:${bid.creativeId}`]: bid.cpm },
        cacheData: {},
      }));
      const callback = sinon.spy();
      processBids({ bid, callback });
      server.respond();

      expect(server.requests.length).to.equal(1);

      const requestBody = JSON.parse(server.requests[0].requestBody);

      expect(requestBody.clientId).to.equal(konduitId);

      expect(bid.konduitCacheKey).to.be.undefined;
      expect(bid.kCpm).to.equal(bid.cpm);

      expect(bid.adserverTargeting.k_cpm).to.equal(bid.pbCg || bid.pbAg);
      expect(bid.adserverTargeting.k_cache_key).to.be.undefined;
      expect(bid.adserverTargeting.konduit_id).to.be.undefined;

      expect(callback.firstCall.args[0]).to.be.an('error');
    });

    it('should call callback if processBids request is sent successfully', function () {
      const bid = createBid(10, 'video1', 15, '10.00_15s', '123', '395');
      server.respondWith(JSON.stringify({ key: 'test' }));
      const callback = sinon.spy();
      processBids({
        bid,
        callback
      });
      server.respond();

      expect(callback.calledOnce).to.be.true;
    });

    it('should call callback with error object in arguments if processBids request is failed', function () {
      const bid = createBid(10, 'video1', 15, '10.00_15s', '123', '395');
      const callback = sinon.spy();
      processBids({
        bid,
        callback
      });
      server.respond();

      expect(callback.calledOnce).to.be.true;
      expect(callback.firstCall.args[0]).to.be.an('error');
    });

    it('should call callback with error object in arguments if no konduitId in configs', function () {
      config.setConfig({ konduit: { konduitId: null } });

      const bid = createBid(10, 'video1', 15, '10.00_15s', '123', '395');
      const callback = sinon.spy();
      processBids({
        bid,
        callback
      });

      expect(callback.calledOnce).to.be.true;
      expect(callback.firstCall.args[0]).to.be.an('error');
      expect(callback.firstCall.args[0].message).to.equal(errorMessages.NO_KONDUIT_ID);
    });

    it('should call callback with error object in arguments if no bids found', function () {
      const callback = sinon.spy();
      processBids({
        bid: null,
        bids: [],
        callback
      });

      expect(callback.calledOnce).to.be.true;
      expect(callback.firstCall.args[0]).to.be.an('error');
      expect(callback.firstCall.args[0].message).to.equal(errorMessages.NO_BIDS);
    });
  });
  describe('processBids function (send all bids)', () => {
    beforeEach(function() {
      config.setConfig({ enableSendAllBids: true });
    });

    it(`should make a correct processBids request and add kCpm and konduitCacheKey
     to the passed bids and to the adserverTargeting object`, function () {
      const bid = createBid(10, 'video1', 15, '10.00_15s', '123', '395');

      server.respondWith(JSON.stringify({
        kCpmData: { [`${bid.bidderCode}:${bid.creativeId}`]: bid.cpm },
        cacheData: { [`${bid.bidderCode}:${bid.creativeId}`]: 'test_cache_key' },
      }));

      processBids({ adUnitCode: 'video1', bids: [bid] });
      server.respond();

      expect(server.requests.length).to.equal(1);

      const requestBody = JSON.parse(server.requests[0].requestBody);

      expect(requestBody.clientId).to.equal(konduitId);

      expect(bid.konduitCacheKey).to.equal('test_cache_key');
      expect(bid.kCpm).to.equal(bid.cpm);

      expect(bid.adserverTargeting).to.be.an('object');

      expect(bid.adserverTargeting.k_cpm).to.equal(bid.pbCg || bid.pbAg);
      expect(bid.adserverTargeting[`k_cpm_${bid.bidderCode}`]).to.equal(bid.pbCg || bid.pbAg);
      expect(bid.adserverTargeting.k_cache_key).to.equal('test_cache_key');
      expect(bid.adserverTargeting[`k_cache_key_${bid.bidderCode}`]).to.equal('test_cache_key');
      expect(bid.adserverTargeting.konduit_id).to.equal(konduitId);
    });

    it(`should call callback with error object in arguments if cacheData is empty in the response`, function () {
      const bid = createBid(10, 'video1', 15, '10.00_15s', '123', '395');

      server.respondWith(JSON.stringify({
        kCpmData: { [`${bid.bidderCode}:${bid.creativeId}`]: bid.cpm },
        cacheData: {},
      }));
      const callback = sinon.spy();
      processBids({ adUnitCode: 'video1', bids: [bid], callback });
      server.respond();

      expect(server.requests.length).to.equal(1);

      const requestBody = JSON.parse(server.requests[0].requestBody);

      expect(requestBody.clientId).to.equal(konduitId);

      expect(bid.konduitCacheKey).to.be.undefined;
      expect(bid.kCpm).to.equal(bid.cpm);

      expect(bid.adserverTargeting.k_cpm).to.equal(bid.pbCg || bid.pbAg);
      expect(bid.adserverTargeting[`k_cpm_${bid.bidderCode}`]).to.equal(bid.pbCg || bid.pbAg);
      expect(bid.adserverTargeting.k_cache_key).to.be.undefined;
      expect(bid.adserverTargeting[`k_cache_key_${bid.bidderCode}`]).to.be.undefined;
      expect(bid.adserverTargeting.konduit_id).to.be.undefined;

      expect(callback.firstCall.args[0]).to.be.an('error');
    });

    it('should call callback if processBids request is sent successfully', function () {
      const bid = createBid(10, 'video1', 15, '10.00_15s', '123', '395');
      server.respondWith(JSON.stringify({ key: 'test' }));
      const callback = sinon.spy();
      processBids({ adUnitCode: 'video1', bid: [bid], callback });
      server.respond();

      expect(callback.calledOnce).to.be.true;
    });

    it('should call callback with error object in arguments if processBids request is failed', function () {
      const bid = createBid(10, 'video1', 15, '10.00_15s', '123', '395');
      const callback = sinon.spy();
      processBids({ adUnitCode: 'video1', bid: [bid], callback });
      server.respond();

      expect(callback.calledOnce).to.be.true;
      expect(callback.firstCall.args[0]).to.be.an('error');
    });

    it('should call callback with error object in arguments if no konduitId in configs', function () {
      config.setConfig({ konduit: { konduitId: null } });

      const bid = createBid(10, 'video1', 15, '10.00_15s', '123', '395');
      const callback = sinon.spy();
      processBids({ adUnitCode: 'video1', bid: [bid], callback });

      expect(callback.calledOnce).to.be.true;
      expect(callback.firstCall.args[0]).to.be.an('error');
      expect(callback.firstCall.args[0].message).to.equal(errorMessages.NO_KONDUIT_ID);
    });

    it('should call callback with error object in arguments if no bids found', function () {
      const callback = sinon.spy();
      processBids({
        bid: null,
        bids: [],
        callback
      });

      expect(callback.calledOnce).to.be.true;
      expect(callback.firstCall.args[0]).to.be.an('error');
      expect(callback.firstCall.args[0].message).to.equal(errorMessages.NO_BIDS);
    });
  });
});

function createBid(cpm, adUnitCode, durationBucket, priceIndustryDuration, uuid, label) {
  return {
    'bidderCode': 'appnexus',
    'width': 640,
    'height': 360,
    'statusMessage': 'Bid available',
    'adId': '28f24ced14586c',
    'mediaType': 'video',
    'source': 'client',
    'requestId': '28f24ced14586c',
    'cpm': cpm,
    'creativeId': 97517771,
    'currency': 'USD',
    'netRevenue': true,
    'ttl': 3600,
    'adUnitCode': adUnitCode,
    'video': {
      'context': 'adpod',
      'durationBucket': durationBucket
    },
    'appnexus': {
      'buyerMemberId': 9325
    },
    'vastUrl': 'http://some-vast-url.com',
    'vastImpUrl': 'http://some-vast-imp-url.com',
    'auctionId': 'ec266b31-d652-49c5-8295-e83fafe5532b',
    'responseTimestamp': 1548442460888,
    'requestTimestamp': 1548442460827,
    'bidder': 'appnexus',
    'timeToRespond': 61,
    'pbLg': '5.00',
    'pbMg': `${cpm}.00`,
    'pbHg': '5.00',
    'pbAg': `${cpm}.00`,
    'pbDg': '5.00',
    'pbCg': '',
    'size': '640x360',
    'adserverTargeting': {
      'hb_bidder': 'appnexus',
      'hb_adid': '28f24ced14586c',
      'hb_pb': '5.00',
      'hb_size': '640x360',
      'hb_source': 'client',
      'hb_format': 'video',
      'hb_pb_cat_dur': priceIndustryDuration,
      'hb_cache_id': uuid
    },
    'customCacheKey': `${priceIndustryDuration}_${uuid}`,
    'meta': {
      'primaryCatId': 'iab-1',
      'adServerCatId': label
    },
    'videoCacheKey': '4cf395af-8fee-4960-af0e-88d44e399f14'
  }
}
