// import or require modules necessary for the test, e.g.:

import {expect} from 'chai';
import {spec} from 'modules/pubwiseBidAdapter.js';
import {_checkVideoPlacement, _checkMediaType} from 'modules/pubwiseBidAdapter.js'; // this is exported only for testing so maintaining the JS convention of _ to indicate the intent
import {_parseAdSlot} from 'modules/pubwiseBidAdapter.js'; // this is exported only for testing so maintaining the JS convention of _ to indicate the intent
import * as utils from 'src/utils.js';

const sampleRequestBanner = {
  'id': '6c148795eb836a',
  'tagid': 'div-gpt-ad-1460505748561-0',
  'bidfloor': 1,
  'secure': 1,
  'bidfloorcur': 'USD',
  'banner': {
    'w': 300,
    'h': 250,
    'format': [
      {
        'w': 300,
        'h': 600
      }
    ],
    'pos': 0,
    'topframe': 1
  }
};

const sampleRequest = {
  'at': 1,
  'cur': [
    'USD'
  ],
  'imp': [
    sampleRequestBanner,
    {
      'id': '7329ddc1d84eb3',
      'tagid': 'div-gpt-ad-1460505748561-1',
      'secure': 1,
      'bidfloorcur': 'USD',
      'native': {
        'request': '{"assets":[{"id":1,"required":1,"title":{"len":80}},{"id":5,"required":1,"data":{"type":2}},{"id":2,"required":1,"img":{"type":{"ID":2,"KEY":"image","TYPE":0},"w":150,"h":50}},{"id":4,"required":1,"data":{"type":1}}]}'
      }
    }
  ],
  'site': {
    'page': 'http://localhost:9999/integrationExamples/gpt/hello_world.html?pbjs_debug=true',
    'ref': 'http://localhost:9999/integrationExamples/gpt/hello_world.html?pbjs_debug=true',
    'publisher': {
      'id': 'xxxxxx'
    }
  },
  'device': {
    'ua': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/86.0.4240.198 Safari/537.36',
    'js': 1,
    'dnt': 0,
    'h': 600,
    'w': 800,
    'language': 'en-US',
    'geo': {
      'lat': 33.91989876432274,
      'lon': -84.38897708175764
    }
  },
  'user': {
    'gender': 'M',
    'geo': {
      'lat': 33.91989876432274,
      'lon': -84.38897708175764
    },
    'yob': 2000
  },
  'test': 0,
  'ext': {
    'version': '0.0.1'
  },
  'source': {
    'tid': '2c8cd034-f068-4419-8c30-f07292c0d17b'
  }
};

const sampleValidBannerBidRequest = {
  'bidder': 'pubwise',
  'params': {
    'siteId': 'xxxxxx',
    'bidFloor': '1.00',
    'currency': 'USD',
    'gender': 'M',
    'lat': '33.91989876432274',
    'lon': '-84.38897708175764',
    'yob': '2000',
    'bcat': ['IAB25-3', 'IAB26-1', 'IAB26-2', 'IAB26-3', 'IAB26-4'],
  },
  'gdprConsent': {
    'consentString': 'BOEFEAyOEFEAyAHABDENAI4AAAB9vABAASA',
    'gdprApplies': 1,
  },
  'uspConsent': 1,
  'crumbs': {
    'pubcid': '9a62f261-3c0b-4cc8-8db3-a72ae86ec6ba'
  },
  ortb2Imp: {
    ext: {
      tid: '2001a8b2-3bcf-417d-b64f-92641dae21e0',
      data: {
        adserver: {
          name: 'gam',
          adslot: '/19968336/header-bid-tag-0'
        },
        pbadslot: '/19968336/header-bid-tag-0',
      }
    }
  },
  'mediaTypes': {
    'banner': {
      'sizes': [
        [
          300,
          250
        ],
        [
          300,
          600
        ]
      ]
    }
  },
  'adUnitCode': 'div-gpt-ad-1460505748561-0',
  'sizes': [
    [
      300,
      250
    ],
    [
      300,
      600
    ]
  ],
  'bidId': '6c148795eb836a',
  'bidderRequestId': '18a45bff5ff705',
  'auctionId': '9f20663c-4629-4b5c-bff6-ff3aa8319358',
  'src': 'client',
  'bidRequestsCount': 1,
  'bidderRequestsCount': 1,
  'bidderWinsCount': 0
};

