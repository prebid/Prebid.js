import { assert } from 'chai';
import {spec} from 'modules/tappxBidAdapter';

describe('Tappx adapter tests', function () {
  describe('isBidRequestValid', function () {
    let bid = { bidder: 'tappx', params: { host: 'testing.ssp.tappx.com', tappxkey: 'pub-1234-test-1234', endpoint: 'ZZ1234PBJS', bidfloor: 0.005 } };

    it('should return true when required params found', function () {
      assert(spec.isBidRequestValid(bid));
    });

    it('should return false when required params are missing', function () {
      const bid = {
        host: 'testing.ssp.tappx.com'
      };
      assert.isFalse(spec.isBidRequestValid(bid));
    });
  });

  describe('buildRequest', function () {
    let consentString = 'BOJ8RZsOJ8RZsABAB8AAAAAZ+A==';
    // Web Test
    let validBidRequests = [{'bidder': 'tappx', 'params': {'host': 'testing.ssp.tappx.com', 'tappxkey': 'pub-1234-android-1234', 'endpoint': 'ZZ1234PBJS', 'bidfloor': 0.005, 'api': [3, 5]}, 'crumbs': {'pubcid': 'df2144f7-673f-4440-83f5-cd4a73642d99'}, 'fpd': {'context': {'adServer': {'name': 'gam', 'adSlot': '/19968336/header-bid-tag-0'}, 'pbAdSlot': '/19968336/header-bid-tag-0'}}, 'mediaTypes': {'banner': {'sizes': [[320, 480]]}}, 'adUnitCode': 'div-1', 'transactionId': '713f2c01-61e3-45b5-9e4e-2b163033f3d6', 'sizes': [[320, 480]], 'bidId': '27818d05971607', 'bidderRequestId': '1320551a307df5', 'auctionId': '3f1281d3-9860-4657-808d-3c1d42231ef3', 'src': 'client', 'bidRequestsCount': 1, 'bidderRequestsCount': 1, 'bidderWinsCount': 0}]
    // App Test
    let validAppBidRequests = [{'bidder': 'tappx', 'params': {'host': 'testing.ssp.tappx.com', 'tappxkey': 'pub-1234-android-1234', 'endpoint': 'ZZ1234PBJS', 'bidfloor': 0.005, 'api': [3, 5], 'app': {'name': 'Tappx Test', 'bundle': 'com.test.tappx', 'domain': 'tappx.com', 'publisher': { 'name': 'Tappx', 'domain': 'tappx.com' }}}, 'crumbs': {'pubcid': 'df2144f7-673f-4440-83f5-cd4a73642d99'}, 'fpd': {'context': {'adServer': {'name': 'gam', 'adSlot': '/19968336/header-bid-tag-0'}, 'pbAdSlot': '/19968336/header-bid-tag-0'}}, 'mediaTypes': {'banner': {'sizes': [[320, 50]]}}, 'adUnitCode': 'div-1', 'transactionId': '713f2c01-61e3-45b5-9e4e-2b163033f3d6', 'sizes': [[320, 50]], 'bidId': '27818d05971607', 'bidderRequestId': '1320551a307df5', 'auctionId': '3f1281d3-9860-4657-808d-3c1d42231ef3', 'src': 'client', 'bidRequestsCount': 1, 'bidderRequestsCount': 1, 'bidderWinsCount': 0}]
    let bidderRequest = {'bidderCode': 'tappx', 'auctionId': '6cca2192-2262-468b-8a3c-d00c58a5d911', 'bidderRequestId': '1ae5c6a02684df', 'bids': [{'bidder': 'tappx', 'params': {'host': 'tests.tappx.com', 'tappxkey': 'pub-1234-test-1234', 'endpoint': 'ZZ1234PBJS', 'bidfloor': 0.005}, 'fpd': {'context': {'adServer': {'name': 'gam', 'adSlot': '/19968336/header-bid-tag-0'}, 'pbAdSlot': '/19968336/header-bid-tag-0'}}, 'mediaTypes': {'banner': {'sizes': [[320, 480]]}}, 'adUnitCode': 'banner-ad-div', 'transactionId': 'c44cdbde-ab6d-47a0-8dde-6b4ff7909a35', 'sizes': [[320, 50]], 'bidId': '2e3a5feb30cfe4', 'bidderRequestId': '1ae5c6a02684df', 'auctionId': '6cca2192-2262-468b-8a3c-d00c58a5d911', 'src': 'client', 'bidRequestsCount': 1, 'bidderRequestsCount': 1, 'bidderWinsCount': 0}], 'auctionStart': 1611308859094, 'timeout': 700, 'refererInfo': {'referer': 'http://tappx.local:9999/integrationExamples/gpt/gdpr_hello_world.html?pbjs_debug=true', 'reachedTop': true, 'isAmp': false, 'numIframes': 0, 'stack': ['http://tappx.local:9999/integrationExamples/gpt/gdpr_hello_world.html?pbjs_debug=true'], 'canonicalUrl': null}, 'gdprConsent': {'consentString': consentString, 'vendorData': {'metadata': 'BO-JeiTPABAOkAAABAENABA', 'gdprApplies': true, 'hasGlobalScope': false, 'cookieVersion': 1, 'created': '2020-12-09T09:22:09.900Z', 'lastUpdated': '2021-01-14T15:44:03.600Z', 'cmpId': 0, 'cmpVersion': 1, 'consentScreen': 0, 'consentLanguage': 'EN', 'vendorListVersion': 1, 'maxVendorId': 0, 'purposeConsents': {}, 'vendorConsents': {}}, 'gdprApplies': true, 'apiVersion': 1}, 'uspConsent': '1YCC', 'start': 1611308859099};

    it('should add gdpr/usp consent information to the request', function () {
      const request = spec.buildRequests(validBidRequests, bidderRequest);
      const payload = JSON.parse(request[0].data);

      expect(payload.regs.gdpr).to.exist.and.to.be.true;
      expect(payload.regs.consent).to.exist.and.to.equal(consentString);
      expect(payload.regs.ext.us_privacy).to.exist;
    });

    it('should properly build a banner request', function () {
      const request = spec.buildRequests(validBidRequests, bidderRequest);
      expect(request[0].url).to.match(/^(http|https):\/\/(.*)\.tappx\.com\/.+/);
      expect(request[0].method).to.equal('POST');

      const data = JSON.parse(request[0].data);
      expect(data.site).to.not.equal(null);
      expect(data.imp).to.have.lengthOf(1);
      expect(data.imp[0].bidfloor, data).to.not.be.null;
      expect(data.imp[0].banner).to.not.equal(null);
      expect(data.imp[0].banner.w).to.be.oneOf([320, 50, 250, 480]);
      expect(data.imp[0].banner.h).to.be.oneOf([320, 50, 250, 480]);
    });

    it('should properly build a banner request with app params', function () {
      const request = spec.buildRequests(validAppBidRequests, bidderRequest);
      expect(request[0].url).to.match(/^(http|https):\/\/(.*)\.tappx\.com\/.+/);
      expect(request[0].method).to.equal('POST');

      const data = JSON.parse(request[0].data);
      expect(data.site).to.not.equal(null);
      expect(data.imp).to.have.lengthOf(1);
      expect(data.imp[0].bidfloor, data).to.not.be.null;
      expect(data.imp[0].banner).to.not.equal(null);
      expect(data.imp[0].banner.w).to.be.oneOf([320, 50, 250, 480]);
      expect(data.imp[0].banner.h).to.be.oneOf([320, 50, 250, 480]);
    });
  });

  describe('interpretResponse', function () {
    const bidRequest = {
      data: {},
      bids: [ {'bidder': 'tappx', 'params': {'host': 'testing.ssp.tappx.com', 'tappxkey': 'pub-1234-android-1234', 'endpoint': 'ZZ1234PBJS', 'bidfloor': 0.05, 'api': [3, 5]}, 'crumbs': {'pubcid': 'df2144f7-673f-4440-83f5-cd4a73642d99'}, 'fpd': {'context': {'adServer': {'name': 'gam', 'adSlot': '/19968336/header-bid-tag-0'}, 'pbAdSlot': '/19968336/header-bid-tag-0'}}, 'mediaTypes': {'banner': {'sizes': [[320, 480]]}}, 'adUnitCode': 'div-1', 'transactionId': '47dd44e8-e7db-417c-a8f1-621a2e1a117d', 'sizes': [[320, 480]], 'bidId': '2170932097e505', 'bidderRequestId': '140ba7a1ab7aeb', 'auctionId': '1c54b4f1-645f-44e6-b8ae-5d43c923ef1c', 'src': 'client', 'bidRequestsCount': 1, 'bidderRequestsCount': 1, 'bidderWinsCount': 0} ]
    };

    const serverResponse = {'body': {'id': '1c54b4f1-645f-44e6-b8ae-5d43c923ef1c', 'bidid': 'bid3811165568213389257', 'seatbid': [{'seat': '1', 'group': 0, 'bid': [{'id': '3811165568213389257', 'impid': 1, 'price': 0.05, 'adm': "<!-- Tappx Test AD :: 320x480 --><a href='http://www.tappx.com' target=\"_blank\">\t<img src='https://testing.ssp.tappx.com/zcdn/creatives/interstitial320x480.gif'></a>", 'w': 320, 'h': 480, 'lurl': 'http://testing.ssp.tappx.com/rtb/RTBv2Loss?id=3811165568213389257&ep=ZZ1234PBJS&au=test&bu=localhost&sz=320x480&pu=0.005&pt=0.01&cid=&crid=&adv=&aid=${AUCTION_ID}&bidid=${AUCTION_BID_ID}&impid=${AUCTION_IMP_ID}&sid=${AUCTION_SEAT_ID}&adid=${AUCTION_AD_ID}&ap=${AUCTION_PRICE}&cur=${AUCTION_CURRENCY}&mbr=${AUCTION_MBR}&l=${AUCTION_LOSS}', 'cid': '01744fbb521e9fb10ffea926190effea', 'crid': 'a13cf884e66e7c660afec059c89d98b6', 'adomain': []}]}], 'cur': 'USD'}, 'headers': {}};
    it('receive reponse with single placement', function () {
      const bids = spec.interpretResponse(serverResponse, bidRequest);
      const bid = bids[0];
      expect(bid.cpm).to.exist;
      expect(bid.ad).to.match(/^<!-- Tappx Test AD/);
    });

    const emptyServerResponse = {'headers': {}};
    it('receive reponse without ad', function () {
      const bids = spec.interpretResponse(emptyServerResponse, bidRequest);
      expect(bids).to.have.lengthOf(0);
    });
  });
});
