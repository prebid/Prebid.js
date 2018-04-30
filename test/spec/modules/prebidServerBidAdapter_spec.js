import { expect } from 'chai';
import { PrebidServer as Adapter } from 'modules/prebidServerBidAdapter';
import adapterManager from 'src/adaptermanager';
import * as utils from 'src/utils';
import cookie from 'src/cookie';
import { userSync } from 'src/userSync';
import { ajax } from 'src/ajax';
import { config } from 'src/config';

let CONFIG = {
  accountId: '1',
  enabled: true,
  bidders: ['appnexus'],
  timeout: 1000,
  cacheMarkup: 2,
  endpoint: 'https://prebid.adnxs.com/pbs/v1/auction'
};

const REQUEST = {
  'account_id': '1',
  'tid': '437fbbf5-33f5-487a-8e16-a7112903cfe5',
  'max_bids': 1,
  'timeout_millis': 1000,
  'secure': 0,
  'url': '',
  'prebid_version': '0.30.0-pre',
  'ad_units': [
    {
      'code': 'div-gpt-ad-1460505748561-0',
      'sizes': [[300, 250], [300, 600]],
      'mediaTypes': {
        'banner': {
          'sizes': [[ 300, 250 ], [ 300, 300 ]]
        }
      },
      'transactionId': '4ef956ad-fd83-406d-bd35-e4bb786ab86c',
      'bids': [
        {
          'bid_id': '123',
          'bidder': 'appnexus',
          'params': {
            'placementId': '10433394',
            'member': 123
          }
        }
      ]
    }
  ]
};

const VIDEO_REQUEST = {
  'account_id': '1',
  'tid': '437fbbf5-33f5-487a-8e16-a7112903cfe5',
  'max_bids': 1,
  'timeout_millis': 1000,
  'secure': 0,
  'url': '',
  'prebid_version': '1.4.0-pre',
  'ad_units': [
    {
      'code': 'div-gpt-ad-1460505748561-0',
      'sizes': [640, 480],
      'mediaTypes': {
        'video': {
          'playerSize': [[ 640, 480 ]],
          'mimes': ['video/mp4']
        }
      },
      'transactionId': '4ef956ad-fd83-406d-bd35-e4bb786ab86c',
      'bids': [
        {
          'bid_id': '123',
          'bidder': 'appnexus',
          'params': { 'placementId': '12349520' }
        }
      ]
    }
  ]
};

const BID_REQUESTS = [
  {
    'bidderCode': 'appnexus',
    'auctionId': '173afb6d132ba3',
    'bidderRequestId': '3d1063078dfcc8',
    'tid': '437fbbf5-33f5-487a-8e16-a7112903cfe5',
    'bids': [
      {
        'bidder': 'appnexus',
        'params': {
          'placementId': '10433394',
          'member': 123
        },
        'bid_id': '123',
        'adUnitCode': 'div-gpt-ad-1460505748561-0',
        'transactionId': '4ef956ad-fd83-406d-bd35-e4bb786ab86c',
        'sizes': [300, 250],
        'bidId': '259fb43aaa06c1',
        'bidderRequestId': '3d1063078dfcc8',
        'auctionId': '173afb6d132ba3'
      }
    ],
    'auctionStart': 1510852447530,
    'timeout': 5000,
    'src': 's2s',
    'doneCbCallCount': 0
  }
];

const RESPONSE = {
  'tid': '437fbbf5-33f5-487a-8e16-a7112903cfe5',
  'status': 'OK',
  'bidder_status': [
    {
      'bidder': 'appnexus',
      'response_time_ms': 52,
      'num_bids': 1
    }
  ],
  'bids': [
    {
      'bid_id': '123',
      'code': 'div-gpt-ad-1460505748561-0',
      'creative_id': '29681110',
      'bidder': 'appnexus',
      'price': 0.5,
      'adm': '<script type="application/javascript" src="http://nym1-ib.adnxs.com/ab?e=wqT_3QL_Baj_AgAAAwDWAAUBCO-s38cFEJG-p6iRgOfvdhivtLWVpomhsWUgASotCQAAAQII4D8RAQc0AADgPxkAAACA61HgPyEREgApEQmgMPLm_AQ4vgdAvgdIAlDWy5MOWOGASGAAaJFAeP3PBIABAYoBA1VTRJIFBvBSmAGsAqAB-gGoAQGwAQC4AQLAAQPIAQLQAQnYAQDgAQHwAQCKAjp1ZignYScsIDQ5NDQ3MiwgMTQ5MjYzNzI5NSk7dWYoJ3InLCAyOTY4MTExMCwyHgDwnJIC7QEhcHpUNkZ3aTYwSWNFRU5iTGt3NFlBQ0RoZ0Vnd0FEZ0FRQVJJdmdkUTh1YjhCRmdBWVBfX19fOFBhQUJ3QVhnQmdBRUJpQUVCa0FFQm1BRUJvQUVCcUFFRHNBRUF1UUVwaTRpREFBRGdQOEVCS1l1SWd3QUE0RF9KQWQ0V2JVTnJmUEVfMlFFQUFBQUFBQUR3UC1BQkFQVUIFD0BKZ0Npb2FvcEFtZ0FnQzFBZwEWBEM5CQjoREFBZ0hJQWdIUUFnSFlBZ0hnQWdEb0FnRDRBZ0NBQXdHUUF3Q1lBd0dvQTdyUWh3US6aAjEhRXduSHU68AAcNFlCSUlBUW8JbARreAFmDQHwui7YAugH4ALH0wHqAg93d3cubnl0aW1lcy5jb23yAhEKBkNQR19JRBIHMTk3NzkzM_ICEAoFQ1BfSUQSBzg1MTM1OTSAAwGIAwGQAwCYAxSgAwGqAwDAA6wCyAMA2APjBuADAOgDAPgDA4AEAJIECS9vcGVucnRiMpgEAKIECzEwLjI0NC4wLjIyqAQAsgQKCAAQABgAIAAwALgEAMAEAMgEANIEDDEwLjMuMTM4LjE0ONoEAggB4AQA8ARBXyCIBQGYBQCgBf8RAZwBqgUkNDM3ZmJiZjUtMzNmNS00ODdhLThlMTYtYTcxMTI5MDNjZmU1&s=b52bf8a6265a78a5969444bc846cc6d0f9f3b489&test=1&referrer=www.nytimes.com&pp=${AUCTION_PRICE}&"></script>',
      'width': 300,
      'height': 250,
      'deal_id': 'test-dealid',
      'ad_server_targeting': {
        'foo': 'bar'
      },
      'cache_id': '7654321',
      'cache_url': 'http://www.test.com/cache?uuid=7654321',
    }
  ]
};