const sampleValidBidRequests = [
  sampleValidBannerBidRequest,
  {
    'bidder': 'pubwise',
    'params': {
      'siteId': 'xxxxxx'
    },
    'crumbs': {
      'pubcid': '9a62f261-3c0b-4cc8-8db3-a72ae86ec6ba'
    },
    'nativeParams': {
      'title': {
        'required': true,
        'len': 80
      },
      'body': {
        'required': true
      },
      'image': {
        'required': true,
        'sizes': [
          150,
          50
        ]
      },
      'sponsoredBy': {
        'required': true
      },
      'icon': {
        'required': false
      }
    },
    ortb2Imp: {
      ext: {
        tid: '2c8cd034-f068-4419-8c30-f07292c0d17b',
        data: {
          adserver: {
            name: 'gam',
            adslot: '/19968336/header-bid-tag-0'
          },
          pbadslot: '/19968336/header-bid-tag-0',
        }
      }
    },
    'mediaTypes': {
      'native': {
        'title': {
          'required': true,
          'len': 80
        },
        'body': {
          'required': true
        },
        'image': {
          'required': true,
          'sizes': [
            150,
            50
          ]
        },
        'sponsoredBy': {
          'required': true
        },
        'icon': {
          'required': false
        }
      }
    },
    'adUnitCode': 'div-gpt-ad-1460505748561-1',
    'sizes': [],
    'bidId': '30ab7516a51a7c',
    'bidderRequestId': '18a45bff5ff705',
    'auctionId': '9f20663c-4629-4b5c-bff6-ff3aa8319358',
    'src': 'client',
    'bidRequestsCount': 1,
    'bidderRequestsCount': 1,
    'bidderWinsCount': 0
  }
]

const sampleBidderBannerRequest = {
  'bidder': 'pubwise',
  'params': {
    'siteId': 'xxxxxx',
    'height': 250,
    'width': 300,
    'gender': 'M',
    'yob': '2000',
    'lat': '33.91989876432274',
    'lon': '-84.38897708175764',
    'bidFloor': '1.00',
    'currency': 'USD',
    'adSlot': '',
    'adUnit': 'div-gpt-ad-1460505748561-0',
    'bcat': [
      'IAB25-3',
      'IAB26-1',
      'IAB26-2',
      'IAB26-3',
      'IAB26-4',
    ],
  },
  'crumbs': {
    'pubcid': '9a62f261-3c0b-4cc8-8db3-a72ae86ec6ba'
  },
  ortb2Imp: {
    ext: {
      tid: '2001a8b2-3bcf-417d-b64f-92641dae21e0',
      data: {
        adserver: {
          name: 'gam',
          adslot: '/19968336/header-bid-tag-0'
        },
        pbadslot: '/19968336/header-bid-tag-0',
      }
    }
  },
  'mediaTypes': {
    'banner': {
      'sizes': [
        [
          300,
          600
        ]
      ]
    }
  },
  'adUnitCode': 'div-gpt-ad-1460505748561-0',
  'sizes': [
    [
      300,
      250
    ],
    [
      300,
      600
    ]
  ],
  'bidId': '6c148795eb836a',
  'bidderRequestId': '18a45bff5ff705',
  'auctionId': '9f20663c-4629-4b5c-bff6-ff3aa8319358',
  'src': 'client',
  'bidRequestsCount': 1,
  'bidderRequestsCount': 1,
  'bidderWinsCount': 0,
  'gdprConsent': {
    'consentString': 'BOEFEAyOEFEAyAHABDENAI4AAAB9vABAASA',
    'gdprApplies': 1,
  },
  'uspConsent': 1,
};

