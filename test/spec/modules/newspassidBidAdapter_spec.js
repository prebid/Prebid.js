import { expect } from 'chai';
import { spec, defaultSize } from 'modules/newspassidBidAdapter.js';
import { config } from 'src/config.js';
import {getGranularityKeyName, getGranularityObject} from '../../../modules/newspassidBidAdapter.js';
import * as utils from '../../../src/utils.js';
const NEWSPASSURI = 'https://bidder.newspassid.com/openrtb2/auction';
const BIDDER_CODE = 'newspassid';
var validBidRequests = [
  {
    adUnitCode: 'div-gpt-ad-1460505748561-0',
    auctionId: '27dcb421-95c6-4024-a624-3c03816c5f99',
    bidId: '2899ec066a91ff8',
    bidRequestsCount: 1,
    bidder: 'newspassid',
    bidderRequestId: '1c1586b27a1b5c8',
    crumbs: {pubcid: '203a0692-f728-4856-87f6-9a25a6b63715'},
    params: { publisherId: '9876abcd12-3', customData: [{'settings': {}, 'targeting': {'gender': 'bart', 'age': 'low'}}], placementId: '1310000099', siteId: '1234567890', id: 'fea37168-78f1-4a23-a40e-88437a99377e', auctionId: '27dcb421-95c6-4024-a624-3c03816c5f99', imp: [ { id: '2899ec066a91ff8', tagid: 'undefined', secure: 1, banner: { format: [{ w: 300, h: 250 }, { w: 300, h: 600 }], h: 250, topframe: 1, w: 300 } } ] },
    sizes: [[300, 250], [300, 600]],
    transactionId: '2e63c0ed-b10c-4008-aed5-84582cecfe87'
  }
];
var validBidRequestsNoCustomData = [
  {
    adUnitCode: 'div-gpt-ad-1460505748561-0',
    auctionId: '27dcb421-95c6-4024-a624-3c03816c5f99',
    bidId: '2899ec066a91ff8',
    bidRequestsCount: 1,
    bidder: 'newspassid',
    bidderRequestId: '1c1586b27a1b5c8',
    crumbs: {pubcid: '203a0692-f728-4856-87f6-9a25a6b63715'},
    params: { publisherId: '9876abcd12-3', placementId: '1310000099', siteId: '1234567890', id: 'fea37168-78f1-4a23-a40e-88437a99377e', auctionId: '27dcb421-95c6-4024-a624-3c03816c5f99', imp: [ { id: '2899ec066a91ff8', tagid: 'undefined', secure: 1, banner: { format: [{ w: 300, h: 250 }, { w: 300, h: 600 }], h: 250, topframe: 1, w: 300 } } ] },
    sizes: [[300, 250], [300, 600]],
    transactionId: '2e63c0ed-b10c-4008-aed5-84582cecfe87'
  }
];
var validBidRequestsMulti = [
  {
    testId: 1,
    adUnitCode: 'div-gpt-ad-1460505748561-0',
    auctionId: '27dcb421-95c6-4024-a624-3c03816c5f99',
    bidId: '2899ec066a91ff8',
    bidRequestsCount: 1,
    bidder: 'newspassid',
    bidderRequestId: '1c1586b27a1b5c8',
    crumbs: {pubcid: '203a0692-f728-4856-87f6-9a25a6b63715'},
    params: { publisherId: '9876abcd12-3', customData: [{'settings': {}, 'targeting': {'gender': 'bart', 'age': 'low'}}], placementId: '1310000099', siteId: '1234567890', id: 'fea37168-78f1-4a23-a40e-88437a99377e', auctionId: '27dcb421-95c6-4024-a624-3c03816c5f99', imp: [ { id: '2899ec066a91ff8', tagid: 'undefined', secure: 1, banner: { format: [{ w: 300, h: 250 }, { w: 300, h: 600 }], h: 250, topframe: 1, w: 300 } } ] },
    sizes: [[300, 250], [300, 600]],
    transactionId: '2e63c0ed-b10c-4008-aed5-84582cecfe87'
  },
  {
    testId: 2,
    adUnitCode: 'div-gpt-ad-1460505748561-0',
    auctionId: '27dcb421-95c6-4024-a624-3c03816c5f99',
    bidId: '2899ec066a91ff0',
    bidRequestsCount: 1,
    bidder: 'newspassid',
    bidderRequestId: '1c1586b27a1b5c0',
    crumbs: {pubcid: '203a0692-f728-4856-87f6-9a25a6b63715'},
    params: { publisherId: '9876abcd12-3', customData: [{'settings': {}, 'targeting': {'gender': 'bart', 'age': 'low'}}], placementId: '1310000099', siteId: '1234567890', id: 'fea37168-78f1-4a23-a40e-88437a99377e', auctionId: '27dcb421-95c6-4024-a624-3c03816c5f99', imp: [ { id: '2899ec066a91ff8', tagid: 'undefined', secure: 1, banner: { format: [{ w: 300, h: 250 }, { w: 300, h: 600 }], h: 250, topframe: 1, w: 300 } } ] },
    sizes: [[300, 250], [300, 600]],
    transactionId: '2e63c0ed-b10c-4008-aed5-84582cecfe87'
  }
];
var validBidRequestsWithUserIdData = [
  {
    adUnitCode: 'div-gpt-ad-1460505748561-0',
    auctionId: '27dcb421-95c6-4024-a624-3c03816c5f99',
    bidId: '2899ec066a91ff8',
    bidRequestsCount: 1,
    bidder: 'newspassid',
    bidderRequestId: '1c1586b27a1b5c8',
    crumbs: {pubcid: '203a0692-f728-4856-87f6-9a25a6b63715'},
    params: { publisherId: '9876abcd12-3', customData: [{'settings': {}, 'targeting': {'gender': 'bart', 'age': 'low'}}], placementId: '1310000099', siteId: '1234567890', id: 'fea37168-78f1-4a23-a40e-88437a99377e', auctionId: '27dcb421-95c6-4024-a624-3c03816c5f99', imp: [ { id: '2899ec066a91ff8', tagid: 'undefined', secure: 1, banner: { format: [{ w: 300, h: 250 }, { w: 300, h: 600 }], h: 250, topframe: 1, w: 300 } } ] },
    sizes: [[300, 250], [300, 600]],
    transactionId: '2e63c0ed-b10c-4008-aed5-84582cecfe87',
    userId: {
      'pubcid': '12345678',
      'tdid': '1111tdid',
      'id5id': { uid: '1111', ext: { linkType: 2, abTestingControlGroup: false } },
      'criteoId': '1111criteoId',
      'idl_env': 'liverampId',
      'lipb': {'lipbid': 'lipbidId123'},
      'parrableId': {'eid': '01.5678.parrableid'},
      'sharedid': {'id': '01EAJWWNEPN3CYMM5N8M5VXY22', 'third': '01EAJWWNEPN3CYMM5N8M5VXY22'}
    },
    userIdAsEids: [
      {
        'source': 'pubcid.org',
        'uids': [
          {
            'id': '12345678',
            'atype': 1
          }
        ]
      },
      {
        'source': 'adserver.org',
        'uids': [{
          'id': '1111tdid',
          'atype': 1,
          'ext': {
            'rtiPartner': 'TDID'
          }
        }]
      },
      {
        'source': 'id5-sync.com',
        'uids': [{
          'id': 'ID5-someId',
          'atype': 1,
        }]
      },
      {
        'source': 'criteoId',
        'uids': [{
          'id': '1111criteoId',
          'atype': 1,
        }]
      },
      {
        'source': 'idl_env',
        'uids': [{
          'id': 'liverampId',
          'atype': 1,
        }]
      },
      {
        'source': 'lipb',
        'uids': [{
          'id': {'lipbid': 'lipbidId123'},
          'atype': 1,
        }]
      },
      {
        'source': 'parrableId',
        'uids': [{
          'id': {'eid': '01.5678.parrableid'},
          'atype': 1,
        }]
      }
    ]
  }
];
var validBidRequestsMinimal = [
  {
    adUnitCode: 'div-gpt-ad-1460505748561-0',
    auctionId: '27dcb421-95c6-4024-a624-3c03816c5f99',
    bidId: '2899ec066a91ff8',
    bidRequestsCount: 1,
    bidder: 'newspassid',
    bidderRequestId: '1c1586b27a1b5c8',
    params: { publisherId: '9876abcd12-3', placementId: '1310000099', siteId: '1234567890', id: 'fea37168-78f1-4a23-a40e-88437a99377e', auctionId: '27dcb421-95c6-4024-a624-3c03816c5f99', imp: [ { id: '2899ec066a91ff8', tagid: 'undefined', secure: 1, banner: { format: [{ w: 300, h: 250 }, { w: 300, h: 600 }], h: 250, topframe: 1, w: 300 } } ] },
    sizes: [[300, 250], [300, 600]],
    transactionId: '2e63c0ed-b10c-4008-aed5-84582cecfe87'
  }
];
var validBidRequestsNoSizes = [
  {
    adUnitCode: 'div-gpt-ad-1460505748561-0',
    auctionId: '27dcb421-95c6-4024-a624-3c03816c5f99',
    bidId: '2899ec066a91ff8',
    bidRequestsCount: 1,
    bidder: 'newspassid',
    bidderRequestId: '1c1586b27a1b5c8',
    crumbs: {pubcid: '203a0692-f728-4856-87f6-9a25a6b63715'},
    params: { publisherId: '9876abcd12-3', customData: [{'settings': {}, 'targeting': {'gender': 'bart', 'age': 'low'}}], placementId: '1310000099', siteId: '1234567890', id: 'fea37168-78f1-4a23-a40e-88437a99377e', auctionId: '27dcb421-95c6-4024-a624-3c03816c5f99', imp: [ { id: '2899ec066a91ff8', tagid: 'undefined', secure: 1, banner: { format: [{ w: 300, h: 250 }, { w: 300, h: 600 }], h: 250, topframe: 1, w: 300 } } ] },
    transactionId: '2e63c0ed-b10c-4008-aed5-84582cecfe87'
  }
];
var validBidRequestsWithBannerMediaType = [
  {
    adUnitCode: 'div-gpt-ad-1460505748561-0',
    auctionId: '27dcb421-95c6-4024-a624-3c03816c5f99',
    bidId: '2899ec066a91ff8',
    bidRequestsCount: 1,
    bidder: 'newspassid',
    bidderRequestId: '1c1586b27a1b5c8',
    crumbs: {pubcid: '203a0692-f728-4856-87f6-9a25a6b63715'},
    params: { publisherId: '9876abcd12-3', customData: [{'settings': {}, 'targeting': {'gender': 'bart', 'age': 'low'}}], placementId: '1310000099', siteId: '1234567890', id: 'fea37168-78f1-4a23-a40e-88437a99377e', auctionId: '27dcb421-95c6-4024-a624-3c03816c5f99', imp: [ { id: '2899ec066a91ff8', tagid: 'undefined', secure: 1, banner: { format: [{ w: 300, h: 250 }, { w: 300, h: 600 }], h: 250, topframe: 1, w: 300 } } ] },
    mediaTypes: {banner: {sizes: [[300, 250], [300, 600]]}},
    transactionId: '2e63c0ed-b10c-4008-aed5-84582cecfe87'
  }
];
var validBidRequestsIsThisCamelCaseEnough = [
  {
    'bidder': 'newspassid',
    'testname': 'validBidRequestsIsThisCamelCaseEnough',
    'params': {
      'publisherId': 'newspassRUP0001',
      'placementId': '8000000009',
      'siteId': '4204204201',
      'customData': [
        {
          'settings': {},
          'targeting': {
            'sens': 'f',
            'pt1': '/uk',
            'pt2': 'uk',
            'pt3': 'network-front',
            'pt4': 'ng',
            'pt5': [
              'uk'
            ],
            'pt7': 'desktop',
            'pt8': [
              'tfmqxwj7q',
              'penl4dfdk',
              'sek9ghqwi'
            ],
            'pt9': '|k0xw2vqzp33kklb3j5w4|||'
          }
        }
      ],
      'userId': {
        'pubcid': '2ada6ae6-aeca-4e07-8922-a99b3aaf8a56'
      },
      'userIdAsEids': [
        {
          'source': 'pubcid.org',
          'uids': [
            {
              'id': '2ada6ae6-aeca-4e07-8922-a99b3aaf8a56',
              'atype': 1
            }
          ]
        }
      ]
    },
    mediaTypes: {banner: {sizes: [[300, 250], [300, 600]]}},
    'adUnitCode': 'some-ad',
    'transactionId': '02c1ea7d-0bf2-451b-a122-1420040d1cf8',
    'bidId': '2899ec066a91ff8',
    'bidderRequestId': '1c1586b27a1b5c8',
    'auctionId': '0456c9b7-5ab2-4fec-9e10-f418d3d1f04c',
    'src': 'client',
    'bidRequestsCount': 1,
    'bidderRequestsCount': 1,
    'bidderWinsCount': 0
  }
];
var validBidderRequest = {
  auctionId: '27dcb421-95c6-4024-a624-3c03816c5f99',
  auctionStart: 1536838908986,
  bidderCode: 'newspassid',
  bidderRequestId: '1c1586b27a1b5c8',
  bids: [{
    adUnitCode: 'div-gpt-ad-1460505748561-0',
    auctionId: '27dcb421-95c6-4024-a624-3c03816c5f99',
    bidId: '2899ec066a91ff8',
    bidRequestsCount: 1,
    bidder: 'newspassid',
    bidderRequestId: '1c1586b27a1b5c8',
    crumbs: {pubcid: '203a0692-f728-4856-87f6-9a25a6b63715'},
    params: { publisherId: '9876abcd12-3', customData: [{'settings': {}, 'targeting': {'gender': 'bart', 'age': 'low'}}], placementId: '1310000099', siteId: '1234567890', id: 'fea37168-78f1-4a23-a40e-88437a99377e', auctionId: '27dcb421-95c6-4024-a624-3c03816c5f99', imp: [ { banner: { topframe: 1, w: 300, h: 250, format: [{ w: 300, h: 250 }, { w: 300, h: 600 }] }, id: '2899ec066a91ff8', secure: 1, tagid: 'undefined' } ] },
    sizes: [[300, 250], [300, 600]],
    transactionId: '2e63c0ed-b10c-4008-aed5-84582cecfe87'
  }],
  doneCbCallCount: 1,
  start: 1536838908987,
  timeout: 3000
};
var emptyObject = {};
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
            'adm': '<script src="https://fra1-ib.adnxs.com/ab?e=wqT_3QLXB6DXAwAAAwDWAAUBCNDh6dwFENjt4vTs9Y6bWhjxtI3siuOTmREqNgkAAAECCOA_EQEHNAAA4D8ZAAAAgOtR4D8hERIAKREJADERG6gwsqKiBjjtSEDtSEgCUI3J-y5YnPFbYABotc95eMuOBYABAYoBA1VTRJIBAQbwUpgBrAKgAdgEqAEBsAEAuAECwAEDyAEC0AEA2AEA4AEA8AEAigI7dWYoJ2EnLCAyNTI5ODg1LCAxNTM2ODQ4MDgwKTt1ZigncicsIDk4NDkzNTgxNh4A8JySAv0BIWJ6YWpPQWl1c0s0S0VJM0oteTRZQUNDYzhWc3dBRGdBUUFSSTdVaFFzcUtpQmxnQVlQX19fXzhQYUFCd0FYZ0JnQUVCaUFFQmtBRUJtQUVCb0FFQnFBRURzQUVBdVFFcGk0aURBQURnUDhFQktZdUlnd0FBNERfSkFUMDR0TTFxYXZFXzJRRUFBQUFBQUFEd1AtQUJBUFVCBQ8oSmdDQUtBQ0FMVUMFEARMMAkI8FBNQUNBY2dDQWRBQ0FkZ0NBZUFDQU9nQ0FQZ0NBSUFEQVpBREFKZ0RBYWdEcnJDdUNyb0RDVVpTUVRFNk16WTROT0FER2cuLpoCPSFLQXVvRkE2AAFwblBGYklBUW9BRG9KUmxKQk1Ub3pOamcwUUJwSkENAfBAOEQ4LsICL2h0dHA6Ly9wcmViaWQub3JnL2Rldi1kb2NzL2dldHRpbmctc3RhcnRlZC5odG1s2AIA4AKtmEjqAiINOthkZW1vLnRnpS1vem9uZS1wcm9qZWN0LmNvbS_yAhMKD0NVU1RPTV9NT0RFTF9JRBIA8gIaChZDLhYAIExFQUZfTkFNRQEdCB4KGjIzAPCHTEFTVF9NT0RJRklFRBIAgAMAiAMBkAMAmAMUoAMBqgMAwAOsAsgDANgDAOADAOgDAPgDA4AEAJIECS9vcGVucnRiMpgEAKIECTEyNy4wLjAuMagEALIEDAgAEAAYACAAMAA4ALgEAMAEAMgEANIEDjkzMjUjRlJBMTnpNjg02gQCCAHgBADwBEHvIIgFAZgFAKAF_xEBsAGqBSRkNjE5ODgwNy03YTUzLTQxNDEtYjJkYi1kMmNiNzU0ZDY4YmHABQDJBWlQFPA_0gUJCQkMpAAA2AUB4AUB8AWZ9CH6BQQIABAAkAYAmAYAuAYAwQYAAAAAAAAAAMgGAA..&s=ab84b182eef7d9b4e58c74fe8987705c25ed803c&referrer=http%3A%2F%2Fdemo.the-some-project.com%2F&pp=${AUCTION_PRICE}"></script>',
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
    'cur': 'GBP', /* NOTE - this is where cur is, not in the seatbids. */
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
};
var validResponse2BidsSameAdunit = {
  'body': {
    'id': 'd6198807-7a53-4141-b2db-d2cb754d68ba',
    'seatbid': [
      {
        'bid': [
          {
            'id': '677903815252395017',
            'impid': '2899ec066a91ff8',
            'price': 0.5,
            'adm': '<script src="src-1"></script>',
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
          },
          {
            'id': '677903815252395010',
            'impid': '2899ec066a91ff8',
            'price': 0.9,
            'adm': '<script src="src-2"></script>',
            'adid': '98493580',
            'adomain': [
              'http://prebid.org'
            ],
            'iurl': 'https://fra1-ib.adnxs.com/cr?id=98493581',
            'cid': '9320',
            'crid': '98493580',
            'cat': [
              'IAB3-1'
            ],
            'w': 300,
            'h': 250,
            'ext': {
              'prebid': {
                'type': 'banner'
              },
              'bidder': {
                'appnexus': {
                  'brand_id': 555540,
                  'auction_id': 6500448734132353000,
                  'bidder_id': 2,
                  'bid_ad_type': 0
                }
              }
            }
          } ],
        'seat': 'npappnexus'
      }
    ],
    'cur': 'GBP', /* NOTE - this is where cur is, not in the seatbids. */
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
};
var validBidResponse1adWith2Bidders = {
  'body': {
    'id': '91221f96-b931-4acc-8f05-c2a1186fa5ac',
    'seatbid': [
      {
        'bid': [
          {
            'id': 'd6198807-7a53-4141-b2db-d2cb754d68ba',
            'impid': '2899ec066a91ff8',
            'price': 0.36754,
            'adm': '<script>removed</script>',
            'adid': '134928661',
            'adomain': [
              'somecompany.com'
            ],
            'iurl': 'https:\/\/ams1-ib.adnxs.com\/cr?id=134928661',
            'cid': '8825',
            'crid': '134928661',
            'cat': [
              'IAB8-15',
              'IAB8-16',
              'IAB8-4',
              'IAB8-1',
              'IAB8-14',
              'IAB8-6',
              'IAB8-13',
              'IAB8-3',
              'IAB8-17',
              'IAB8-12',
              'IAB8-8',
              'IAB8-7',
              'IAB8-2',
              'IAB8-9',
              'IAB8',
              'IAB8-11'
            ],
            'w': 300,
            'h': 250,
            'ext': {
              'prebid': {
                'type': 'banner'
              },
              'bidder': {
                'appnexus': {
                  'brand_id': 14640,
                  'auction_id': 1.8369641905139e+18,
                  'bidder_id': 2,
                  'bid_ad_type': 0
                }
              }
            }
          }
        ],
        'seat': 'appnexus'
      },
      {
        'bid': [
          {
            'id': '75665207-a1ca-49db-ba0e-a5e9c7d26f32',
            'impid': '37fff511779365a',
            'price': 1.046,
            'adm': '<div>removed</div>',
            'adomain': [
              'kx.com'
            ],
            'crid': '13005',
            'w': 300,
            'h': 250,
            'ext': {
              'prebid': {
                'type': 'banner'
              }
            }
          }
        ],
        'seat': 'openx'
      }
    ],
    'ext': {
      'responsetimemillis': {
        'appnexus': 91,
        'openx': 109,
        'npappnexus': 46,
        'npbeeswax': 2,
        'pangaea': 91
      }
    }
  },
  'headers': {}
};
var multiRequest1 = [
  {
    'bidder': 'newspassid',
    'params': {
      'publisherId': 'newspassRUP0001',
      'siteId': '4204204201',
      'placementId': '0420420421',
      'customData': [
        {
          'settings': {},
          'targeting': {
            'sens': 'f',
            'pt1': '/uk',
            'pt2': 'uk',
            'pt3': 'network-front',
            'pt4': 'ng',
            'pt5': [
              'uk'
            ],
            'pt7': 'desktop',
            'pt8': [
              'tfmqxwj7q',
              'penl4dfdk',
              'uayf5jmv3',
              't8nyiude5',
              'sek9ghqwi'
            ],
            'pt9': '|k0xw2vqzp33kklb3j5w4|||'
          }
        }
      ]
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
    'adUnitCode': 'mpu',
    'transactionId': '6480bac7-31b5-4723-9145-ad8966660651',
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
    'bidId': '2d30e86db743a8',
    'bidderRequestId': '1d03a1dfc563fc',
    'auctionId': '592ee33b-fb2e-4c00-b2d5-383e99cac57f',
    'src': 'client',
    'bidRequestsCount': 1,
    'bidderRequestsCount': 1,
    'bidderWinsCount': 0
  },
  {
    'bidder': 'newspassid',
    'params': {
      'publisherId': 'newspassRUP0001',
      'siteId': '4204204201',
      'placementId': '0420420421',
      'customData': [
        {
          'settings': {},
          'targeting': {
            'sens': 'f',
            'pt1': '/uk',
            'pt2': 'uk',
            'pt3': 'network-front',
            'pt4': 'ng',
            'pt5': [
              'uk'
            ],
            'pt7': 'desktop',
            'pt8': [
              'tfmqxwj7q',
              'penl4dfdk',
              't8nxz6qzd',
              't8nyiude5',
              'sek9ghqwi'
            ],
            'pt9': '|k0xw2vqzp33kklb3j5w4|||'
          }
        }
      ]
    },
    'mediaTypes': {
      'banner': {
        'sizes': [
          [
            728,
            90
          ],
          [
            970,
            250
          ]
        ]
      }
    },
    'adUnitCode': 'leaderboard',
    'transactionId': 'a49988e6-ae7c-46c4-9598-f18db49892a0',
    'sizes': [
      [
        728,
        90
      ],
      [
        970,
        250
      ]
    ],
    'bidId': '3025f169863b7f8',
    'bidderRequestId': '1d03a1dfc563fc',
    'auctionId': '592ee33b-fb2e-4c00-b2d5-383e99cac57f',
    'src': 'client',
    'bidRequestsCount': 1,
    'bidderRequestsCount': 1,
    'bidderWinsCount': 0
  }
];
var multiBidderRequest1 = {
  bidderRequest: {
    'bidderCode': 'newspassid',
    'auctionId': '592ee33b-fb2e-4c00-b2d5-383e99cac57f',
    'bidderRequestId': '1d03a1dfc563fc',
    'bids': [
      {
        'bidder': 'newspassid',
        'params': {
          'publisherId': 'newspassRUP0001',
          'siteId': '4204204201',
          'placementId': '0420420421',
          'customData': [
            {
              'settings': {},
              'targeting': {
                'sens': 'f',
                'pt1': '/uk',
                'pt2': 'uk',
                'pt3': 'network-front',
                'pt4': 'ng',
                'pt5': [
                  'uk'
                ],
                'pt7': 'desktop',
                'pt8': [
                  'tfmqxwj7q',
                  'txeh7uyo0',
                  't8nxz6qzd',
                  't8nyiude5',
                  'sek9ghqwi'
                ],
                'pt9': '|k0xw2vqzp33kklb3j5w4|||'
              }
            }
          ]
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
        'adUnitCode': 'mpu',
        'transactionId': '6480bac7-31b5-4723-9145-ad8966660651',
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
        'bidId': '2d30e86db743a8',
        'bidderRequestId': '1d03a1dfc563fc',
        'auctionId': '592ee33b-fb2e-4c00-b2d5-383e99cac57f',
        'src': 'client',
        'bidRequestsCount': 1,
        'bidderRequestsCount': 1,
        'bidderWinsCount': 0
      },
      {
        'bidder': 'newspassid',
        'params': {
          'publisherId': 'newspassRUP0001',
          'siteId': '4204204201',
          'placementId': '0420420421',
          'customData': [
            {
              'settings': {},
              'targeting': {
                'sens': 'f',
                'pt1': '/uk',
                'pt2': 'uk',
                'pt3': 'network-front',
                'pt4': 'ng',
                'pt5': [
                  'uk'
                ],
                'pt7': 'desktop',
                'pt8': [
                  'tfmqxwj7q',
                  'penl4dfdk',
                  't8nxz6qzd',
                  't8nyiude5',
                  'sek9ghqwi'
                ],
                'pt9': '|k0xw2vqzp33kklb3j5w4|||'
              }
            }
          ]
        },
        'mediaTypes': {
          'banner': {
            'sizes': [
              [
                728,
                90
              ],
              [
                970,
                250
              ]
            ]
          }
        },
        'adUnitCode': 'leaderboard',
        'transactionId': 'a49988e6-ae7c-46c4-9598-f18db49892a0',
        'sizes': [
          [
            728,
            90
          ],
          [
            970,
            250
          ]
        ],
        'bidId': '3025f169863b7f8',
        'bidderRequestId': '1d03a1dfc563fc',
        'auctionId': '592ee33b-fb2e-4c00-b2d5-383e99cac57f',
        'src': 'client',
        'bidRequestsCount': 1,
        'bidderRequestsCount': 1,
        'bidderWinsCount': 0
      }
    ],
    'auctionStart': 1592918645574,
    'timeout': 3000,
    'refererInfo': {
      'referer': 'http://some.referrer.com',
      'reachedTop': true,
      'numIframes': 0,
      'stack': [
        'http://some.referrer.com'
      ]
    },
    'start': 1592918645578
  }
};
var multiResponse1 = {
  'body': {
    'id': '592ee33b-fb2e-4c00-b2d5-383e99cac57f',
    'seatbid': [
      {
        'bid': [
          {
            'id': '4419718600113204943',
            'impid': '2d30e86db743a8',
            'price': 0.2484,
            'adm': '<scr .. .iv>',
            'adid': '119683582',
            'adomain': [
              'https://someurl.com'
            ],
            'iurl': 'https://ams1-ib.adnxs.com/cr?id=119683582',
            'cid': '9979',
            'crid': '119683582',
            'cat': [
              'IAB3'
            ],
            'w': 300,
            'h': 250,
            'ext': {
              'prebid': {
                'type': 'banner'
              },
              'bidder': {
                'newspassid': {},
                'appnexus': {
                  'brand_id': 734921,
                  'auction_id': 2995348111857539600,
                  'bidder_id': 2,
                  'bid_ad_type': 0
                }
              }
            },
            'cpm': 0.2484,
            'bidId': '2d30e86db743a8',
            'requestId': '2d30e86db743a8',
            'width': 300,
            'height': 250,
            'ad': '<scr...iv>',
            'netRevenue': true,
            'creativeId': '119683582',
            'currency': 'USD',
            'ttl': 300,
            'originalCpm': 0.2484,
            'originalCurrency': 'USD'
          },
          {
            'id': '18552976939844681',
            'impid': '3025f169863b7f8',
            'price': 0.0621,
            'adm': '<sc..this ad will lose to the next one.div>',
            'adid': '120179216',
            'adomain': [
              'appnexus.com'
            ],
            'iurl': 'https://ams1-ib.adnxs.com/cr?id=120179216',
            'cid': '9979',
            'crid': '120179216',
            'w': 970,
            'h': 250,
            'ext': {
              'prebid': {
                'type': 'banner'
              },
              'bidder': {
                'newspassid': {},
                'appnexus': {
                  'brand_id': 1,
                  'auction_id': 3449036134472542700,
                  'bidder_id': 2,
                  'bid_ad_type': 0
                }
              }
            },
            'cpm': 0.0621,
            'bidId': '3025f169863b7f8',
            'requestId': '3025f169863b7f8',
            'width': 970,
            'height': 250,
            'ad': '<scr...iv>',
            'netRevenue': true,
            'creativeId': '120179216',
            'currency': 'USD',
            'ttl': 300,
            'originalCpm': 0.0621,
            'originalCurrency': 'USD'
          },
          {
            'id': '18552976939844999',
            'impid': '3025f169863b7f8',
            'price': 0.521,
            'adm': '<sc. second bid for bidId 3025f169863b7f8 ..div>',
            'adid': '120179216',
            'adomain': [
              'appnexus.com'
            ],
            'iurl': 'https://ams1-ib.adnxs.com/cr?id=120179216',
            'cid': '9999',
            'crid': '120179299',
            'w': 728,
            'h': 90,
            'ext': {
              'prebid': {
                'type': 'banner'
              },
              'bidder': {
                'newspassid': {},
                'appnexus': {
                  'brand_id': 1,
                  'auction_id': 3449036134472542700,
                  'bidder_id': 2,
                  'bid_ad_type': 0
                }
              }
            },
            'cpm': 0.521,
            'bidId': '3025f169863b7f8',
            'requestId': '3025f169863b7f8',
            'width': 728,
            'height': 90,
            'ad': '<scr...iv>',
            'netRevenue': true,
            'creativeId': '120179299',
            'currency': 'USD',
            'ttl': 300,
            'originalCpm': 0.0621,
            'originalCurrency': 'USD'
          }
        ],
        'seat': 'npappnexus'
      },
      {
        'bid': [
          {
            'id': '1c605e8a-4992-4ec6-8a5c-f82e2938c2db',
            'impid': '2d30e86db743a8',
            'price': 0.01,
            'adm': '<div  ... div>',
            'crid': '540463358',
            'w': 300,
            'h': 250,
            'ext': {
              'prebid': {
                'type': 'banner'
              },
              'bidder': {
                'newspassid': {}
              }
            },
            'cpm': 0.01,
            'bidId': '2d30e86db743a8',
            'requestId': '2d30e86db743a8',
            'width': 300,
            'height': 250,
            'ad': '<div ...div>',
            'netRevenue': true,
            'creativeId': '540463358',
            'currency': 'USD',
            'ttl': 300,
            'originalCpm': 0.01,
            'originalCurrency': 'USD'
          },
          {
            'id': '3edeb4f7-d91d-44e2-8aeb-4a2f6d295ce5',
            'impid': '3025f169863b7f8',
            'price': 0.01,
            'adm': '<div ... div>',
            'crid': '540221061',
            'w': 970,
            'h': 250,
            'ext': {
              'prebid': {
                'type': 'banner'
              },
              'bidder': {
                'newspassid': {}
              }
            },
            'cpm': 0.01,
            'bidId': '3025f169863b7f8',
            'requestId': '3025f169863b7f8',
            'width': 970,
            'height': 250,
            'ad': '<div ... div>',
            'netRevenue': true,
            'creativeId': '540221061',
            'currency': 'USD',
            'ttl': 300,
            'originalCpm': 0.01,
            'originalCurrency': 'USD'
          }
        ],
        'seat': 'openx'
      }
    ],
    'ext': {
      'debug': {},
      'responsetimemillis': {
        'beeswax': 6,
        'openx': 91,
        'npappnexus': 40,
        'npbeeswax': 6
      }
    }
  },
  'headers': {}
};
describe('newspassid Adapter', function () {
  describe('isBidRequestValid', function () {
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
        siteId: '1234567890',
        customData: [{'settings': {}, 'targeting': {'gender': 'bart', 'age': 'low'}}]
      },
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
    var xMissingSiteId = {
      bidder: BIDDER_CODE,
      params: {
        publisherId: '9876abcd12-3',
        placementId: '1234567890',
      }
    };
    it('should not validate missing sitetId', function () {
      expect(spec.isBidRequestValid(xMissingSiteId)).to.equal(false);
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
    it('should not validate siteId too long', function () {
      expect(spec.isBidRequestValid(xBadSite)).to.equal(false);
    });
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
    it('should not validate customData not being an array', function () {
      expect(spec.isBidRequestValid(xBadCustomData)).to.equal(false);
    });
    var xBadCustomDataOldCustomdataValue = {
      bidder: BIDDER_CODE,
      params: {
        'placementId': '1234567890',
        'publisherId': '9876abcd12-3',
        'siteId': '1234567890',
        'customData': {'gender': 'bart', 'age': 'low'}
      }
    };
    it('should not validate customData being an object, not an array', function () {
      expect(spec.isBidRequestValid(xBadCustomDataOldCustomdataValue)).to.equal(false);
    });
    var xBadCustomDataZerocd = {
      bidder: BIDDER_CODE,
      params: {
        'placementId': '1111111110',
        'publisherId': '9876abcd12-3',
        'siteId': '1234567890',
        'customData': []
      }
    };
    it('should not validate customData array having no elements', function () {
      expect(spec.isBidRequestValid(xBadCustomDataZerocd)).to.equal(false);
    });
    var xBadCustomDataNotargeting = {
      bidder: BIDDER_CODE,
      params: {
        'placementId': '1234567890',
        'publisherId': '9876abcd12-3',
        'customData': [{'settings': {}, 'xx': {'gender': 'bart', 'age': 'low'}}],
        siteId: '1234567890'
      }
    };
    it('should not validate customData[] having no "targeting"', function () {
      expect(spec.isBidRequestValid(xBadCustomDataNotargeting)).to.equal(false);
    });
    var xBadCustomDataTgtNotObj = {
      bidder: BIDDER_CODE,
      params: {
        'placementId': '1234567890',
        'publisherId': '9876abcd12-3',
        'customData': [{'settings': {}, 'targeting': 'this should be an object'}],
        siteId: '1234567890'
      }
    };
    it('should not validate customData[0].targeting not being an object', function () {
      expect(spec.isBidRequestValid(xBadCustomDataTgtNotObj)).to.equal(false);
    });
    var xBadCustomParams = {
      bidder: BIDDER_CODE,
      params: {
        'placementId': '1234567890',
        'publisherId': '9876abcd12-3',
        'siteId': '1234567890',
        'customParams': 'this key is no longer valid'
      }
    };
    it('should not validate customParams - this is a renamed key', function () {
      expect(spec.isBidRequestValid(xBadCustomParams)).to.equal(false);
    });
  });
  describe('buildRequests', function () {
    it('sends bid request to NEWSPASSURI via POST', function () {
      const request = spec.buildRequests(validBidRequests, validBidderRequest);
      expect(request.url).to.equal(NEWSPASSURI);
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
    it('adds all parameters inside the ext object only', function () {
      const request = spec.buildRequests(validBidRequests, validBidderRequest);
      expect(request.data).to.be.a('string');
      var data = JSON.parse(request.data);
      expect(data.imp[0].ext.newspassid.customData).to.be.an('array');
      expect(request).not.to.have.key('lotameData');
      expect(request).not.to.have.key('customData');
    });
    it('adds all parameters inside the ext object only - lightning', function () {
      let localBidReq = JSON.parse(JSON.stringify(validBidRequests));
      const request = spec.buildRequests(localBidReq, validBidderRequest);
      expect(request.data).to.be.a('string');
      var data = JSON.parse(request.data);
      expect(data.imp[0].ext.newspassid.customData).to.be.an('array');
      expect(request).not.to.have.key('lotameData');
      expect(request).not.to.have.key('customData');
    });
    it('has correct bidder', function () {
      const request = spec.buildRequests(validBidRequests, validBidderRequest);
      expect(request.bidderRequest.bids[0].bidder).to.equal(BIDDER_CODE);
    });
    it('handles mediaTypes element correctly', function () {
      const request = spec.buildRequests(validBidRequestsWithBannerMediaType, validBidderRequest);
      expect(request).to.have.all.keys(['bidderRequest', 'data', 'method', 'url']);
    });
    it('handles no newspassid or custom data', function () {
      const request = spec.buildRequests(validBidRequestsMinimal, validBidderRequest);
      expect(request).to.have.all.keys(['bidderRequest', 'data', 'method', 'url']);
    });
    it('should not crash when there is no sizes element at all', function () {
      const request = spec.buildRequests(validBidRequestsNoSizes, validBidderRequest);
      expect(request).to.have.all.keys(['bidderRequest', 'data', 'method', 'url']);
    });
    it('should be able to handle non-single requests', function () {
      config.setConfig({'newspassid': {'singleRequest': false}});
      const request = spec.buildRequests(validBidRequestsNoSizes, validBidderRequest);
      expect(request).to.be.a('array');
      expect(request[0]).to.have.all.keys(['bidderRequest', 'data', 'method', 'url']);
      config.setConfig({'newspassid': {'singleRequest': true}});
    });
    it('should not have imp[N].ext.newspassid.userId', function () {
      let bidderRequest = validBidderRequest;
      let bidRequests = validBidRequests;
      bidRequests[0]['userId'] = {
        'digitrustid': {data: {id: 'DTID', keyv: 4, privacy: {optout: false}, producer: 'ABC', version: 2}},
        'id5id': { uid: '1111', ext: { linkType: 2, abTestingControlGroup: false } },
        'idl_env': '3333',
        'parrableid': 'eidVersion.encryptionKeyReference.encryptedValue',
        'pubcid': '5555',
        'tdid': '6666',
        'sharedid': {'id': '01EAJWWNEPN3CYMM5N8M5VXY22', 'third': '01EAJWWNEPN3CYMM5N8M5VXY22'}
      };
      bidRequests[0]['userIdAsEids'] = validBidRequestsWithUserIdData[0]['userIdAsEids'];
      const request = spec.buildRequests(bidRequests, bidderRequest);
      const payload = JSON.parse(request.data);
      let firstBid = payload.imp[0].ext.newspassid;
      expect(firstBid).to.not.have.property('userId');
      delete validBidRequests[0].userId; // tidy up now, else it will screw with other tests
    });
    it('should pick up the value of pubcid when built using the pubCommonId module (not userId)', function () {
      let bidRequests = validBidRequests;
      bidRequests[0]['userId'] = {
        'digitrustid': {data: {id: 'DTID', keyv: 4, privacy: {optout: false}, producer: 'ABC', version: 2}},
        'id5id': { uid: '1111', ext: { linkType: 2, abTestingControlGroup: false } },
        'idl_env': '3333',
        'parrableid': 'eidVersion.encryptionKeyReference.encryptedValue',
        'tdid': '6666',
        'sharedid': {'id': '01EAJWWNEPN3CYMM5N8M5VXY22', 'third': '01EAJWWNEPN3CYMM5N8M5VXY22'}
      };
      bidRequests[0]['userIdAsEids'] = validBidRequestsWithUserIdData[0]['userIdAsEids'];
      const request = spec.buildRequests(bidRequests, validBidderRequest);
      const payload = JSON.parse(request.data);
      expect(payload.ext.newspassid.pubcid).to.equal(bidRequests[0]['crumbs']['pubcid']);
      delete validBidRequests[0].userId; // tidy up now, else it will screw with other tests
    });
    it('should add a user.ext.eids object to contain user ID data in the new location (Nov 2019) Updated Aug 2020', function() {
      const request = spec.buildRequests(validBidRequestsWithUserIdData, validBidderRequest);
      const payload = JSON.parse(request.data);
      expect(payload.user).to.exist;
      expect(payload.user.ext).to.exist;
      expect(payload.user.ext.eids).to.exist;
      expect(payload.user.ext.eids[0]['source']).to.equal('pubcid.org');
      expect(payload.user.ext.eids[0]['uids'][0]['id']).to.equal('12345678');
      expect(payload.user.ext.eids[1]['source']).to.equal('adserver.org');
      expect(payload.user.ext.eids[1]['uids'][0]['id']).to.equal('1111tdid');
      expect(payload.user.ext.eids[2]['source']).to.equal('id5-sync.com');
      expect(payload.user.ext.eids[2]['uids'][0]['id']).to.equal('ID5-someId');
      expect(payload.user.ext.eids[3]['source']).to.equal('criteoId');
      expect(payload.user.ext.eids[3]['uids'][0]['id']).to.equal('1111criteoId');
      expect(payload.user.ext.eids[4]['source']).to.equal('idl_env');
      expect(payload.user.ext.eids[4]['uids'][0]['id']).to.equal('liverampId');
      expect(payload.user.ext.eids[5]['source']).to.equal('lipb');
      expect(payload.user.ext.eids[5]['uids'][0]['id']['lipbid']).to.equal('lipbidId123');
      expect(payload.user.ext.eids[6]['source']).to.equal('parrableId');
      expect(payload.user.ext.eids[6]['uids'][0]['id']['eid']).to.equal('01.5678.parrableid');
    });
    it('replaces the auction url for a config override', function () {
      spec.propertyBag.config = null;
      let fakeOrigin = 'http://sometestendpoint';
      config.setConfig({'newspassid': {'endpointOverride': {'origin': fakeOrigin}}});
      const request = spec.buildRequests(validBidRequests, validBidderRequest);
      expect(request.url).to.equal(fakeOrigin + '/openrtb2/auction');
      expect(request.method).to.equal('POST');
      const data = JSON.parse(request.data);
      expect(data.ext.newspassid.origin).to.equal(fakeOrigin);
      config.setConfig({'newspassid': {'kvpPrefix': null, 'endpointOverride': null}});
    });
    it('replaces the FULL auction url for a config override', function () {
      spec.propertyBag.config = null;
      let fakeurl = 'http://sometestendpoint/myfullurl';
      config.setConfig({'newspassid': {'endpointOverride': {'auctionUrl': fakeurl}}});
      const request = spec.buildRequests(validBidRequests, validBidderRequest);
      expect(request.url).to.equal(fakeurl);
      expect(request.method).to.equal('POST');
      const data = JSON.parse(request.data);
      expect(data.ext.newspassid.origin).to.equal(fakeurl);
      config.setConfig({'newspassid': {'kvpPrefix': null, 'endpointOverride': null}});
    });
    it('should ignore kvpPrefix', function () {
      spec.propertyBag.config = null;
      config.setConfig({'newspassid': {'kvpPrefix': 'np'}});
      const request = spec.buildRequests(validBidRequests, validBidderRequest);
      const result = spec.interpretResponse(validResponse, request);
      expect(result[0].adserverTargeting).to.have.own.property('np_appnexus_crid');
      expect(utils.deepAccess(result[0].adserverTargeting, 'np_appnexus_crid')).to.equal('98493581');
      expect(utils.deepAccess(result[0].adserverTargeting, 'np_adId')).to.equal('2899ec066a91ff8-0-np-0');
      expect(utils.deepAccess(result[0].adserverTargeting, 'np_size')).to.equal('300x600');
      expect(utils.deepAccess(result[0].adserverTargeting, 'np_pb_r')).to.equal('0.50');
      expect(utils.deepAccess(result[0].adserverTargeting, 'np_bid')).to.equal('true');
      config.resetConfig();
    });
    it('should create a meta object on each bid returned', function () {
      spec.propertyBag.config = null;
      const request = spec.buildRequests(validBidRequests, validBidderRequest);
      const result = spec.interpretResponse(validResponse, request);
      expect(result[0]).to.have.own.property('meta');
      expect(result[0].meta.advertiserDomains[0]).to.equal('http://prebid.org');
      config.resetConfig();
    });
    it('should use nptestmode GET value if set', function() {
      var specMock = utils.deepClone(spec);
      specMock.getGetParametersAsObject = function() {
        return {'nptestmode': 'mytestvalue_123'};
      };
      const request = specMock.buildRequests(validBidRequests, validBidderRequest);
      const data = JSON.parse(request.data);
      expect(data.imp[0].ext.newspassid.customData).to.be.an('array');
      expect(data.imp[0].ext.newspassid.customData[0].targeting.nptestmode).to.equal('mytestvalue_123');
    });
    it('should pass through GET params if present: npf, nppf, nprp, npip', function() {
      var specMock = utils.deepClone(spec);
      specMock.getGetParametersAsObject = function() {
        return {npf: '1', nppf: '0', nprp: '2', npip: '123'};
      };
      const request = specMock.buildRequests(validBidRequests, validBidderRequest);
      const data = JSON.parse(request.data);
      expect(data.ext.newspassid.npf).to.equal(1);
      expect(data.ext.newspassid.nppf).to.equal(0);
      expect(data.ext.newspassid.nprp).to.equal(2);
      expect(data.ext.newspassid.npip).to.equal(123);
    });
    it('should pass through GET params if present: npf, nppf, nprp, npip with alternative values', function() {
      var specMock = utils.deepClone(spec);
      specMock.getGetParametersAsObject = function() {
        return {npf: 'false', nppf: 'true', nprp: 'xyz', npip: 'hello'};
      };
      const request = specMock.buildRequests(validBidRequests, validBidderRequest);
      const data = JSON.parse(request.data);
      expect(data.ext.newspassid.npf).to.equal(0);
      expect(data.ext.newspassid.nppf).to.equal(1);
      expect(data.ext.newspassid).to.not.haveOwnProperty('nprp');
      expect(data.ext.newspassid).to.not.haveOwnProperty('npip');
    });
    it('should use nptestmode GET value if set, even if there is no customdata in config', function() {
      var specMock = utils.deepClone(spec);
      specMock.getGetParametersAsObject = function() {
        return {'nptestmode': 'mytestvalue_123'};
      };
      const request = specMock.buildRequests(validBidRequestsMinimal, validBidderRequest);
      const data = JSON.parse(request.data);
      expect(data.imp[0].ext.newspassid.customData).to.be.an('array');
      expect(data.imp[0].ext.newspassid.customData[0].targeting.nptestmode).to.equal('mytestvalue_123');
    });
    it('should use GET values auction=[encoded URL] & cookiesync=[encoded url] if set', function() {
      spec.propertyBag.config = null;
      var specMock = utils.deepClone(spec);
      specMock.getGetParametersAsObject = function() {
        return {};
      };
      let request = specMock.buildRequests(validBidRequestsMinimal, validBidderRequest);
      let url = request.url;
      expect(url).to.equal('https://bidder.newspassid.com/openrtb2/auction');
      let cookieUrl = specMock.getCookieSyncUrl();
      expect(cookieUrl).to.equal('https://bidder.newspassid.com/static/load-cookie.html');
      specMock = utils.deepClone(spec);
      specMock.getGetParametersAsObject = function() {
        return {'auction': 'https://www.someurl.com/auction', 'cookiesync': 'https://www.someurl.com/sync'};
      };
      request = specMock.buildRequests(validBidRequestsMinimal, validBidderRequest);
      url = request.url;
      expect(url).to.equal('https://www.someurl.com/auction');
      cookieUrl = specMock.getCookieSyncUrl();
      expect(cookieUrl).to.equal('https://www.someurl.com/sync');
    });
    it('should use a valid npstoredrequest GET value if set to override the placementId values, and set np_rw if we find it', function() {
      var specMock = utils.deepClone(spec);
      specMock.getGetParametersAsObject = function() {
        return {'npstoredrequest': '1122334455'}; // 10 digits are valid
      };
      const request = specMock.buildRequests(validBidRequestsMinimal, validBidderRequest);
      const data = JSON.parse(request.data);
      expect(data.ext.newspassid.np_rw).to.equal(1);
      expect(data.imp[0].ext.prebid.storedrequest.id).to.equal('1122334455');
    });
    it('should NOT use an invalid npstoredrequest GET value if set to override the placementId values, and set np_rw to 0', function() {
      var specMock = utils.deepClone(spec);
      specMock.getGetParametersAsObject = function() {
        return {'npstoredrequest': 'BADVAL'}; // 10 digits are valid
      };
      const request = specMock.buildRequests(validBidRequestsMinimal, validBidderRequest);
      const data = JSON.parse(request.data);
      expect(data.ext.newspassid.np_rw).to.equal(0);
      expect(data.imp[0].ext.prebid.storedrequest.id).to.equal('1310000099');
    });
    it('should pick up the config value of coppa & set it in the request', function () {
      config.setConfig({'coppa': true});
      const request = spec.buildRequests(validBidRequestsNoSizes, validBidderRequest);
      const payload = JSON.parse(request.data);
      expect(payload.regs).to.include.keys('coppa');
      expect(payload.regs.coppa).to.equal(1);
      config.resetConfig();
    });
    it('should pick up the config value of coppa & only set it in the request if its true', function () {
      config.setConfig({'coppa': false});
      const request = spec.buildRequests(validBidRequestsNoSizes, validBidderRequest);
      const payload = JSON.parse(request.data);
      expect(utils.deepAccess(payload, 'regs.coppa')).to.be.undefined;
      config.resetConfig();
    });
    it('should should contain a unique page view id in the auction request which persists across calls', function () {
      let request = spec.buildRequests(validBidRequests, validBidderRequest);
      let payload = JSON.parse(request.data);
      expect(utils.deepAccess(payload, 'ext.newspassid.pv')).to.be.a('string');
      request = spec.buildRequests(validBidRequestsIsThisCamelCaseEnough, validBidderRequest);
      let payload2 = JSON.parse(request.data);
      expect(utils.deepAccess(payload2, 'ext.newspassid.pv')).to.be.a('string');
      expect(utils.deepAccess(payload2, 'ext.newspassid.pv')).to.equal(utils.deepAccess(payload, 'ext.newspassid.pv'));
    });
    it('should indicate that the whitelist was used when it contains valid data', function () {
      config.setConfig({'newspassid': {'np_whitelist_adserver_keys': ['np_appnexus_pb', 'np_appnexus_imp_id']}});
      const request = spec.buildRequests(validBidRequests, validBidderRequest);
      const payload = JSON.parse(request.data);
      expect(payload.ext.newspassid.np_kvp_rw).to.equal(1);
      config.resetConfig();
    });
    it('should indicate that the whitelist was not used when it contains no data', function () {
      config.setConfig({'newspassid': {'np_whitelist_adserver_keys': []}});
      const request = spec.buildRequests(validBidRequests, validBidderRequest);
      const payload = JSON.parse(request.data);
      expect(payload.ext.newspassid.np_kvp_rw).to.equal(0);
      config.resetConfig();
    });
    it('should indicate that the whitelist was not used when it is not set in the config', function () {
      const request = spec.buildRequests(validBidRequests, validBidderRequest);
      const payload = JSON.parse(request.data);
      expect(payload.ext.newspassid.np_kvp_rw).to.equal(0);
    });
    it('should handle ortb2 site data', function () {
      let bidderRequest = JSON.parse(JSON.stringify(validBidderRequest));
      bidderRequest.ortb2 = {
        'site': {
          'name': 'example_ortb2_name',
          'domain': 'page.example.com',
          'cat': ['IAB2'],
          'sectioncat': ['IAB2-2'],
          'pagecat': ['IAB2-2'],
          'page': 'https://page.example.com/here.html',
          'ref': 'https://ref.example.com',
          'keywords': 'power tools, drills',
          'search': 'drill'
        }
      };
      const request = spec.buildRequests(validBidRequests, bidderRequest);
      const payload = JSON.parse(request.data);
      expect(payload.imp[0].ext.newspassid.customData[0].targeting.name).to.equal('example_ortb2_name');
      expect(payload.user.ext).to.not.have.property('gender');
    });
    it('should add ortb2 site data when there is no customData already created', function () {
      let bidderRequest = JSON.parse(JSON.stringify(validBidderRequest));
      bidderRequest.ortb2 = {
        'site': {
          'name': 'example_ortb2_name',
          'domain': 'page.example.com',
          'cat': ['IAB2'],
          'sectioncat': ['IAB2-2'],
          'pagecat': ['IAB2-2'],
          'page': 'https://page.example.com/here.html',
          'ref': 'https://ref.example.com',
          'keywords': 'power tools, drills',
          'search': 'drill'
        }
      };
      const request = spec.buildRequests(validBidRequestsNoCustomData, bidderRequest);
      const payload = JSON.parse(request.data);
      expect(payload.imp[0].ext.newspassid.customData[0].targeting.name).to.equal('example_ortb2_name');
      expect(payload.imp[0].ext.newspassid.customData[0].targeting).to.not.have.property('gender')
    });
    it('should add ortb2 user data to the user object', function () {
      let bidderRequest = JSON.parse(JSON.stringify(validBidderRequest));
      bidderRequest.ortb2 = {
        'user': {
          'gender': 'I identify as a box of rocks'
        }
      };
      const request = spec.buildRequests(validBidRequests, bidderRequest);
      const payload = JSON.parse(request.data);
      expect(payload.user.gender).to.equal('I identify as a box of rocks');
    });
    it('handles schain object in each bidrequest (will be the same in each br)', function () {
      let br = JSON.parse(JSON.stringify(validBidRequests));
      let schainConfigObject = {
        'ver': '1.0',
        'complete': 1,
        'nodes': [
          {
            'asi': 'bidderA.com',
            'sid': '00001',
            'hp': 1
          }
        ]
      };
      br[0]['schain'] = schainConfigObject;
      const request = spec.buildRequests(br, validBidderRequest);
      const data = JSON.parse(request.data);
      expect(data.source.ext).to.haveOwnProperty('schain');
      expect(data.source.ext.schain).to.deep.equal(schainConfigObject); // .deep.equal() : Target object deeply (but not strictly) equals `{a: 1}`
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
    it('should build bid array with usp/CCPA', function () {
      let validBR = JSON.parse(JSON.stringify(validBidderRequest));
      validBR.uspConsent = '1YNY';
      const request = spec.buildRequests(validBidRequests, validBR);
      const payload = JSON.parse(request.data);
      expect(payload.user.ext.uspConsent).not.to.exist;
      expect(payload.regs.ext.us_privacy).to.equal('1YNY');
    });
    it('should fail ok if no seatbid in server response', function () {
      const result = spec.interpretResponse({}, {});
      expect(result).to.be.an('array');
      expect(result).to.be.empty;
    });
    it('should fail ok if seatbid is not an array', function () {
      const result = spec.interpretResponse({'body': {'seatbid': 'nothing_here'}}, {});
      expect(result).to.be.an('array');
      expect(result).to.be.empty;
    });
    it('should correctly parse response where there are more bidders than ad slots', function () {
      const request = spec.buildRequests(validBidRequests, validBidderRequest);
      const result = spec.interpretResponse(validBidResponse1adWith2Bidders, request);
      expect(result.length).to.equal(2);
    });
    it('should have a ttl of 600', function () {
      const request = spec.buildRequests(validBidRequests, validBidderRequest);
      const result = spec.interpretResponse(validResponse, request);
      expect(result[0].ttl).to.equal(300);
    });
    it('should handle a valid whitelist, removing items not on the list & leaving others', function () {
      config.setConfig({'newspassid': {'np_whitelist_adserver_keys': ['np_appnexus_crid', 'np_appnexus_adId']}});
      const request = spec.buildRequests(validBidRequests, validBidderRequest);
      const result = spec.interpretResponse(validResponse, request);
      expect(utils.deepAccess(result[0].adserverTargeting, 'np_appnexus_adv')).to.be.undefined;
      expect(utils.deepAccess(result[0].adserverTargeting, 'np_appnexus_adId')).to.equal('2899ec066a91ff8-0-np-0');
      config.resetConfig();
    });
    it('should ignore a whitelist if enhancedAdserverTargeting is false', function () {
      config.setConfig({'newspassid': {'np_whitelist_adserver_keys': ['np_appnexus_crid', 'np_appnexus_imp_id'], 'enhancedAdserverTargeting': false}});
      const request = spec.buildRequests(validBidRequests, validBidderRequest);
      const result = spec.interpretResponse(validResponse, request);
      expect(utils.deepAccess(result[0].adserverTargeting, 'np_appnexus_adv')).to.be.undefined;
      expect(utils.deepAccess(result[0].adserverTargeting, 'np_appnexus_imp_id')).to.be.undefined;
      config.resetConfig();
    });
    it('should correctly handle enhancedAdserverTargeting being false', function () {
      config.setConfig({'newspassid': {'enhancedAdserverTargeting': false}});
      const request = spec.buildRequests(validBidRequests, validBidderRequest);
      const result = spec.interpretResponse(validResponse, request);
      expect(utils.deepAccess(result[0].adserverTargeting, 'np_appnexus_adv')).to.be.undefined;
      expect(utils.deepAccess(result[0].adserverTargeting, 'np_appnexus_imp_id')).to.be.undefined;
      config.resetConfig();
    });
    it('should add unique adId values to each bid', function() {
      const request = spec.buildRequests(validBidRequests, validBidderRequest);
      let validres = JSON.parse(JSON.stringify(validResponse2BidsSameAdunit));
      const result = spec.interpretResponse(validres, request);
      expect(result.length).to.equal(1);
      expect(result[0]['price']).to.equal(0.9);
      expect(result[0]['adserverTargeting']['np_npappnexus_adId']).to.equal('2899ec066a91ff8-0-np-1');
    });
    it('should correctly process an auction with 2 adunits & multiple bidders one of which bids for both adslots', function() {
      let validres = JSON.parse(JSON.stringify(multiResponse1));
      let request = spec.buildRequests(multiRequest1, multiBidderRequest1.bidderRequest);
      let result = spec.interpretResponse(validres, request);
      expect(result.length).to.equal(4); // one of the 5 bids will have been removed
      expect(result[1]['price']).to.equal(0.521);
      expect(result[1]['impid']).to.equal('3025f169863b7f8');
      expect(result[1]['id']).to.equal('18552976939844999');
      expect(result[1]['adserverTargeting']['np_npappnexus_adId']).to.equal('3025f169863b7f8-0-np-2');
      validres = JSON.parse(JSON.stringify(multiResponse1));
      validres.body.seatbid[0].bid[1].price = 1.1;
      validres.body.seatbid[0].bid[1].cpm = 1.1;
      request = spec.buildRequests(multiRequest1, multiBidderRequest1.bidderRequest);
      result = spec.interpretResponse(validres, request);
      expect(result[1]['price']).to.equal(1.1);
      expect(result[1]['impid']).to.equal('3025f169863b7f8');
      expect(result[1]['id']).to.equal('18552976939844681');
      expect(result[1]['adserverTargeting']['np_npappnexus_adId']).to.equal('3025f169863b7f8-0-np-1');
    });
  });
  describe('userSyncs', function () {
    it('should fail gracefully if no server response', function () {
      const result = spec.getUserSyncs('bad', false, emptyObject);
      expect(result).to.be.empty;
    });
    it('should fail gracefully if server response is empty', function () {
      const result = spec.getUserSyncs('bad', [], emptyObject);
      expect(result).to.be.empty;
    });
    it('should append the various values if they exist', function() {
      spec.buildRequests(validBidRequests, validBidderRequest);
      const result = spec.getUserSyncs({iframeEnabled: true}, 'good server response', emptyObject);
      expect(result).to.be.an('array');
      expect(result[0].url).to.include('publisherId=9876abcd12-3');
      expect(result[0].url).to.include('siteId=1234567890');
    });
    it('should append ccpa (usp data)', function() {
      spec.buildRequests(validBidRequests, validBidderRequest);
      const result = spec.getUserSyncs({iframeEnabled: true}, 'good server response', emptyObject, '1YYN');
      expect(result).to.be.an('array');
      expect(result[0].url).to.include('usp_consent=1YYN');
    });
    it('should use "" if no usp is sent to cookieSync', function() {
      spec.buildRequests(validBidRequests, validBidderRequest);
      const result = spec.getUserSyncs({iframeEnabled: true}, 'good server response', emptyObject);
      expect(result).to.be.an('array');
      expect(result[0].url).to.include('usp_consent=&');
    });
  });
  describe('default size', function () {
    it('should should return default sizes if no obj is sent', function () {
      let obj = '';
      const result = defaultSize(obj);
      expect(result.defaultHeight).to.equal(250);
      expect(result.defaultWidth).to.equal(300);
    });
  });
  describe('getGranularityKeyName', function() {
    it('should return a string granularity as-is', function() {
      const result = getGranularityKeyName('', 'this is it', '');
      expect(result).to.equal('this is it');
    });
    it('should return "custom" for a mediaTypeGranularity object', function() {
      const result = getGranularityKeyName('', {}, '');
      expect(result).to.equal('custom');
    });
    it('should return "custom" for a mediaTypeGranularity object', function() {
      const result = getGranularityKeyName('', false, 'string buckets');
      expect(result).to.equal('string buckets');
    });
  });
  describe('getGranularityObject', function() {
    it('should return an object as-is', function() {
      const result = getGranularityObject('', {'name': 'mark'}, '', '');
      expect(result.name).to.equal('mark');
    });
    it('should return an object as-is', function() {
      const result = getGranularityObject('', false, 'custom', {'name': 'rupert'});
      expect(result.name).to.equal('rupert');
    });
  });
  describe('blockTheRequest', function() {
    it('should return true if np_request is false', function() {
      config.setConfig({'newspassid': {'np_request': false}});
      let result = spec.blockTheRequest();
      expect(result).to.be.true;
      config.resetConfig();
    });
    it('should return false if np_request is true', function() {
      config.setConfig({'newspassid': {'np_request': true}});
      let result = spec.blockTheRequest();
      expect(result).to.be.false;
      config.resetConfig();
    });
  });
  describe('getPageId', function() {
    it('should return the same Page ID for multiple calls', function () {
      let result = spec.getPageId();
      expect(result).to.be.a('string');
      let result2 = spec.getPageId();
      expect(result2).to.equal(result);
    });
  });
  describe('getBidRequestForBidId', function() {
    it('should locate a bid inside a bid array', function () {
      let result = spec.getBidRequestForBidId('2899ec066a91ff8', validBidRequestsMulti);
      expect(result.testId).to.equal(1);
      result = spec.getBidRequestForBidId('2899ec066a91ff0', validBidRequestsMulti);
      expect(result.testId).to.equal(2);
    });
  });
  describe('removeSingleBidderMultipleBids', function() {
    it('should remove the multi bid by npappnexus for adslot 2d30e86db743a8', function() {
      let validres = JSON.parse(JSON.stringify(multiResponse1));
      expect(validres.body.seatbid[0].bid.length).to.equal(3);
      expect(validres.body.seatbid[0].seat).to.equal('npappnexus');
      let response = spec.removeSingleBidderMultipleBids(validres.body.seatbid);
      expect(response.length).to.equal(2);
      expect(response[0].bid.length).to.equal(2);
      expect(response[0].seat).to.equal('npappnexus');
      expect(response[1].bid.length).to.equal(2);
    });
  });
});