const VIDEO_RESPONSE = {
  'tid': '437fbbf5-33f5-487a-8e16-a7112903cfe5',
  'status': 'OK',
  'bidder_status': [
    {
      'bidder': 'appnexus',
      'response_time_ms': 52,
      'num_bids': 1
    }
  ],
  'bids': [
    {
      'bid_id': '123',
      'code': 'div-gpt-ad-1460505748561-0',
      'creative_id': '29681110',
      'bidder': 'appnexus',
      'price': 0.5,
      'adm': '<script type="application/javascript" src="http://nym1-ib.adnxs.com/ab?e=wqT_3QL_Baj_AgAAAwDWAAUBCO-s38cFEJG-p6iRgOfvdhivtLWVpomhsWUgASotCQAAAQII4D8RAQc0AADgPxkAAACA61HgPyEREgApEQmgMPLm_AQ4vgdAvgdIAlDWy5MOWOGASGAAaJFAeP3PBIABAYoBA1VTRJIFBvBSmAGsAqAB-gGoAQGwAQC4AQLAAQPIAQLQAQnYAQDgAQHwAQCKAjp1ZignYScsIDQ5NDQ3MiwgMTQ5MjYzNzI5NSk7dWYoJ3InLCAyOTY4MTExMCwyHgDwnJIC7QEhcHpUNkZ3aTYwSWNFRU5iTGt3NFlBQ0RoZ0Vnd0FEZ0FRQVJJdmdkUTh1YjhCRmdBWVBfX19fOFBhQUJ3QVhnQmdBRUJpQUVCa0FFQm1BRUJvQUVCcUFFRHNBRUF1UUVwaTRpREFBRGdQOEVCS1l1SWd3QUE0RF9KQWQ0V2JVTnJmUEVfMlFFQUFBQUFBQUR3UC1BQkFQVUIFD0BKZ0Npb2FvcEFtZ0FnQzFBZwEWBEM5CQjoREFBZ0hJQWdIUUFnSFlBZ0hnQWdEb0FnRDRBZ0NBQXdHUUF3Q1lBd0dvQTdyUWh3US6aAjEhRXduSHU68AAcNFlCSUlBUW8JbARreAFmDQHwui7YAugH4ALH0wHqAg93d3cubnl0aW1lcy5jb23yAhEKBkNQR19JRBIHMTk3NzkzM_ICEAoFQ1BfSUQSBzg1MTM1OTSAAwGIAwGQAwCYAxSgAwGqAwDAA6wCyAMA2APjBuADAOgDAPgDA4AEAJIECS9vcGVucnRiMpgEAKIECzEwLjI0NC4wLjIyqAQAsgQKCAAQABgAIAAwALgEAMAEAMgEANIEDDEwLjMuMTM4LjE0ONoEAggB4AQA8ARBXyCIBQGYBQCgBf8RAZwBqgUkNDM3ZmJiZjUtMzNmNS00ODdhLThlMTYtYTcxMTI5MDNjZmU1&s=b52bf8a6265a78a5969444bc846cc6d0f9f3b489&test=1&referrer=www.nytimes.com&pp=${AUCTION_PRICE}&"></script>',
      'width': 300,
      'height': 250,
      'deal_id': 'test-dealid',
      'ad_server_targeting': {
        'foo': 'bar'
      },
      'media_type': 'video',
      'cache_id': 'video_cache_id',
      'cache_url': 'video_cache_url',
    }
  ]
};

const RESPONSE_NO_BID_NO_UNIT = {
  'tid': '437fbbf5-33f5-487a-8e16-a7112903cfe5',
  'status': 'OK',
  'bidder_status': [{
    'bidder': 'appnexus',
    'response_time_ms': 132,
    'no_bid': true
  }]
};

const RESPONSE_NO_BID_UNIT_SET = {
  'tid': '437fbbf5-33f5-487a-8e16-a7112903cfe5',
  'status': 'OK',
  'bidder_status': [{
    'bidder': 'appnexus',
    'ad_unit': 'div-gpt-ad-1460505748561-0',
    'response_time_ms': 91,
    'no_bid': true
  }]
};

const RESPONSE_NO_COOKIE = {
  'tid': 'd6eca075-4a59-4346-bdb3-86531830ef2c',
  'status': 'OK',
  'bidder_status': [{
    'bidder': 'pubmatic',
    'no_cookie': true,
    'usersync': {
      'url': '//ads.pubmatic.com/AdServer/js/user_sync.html?predirect=http://localhost:8000/setuid?bidder=pubmatic&uid=',
      'type': 'iframe'
    }
  }]
};