const sampleBidderRequest = {
  'bidderCode': 'pubwise',
  ortb2: {
    source: {
      tid: '9f20663c-4629-4b5c-bff6-ff3aa8319358',
    }
  },
  'bidderRequestId': '18a45bff5ff705',
  'bids': [
    sampleBidderBannerRequest,
    {
      'bidder': 'pubwise',
      'params': {
        'siteId': 'xxxxxx'
      },
      'crumbs': {
        'pubcid': '9a62f261-3c0b-4cc8-8db3-a72ae86ec6ba'
      },
      'nativeParams': {
        'title': {
          'required': true,
          'len': 80
        },
        'body': {
          'required': true
        },
        'image': {
          'required': true,
          'sizes': [
            150,
            50
          ]
        },
        'sponsoredBy': {
          'required': true
        },
        'icon': {
          'required': false
        }
      },
      ortb2Imp: {
        ext: {
          data: {
            adserver: {
              name: 'gam',
              adslot: '/19968336/header-bid-tag-0'
            },
            pbadslot: '/19968336/header-bid-tag-0',
          }
        }
      },
      'mediaTypes': {
        'native': {
          'title': {
            'required': true,
            'len': 80
          },
          'body': {
            'required': true
          },
          'image': {
            'required': true,
            'sizes': [
              150,
              50
            ]
          },
          'sponsoredBy': {
            'required': true
          },
          'icon': {
            'required': false
          }
        }
      },
      'adUnitCode': 'div-gpt-ad-1460505748561-1',
      'transactionId': '2c8cd034-f068-4419-8c30-f07292c0d17b',
      'sizes': [],
      'bidId': '30ab7516a51a7c',
      'bidderRequestId': '18a45bff5ff705',
      'auctionId': '9f20663c-4629-4b5c-bff6-ff3aa8319358',
      'src': 'client',
      'bidRequestsCount': 1,
      'bidderRequestsCount': 1,
      'bidderWinsCount': 0
    }
  ],
  'auctionStart': 1606269202001,
  'timeout': 1000,
  'gdprConsent': {
    'consentString': 'BOEFEAyOEFEAyAHABDENAI4AAAB9vABAASA',
    'gdprApplies': 1,
  },
  'uspConsent': 1,
  'refererInfo': {
    'referer': 'http://localhost:9999/integrationExamples/gpt/hello_world.html?pbjs_debug=true',
    'reachedTop': true,
    'isAmp': false,
    'numIframes': 0,
    'stack': [
      'http://localhost:9999/integrationExamples/gpt/hello_world.html?pbjs_debug=true'
    ],
    'canonicalUrl': null
  },
  'start': 1606269202004
};

const sampleRTBResponse = {
  'body': {
    'id': '1606251348404',
    'seatbid': [
      {
        'bid': [
          {
            'id': '1606579704052',
            'impid': '6c148795eb836a',
            'price': 1.23,
            'adm': '\u003cdiv style="box-sizing: border-box;width:298px;height:248px;border: 1px solid rgba(0,0,0,.25);border-radius:10px;"\u003e\n\t\u003ch3 style="margin-top:80px;text-align: center;"\u003ePubWise Test Bid\u003c/h3\u003e\n\u003c/div\u003e',
            'crid': 'test',
            'w': 300,
            'h': 250
          },
          {
            'id': '1606579704052',
            'impid': '7329ddc1d84eb3',
            'price': 1.23,
            'adm': '{"ver":"1.2","assets":[{"id":1,"title":{"text":"PubWise Test"}},{"id":2,"img":{"type":3,"url":"http://www.pubwise.io","w":300,"h":250}},{"id":3,"img":{"type":1,"url":"http://www.pubwise.io","w":150,"h":125}},{"id":5,"data":{"type":2,"value":"PubWise Test Desc"}},{"id":4,"data":{"type":1,"value":"PubWise.io"}}],"link":{"url":"http://www.pubwise.io"}}',
            'crid': 'test',
            'w': 300,
            'h': 250
          }
        ]
      }
    ],
    'bidid': 'testtesttest'
  }
};

