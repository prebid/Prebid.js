import {expect} from 'chai';
import {spec} from 'modules/pubmaticBidAdapter';
import * as utils from 'src/utils';
import {config} from 'src/config';
const constants = require('src/constants.json');

describe('PubMatic adapter', function () {
  let bidRequests;
  let videoBidRequests;
  let multipleMediaRequests;
  let bidResponses;
  let nativeBidRequests;
  let nativeBidRequestsWithAllParams;
  let nativeBidRequestsWithoutAsset;
  let nativeBidRequestsWithRequiredParam;
  let nativeBidResponse;
  let validnativeBidImpression;
  let validnativeBidImpressionWithRequiredParam;
  let nativeBidImpressionWithoutRequiredParams;
  let validnativeBidImpressionWithAllParams;
  let bannerAndVideoBidRequests;
  let bannerAndNativeBidRequests;
  let videoAndNativeBidRequests;
  let bannerVideoAndNativeBidRequests;
  let bannerBidResponse;
  let videoBidResponse;
  let schainConfig;

  beforeEach(function () {
    schainConfig = {
      'ver': '1.0',
      'complete': 1,
      'nodes': [
        {
          'asi': 'indirectseller.com',
          'sid': '00001',
          'hp': 1
        },

        {
          'asi': 'indirectseller-2.com',
          'sid': '00002',
          'hp': 2
        }
      ]
    };

    bidRequests = [
      {
        bidder: 'pubmatic',
        mediaTypes: {
          banner: {
            sizes: [[728, 90], [160, 600]]
          }
        },
        params: {
          publisherId: '301',
          adSlot: '/15671365/DMDemo@300x250:0',
          kadfloor: '1.2',
    		  pmzoneid: 'aabc, ddef',
    		  kadpageurl: 'www.publisher.com',
    		  yob: '1986',
    		  gender: 'M',
    		  lat: '12.3',
    		  lon: '23.7',
    		  wiid: '1234567890',
    		  profId: '100',
    		  verId: '200',
          currency: 'AUD',
          dctr: 'key1:val1,val2|key2:val1'
        },
        placementCode: '/19968336/header-bid-tag-1',
        sizes: [[300, 250], [300, 600]],
        bidId: '23acc48ad47af5',
        requestId: '0fb4905b-9456-4152-86be-c6f6d259ba99',
        bidderRequestId: '1c56ad30b9b8ca8',
        transactionId: '92489f71-1bf2-49a0-adf9-000cea934729',
        schain: schainConfig
      }
    ];

    videoBidRequests =
    [
      {
        code: 'video1',
        mediaTypes: {
          video: {
            playerSize: [640, 480],
            context: 'instream'
          }
        },
        bidder: 'pubmatic',
        bidId: '22bddb28db77d',
        params: {
          publisherId: '5890',
          adSlot: 'Div1@0x0', // ad_id or tagid
          video: {
            mimes: ['video/mp4', 'video/x-flv'],
            skippable: true,
            minduration: 5,
            maxduration: 30,
            startdelay: 5,
            playbackmethod: [1, 3],
            api: [1, 2],
            protocols: [2, 3],
            battr: [13, 14],
            linearity: 1,
            placement: 2,
            minbitrate: 10,
            maxbitrate: 10
          }
        }
      }
    ];

    multipleMediaRequests = [
      {
        bidder: 'pubmatic',
        params: {
          publisherId: '301',
          adSlot: '/15671365/DMDemo@300x250:0',
          kadfloor: '1.2',
          pmzoneid: 'aabc, ddef',
          kadpageurl: 'www.publisher.com',
          yob: '1986',
          gender: 'M',
          lat: '12.3',
          lon: '23.7',
          wiid: '1234567890',
          profId: '100',
          verId: '200'
        }
      },
      {
        code: 'div-instream',
        mediaTypes: {
          video: {
            context: 'instream',
            playerSize: [300, 250]
          },
        },
        bidder: 'pubmatic',
        params: {
          publisherId: '5890',
          adSlot: 'Div1@640x480', // ad_id or tagid
          video: {
            mimes: ['video/mp4', 'video/x-flv'],
            skippable: true,
            minduration: 5,
            maxduration: 30,
            startdelay: 15,
            playbackmethod: [1, 3],
            api: [1, 2],
            protocols: [2, 3],
            w: 640,
            h: 480,
            battr: [13, 14],
            linearity: 1,
            placement: 2,
            minbitrate: 100,
            maxbitrate: 4096
          }
        }
      }
    ];

    nativeBidRequests = [{
      code: '/19968336/prebid_native_example_1',
      sizes: [
        [300, 250]
      ],
      mediaTypes: {
        native: {
          title: {
            required: true,
            length: 80
          },
          image: {
            required: true,
            sizes: [300, 250]
          },
          sponsoredBy: {
            required: true
          }
        }
      },
      nativeParams: {
        title: { required: true, length: 80 },
        image: { required: true, sizes: [300, 250] },
        sponsoredBy: { required: true }
      },
      bidder: 'pubmatic',
      params: {
        publisherId: '5670',
        adSlot: '/43743431/NativeAutomationPrebid@1x1',
      },
      bidId: '2a5571261281d4',
      requestId: 'B68287E1-DC39-4B38-9790-FE4F179739D6',
      bidderRequestId: '1c56ad30b9b8ca8',
    }];

    nativeBidRequestsWithAllParams = [{
      code: '/19968336/prebid_native_example_1',
      sizes: [
        [300, 250]
      ],
      mediaTypes: {
        native: {
          title: {required: true, len: 80, ext: {'title1': 'title2'}},
          icon: {required: true, sizes: [50, 50], ext: {'icon1': 'icon2'}},
          image: {required: true, sizes: [728, 90], ext: {'image1': 'image2'}, 'mimes': ['image/png', 'image/gif']},
          sponsoredBy: {required: true, len: 10, ext: {'sponsor1': 'sponsor2'}},
          body: {required: true, len: 10, ext: {'body1': 'body2'}},
          rating: {required: true, len: 10, ext: {'rating1': 'rating2'}},
          likes: {required: true, len: 10, ext: {'likes1': 'likes2'}},
          downloads: {required: true, len: 10, ext: {'downloads1': 'downloads2'}},
          price: {required: true, len: 10, ext: {'price1': 'price2'}},
          saleprice: {required: true, len: 10, ext: {'saleprice1': 'saleprice2'}},
          phone: {required: true, len: 10, ext: {'phone1': 'phone2'}},
          address: {required: true, len: 10, ext: {'address1': 'address2'}},
          desc2: {required: true, len: 10, ext: {'desc21': 'desc22'}},
          displayurl: {required: true, len: 10, ext: {'displayurl1': 'displayurl2'}}
        }
      },
      nativeParams: {
        title: {required: true, len: 80, ext: {'title1': 'title2'}},
        icon: {required: true, sizes: [50, 50], ext: {'icon1': 'icon2'}},
        image: {required: true, sizes: [728, 90], ext: {'image1': 'image2'}, 'mimes': ['image/png', 'image/gif']},
        sponsoredBy: {required: true, len: 10, ext: {'sponsor1': 'sponsor2'}},
        body: {required: true, len: 10, ext: {'body1': 'body2'}},
        rating: {required: true, len: 10, ext: {'rating1': 'rating2'}},
        likes: {required: true, len: 10, ext: {'likes1': 'likes2'}},
        downloads: {required: true, len: 10, ext: {'downloads1': 'downloads2'}},
        price: {required: true, len: 10, ext: {'price1': 'price2'}},
        saleprice: {required: true, len: 10, ext: {'saleprice1': 'saleprice2'}},
        phone: {required: true, len: 10, ext: {'phone1': 'phone2'}},
        address: {required: true, len: 10, ext: {'address1': 'address2'}},
        desc2: {required: true, len: 10, ext: {'desc21': 'desc22'}},
        displayurl: {required: true, len: 10, ext: {'displayurl1': 'displayurl2'}}
      },
      bidder: 'pubmatic',
      params: {
        publisherId: '5670',
        adSlot: '/43743431/NativeAutomationPrebid@1x1',
      },
      bidId: '2a5571261281d4',
      requestId: 'B68287E1-DC39-4B38-9790-FE4F179739D6',
      bidderRequestId: '1c56ad30b9b8ca8',
    }];

    nativeBidRequestsWithoutAsset = [{
      code: '/19968336/prebid_native_example_1',
      sizes: [
        [300, 250]
      ],
      mediaTypes: {
        native: {
          type: 'image'
        }
      },
      nativeParams: {
        title: { required: true },
        image: { required: true },
        sponsoredBy: { required: true },
        clickUrl: { required: true }
      },
      bidder: 'pubmatic',
      params: {
        publisherId: '5670',
        adSlot: '/43743431/NativeAutomationPrebid@1x1',
      }
    }];

    nativeBidRequestsWithRequiredParam = [{
      code: '/19968336/prebid_native_example_1',
      sizes: [
        [300, 250]
      ],
      mediaTypes: {
        native: {
          title: {
            required: false,
            length: 80
          },
          image: {
            required: false,
            sizes: [300, 250]
          },
          sponsoredBy: {
            required: true
          }
        }
      },
      nativeParams: {
        title: { required: false, length: 80 },
        image: { required: false, sizes: [300, 250] },
        sponsoredBy: { required: true }
      },
      bidder: 'pubmatic',
      params: {
        publisherId: '5670',
        adSlot: '/43743431/NativeAutomationPrebid@1x1',
      }
    }];

    bannerAndVideoBidRequests = [
      {
        code: 'div-banner-video',
        mediaTypes: {
          video: {
            playerSize: [640, 480],
            context: 'instream'
          },
          banner: {
            sizes: [[300, 250], [300, 600]]
          }
        },
        bidder: 'pubmatic',
        params: {
          publisherId: '301',
          adSlot: '/15671365/DMDemo@300x250:0',
          kadfloor: '1.2',
          pmzoneid: 'aabc, ddef',
          kadpageurl: 'www.publisher.com',
          yob: '1986',
          gender: 'M',
          lat: '12.3',
          lon: '23.7',
          wiid: '1234567890',
          profId: '100',
          verId: '200',
          currency: 'AUD',
          dctr: 'key1:val1,val2|key2:val1',
          video: {
            mimes: ['video/mp4', 'video/x-flv'],
            skippable: true,
            minduration: 5,
            maxduration: 30,
            startdelay: 15,
            playbackmethod: [1, 3],
            api: [1, 2],
            protocols: [2, 3],
            w: 640,
            h: 480,
            battr: [13, 14],
            linearity: 1,
            placement: 2,
            minbitrate: 100,
            maxbitrate: 4096
          }
        },
        placementCode: '/19968336/header-bid-tag-1',
        sizes: [[728, 90]],
        bidId: '23acc48ad47af5',
        requestId: '0fb4905b-9456-4152-86be-c6f6d259ba99',
        bidderRequestId: '1c56ad30b9b8ca8',
        transactionId: '92489f71-1bf2-49a0-adf9-000cea934729'
      }
    ];

    bannerAndNativeBidRequests = [
      {
        code: 'div-banner-native',
        mediaTypes: {
          native: {
            title: {
              required: true,
              length: 80
            },
            image: {
              required: true,
              sizes: [300, 250]
            },
            sponsoredBy: {
              required: true
            }
          },
          banner: {
            sizes: [[300, 250], [300, 600]]
          }
        },
        nativeParams: {
          title: { required: true, length: 80 },
          image: { required: true, sizes: [300, 250] },
          sponsoredBy: { required: true }
        },
        bidder: 'pubmatic',
        params: {
          publisherId: '301',
          adSlot: '/15671365/DMDemo@300x250:0',
          kadfloor: '1.2',
          pmzoneid: 'aabc, ddef',
          kadpageurl: 'www.publisher.com',
          yob: '1986',
          gender: 'M',
          lat: '12.3',
          lon: '23.7',
          wiid: '1234567890',
          profId: '100',
          verId: '200',
          currency: 'AUD',
          dctr: 'key1:val1,val2|key2:val1'
        },
        placementCode: '/19968336/header-bid-tag-1',
        sizes: [[728, 90]],
        bidId: '23acc48ad47af5',
        requestId: '0fb4905b-9456-4152-86be-c6f6d259ba99',
        bidderRequestId: '1c56ad30b9b8ca8',
        transactionId: '92489f71-1bf2-49a0-adf9-000cea934729'
      }
    ];

    videoAndNativeBidRequests = [
      {
        code: 'div-video-native',
        mediaTypes: {
          native: {
            title: {
              required: true,
              length: 80
            },
            image: {
              required: true,
              sizes: [300, 250]
            },
            sponsoredBy: {
              required: true
            }
          },
          video: {
            playerSize: [640, 480],
            context: 'instream'
          }
        },
        nativeParams: {
          title: { required: true, length: 80 },
          image: { required: true, sizes: [300, 250] },
          sponsoredBy: { required: true }
        },
        bidder: 'pubmatic',
        params: {
          publisherId: '301',
          adSlot: '/15671365/DMDemo@300x250:0',
          video: {
            mimes: ['video/mp4', 'video/x-flv'],
            skippable: true,
            minduration: 5,
            maxduration: 30,
            startdelay: 15,
            playbackmethod: [1, 3],
            api: [1, 2],
            protocols: [2, 3],
            w: 640,
            h: 480,
            battr: [13, 14],
            linearity: 1,
            placement: 2,
            minbitrate: 100,
            maxbitrate: 4096
          }
        },
        placementCode: '/19968336/header-bid-tag-1',
        sizes: [[728, 90]],
        bidId: '23acc48ad47af5',
        requestId: '0fb4905b-9456-4152-86be-c6f6d259ba99',
        bidderRequestId: '1c56ad30b9b8ca8',
        transactionId: '92489f71-1bf2-49a0-adf9-000cea934729'
      }
    ];

    bannerVideoAndNativeBidRequests = [
      {
        code: 'div-video-native',
        mediaTypes: {
          native: {
            title: {
              required: true,
              length: 80
            },
            image: {
              required: true,
              sizes: [300, 250]
            },
            sponsoredBy: {
              required: true
            }
          },
          video: {
            playerSize: [640, 480],
            context: 'instream'
          },
          banner: {
            sizes: [[300, 250], [300, 600]]
          }
        },
        nativeParams: {
          title: { required: true, length: 80 },
          image: { required: true, sizes: [300, 250] },
          sponsoredBy: { required: true }
        },
        bidder: 'pubmatic',
        params: {
          publisherId: '301',
          adSlot: '/15671365/DMDemo@300x250:0',
          video: {
            mimes: ['video/mp4', 'video/x-flv'],
            skippable: true,
            minduration: 5,
            maxduration: 30,
            startdelay: 15,
            playbackmethod: [1, 3],
            api: [1, 2],
            protocols: [2, 3],
            w: 640,
            h: 480,
            battr: [13, 14],
            linearity: 1,
            placement: 2,
            minbitrate: 100,
            maxbitrate: 4096
          }
        },
        placementCode: '/19968336/header-bid-tag-1',
        sizes: [[728, 90]],
        bidId: '23acc48ad47af5',
        requestId: '0fb4905b-9456-4152-86be-c6f6d259ba99',
        bidderRequestId: '1c56ad30b9b8ca8',
        transactionId: '92489f71-1bf2-49a0-adf9-000cea934729'
      }
    ];

    bidResponses = {
      'body': {
        'id': '93D3BAD6-E2E2-49FB-9D89-920B1761C865',
        'seatbid': [{
          'bid': [{
            'id': '74858439-49D7-4169-BA5D-44A046315B2F',
            'impid': '22bddb28db77d',
            'price': 1.3,
            'adm': 'image3.pubmatic.com Layer based creative',
            'adomain': ['blackrock.com'],
            'h': 250,
            'w': 300,
            'ext': {
              'deal_channel': 6,
              'advid': 976,
              'dspid': 123
            }
          }]
        }, {
          'bid': [{
            'id': '74858439-49D7-4169-BA5D-44A046315BEF',
            'impid': '22bddb28db77e',
            'price': 1.7,
            'adm': 'image3.pubmatic.com Layer based creative',
            'adomain': ['hivehome.com'],
            'h': 250,
            'w': 300,
            'ext': {
              'deal_channel': 5,
              'advid': 832,
              'dspid': 422
            }
          }]
        }]
      }
    };

    nativeBidResponse = {
      'body': {
        'id': '1544691825939',
        'seatbid': [{
          'bid': [{
            'id': 'B68287E1-DC39-4B38-9790-FE4F179739D6',
            'impid': '2a5571261281d4',
            'price': 0.01,
            'adm': "{\"native\":{\"assets\":[{\"id\":1,\"title\":{\"text\":\"Native Test Title\"}},{\"id\":2,\"img\":{\"h\":627,\"url\":\"http://stagingpub.net/native_ads/PM-Native-Ad-1200x627.png\",\"w\":1200}},{\"data\":{\"value\":\"Sponsored By PubMatic\"},\"id\":4}],\"imptrackers\":[\"http://imptracker.com/main/9bde02d0-6017-11e4-9df7-005056967c35\",\"http://172.16.4.213/AdServer/AdDisplayTrackerServlet?operId=1&pubId=5890&siteId=5892&adId=6016&adType=12&adServerId=243&kefact=0.010000&kaxefact=0.010000&kadNetFrequecy=0&kadwidth=0&kadheight=0&kadsizeid=7&kltstamp=1544692761&indirectAdId=0&adServerOptimizerId=2&ranreq=0.1&kpbmtpfact=1.000000&dcId=1&tldId=0&passback=0&svr=MADS1107&ekefact=GSQSXOLKDgBAvRnoiNj0LxtpAnNEO30u1ZI5sITloOsP7gzh&ekaxefact=GSQSXAXLDgD0fOZLCjgbnVJiyS3D65dqDkxfs2ArpC3iugXw&ekpbmtpfact=GSQSXCDLDgB5mcooOvXtCKmx7TnNDJDY2YuHFOL3o9ceoU4H&crID=campaign111&lpu=advertiserdomain.com&ucrid=273354366805642829&campaignId=16981&creativeId=0&pctr=0.000000&wDSPByrId=511&wDspId=6&wbId=0&wrId=0&wAdvID=1&isRTB=1&rtbId=C09BB577-B8C1-4C3E-A0FF-73F6F631C80A&imprId=B68287E1-DC39-4B38-9790-FE4F179739D6&oid=B68287E1-DC39-4B38-9790-FE4F179739D6&pageURL=http%3A%2F%2Ftest.com%2FTestPages%2Fnativead.html\"],\"jstracker\":\"<script src='http:\\\\/\\\\/stagingpub.net\\\\/native\\\\/tempReseponse.js'><script src='http:\\\\/\\\\/stagingpub.net\\\\/native\\\\/tempReseponse.js'>\",\"link\":{\"clicktrackers\":[\"http://clicktracker.com/main/9bde02d0-6017-11e4-9df7-005056967c35\",\"&pubId=5890&siteId=5892&adId=6016&kadsizeid=7&tldId=0&passback=0&campaignId=16981&creativeId=0&adServerId=243&impid=B68287E1-DC39-4B38-9790-FE4F179739D6\"],\"fallback\":\"http://www.pubmatic.com\",\"url\":\"http://www.pubmatic.com\"}}}",
            'adomain': ['advertiserdomain.com'],
            'cid': '16981',
            'crid': 'campaign111',
            'ext': {
              'dspid': 6
            }
          }],
          'seat': '527'
        }],
        'cur': 'USD'
      }
    }

    validnativeBidImpression = {
      'native': {
        'request': '{"assets":[{"id":1,"required":1,"title":{"len":80}},{"id":2,"required":1,"img":{"type":3,"w":300,"h":250}},{"id":4,"required":1,"data":{"type":1}}]}'
      }
    }

    nativeBidImpressionWithoutRequiredParams = {
      'native': {
        'request': '{"assets":[{"id":4,"required":1,"data":{"type":1}}]}'
      }
    }

    validnativeBidImpressionWithRequiredParam = {
      'native': {
        'request': '{"assets":[{"id":1,"required":0,"title":{"len":80}},{"id":2,"required":0,"img":{"type":3,"w":300,"h":250}},{"id":4,"required":1,"data":{"type":1}}]}'
      }
    }

    validnativeBidImpressionWithAllParams = {
      native: {
        'request': '{"assets":[{"id":1,"required":1,"title":{"len":80,"ext":{"title1":"title2"}}},{"id":3,"required":1,"img":{"type":1,"w":50,"h":50}},{"id":2,"required":1,"img":{"type":3,"w":728,"h":90,"mimes":["image/png","image/gif"],"ext":{"image1":"image2"}}},{"id":4,"required":1,"data":{"type":1,"len":10,"ext":{"sponsor1":"sponsor2"}}},{"id":5,"required":1,"data":{"type":2,"len":10,"ext":{"body1":"body2"}}},{"id":13,"required":1,"data":{"type":3,"len":10,"ext":{"rating1":"rating2"}}},{"id":14,"required":1,"data":{"type":4,"len":10,"ext":{"likes1":"likes2"}}},{"id":15,"required":1,"data":{"type":5,"len":10,"ext":{"downloads1":"downloads2"}}},{"id":16,"required":1,"data":{"type":6,"len":10,"ext":{"price1":"price2"}}},{"id":17,"required":1,"data":{"type":7,"len":10,"ext":{"saleprice1":"saleprice2"}}},{"id":18,"required":1,"data":{"type":8,"len":10,"ext":{"phone1":"phone2"}}},{"id":19,"required":1,"data":{"type":9,"len":10,"ext":{"address1":"address2"}}},{"id":20,"required":1,"data":{"type":10,"len":10,"ext":{"desc21":"desc22"}}},{"id":21,"required":1,"data":{"type":11,"len":10,"ext":{"displayurl1":"displayurl2"}}}]}'
      }
    }

    bannerBidResponse = {
      'body': {
        'id': '93D3BAD6-E2E2-49FB-9D89-920B1761C865',
        'seatbid': [{
          'bid': [{
            'id': '74858439-49D7-4169-BA5D-44A046315B2F',
            'impid': '23acc48ad47af5',
            'price': 1.3,
            'adm': '<span class="PubAPIAd"  id="4E733404-CC2E-48A2-BC83-4DD5F38FE9BB"><script type="text/javascript"> document.writeln(\'<iframe width="300" scrolling="no" height="250" frameborder="0" name="iframe0" allowtransparency="true" marginheight="0" marginwidth="0" vspace="0" hspace="0" src="http://ads.pubmatic.com/AdTag/dummyImage.png"></iframe>\');</script><iframe width="0" scrolling="no" height="0" frameborder="0" src="http://aktrack.pubmatic.com/AdServer/AdDisplayTrackerServlet?pubId=5890" style="position:absolute;top:-15000px;left:-15000px" vspace="0" hspace="0" marginwidth="0" marginheight="0" allowtransparency="true" name="pbeacon"></iframe></span> <!-- PubMatic Ad Ends -->',
            'h': 250,
            'w': 300,
            'ext': {
              'deal_channel': 6
            }
          }]
        }]
      }
    };

    videoBidResponse = {
      'body': {
        'id': '93D3BAD6-E2E2-49FB-9D89-920B1761C865',
        'seatbid': [{
          'bid': [{
            'id': '74858439-49D7-4169-BA5D-44A046315B2F',
            'impid': '22bddb28db77d',
            'price': 1.3,
            'adm': '<VAST version="3.0"><Ad id="601364"><InLine><AdSystem>Acudeo Compatible</AdSystem><AdTitle>VAST 2.0 Instream Test 1</AdTitle><Description>VAST 2.0 Instream Test 1</Description><Impression><![CDATA[http://172.16.4.213/AdServer/AdDisplayTrackerServlet?operId=1&pubId=5890&siteId=47163&adId=1405268&adType=13&adServerId=243&kefact=70.000000&kaxefact=70.000000&kadNetFrequecy=0&kadwidth=0&kadheight=0&kadsizeid=97&kltstamp=1529929473&indirectAdId=0&adServerOptimizerId=2&ranreq=0.1&kpbmtpfact=100.000000&dcId=1&tldId=0&passback=0&svr=MADS1107&ekefact=Ad8wW91TCwCmdG0jlfjXn7Tyzh20hnTVx-m5DoNSep-RXGDr&ekaxefact=Ad8wWwRUCwAGir4Zzl1eF0bKiC-qrCV0D0yp_eE7YizB_BQk&ekpbmtpfact=Ad8wWxRUCwD7qgzwwPE2LnS5-Ou19uO5amJl1YT6-XVFvQ41&imprId=48F73E1A-7F23-443D-A53C-30EE6BBF5F7F&oid=48F73E1A-7F23-443D-A53C-30EE6BBF5F7F&crID=creative-1_1_2&ucrid=160175026529250297&campaignId=17050&creativeId=0&pctr=0.000000&wDSPByrId=511&wDspId=6&wbId=0&wrId=0&wAdvID=3170&isRTB=1&rtbId=EBCA079F-8D7C-45B8-B733-92951F670AA1&pmZoneId=zone1&pageURL=www.yahoo.com&lpu=ae.com]]></Impression><Impression>https://dsptracker.com/{PSPM}</Impression><Error><![CDATA[http://172.16.4.213/track?operId=7&p=5890&s=47163&a=1405268&wa=243&ts=1529929473&wc=17050&crId=creative-1_1_2&ucrid=160175026529250297&impid=48F73E1A-7F23-443D-A53C-30EE6BBF5F7F&advertiser_id=3170&ecpm=70.000000&er=[ERRORCODE]]]></Error><Error><![CDATA[https://Errortrack.com?p=1234&er=[ERRORCODE]]]></Error><Creatives><Creative AdID="601364"><Linear skipoffset="20%"><TrackingEvents><Tracking event="close"><![CDATA[https://mytracking.com/linear/close]]></Tracking><Tracking event="skip"><![CDATA[https://mytracking.com/linear/skip]]></Tracking><Tracking event="creativeView"><![CDATA[http://172.16.4.213/track?operId=7&p=5890&s=47163&a=1405268&wa=243&ts=1529929473&wc=17050&crId=creative-1_1_2&ucrid=160175026529250297&impid=48F73E1A-7F23-443D-A53C-30EE6BBF5F7F&advertiser_id=3170&ecpm=70.000000&e=1]]></Tracking><Tracking event="start"><![CDATA[http://172.16.4.213/track?operId=7&p=5890&s=47163&a=1405268&wa=243&ts=1529929473&wc=17050&crId=creative-1_1_2&ucrid=160175026529250297&impid=48F73E1A-7F23-443D-A53C-30EE6BBF5F7F&advertiser_id=3170&ecpm=70.000000&e=2]]></Tracking><Tracking event="midpoint"><![CDATA[http://172.16.4.213/track?operId=7&p=5890&s=47163&a=1405268&wa=243&ts=1529929473&wc=17050&crId=creative-1_1_2&ucrid=160175026529250297&impid=48F73E1A-7F23-443D-A53C-30EE6BBF5F7F&advertiser_id=3170&ecpm=70.000000&e=3]]></Tracking><Tracking event="firstQuartile"><![CDATA[http://172.16.4.213/track?operId=7&p=5890&s=47163&a=1405268&wa=243&ts=1529929473&wc=17050&crId=creative-1_1_2&ucrid=160175026529250297&impid=48F73E1A-7F23-443D-A53C-30EE6BBF5F7F&advertiser_id=3170&ecpm=70.000000&e=4]]></Tracking><Tracking event="thirdQuartile"><![CDATA[http://172.16.4.213/track?operId=7&p=5890&s=47163&a=1405268&wa=243&ts=1529929473&wc=17050&crId=creative-1_1_2&ucrid=160175026529250297&impid=48F73E1A-7F23-443D-A53C-30EE6BBF5F7F&advertiser_id=3170&ecpm=70.000000&e=5]]></Tracking><Tracking event="complete"><![CDATA[http://172.16.4.213/track?operId=7&p=5890&s=47163&a=1405268&wa=243&ts=1529929473&wc=17050&crId=creative-1_1_2&ucrid=160175026529250297&impid=48F73E1A-7F23-443D-A53C-30EE6BBF5F7F&advertiser_id=3170&ecpm=70.000000&e=6]]></Tracking></TrackingEvents><Duration>00:00:04</Duration><VideoClicks><ClickTracking><![CDATA[http://172.16.4.213/track?operId=7&p=5890&s=47163&a=1405268&wa=243&ts=1529929473&wc=17050&crId=creative-1_1_2&ucrid=160175026529250297&impid=48F73E1A-7F23-443D-A53C-30EE6BBF5F7F&advertiser_id=3170&ecpm=70.000000&e=99]]></ClickTracking><ClickThrough>https://www.pubmatic.com</ClickThrough></VideoClicks><MediaFiles><MediaFile delivery="progressive" type="video/mp4" bitrate="500" width="400" height="300" scalable="true" maintainAspectRatio="true"><![CDATA[https://stagingnyc.pubmatic.com:8443/video/Shashank/mediaFileHost/media/mp4-sample-2.mp4]]></MediaFile></MediaFiles></Linear></Creative></Creatives></InLine></Ad></VAST>',
            'h': 250,
            'w': 300,
            'ext': {
              'deal_channel': 6
            }
          }]
        }]
      }
    }
  });

  describe('implementation', function () {
  	describe('Bid validations', function () {
  		it('valid bid case', function () {
		  let validBid = {
	        bidder: 'pubmatic',
	        params: {
	          publisherId: '301',
	          adSlot: '/15671365/DMDemo@300x250:0'
	        }
	      },
	      isValid = spec.isBidRequestValid(validBid);
	      expect(isValid).to.equal(true);
  		});

      it('invalid bid case: publisherId not passed', function () {
		    let validBid = {
	        bidder: 'pubmatic',
	        params: {
	          adSlot: '/15671365/DMDemo@300x250:0'
	        }
	      },
	      isValid = spec.isBidRequestValid(validBid);
	      expect(isValid).to.equal(false);
  		});

      it('invalid bid case: publisherId is not string', function () {
        let validBid = {
            bidder: 'pubmatic',
            params: {
              publisherId: 301,
              adSlot: '/15671365/DMDemo@300x250:0'
            }
          },
          isValid = spec.isBidRequestValid(validBid);
        expect(isValid).to.equal(false);
      });

      it('valid bid case: adSlot is not passed', function () {
        let validBid = {
            bidder: 'pubmatic',
            params: {
              publisherId: '301'
            }
          },
          isValid = spec.isBidRequestValid(validBid);
        expect(isValid).to.equal(true);
      });
    });

  	describe('Request formation', function () {
  		it('buildRequests function should not modify original bidRequests object', function () {
        let originalBidRequests = utils.deepClone(bidRequests);
        let request = spec.buildRequests(bidRequests);
        expect(bidRequests).to.deep.equal(originalBidRequests);
      });

      it('buildRequests function should not modify original nativebidRequests object', function () {
        let originalBidRequests = utils.deepClone(nativeBidRequests);
        let request = spec.buildRequests(nativeBidRequests);
        expect(nativeBidRequests).to.deep.equal(originalBidRequests);
      });

      it('Endpoint checking', function () {
  		  let request = spec.buildRequests(bidRequests);
        expect(request.url).to.equal('https://hbopenbid.pubmatic.com/translator?source=prebid-client');
        expect(request.method).to.equal('POST');
  		});

      it('test flag not sent when pubmaticTest=true is absent in page url', function() {
        let request = spec.buildRequests(bidRequests);
        let data = JSON.parse(request.data);
        expect(data.test).to.equal(undefined);
      });

      it('test flag set to 1 when pubmaticTest=true is present in page url', function() {
        window.location.href += '#pubmaticTest=true';
        // now all the test cases below will have window.location.href with #pubmaticTest=true
        let request = spec.buildRequests(bidRequests);
        let data = JSON.parse(request.data);
        expect(data.test).to.equal(1);
      });

  		it('Request params check', function () {
        let request = spec.buildRequests(bidRequests);
        let data = JSON.parse(request.data);
  		  expect(data.at).to.equal(1); // auction type
  		  expect(data.cur[0]).to.equal('USD'); // currency
  		  expect(data.site.domain).to.be.a('string'); // domain should be set
  		  expect(data.site.page).to.equal(bidRequests[0].params.kadpageurl); // forced pageURL
  		  expect(data.site.publisher.id).to.equal(bidRequests[0].params.publisherId); // publisher Id
        expect(data.site.ext).to.exist.and.to.be.an('object'); // dctr parameter
        expect(data.site.ext.key_val).to.exist.and.to.equal(bidRequests[0].params.dctr);
  		  expect(data.user.yob).to.equal(parseInt(bidRequests[0].params.yob)); // YOB
  		  expect(data.user.gender).to.equal(bidRequests[0].params.gender); // Gender
  		  expect(data.device.geo.lat).to.equal(parseFloat(bidRequests[0].params.lat)); // Latitude
  		  expect(data.device.geo.lon).to.equal(parseFloat(bidRequests[0].params.lon)); // Lognitude
  		  expect(data.user.geo.lat).to.equal(parseFloat(bidRequests[0].params.lat)); // Latitude
  		  expect(data.user.geo.lon).to.equal(parseFloat(bidRequests[0].params.lon)); // Lognitude
  		  expect(data.ext.wrapper.wv).to.equal($$REPO_AND_VERSION$$); // Wrapper Version
  		  expect(data.ext.wrapper.transactionId).to.equal(bidRequests[0].transactionId); // Prebid TransactionId
  		  expect(data.ext.wrapper.wiid).to.equal(bidRequests[0].params.wiid); // OpenWrap: Wrapper Impression ID
  		  expect(data.ext.wrapper.profile).to.equal(parseInt(bidRequests[0].params.profId)); // OpenWrap: Wrapper Profile ID
  		  expect(data.ext.wrapper.version).to.equal(parseInt(bidRequests[0].params.verId)); // OpenWrap: Wrapper Profile Version ID

  		  expect(data.imp[0].id).to.equal(bidRequests[0].bidId); // Prebid bid id is passed as id
  		  expect(data.imp[0].bidfloor).to.equal(parseFloat(bidRequests[0].params.kadfloor)); // kadfloor
  		  expect(data.imp[0].tagid).to.equal('/15671365/DMDemo'); // tagid
  		  expect(data.imp[0].banner.w).to.equal(300); // width
  		  expect(data.imp[0].banner.h).to.equal(250); // height
  		  expect(data.imp[0].ext.pmZoneId).to.equal(bidRequests[0].params.pmzoneid.split(',').slice(0, 50).map(id => id.trim()).join()); // pmzoneid
        expect(data.imp[0].bidfloorcur).to.equal(bidRequests[0].params.currency);
        expect(data.source.ext.schain).to.deep.equal(bidRequests[0].schain);
  		});

      it('Request params check: without adSlot', function () {
        delete bidRequests[0].params.adSlot;
        let request = spec.buildRequests(bidRequests);
        let data = JSON.parse(request.data);
        expect(data.at).to.equal(1); // auction type
        expect(data.cur[0]).to.equal('USD'); // currency
        expect(data.site.domain).to.be.a('string'); // domain should be set
        expect(data.site.page).to.equal(bidRequests[0].params.kadpageurl); // forced pageURL
        expect(data.site.publisher.id).to.equal(bidRequests[0].params.publisherId); // publisher Id
        expect(data.site.ext).to.exist.and.to.be.an('object'); // dctr parameter
        expect(data.site.ext.key_val).to.exist.and.to.equal(bidRequests[0].params.dctr);
        expect(data.user.yob).to.equal(parseInt(bidRequests[0].params.yob)); // YOB
        expect(data.user.gender).to.equal(bidRequests[0].params.gender); // Gender
        expect(data.device.geo.lat).to.equal(parseFloat(bidRequests[0].params.lat)); // Latitude
        expect(data.device.geo.lon).to.equal(parseFloat(bidRequests[0].params.lon)); // Lognitude
        expect(data.user.geo.lat).to.equal(parseFloat(bidRequests[0].params.lat)); // Latitude
        expect(data.user.geo.lon).to.equal(parseFloat(bidRequests[0].params.lon)); // Lognitude
        expect(data.ext.wrapper.wv).to.equal($$REPO_AND_VERSION$$); // Wrapper Version
        expect(data.ext.wrapper.transactionId).to.equal(bidRequests[0].transactionId); // Prebid TransactionId
        expect(data.ext.wrapper.wiid).to.equal(bidRequests[0].params.wiid); // OpenWrap: Wrapper Impression ID
        expect(data.ext.wrapper.profile).to.equal(parseInt(bidRequests[0].params.profId)); // OpenWrap: Wrapper Profile ID
        expect(data.ext.wrapper.version).to.equal(parseInt(bidRequests[0].params.verId)); // OpenWrap: Wrapper Profile Version ID

        expect(data.imp[0].id).to.equal(bidRequests[0].bidId); // Prebid bid id is passed as id
        expect(data.imp[0].bidfloor).to.equal(parseFloat(bidRequests[0].params.kadfloor)); // kadfloor
        expect(data.imp[0].tagid).to.deep.equal(undefined); // tagid
        expect(data.imp[0].banner.w).to.equal(728); // width
        expect(data.imp[0].banner.h).to.equal(90); // height
        expect(data.imp[0].banner.format).to.deep.equal([{w: 160, h: 600}]);
        expect(data.imp[0].ext.pmZoneId).to.equal(bidRequests[0].params.pmzoneid.split(',').slice(0, 50).map(id => id.trim()).join()); // pmzoneid
        expect(data.imp[0].bidfloorcur).to.equal(bidRequests[0].params.currency);
      });

      it('Request params multi size format object check', function () {
        let bidRequests = [
          {
            bidder: 'pubmatic',
            params: {
              publisherId: '301',
              adSlot: '/15671365/DMDemo@300x250:0',
              kadfloor: '1.2',
              pmzoneid: 'aabc, ddef',
              kadpageurl: 'www.publisher.com',
              yob: '1986',
              gender: 'M',
              lat: '12.3',
              lon: '23.7',
              wiid: '1234567890',
              profId: '100',
              verId: '200',
              currency: 'AUD'
            },
            placementCode: '/19968336/header-bid-tag-1',
            bidId: '23acc48ad47af5',
            requestId: '0fb4905b-9456-4152-86be-c6f6d259ba99',
            bidderRequestId: '1c56ad30b9b8ca8',
            transactionId: '92489f71-1bf2-49a0-adf9-000cea934729'
          }
        ];
        /* case 1 - size passed in adslot */
        let request = spec.buildRequests(bidRequests);
        let data = JSON.parse(request.data);

        expect(data.imp[0].banner.w).to.equal(300); // width
        expect(data.imp[0].banner.h).to.equal(250); // height

        /* case 2 - size passed in adslot as well as in sizes array */
        bidRequests[0].sizes = [[300, 600], [300, 250]];
        bidRequests[0].mediaTypes = {
          banner: {
            sizes: [[300, 600], [300, 250]]
          }
        };
        request = spec.buildRequests(bidRequests);
        data = JSON.parse(request.data);

        expect(data.imp[0].banner.w).to.equal(300); // width
        expect(data.imp[0].banner.h).to.equal(250); // height

        /* case 3 - size passed in sizes but not in adslot */
        bidRequests[0].params.adSlot = '/15671365/DMDemo';
        bidRequests[0].sizes = [[300, 250], [300, 600]];
        bidRequests[0].mediaTypes = {
          banner: {
            sizes: [[300, 250], [300, 600]]
          }
        };
        request = spec.buildRequests(bidRequests);
        data = JSON.parse(request.data);

        expect(data.imp[0].banner.w).to.equal(300); // width
        expect(data.imp[0].banner.h).to.equal(250); // height
        expect(data.imp[0].banner.format).exist.and.to.be.an('array');
        expect(data.imp[0].banner.format[0]).exist.and.to.be.an('object');
        expect(data.imp[0].banner.format[0].w).to.equal(300); // width
        expect(data.imp[0].banner.format[0].h).to.equal(600); // height
      });

      it('Request params currency check', function () {
        let multipleBidRequests = [
          {
            bidder: 'pubmatic',
            params: {
              publisherId: '301',
              adSlot: '/15671365/DMDemo@300x250:0',
              kadfloor: '1.2',
              pmzoneid: 'aabc, ddef',
              kadpageurl: 'www.publisher.com',
              yob: '1986',
              gender: 'M',
              lat: '12.3',
              lon: '23.7',
              wiid: '1234567890',
              profId: '100',
              verId: '200',
              currency: 'AUD'
            },
            placementCode: '/19968336/header-bid-tag-1',
            sizes: [[300, 250], [300, 600]],
            bidId: '23acc48ad47af5',
            requestId: '0fb4905b-9456-4152-86be-c6f6d259ba99',
            bidderRequestId: '1c56ad30b9b8ca8',
            transactionId: '92489f71-1bf2-49a0-adf9-000cea934729'
          },
          {
            bidder: 'pubmatic',
            params: {
              publisherId: '301',
              adSlot: '/15671365/DMDemo@300x250:0',
              kadfloor: '1.2',
              pmzoneid: 'aabc, ddef',
              kadpageurl: 'www.publisher.com',
              yob: '1986',
              gender: 'M',
              lat: '12.3',
              lon: '23.7',
              wiid: '1234567890',
              profId: '100',
              verId: '200',
              currency: 'GBP'
            },
            placementCode: '/19968336/header-bid-tag-1',
            sizes: [[300, 250], [300, 600]],
            bidId: '23acc48ad47af5',
            requestId: '0fb4905b-9456-4152-86be-c6f6d259ba99',
            bidderRequestId: '1c56ad30b9b8ca8',
            transactionId: '92489f71-1bf2-49a0-adf9-000cea934729'
          }
        ];

        /* case 1 -
            currency specified in both adunits
            output: imp[0] and imp[1] both use currency specified in bidRequests[0].params.currency

        */
        let request = spec.buildRequests(multipleBidRequests);
        let data = JSON.parse(request.data);

        expect(data.imp[0].bidfloorcur).to.equal(bidRequests[0].params.currency);
        expect(data.imp[1].bidfloorcur).to.equal(bidRequests[0].params.currency);

        /* case 2 -
            currency specified in only 1st adunit
            output: imp[0] and imp[1] both use currency specified in bidRequests[0].params.currency

        */
        delete multipleBidRequests[1].params.currency;
        request = spec.buildRequests(multipleBidRequests);
        data = JSON.parse(request.data);
        expect(data.imp[0].bidfloorcur).to.equal(bidRequests[0].params.currency);
        expect(data.imp[1].bidfloorcur).to.equal(bidRequests[0].params.currency);

        /* case 3 -
            currency specified in only 1st adunit
            output: imp[0] and imp[1] both use default currency - USD

        */
        delete multipleBidRequests[0].params.currency;
        request = spec.buildRequests(multipleBidRequests);
        data = JSON.parse(request.data);
        expect(data.imp[0].bidfloorcur).to.equal('USD');
        expect(data.imp[1].bidfloorcur).to.equal('USD');

        /* case 4 -
            currency not specified in 1st adunit but specified in 2nd adunit
            output: imp[0] and imp[1] both use default currency - USD

        */
        multipleBidRequests[1].params.currency = 'AUD';
        request = spec.buildRequests(multipleBidRequests);
        data = JSON.parse(request.data);
        expect(data.imp[0].bidfloorcur).to.equal('USD');
        expect(data.imp[1].bidfloorcur).to.equal('USD');
      });

      it('Request params check with GDPR Consent', function () {
        let bidRequest = {
          gdprConsent: {
            consentString: 'kjfdniwjnifwenrif3',
            gdprApplies: true
          }
        };
  		  let request = spec.buildRequests(bidRequests, bidRequest);
  		  let data = JSON.parse(request.data);
        expect(data.user.ext.consent).to.equal('kjfdniwjnifwenrif3');
        expect(data.regs.ext.gdpr).to.equal(1);
  		  expect(data.at).to.equal(1); // auction type
  		  expect(data.cur[0]).to.equal('USD'); // currency
  		  expect(data.site.domain).to.be.a('string'); // domain should be set
  		  expect(data.site.page).to.equal(bidRequests[0].params.kadpageurl); // forced pageURL
  		  expect(data.site.publisher.id).to.equal(bidRequests[0].params.publisherId); // publisher Id
  		  expect(data.user.yob).to.equal(parseInt(bidRequests[0].params.yob)); // YOB
  		  expect(data.user.gender).to.equal(bidRequests[0].params.gender); // Gender
  		  expect(data.device.geo.lat).to.equal(parseFloat(bidRequests[0].params.lat)); // Latitude
  		  expect(data.device.geo.lon).to.equal(parseFloat(bidRequests[0].params.lon)); // Lognitude
  		  expect(data.user.geo.lat).to.equal(parseFloat(bidRequests[0].params.lat)); // Latitude
  		  expect(data.user.geo.lon).to.equal(parseFloat(bidRequests[0].params.lon)); // Lognitude
  		  expect(data.ext.wrapper.wv).to.equal($$REPO_AND_VERSION$$); // Wrapper Version
  		  expect(data.ext.wrapper.transactionId).to.equal(bidRequests[0].transactionId); // Prebid TransactionId
  		  expect(data.ext.wrapper.wiid).to.equal(bidRequests[0].params.wiid); // OpenWrap: Wrapper Impression ID
        expect(data.ext.wrapper.profile).to.equal(parseInt(bidRequests[0].params.profId)); // OpenWrap: Wrapper Profile ID
  		  expect(data.ext.wrapper.version).to.equal(parseInt(bidRequests[0].params.verId)); // OpenWrap: Wrapper Profile Version ID

  		  expect(data.imp[0].id).to.equal(bidRequests[0].bidId); // Prebid bid id is passed as id
  		  expect(data.imp[0].bidfloor).to.equal(parseFloat(bidRequests[0].params.kadfloor)); // kadfloor
  		  expect(data.imp[0].tagid).to.equal('/15671365/DMDemo'); // tagid
  		  expect(data.imp[0].banner.w).to.equal(300); // width
  		  expect(data.imp[0].banner.h).to.equal(250); // height
  		  expect(data.imp[0].ext.pmZoneId).to.equal(bidRequests[0].params.pmzoneid.split(',').slice(0, 50).map(id => id.trim()).join()); // pmzoneid
  		});

      it('Request params check with USP/CCPA Consent', function () {
        let bidRequest = {
          uspConsent: '1NYN'
        };
        let request = spec.buildRequests(bidRequests, bidRequest);
        let data = JSON.parse(request.data);
        expect(data.regs.ext.us_privacy).to.equal('1NYN');// USP/CCPAs
        expect(data.at).to.equal(1); // auction type
        expect(data.cur[0]).to.equal('USD'); // currency
        expect(data.site.domain).to.be.a('string'); // domain should be set
        expect(data.site.page).to.equal(bidRequests[0].params.kadpageurl); // forced pageURL
        expect(data.site.publisher.id).to.equal(bidRequests[0].params.publisherId); // publisher Id
        expect(data.user.yob).to.equal(parseInt(bidRequests[0].params.yob)); // YOB
        expect(data.user.gender).to.equal(bidRequests[0].params.gender); // Gender
        expect(data.device.geo.lat).to.equal(parseFloat(bidRequests[0].params.lat)); // Latitude
        expect(data.device.geo.lon).to.equal(parseFloat(bidRequests[0].params.lon)); // Lognitude
        expect(data.user.geo.lat).to.equal(parseFloat(bidRequests[0].params.lat)); // Latitude
        expect(data.user.geo.lon).to.equal(parseFloat(bidRequests[0].params.lon)); // Lognitude
        expect(data.ext.wrapper.wv).to.equal($$REPO_AND_VERSION$$); // Wrapper Version
        expect(data.ext.wrapper.transactionId).to.equal(bidRequests[0].transactionId); // Prebid TransactionId
        expect(data.ext.wrapper.wiid).to.equal(bidRequests[0].params.wiid); // OpenWrap: Wrapper Impression ID
        expect(data.ext.wrapper.profile).to.equal(parseInt(bidRequests[0].params.profId)); // OpenWrap: Wrapper Profile ID
        expect(data.ext.wrapper.version).to.equal(parseInt(bidRequests[0].params.verId)); // OpenWrap: Wrapper Profile Version ID

        expect(data.imp[0].id).to.equal(bidRequests[0].bidId); // Prebid bid id is passed as id
        expect(data.imp[0].bidfloor).to.equal(parseFloat(bidRequests[0].params.kadfloor)); // kadfloor
        expect(data.imp[0].tagid).to.equal('/15671365/DMDemo'); // tagid
        expect(data.imp[0].banner.w).to.equal(300); // width
        expect(data.imp[0].banner.h).to.equal(250); // height
        expect(data.imp[0].ext.pmZoneId).to.equal(bidRequests[0].params.pmzoneid.split(',').slice(0, 50).map(id => id.trim()).join()); // pmzoneid

        // second request without USP/CCPA
        let request2 = spec.buildRequests(bidRequests, {});
        let data2 = JSON.parse(request2.data);
        expect(data2.regs).to.equal(undefined);// USP/CCPAs
      });

      it('Request should have digitrust params', function() {
        window.DigiTrust = {
          getUser: function () {
          }
        };
        var bidRequest = {};
        let sandbox = sinon.sandbox.create();
        sandbox.stub(window.DigiTrust, 'getUser').callsFake(() =>
          ({
            success: true,
            identity: {
              privacy: {optout: false},
              id: 'testId',
              keyv: 4
            }
          })
        );

        let request = spec.buildRequests(bidRequests, bidRequest);
        let data = JSON.parse(request.data);
        expect(data.user.eids).to.deep.equal([{
          'source': 'digitru.st',
          'uids': [{
            'id': 'testId',
            'atype': 1,
            'ext': {
              'keyv': 4
            }
          }]
        }]);
        sandbox.restore();
        delete window.DigiTrust;
      });

      it('Request should not have digitrust params when DigiTrust not loaded', function() {
        let request = spec.buildRequests(bidRequests, {});
        let data = JSON.parse(request.data);
        expect(data.user.eids).to.deep.equal(undefined);
      });

      it('Request should not have digitrust params due to optout', function() {
        window.DigiTrust = {
          getUser: function () {
          }
        };
        let sandbox = sinon.sandbox.create();
        sandbox.stub(window.DigiTrust, 'getUser').callsFake(() =>
          ({
            success: true,
            identity: {
              privacy: {optout: true},
              id: 'testId',
              keyv: 4
            }
          })
        );

        let request = spec.buildRequests(bidRequests, {});
        let data = JSON.parse(request.data);
        expect(data.user.eids).to.deep.equal(undefined);
        sandbox.restore();
        delete window.DigiTrust;
      });

      it('Request should not have digitrust params due to failure', function() {
        window.DigiTrust = {
          getUser: function () {
          }
        };
        let sandbox = sinon.sandbox.create();
        sandbox.stub(window.DigiTrust, 'getUser').callsFake(() =>
          ({
            success: false,
            identity: {
              privacy: {optout: false},
              id: 'testId',
              keyv: 4
            }
          })
        );

        let request = spec.buildRequests(bidRequests, {});
        let data = JSON.parse(request.data);
        expect(data.user.eids).to.deep.equal(undefined);
        sandbox.restore();
        delete window.DigiTrust;
      });

      describe('DigiTrustId from config', function() {
        var origGetConfig;
        let sandbox;
        beforeEach(() => {
          sandbox = sinon.sandbox.create();
          window.DigiTrust = {
            getUser: sandbox.spy()
          };
        });

        afterEach(() => {
          sandbox.restore();
          delete window.DigiTrust;
        });

        it('Request should have digiTrustId config params', function() {
          sandbox.stub(config, 'getConfig').callsFake((key) => {
            var config = {
              digiTrustId: {
                success: true,
                identity: {
                  privacy: {optout: false},
                  id: 'testId',
                  keyv: 4
                }
              }
            };
            return config[key];
          });

          let request = spec.buildRequests(bidRequests, {});
          let data = JSON.parse(request.data);
          expect(data.user.eids).to.deep.equal([{
            'source': 'digitru.st',
            'uids': [{
              'id': 'testId',
              'atype': 1,
              'ext': {
                'keyv': 4
              }
            }]
          }]);
          // should not have called DigiTrust.getUser()
          expect(window.DigiTrust.getUser.notCalled).to.equal(true);
        });

        it('Request should not have digiTrustId config params due to optout', function() {
          sandbox.stub(config, 'getConfig').callsFake((key) => {
            var config = {
              digiTrustId: {
                success: true,
                identity: {
                  privacy: {optout: true},
                  id: 'testId',
                  keyv: 4
                }
              }
            }
            return config[key];
          });
          let request = spec.buildRequests(bidRequests, {});
          let data = JSON.parse(request.data);
          expect(data.user.eids).to.deep.equal(undefined);
          // should not have called DigiTrust.getUser()
          expect(window.DigiTrust.getUser.notCalled).to.equal(true);
        });

        it('Request should not have digiTrustId config params due to failure', function() {
          sandbox.stub(config, 'getConfig').callsFake((key) => {
            var config = {
              digiTrustId: {
                success: false,
                identity: {
                  privacy: {optout: false},
                  id: 'testId',
                  keyv: 4
                }
              }
            }
            return config[key];
          });

          let request = spec.buildRequests(bidRequests, {});
          let data = JSON.parse(request.data);
          expect(data.user.eids).to.deep.equal(undefined);
          // should not have called DigiTrust.getUser()
          expect(window.DigiTrust.getUser.notCalled).to.equal(true);
        });

        it('Request should not have digiTrustId config params if they do not exist', function() {
          sandbox.stub(config, 'getConfig').callsFake((key) => {
            var config = {};
            return config[key];
          });

          let request = spec.buildRequests(bidRequests, {});
          let data = JSON.parse(request.data);
          expect(data.user.eids).to.deep.equal(undefined);
          // should have called DigiTrust.getUser() once
          expect(window.DigiTrust.getUser.calledOnce).to.equal(true);
        });

        it('should NOT include coppa flag in bid request if coppa config is not present', () => {
          const request = spec.buildRequests(bidRequests, {});
          let data = JSON.parse(request.data);
          if (data.regs) {
            // in case GDPR is set then data.regs will exist
            expect(data.regs.coppa).to.equal(undefined);
          } else {
            expect(data.regs).to.equal(undefined);
          }
        });

        it('should include coppa flag in bid request if coppa is set to true', () => {
          sandbox.stub(config, 'getConfig').callsFake(key => {
            const config = {
              'coppa': true
            };
            return config[key];
          });
          const request = spec.buildRequests(bidRequests, {});
          let data = JSON.parse(request.data);
          expect(data.regs.coppa).to.equal(1);
        });

        it('should NOT include coppa flag in bid request if coppa is set to false', () => {
          sandbox.stub(config, 'getConfig').callsFake(key => {
            const config = {
              'coppa': false
            };
            return config[key];
          });
          const request = spec.buildRequests(bidRequests, {});
          let data = JSON.parse(request.data);
          if (data.regs) {
            // in case GDPR is set then data.regs will exist
            expect(data.regs.coppa).to.equal(undefined);
          } else {
            expect(data.regs).to.equal(undefined);
          }
        });
      });

      describe('AdsrvrOrgId from config', function() {
        let sandbox;
        beforeEach(() => {
          sandbox = sinon.sandbox.create();
        });

        afterEach(() => {
          sandbox.restore();
        });

        it('Request should have adsrvrOrgId config params', function() {
          sandbox.stub(config, 'getConfig').callsFake((key) => {
            var config = {
              adsrvrOrgId: {
                'TDID': '5e740345-c25e-436d-b466-5f2f9fa95c17',
                'TDID_LOOKUP': 'TRUE',
                'TDID_CREATED_AT': '2018-10-01T07:05:40'
              }
            };
            return config[key];
          });

          let request = spec.buildRequests(bidRequests, {});
          let data = JSON.parse(request.data);
          expect(data.user.eids).to.deep.equal([{
            'source': 'adserver.org',
            'uids': [{
              'id': '5e740345-c25e-436d-b466-5f2f9fa95c17',
              'atype': 1,
              'ext': {
                'rtiPartner': 'TDID'
              }
            }]
          }]);
        });

        it('Request should NOT have adsrvrOrgId config params if id in adsrvrOrgId is NOT string', function() {
          sandbox.stub(config, 'getConfig').callsFake((key) => {
            var config = {
              adsrvrOrgId: {
                'TDID': 1,
                'TDID_LOOKUP': 'TRUE',
                'TDID_CREATED_AT': '2018-10-01T07:05:40'
              }
            };
            return config[key];
          });

          let request = spec.buildRequests(bidRequests, {});
          let data = JSON.parse(request.data);
          expect(data.user.eids).to.deep.equal(undefined);
        });

        it('Request should NOT have adsrvrOrgId config params if adsrvrOrgId is NOT object', function() {
          sandbox.stub(config, 'getConfig').callsFake((key) => {
            var config = {
              adsrvrOrgId: null
            };
            return config[key];
          });

          let request = spec.buildRequests(bidRequests, {});
          let data = JSON.parse(request.data);
          expect(data.user.eids).to.deep.equal(undefined);
        });

        it('Request should NOT have adsrvrOrgId config params if id in adsrvrOrgId is NOT set', function() {
          sandbox.stub(config, 'getConfig').callsFake((key) => {
            var config = {
              adsrvrOrgId: {
                'TDID_LOOKUP': 'TRUE',
                'TDID_CREATED_AT': '2018-10-01T07:05:40'
              }
            };
            return config[key];
          });

          let request = spec.buildRequests(bidRequests, {});
          let data = JSON.parse(request.data);
          expect(data.user.eids).to.deep.equal(undefined);
        });
      });

      describe('AdsrvrOrgId from userId module', function() {
        let sandbox;
        beforeEach(() => {
          sandbox = sinon.sandbox.create();
        });

        afterEach(() => {
          sandbox.restore();
        });

        it('Request should have AdsrvrOrgId config params', function() {
          bidRequests[0].userId = {};
          bidRequests[0].userId.tdid = 'TTD_ID_FROM_USER_ID_MODULE';
          let request = spec.buildRequests(bidRequests, {});
          let data = JSON.parse(request.data);
          expect(data.user.eids).to.deep.equal([{
            'source': 'adserver.org',
            'uids': [{
              'id': 'TTD_ID_FROM_USER_ID_MODULE',
              'atype': 1,
              'ext': {
                'rtiPartner': 'TDID'
              }
            }]
          }]);
        });

        it('Request should have adsrvrOrgId from UserId Module if config and userId module both have TTD ID', function() {
          sandbox.stub(config, 'getConfig').callsFake((key) => {
            var config = {
              adsrvrOrgId: {
                'TDID': 'TTD_ID_FROM_CONFIG',
                'TDID_LOOKUP': 'TRUE',
                'TDID_CREATED_AT': '2018-10-01T07:05:40'
              }
            };
            return config[key];
          });
          bidRequests[0].userId = {};
          bidRequests[0].userId.tdid = 'TTD_ID_FROM_USER_ID_MODULE';
          let request = spec.buildRequests(bidRequests, {});
          let data = JSON.parse(request.data);
          expect(data.user.eids).to.deep.equal([{
            'source': 'adserver.org',
            'uids': [{
              'id': 'TTD_ID_FROM_USER_ID_MODULE',
              'atype': 1,
              'ext': {
                'rtiPartner': 'TDID'
              }
            }]
          }]);
        });

        it('Request should NOT have adsrvrOrgId params if userId is NOT object', function() {
          let request = spec.buildRequests(bidRequests, {});
          let data = JSON.parse(request.data);
          expect(data.user.eids).to.deep.equal(undefined);
        });

        it('Request should NOT have adsrvrOrgId params if userId.tdid is NOT string', function() {
          bidRequests[0].userId = {
            tdid: 1234
          };
          let request = spec.buildRequests(bidRequests, {});
          let data = JSON.parse(request.data);
          expect(data.user.eids).to.deep.equal(undefined);
        });
      });

      describe('AdsrvrOrgId and Digitrust', function() {
        // here we are considering cases only of accepting DigiTrustId from config
        let sandbox;
        beforeEach(() => {
          sandbox = sinon.sandbox.create();
          window.DigiTrust = {
            getUser: sandbox.spy()
          };
        });

        afterEach(() => {
          sandbox.restore();
          delete window.DigiTrust;
        });

        it('Request should have id of both AdsrvrOrgId and Digitrust if both have returned valid ids', function() {
          sandbox.stub(config, 'getConfig').callsFake((key) => {
            var config = {
              adsrvrOrgId: {
                'TDID': '5e740345-c25e-436d-b466-5f2f9fa95c17',
                'TDID_LOOKUP': 'TRUE',
                'TDID_CREATED_AT': '2018-10-01T07:05:40'
              },
              digiTrustId: {
                success: true,
                identity: {
                  privacy: {optout: false},
                  id: 'testId',
                  keyv: 4
                }
              }
            };
            return config[key];
          });

          let request = spec.buildRequests(bidRequests, {});
          let data = JSON.parse(request.data);
          expect(data.user.eids).to.deep.equal([{
            'source': 'digitru.st',
            'uids': [{
              'id': 'testId',
              'atype': 1,
              'ext': {
                'keyv': 4
              }
            }]
          }, {
            'source': 'adserver.org',
            'uids': [{
              'id': '5e740345-c25e-436d-b466-5f2f9fa95c17',
              'atype': 1,
              'ext': {
                'rtiPartner': 'TDID'
              }
            }]
          }]);
        });

        it('Request should have id of only AdsrvrOrgId and NOT Digitrust if only AdsrvrOrgId have returned valid id', function() {
          sandbox.stub(config, 'getConfig').callsFake((key) => {
            var config = {
              adsrvrOrgId: {
                'TDID': '5e740345-c25e-436d-b466-5f2f9fa95c17',
                'TDID_LOOKUP': 'TRUE',
                'TDID_CREATED_AT': '2018-10-01T07:05:40'
              },
              digiTrustId: {
                success: true,
                identity: {
                  privacy: {optout: true},
                  id: 'testId',
                  keyv: 4
                }
              }
            };
            return config[key];
          });

          let request = spec.buildRequests(bidRequests, {});
          let data = JSON.parse(request.data);
          expect(data.user.eids).to.deep.equal([{
            'source': 'adserver.org',
            'uids': [{
              'id': '5e740345-c25e-436d-b466-5f2f9fa95c17',
              'atype': 1,
              'ext': {
                'rtiPartner': 'TDID'
              }
            }]
          }]);
        });

        it('Request should have id of only Digitrust and NOT AdsrvrOrgId if only Digitrust have returned valid id', function() {
          sandbox.stub(config, 'getConfig').callsFake((key) => {
            var config = {
              adsrvrOrgId: {
                'TDID_LOOKUP': 'TRUE',
                'TDID_CREATED_AT': '2018-10-01T07:05:40'
              },
              digiTrustId: {
                success: true,
                identity: {
                  privacy: {optout: false},
                  id: 'testId',
                  keyv: 4
                }
              }
            };
            return config[key];
          });

          let request = spec.buildRequests(bidRequests, {});
          let data = JSON.parse(request.data);
          expect(data.user.eids).to.deep.equal([{
            'source': 'digitru.st',
            'uids': [{
              'id': 'testId',
              'atype': 1,
              'ext': {
                'keyv': 4
              }
            }]
          }]);
        });

        it('Request should NOT have id of Digitrust and NOT AdsrvrOrgId if only both have NOT returned valid ids', function() {
          sandbox.stub(config, 'getConfig').callsFake((key) => {
            var config = {
              adsrvrOrgId: {
                'TDID_LOOKUP': 'TRUE',
                'TDID_CREATED_AT': '2018-10-01T07:05:40'
              },
              digiTrustId: {
                success: true,
                identity: {
                  privacy: {optout: true},
                  id: 'testId',
                  keyv: 4
                }
              }
            };
            return config[key];
          });

          let request = spec.buildRequests(bidRequests, {});
          let data = JSON.parse(request.data);
          expect(data.user.eids).to.deep.equal(undefined);
        });
      });

      describe('UserIds from request', function() {
        describe('pubcommon Id', function() {
          it('send the pubcommon id if it is present', function() {
            bidRequests[0].userId = {};
            bidRequests[0].userId.pubcid = 'pub_common_user_id';
            let request = spec.buildRequests(bidRequests, {});
            let data = JSON.parse(request.data);
            expect(data.user.eids).to.deep.equal([{
              'source': 'pubcid.org',
              'uids': [{
                'id': 'pub_common_user_id',
                'atype': 1
              }]
            }]);
          });

          it('do not pass if not string', function() {
            bidRequests[0].userId = {};
            bidRequests[0].userId.pubcid = 1;
            let request = spec.buildRequests(bidRequests, {});
            let data = JSON.parse(request.data);
            expect(data.user.eids).to.equal(undefined);
            bidRequests[0].userId.pubcid = [];
            request = spec.buildRequests(bidRequests, {});
            data = JSON.parse(request.data);
            expect(data.user.eids).to.equal(undefined);
            bidRequests[0].userId.pubcid = null;
            request = spec.buildRequests(bidRequests, {});
            data = JSON.parse(request.data);
            expect(data.user.eids).to.equal(undefined);
            bidRequests[0].userId.pubcid = {};
            request = spec.buildRequests(bidRequests, {});
            data = JSON.parse(request.data);
            expect(data.user.eids).to.equal(undefined);
          });
        });

        describe('Digitrust Id', function() {
          it('send the digitrust id if it is present', function() {
            bidRequests[0].userId = {};
            bidRequests[0].userId.digitrustid = {data: {id: 'digitrust_user_id'}};
            let request = spec.buildRequests(bidRequests, {});
            let data = JSON.parse(request.data);
            expect(data.user.eids).to.deep.equal([{
              'source': 'digitru.st',
              'uids': [{
                'id': 'digitrust_user_id',
                'atype': 1
              }]
            }]);
          });

          it('do not pass if not string', function() {
            bidRequests[0].userId = {};
            bidRequests[0].userId.digitrustid = {data: {id: 1}};
            let request = spec.buildRequests(bidRequests, {});
            let data = JSON.parse(request.data);
            expect(data.user.eids).to.equal(undefined);
            bidRequests[0].userId.digitrustid = {data: {id: []}};
            request = spec.buildRequests(bidRequests, {});
            data = JSON.parse(request.data);
            expect(data.user.eids).to.equal(undefined);
            bidRequests[0].userId.digitrustid = {data: {id: null}};
            request = spec.buildRequests(bidRequests, {});
            data = JSON.parse(request.data);
            expect(data.user.eids).to.equal(undefined);
            bidRequests[0].userId.digitrustid = {data: {id: {}}};
            request = spec.buildRequests(bidRequests, {});
            data = JSON.parse(request.data);
            expect(data.user.eids).to.equal(undefined);
          });
        });

        describe('ID5 Id', function() {
          it('send the id5 id if it is present', function() {
            bidRequests[0].userId = {};
            bidRequests[0].userId.id5id = 'id5-user-id';
            let request = spec.buildRequests(bidRequests, {});
            let data = JSON.parse(request.data);
            expect(data.user.eids).to.deep.equal([{
              'source': 'id5-sync.com',
              'uids': [{
                'id': 'id5-user-id',
                'atype': 1
              }]
            }]);
          });

          it('do not pass if not string', function() {
            bidRequests[0].userId = {};
            bidRequests[0].userId.id5id = 1;
            let request = spec.buildRequests(bidRequests, {});
            let data = JSON.parse(request.data);
            expect(data.user.eids).to.equal(undefined);
            bidRequests[0].userId.id5id = [];
            request = spec.buildRequests(bidRequests, {});
            data = JSON.parse(request.data);
            expect(data.user.eids).to.equal(undefined);
            bidRequests[0].userId.id5id = null;
            request = spec.buildRequests(bidRequests, {});
            data = JSON.parse(request.data);
            expect(data.user.eids).to.equal(undefined);
            bidRequests[0].userId.id5id = {};
            request = spec.buildRequests(bidRequests, {});
            data = JSON.parse(request.data);
            expect(data.user.eids).to.equal(undefined);
          });
        });

        describe('Criteo Id', function() {
          it('send the criteo id if it is present', function() {
            bidRequests[0].userId = {};
            bidRequests[0].userId.criteoId = 'criteo-user-id';
            let request = spec.buildRequests(bidRequests, {});
            let data = JSON.parse(request.data);
            expect(data.user.eids).to.deep.equal([{
              'source': 'criteo.com',
              'uids': [{
                'id': 'criteo-user-id',
                'atype': 1
              }]
            }]);
          });

          it('do not pass if not string', function() {
            bidRequests[0].userId = {};
            bidRequests[0].userId.criteoId = 1;
            let request = spec.buildRequests(bidRequests, {});
            let data = JSON.parse(request.data);
            expect(data.user.eids).to.equal(undefined);
            bidRequests[0].userId.criteoId = [];
            request = spec.buildRequests(bidRequests, {});
            data = JSON.parse(request.data);
            expect(data.user.eids).to.equal(undefined);
            bidRequests[0].userId.criteoId = null;
            request = spec.buildRequests(bidRequests, {});
            data = JSON.parse(request.data);
            expect(data.user.eids).to.equal(undefined);
            bidRequests[0].userId.criteoId = {};
            request = spec.buildRequests(bidRequests, {});
            data = JSON.parse(request.data);
            expect(data.user.eids).to.equal(undefined);
          });
        });

        describe('IdentityLink Id', function() {
          it('send the identity-link id if it is present', function() {
            bidRequests[0].userId = {};
            bidRequests[0].userId.idl_env = 'identity-link-user-id';
            let request = spec.buildRequests(bidRequests, {});
            let data = JSON.parse(request.data);
            expect(data.user.eids).to.deep.equal([{
              'source': 'liveramp.com',
              'uids': [{
                'id': 'identity-link-user-id',
                'atype': 1
              }]
            }]);
          });

          it('do not pass if not string', function() {
            bidRequests[0].userId = {};
            bidRequests[0].userId.idl_env = 1;
            let request = spec.buildRequests(bidRequests, {});
            let data = JSON.parse(request.data);
            expect(data.user.eids).to.equal(undefined);
            bidRequests[0].userId.idl_env = [];
            request = spec.buildRequests(bidRequests, {});
            data = JSON.parse(request.data);
            expect(data.user.eids).to.equal(undefined);
            bidRequests[0].userId.idl_env = null;
            request = spec.buildRequests(bidRequests, {});
            data = JSON.parse(request.data);
            expect(data.user.eids).to.equal(undefined);
            bidRequests[0].userId.idl_env = {};
            request = spec.buildRequests(bidRequests, {});
            data = JSON.parse(request.data);
            expect(data.user.eids).to.equal(undefined);
          });
        });

        describe('LiveIntent Id', function() {
          it('send the LiveIntent id if it is present', function() {
            bidRequests[0].userId = {};
            bidRequests[0].userId.lipb = { lipbid: 'live-intent-user-id' };
            let request = spec.buildRequests(bidRequests, {});
            let data = JSON.parse(request.data);
            expect(data.user.eids).to.deep.equal([{
              'source': 'liveintent.com',
              'uids': [{
                'id': 'live-intent-user-id',
                'atype': 1
              }]
            }]);
          });

          it('do not pass if not string', function() {
            bidRequests[0].userId = {};
            bidRequests[0].userId.lipb = { lipbid: 1 };
            let request = spec.buildRequests(bidRequests, {});
            let data = JSON.parse(request.data);
            expect(data.user.eids).to.equal(undefined);
            bidRequests[0].userId.lipb.lipbid = [];
            request = spec.buildRequests(bidRequests, {});
            data = JSON.parse(request.data);
            expect(data.user.eids).to.equal(undefined);
            bidRequests[0].userId.lipb.lipbid = null;
            request = spec.buildRequests(bidRequests, {});
            data = JSON.parse(request.data);
            expect(data.user.eids).to.equal(undefined);
            bidRequests[0].userId.lipb.lipbid = {};
            request = spec.buildRequests(bidRequests, {});
            data = JSON.parse(request.data);
            expect(data.user.eids).to.equal(undefined);
          });
        });

        describe('Parrable Id', function() {
          it('send the Parrable id if it is present', function() {
            bidRequests[0].userId = {};
            bidRequests[0].userId.parrableid = 'parrable-user-id';
            let request = spec.buildRequests(bidRequests, {});
            let data = JSON.parse(request.data);
            expect(data.user.eids).to.deep.equal([{
              'source': 'parrable.com',
              'uids': [{
                'id': 'parrable-user-id',
                'atype': 1
              }]
            }]);
          });

          it('do not pass if not string', function() {
            bidRequests[0].userId = {};
            bidRequests[0].userId.parrableid = 1;
            let request = spec.buildRequests(bidRequests, {});
            let data = JSON.parse(request.data);
            expect(data.user.eids).to.equal(undefined);
            bidRequests[0].userId.parrableid = [];
            request = spec.buildRequests(bidRequests, {});
            data = JSON.parse(request.data);
            expect(data.user.eids).to.equal(undefined);
            bidRequests[0].userId.parrableid = null;
            request = spec.buildRequests(bidRequests, {});
            data = JSON.parse(request.data);
            expect(data.user.eids).to.equal(undefined);
            bidRequests[0].userId.parrableid = {};
            request = spec.buildRequests(bidRequests, {});
            data = JSON.parse(request.data);
            expect(data.user.eids).to.equal(undefined);
          });
        });

        describe('Britepool Id', function() {
          it('send the Britepool id if it is present', function() {
            bidRequests[0].userId = {};
            bidRequests[0].userId.britepoolid = 'britepool-user-id';
            let request = spec.buildRequests(bidRequests, {});
            let data = JSON.parse(request.data);
            expect(data.user.eids).to.deep.equal([{
              'source': 'britepool.com',
              'uids': [{
                'id': 'britepool-user-id',
                'atype': 1
              }]
            }]);
          });

          it('do not pass if not string', function() {
            bidRequests[0].userId = {};
            bidRequests[0].userId.britepoolid = 1;
            let request = spec.buildRequests(bidRequests, {});
            let data = JSON.parse(request.data);
            expect(data.user.eids).to.equal(undefined);
            bidRequests[0].userId.britepoolid = [];
            request = spec.buildRequests(bidRequests, {});
            data = JSON.parse(request.data);
            expect(data.user.eids).to.equal(undefined);
            bidRequests[0].userId.britepoolid = null;
            request = spec.buildRequests(bidRequests, {});
            data = JSON.parse(request.data);
            expect(data.user.eids).to.equal(undefined);
            bidRequests[0].userId.britepoolid = {};
            request = spec.buildRequests(bidRequests, {});
            data = JSON.parse(request.data);
            expect(data.user.eids).to.equal(undefined);
          });
        });
      });

      it('Request params check for video ad', function () {
        let request = spec.buildRequests(videoBidRequests);
        let data = JSON.parse(request.data);
        expect(data.imp[0].video).to.exist;
        expect(data.imp[0].tagid).to.equal('Div1');
        expect(data.imp[0].video.ext['video_skippable']).to.equal(videoBidRequests[0].params.video.skippable ? 1 : 0);
        expect(data.imp[0]['video']['mimes']).to.exist.and.to.be.an('array');
        expect(data.imp[0]['video']['mimes'][0]).to.equal(videoBidRequests[0].params.video['mimes'][0]);
        expect(data.imp[0]['video']['mimes'][1]).to.equal(videoBidRequests[0].params.video['mimes'][1]);
        expect(data.imp[0]['video']['minduration']).to.equal(videoBidRequests[0].params.video['minduration']);
        expect(data.imp[0]['video']['maxduration']).to.equal(videoBidRequests[0].params.video['maxduration']);
        expect(data.imp[0]['video']['startdelay']).to.equal(videoBidRequests[0].params.video['startdelay']);

        expect(data.imp[0]['video']['playbackmethod']).to.exist.and.to.be.an('array');
        expect(data.imp[0]['video']['playbackmethod'][0]).to.equal(videoBidRequests[0].params.video['playbackmethod'][0]);
        expect(data.imp[0]['video']['playbackmethod'][1]).to.equal(videoBidRequests[0].params.video['playbackmethod'][1]);

        expect(data.imp[0]['video']['api']).to.exist.and.to.be.an('array');
        expect(data.imp[0]['video']['api'][0]).to.equal(videoBidRequests[0].params.video['api'][0]);
        expect(data.imp[0]['video']['api'][1]).to.equal(videoBidRequests[0].params.video['api'][1]);

        expect(data.imp[0]['video']['protocols']).to.exist.and.to.be.an('array');
        expect(data.imp[0]['video']['protocols'][0]).to.equal(videoBidRequests[0].params.video['protocols'][0]);
        expect(data.imp[0]['video']['protocols'][1]).to.equal(videoBidRequests[0].params.video['protocols'][1]);

        expect(data.imp[0]['video']['battr']).to.exist.and.to.be.an('array');
        expect(data.imp[0]['video']['battr'][0]).to.equal(videoBidRequests[0].params.video['battr'][0]);
        expect(data.imp[0]['video']['battr'][1]).to.equal(videoBidRequests[0].params.video['battr'][1]);

        expect(data.imp[0]['video']['linearity']).to.equal(videoBidRequests[0].params.video['linearity']);
        expect(data.imp[0]['video']['placement']).to.equal(videoBidRequests[0].params.video['placement']);
        expect(data.imp[0]['video']['minbitrate']).to.equal(videoBidRequests[0].params.video['minbitrate']);
        expect(data.imp[0]['video']['maxbitrate']).to.equal(videoBidRequests[0].params.video['maxbitrate']);

        expect(data.imp[0]['video']['w']).to.equal(videoBidRequests[0].mediaTypes.video.playerSize[0]);
        expect(data.imp[0]['video']['h']).to.equal(videoBidRequests[0].mediaTypes.video.playerSize[1]);
      });

      it('Request params check for 1 banner and 1 video ad', function () {
        let request = spec.buildRequests(multipleMediaRequests);
        let data = JSON.parse(request.data);

        expect(data.imp).to.be.an('array')
        expect(data.imp).with.length.above(1);

        expect(data.at).to.equal(1); // auction type
        expect(data.cur[0]).to.equal('USD'); // currency
        expect(data.site.domain).to.be.a('string'); // domain should be set
        expect(data.site.page).to.equal(multipleMediaRequests[0].params.kadpageurl); // forced pageURL
        expect(data.site.publisher.id).to.equal(multipleMediaRequests[0].params.publisherId); // publisher Id
        expect(data.user.yob).to.equal(parseInt(multipleMediaRequests[0].params.yob)); // YOB
        expect(data.user.gender).to.equal(multipleMediaRequests[0].params.gender); // Gender
        expect(data.device.geo.lat).to.equal(parseFloat(multipleMediaRequests[0].params.lat)); // Latitude
        expect(data.device.geo.lon).to.equal(parseFloat(multipleMediaRequests[0].params.lon)); // Lognitude
        expect(data.user.geo.lat).to.equal(parseFloat(multipleMediaRequests[0].params.lat)); // Latitude
        expect(data.user.geo.lon).to.equal(parseFloat(multipleMediaRequests[0].params.lon)); // Lognitude
        expect(data.ext.wrapper.wv).to.equal($$REPO_AND_VERSION$$); // Wrapper Version
        expect(data.ext.wrapper.transactionId).to.equal(multipleMediaRequests[0].transactionId); // Prebid TransactionId
        expect(data.ext.wrapper.wiid).to.equal(multipleMediaRequests[0].params.wiid); // OpenWrap: Wrapper Impression ID
        expect(data.ext.wrapper.profile).to.equal(parseInt(multipleMediaRequests[0].params.profId)); // OpenWrap: Wrapper Profile ID
        expect(data.ext.wrapper.version).to.equal(parseInt(multipleMediaRequests[0].params.verId)); // OpenWrap: Wrapper Profile Version ID

        // banner imp object check
        expect(data.imp[0].id).to.equal(multipleMediaRequests[0].bidId); // Prebid bid id is passed as id
        expect(data.imp[0].bidfloor).to.equal(parseFloat(multipleMediaRequests[0].params.kadfloor)); // kadfloor
        expect(data.imp[0].tagid).to.equal('/15671365/DMDemo'); // tagid
        expect(data.imp[0].banner.w).to.equal(300); // width
        expect(data.imp[0].banner.h).to.equal(250); // height
        expect(data.imp[0].ext.pmZoneId).to.equal(multipleMediaRequests[0].params.pmzoneid.split(',').slice(0, 50).map(id => id.trim()).join()); // pmzoneid

        // video imp object check
        expect(data.imp[1].video).to.exist;
        expect(data.imp[1].tagid).to.equal('Div1');
        expect(data.imp[1].video.ext['video_skippable']).to.equal(multipleMediaRequests[1].params.video.skippable ? 1 : 0);
        expect(data.imp[1]['video']['mimes']).to.exist.and.to.be.an('array');
        expect(data.imp[1]['video']['mimes'][0]).to.equal(multipleMediaRequests[1].params.video['mimes'][0]);
        expect(data.imp[1]['video']['mimes'][1]).to.equal(multipleMediaRequests[1].params.video['mimes'][1]);
        expect(data.imp[1]['video']['minduration']).to.equal(multipleMediaRequests[1].params.video['minduration']);
        expect(data.imp[1]['video']['maxduration']).to.equal(multipleMediaRequests[1].params.video['maxduration']);
        expect(data.imp[1]['video']['startdelay']).to.equal(multipleMediaRequests[1].params.video['startdelay']);

        expect(data.imp[1]['video']['playbackmethod']).to.exist.and.to.be.an('array');
        expect(data.imp[1]['video']['playbackmethod'][0]).to.equal(multipleMediaRequests[1].params.video['playbackmethod'][0]);
        expect(data.imp[1]['video']['playbackmethod'][1]).to.equal(multipleMediaRequests[1].params.video['playbackmethod'][1]);

        expect(data.imp[1]['video']['api']).to.exist.and.to.be.an('array');
        expect(data.imp[1]['video']['api'][0]).to.equal(multipleMediaRequests[1].params.video['api'][0]);
        expect(data.imp[1]['video']['api'][1]).to.equal(multipleMediaRequests[1].params.video['api'][1]);

        expect(data.imp[1]['video']['protocols']).to.exist.and.to.be.an('array');
        expect(data.imp[1]['video']['protocols'][0]).to.equal(multipleMediaRequests[1].params.video['protocols'][0]);
        expect(data.imp[1]['video']['protocols'][1]).to.equal(multipleMediaRequests[1].params.video['protocols'][1]);

        expect(data.imp[1]['video']['battr']).to.exist.and.to.be.an('array');
        expect(data.imp[1]['video']['battr'][0]).to.equal(multipleMediaRequests[1].params.video['battr'][0]);
        expect(data.imp[1]['video']['battr'][1]).to.equal(multipleMediaRequests[1].params.video['battr'][1]);

        expect(data.imp[1]['video']['linearity']).to.equal(multipleMediaRequests[1].params.video['linearity']);
        expect(data.imp[1]['video']['placement']).to.equal(multipleMediaRequests[1].params.video['placement']);
        expect(data.imp[1]['video']['minbitrate']).to.equal(multipleMediaRequests[1].params.video['minbitrate']);
        expect(data.imp[1]['video']['maxbitrate']).to.equal(multipleMediaRequests[1].params.video['maxbitrate']);

        expect(data.imp[1]['video']['w']).to.equal(multipleMediaRequests[1].mediaTypes.video.playerSize[0]);
        expect(data.imp[1]['video']['h']).to.equal(multipleMediaRequests[1].mediaTypes.video.playerSize[1]);
      });

      it('Request params should have valid native bid request for all valid params', function () {
        let request = spec.buildRequests(nativeBidRequests);
        let data = JSON.parse(request.data);
        expect(data.imp[0].native).to.exist;
        expect(data.imp[0].native['request']).to.exist;
        expect(data.imp[0].tagid).to.equal('/43743431/NativeAutomationPrebid');
        expect(data.imp[0]['native']['request']).to.exist.and.to.be.an('string');
        expect(data.imp[0]['native']['request']).to.exist.and.to.equal(validnativeBidImpression.native.request);
      });

      it('Request params should not have valid native bid request for non native request', function () {
        let request = spec.buildRequests(bidRequests);
        let data = JSON.parse(request.data);
        expect(data.imp[0].native).to.not.exist;
      });

      it('Request params should have valid native bid request with valid required param values for all valid params', function () {
        let request = spec.buildRequests(nativeBidRequestsWithRequiredParam);
        let data = JSON.parse(request.data);
        expect(data.imp[0].native).to.exist;
        expect(data.imp[0].native['request']).to.exist;
        expect(data.imp[0].tagid).to.equal('/43743431/NativeAutomationPrebid');
        expect(data.imp[0]['native']['request']).to.exist.and.to.be.an('string');
        expect(data.imp[0]['native']['request']).to.exist.and.to.equal(validnativeBidImpressionWithRequiredParam.native.request);
      });

      it('should not have valid native request if assets are not defined with minimum required params and only native is the slot', function () {
        let request = spec.buildRequests(nativeBidRequestsWithoutAsset);
        expect(request).to.deep.equal(undefined);
      });

      it('Request params should have valid native bid request for all native params', function () {
        let request = spec.buildRequests(nativeBidRequestsWithAllParams);
        let data = JSON.parse(request.data);
        expect(data.imp[0].native).to.exist;
        expect(data.imp[0].native['request']).to.exist;
        expect(data.imp[0].tagid).to.equal('/43743431/NativeAutomationPrebid');
        expect(data.imp[0]['native']['request']).to.exist.and.to.be.an('string');
        expect(data.imp[0]['native']['request']).to.exist.and.to.equal(validnativeBidImpressionWithAllParams.native.request);
      });

	    it('Request params - should handle banner and video format in single adunit', function() {
        let request = spec.buildRequests(bannerAndVideoBidRequests);
        let data = JSON.parse(request.data);
        data = data.imp[0];
        expect(data.banner).to.exist;
        expect(data.banner.w).to.equal(300);
        expect(data.banner.h).to.equal(250);
        expect(data.banner.format).to.exist;
        expect(data.banner.format.length).to.equal(bannerAndVideoBidRequests[0].mediaTypes.banner.sizes.length);

        // Case: when size is not present in adslo
        bannerAndVideoBidRequests[0].params.adSlot = '/15671365/DMDemo';
        request = spec.buildRequests(bannerAndVideoBidRequests);
        data = JSON.parse(request.data);
        data = data.imp[0];
        expect(data.banner).to.exist;
        expect(data.banner.w).to.equal(bannerAndVideoBidRequests[0].mediaTypes.banner.sizes[0][0]);
        expect(data.banner.h).to.equal(bannerAndVideoBidRequests[0].mediaTypes.banner.sizes[0][1]);
        expect(data.banner.format).to.exist;
        expect(data.banner.format.length).to.equal(bannerAndVideoBidRequests[0].mediaTypes.banner.sizes.length - 1);

        expect(data.video).to.exist;
        expect(data.video.w).to.equal(bannerAndVideoBidRequests[0].mediaTypes.video.playerSize[0]);
        expect(data.video.h).to.equal(bannerAndVideoBidRequests[0].mediaTypes.video.playerSize[1]);
      });

      it('Request params - banner and video req in single adslot - should ignore banner imp if banner size is set to fluid and send video imp object', function () {
        /* Adslot configured for banner and video.
           banner size is set to [['fluid'], [300, 250]]
           adslot specifies a size as 300x250
           => banner imp object should have primary w and h set to 300 and 250. fluid is ignored
        */
        bannerAndVideoBidRequests[0].mediaTypes.banner.sizes = [['fluid'], [160, 600]];

        let request = spec.buildRequests(bannerAndVideoBidRequests);
        let data = JSON.parse(request.data);
        data = data.imp[0];

        expect(data.banner).to.exist;
        expect(data.banner.w).to.equal(300);
        expect(data.banner.h).to.equal(250);
        expect(data.banner.format).to.exist;
        expect(data.banner.format[0].w).to.equal(160);
        expect(data.banner.format[0].h).to.equal(600);

        /* Adslot configured for banner and video.
           banner size is set to [['fluid'], [300, 250]]
           adslot does not specify any size
           => banner imp object should have primary w and h set to 300 and 250. fluid is ignored
        */
        bannerAndVideoBidRequests[0].mediaTypes.banner.sizes = [['fluid'], [160, 600]];
        bannerAndVideoBidRequests[0].params.adSlot = '/15671365/DMDemo';

        request = spec.buildRequests(bannerAndVideoBidRequests);
        data = JSON.parse(request.data);
        data = data.imp[0];

        expect(data.banner).to.exist;
        expect(data.banner.w).to.equal(160);
        expect(data.banner.h).to.equal(600);
        expect(data.banner.format).to.not.exist;

        /* Adslot configured for banner and video.
           banner size is set to [[728 90], ['fluid'], [300, 250]]
           adslot does not specify any size
           => banner imp object should have primary w and h set to 728 and 90.
              banner.format should have 300, 250 set in it
              fluid is ignore
        */

        bannerAndVideoBidRequests[0].mediaTypes.banner.sizes = [[728, 90], ['fluid'], [300, 250]];
        request = spec.buildRequests(bannerAndVideoBidRequests);
        data = JSON.parse(request.data);
        data = data.imp[0];

        expect(data.banner).to.exist;
        expect(data.banner.w).to.equal(728);
        expect(data.banner.h).to.equal(90);
        expect(data.banner.format).to.exist;
        expect(data.banner.format[0].w).to.equal(300);
        expect(data.banner.format[0].h).to.equal(250);

        /* Adslot configured for banner and video.
           banner size is set to [['fluid']]
           adslot does not specify any size
           => banner object should not be sent in the request. only video should be sent.
        */

        bannerAndVideoBidRequests[0].mediaTypes.banner.sizes = [['fluid']];
        request = spec.buildRequests(bannerAndVideoBidRequests);
        data = JSON.parse(request.data);
        data = data.imp[0];

        expect(data.banner).to.not.exist;
        expect(data.video).to.exist;
      });

      it('Request params - should not contain banner imp if mediaTypes.banner is not present and sizes is specified in bid.sizes', function() {
        delete bannerAndVideoBidRequests[0].mediaTypes.banner;
        bannerAndVideoBidRequests[0].params.sizes = [300, 250];

        let request = spec.buildRequests(bannerAndVideoBidRequests);
        let data = JSON.parse(request.data);
        data = data.imp[0];
        expect(data.banner).to.not.exist;
      });

      it('Request params - should handle banner and native format in single adunit', function() {
        let request = spec.buildRequests(bannerAndNativeBidRequests);
        let data = JSON.parse(request.data);
        data = data.imp[0];

        expect(data.banner).to.exist;
        expect(data.banner.w).to.equal(300);
        expect(data.banner.h).to.equal(250);
        expect(data.banner.format).to.exist;
        expect(data.banner.format.length).to.equal(bannerAndNativeBidRequests[0].mediaTypes.banner.sizes.length);

        expect(data.native).to.exist;
        expect(data.native.request).to.exist;
      });

      it('Request params - should handle video and native format in single adunit', function() {
        let request = spec.buildRequests(videoAndNativeBidRequests);
        let data = JSON.parse(request.data);
        data = data.imp[0];

        expect(data.video).to.exist;
        expect(data.video.w).to.equal(bannerAndVideoBidRequests[0].mediaTypes.video.playerSize[0]);
        expect(data.video.h).to.equal(bannerAndVideoBidRequests[0].mediaTypes.video.playerSize[1]);

        expect(data.native).to.exist;
        expect(data.native.request).to.exist;
      });

      it('Request params - should handle banner, video and native format in single adunit', function() {
        let request = spec.buildRequests(bannerVideoAndNativeBidRequests);
        let data = JSON.parse(request.data);
        data = data.imp[0];

        expect(data.banner).to.exist;
        expect(data.banner.w).to.equal(300);
        expect(data.banner.h).to.equal(250);
        expect(data.banner.format).to.exist;
        expect(data.banner.format.length).to.equal(bannerAndNativeBidRequests[0].mediaTypes.banner.sizes.length);

        expect(data.video).to.exist;
        expect(data.video.w).to.equal(bannerAndVideoBidRequests[0].mediaTypes.video.playerSize[0]);
        expect(data.video.h).to.equal(bannerAndVideoBidRequests[0].mediaTypes.video.playerSize[1]);

        expect(data.native).to.exist;
        expect(data.native.request).to.exist;
      });

      it('Request params - should not add banner object if mediaTypes.banner is missing, but adunits.sizes is present', function() {
        delete bannerAndNativeBidRequests[0].mediaTypes.banner;
        bannerAndNativeBidRequests[0].sizes = [729, 90];

        let request = spec.buildRequests(bannerAndNativeBidRequests);
        let data = JSON.parse(request.data);
        data = data.imp[0];

        expect(data.banner).to.not.exist;

        expect(data.native).to.exist;
        expect(data.native.request).to.exist;
      });

      it('Request params - banner and native multiformat request - should not have native object incase of invalid config present', function() {
        bannerAndNativeBidRequests[0].mediaTypes.native = {
          title: { required: true },
          image: { required: true },
          sponsoredBy: { required: true },
          clickUrl: { required: true }
        };
        bannerAndNativeBidRequests[0].nativeParams = {
          title: { required: true },
          image: { required: true },
          sponsoredBy: { required: true },
          clickUrl: { required: true }
        }
        let request = spec.buildRequests(bannerAndNativeBidRequests);
        let data = JSON.parse(request.data);
        data = data.imp[0];

        expect(data.banner).to.exist;
        expect(data.native).to.not.exist;
      });

      it('Request params - video and native multiformat request - should not have native object incase of invalid config present', function() {
        videoAndNativeBidRequests[0].mediaTypes.native = {
          title: { required: true },
          image: { required: true },
          sponsoredBy: { required: true },
          clickUrl: { required: true }
        };
        videoAndNativeBidRequests[0].nativeParams = {
          title: { required: true },
          image: { required: true },
          sponsoredBy: { required: true },
          clickUrl: { required: true }
        }
        let request = spec.buildRequests(videoAndNativeBidRequests);
        let data = JSON.parse(request.data);
        data = data.imp[0];

        expect(data.video).to.exist;
        expect(data.native).to.not.exist;
      });
  	});

    it('Request params dctr check', function () {
      let multipleBidRequests = [
        {
          bidder: 'pubmatic',
          params: {
            publisherId: '301',
            adSlot: '/15671365/DMDemo@300x250:0',
            kadfloor: '1.2',
            pmzoneid: 'aabc, ddef',
            kadpageurl: 'www.publisher.com',
            yob: '1986',
            gender: 'M',
            lat: '12.3',
            lon: '23.7',
            wiid: '1234567890',
            profId: '100',
            verId: '200',
            currency: 'AUD',
            dctr: 'key1=val1|key2=val2,!val3'
          },
          placementCode: '/19968336/header-bid-tag-1',
          sizes: [[300, 250], [300, 600]],
          bidId: '23acc48ad47af5',
          requestId: '0fb4905b-9456-4152-86be-c6f6d259ba99',
          bidderRequestId: '1c56ad30b9b8ca8',
          transactionId: '92489f71-1bf2-49a0-adf9-000cea934729'
        },
        {
          bidder: 'pubmatic',
          params: {
            publisherId: '301',
            adSlot: '/15671365/DMDemo@300x250:0',
            kadfloor: '1.2',
            pmzoneid: 'aabc, ddef',
            kadpageurl: 'www.publisher.com',
            yob: '1986',
            gender: 'M',
            lat: '12.3',
            lon: '23.7',
            wiid: '1234567890',
            profId: '100',
            verId: '200',
            currency: 'GBP',
            dctr: 'key1=val3|key2=val1,!val3|key3=val123'
          },
          placementCode: '/19968336/header-bid-tag-1',
          sizes: [[300, 250], [300, 600]],
          bidId: '23acc48ad47af5',
          requestId: '0fb4905b-9456-4152-86be-c6f6d259ba99',
          bidderRequestId: '1c56ad30b9b8ca8',
          transactionId: '92489f71-1bf2-49a0-adf9-000cea934729'
        }
      ];

      let request = spec.buildRequests(multipleBidRequests);
      let data = JSON.parse(request.data);

      /* case 1 -
        dctr is found in adunit[0]
      */

      expect(data.site.ext).to.exist.and.to.be.an('object'); // dctr parameter
      expect(data.site.ext.key_val).to.exist.and.to.equal(multipleBidRequests[0].params.dctr);

      /* case 2 -
        dctr not present in adunit[0]
      */
      delete multipleBidRequests[0].params.dctr;
      request = spec.buildRequests(multipleBidRequests);
      data = JSON.parse(request.data);

      expect(data.site.ext).to.not.exist;

      /* case 3 -
        dctr is present in adunit[0], but is not a string value
      */
      multipleBidRequests[0].params.dctr = 123;
      request = spec.buildRequests(multipleBidRequests);
      data = JSON.parse(request.data);

      expect(data.site.ext).to.not.exist;
    });

    describe('Request param bcat checking', function() {
      let multipleBidRequests = [
        {
          bidder: 'pubmatic',
          params: {
            publisherId: '301',
            adSlot: '/15671365/DMDemo@300x250:0',
            kadfloor: '1.2',
            pmzoneid: 'aabc, ddef',
            kadpageurl: 'www.publisher.com',
            yob: '1986',
            gender: 'M',
            lat: '12.3',
            lon: '23.7',
            wiid: '1234567890',
            profId: '100',
            verId: '200',
            currency: 'AUD',
            dctr: 'key1=val1|key2=val2,!val3'
          },
          placementCode: '/19968336/header-bid-tag-1',
          sizes: [[300, 250], [300, 600]],
          bidId: '23acc48ad47af5',
          requestId: '0fb4905b-9456-4152-86be-c6f6d259ba99',
          bidderRequestId: '1c56ad30b9b8ca8',
          transactionId: '92489f71-1bf2-49a0-adf9-000cea934729'
        },
        {
          bidder: 'pubmatic',
          params: {
            publisherId: '301',
            adSlot: '/15671365/DMDemo@300x250:0',
            kadfloor: '1.2',
            pmzoneid: 'aabc, ddef',
            kadpageurl: 'www.publisher.com',
            yob: '1986',
            gender: 'M',
            lat: '12.3',
            lon: '23.7',
            wiid: '1234567890',
            profId: '100',
            verId: '200',
            currency: 'GBP',
            dctr: 'key1=val3|key2=val1,!val3|key3=val123'
          },
          placementCode: '/19968336/header-bid-tag-1',
          sizes: [[300, 250], [300, 600]],
          bidId: '23acc48ad47af5',
          requestId: '0fb4905b-9456-4152-86be-c6f6d259ba99',
          bidderRequestId: '1c56ad30b9b8ca8',
          transactionId: '92489f71-1bf2-49a0-adf9-000cea934729'
        }
      ];

      it('bcat: pass only strings', function() {
        multipleBidRequests[0].params.bcat = [1, 2, 3, 'IAB1', 'IAB2'];
        let request = spec.buildRequests(multipleBidRequests);
        let data = JSON.parse(request.data);
        expect(data.bcat).to.exist.and.to.deep.equal(['IAB1', 'IAB2']);
      });

      it('bcat: pass strings with length greater than 3', function() {
        multipleBidRequests[0].params.bcat = ['AB', 'CD', 'IAB1', 'IAB2'];
        let request = spec.buildRequests(multipleBidRequests);
        let data = JSON.parse(request.data);
        expect(data.bcat).to.exist.and.to.deep.equal(['IAB1', 'IAB2']);
      });

      it('bcat: trim the strings', function() {
        multipleBidRequests[0].params.bcat = ['   IAB1    ', '   IAB2   '];
        let request = spec.buildRequests(multipleBidRequests);
        let data = JSON.parse(request.data);
        expect(data.bcat).to.exist.and.to.deep.equal(['IAB1', 'IAB2']);
      });

      it('bcat: pass only unique strings', function() {
        // multi slot
        multipleBidRequests[0].params.bcat = ['IAB1', 'IAB2', 'IAB1', 'IAB2', 'IAB1', 'IAB2'];
        multipleBidRequests[1].params.bcat = ['IAB1', 'IAB2', 'IAB1', 'IAB2', 'IAB1', 'IAB3'];
        let request = spec.buildRequests(multipleBidRequests);
        let data = JSON.parse(request.data);
        expect(data.bcat).to.exist.and.to.deep.equal(['IAB1', 'IAB2', 'IAB3']);
      });

      it('bcat: do not pass bcat if all entries are invalid', function() {
        // multi slot
        multipleBidRequests[0].params.bcat = ['', 'IAB', 'IAB'];
        multipleBidRequests[1].params.bcat = ['    ', 22, 99999, 'IA'];
        let request = spec.buildRequests(multipleBidRequests);
        let data = JSON.parse(request.data);
        expect(data.bcat).to.deep.equal(undefined);
      });
    });

    describe('Response checking', function () {
      it('should check for valid response values', function () {
        let request = spec.buildRequests(bidRequests);
        let data = JSON.parse(request.data);
        let response = spec.interpretResponse(bidResponses, request);
        expect(response).to.be.an('array').with.length.above(0);
        expect(response[0].requestId).to.equal(bidResponses.body.seatbid[0].bid[0].impid);
        expect(response[0].cpm).to.equal((bidResponses.body.seatbid[0].bid[0].price).toFixed(2));
        expect(response[0].width).to.equal(bidResponses.body.seatbid[0].bid[0].w);
        expect(response[0].height).to.equal(bidResponses.body.seatbid[0].bid[0].h);
        if (bidResponses.body.seatbid[0].bid[0].crid) {
          expect(response[0].creativeId).to.equal(bidResponses.body.seatbid[0].bid[0].crid);
        } else {
          expect(response[0].creativeId).to.equal(bidResponses.body.seatbid[0].bid[0].id);
        }
        expect(response[0].dealId).to.equal(bidResponses.body.seatbid[0].bid[0].dealid);
        expect(response[0].currency).to.equal('USD');
        expect(response[0].netRevenue).to.equal(false);
        expect(response[0].ttl).to.equal(300);
        expect(response[0].meta.networkId).to.equal(123);
        expect(response[0].meta.buyerId).to.equal(976);
        expect(response[0].meta.clickUrl).to.equal('blackrock.com');
        expect(response[0].referrer).to.include(data.site.ref);
        expect(response[0].ad).to.equal(bidResponses.body.seatbid[0].bid[0].adm);

        expect(response[1].requestId).to.equal(bidResponses.body.seatbid[1].bid[0].impid);
        expect(response[1].cpm).to.equal((bidResponses.body.seatbid[1].bid[0].price).toFixed(2));
        expect(response[1].width).to.equal(bidResponses.body.seatbid[1].bid[0].w);
        expect(response[1].height).to.equal(bidResponses.body.seatbid[1].bid[0].h);
        if (bidResponses.body.seatbid[1].bid[0].crid) {
          expect(response[1].creativeId).to.equal(bidResponses.body.seatbid[1].bid[0].crid);
        } else {
          expect(response[1].creativeId).to.equal(bidResponses.body.seatbid[1].bid[0].id);
        }
        expect(response[1].dealId).to.equal(bidResponses.body.seatbid[1].bid[0].dealid);
        expect(response[1].currency).to.equal('USD');
        expect(response[1].netRevenue).to.equal(false);
        expect(response[1].ttl).to.equal(300);
        expect(response[1].meta.networkId).to.equal(422);
        expect(response[1].meta.buyerId).to.equal(832);
        expect(response[1].meta.clickUrl).to.equal('hivehome.com');
        expect(response[1].referrer).to.include(data.site.ref);
        expect(response[1].ad).to.equal(bidResponses.body.seatbid[1].bid[0].adm);
      });

      it('should check for dealChannel value selection', function () {
        let request = spec.buildRequests(bidRequests);
        let response = spec.interpretResponse(bidResponses, request);
        expect(response).to.be.an('array').with.length.above(0);
        expect(response[0].dealChannel).to.equal('PMPG');
        expect(response[1].dealChannel).to.equal('PREF');
      });

      it('should check for unexpected dealChannel value selection', function () {
        let request = spec.buildRequests(bidRequests);
        let updateBiResponse = bidResponses;
        updateBiResponse.body.seatbid[0].bid[0].ext.deal_channel = 11;

        let response = spec.interpretResponse(updateBiResponse, request);

        expect(response).to.be.an('array').with.length.above(0);
        expect(response[0].dealChannel).to.equal(null);
      });

      it('should have a valid native bid response', function() {
        let request = spec.buildRequests(nativeBidRequests);
        let data = JSON.parse(request.data);
        data.imp[0].id = '2a5571261281d4';
        request.data = JSON.stringify(data);
        let response = spec.interpretResponse(nativeBidResponse, request);
        expect(response).to.be.an('array').with.length.above(0);
        expect(response[0].native).to.exist.and.to.be.an('object');
        expect(response[0].mediaType).to.exist.and.to.equal('native');
        expect(response[0].native.title).to.exist.and.to.be.an('string');
        expect(response[0].native.image).to.exist.and.to.be.an('object');
        expect(response[0].native.image.url).to.exist.and.to.be.an('string');
        expect(response[0].native.image.height).to.exist;
        expect(response[0].native.image.width).to.exist;
        expect(response[0].native.sponsoredBy).to.exist.and.to.be.an('string');
        expect(response[0].native.clickUrl).to.exist.and.to.be.an('string');
      });

      it('should check for valid banner mediaType in case of multiformat request', function() {
        let request = spec.buildRequests(bidRequests);
        let response = spec.interpretResponse(bannerBidResponse, request);

        expect(response[0].mediaType).to.equal('banner');
      });

      it('should check for valid video mediaType in case of multiformat request', function() {
        let request = spec.buildRequests(videoBidRequests);
        let response = spec.interpretResponse(videoBidResponse, request);

        expect(response[0].mediaType).to.equal('video');
      });

      it('should check for valid native mediaType in case of multiformat request', function() {
        let request = spec.buildRequests(nativeBidRequests);
        let response = spec.interpretResponse(nativeBidResponse, request);

        expect(response[0].mediaType).to.equal('native');
      });
    });

    describe('getUserSyncs', function() {
      const syncurl = 'https://ads.pubmatic.com/AdServer/js/showad.js#PIX&kdntuid=1&p=5670';
      let sandbox;
      beforeEach(function () {
        sandbox = sinon.sandbox.create();
      });
      afterEach(function() {
        sandbox.restore();
      })

      it('execute only if iframeEnabled', function() {
        expect(spec.getUserSyncs({ iframeEnabled: true }, {}, undefined, undefined)).to.deep.equal([{
          type: 'iframe', url: syncurl
        }]);
        expect(spec.getUserSyncs({ iframeEnabled: false }, {}, undefined, undefined)).to.equal(undefined);
      });

      it('CCPA/USP', function() {
        expect(spec.getUserSyncs({ iframeEnabled: true }, {}, undefined, '1NYN')).to.deep.equal([{
          type: 'iframe', url: `${syncurl}&us_privacy=1NYN`
        }]);
      });

      it('GDPR', function() {
        expect(spec.getUserSyncs({ iframeEnabled: true }, {}, {gdprApplies: true, consentString: 'foo'}, undefined)).to.deep.equal([{
          type: 'iframe', url: `${syncurl}&gdpr=1&gdpr_consent=foo`
        }]);
        expect(spec.getUserSyncs({ iframeEnabled: true }, {}, {gdprApplies: false, consentString: 'foo'}, undefined)).to.deep.equal([{
          type: 'iframe', url: `${syncurl}&gdpr=0&gdpr_consent=foo`
        }]);
        expect(spec.getUserSyncs({ iframeEnabled: true }, {}, {gdprApplies: true, consentString: undefined}, undefined)).to.deep.equal([{
          type: 'iframe', url: `${syncurl}&gdpr=1&gdpr_consent=`
        }]);
      });

      it('COPPA: true', function() {
        sandbox.stub(config, 'getConfig').callsFake(key => {
          const config = {
            'coppa': true
          };
          return config[key];
        });
        expect(spec.getUserSyncs({ iframeEnabled: true }, {}, undefined, undefined)).to.deep.equal([{
          type: 'iframe', url: `${syncurl}&coppa=1`
        }]);
      });

      it('COPPA: false', function() {
        sandbox.stub(config, 'getConfig').callsFake(key => {
          const config = {
            'coppa': false
          };
          return config[key];
        });
        expect(spec.getUserSyncs({ iframeEnabled: true }, {}, undefined, undefined)).to.deep.equal([{
          type: 'iframe', url: `${syncurl}`
        }]);
      });

      it('GDPR + COPPA:true + CCPA/USP', function() {
        sandbox.stub(config, 'getConfig').callsFake(key => {
          const config = {
            'coppa': true
          };
          return config[key];
        });
        expect(spec.getUserSyncs({ iframeEnabled: true }, {}, {gdprApplies: true, consentString: 'foo'}, '1NYN')).to.deep.equal([{
          type: 'iframe', url: `${syncurl}&gdpr=1&gdpr_consent=foo&us_privacy=1NYN&coppa=1`
        }]);
      });
    });
  });
});
