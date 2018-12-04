import { expect } from 'chai';
import { spec } from 'modules/ozoneBidAdapter';

const OZONEURI = 'https://elb.the-ozone-project.com/openrtb2/auction';
const BIDDER_CODE = 'ozone';
/*

NOTE - use firefox console to deep copy the objects to use here

 */
var validBidRequests = [
  {
    adUnitCode: 'div-gpt-ad-1460505748561-0',
    auctionId: '27dcb421-95c6-4024-a624-3c03816c5f99',
    bidId: '2899ec066a91ff8',
    bidRequestsCount: 1,
    bidder: 'ozone',
    bidderRequestId: '1c1586b27a1b5c8',
    crumbs: {pubcid: '203a0692-f728-4856-87f6-9a25a6b63715'},
    params: { publisherId: '9876abcd12-3', customData: {'gender': 'bart', 'age': 'low'}, ozoneData: {'networkID': '3048', 'dfpSiteID': 'd.thesun', 'sectionID': 'homepage', 'path': '/', 'sec_id': 'null', 'sec': 'sec', 'topics': 'null', 'kw': 'null', 'aid': 'null', 'search': 'null', 'article_type': 'null', 'hide_ads': '', 'article_slug': 'null'}, lotameData: {'Profile': {'tpid': 'c8ef27a0d4ba771a81159f0d2e792db4', 'Audiences': {'Audience': [{'id': '99999', 'abbr': 'sports'}, {'id': '88888', 'abbr': 'movie'}, {'id': '77777', 'abbr': 'blogger'}], 'ThirdPartyAudience': [{'id': '123', 'name': 'Automobiles'}, {'id': '456', 'name': 'Ages: 30-39'}]}}}, placementId: '1310000099', siteId: '1234567890', id: 'fea37168-78f1-4a23-a40e-88437a99377e', auctionId: '27dcb421-95c6-4024-a624-3c03816c5f99', imp: [ { id: '2899ec066a91ff8', tagid: 'undefined', secure: 1, banner: { format: [{ w: 300, h: 250 }, { w: 300, h: 600 }], h: 250, topframe: 1, w: 300 } } ] },
    sizes: [[300, 250], [300, 600]],
    transactionId: '2e63c0ed-b10c-4008-aed5-84582cecfe87'
  }
];