const samplePBBidObjects = [
  {
    'requestId': '6c148795eb836a',
    'cpm': '1.23',
    'width': 300,
    'height': 250,
    'creativeId': 'test',
    'currency': 'USD',
    'netRevenue': true,
    'ttl': 300,
    'ad': '<div style="box-sizing: border-box;width:298px;height:248px;border: 1px solid rgba(0,0,0,.25);border-radius:10px;">\n\t<h3 style="margin-top:80px;text-align: center;">PubWise Test Bid</h3>\n</div>',
    'pw_seat': null,
    'pw_dspid': null,
    'partnerImpId': '1606579704052',
    'meta': {},
    'mediaType': 'banner',
  },
  {
    'requestId': '7329ddc1d84eb3',
    'cpm': '1.23',
    'width': 300,
    'height': 250,
    'creativeId': 'test',
    'currency': 'USD',
    'netRevenue': true,
    'ttl': 300,
    'ad': '{\"ver\":\"1.2\",\"assets\":[{\"id\":1,\"title\":{\"text\":\"PubWise Test\"}},{\"id\":2,\"img\":{\"type\":3,\"url\":\"http://www.pubwise.io\",\"w\":300,\"h\":250}},{\"id\":3,\"img\":{\"type\":1,\"url\":\"http://www.pubwise.io\",\"w\":150,\"h\":125}},{\"id\":5,\"data\":{\"type\":2,\"value\":\"PubWise Test Desc\"}},{\"id\":4,\"data\":{\"type\":1,\"value\":\"PubWise.io\"}}],\"link\":{\"url\":\"http://www.pubwise.io\"}}',
    'pw_seat': null,
    'pw_dspid': null,
    'partnerImpId': '1606579704052',
    'mediaType': 'native',
    'native': {
      'body': 'PubWise Test Desc',
      'icon': {
        'height': 125,
        'url': 'http://www.pubwise.io',
        'width': 150,
      },
      'image': {
        'height': 250,
        'url': 'http://www.pubwise.io',
        'width': 300,
      },
      'sponsoredBy': 'PubWise.io',
      'title': 'PubWise Test'
    },
    'meta': {},
    'impressionTrackers': [],
    'jstracker': [],
    'clickTrackers': [],
    'clickUrl': 'http://www.pubwise.io'
  }
];

