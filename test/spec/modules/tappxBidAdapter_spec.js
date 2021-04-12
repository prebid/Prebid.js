import { assert } from 'chai';
import { spec } from 'modules/tappxBidAdapter';

const c_BIDREQUEST = {
  data: {
  },
  bids: [
    {
      bidder: 'tappx',
      params: {
        host: 'testing.ssp.tappx.com\/rtb\/v2\/',
        tappxkey: 'pub-1234-android-1234',
        endpoint: 'ZZ1234PBJS',
        bidfloor: 0.05
      },
      crumbs: {
        pubcid: 'df2144f7-673f-4440-83f5-cd4a73642d99'
      },
      fpd: {
        context: {
          adServer: {
            name: 'gam',
            adSlot: '/19968336/header-bid-tag-0'
          },
          pbAdSlot: '/19968336/header-bid-tag-0',
        },
      },
      mediaTypes: {
        banner: {
          sizes: [
            [
              320,
              480
            ]
          ]
        }
      },
      adUnitCode: 'div-1',
      transactionId: '47dd44e8-e7db-417c-a8f1-621a2e1a117d',
      sizes: [
        [
          320,
          480
        ]
      ],
      bidId: '2170932097e505',
      bidderRequestId: '140ba7a1ab7aeb',
      auctionId: '1c54b4f1-645f-44e6-b8ae-5d43c923ef1c',
      src: 'client',
      bidRequestsCount: 1,
      bidderRequestsCount: 1,
      bidderWinsCount: 0,
    }
  ]
};
const c_SERVERRESPONSE = {
  body: {
    id: '1c54b4f1-645f-44e6-b8ae-5d43c923ef1c',
    bidid: 'bid3811165568213389257',
    seatbid: [
      {
        seat: '1',
        group: 0,
        bid: [
          {
            id: '3811165568213389257',
            impid: 1,
            price: 0.05,
            adm: "<!-- Tappx Test AD :: 320x480 --><a href='http://www.tappx.com' target=\"_blank\">\t<img src='https://testing.ssp.tappx.com/zcdn/creatives/interstitial320x480.gif'></a>",
            w: 320,
            h: 480,
            lurl: 'http://testing.ssp.tappx.com/rtb/RTBv2Loss?id=3811165568213389257&ep=ZZ1234PBJS&au=test&bu=localhost&sz=320x480&pu=0.005&pt=0.01&cid=&crid=&adv=&aid=${AUCTION_ID}&bidid=${AUCTION_BID_ID}&impid=${AUCTION_IMP_ID}&sid=${AUCTION_SEAT_ID}&adid=${AUCTION_AD_ID}&ap=${AUCTION_PRICE}&cur=${AUCTION_CURRENCY}&mbr=${AUCTION_MBR}&l=${AUCTION_LOSS}',
            cid: '01744fbb521e9fb10ffea926190effea',
            crid: 'a13cf884e66e7c660afec059c89d98b6',
            adomain: [
            ],
          },
        ],
      },
    ],
    cur: 'USD',
  },
  headers: {}
};
const c_CONSENTSTRING = 'BOJ8RZsOJ8RZsABAB8AAAAAZ+A==';
const c_VALIDBIDREQUESTS = [{'bidder': 'tappx', 'params': {'host': 'testing.ssp.tappx.com\/rtb\/v2\/', 'tappxkey': 'pub-1234-android-1234', 'endpoint': 'ZZ1234PBJS', 'bidfloor': 0.005, 'test': 1}, 'userId': {'haloId': '0000x179MZAzMqUWsFonu7Drm3eDDBMYtj5SPoWQnl89Upk3WTlCvEnKI9SshX0p6eFJ7otPYix179MZAzMqUWsFonu7Drm3eDDBMYtj5SPoWQnl89Upk3WTlCvEnKI9SshX0p6e', 'id5id': {'uid': 'ID5@iu-PJX_OQ0d6FJjKS8kYfUpHriD_rEXbz6UYtYEJelYrDaZOLkh8WcF9J0ZHmEHFKZEBlLXsgP6xqXU3BCj4Ay0Z6fw_jSOaHxMHwd-voRHqFA4Q9NwAxFcVLyPWnNGZ9VbcSAPos1wupq7Xu3MIm-Bw_0vxjhZdWNy4chM9x3i', 'ext': {'linkType': 0}}, 'intentIqId': 'GIF89a\u0000\u0000\u0000\u0000�\u0000\u0000���\u0000\u0000\u0000?�\u0000\u0000\u0000\u0000\u0000\u0000,\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000A\u0000\u0000;', 'lotamePanoramaId': 'xTtLUY7GwqX2MMqSHo9RQ2YUOIBFhlASOR43I9KjvgtcrxIys3RxME96M02LTjWR', 'parrableId': {'eid': '02.YoqC9lWZh8.C8QTSiJTNgI6Pp0KCM5zZgEgwVMSsVP5W51X8cmiUHQESq9WRKB4nreqZJwsWIcNKlORhG4u25Wm6lmDOBmQ0B8hv0KP6uVQ97aouuH52zaz2ctVQTORUKkErPRPcaCJ7dKFcrNoF2i6WOR0S5Nk'}, 'pubcid': 'b1254-152f-12F5-5698-dI1eljK6C7WA', 'pubProvidedId': [{'source': 'domain.com', 'uids': [{'id': 'value read from cookie or local storage', 'atype': 1, 'ext': {'stype': 'ppuid'}}]}, {'source': '3rdpartyprovided.com', 'uids': [{'id': 'value read from cookie or local storage', 'atype': 3, 'ext': {'stype': 'sha256email'}}]}]}, 'userIdAsEids': [{'source': 'audigent.com', 'uids': [{'id': '0000fgclxw05ycn0608xiyi90bwpa0c0evvlif0hv1x0i0ku88il0ntek0o0qskvir0trr70u0wqxiix0zq3u1012pa5j315ogh1618nmsj91bmt41c1elzfjf1hl5r1i1kkc2jl', 'atype': 1}]}, {'source': 'id5-sync.com', 'uids': [{'id': 'ID5@iu-PJX_OQ0d6FJjKS8kYfUpHriD_qpoXJUngedfpNva812If1fHEqHHkamLC89txVxk1i9WGqeQrTX97HFCgv9QDa1M_bkHUBsAWFm-D5r1rYrsfMFFiyqwCAEzqNbvsUZXOYCAQSjPcLxR4of22w-U9_JDRThCGRDV3Fmvc38E', 'atype': 1, 'ext': {'linkType': 0}}]}], 'ortb2Imp': {'ext': {'data': {'adserver': {'name': 'gam', 'adslot': '/19968336/header-bid-tag-0'}, 'pbadslot': '/19968336/header-bid-tag-0'}}}, 'mediaTypes': {'banner': {'sizes': [[320, 480], [320, 50]]}}, 'adUnitCode': 'div-gpt-ad-1460505748561-0', 'transactionId': '71c0d86b-4b47-4aff-a6da-1af0b1712439', 'sizes': [[320, 480], [320, 50]], 'bidId': '264d7969b125a5', 'bidderRequestId': '1c674c14a3889c', 'auctionId': '13a8a3a9-ed3a-4101-9435-4699ee77bb62', 'src': 'client', 'bidRequestsCount': 1, 'bidderRequestsCount': 1, 'bidderWinsCount': 0}];
const c_VALIDBIDAPPREQUESTS = [{'bidder': 'tappx', 'params': {'host': 'testing.ssp.tappx.com\/rtb\/v2\/', 'tappxkey': 'pub-1234-android-1234', 'endpoint': 'ZZ1234PBJS', 'bidfloor': 0.005, 'test': 1, 'app': {'name': 'Tappx Test', 'bundle': 'com.test.tappx', 'domain': 'tappx.com', 'publisher': { 'name': 'Tappx', 'domain': 'tappx.com' }}}, 'userId': {'haloId': '0000fgclxw05ycn0608xiyi90bwpa0c0evvlif0hv1x0i0ku88il0ntek0o0qskvir0trr70u0wqxiix0zq3u1012pa5j315ogh1618nmsj91bmt41c1elzfjf1hl5r1i1kkc2jl', 'id5id': {'uid': 'ID5@iu-PJX_OQ0d6FJjKS8kYfUpHriD_qpoXJUngedfpNva812If1fHEqHHkamLC89txVxk1i9WGqeQrTX97HFCgv9QDa1M_bkHUBsAWFm-D5r1rYrsfMFFiyqwCAEzqNbvsUZXOYCAQSjPcLxR4of22w-U9_JDRThCGRDV3Fmvc38E', 'ext': {'linkType': 0}}, 'intentIqId': 'GIF89a\u0001\u0000\u0001\u0000�\u0000\u0000���\u0000\u0000\u0000!�\u0004\u0001\u0000\u0000\u0000\u0000,\u0000\u0000\u0000\u0000\u0001\u0000\u0001\u0000\u0000\u0002\u0002D\u0001\u0000;', 'lotamePanoramaId': '8003916b61a95b185690ec103bdf4945a70213e01818a5e5d8690b542730755a', 'parrableId': {'eid': '01.1617088921.7faa68d9570a50ea8e4f359e9b99ca4b7509e948a6175b3e5b0b8cbaf5b62424104ccfb0191ca79366de8368ed267b89a68e236df5f41f96f238e4301659e9023fec05e46399fb1ad0a0'}, 'pubcid': 'b7143795-852f-42f0-8864-5ecbea1ade4e', 'pubProvidedId': [{'source': 'domain.com', 'uids': [{'id': 'value read from cookie or local storage', 'atype': 1, 'ext': {'stype': 'ppuid'}}]}, {'source': '3rdpartyprovided.com', 'uids': [{'id': 'value read from cookie or local storage', 'atype': 3, 'ext': {'stype': 'sha256email'}}]}]}, 'userIdAsEids': [{'source': 'audigent.com', 'uids': [{'id': '0000fgclxw05ycn0608xiyi90bwpa0c0evvlif0hv1x0i0ku88il0ntek0o0qskvir0trr70u0wqxiix0zq3u1012pa5j315ogh1618nmsj91bmt41c1elzfjf1hl5r1i1kkc2jl', 'atype': 1}]}, {'source': 'id5-sync.com', 'uids': [{'id': 'ID5@iu-PJX_OQ0d6FJjKS8kYfUpHriD_qpoXJUngedfpNva812If1fHEqHHkamLC89txVxk1i9WGqeQrTX97HFCgv9QDa1M_bkHUBsAWFm-D5r1rYrsfMFFiyqwCAEzqNbvsUZXOYCAQSjPcLxR4of22w-U9_JDRThCGRDV3Fmvc38E', 'atype': 1, 'ext': {'linkType': 0}}]}, {'source': 'intentiq.com', 'uids': [{'id': 'GIF89a\u0001\u0000\u0001\u0000�\u0000\u0000���\u0000\u0000\u0000!�\u0004\u0001\u0000\u0000\u0000\u0000,\u0000\u0000\u0000\u0000\u0001\u0000\u0001\u0000\u0000\u0002\u0002D\u0001\u0000;', 'atype': 1}]}, {'source': 'crwdcntrl.net', 'uids': [{'id': '8003916b61a95b185690ec103bdf4945a70213e01818a5e5d8690b542730755a', 'atype': 1}]}, {'source': 'parrable.com', 'uids': [{'id': '01.1617088921.7faa68d9570a50ea8e4f359e9b99ca4b7509e948a6175b3e5b0b8cbaf5b62424104ccfb0191ca79366de8368ed267b89a68e236df5f41f96f238e4301659e9023fec05e46399fb1ad0a0', 'atype': 1}]}, {'source': 'pubcid.org', 'uids': [{'id': 'b7143795-852f-42f0-8864-5ecbea1ade4e', 'atype': 1}]}, {'source': 'domain.com', 'uids': [{'id': 'value read from cookie or local storage', 'atype': 1, 'ext': {'stype': 'ppuid'}}]}, {'source': '3rdpartyprovided.com', 'uids': [{'id': 'value read from cookie or local storage', 'atype': 3, 'ext': {'stype': 'sha256email'}}]}], 'ortb2Imp': {'ext': {'data': {'adserver': {'name': 'gam', 'adslot': '/19968336/header-bid-tag-0'}, 'pbadslot': '/19968336/header-bid-tag-0'}}}, 'mediaTypes': {'banner': {'sizes': [[320, 480], [320, 50]]}}, 'adUnitCode': 'div-gpt-ad-1460505748561-0', 'transactionId': '71c0d86b-4b47-4aff-a6da-1af0b1712439', 'sizes': [[320, 480], [320, 50]], 'bidId': '264d7969b125a5', 'bidderRequestId': '1c674c14a3889c', 'auctionId': '13a8a3a9-ed3a-4101-9435-4699ee77bb62', 'src': 'client', 'bidRequestsCount': 1, 'bidderRequestsCount': 1, 'bidderWinsCount': 0}];
const c_BIDDERREQUEST = {'bidderCode': 'tappx', 'auctionId': '13a8a3a9-ed3a-4101-9435-4699ee77bb62', 'bidderRequestId': '1c674c14a3889c', 'bids': [{'bidder': 'tappx', 'params': {'host': 'testing.ssp.tappx.com\/rtb\/v2\/', 'tappxkey': 'pub-1234-android-1234', 'endpoint': 'ZZ1234PBJS', 'bidfloor': 0.005, 'test': 1}, 'userId': {'haloId': '0000fgclxw05ycn0608xiyi90bwpa0c0evvlif0hv1x0i0ku88il0ntek0o0qskvir0trr70u0wqxiix0zq3u1012pa5j315ogh1618nmsj91bmt41c1elzfjf1hl5r1i1kkc2jl', 'id5id': {'uid': 'ID5@iu-PJX_OQ0d6FJjKS8kYfUpHriD_qpoXJUngedfpNva812If1fHEqHHkamLC89txVxk1i9WGqeQrTX97HFCgv9QDa1M_bkHUBsAWFm-D5r1rYrsfMFFiyqwCAEzqNbvsUZXOYCAQSjPcLxR4of22w-U9_JDRThCGRDV3Fmvc38E', 'ext': {'linkType': 0}}, 'intentIqId': 'GIF89a\u0000\u0000\u0000\u0000�\u0000\u0000���\u0000\u0000\u0000?�\u0000\u0000\u0000\u0000\u0000\u0000,\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000A\u0000\u0000;', 'lotamePanoramaId': '8003916b61a95b185690ec103bdf4945a70213e01818a5e5d8690b542730755a', 'parrableId': {'eid': '01.1617088921.7faa68d9570a50ea8e4f359e9b99ca4b7509e948a6175b3e5b0b8cbaf5b62424104ccfb0191ca79366de8368ed267b89a68e236df5f41f96f238e4301659e9023fec05e46399fb1ad0a0'}, 'pubcid': 'b7143795-852f-42f0-8864-5ecbea1ade4e', 'pubProvidedId': [{'source': 'domain.com', 'uids': [{'id': 'value read from cookie or local storage', 'atype': 1, 'ext': {'stype': 'ppuid'}}]}, {'source': '3rdpartyprovided.com', 'uids': [{'id': 'value read from cookie or local storage', 'atype': 3, 'ext': {'stype': 'sha256email'}}]}]}, 'userIdAsEids': [{'source': 'audigent.com', 'uids': [{'id': '0000fgclxw05ycn0608xiyi90bwpa0c0evvlif0hv1x0i0ku88il0ntek0o0qskvir0trr70u0wqxiix0zq3u1012pa5j315ogh1618nmsj91bmt41c1elzfjf1hl5r1i1kkc2jl', 'atype': 1}]}, {'source': 'id5-sync.com', 'uids': [{'id': 'ID5@iu-PJX_OQ0d6FJjKS8kYfUpHriD_qpoXJUngedfpNva812If1fHEqHHkamLC89txVxk1i9WGqeQrTX97HFCgv9QDa1M_bkHUBsAWFm-D5r1rYrsfMFFiyqwCAEzqNbvsUZXOYCAQSjPcLxR4of22w-U9_JDRThCGRDV3Fmvc38E', 'atype': 1, 'ext': {'linkType': 0}}]}], 'ortb2Imp': {'ext': {'data': {'adserver': {'name': 'gam', 'adslot': '/19968336/header-bid-tag-0'}, 'pbadslot': '/19968336/header-bid-tag-0'}}}, 'mediaTypes': {'banner': {'sizes': [[320, 480], [320, 50]]}}, 'adUnitCode': 'div-gpt-ad-1460505748561-0', 'transactionId': '71c0d86b-4b47-4aff-a6da-1af0b1712439', 'sizes': [[320, 480], [320, 50]], 'bidId': '264d7969b125a5', 'bidderRequestId': '1c674c14a3889c', 'auctionId': '13a8a3a9-ed3a-4101-9435-4699ee77bb62', 'src': 'client', 'bidRequestsCount': 1, 'bidderRequestsCount': 1, 'bidderWinsCount': 0}], 'auctionStart': 1617088922120, 'timeout': 700, 'refererInfo': {'referer': 'http://localhost:9999/integrationExamples/gpt/gdpr_hello_world.html?pbjs_debug=true', 'reachedTop': true, 'isAmp': false, 'numIframes': 0, 'stack': ['http://localhost:9999/integrationExamples/gpt/gdpr_hello_world.html?pbjs_debug=true'], 'canonicalUrl': null}, 'gdprConsent': {'consentString': c_CONSENTSTRING, 'vendorData': {'metadata': 'BO-JeiTPABAOkAAABAENABA', 'gdprApplies': true, 'hasGlobalScope': false, 'cookieVersion': 1, 'created': '2020-12-09T09:22:09.900Z', 'lastUpdated': '2021-01-14T15:44:03.600Z', 'cmpId': 0, 'cmpVersion': 1, 'consentScreen': 0, 'consentLanguage': 'EN', 'vendorListVersion': 1, 'maxVendorId': 0, 'purposeConsents': {}, 'vendorConsents': {}}, 'gdprApplies': true, 'apiVersion': 1}, 'uspConsent': '1YCC', 'start': 1611308859099};