var validBidderRequest = {
  auctionId: '27dcb421-95c6-4024-a624-3c03816c5f99',
  auctionStart: 1536838908986,
  bidderCode: 'ozone',
  bidderRequestId: '1c1586b27a1b5c8',
  bids: [{
    adUnitCode: 'div-gpt-ad-1460505748561-0',
    auctionId: '27dcb421-95c6-4024-a624-3c03816c5f99',
    bidId: '2899ec066a91ff8',
    bidRequestsCount: 1,
    bidder: 'ozone',
    bidderRequestId: '1c1586b27a1b5c8',
    crumbs: {pubcid: '203a0692-f728-4856-87f6-9a25a6b63715'},
    params: { publisherId: '9876abcd12-3', customData: {'gender': 'bart', 'age': 'low'}, ozoneData: {'networkID': '3048', 'dfpSiteID': 'd.thesun', 'sectionID': 'homepage', 'path': '/', 'sec_id': 'null', 'sec': 'sec', 'topics': 'null', 'kw': 'null', 'aid': 'null', 'search': 'null', 'article_type': 'null', 'hide_ads': '', 'article_slug': 'null'}, lotameData: {'Profile': {'tpid': 'c8ef27a0d4ba771a81159f0d2e792db4', 'Audiences': {'Audience': [{'id': '99999', 'abbr': 'sports'}, {'id': '88888', 'abbr': 'movie'}, {'id': '77777', 'abbr': 'blogger'}], 'ThirdPartyAudience': [{'id': '123', 'name': 'Automobiles'}, {'id': '456', 'name': 'Ages: 30-39'}]}}}, placementId: '1310000099', siteId: '1234567890', id: 'fea37168-78f1-4a23-a40e-88437a99377e', auctionId: '27dcb421-95c6-4024-a624-3c03816c5f99', imp: [ { banner: { topframe: 1, w: 300, h: 250, format: [{ w: 300, h: 250 }, { w: 300, h: 600 }] }, id: '2899ec066a91ff8', secure: 1, tagid: 'undefined' } ] },
    sizes: [[300, 250], [300, 600]],
    transactionId: '2e63c0ed-b10c-4008-aed5-84582cecfe87'
  }],
  doneCbCallCount: 1,
  start: 1536838908987,
  timeout: 3000
};
// make sure the impid matches the request bidId
var validResponse = {
  'body': {
    'id': 'd6198807-7a53-4141-b2db-d2cb754d68ba',
    'seatbid': [
      {
        'bid': [
          {
            'id': '677903815252395017',
            'impid': '2899ec066a91ff8',
            'price': 0.5,
            'adm': '<script src="https://fra1-ib.adnxs.com/ab?e=wqT_3QLXB6DXAwAAAwDWAAUBCNDh6dwFENjt4vTs9Y6bWhjxtI3siuOTmREqNgkAAAECCOA_EQEHNAAA4D8ZAAAAgOtR4D8hERIAKREJADERG6gwsqKiBjjtSEDtSEgCUI3J-y5YnPFbYABotc95eMuOBYABAYoBA1VTRJIBAQbwUpgBrAKgAdgEqAEBsAEAuAECwAEDyAEC0AEA2AEA4AEA8AEAigI7dWYoJ2EnLCAyNTI5ODg1LCAxNTM2ODQ4MDgwKTt1ZigncicsIDk4NDkzNTgxNh4A8JySAv0BIWJ6YWpPQWl1c0s0S0VJM0oteTRZQUNDYzhWc3dBRGdBUUFSSTdVaFFzcUtpQmxnQVlQX19fXzhQYUFCd0FYZ0JnQUVCaUFFQmtBRUJtQUVCb0FFQnFBRURzQUVBdVFFcGk0aURBQURnUDhFQktZdUlnd0FBNERfSkFUMDR0TTFxYXZFXzJRRUFBQUFBQUFEd1AtQUJBUFVCBQ8oSmdDQUtBQ0FMVUMFEARMMAkI8FBNQUNBY2dDQWRBQ0FkZ0NBZUFDQU9nQ0FQZ0NBSUFEQVpBREFKZ0RBYWdEcnJDdUNyb0RDVVpTUVRFNk16WTROT0FER2cuLpoCPSFLQXVvRkE2AAFwblBGYklBUW9BRG9KUmxKQk1Ub3pOamcwUUJwSkENAfBAOEQ4LsICL2h0dHA6Ly9wcmViaWQub3JnL2Rldi1kb2NzL2dldHRpbmctc3RhcnRlZC5odG1s2AIA4AKtmEjqAiINOthkZW1vLnRoZS1vem9uZS1wcm9qZWN0LmNvbS_yAhMKD0NVU1RPTV9NT0RFTF9JRBIA8gIaChZDLhYAIExFQUZfTkFNRQEdCB4KGjIzAPCHTEFTVF9NT0RJRklFRBIAgAMAiAMBkAMAmAMUoAMBqgMAwAOsAsgDANgDAOADAOgDAPgDA4AEAJIECS9vcGVucnRiMpgEAKIECTEyNy4wLjAuMagEALIEDAgAEAAYACAAMAA4ALgEAMAEAMgEANIEDjkzMjUjRlJBMTozNjg02gQCCAHgBADwBEHvIIgFAZgFAKAF_xEBsAGqBSRkNjE5ODgwNy03YTUzLTQxNDEtYjJkYi1kMmNiNzU0ZDY4YmHABQDJBWlQFPA_0gUJCQkMpAAA2AUB4AUB8AWZ9CH6BQQIABAAkAYAmAYAuAYAwQYAAAAAAAAAAMgGAA..&s=ab84b182eef7d9b4e58c74fe8987705c25ed803c&referrer=http%3A%2F%2Fdemo.the-ozone-project.com%2F&pp=${AUCTION_PRICE}"></script>',
            'adid': '98493581',
            'adomain': [
              'http://prebid.org'
            ],
            'iurl': 'https://fra1-ib.adnxs.com/cr?id=98493581',
            'cid': '9325',
            'crid': '98493581',
            'cat': [
              'IAB3-1'
            ],
            'w': 300,
            'h': 600,
            'ext': {
              'prebid': {
                'type': 'banner'
              },
              'bidder': {
                'appnexus': {
                  'brand_id': 555545,
                  'auction_id': 6500448734132353000,
                  'bidder_id': 2,
                  'bid_ad_type': 0
                }
              }
            }
          }
        ],
        'seat': 'appnexus'
      }
    ],
    'ext': {
      'responsetimemillis': {
        'appnexus': 47,
        'openx': 30
      }
    },
    'timing': {
      'start': 1536848078.089177,
      'end': 1536848078.142203,
      'TimeTaken': 0.05302619934082031
    }
  },
  'headers': {}
}