const RESPONSE_NO_PBS_COOKIE = {
  'tid': '882fe33e-2981-4257-bd44-bd3b03945f48',
  'status': 'no_cookie',
  'bidder_status': [{
    'bidder': 'rubicon',
    'no_cookie': true,
    'usersync': {
      'url': 'https://pixel.rubiconproject.com/exchange/sync.php?p=prebid',
      'type': 'redirect'
    }
  }, {
    'bidder': 'pubmatic',
    'no_cookie': true,
    'usersync': {
      'url': '//ads.pubmatic.com/AdServer/js/user_sync.html?predirect=https%3A%2F%2Fprebid.adnxs.com%2Fpbs%2Fv1%2Fsetuid%3Fbidder%3Dpubmatic%26uid%3D',
      'type': 'iframe'
    }
  }, {
    'bidder': 'appnexus',
    'response_time_ms': 162,
    'num_bids': 1,
    'debug': [{
      'request_uri': 'http://ib.adnxs.com/openrtb2',
      'request_body': '{"id":"882fe33e-2981-4257-bd44-bd3b03945f48","imp":[{"id":"/19968336/header-bid-tag-0","banner":{"w":300,"h":250,"format":[{"w":300,"h":250}]},"secure":1,"ext":{"appnexus":{"placement_id":5914989}}}],"site":{"domain":"nytimes.com","page":"http://www.nytimes.com"},"device":{"ua":"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_12_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.36","ip":"75.97.0.47"},"user":{"id":"3519479852893340159","buyeruid":"3519479852893340159"},"at":1,"tmax":1000,"source":{"fd":1,"tid":"882fe33e-2981-4257-bd44-bd3b03945f48"}}',
      'response_body': '{"id":"882fe33e-2981-4257-bd44-bd3b03945f48"}',
      'status_code': 200
    }]
  }],
  'bids': [{
    'bid_id': '123',
    'code': 'div-gpt-ad-1460505748561-0',
    'creative_id': '70928274',
    'bidder': 'appnexus',
    'price': 0.07425,
    'adm': '<script type="application/javascript" src="https://secure-nym.adnxs.com/ab?e=wqT_3QLeCPBOXgQAAAMA1gAFAQi5krDKBRCwho2ft8LKoCMY_4PozveI7eswIAEqLQnbgoxDEVi5PxElYqnyDAKzPxkAAAAgXA8zQCHOzMzMzMy8PykzMwECsMM_MO2C6QI47RtA_AxIAlCSj-khWL-tNGAAaNfUTniivwSAAQGKAQNVU0SSAQEG8FSYAawCoAH6AagBAbABALgBAsABBcgBAtABCdgBAOABAPABAIoCkgF1ZignYScsIDE2OTc2MjksIDE0OTgxNTUzMjEpO3VmKCdyJywgNzA5MjgyNzQsQh4ABGMnATsQODY2NTVKPAAgZycsIDM5OTgzTh0AKGknLCA0OTM1MTUsMlcA8IeSAs0CIWhWRE5jZ2pfdVlVSUVKS1A2U0VZQUNDX3JUUXdBRGdBUUFCSV9BeFE3WUxwQWxnQVlKOEJhQUJ3QUhnQWdBRUFpQUVBa0FFQm1BRUJvQUVCcUFFRHNBRUF1UUhPRGRmZE16UERQOEVCemczWDNUTXp3el9KQVFBQUFBQUFBUEFfMlFFCQw0QUR3UC1BQnk0OGU5UUUFFChnQUlCaUFLMzdjRQEIQEIzNWNCaUFMZzZJNEVpQUxoDQgAag0IAG4NCABvAQhIa0FJSG1BSUFvQUlBcUFJR3RRSQVUAHYNCPBed0FJQXlBSUEwQUlBMkFJQTRBTDYtd2ZvQXBqaXI4b0Y4Z0lGZG1semFUSDRBZ0NBQXdHUUF3Q1lBd0dvQV8tNWhRaTZBd2xPV1UweU9qTTJNamcumgItIV93ajdud2oyUAHwTHY2MDBJQUFvQURvSlRsbE5Nam96TmpJNNgCAOACvtUr6gIWaHR0cDovL3d3dy5ueXRpbWVzLmNvbfICEQoGQURWX0lEEgcxNjk3NjI5BRQIQ1BHBRQt9AEUCAVDUAETBAgxTSXA8gINCghBRFZfRlJFURIBMPICGQoPQ1VTVE9NX01PREVMX0lEEgYxMzA1NTTyAh8KFjIcAFBMRUFGX05BTUUSBXZpc2kx8gIoCho2IgAIQVNUAUkcSUZJRUQSCjFBzvB4NDkxNDSAAwCIAwGQAwCYAxSgAwGqAwDAA6wCyAMA2APjBuADAOgDAPgDA4AEAJIECS9vcGVucnRiMpgEAKIECjc1Ljk3LjAuNDeoBACyBAoIABAAGAAgADAAuAQAwAQAyAQA0gQJTllNMjozNjI42gQCCAHgBADwBGGlIIgFAZgFAKAF_xEBuAGqBSQ4ODJmZTMzZS0yOTgxLTQyNTctYmQ0NC1iZDNiMDM5NDVmNDjABQDJBQAAAQI08D_SBQkJAAAAAAAAAAA.&s=d4bc7cd2e5d7e1910a591bc97df6ae9e63333e52&referrer=http%3A%2F%2Fwww.nytimes.com&pp=${AUCTION_PRICE}&"></script>',
    'width': 300,
    'height': 250,
    'response_time_ms': 162
  }]
};

const RESPONSE_NO_PBS_COOKIE_ERROR = {
  'tid': '882fe33e-2981-4257-bd44-bd3b0394545f',
  'status': 'no_cookie',
  'bidder_status': [{
    'bidder': 'rubicon',
    'no_cookie': true,
    'usersync': {
      'url': 'https://pixel.rubiconproject.com/exchange/sync.php?p=prebid',
      'type': 'jsonp'
    }
  }, {
    'bidder': 'pubmatic',
    'no_cookie': true,
    'usersync': {
      'url': '',
      'type': 'iframe'
    }
  }]
};