describe('Tappx bid adapter', function () {
  /**
   * IS REQUEST VALID
   */
  describe('isBidRequestValid', function () {
    it('should return true when required params found', function () {
      assert.isTrue(spec.isBidRequestValid(c_BIDREQUEST.bids[0]), JSON.stringify(c_BIDREQUEST));
    });

    it('should return false when required params are missing', function () {
      let badBidRequest = c_BIDREQUEST;
      delete badBidRequest.bids[0].params.tappxkey;
      delete badBidRequest.bids[0].params.endpoint;
      assert.isFalse(spec.isBidRequestValid(badBidRequest.bids[0]));
    });
  });

  /**
   * BUILD REQUEST TEST
   */
  describe('buildRequest', function () {
    // Web Test
    let validBidRequests = c_VALIDBIDREQUESTS;
    // App Test
    let validAppBidRequests = c_VALIDBIDAPPREQUESTS;

    let bidderRequest = c_BIDDERREQUEST;

    it('should add gdpr/usp consent information to the request', function () {
      const request = spec.buildRequests(validBidRequests, bidderRequest);
      const payload = JSON.parse(request[0].data);

      expect(payload.regs.gdpr).to.exist.and.to.be.true;
      expect(payload.regs.consent).to.exist.and.to.equal(c_CONSENTSTRING);
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

    it('should set user eids array', function () {
      const request = spec.buildRequests(validBidRequests, bidderRequest);

      const data = JSON.parse(request[0].data);
      expect(data.user.ext.eids, data).to.not.be.null;
      expect(data.user.ext.eids[0]).to.have.keys(['source', 'uids']);
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

  /**
   * INTERPRET RESPONSE TESTS
   */
  describe('interpretResponse', function () {
    it('receive reponse with single placement', function () {
      const bids = spec.interpretResponse(c_SERVERRESPONSE, c_BIDREQUEST);
      const bid = bids[0];
      expect(bid.cpm).to.exist;
      expect(bid.ad).to.match(/^<!-- Tappx Test AD/);
    });

    let emptyServerResponse = { headers: {} };
    it('receive reponse without ad', function () {
      const bids = spec.interpretResponse(emptyServerResponse, c_BIDREQUEST);
      expect(bids).to.have.lengthOf(0);
    });
  });
});