describe('PubWiseAdapter', function () {
  describe('Handles Params Properly', function () {
    it('properly sets the default endpoint', function () {
      const referenceEndpoint = 'https://bid.pubwise.io/prebid';
      let endpointBidRequest = utils.deepClone(sampleValidBidRequests);
      // endpointBidRequest.forEach((bidRequest) => {
      //   bidRequest.params.endpoint_url = newEndpoint;
      // });
      let result = spec.buildRequests(endpointBidRequest, {auctionId: 'placeholder'});
      expect(result.url).to.equal(referenceEndpoint);
    });

    it('allows endpoint to be reset', function () {
      const newEndpoint = 'http://www.pubwise.io/endpointtest';
      let endpointBidRequest = utils.deepClone(sampleValidBidRequests);
      endpointBidRequest.forEach((bidRequest) => {
        bidRequest.params.endpoint_url = newEndpoint;
      });
      let result = spec.buildRequests(endpointBidRequest, {auctionId: 'placeholder'});
      expect(result.url).to.equal(newEndpoint);
    });
  });

  describe('Properly Validates Bids', function () {
    it('valid bid', function () {
      let validBid = {
          bidder: 'pubwise',
          params: {
            siteId: 'xxxxxx'
          }
        },
        isValid = spec.isBidRequestValid(validBid);
      expect(isValid).to.equal(true);
    });

    it('valid bid: extra fields are ok', function () {
      let validBid = {
          bidder: 'pubwise',
          params: {
            siteId: 'xxxxxx',
            gender: 'M',
          }
        },
        isValid = spec.isBidRequestValid(validBid);
      expect(isValid).to.equal(true);
    });

    it('invalid bid: no siteId', function () {
      let inValidBid = {
          bidder: 'pubwise',
          params: {
            gender: 'M',
          }
        },
        isValid = spec.isBidRequestValid(inValidBid);
      expect(isValid).to.equal(false);
    });

    it('invalid bid: siteId should be a string', function () {
      let validBid = {
          bidder: 'pubwise',
          params: {
            siteId: 123456
          }
        },
        isValid = spec.isBidRequestValid(validBid);
      expect(isValid).to.equal(false);
    });
  });

  describe('Handling Request Construction', function () {
    it('bid requests are not mutable', function() {
      let sourceBidRequest = utils.deepClone(sampleValidBidRequests);
      spec.buildRequests(sampleValidBidRequests, {auctionId: 'placeholder'});
      expect(sampleValidBidRequests).to.deep.equal(sourceBidRequest, 'Should be unedited as they are used elsewhere');
    });
    it('should handle complex bidRequest', function() {
      let request = spec.buildRequests(sampleValidBidRequests, sampleBidderRequest);
      expect(request.bidderRequest).to.equal(sampleBidderRequest, "Bid Request Doesn't Match Sample");
      expect(request.data.source.tid).to.equal(sampleBidderRequest.ortb2.source.tid, 'source.tid -> source.tid Mismatch');
      expect(request.data.imp[0].ext.tid).to.equal(sampleBidderRequest.bids[0].ortb2Imp.ext.tid, 'ext.tid -> ext.tid Mismatch');
    });
    it('must conform to API for buildRequests', function() {
      let request = spec.buildRequests(sampleValidBidRequests);
      expect(request.bidderRequest).to.be.undefined;
    });
  });

  describe('Identifies Media Types', function () {
    it('identifies native adm type', function() {
      let adm = '{"ver":"1.2","assets":[{"title":{"text":"PubWise Test"}},{"img":{"type":3,"url":"http://www.pubwise.io"}},{"img":{"type":1,"url":"http://www.pubwise.io"}},{"data":{"type":2,"value":"PubWise Test Desc"}},{"data":{"type":1,"value":"PubWise.io"}}],"link":{"url":""}}';
      let newBid = {mediaType: 'unknown'};
      _checkMediaType({adm}, newBid);
      expect(newBid.mediaType).to.equal('native', adm + ' Is a Native adm');
    });

    it('identifies banner adm type', function() {
      let adm = '<div style="box-sizing: border-box;width:298px;height:248px;border: 1px solid rgba(0,0,0,.25);border-radius:10px;">↵	<h3 style="margin-top:80px;text-align: center;">PubWise Test Bid</h3>↵</div>';
      let newBid = {mediaType: 'unknown'};
      _checkMediaType({adm}, newBid);
      expect(newBid.mediaType).to.equal('banner', adm + ' Is a Banner adm');
    });
  });

  describe('Properly Parses AdSlot Data', function () {
    it('parses banner', function() {
      let testBid = utils.deepClone(sampleValidBannerBidRequest)
      _parseAdSlot(testBid)
      expect(testBid).to.deep.equal(sampleBidderBannerRequest);
    });
  });

  describe('Properly Handles Response', function () {
    it('handles response with muiltiple responses', function() {
      // the request when it comes back is on the data object
      let pbResponse = spec.interpretResponse(sampleRTBResponse, {'data': sampleRequest})
      expect(pbResponse).to.deep.equal(samplePBBidObjects);
    });
  });

  describe('Video Testing', function () {
    /**
     * Video Testing
     */

    const videoBidRequests =
    [
      {
        code: 'video1',
        mediaTypes: {
          video: {
            playerSize: [640, 480],
            context: 'instream'
          }
        },
        bidder: 'pwbid',
        bidId: '22bddb28db77d',
        adUnitCode: 'Div1',
        params: {
          siteId: 'xxxxxx',
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

    let newvideoRequests = [{
      'bidder': 'pwbid',
      'params': {
        'siteId': 'xxxxx',
        'video': {
          'mimes': ['video/mp4'],
          'skippable': true,
          'protocols': [1, 2, 5],
          'linearity': 1
        }
      },
      'mediaTypes': {
        'video': {
          'playerSize': [
            [640, 480]
          ],
          'protocols': [1, 2, 5],
          'context': 'instream',
          'mimes': ['video/flv'],
          'skippable': false,
          'skip': 1,
          'linearity': 2
        }
      },
      'adUnitCode': 'video1',
      'transactionId': '803e3750-0bbe-4ffe-a548-b6eca15087bf',
      'sizes': [
        [640, 480]
      ],
      'bidId': '2c95df014cfe97',
      'bidderRequestId': '1fe59391566442',
      'auctionId': '3a4118ef-fb96-4416-b0b0-3cfc1cebc142',
      'src': 'client',
      'bidRequestsCount': 1,
      'bidderRequestsCount': 1,
      'bidderWinsCount': 0
    }];

    let newvideoBidResponses = {
      'body': {
        'id': '1621441141473',
        'cur': 'USD',
        'customdata': 'openrtb1',
        'ext': {
          'buyid': 'myBuyId'
        },
        'seatbid': [{
          'bid': [{
            'id': '2c95df014cfe97',
            'impid': '2c95df014cfe97',
            'price': 4.2,
            'cid': 'test1',
            'crid': 'test2',
            'adm': "<VAST version='3.0'><Ad id='601364'><InLine><AdSystem>Acudeo Compatible</AdSystem><AdTitle>VAST 2.0 Instream Test 1</AdTitle><Description>VAST 2.0 Instream Test 1</Description><Creatives><Creative AdID='601364'><Linear skipoffset='20%'><TrackingEvents><Tracking event='close'><![CDATA[https://pwtracking.com/linear/close]]></Tracking><Tracking event='skip'><![CDATA[https://pwtracking.com/linear/skip]]></Tracking><MediaFiles><MediaFile delivery='progressive' type='video/mp4' bitrate='500' width='400' height='300' scalable='true' maintainAspectRatio='true'><![CDATA[https://localhost/pubwise.mp4]]></MediaFile></MediaFiles></Linear></Creative></Creatives></InLine></Ad></VAST>",
            'w': 0,
            'h': 0
          }],
          'ext': {
            'buyid': 'myBuyId'
          }
        }]
      },
      'headers': {}
    };

    let videoBidResponse = {
      'body': {
        'id': '93D3BAD6-E2E2-49FB-9D89-920B1761C865',
        'seatbid': [{
          'bid': [{
            'id': '74858439-49D7-4169-BA5D-44A046315B2F',
            'impid': '22bddb28db77d',
            'price': 1.3,
            'adm': '<VAST version="3.0"><Ad id="601364"><!--not real sample--></Ad></VAST>',
            'h': 250,
            'w': 300,
            'ext': {
              'deal_channel': 6
            }
          }]
        }]
      }
    };

    it('Request params check for video ad', function () {
      let request = spec.buildRequests(videoBidRequests, {
        auctionId: 'new-auction-id'
      });
      let data = request.data;
      expect(data.imp[0].video).to.exist;
      expect(data.imp[0].tagid).to.equal('Div1');
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

    it('should assign mediaType even if bid.ext.mediaType does not exists', function() {
      let newrequest = spec.buildRequests(newvideoRequests, {
        auctionId: 'new-auction-id'
      });
      let newresponse = spec.interpretResponse(newvideoBidResponses, newrequest);
      expect(newresponse[0].mediaType).to.equal('video');
    });

    it('should not assign renderer if bid is video and request is for instream', function() {
      let request = spec.buildRequests(videoBidRequests, {
        auctionId: 'new-auction-id'
      });
      let response = spec.interpretResponse(videoBidResponse, request);
      expect(response[0].renderer).to.not.exist;
    });

    it('should process instream and outstream', function() {
      let validOutstreamRequest =
      {
        code: 'video1',
        mediaTypes: {
          video: {
            playerSize: [640, 480],
            context: 'outstream'
          }
        },
        bidder: 'pwbid',
        bidId: '47acc48ad47af5',
        requestId: '0fb4905b-1234-4152-86be-c6f6d259ba99',
        bidderRequestId: '1c56ad30b9b8ca8',
        transactionId: '92489f71-1bf2-49a0-adf9-000cea934729',
        params: {
          siteId: 'xxxxx',
          adSlot: 'Div1', // ad_id or tagid
          video: {
            mimes: ['video/mp4', 'video/x-flv'],
            skippable: true,
            minduration: 5,
            maxduration: 30
          }
        }
      };

      let outstreamBidRequest =
      [
        validOutstreamRequest
      ];

      let validInstreamRequest = {
        code: 'video1',
        mediaTypes: {
          video: {
            playerSize: [640, 480],
            context: 'instream'
          }
        },
        bidder: 'pwbid',
        bidId: '47acc48ad47af5',
        requestId: '0fb4905b-1234-4152-86be-c6f6d259ba99',
        bidderRequestId: '1c56ad30b9b8ca8',
        transactionId: '92489f71-1bf2-49a0-adf9-000cea934729',
        params: {
          siteId: 'xxxxx',
          adSlot: 'Div1', // ad_id or tagid
          video: {
            mimes: ['video/mp4', 'video/x-flv'],
            skippable: true,
            minduration: 5,
            maxduration: 30
          }
        }
      };

      let instreamBidRequest =
      [
        validInstreamRequest
      ];

      let outstreamRequest = spec.isBidRequestValid(validOutstreamRequest);
      expect(outstreamRequest).to.equal(false);

      let instreamRequest = spec.isBidRequestValid(validInstreamRequest);
      expect(instreamRequest).to.equal(true);
    });

    describe('Checking for Video.Placement property', function() {
      let sandbox, utilsMock;
      const adUnit = 'DivCheckPlacement';
      const msg_placement_missing = 'PubWise: Video.Placement param missing for DivCheckPlacement';
      let videoData = {
        battr: [6, 7],
        skipafter: 15,
        maxduration: 50,
        context: 'instream',
        playerSize: [640, 480],
        skip: 0,
        connectiontype: [1, 2, 6],
        skipmin: 10,
        minduration: 10,
        mimes: ['video/mp4', 'video/x-flv'],
      }
      beforeEach(() => {
        utilsMock = sinon.mock(utils);
        sandbox = sinon.sandbox.create();
        sandbox.spy(utils, 'logWarn');
      });

      afterEach(() => {
        utilsMock.restore();
        sandbox.restore();
      })

      it('should log Video.Placement param missing', function() {
        _checkVideoPlacement(videoData, adUnit);
        // when failing this gives an odd message about "AssertError: expected logWarn to be called with arguments" it means the specific message expected
        sinon.assert.calledWith(utils.logWarn, msg_placement_missing);
      })
      it('shoud not log Video.Placement param missing', function() {
        videoData['placement'] = 1;
        _checkVideoPlacement(videoData, adUnit);
        sinon.assert.neverCalledWith(utils.logWarn, msg_placement_missing);
      })
    });
    // end video testing
  });
});