const RESPONSE_OPENRTB = {
  'id': 'c7dcf14f',
  'seatbid': [
    {
      'bid': [
        {
          'id': '8750901685062148',
          'impid': '123',
          'price': 0.5,
          'adm': '<script src="http://lax1-ib.adnxs.com/ab?e=wqT_3QKgB6CgAwAAAwDWAAUBCJ7kvtMFEPft7JnIuImSdBj87IDv8q21rXcqNgkAAAECCOA_EQEHNAAA4D8ZAAAAgOtR4D8hERIAKREJADERG6Aw8ub8BDi-B0C-B0gCUNbLkw5Y4YBIYABokUB48NIEgAEBigEDVVNEkgUG8FKYAawCoAH6AagBAbABALgBAsABA8gBAtABCdgBAOABAPABAIoCOnVmKCdhJywgNDk0NDcyLCAxNTE3MjY5NTM0KTt1ZigncicsIDI5NjgxMTEwLDIeAPCckgKBAiFqRHF3RUFpNjBJY0VFTmJMa3c0WUFDRGhnRWd3QURnQVFBUkl2Z2RROHViOEJGZ0FZUF9fX184UGFBQndBWGdCZ0FFQmlBRUJrQUVCbUFFQm9BRUJxQUVEc0FFQXVRRXBpNGlEQUFEZ1A4RUJLWXVJZ3dBQTREX0pBVkx3MU5mdl9lMF8yUUVBQUFBQUFBRHdQLUFCQVBVQgUPKEpnQ0FLQUNBTFVDBRAETDAJCPBUTUFDQWNnQ0FkQUNBZGdDQWVBQ0FPZ0NBUGdDQUlBREFaQURBSmdEQWFnRHV0Q0hCTG9ERVdSbFptRjFiSFFqVEVGWU1Ub3pPRFk1mgI5IS1ndndfUTYEAfCENFlCSUlBUW9BRG9SWkdWbVlYVnNkQ05NUVZneE9qTTROamsu2ALoB-ACx9MB6gJHaHR0cDovL3ByZWJpZC5sb2NhbGhvc3Q6OTk5OS9pbnRlZ3JhdGlvbkV4YW1wbGVzL2dwdC9hcHBuZXh1cy10ZXN0Lmh0bWzyAhAKBkFEVl9JRBIGNCXTHPICEQoGQ1BHARM4BzE5Nzc5MzPyAhAKBUNQBRPwljg1MTM1OTSAAwGIAwGQAwCYAxSgAwGqAwDAA6wCyAMA2AMA4AMA6AMA-AMDgAQAkgQJL29wZW5ydGIymAQAogQMMjE2LjU1LjQ3Ljk0qAQAsgQMCAAQABgAIAAwADgAuAQAwAQAyAQA0gQRZGVmYXVsdCNMQVgxOjM4NjnaBAIIAeAEAPAE1suTDogFAZgFAKAF______8BA7ABqgUkYzdkY2YxNGYtZjliYS00Yzc3LWEzYjQtMjdmNmRmMzkwNjdmwAUAyQVpLhTwP9IFCQkJDFAAANgFAeAFAfAFAfoFBAgAEACQBgA.&s=f4dc8b6fa65845d08f0a87c145e12cb7d6288c2a&referrer=http%3A%2F%2Fprebid.localhost%3A9999%2FintegrationExamples%2Fgpt%2Fappnexus-test.html&pp=${AUCTION_PRICE}"></script>',
          'adid': '29681110',
          'adomain': [ 'appnexus.com' ],
          'iurl': 'http://lax1-ib.adnxs.com/cr?id=2968111',
          'cid': '958',
          'crid': '2968111',
          'w': 300,
          'h': 250,
          'ext': {
            'prebid': { 'type': 'banner' },
            'bidder': {
              'appnexus': {
                'brand_id': 1,
                'auction_id': 3,
                'bidder_id': 2
              }
            }
          }
        }
      ],
      'seat': 'appnexus'
    },
  ],
  'ext': {
    'responsetimemillis': {
      'appnexus': 8,
    }
  }
};