describe('ozone Adapter', function () {
  describe('isBidRequestValid', function () {
    // A test ad unit that will consistently return test creatives
    let validBidReq = {
      bidder: BIDDER_CODE,
      params: {
        placementId: '1310000099',
        publisherId: '9876abcd12-3',
        siteId: '1234567890'
      }
    };

    it('should return true when required params found', function () {
      expect(spec.isBidRequestValid(validBidReq)).to.equal(true);
    });

    var validBidReq2 = {

      bidder: BIDDER_CODE,
      params: {
        placementId: '1310000099',
        publisherId: '9876abcd12-3',
        siteId: '1234567890'
      },
      customData: {'gender': 'bart', 'age': 'low'},
      ozoneData: {'networkID': '3048', 'dfpSiteID': 'd.thesun', 'sectionID': 'homepage', 'path': '/', 'sec_id': 'null', 'sec': 'sec', 'topics': 'null', 'kw': 'null', 'aid': 'null', 'search': 'null', 'article_type': 'null', 'hide_ads': '', 'article_slug': 'null'},
      lotameData: {'Profile': {'tpid': 'c8ef27a0d4ba771a81159f0d2e792db4', 'Audiences': {'Audience': [{'id': '99999', 'abbr': 'sports'}, {'id': '88888', 'abbr': 'movie'}, {'id': '77777', 'abbr': 'blogger'}], 'ThirdPartyAudience': [{'id': '123', 'name': 'Automobiles'}, {'id': '456', 'name': 'Ages: 30-39'}]}}},
      siteId: 1234567890
    }

    it('should return true when required params found and all optional params are valid', function () {
      expect(spec.isBidRequestValid(validBidReq2)).to.equal(true);
    });

    var xEmptyPlacement = {
      bidder: BIDDER_CODE,
      params: {
        placementId: '',
        publisherId: '9876abcd12-3',
        siteId: '1234567890'
      }
    };

    it('should not validate empty placementId', function () {
      expect(spec.isBidRequestValid(xEmptyPlacement)).to.equal(false);
    });

    var xMissingPlacement = {
      bidder: BIDDER_CODE,
      params: {
        publisherId: '9876abcd12-3',
        siteId: '1234567890'
      }
    };

    it('should not validate missing placementId', function () {
      expect(spec.isBidRequestValid(xMissingPlacement)).to.equal(false);
    });

    var xBadPlacement = {
      bidder: BIDDER_CODE,
      params: {
        placementId: '123X45',
        publisherId: '9876abcd12-3',
        siteId: '1234567890'
      }
    };

    it('should not validate placementId with a non-numeric value', function () {
      expect(spec.isBidRequestValid(xBadPlacement)).to.equal(false);
    });

    var xBadPlacementTooShort = {
      bidder: BIDDER_CODE,
      params: {
        placementId: 123456789, /* should be exactly 10 chars */
        publisherId: '9876abcd12-3',
        siteId: '1234567890'
      }
    };

    it('should not validate placementId with a numeric value of wrong length', function () {
      expect(spec.isBidRequestValid(xBadPlacementTooShort)).to.equal(false);
    });

    var xBadPlacementTooLong = {
      bidder: BIDDER_CODE,
      params: {
        placementId: 12345678901, /* should be exactly 10 chars */
        publisherId: '9876abcd12-3',
        siteId: '1234567890'
      }
    };

    it('should not validate placementId with a numeric value of wrong length', function () {
      expect(spec.isBidRequestValid(xBadPlacementTooLong)).to.equal(false);
    });

    var xMissingPublisher = {
      bidder: BIDDER_CODE,
      params: {
        placementId: '1234567890',
        siteId: '1234567890'
      }
    };

    it('should not validate missing publisherId', function () {
      expect(spec.isBidRequestValid(xMissingPublisher)).to.equal(false);
    });

    var xBadPublisherTooShort = {
      bidder: BIDDER_CODE,
      params: {
        placementId: '1234567890',
        publisherId: '9876abcd12a',
        siteId: '1234567890'
      }
    };

    it('should not validate publisherId being too short', function () {
      expect(spec.isBidRequestValid(xBadPublisherTooShort)).to.equal(false);
    });

    var xBadPublisherTooLong = {
      bidder: BIDDER_CODE,
      params: {
        placementId: '1234567890',
        publisherId: '9876abcd12abc',
        siteId: '1234567890'
      }
    };

    it('should not validate publisherId being too long', function () {
      expect(spec.isBidRequestValid(xBadPublisherTooLong)).to.equal(false);
    });

    var publisherNumericOk = {
      bidder: BIDDER_CODE,
      params: {
        placementId: '1234567890',
        publisherId: 123456789012,
        siteId: '1234567890'
      }
    };

    it('should validate publisherId being 12 digits', function () {
      expect(spec.isBidRequestValid(publisherNumericOk)).to.equal(true);
    });

    var xEmptyPublisher = {
      bidder: BIDDER_CODE,
      params: {
        placementId: '1234567890',
        publisherId: '',
        siteId: '1234567890'
      }
    };

    it('should not validate empty publisherId', function () {
      expect(spec.isBidRequestValid(xEmptyPublisher)).to.equal(false);
    });

    var xBadSite = {
      bidder: BIDDER_CODE,
      params: {
        placementId: '1234567890',
        publisherId: '9876abcd12-3',
        siteId: '12345Z'
      }
    };

    it('should not validate bad siteId', function () {
      expect(spec.isBidRequestValid(xBadSite)).to.equal(false);
    });

    var xBadSiteTooLong = {
      bidder: BIDDER_CODE,
      params: {
        placementId: '1234567890',
        publisherId: '9876abcd12-3',
        siteId: '12345678901'
      }
    };

    it('should not validate siteId too long', function () {
      expect(spec.isBidRequestValid(xBadSite)).to.equal(false);
    });

    var xBadSiteTooShort = {
      bidder: BIDDER_CODE,
      params: {
        placementId: '1234567890',
        publisherId: '9876abcd12-3',
        siteId: '123456789'
      }
    };

    it('should not validate siteId too short', function () {
      expect(spec.isBidRequestValid(xBadSite)).to.equal(false);
    });

    var allNonStrings = {
      bidder: BIDDER_CODE,
      params: {
        placementId: 1234567890,
        publisherId: '9876abcd12-3',
        siteId: 1234567890
      }
    };

    it('should validate all numeric values being sent as non-string numbers', function () {
      expect(spec.isBidRequestValid(allNonStrings)).to.equal(true);
    });

    var emptySiteId = {
      bidder: BIDDER_CODE,
      params: {
        placementId: 1234567890,
        publisherId: '9876abcd12-3',
        siteId: ''
      }
    };

    it('should not validate siteId being empty string (it is required now)', function () {
      expect(spec.isBidRequestValid(emptySiteId)).to.equal(false);
    });

    var xBadCustomData = {
      bidder: BIDDER_CODE,
      params: {
        'placementId': '1234567890',
        'publisherId': '9876abcd12-3',
        'siteId': '1234567890',
        'customData': 'this aint gonna work'
      }
    };

    it('should not validate customData not being an object', function () {
      expect(spec.isBidRequestValid(xBadCustomData)).to.equal(false);
    });

    var xCustomParams = {
      bidder: BIDDER_CODE,
      params: {
        'placementId': '1234567890',
        'publisherId': '9876abcd12-3',
        'customParams': {'info': 'this is not allowed'},
        siteId: '1234567890'
      }
    };

    it('should not validate customParams being sent', function () {
      expect(spec.isBidRequestValid(xCustomParams)).to.equal(false);
    });

    var xBadOzoneData = {
      bidder: BIDDER_CODE,
      params: {
        'placementId': '1234567890',
        'publisherId': '9876abcd12-3',
        'ozoneData': 'this should be an object',
        siteId: '1234567890'
      }
    };

    it('should not validate ozoneData being sent', function () {
      expect(spec.isBidRequestValid(xBadOzoneData)).to.equal(false);
    });

    var xBadCustomData = {
      bidder: BIDDER_CODE,
      params: {
        'placementId': '1234567890',
        'publisherId': '9876abcd12-3',
        'customData': 'this should be an object',
        siteId: '1234567890'
      }
    };

    it('should not validate ozoneData being sent', function () {
      expect(spec.isBidRequestValid(xBadCustomData)).to.equal(false);
    });
    var xBadLotame = {
      bidder: BIDDER_CODE,
      params: {
        'placementId': '1234567890',
        'publisherId': '9876abcd12-3',
        'lotameData': 'this should be an object',
        siteId: '1234567890'
      }
    };

    it('should not validate lotameData being sent', function () {
      expect(spec.isBidRequestValid(xBadLotame)).to.equal(false);
    });
  });

  describe('buildRequests', function () {
    it('sends bid request to OZONEURI via POST', function () {
      const request = spec.buildRequests(validBidRequests, validBidderRequest);
      expect(request.url).to.equal(OZONEURI);
      expect(request.method).to.equal('POST');
    });

    it('sends data as a string', function () {
      const request = spec.buildRequests(validBidRequests, validBidderRequest);
      expect(request.data).to.be.a('string');
    });

    it('sends all bid parameters', function () {
      const request = spec.buildRequests(validBidRequests, validBidderRequest);
      expect(request).to.have.all.keys(['bidderRequest', 'data', 'method', 'url']);
    });

    it('has correct bidder', function () {
      const request = spec.buildRequests(validBidRequests, validBidderRequest);
      expect(request.bidderRequest.bids[0].bidder).to.equal(BIDDER_CODE);
    });
  });

  describe('interpretResponse', function () {
    it('should build bid array', function () {
      const request = spec.buildRequests(validBidRequests, validBidderRequest);
      const result = spec.interpretResponse(validResponse, request);
      expect(result.length).to.equal(1);
    });

    it('should have all relevant fields', function () {
      const request = spec.buildRequests(validBidRequests, validBidderRequest);
      const result = spec.interpretResponse(validResponse, request);
      const bid = result[0];
      expect(bid.cpm).to.equal(validResponse.body.seatbid[0].bid[0].cpm);
      expect(bid.width).to.equal(validResponse.body.seatbid[0].bid[0].width);
      expect(bid.height).to.equal(validResponse.body.seatbid[0].bid[0].height);
    });

    it('should build bid array with gdpr', function () {
      var validBidderRequestWithGdpr = validBidderRequest;
      validBidderRequestWithGdpr.gdprConsent = {'gdprApplies': 1, 'consentString': 'This is the gdpr consent string'};
      const request = spec.buildRequests(validBidRequests, validBidderRequestWithGdpr);
      const result = spec.interpretResponse(validResponse, request);
      expect(result.length).to.equal(1);
    });
  });
});
