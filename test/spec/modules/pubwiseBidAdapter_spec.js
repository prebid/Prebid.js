// import or require modules necessary for the test, e.g.:

import {expect} from 'chai';
import {spec} from 'modules/pubwiseBidAdapter.js';
import {checkMediaType} from 'modules/pubwiseBidAdapter.js';
import * as utils from 'src/utils.js';

const sampleRequest = {
  'at': 1,
  'cur': [
    'USD'
  ],
  'imp': [
    {
      'id': '235da62bde68a6',
      'tagid': 'div-gpt-ad-1460505748561-0',
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
    },
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
    'language': 'en-US'
  },
  'user': {},
  'test': 0,
  'ext': {
    'version': '0.0.1'
  }
};

const sampleValidBidRequests = [
  {
    'bidder': 'pubwise',
    'params': {
      'siteId': 'xxxxxx'
    },
    'crumbs': {
      'pubcid': '9a62f261-3c0b-4cc8-8db3-a72ae86ec6ba'
    },
    'fpd': {
      'context': {
        'adServer': {
          'name': 'gam',
          'adSlot': '/19968336/header-bid-tag-0'
        },
        'pbAdSlot': '/19968336/header-bid-tag-0'
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
    'transactionId': '2001a8b2-3bcf-417d-b64f-92641dae21e0',
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
    'bidId': '235da62bde68a6',
    'bidderRequestId': '18a45bff5ff705',
    'auctionId': '9f20663c-4629-4b5c-bff6-ff3aa8319358',
    'src': 'client',
    'bidRequestsCount': 1,
    'bidderRequestsCount': 1,
    'bidderWinsCount': 0
  },
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
    'fpd': {
      'context': {
        'adServer': {
          'name': 'gam',
          'adSlot': '/19968336/header-bid-tag-0'
        },
        'pbAdSlot': '/19968336/header-bid-tag-0'
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
]

const sampleBidderRequest = {
  'bidderCode': 'pubwise',
  'auctionId': '9f20663c-4629-4b5c-bff6-ff3aa8319358',
  'bidderRequestId': '18a45bff5ff705',
  'bids': [
    {
      'bidder': 'pubwise',
      'params': {
        'siteId': 'xxxxxx'
      },
      'crumbs': {
        'pubcid': '9a62f261-3c0b-4cc8-8db3-a72ae86ec6ba'
      },
      'fpd': {
        'context': {
          'adServer': {
            'name': 'gam',
            'adSlot': '/19968336/header-bid-tag-0'
          },
          'pbAdSlot': '/19968336/header-bid-tag-0'
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
      'transactionId': '2001a8b2-3bcf-417d-b64f-92641dae21e0',
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
      'bidId': '235da62bde68a6',
      'bidderRequestId': '18a45bff5ff705',
      'auctionId': '9f20663c-4629-4b5c-bff6-ff3aa8319358',
      'src': 'client',
      'bidRequestsCount': 1,
      'bidderRequestsCount': 1,
      'bidderWinsCount': 0
    },
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
      'fpd': {
        'context': {
          'adServer': {
            'name': 'gam',
            'adSlot': '/19968336/header-bid-tag-0'
          },
          'pbAdSlot': '/19968336/header-bid-tag-0'
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

describe('PubWiseAdapter', function () {
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
            placeHolder: ''
          }
        },
        isValid = spec.isBidRequestValid(validBid);
      expect(isValid).to.equal(true);
    });

    it('invalid bid: no siteId', function () {
      let validBid = {
          bidder: 'pubwise',
          params: {
            placeHolder: ''
          }
        },
        isValid = spec.isBidRequestValid(validBid);
      expect(isValid).to.equal(false);
    });

    it('invalid bid: siteId shuold be a sring', function () {
      let validBid = {
          bidder: 'pubwise',
          params: {
            publisherId: 100000,
            placeHolder: ''
          }
        },
        isValid = spec.isBidRequestValid(validBid);
      expect(isValid).to.equal(false);
    });
  });

  describe('Handling Request Construction', function () {
    it('bid requests are not mutable', function() {
      let sourceBidRequest = utils.deepClone(sampleValidBidRequests)
      let request = spec.buildRequests(sampleValidBidRequests, {auctinId: 'placeholdr'});
      expect(sampleValidBidRequests).to.deep.equal(sourceBidRequest, 'Should be unedited as they are used elsewhere');
    });
    it('should handle complex bidRequest', function() {
      let request = spec.buildRequests(sampleValidBidRequests, sampleBidderRequest);
      expect(request.bidderRequest).to.equal(sampleBidderRequest);
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
      checkMediaType(adm, newBid);
      expect(newBid.mediaType).to.equal('native', adm + ' Is a Native adm');
    });

    it('identifies banner adm type', function() {
      let adm = '<div style="box-sizing: border-box;width:298px;height:248px;border: 1px solid rgba(0,0,0,.25);border-radius:10px;">↵	<h3 style="margin-top:80px;text-align: center;">PubWise Test Bid</h3>↵</div>';
      let newBid = {mediaType: 'unknown'};
      checkMediaType(adm, newBid);
      expect(newBid.mediaType).to.equal('banner', adm + ' Is a Banner adm');
    });
  });
});
