import { expect } from 'chai';

import { spec } from 'modules/adyoulikeBidAdapter.js';
import { newBidder } from 'src/adapters/bidderFactory.js';

describe('Adyoulike Adapter', function () {
  const canonicalUrl = 'https://canonical.url/?t=%26';
  const referrerUrl = 'http://referrer.url/?param=value';
  const pageUrl = 'http://page.url/?param=value';
  const domain = 'domain:123';
  const defaultDC = 'hb-api';
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
  const bidRequestWithEmptyPlacement = [
    {
      'bidId': 'bid_id_0',
      'bidder': 'adyoulike',
      'placementCode': 'adunit/hb-0',
      'params': {},
      'sizes': '300x250',
      'mediaTypes':
        { 'banner':
          {'sizes': ['300x250', '300x600']
          }
        }
    }
  ];
  const bidRequestWithEmptySizes = {
    'bids': [
      {
        'bidId': 'bid_id_0',
        'bidder': 'adyoulike',
        'placementCode': 'adunit/hb-0',
        'params': {
          'placement': 'placement_0'
        },
        'transactionId': 'bid_id_0_transaction_id'
      }
    ],
  };

  const bidRequestWithSinglePlacement = [
    {
      'bidId': 'bid_id_0',
      'bidder': 'adyoulike',
      'placementCode': 'adunit/hb-0',
      'params': {
        'placement': 'placement_0'
      },
      'sizes': '300x250',
      'mediaTypes':
        { 'banner':
          {'sizes': ['300x250']
          },
        'native':
          { 'image': {
            'required': true,
          },
          'title': {
            'required': true,
            'len': 80
          },
          'cta': {
            'required': false
          },
          'sponsoredBy': {
            'required': true
          },
          'clickUrl': {
            'required': true
          },
          'privacyIcon': {
            'required': false
          },
          'privacyLink': {
            'required': false
          },
          'body': {
            'required': true
          },
          'icon': {
            'required': true,
            'sizes': []
          }
          },
        },
      'schain': {
        validation: 'strict',
        config: {
          ver: '1.0',
          complete: 1,
          nodes: [
            {
              asi: 'indirectseller.com',
              sid: '00001',
              hp: 1
            }
          ]
        }
      },
      'transactionId': 'bid_id_0_transaction_id'
    }
  ];

  const bidRequestWithMultipleMediatype = [
    {
      'bidId': 'bid_id_0',
      'bidder': 'adyoulike',
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
        },
        'native': {
          'image': {
            'required': true,
          },
          'title': {
            'required': true,
            'len': 80
          },
          'cta': {
            'required': false
          },
        }
      },
      'transactionId': 'bid_id_0_transaction_id'
    }
  ];

  const bidRequestWithVideo = [
    {
      'bidId': 'bid_id_0',
      'bidder': 'adyoulike',
      'placementCode': 'adunit/hb-0',
      'params': {
        'placement': 'placement_0'
      },
      'sizes': '300x250',
      'mediaTypes':
      {
        'video': {
          'context': 'instream',
          'playerSize': [[ 640, 480 ]]
        }
      },
      'transactionId': 'bid_id_0_transaction_id'
    }
  ];

  const bidRequestWithNativeImageType = [
    {
      'bidId': 'bid_id_0',
      'bidder': 'adyoulike',
      'placementCode': 'adunit/hb-0',
      'params': {
        'placement': 'placement_0'
      },
      'sizes': '300x250',
      'mediaTypes':
      {
        'native': {
          'type': 'image',
          'additional': {
            'will': 'be',
            'sent': ['300x250']
          }
        },
      },
      'transactionId': 'bid_id_0_transaction_id'
    }
  ];

  const sentBidNative = {
    'bid_id_0': {
      'PlacementID': 'e622af275681965d3095808561a1e510',
      'TransactionID': 'e8355240-d976-4cd5-a493-640656fe08e8',
      'AvailableSizes': '',
      'Native': {
        'image': {
          'required': true,
          'sizes': []
        },
        'title': {
          'required': true,
          'len': 80
        },
        'cta': {
          'required': false
        },
        'sponsoredBy': {
          'required': true
        },
        'clickUrl': {
          'required': true
        },
        'privacyIcon': {
          'required': false
        },
        'privacyLink': {
          'required': false
        },
        'body': {
          'required': true
        },
        'icon': {
          'required': true,
          'sizes': []
        }
      }
    }
  };

  const sentBidVideo = {
    'bid_id_0': {
      'PlacementID': 'e622af275681965d3095808561a1e510',
      'TransactionID': 'e8355240-d976-4cd5-a493-640656fe08e8',
      'AvailableSizes': '',
      'Video': {
        playerSize: [640, 480]
      }
    }
  };

  const sentNativeImageType = {
    'additional': {
      'sent': [
        '300x250'
      ],
      'will': 'be'
    },
    'body': {
      'required': false
    },
    'clickUrl': {
      'required': true
    },
    'cta': {
      'required': false
    },
    'icon': {
      'required': false
    },
    'image': {
      'required': true
    },
    'sponsoredBy': {
      'required': true
    },
    'title': {
      'required': true
    },
    'type': 'image'
  };

  const bidRequestWithDCPlacement = [
    {
      'bidId': 'bid_id_0',
      'bidder': 'adyoulike',
      'placementCode': 'adunit/hb-0',
      'params': {
        'placement': 'placement_0',
        'DC': 'fra01'
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
      'bidder': 'adyoulike',
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
      'bidder': 'adyoulike',
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
      'bidder': 'adyoulike',
      'placementCode': 'adunit/hb-2',
      'params': {},
      'sizes': '300x400',
      'transactionId': 'bid_id_2_transaction_id'
    },
    {
      'bidId': 'bid_id_3',
      'bidder': 'adyoulike',
      'placementCode': 'adunit/hb-3',
      'params': {
        'placement': 'placement_3'
      },
      'transactionId': 'bid_id_3_transaction_id'
    }
  ];

  const requestDataOnePlacement = {
    'bid_id_0':
    { 'PlacementID': 'e622af275681965d3095808561a1e510',
      'TransactionID': '1bca18cc-c0fe-439b-88c2-8247d3448f22',
      'Width': 300,
      'Height': 600,
      'AvailableSizes': '300x600'
    }
  }

  const requestDataMultiPlacement = {
    'bid_id_0':
    { 'PlacementID': 'e622af275681965d3095808561a1e510',
      'TransactionID': '1bca18cc-c0fe-439b-88c2-8247d3448f22',
      'Width': 300,
      'Height': 600,
      'AvailableSizes': '300x600'
    },
    'bid_id_1':
    { 'PlacementID': 'e622af275681965d3095808561a1e510',
      'TransactionID': 'e63b2d86-ca60-4167-9cf1-497607079634',
      'Width': 400,
      'Height': 250,
      'AvailableSizes': '300x250'
    }
  }

  const responseWithEmptyPlacement = [
    {
      'Placement': 'placement_0'
    }
  ];

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
  const admSample = "\u003cscript id=\"ayl-prebid-a11a121205932e75e622af275681965d\"\u003e\n(function(){\n\twindow.isPrebid = true\n\tvar prebidResults = /*PREBID*/{\"OnEvents\": {\"CLICK\": [{\"Kind\": \"PIXEL_URL\",\"Url\": \"https://testPixelCLICK.com/fake\"}],\"IMPRESSION\": [{\"Kind\": \"PIXEL_URL\",\"Url\": \"https://testPixelIMP.com/fake\"}, {\"Kind\": \"JAVASCRIPT_URL\",\"Url\": \"https://testJsIMP.com/fake.js\"}]},\"Disabled\": false,\"Attempt\": \"a11a121205932e75e622af275681965d\",\"ApiPrefix\": \"https://fo-api.omnitagjs.com/fo-api\",\"TrackingPrefix\": \"https://tracking.omnitagjs.com/tracking\",\"DynamicPrefix\": \"https://tag-dyn.omnitagjs.com/fo-dyn\",\"StaticPrefix\": \"https://fo-static.omnitagjs.com/fo-static\",\"BlobPrefix\": \"https://fo-api.omnitagjs.com/fo-api/blobs\",\"SspPrefix\": \"https://fo-ssp.omnitagjs.com/fo-ssp\",\"VisitorPrefix\": \"https://visitor.omnitagjs.com/visitor\",\"Trusted\": true,\"Placement\": \"e622af275681965d3095808561a1e510\",\"PlacementAccess\": \"ALL\",\"Site\": \"6e2df7a92203c3c7a25561ed63f25a27\",\"Lang\": \"EN\",\"SiteLogo\": null,\"HasSponsorImage\": true,\"ResizeIframe\": true,\"IntegrationConfig\": {\"Kind\": \"WIDGET\",\"Widget\": {\"ExtraStyleSheet\": \"\",\"Placeholders\": {\"Body\": {\"Color\": {\"R\": 77,\"G\": 21,\"B\": 82,\"A\": 100},\"BackgroundColor\": {\"R\": 255,\"G\": 255,\"B\": 255,\"A\": 100},\"FontFamily\": \"Lato\",\"Width\": \"100%\",\"Align\": \"\",\"BoxShadow\": true},\"CallToAction\": {\"Color\": {\"R\": 26,\"G\": 157,\"B\": 212,\"A\": 100}},\"Description\": {\"Length\": 130},\"Image\": {\"Width\": 600,\"Height\": 600,\"Lowres\": false,\"Raw\": false},\"Size\": {\"Height\": \"250px\",\"Width\": \"300px\"},\"Title\": {\"Color\": {\"R\": 219,\"G\": 181,\"B\": 255,\"A\": 100}}},\"Selector\": {\"Kind\": \"CSS\",\"Css\": \"#ayl-prebid-a11a121205932e75e622af275681965d\"},\"Insertion\": \"AFTER\",\"ClickFormat\": true,\"Creative20\": true,\"WidgetKind\": \"CREATIVE_TEMPLATE_4\"}},\"Legal\": \"Sponsored\",\"ForcedCampaign\": \"f1c80d4bb5643c222ae8de75e9b2f991\",\"ForcedTrack\": \"\",\"ForcedCreative\": \"\",\"ForcedSource\": \"\",\"DisplayMode\": \"DEFAULT\",\"Campaign\": \"f1c80d4bb5643c222ae8de75e9b2f991\",\"CampaignAccess\": \"ALL\",\"CampaignKind\": \"AD_TRAFFIC\",\"DataSource\": \"LOCAL\",\"DataSourceUrl\": \"\",\"DataSourceOnEventsIsolated\": false,\"DataSourceWithoutCookie\": false,\"Content\": {\"Preview\": {\"Thumbnail\": {\"Image\": {\"Kind\": \"EXTERNAL\",\"Data\": {\"External\": {\"Url\": \"https://tag-dyn.omnitagjs.com/fo-dyn/native/preview/image?key=fd4362d35bb174d6f1c80d4bb5643c22\\u0026kind=INTERNAL\\u0026ztop=0.000000\\u0026zleft=0.000000\\u0026zwidth=0.333333\\u0026zheight=1.000000\\u0026width=[width]\\u0026height=[height]\"}},\"ZoneTop\": 0,\"ZoneLeft\": 0,\"ZoneWidth\": 1,\"ZoneHeight\": 1,\"Smart\": false,\"NoTransform\": false,\"Quality\": \"NORMAL\"}},\"Text\": {\"CALLTOACTION\": \"Click here to learn more\",\"DESCRIPTION\": \"Considérant l'extrémité conjoncturelle, il serait bon d'anticiper toutes les voies de bon sens.\",\"SPONSOR\": \"Tested by\",\"TITLE\": \"Adserver Traffic Redirect Internal\"},\"Sponsor\": {\"Name\": \"QA Team\",\"Logo\": {\"Resource\": {\"Kind\": \"EXTERNAL\",\"Data\": {\"External\": {\"Url\": \"https://fo-static.omnitagjs.com/fo-static/native/images/info-ayl.svg\"}},\"ZoneTop\": 0,\"ZoneLeft\": 0,\"ZoneWidth\": 1,\"ZoneHeight\": 1,\"Smart\": false,\"NoTransform\": false,\"Quality\": \"NORMAL\"}}},\"Credit\": {\"Logo\": {\"Resource\": {\"Kind\": \"EXTERNAL\",\"Data\": {\"External\": {\"Url\": \"https://fo-static.omnitagjs.com/fo-static/native/images/info-ayl.png\"}},\"ZoneTop\": 0,\"ZoneLeft\": 0,\"ZoneWidth\": 1,\"ZoneHeight\": 1,\"Smart\": false,\"NoTransform\": false,\"Quality\": \"NORMAL\"}},\"Url\": \"https://blobs.omnitagjs.com/adchoice/\"}},\"Landing\": {\"Url\": \"https://www.w3.org/People/mimasa/test/xhtml/entities/entities-11.xhtml#lat1\",\"LegacyTracking\": false},\"ViewButtons\": {\"Close\": {\"Skip\": 6000}},\"InternalContentFields\": {\"AnimatedImage\": false}},\"AdDomain\": \"adyoulike.com\",\"Opener\": \"REDIRECT\",\"PerformUITriggers\": [\"CLICK\"],\"RedirectionTarget\": \"TAB\"}/*PREBID*/;\n\tvar insertAds = function insertAds() {\insertAds();\n\t}\n})();\n\u003c/script\u003e";
  const responseWithSinglePlacement = [
    {
      'BidID': 'bid_id_0',
      'Placement': 'placement_0',
      'Ad': admSample,
      'Price': 0.5,
      'Height': 600,
      'Meta': testMetaObject
    }
  ];

  const responseWithSingleNative = [{
    'BidID': 'bid_id_0',
    'Placement': 'placement_0',
    'Native': {
      'body': 'Considérant l\'extrémité conjoncturelle, il serait bon d\'anticiper toutes les voies de bon sens.',
      'cta': 'Click here to learn more',
      'clickUrl': 'https://tracking.omnitagjs.com/tracking/ar?event_kind=CLICK&attempt=a11a121205932e75e622af275681965d&campaign=f1c80d4bb5643c222ae8de75e9b2f991&url=https%3A%2F%2Fwww.w3.org%2FPeople%2Fmimasa%2Ftest%2Fxhtml%2Fentities%2Fentities-11.xhtml%23lat1',
      'image': {
        'height': 600,
        'url': 'https://blobs.omnitagjs.com/blobs/f1/f1c80d4bb5643c22/fd4362d35bb174d6f1c80d4bb5643c22',
        'width': 300
      },
      'icon': {
        'height': 50,
        'url': 'https://fo-static.omnitagjs.com/fo-static/native/images/info-ayl.svg',
        'width': 50,
      },
      'privacyIcon': 'https://fo-static.omnitagjs.com/fo-static/native/images/info-ayl.png',
      'privacyLink': 'https://blobs.omnitagjs.com/adchoice/',
      'sponsoredBy': 'QA Team',
      'title': 'Adserver Traffic Redirect Internal',
      'impressionTrackers': [
        'https://testPixelIMP.com/fake',
        'https://tracking.omnitagjs.com/tracking/pixel?event_kind=IMPRESSION&attempt=a11a121205932e75e622af275681965d&campaign=f1c80d4bb5643c222ae8de75e9b2f991',
        'https://tracking.omnitagjs.com/tracking/pixel?event_kind=INSERTION&attempt=a11a121205932e75e622af275681965d&campaign=f1c80d4bb5643c222ae8de75e9b2f991',
      ],
      'javascriptTrackers': [
        'https://testJsIMP.com/fake.js'
      ],
      'clickTrackers': [
        'https://testPixelCLICK.com/fake'
      ]
    },
    'Price': 0.5,
    'Height': 600,
  }];

  const nativeResult = [{
    cpm: 0.5,
    creativeId: undefined,
    currency: 'USD',
    netRevenue: true,
    requestId: 'bid_id_0',
    ttl: 3600,
    mediaType: 'native',
    native: {
      body: 'Considérant l\'extrémité conjoncturelle, il serait bon d\'anticiper toutes les voies de bon sens.',
      clickTrackers: [
        'https://testPixelCLICK.com/fake'
      ],
      clickUrl: 'https://tracking.omnitagjs.com/tracking/ar?event_kind=CLICK&attempt=a11a121205932e75e622af275681965d&campaign=f1c80d4bb5643c222ae8de75e9b2f991&url=https%3A%2F%2Fwww.w3.org%2FPeople%2Fmimasa%2Ftest%2Fxhtml%2Fentities%2Fentities-11.xhtml%23lat1',
      cta: 'Click here to learn more',
      image: {
        height: 600,
        url: 'https://blobs.omnitagjs.com/blobs/f1/f1c80d4bb5643c22/fd4362d35bb174d6f1c80d4bb5643c22',
        width: 300,
      },
      icon: {
        height: 50,
        url: 'https://fo-static.omnitagjs.com/fo-static/native/images/info-ayl.svg',
        width: 50,
      },
      impressionTrackers: [
        'https://testPixelIMP.com/fake',
        'https://tracking.omnitagjs.com/tracking/pixel?event_kind=IMPRESSION&attempt=a11a121205932e75e622af275681965d&campaign=f1c80d4bb5643c222ae8de75e9b2f991',
        'https://tracking.omnitagjs.com/tracking/pixel?event_kind=INSERTION&attempt=a11a121205932e75e622af275681965d&campaign=f1c80d4bb5643c222ae8de75e9b2f991'
      ],
      javascriptTrackers: [
        'https://testJsIMP.com/fake.js'
      ],
      privacyIcon: 'https://fo-static.omnitagjs.com/fo-static/native/images/info-ayl.png',
      privacyLink: 'https://blobs.omnitagjs.com/adchoice/',
      sponsoredBy: 'QA Team',
      title: 'Adserver Traffic Redirect Internal',
    },
    meta: testMetaObject
  }];

  const responseWithSingleVideo = [{
    'BidID': 'bid_id_0',
    'Placement': 'placement_0',
    'Vast': 'PFZBU1Q+RW1wdHkgc2FtcGxlPC92YXN0Pg==',
    'Price': 0.5,
    'Height': 300,
    'Width': 530
  }];

  const videoResult = [{
    cpm: 0.5,
    creativeId: undefined,
    currency: 'USD',
    height: 300,
    netRevenue: true,
    requestId: 'bid_id_0',
    ttl: 3600,
    mediaType: 'video',
    meta: {
      advertiserDomains: []
    },
    vastXml: '<VAST>Empty sample</vast>',
    width: 530
  }];

  const responseWithMultiplePlacements = [
    {
      'BidID': 'bid_id_0',
      'Placement': 'placement_0',
      'Ad': 'placement_0',
      'Price': 0.5,
      'Height': 0, // test with wrong value
      'Width': 300
    },
    {
      'BidID': 'bid_id_1',
      'Placement': 'placement_1',
      'Ad': 'placement_1',
      'Price': 0.6,
      'Height': 250
      // 'Width'  test with missing value
    }
  ];
  const adapter = newBidder(spec);

  let getEndpoint = (dc = defaultDC) => `https://${dc}.omnitagjs.com/hb-api/prebid`;

  describe('inherited functions', function () {
    it('exists and is a function', function () {
      expect(adapter.callBids).to.exist.and.to.be.a('function');
    });
  });

  describe('isBidRequestValid', function () {
    let bid = {
      'bidId': 'bid_id_1',
      'bidder': 'adyoulike',
      'placementCode': 'adunit/hb-1',
      'params': {
        'placement': 'placement_1'
      },
      'sizes': [[300, 600]],
      'transactionId': 'bid_id_1_transaction_id'
    };

    let bidWSize = {
      'bidId': 'bid_id_1',
      'bidder': 'adyoulike',
      'placementCode': 'adunit/hb-1',
      'params': {
        'placement': 'placement_1',
        'size': [250, 300],
      },
      'transactionId': 'bid_id_1_transaction_id'
    };

    let nativeBid = {
      'bidId': 'bid_id_1',
      'bidder': 'adyoulike',
      'placementCode': 'adunit/hb-1',
      'params': {
        'placement': 'placement_1'
      },
      mediaTypes: {
        native: {

        }
      },
      'transactionId': 'bid_id_1_transaction_id'
    };

    it('should return true when required params found', function () {
      expect(!!spec.isBidRequestValid(bid)).to.equal(true);
    });

    it('should return true when required params found with size in bid params', function () {
      expect(!!spec.isBidRequestValid(bidWSize)).to.equal(true);
    });

    it('should return true when required params found for native ad', function () {
      expect(!!spec.isBidRequestValid(nativeBid)).to.equal(true);
    });

    it('should return false when required params are not passed', function () {
      let bid = Object.assign({}, bid);
      delete bid.size;

      expect(!!spec.isBidRequestValid(bid)).to.equal(false);
    });

    it('should return false when required params are not passed', function () {
      let bid = Object.assign({}, bid);
      delete bid.params;
      bid.params = {
        'placement': 0
      };
      expect(!!spec.isBidRequestValid(bid)).to.equal(false);
    });
  });

  describe('buildRequests', function () {
    it('Should expand short native image config type', function() {
      const request = spec.buildRequests(bidRequestWithNativeImageType, bidderRequest);
      const payload = JSON.parse(request.data);

      expect(request.url).to.contain(getEndpoint());
      expect(request.method).to.equal('POST');
      expect(request.url).to.contains('CanonicalUrl=' + encodeURIComponent(canonicalUrl));
      expect(request.url).to.contains('RefererUrl=' + encodeURIComponent(referrerUrl));
      expect(request.url).to.contains('PageUrl=' + encodeURIComponent(pageUrl));
      expect(request.url).to.contains('PageReferrer=' + encodeURIComponent(referrerUrl));

      expect(payload.Version).to.equal('1.0');
      expect(payload.Bids['bid_id_0'].PlacementID).to.be.equal('placement_0');
      expect(payload.PageRefreshed).to.equal(false);
      expect(payload.Bids['bid_id_0'].TransactionID).to.be.equal('bid_id_0_transaction_id');
      expect(payload.Bids['bid_id_0'].Native).deep.equal(sentNativeImageType);
    });

    it('Should target video enpoint for video mediatype', function() {
      const request = spec.buildRequests(bidRequestWithVideo, bidderRequest);
      expect(request.url).to.contain(getEndpoint());
    });

    it('should add gdpr/usp consent information and SChain to the request', function () {
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

      bidderRequest.bids = bidRequestWithSinglePlacement;

      const request = spec.buildRequests(bidRequestWithSinglePlacement, bidderRequest);
      const payload = JSON.parse(request.data);

      expect(payload.gdprConsent).to.exist;
      expect(payload.gdprConsent.consentString).to.exist.and.to.equal(consentString);
      expect(payload.gdprConsent.consentRequired).to.exist.and.to.be.true;
      expect(payload.uspConsent).to.exist.and.to.equal(uspConsentData);
      expect(payload.Bids.bid_id_0.SChain).to.exist.and.to.deep.equal(bidRequestWithSinglePlacement[0].schain);
    });

    it('should not set a default value for gdpr consentRequired', function () {
      let consentString = 'BOJ8RZsOJ8RZsABAB8AAAAAZ+A==';
      let uspConsentData = '1YCC';
      let bidderRequest = {
        'auctionId': '1d1a030790a475',
        'bidderRequestId': '22edbae2733bf6',
        'timeout': 3000,
        'gdprConsent': {
          consentString: consentString
        },
        'uspConsent': uspConsentData
      };

      bidderRequest.bids = bidRequestWithSinglePlacement;

      const request = spec.buildRequests(bidRequestWithSinglePlacement, bidderRequest);
      const payload = JSON.parse(request.data);

      expect(payload.gdprConsent).to.exist;
      expect(payload.gdprConsent.consentString).to.exist.and.to.equal(consentString);
      expect(payload.gdprConsent.consentRequired).to.be.null;
    });

    it('should add userid eids information to the request', function () {
      let bidderRequest = {
        'auctionId': '1d1a030790a475',
        'bidderRequestId': '22edbae2733bf6',
        'timeout': 3000,
        'userId': {
          pubcid: '01EAJWWNEPN3CYMM5N8M5VXY22',
          unsuported: '666'
        }
      };

      bidderRequest.bids = bidRequestWithSinglePlacement;

      const request = spec.buildRequests(bidRequestWithSinglePlacement, bidderRequest);
      const payload = JSON.parse(request.data);

      expect(payload.userId).to.exist;
      expect(payload.userId).to.deep.equal([{
        'source': 'pubcid.org',
        'uids': [{
          'atype': 1,
          'id': '01EAJWWNEPN3CYMM5N8M5VXY22'
        }]
      }]);
    });

    it('sends bid request to endpoint with single placement', function () {
      const request = spec.buildRequests(bidRequestWithSinglePlacement, bidderRequest);
      const payload = JSON.parse(request.data);

      expect(request.url).to.contain(getEndpoint());
      expect(request.method).to.equal('POST');
      expect(request.url).to.contains('CanonicalUrl=' + encodeURIComponent(canonicalUrl));
      expect(request.url).to.contains('RefererUrl=' + encodeURIComponent(referrerUrl));
      expect(request.url).to.contains('PageUrl=' + encodeURIComponent(pageUrl));
      expect(request.url).to.contains('PageReferrer=' + encodeURIComponent(referrerUrl));

      expect(payload.Version).to.equal('1.0');
      expect(payload.Bids['bid_id_0'].PlacementID).to.be.equal('placement_0');
      expect(payload.PageRefreshed).to.equal(false);
      expect(payload.Bids['bid_id_0'].TransactionID).to.be.equal('bid_id_0_transaction_id');
      expect(payload.ortb2).to.deep.equal({site: {page: pageUrl, ref: referrerUrl}});
    });

    it('sends bid request to endpoint with single placement without canonical', function () {
      const request = spec.buildRequests(bidRequestWithSinglePlacement, {...bidderRequest, refererInfo: {...bidderRequest.refererInfo, canonicalUrl: null}});
      const payload = JSON.parse(request.data);

      expect(request.url).to.contain(getEndpoint());
      expect(request.method).to.equal('POST');

      expect(request.url).to.not.contains('CanonicalUrl=' + encodeURIComponent(canonicalUrl));
      expect(payload.Version).to.equal('1.0');
      expect(payload.Bids['bid_id_0'].PlacementID).to.be.equal('placement_0');
      expect(payload.PageRefreshed).to.equal(false);
      expect(payload.Bids['bid_id_0'].TransactionID).to.be.equal('bid_id_0_transaction_id');
    });

    it('sends bid request to endpoint with single placement multiple mediatype', function () {
      const request = spec.buildRequests(bidRequestWithSinglePlacement, {...bidderRequest, refererInfo: {...bidderRequest.refererInfo, canonicalUrl: null}});
      const payload = JSON.parse(request.data);

      expect(request.url).to.contain(getEndpoint());
      expect(request.method).to.equal('POST');

      expect(request.url).to.not.contains('CanonicalUrl=' + encodeURIComponent(canonicalUrl));
      expect(payload.Version).to.equal('1.0');
      expect(payload.Bids['bid_id_0'].PlacementID).to.be.equal('placement_0');
      expect(payload.PageRefreshed).to.equal(false);
      expect(payload.Bids['bid_id_0'].TransactionID).to.be.equal('bid_id_0_transaction_id');
    });

    it('sends bid request to endpoint with multiple placements', function () {
      const request = spec.buildRequests(bidRequestMultiPlacements, bidderRequest);
      const payload = JSON.parse(request.data);
      expect(request.url).to.contain(getEndpoint());
      expect(request.method).to.equal('POST');

      expect(request.url).to.contains('CanonicalUrl=' + encodeURIComponent(canonicalUrl));
      expect(request.url).to.contains('RefererUrl=' + encodeURIComponent(referrerUrl));

      expect(payload.Version).to.equal('1.0');

      expect(payload.Bids['bid_id_0'].PlacementID).to.be.equal('placement_0');
      expect(payload.Bids['bid_id_1'].PlacementID).to.be.equal('placement_1');
      expect(payload.Bids['bid_id_3'].PlacementID).to.be.equal('placement_3');

      expect(payload.Bids['bid_id_0'].TransactionID).to.be.equal('bid_id_0_transaction_id');
      expect(payload.Bids['bid_id_1'].TransactionID).to.be.equal('bid_id_1_transaction_id');
      expect(payload.Bids['bid_id_3'].TransactionID).to.be.equal('bid_id_3_transaction_id');
      expect(payload.PageRefreshed).to.equal(false);
    });

    it('sends bid request to endpoint setted by parameters', function () {
      const request = spec.buildRequests(bidRequestWithDCPlacement, bidderRequest);
      const payload = JSON.parse(request.data);

      expect(request.url).to.contain(getEndpoint(`${defaultDC}-fra01`));
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
        BidID: '123dfsdf',
        Attempt: '32344fdse1',
        Placement: '12df1'
      }];
      serverResponse.body = response;
      let result = spec.interpretResponse(serverResponse, []);
      expect(result).deep.equal([]);
    });

    it('receive reponse with single placement', function () {
      serverResponse.body = responseWithSinglePlacement;
      let result = spec.interpretResponse(serverResponse, {data: '{"Bids":' + JSON.stringify(requestDataOnePlacement) + '}'});

      expect(result.length).to.equal(1);
      expect(result[0].cpm).to.equal(0.5);
      expect(result[0].ad).to.equal(admSample);
      expect(result[0].width).to.equal(300);
      expect(result[0].height).to.equal(600);
      expect(result[0].meta).to.deep.equal(testMetaObject);
    });

    it('receive reponse with multiple placement', function () {
      serverResponse.body = responseWithMultiplePlacements;
      let result = spec.interpretResponse(serverResponse, {data: '{"Bids":' + JSON.stringify(requestDataMultiPlacement) + '}'});

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

    it('receive reponse with Native from ad markup', function () {
      serverResponse.body = responseWithSinglePlacement;
      let result = spec.interpretResponse(serverResponse, {data: '{"Bids":' + JSON.stringify(sentBidNative) + '}'});

      expect(result.length).to.equal(1);

      expect(result).to.deep.equal(nativeResult);
    });

    it('receive reponse with Native ad', function () {
      serverResponse.body = responseWithSingleNative;
      let result = spec.interpretResponse(serverResponse, {data: '{"Bids":' + JSON.stringify(sentBidNative) + '}'});

      expect(result.length).to.equal(1);

      const noMeta = [...nativeResult];
      const metaBackup = noMeta[0].meta;

      // this test should return default meta object
      noMeta[0].meta = { advertiserDomains: [] };

      expect(result).to.deep.equal(noMeta);
    });

    it('receive Vast reponse with Video ad', function () {
      serverResponse.body = responseWithSingleVideo;
      let result = spec.interpretResponse(serverResponse, {data: '{"Bids":' + JSON.stringify(sentBidVideo) + '}'});

      expect(result.length).to.equal(1);
      expect(result).to.deep.equal(videoResult);
    });

    it('should expose gvlid', function() {
      expect(spec.gvlid).to.equal(259)
    })
  });
});