const RESPONSE_OPENRTB_VIDEO = {
  id: 'c7dcf14f',
  seatbid: [
    {
      bid: [
        {
          id: '1987250005171537465',
          impid: '/19968336/header-bid-tag-0',
          price: 10,
          adm: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><VAST version="3.0"><Ad id="81877115" sequence="0"><Wrapper><AdSystem version="3.0">adnxs</AdSystem><VASTAdTagURI><![CDATA[http://lax1-ib.adnxs.com/ab?e=wqT_3QLZBq]]></VASTAdTagURI><Impression><![CDATA[http://ib.adnxs.com/nop]]></Impression><Creatives><Creative adID="81877115"><Linear></Linear></Creative></Creatives></Wrapper></Ad></VAST>',
          adid: '81877115',
          adomain: ['appnexus.com'],
          iurl: 'http://lax1-ib.adnxs.com/cr?id=81877115',
          cid: '3535',
          crid: '81877115',
          w: 1,
          h: 1,
          ext: {
            prebid: {
              type: 'video',
            },
            bidder: {
              appnexus: {
                brand_id: 1,
                auction_id: 6673622101799484743,
                bidder_id: 2,
                bid_ad_type: 1,
              },
            },
          },
        },
      ],
      seat: 'appnexus',
    },
  ],
  ext: {
    responsetimemillis: {
      appnexus: 81,
    },
  },
};

const RESPONSE_UNSUPPORTED_BIDDER = {
  'tid': '437fbbf5-33f5-487a-8e16-a7112903cfe5',
  'status': 'OK',
  'bidder_status': [{
    'bidder': '33Across',
    'error': 'Unsupported bidder'
  }]
};

describe('S2S Adapter', () => {
  let adapter,
    addBidResponse = sinon.spy(),
    done = sinon.spy();

  beforeEach(() => adapter = new Adapter());

  afterEach(() => {
    addBidResponse.resetHistory();
    done.resetHistory();
  });

  describe('request function', () => {
    let xhr;
    let requests;

    beforeEach(() => {
      xhr = sinon.useFakeXMLHttpRequest();
      requests = [];
      xhr.onCreate = request => requests.push(request);
      config.resetConfig();
    });

    afterEach(() => xhr.restore());

    it('exists and is a function', () => {
      expect(adapter.callBids).to.exist.and.to.be.a('function');
    });

    it('exists converts types', () => {
      config.setConfig({s2sConfig: CONFIG});
      adapter.callBids(REQUEST, BID_REQUESTS, addBidResponse, done, ajax);
      const requestBid = JSON.parse(requests[0].requestBody);
      expect(requestBid).to.have.property('cache_markup', 2);
      expect(requestBid.ad_units[0].bids[0].params.placementId).to.exist.and.to.be.a('number');
      expect(requestBid.ad_units[0].bids[0].params.member).to.exist.and.to.be.a('string');
    });

    it('sets invalid cacheMarkup value to 0', () => {
      const s2sConfig = Object.assign({}, CONFIG, {
        cacheMarkup: 999
      });
      config.setConfig({s2sConfig: s2sConfig});
      adapter.callBids(REQUEST, BID_REQUESTS, addBidResponse, done, ajax);
      const requestBid = JSON.parse(requests[0].requestBody);
      expect(requestBid).to.have.property('cache_markup', 0);
    });

    it('adds digitrust id is present and user is not optout', () => {
      let digiTrustObj = {
        success: true,
        identity: {
          privacy: {
            optout: false
          },
          id: 'testId',
          keyv: 'testKeyV'
        }
      };

      window.DigiTrust = {
        getUser: () => digiTrustObj
      };

      adapter.callBids(REQUEST, BID_REQUESTS, addBidResponse, done, ajax);
      let requestBid = JSON.parse(requests[0].requestBody);

      expect(requestBid.digiTrust).to.deep.equal({
        id: digiTrustObj.identity.id,
        keyv: digiTrustObj.identity.keyv,
        pref: 0
      });

      digiTrustObj.identity.privacy.optout = true;

      adapter.callBids(REQUEST, BID_REQUESTS, addBidResponse, done, ajax);
      requestBid = JSON.parse(requests[1].requestBody);

      expect(requestBid.digiTrust).to.not.exist;

      delete window.DigiTrust;
    });

    it('adds device and app objects to request', () => {
      const _config = { s2sConfig: CONFIG,
        device: { ifa: '6D92078A-8246-4BA4-AE5B-76104861E7DC' },
        app: { bundle: 'com.test.app' },
      };

      config.setConfig(_config);
      adapter.callBids(REQUEST, BID_REQUESTS, addBidResponse, done, ajax);
      const requestBid = JSON.parse(requests[0].requestBody);
      expect(requestBid.device).to.deep.equal({
        ifa: '6D92078A-8246-4BA4-AE5B-76104861E7DC',
      });
      expect(requestBid.app).to.deep.equal({
        bundle: 'com.test.app',
        publisher: {'id': '1'}
      });
    });

    it('adds device and app objects to request for ORTB', () => {
      const s2sConfig = Object.assign({}, CONFIG, {
        endpoint: 'https://prebid.adnxs.com/pbs/v1/openrtb2/auction'
      });

      const _config = {
        s2sConfig: s2sConfig,
        device: { ifa: '6D92078A-8246-4BA4-AE5B-76104861E7DC' },
        app: { bundle: 'com.test.app' },
      }

      config.setConfig(_config);
      adapter.callBids(REQUEST, BID_REQUESTS, addBidResponse, done, ajax);
      const requestBid = JSON.parse(requests[0].requestBody);
      expect(requestBid.device).to.deep.equal({
        ifa: '6D92078A-8246-4BA4-AE5B-76104861E7DC',
      });
      expect(requestBid.app).to.deep.equal({
        bundle: 'com.test.app',
        publisher: {'id': '1'}
      });
    });

    it('adds site if app is not present', () => {
      const s2sConfig = Object.assign({}, CONFIG, {
        endpoint: 'https://prebid.adnxs.com/pbs/v1/openrtb2/auction'
      });

      const _config = {
        s2sConfig: s2sConfig,
      }

      config.setConfig(_config);
      adapter.callBids(REQUEST, BID_REQUESTS, addBidResponse, done, ajax);
      const requestBid = JSON.parse(requests[0].requestBody);
      expect(requestBid.site).to.exist.and.to.be.a('object');
      expect(requestBid.site.publisher).to.exist.and.to.be.a('object');
      expect(requestBid.site.page).to.exist.and.to.be.a('string');
    });

    it('adds appnexus aliases to request', () => {
      const s2sConfig = Object.assign({}, CONFIG, {
        endpoint: 'https://prebid.adnxs.com/pbs/v1/openrtb2/auction'
      });
      config.setConfig({s2sConfig});

      const aliasBidder = {
        bidder: 'brealtime',
        params: { placementId: '123456' }
      };

      const request = utils.deepClone(REQUEST);
      request.ad_units[0].bids = [aliasBidder];

      adapter.callBids(request, BID_REQUESTS, addBidResponse, done, ajax);

      const requestBid = JSON.parse(requests[0].requestBody);

      expect(requestBid.ext).to.deep.equal({
        prebid: {
          aliases: {
            brealtime: 'appnexus'
          }
        }
      });
    });

    it('adds dynamic aliases to request', () => {
      const s2sConfig = Object.assign({}, CONFIG, {
        endpoint: 'https://prebid.adnxs.com/pbs/v1/openrtb2/auction'
      });
      config.setConfig({s2sConfig});

      const alias = 'foobar';
      const aliasBidder = {
        bidder: alias,
        params: { placementId: '123456' }
      };

      const request = utils.deepClone(REQUEST);
      request.ad_units[0].bids = [aliasBidder];

      // TODO: stub this
      $$PREBID_GLOBAL$$.aliasBidder('appnexus', alias);
      adapter.callBids(request, BID_REQUESTS, addBidResponse, done, ajax);

      const requestBid = JSON.parse(requests[0].requestBody);

      expect(requestBid.ext).to.deep.equal({
        prebid: {
          aliases: {
            [alias]: 'appnexus'
          }
        }
      });
    });

    it('converts appnexus params to expected format for PBS', () => {
      const s2sConfig = Object.assign({}, CONFIG, {
        endpoint: 'https://prebid.adnxs.com/pbs/v1/openrtb2/auction'
      });
      config.setConfig({s2sConfig});

      const myRequest = utils.deepClone(REQUEST);
      myRequest.ad_units[0].bids[0].params.usePaymentRule = true;

      adapter.callBids(myRequest, BID_REQUESTS, addBidResponse, done, ajax);
      const requestBid = JSON.parse(requests[0].requestBody);

      expect(requestBid.imp[0].ext.appnexus).to.exist;
      expect(requestBid.imp[0].ext.appnexus.placement_id).to.exist.and.to.equal(10433394);
      expect(requestBid.imp[0].ext.appnexus.use_pmt_rule).to.exist.and.to.be.true;
      expect(requestBid.imp[0].ext.appnexus.member).to.exist;
    });
  });

  describe('response handler', () => {
    let server;
    let logWarnSpy;

    beforeEach(() => {
      server = sinon.fakeServer.create();
      sinon.stub(utils, 'triggerPixel');
      sinon.stub(utils, 'insertUserSyncIframe');
      sinon.stub(utils, 'logError');
      sinon.stub(cookie, 'cookieSet');
      sinon.stub(utils, 'getBidRequest').returns({
        bidId: '123'
      });
      logWarnSpy = sinon.spy(utils, 'logWarn');
    });

    afterEach(() => {
      server.restore();
      utils.getBidRequest.restore();
      utils.triggerPixel.restore();
      utils.insertUserSyncIframe.restore();
      utils.logError.restore();
      cookie.cookieSet.restore();
      logWarnSpy.restore();
    });

    // TODO: test dependent on pbjs_api_spec.  Needs to be isolated
    it('registers bids', () => {
      server.respondWith(JSON.stringify(RESPONSE));

      config.setConfig({s2sConfig: CONFIG});
      adapter.callBids(REQUEST, BID_REQUESTS, addBidResponse, done, ajax);
      server.respond();
      sinon.assert.calledOnce(addBidResponse);

      const response = addBidResponse.firstCall.args[1];
      expect(response).to.have.property('statusMessage', 'Bid available');
      expect(response).to.have.property('cpm', 0.5);
      expect(response).to.have.property('adId', '123');
      expect(response).to.not.have.property('videoCacheKey');
      expect(response).to.have.property('cache_id', '7654321');
      expect(response).to.have.property('cache_url', 'http://www.test.com/cache?uuid=7654321');
      expect(response).to.not.have.property('vastUrl');
      expect(response).to.have.property('serverResponseTimeMs', 52);
    });

    it('registers video bids', () => {
      server.respondWith(JSON.stringify(VIDEO_RESPONSE));

      config.setConfig({s2sConfig: CONFIG});
      adapter.callBids(VIDEO_REQUEST, BID_REQUESTS, addBidResponse, done, ajax);
      server.respond();
      sinon.assert.calledOnce(addBidResponse);

      const response = addBidResponse.firstCall.args[1];
      expect(response).to.have.property('statusMessage', 'Bid available');
      expect(response).to.have.property('cpm', 0.5);
      expect(response).to.have.property('adId', '123');
      expect(response).to.have.property('videoCacheKey', 'video_cache_id');
      expect(response).to.have.property('cache_id', 'video_cache_id');
      expect(response).to.have.property('cache_url', 'video_cache_url');
      expect(response).to.have.property('vastUrl', 'video_cache_url');
    });

    it('does not call addBidResponse and calls done when ad unit not set', () => {
      server.respondWith(JSON.stringify(RESPONSE_NO_BID_NO_UNIT));

      config.setConfig({s2sConfig: CONFIG});
      adapter.callBids(REQUEST, BID_REQUESTS, addBidResponse, done, ajax);
      server.respond();

      sinon.assert.notCalled(addBidResponse);
      sinon.assert.calledOnce(done);
    });

    it('does not call addBidResponse and calls done when server requests cookie sync', () => {
      server.respondWith(JSON.stringify(RESPONSE_NO_COOKIE));

      config.setConfig({s2sConfig: CONFIG});
      adapter.callBids(REQUEST, BID_REQUESTS, addBidResponse, done, ajax);
      server.respond();

      sinon.assert.notCalled(addBidResponse);
      sinon.assert.calledOnce(done);
    });

    it('does not call addBidResponse and calls done  when ad unit is set', () => {
      server.respondWith(JSON.stringify(RESPONSE_NO_BID_UNIT_SET));

      config.setConfig({s2sConfig: CONFIG});
      adapter.callBids(REQUEST, BID_REQUESTS, addBidResponse, done, ajax);
      server.respond();

      sinon.assert.notCalled(addBidResponse);
      sinon.assert.calledOnce(done);
    });

    it('registers successful bids and calls done when there are less bids than requests', () => {
      server.respondWith(JSON.stringify(RESPONSE));

      config.setConfig({s2sConfig: CONFIG});
      adapter.callBids(REQUEST, BID_REQUESTS, addBidResponse, done, ajax);
      server.respond();

      sinon.assert.calledOnce(addBidResponse);
      sinon.assert.calledOnce(done);

      expect(addBidResponse.firstCall.args[0]).to.equal('div-gpt-ad-1460505748561-0');

      expect(addBidResponse.firstCall.args[1]).to.have.property('adId', '123');

      expect(addBidResponse.firstCall.args[1])
        .to.have.property('statusMessage', 'Bid available');
    });

    it('should have dealId in bidObject', () => {
      server.respondWith(JSON.stringify(RESPONSE));

      config.setConfig({s2sConfig: CONFIG});
      adapter.callBids(REQUEST, BID_REQUESTS, addBidResponse, done, ajax);
      server.respond();
      const response = addBidResponse.firstCall.args[1];
      expect(response).to.have.property('dealId', 'test-dealid');
    });

    it('should pass through default adserverTargeting if present in bidObject', () => {
      server.respondWith(JSON.stringify(RESPONSE));

      config.setConfig({s2sConfig: CONFIG});
      adapter.callBids(REQUEST, BID_REQUESTS, addBidResponse, done, ajax);
      server.respond();
      const response = addBidResponse.firstCall.args[1];
      expect(response).to.have.property('adserverTargeting').that.deep.equals({'foo': 'bar'});
    });

    it('registers client user syncs when client bid adapter is present', () => {
      let rubiconAdapter = {
        registerSyncs: sinon.spy()
      };
      sinon.stub(adapterManager, 'getBidAdapter').callsFake(() => rubiconAdapter);

      server.respondWith(JSON.stringify(RESPONSE_NO_PBS_COOKIE));

      config.setConfig({s2sConfig: CONFIG});
      adapter.callBids(REQUEST, BID_REQUESTS, addBidResponse, done, ajax);
      server.respond();

      sinon.assert.calledOnce(rubiconAdapter.registerSyncs);

      adapterManager.getBidAdapter.restore();
    });

    it('registers client user syncs when using OpenRTB endpoint', () => {
      let rubiconAdapter = {
        registerSyncs: sinon.spy()
      };
      sinon.stub(adapterManager, 'getBidAdapter').returns(rubiconAdapter);

      const s2sConfig = Object.assign({}, CONFIG, {
        endpoint: 'https://prebid.adnxs.com/pbs/v1/openrtb2/auction'
      });
      config.setConfig({s2sConfig});

      server.respondWith(JSON.stringify(RESPONSE_OPENRTB));
      adapter.callBids(REQUEST, BID_REQUESTS, addBidResponse, done, ajax);
      server.respond();

      sinon.assert.calledOnce(rubiconAdapter.registerSyncs);

      adapterManager.getBidAdapter.restore();
    });

    it('registers bid responses when server requests cookie sync', () => {
      server.respondWith(JSON.stringify(RESPONSE_NO_PBS_COOKIE));

      config.setConfig({s2sConfig: CONFIG});
      adapter.callBids(REQUEST, BID_REQUESTS, addBidResponse, done, ajax);
      server.respond();
      sinon.assert.calledOnce(addBidResponse);

      const ad_unit_code = addBidResponse.firstCall.args[0];
      expect(ad_unit_code).to.equal('div-gpt-ad-1460505748561-0');

      const response = addBidResponse.firstCall.args[1];
      expect(response).to.have.property('statusMessage', 'Bid available');
      expect(response).to.have.property('source', 's2s');

      const bid_request_passed = addBidResponse.firstCall.args[1];
      expect(bid_request_passed).to.have.property('adId', '123');
    });

    it('does cookie sync when no_cookie response', () => {
      server.respondWith(JSON.stringify(RESPONSE_NO_PBS_COOKIE));

      config.setConfig({s2sConfig: CONFIG});
      adapter.callBids(REQUEST, BID_REQUESTS, addBidResponse, done, ajax);
      server.respond();

      sinon.assert.calledOnce(utils.triggerPixel);
      sinon.assert.calledWith(utils.triggerPixel, 'https://pixel.rubiconproject.com/exchange/sync.php?p=prebid');
      sinon.assert.calledOnce(utils.insertUserSyncIframe);
      sinon.assert.calledWith(utils.insertUserSyncIframe, '//ads.pubmatic.com/AdServer/js/user_sync.html?predirect=https%3A%2F%2Fprebid.adnxs.com%2Fpbs%2Fv1%2Fsetuid%3Fbidder%3Dpubmatic%26uid%3D');
    });

    it('logs error when no_cookie response is missing type or url', () => {
      server.respondWith(JSON.stringify(RESPONSE_NO_PBS_COOKIE_ERROR));

      config.setConfig({s2sConfig: CONFIG});
      adapter.callBids(REQUEST, BID_REQUESTS, addBidResponse, done, ajax);
      server.respond();

      sinon.assert.notCalled(utils.triggerPixel);
      sinon.assert.notCalled(utils.insertUserSyncIframe);
      sinon.assert.calledTwice(utils.logError);
    });

    it('does not call cookieSet cookie sync when no_cookie response && not opted in', () => {
      server.respondWith(JSON.stringify(RESPONSE_NO_PBS_COOKIE));

      let myConfig = Object.assign({}, CONFIG);

      config.setConfig({s2sConfig: myConfig});
      adapter.callBids(REQUEST, BID_REQUESTS, addBidResponse, done, ajax);
      server.respond();
      sinon.assert.notCalled(cookie.cookieSet);
    });

    it('calls cookieSet cookie sync when no_cookie response && opted in', () => {
      server.respondWith(JSON.stringify(RESPONSE_NO_PBS_COOKIE));
      let myConfig = Object.assign({
        cookieSet: true,
        cookieSetUrl: 'https://acdn.adnxs.com/cookieset/cs.js'
      }, CONFIG);

      config.setConfig({s2sConfig: myConfig});
      adapter.callBids(REQUEST, BID_REQUESTS, addBidResponse, done, ajax);
      server.respond();
      sinon.assert.calledOnce(cookie.cookieSet);
    });

    it('handles OpenRTB responses', () => {
      const s2sConfig = Object.assign({}, CONFIG, {
        endpoint: 'https://prebid.adnxs.com/pbs/v1/openrtb2/auction'
      });
      config.setConfig({s2sConfig});

      server.respondWith(JSON.stringify(RESPONSE_OPENRTB));
      adapter.callBids(REQUEST, BID_REQUESTS, addBidResponse, done, ajax);
      server.respond();

      sinon.assert.calledOnce(addBidResponse);
      const response = addBidResponse.firstCall.args[1];
      expect(response).to.have.property('statusMessage', 'Bid available');
      expect(response).to.have.property('bidderCode', 'appnexus');
      expect(response).to.have.property('adId', '123');
      expect(response).to.have.property('cpm', 0.5);
      expect(response).to.have.property('serverResponseTimeMs', 8);
    });

    it('handles OpenRTB video responses', () => {
      const s2sConfig = Object.assign({}, CONFIG, {
        endpoint: 'https://prebidserverurl/openrtb2/auction?querystring=param'
      });
      config.setConfig({s2sConfig});

      server.respondWith(JSON.stringify(RESPONSE_OPENRTB_VIDEO));
      adapter.callBids(VIDEO_REQUEST, BID_REQUESTS, addBidResponse, done, ajax);
      server.respond();

      sinon.assert.calledOnce(addBidResponse);
      const response = addBidResponse.firstCall.args[1];
      expect(response).to.have.property('statusMessage', 'Bid available');
      expect(response).to.have.property('vastXml', RESPONSE_OPENRTB_VIDEO.seatbid[0].bid[0].adm);
      expect(response).to.have.property('mediaType', 'video');
      expect(response).to.have.property('bidderCode', 'appnexus');
      expect(response).to.have.property('adId', '123');
      expect(response).to.have.property('cpm', 10);
      expect(response).to.have.property('serverResponseTimeMs', 81);
    });

    it('should log warning for unsupported bidder', () => {
      server.respondWith(JSON.stringify(RESPONSE_UNSUPPORTED_BIDDER));

      const s2sConfig = Object.assign({}, CONFIG, {
        bidders: ['33Across']
      });

      const _config = {
        s2sConfig: s2sConfig,
      }

      config.setConfig(_config);
      config.setConfig({s2sConfig: CONFIG});
      adapter.callBids(REQUEST, BID_REQUESTS, addBidResponse, done, ajax);
      server.respond();

      sinon.assert.calledOnce(logWarnSpy);
    });
  });

  describe('s2sConfig', () => {
    let logErrorSpy;

    beforeEach(() => {
      logErrorSpy = sinon.spy(utils, 'logError');
    });

    afterEach(() => {
      utils.logError.restore();
    });

    it('should log an error when accountId is missing', () => {
      const options = {
        enabled: true,
        bidders: ['appnexus'],
        timeout: 1000,
        adapter: 'prebidServer',
        endpoint: 'https://prebid.adnxs.com/pbs/v1/auction'
      };

      config.setConfig({ s2sConfig: options });
      sinon.assert.calledOnce(logErrorSpy);
    });

    it('should log an error when bidders is missing', () => {
      const options = {
        accountId: '1',
        enabled: true,
        timeout: 1000,
        adapter: 's2s',
        endpoint: 'https://prebid.adnxs.com/pbs/v1/auction'
      };

      config.setConfig({ s2sConfig: options });
      sinon.assert.calledOnce(logErrorSpy);
    });

    it('should log an error when endpoint is missing', () => {
      const options = {
        accountId: '1',
        bidders: ['appnexus'],
        timeout: 1000,
        enabled: true,
        adapter: 'prebidServer'
      };

      config.setConfig({ s2sConfig: options });
      sinon.assert.calledOnce(logErrorSpy);
    });

    it('should log an error when using an unknown vendor', () => {
      const options = {
        accountId: '1',
        bidders: ['appnexus'],
        defaultVendor: 'mytest'
      };

      config.setConfig({ s2sConfig: options });
      sinon.assert.calledOnce(logErrorSpy);
    });

    it('should configure the s2sConfig object with appnexus vendor defaults unless specified by user', () => {
      const options = {
        accountId: '123',
        bidders: ['appnexus'],
        defaultVendor: 'appnexus',
        timeout: 750
      };

      config.setConfig({ s2sConfig: options });
      sinon.assert.notCalled(logErrorSpy);

      let vendorConfig = config.getConfig('s2sConfig');
      expect(vendorConfig).to.have.property('accountId', '123');
      expect(vendorConfig).to.have.property('adapter', 'prebidServer');
      expect(vendorConfig.bidders).to.deep.equal(['appnexus']);
      expect(vendorConfig.cookieSet).to.be.false;
      expect(vendorConfig.cookieSetUrl).to.be.undefined;
      expect(vendorConfig.enabled).to.be.true;
      expect(vendorConfig).to.have.property('endpoint', '//prebid.adnxs.com/pbs/v1/auction');
      expect(vendorConfig).to.have.property('syncEndpoint', '//prebid.adnxs.com/pbs/v1/cookie_sync');
      expect(vendorConfig).to.have.property('timeout', 750);
    });

    it('should configure the s2sConfig object with rubicon vendor defaults unless specified by user', () => {
      const options = {
        accountId: 'abc',
        bidders: ['rubicon'],
        defaultVendor: 'rubicon',
        timeout: 750
      };

      config.setConfig({ s2sConfig: options });
      sinon.assert.notCalled(logErrorSpy);

      let vendorConfig = config.getConfig('s2sConfig');
      expect(vendorConfig).to.have.property('accountId', 'abc');
      expect(vendorConfig).to.have.property('adapter', 'prebidServer');
      expect(vendorConfig.bidders).to.deep.equal(['rubicon']);
      expect(vendorConfig.cookieSet).to.be.false;
      expect(vendorConfig.cookieSetUrl).to.be.undefined;
      expect(vendorConfig.enabled).to.be.true;
      expect(vendorConfig).to.have.property('endpoint', '//prebid-server.rubiconproject.com/auction');
      expect(vendorConfig).to.have.property('syncEndpoint', '//prebid-server.rubiconproject.com/cookie_sync');
      expect(vendorConfig).to.have.property('timeout', 750);
    });
  });
});
