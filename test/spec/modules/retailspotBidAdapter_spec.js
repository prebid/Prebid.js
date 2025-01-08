import { expect } from 'chai';

import { spec } from 'modules/retailspotBidAdapter.js';
import { newBidder } from 'src/adapters/bidderFactory.js';

describe('RetailSpot Adapter', function () {
  const canonicalUrl = 'https://canonical.url/?t=%26';
  const referrerUrl = 'http://referrer.url/?param=value';
  const pageUrl = 'http://page.url/?param=value';
  const domain = 'domain:123';
  const env = 'preprod';
  const consentString = 'BOJ8RZsOJ8RZsABAB8AAAAAZ+A==';
  const bidderRequest = {
    'auctionId': '1d1a030790a475',
    'bidderRequestId': '22edbae2733bf6',
    'timeout': 3000,
    'gdprConsent': {
      consentString: consentString,
      gdprApplies: true
    },
    refererInfo: {location: referrerUrl, canonicalUrl, domain, topmostLocation: 'fakePageURL'},
    ortb2: {site: {page: pageUrl, ref: referrerUrl}}
  };

  const bidRequestWithSinglePlacement = [
    {
      'bidId': 'bid_id_0',
      'bidder': 'retailspot',
      'placementCode': 'adunit/hb-0',
      'params': {
        'placement': 'placement_0'
      },
      'sizes': '300x250',
      'mediaTypes': {
        'banner': {
          'sizes': ['300x250']
        },
      },
      'transactionId': 'bid_id_0_transaction_id'
    }
  ];

  const bidRequestWithMultipleMediatype = [
    {
      'bidId': 'bid_id_0',
      'bidder': 'retailspot',
      'placementCode': 'adunit/hb-0',
      'params': {
        'placement': 'placement_0'
      },
      'sizes': '300x250',
      'mediaTypes': {
        'banner': {
          'sizes': ['640x480']
        },
        'video': {
          'playerSize': [640, 480],
          'context': 'outstream'
        }
      },
      'transactionId': 'bid_id_0_transaction_id'
    }
  ];

  const sentBidVideo = [
    {
      'bidId': 'bid_id_0',
      'placement': 'test-1234',
      'video': {
        'playerSize': [640, 480]
      }
    }
  ];

  const bidRequestWithDevPlacement = [
    {
      'bidId': 'bid_id_0',
      'bidder': 'retailspot',
      'placementCode': 'adunit/hb-0',
      'params': {
        'placement': 'placement_0',
        'env': 'dev'
      },
      'sizes': '300x250',
      'mediaTypes':
        { 'banner':
          {'sizes': ['300x250']
          }
        },
      'transactionId': 'bid_id_0_transaction_id'
    }
  ];

  const bidRequestMultiPlacements = [
    {
      'bidId': 'bid_id_0',
      'bidder': 'retailspot',
      'placementCode': 'adunit/hb-0',
      'params': {
        'placement': 'placement_0'
      },
      'sizes': '300x250',
      'mediaTypes':
        { 'banner':
          {'sizes': ['300x250']
          }
        },
      'transactionId': 'bid_id_0_transaction_id'
    },
    {
      'bidId': 'bid_id_1',
      'bidder': 'retailspot',
      'placementCode': 'adunit/hb-1',
      'params': {
        'placement': 'placement_1'
      },
      'sizes': [[300, 600]],
      'mediaTypes':
        { 'banner':
          {'sizes': ['300x600']
          }
        },
      'transactionId': 'bid_id_1_transaction_id'
    },
    {
      'bidId': 'bid_id_2',
      'bidder': 'retailspot',
      'placementCode': 'adunit/hb-2',
      'params': {},
      'sizes': '300x400',
      'transactionId': 'bid_id_2_transaction_id'
    },
    {
      'bidId': 'bid_id_3',
      'bidder': 'retailspot',
      'placementCode': 'adunit/hb-3',
      'params': {
        'placement': 'placement_3'
      },
      'transactionId': 'bid_id_3_transaction_id'
    }
  ];

  const requestDataOnePlacement = [
    {
      'bidId': 'bid_id_0',
      'placement': 'e622af275681965d3095808561a1e510',
      'width': 300,
      'height': 600
    }
  ]

  const requestDataMultiPlacement = [
    {
      'bidId': 'bid_id_0',
      'placement': 'e622af275681965d3095808561a1e510',
      'width': 300,
      'height': 600
    },
    {
      'bidId': 'bid_id_1',
      'placement': 'e622af275681965d3095808561a1e510',
      'width': 400,
      'height': 250
    }
  ]

  const testMetaObject = {
    'networkId': 123,
    'advertiserId': '3',
    'advertiserName': 'foobar',
    'advertiserDomains': ['foobar.com'],
    'brandId': '345',
    'brandName': 'Foo',
    'primaryCatId': '34',
    'secondaryCatIds': ['IAB-222', 'IAB-333'],
    'mediaType': 'banner'
  };
  const admSample = "\u003cscript id=\"ayl-prebid-a11a121205932e75e622af275681965d\"\u003e\n(function(){\n\twindow.isPrebid = true\n\tvar prebidResults = /*PREBID*/{\"OnEvents\": {\"CLICK\": [{\"Kind\": \"PIXEL_URL\",\"Url\": \"https://testPixelCLICK.com/fake\"}],\"IMPRESSION\": [{\"Kind\": \"PIXEL_URL\",\"Url\": \"https://testPixelIMP.com/fake\"}, {\"Kind\": \"JAVASCRIPT_URL\",\"Url\": \"https://testJsIMP.com/fake.js\"}]},\"Disabled\": false,\"Attempt\": \"a11a121205932e75e622af275681965d\",\"ApiPrefix\": \"https://fo-api.omnitagjs.com/fo-api\",\"TrackingPrefix\": \"https://tracking.omnitagjs.com/tracking\",\"DynamicPrefix\": \"https://tag-dyn.omnitagjs.com/fo-dyn\",\"StaticPrefix\": \"https://fo-static.omnitagjs.com/fo-static\",\"BlobPrefix\": \"https://fo-api.omnitagjs.com/fo-api/blobs\",\"SspPrefix\": \"https://fo-ssp.omnitagjs.com/fo-ssp\",\"VisitorPrefix\": \"https://visitor.omnitagjs.com/visitor\",\"Trusted\": true,\"Placement\": \"e622af275681965d3095808561a1e510\",\"PlacementAccess\": \"ALL\",\"Site\": \"6e2df7a92203c3c7a25561ed63f25a27\",\"Lang\": \"EN\",\"SiteLogo\": null,\"HasSponsorImage\": true,\"ResizeIframe\": true,\"IntegrationConfig\": {\"Kind\": \"WIDGET\",\"Widget\": {\"ExtraStyleSheet\": \"\",\"Placeholders\": {\"Body\": {\"Color\": {\"R\": 77,\"G\": 21,\"B\": 82,\"A\": 100},\"BackgroundColor\": {\"R\": 255,\"G\": 255,\"B\": 255,\"A\": 100},\"FontFamily\": \"Lato\",\"Width\": \"100%\",\"Align\": \"\",\"BoxShadow\": true},\"CallToAction\": {\"Color\": {\"R\": 26,\"G\": 157,\"B\": 212,\"A\": 100}},\"Description\": {\"Length\": 130},\"Image\": {\"Width\": 600,\"Height\": 600,\"Lowres\": false,\"Raw\": false},\"Size\": {\"Height\": \"250px\",\"Width\": \"300px\"},\"Title\": {\"Color\": {\"R\": 219,\"G\": 181,\"B\": 255,\"A\": 100}}},\"Selector\": {\"Kind\": \"CSS\",\"Css\": \"#ayl-prebid-a11a121205932e75e622af275681965d\"},\"Insertion\": \"AFTER\",\"ClickFormat\": true,\"Creative20\": true,\"WidgetKind\": \"CREATIVE_TEMPLATE_4\"}},\"Legal\": \"Sponsored\",\"ForcedCampaign\": \"f1c80d4bb5643c222ae8de75e9b2f991\",\"ForcedTrack\": \"\",\"ForcedCreative\": \"\",\"ForcedSource\": \"\",\"DisplayMode\": \"DEFAULT\",\"Campaign\": \"f1c80d4bb5643c222ae8de75e9b2f991\",\"CampaignAccess\": \"ALL\",\"CampaignKind\": \"AD_TRAFFIC\",\"DataSource\": \"LOCAL\",\"DataSourceUrl\": \"\",\"DataSourceOnEventsIsolated\": false,\"DataSourceWithoutCookie\": false,\"Content\": {\"Preview\": {\"Thumbnail\": {\"Image\": {\"Kind\": \"EXTERNAL\",\"Data\": {\"External\": {\"Url\": \"https://tag-dyn.omnitagjs.com/fo-dyn/native/preview/image?key=fd4362d35bb174d6f1c80d4bb5643c22\\u0026kind=INTERNAL\\u0026ztop=0.000000\\u0026zleft=0.000000\\u0026zwidth=0.333333\\u0026zheight=1.000000\\u0026width=[width]\\u0026height=[height]\"}},\"ZoneTop\": 0,\"ZoneLeft\": 0,\"ZoneWidth\": 1,\"ZoneHeight\": 1,\"Smart\": false,\"NoTransform\": false,\"Quality\": \"NORMAL\"}},\"Text\": {\"CALLTOACTION\": \"Click here to learn more\",\"DESCRIPTION\": \"Considérant l'extrémité conjoncturelle, il serait bon d'anticiper toutes les voies de bon sens.\",\"SPONSOR\": \"Tested by\",\"TITLE\": \"Adserver Traffic Redirect Internal\"},\"Sponsor\": {\"Name\": \"QA Team\",\"Logo\": {\"Resource\": {\"Kind\": \"EXTERNAL\",\"Data\": {\"External\": {\"Url\": \"https://fo-static.omnitagjs.com/fo-static/native/images/info-ayl.svg\"}},\"ZoneTop\": 0,\"ZoneLeft\": 0,\"ZoneWidth\": 1,\"ZoneHeight\": 1,\"Smart\": false,\"NoTransform\": false,\"Quality\": \"NORMAL\"}}},\"Credit\": {\"Logo\": {\"Resource\": {\"Kind\": \"EXTERNAL\",\"Data\": {\"External\": {\"Url\": \"https://fo-static.omnitagjs.com/fo-static/native/images/info-ayl.png\"}},\"ZoneTop\": 0,\"ZoneLeft\": 0,\"ZoneWidth\": 1,\"ZoneHeight\": 1,\"Smart\": false,\"NoTransform\": false,\"Quality\": \"NORMAL\"}},\"Url\": \"https://blobs.omnitagjs.com/adchoice/\"}},\"Landing\": {\"Url\": \"https://www.w3.org/People/mimasa/test/xhtml/entities/entities-11.xhtml#lat1\",\"LegacyTracking\": false},\"ViewButtons\": {\"Close\": {\"Skip\": 6000}},\"InternalContentFields\": {\"AnimatedImage\": false}},\"AdDomain\": \"retailspot.com\",\"Opener\": \"REDIRECT\",\"PerformUITriggers\": [\"CLICK\"],\"RedirectionTarget\": \"TAB\"}/*PREBID*/;\n\tvar insertAds = function insertAds() {\insertAds();\n\t}\n})();\n\u003c/script\u003e";
  const responseWithSinglePlacement = [
    {
      'requestId': 'bid_id_0',
      'placement': 'placement_0',
      'ad': admSample,
      'cpm': 0.5,
      'height': 250,
      'width': 300,
      'meta': testMetaObject,
      'mediaType': 'banner'
    }
  ];

  const responseWithSingleVideo = [{
    'requestId': 'bid_id_0',
    'placement': 'placement_0',
    'vastXml': 'PFZBU1Q+RW1wdHkgc2FtcGxlPC92YXN0Pg==',
    'cpm': 0.5,
    'height': 300,
    'width': 530,
    'mediaType': 'video',
    'creativeId': 'testvideo123',
    'netRevenue': true,
    'currency': 'USD',
    'adId': 'fakeAdID',
    'dealId': 'fakeDealId'
  }];

  const videoResult = [{
    bidderCode: 'retailspot',
    cpm: 0.5,
    creativeId: 'testvideo123',
    currency: 'USD',
    height: 300,
    netRevenue: true,
    requestId: 'bid_id_0',
    ttl: 3600,
    mediaType: 'video',
    meta: {
      advertiserDomains: ['retail-spot.io']
    },
    vastXml: '<VAST>Empty sample</vast>',
    width: 530,
    adId: 'fakeAdID',
    dealId: 'fakeDealId'
  }];

  const responseWithMultiplePlacements = [
    {
      'requestId': 'bid_id_0',
      'mediaType': 'banner',
      'placement': 'placement_0',
      'ad': 'placement_0',
      'cpm': 0.5,
      'height': 0, // test with wrong value
      'width': 300,
    },
    {
      'requestId': 'bid_id_1',
      'mediaType': 'banner',
      'placement': 'placement_1',
      'ad': 'placement_1',
      'cpm': 0.6,
      'height': 250
      // 'width'  test with missing value
    }
  ];
  const adapter = newBidder(spec);

  const DEV_URL = 'http://localhost:3030/';

  describe('inherited functions', function () {
    it('exists and is a function', function () {
      expect(adapter.callBids).to.exist.and.to.be.a('function');
    });
  });

  describe('isBidRequestValid', function () {
    let bid = {
      'bidId': 'bid_id_1',
      'bidder': 'retailspot',
      'placementCode': 'adunit/hb-1',
      'params': {
        'placement': 'placement_1'
      },
      'sizes': [[300, 600]],
      'transactionId': 'bid_id_1_transaction_id'
    };

    let bidWSize = {
      'bidId': 'bid_id_1',
      'bidder': 'retailspot',
      'placementCode': 'adunit/hb-1',
      'params': {
        'placement': 'placement_1',
        'size': [250, 300],
      },
      'transactionId': 'bid_id_1_transaction_id'
    };

    it('should return true when required params found', function () {
      expect(!!spec.isBidRequestValid(bid)).to.equal(true);
    });

    it('should return true when required params found with size in bid params', function () {
      expect(!!spec.isBidRequestValid(bidWSize)).to.equal(true);
    });

    it('should return false when required params are not passed', function () {
      let invalidBid = Object.assign({}, bid);
      delete invalidBid.sizes;

      expect(!!spec.isBidRequestValid(invalidBid)).to.equal(false);
    });

    it('should return false when required params are not passed', function () {
      let invalidBid = Object.assign({}, bid);
      delete invalidBid.params;
      invalidBid.params = {
        'placement': 0
      };
      expect(!!spec.isBidRequestValid(invalidBid)).to.equal(false);
    });
  });

  describe('buildRequests', function () {
    it('should add gdpr/usp consent information to the request', function () {
      let consentString = 'BOJ8RZsOJ8RZsABAB8AAAAAZ+A==';
      let uspConsentData = '1YCC';
      let bidderRequest = {
        'auctionId': '1d1a030790a475',
        'bidderRequestId': '22edbae2733bf6',
        'timeout': 3000,
        'gdprConsent': {
          consentString: consentString,
          gdprApplies: true
        },
        'uspConsent': uspConsentData
      };

      bidderRequest.Bids = bidRequestWithSinglePlacement;

      const request = spec.buildRequests(bidRequestWithSinglePlacement, bidderRequest);
      const payload = JSON.parse(request.data);

      expect(payload.gdprConsent).to.exist;
      expect(payload.gdprConsent.consentString).to.exist.and.to.equal(consentString);
      expect(payload.uspConsent).to.exist.and.to.equal(uspConsentData);
    });

    it('sends bid request to endpoint with single placement', function () {
      bidderRequest.Bids = bidRequestWithSinglePlacement;

      const request = spec.buildRequests(bidRequestWithSinglePlacement, bidderRequest);
      const payload = JSON.parse(request.data);

      expect(request.url).to.contain('https://hbapi.retailspotads.com/');
      expect(request.method).to.equal('POST');

      expect(payload).to.deep.equal(bidderRequest);
    });

    it('sends bid request to endpoint with single placement multiple mediatype', function () {
      bidderRequest.Bids = bidRequestWithMultipleMediatype;
      const request = spec.buildRequests(bidRequestWithSinglePlacement, bidderRequest);
      const payload = JSON.parse(request.data);

      expect(request.url).to.contain('https://hbapi.retailspotads.com/');
      expect(request.method).to.equal('POST');

      expect(payload).to.deep.equal(bidderRequest);
    });

    it('sends bid request to endpoint with multiple placements', function () {
      bidderRequest.Bids = bidRequestMultiPlacements;
      const request = spec.buildRequests(bidRequestMultiPlacements, bidderRequest);
      const payload = JSON.parse(request.data);

      expect(request.url).to.contain('https://hbapi.retailspotads.com/');
      expect(request.method).to.equal('POST');

      expect(payload).to.deep.equal(bidderRequest);
    });

    it('sends bid request to endpoint setted by parameters', function () {
      const request = spec.buildRequests(bidRequestWithDevPlacement, bidderRequest);
      expect(request.url).to.contain(DEV_URL);
    });
  });
  //
  describe('interpretResponse', function () {
    let serverResponse;

    beforeEach(function () {
      serverResponse = {
        body: {}
      }
    });

    it('handles nobid responses', function () {
      let response = [{
        requestId: '123dfsdf',
        placement: '12df1'
      }];
      serverResponse.body = response;
      let result = spec.interpretResponse(serverResponse, []);
      expect(result).deep.equal([]);
    });

    it('receive reponse with single placement', function () {
      serverResponse.body = responseWithSinglePlacement;
      let result = spec.interpretResponse(serverResponse, {data: '{"bids":' + JSON.stringify(requestDataOnePlacement) + '}'});

      expect(result.length).to.equal(1);
      expect(result[0].cpm).to.equal(0.5);
      expect(result[0].ad).to.equal(admSample);
      expect(result[0].width).to.equal(300);
      expect(result[0].height).to.equal(250);
      expect(result[0].meta).to.deep.equal(testMetaObject);
    });

    it('receive reponse with multiple placement', function () {
      serverResponse.body = responseWithMultiplePlacements;
      let result = spec.interpretResponse(serverResponse, {data: '{"bids":' + JSON.stringify(requestDataMultiPlacement) + '}'});

      expect(result.length).to.equal(2);

      expect(result[0].cpm).to.equal(0.5);
      expect(result[0].ad).to.equal('placement_0');
      expect(result[0].width).to.equal(300);
      expect(result[0].height).to.equal(600);

      expect(result[1].cpm).to.equal(0.6);
      expect(result[1].ad).to.equal('placement_1');
      expect(result[1].width).to.equal(400);
      expect(result[1].height).to.equal(250);
    });

    it('receive Vast reponse with Video ad', function () {
      serverResponse.body = responseWithSingleVideo;
      let result = spec.interpretResponse(serverResponse, {data: '{"bids":' + JSON.stringify(sentBidVideo) + '}'});

      expect(result.length).to.equal(1);
      expect(result).to.deep.equal(videoResult);
    });
  });
});
