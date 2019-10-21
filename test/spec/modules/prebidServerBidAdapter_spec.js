import { expect } from 'chai';
import { PrebidServer as Adapter, resetSyncedStatus } from 'modules/prebidServerBidAdapter/index.js';
import adapterManager from 'src/adapterManager';
import * as utils from 'src/utils';
import { ajax } from 'src/ajax';
import { config } from 'src/config';
import events from 'src/events';
import CONSTANTS from 'src/constants';

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
          'sizes': [[300, 250], [300, 300]]
        },
        'native': {
          'title': {
            'required': true,
            'len': 800
          },
          'image': {
            'required': true,
            'sizes': [989, 742],
          },
          'sponsoredBy': {
            'required': true
          }
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
          'playerSize': [[640, 480]],
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

const OUTSTREAM_VIDEO_REQUEST = {
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
          playerSize: [[640, 480]],
          context: 'outstream',
          mimes: ['video/mp4']
        },
        banner: { sizes: [[300, 250]] }
      },
      'transactionId': '4ef956ad-fd83-406d-bd35-e4bb786ab86c',
      'bids': [
        {
          'bid_id': '123',
          'bidder': 'appnexus',
          'params': { 'placementId': '12349520' }
        }
      ]
    },
    {
      code: 'video1',
      mediaTypes: {
        video: {
          playerSize: [640, 480],
          context: 'outstream',
          mimes: ['video/mp4']
        }
      },
      bids: [
        {
          bidder: 'appnexus',
          params: {
            placementId: 13232385,
            video: {
              skippable: true,
              playback_method: ['auto_play_sound_off']
            }
          }
        }
      ],
      renderer: {
        url: 'http://acdn.adnxs.com/video/outstream/ANOutstreamVideo.js',
        render: function (bid) {
          ANOutstreamVideo.renderAd({
            targetId: bid.adUnitCode,
            adResponse: bid.adResponse,
          });
        }
      }
    }
  ]
};

let BID_REQUESTS;

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
          'impid': 'div-gpt-ad-1460505748561-0',
          'price': 0.5,
          'adm': '<script src="http://lax1-ib.adnxs.com/ab?e=wqT_3QKgB6CgAwAAAwDWAAUBCJ7kvtMFEPft7JnIuImSdBj87IDv8q21rXcqNgkAAAECCOA_EQEHNAAA4D8ZAAAAgOtR4D8hERIAKREJADERG6Aw8ub8BDi-B0C-B0gCUNbLkw5Y4YBIYABokUB48NIEgAEBigEDVVNEkgUG8FKYAawCoAH6AagBAbABALgBAsABA8gBAtABCdgBAOABAPABAIoCOnVmKCdhJywgNDk0NDcyLCAxNTE3MjY5NTM0KTt1ZigncicsIDI5NjgxMTEwLDIeAPCckgKBAiFqRHF3RUFpNjBJY0VFTmJMa3c0WUFDRGhnRWd3QURnQVFBUkl2Z2RROHViOEJGZ0FZUF9fX184UGFBQndBWGdCZ0FFQmlBRUJrQUVCbUFFQm9BRUJxQUVEc0FFQXVRRXBpNGlEQUFEZ1A4RUJLWXVJZ3dBQTREX0pBVkx3MU5mdl9lMF8yUUVBQUFBQUFBRHdQLUFCQVBVQgUPKEpnQ0FLQUNBTFVDBRAETDAJCPBUTUFDQWNnQ0FkQUNBZGdDQWVBQ0FPZ0NBUGdDQUlBREFaQURBSmdEQWFnRHV0Q0hCTG9ERVdSbFptRjFiSFFqVEVGWU1Ub3pPRFk1mgI5IS1ndndfUTYEAfCENFlCSUlBUW9BRG9SWkdWbVlYVnNkQ05NUVZneE9qTTROamsu2ALoB-ACx9MB6gJHaHR0cDovL3ByZWJpZC5sb2NhbGhvc3Q6OTk5OS9pbnRlZ3JhdGlvbkV4YW1wbGVzL2dwdC9hcHBuZXh1cy10ZXN0Lmh0bWzyAhAKBkFEVl9JRBIGNCXTHPICEQoGQ1BHARM4BzE5Nzc5MzPyAhAKBUNQBRPwljg1MTM1OTSAAwGIAwGQAwCYAxSgAwGqAwDAA6wCyAMA2AMA4AMA6AMA-AMDgAQAkgQJL29wZW5ydGIymAQAogQMMjE2LjU1LjQ3Ljk0qAQAsgQMCAAQABgAIAAwADgAuAQAwAQAyAQA0gQRZGVmYXVsdCNMQVgxOjM4NjnaBAIIAeAEAPAE1suTDogFAZgFAKAF______8BA7ABqgUkYzdkY2YxNGYtZjliYS00Yzc3LWEzYjQtMjdmNmRmMzkwNjdmwAUAyQVpLhTwP9IFCQkJDFAAANgFAeAFAfAFAfoFBAgAEACQBgA.&s=f4dc8b6fa65845d08f0a87c145e12cb7d6288c2a&referrer=http%3A%2F%2Fprebid.localhost%3A9999%2FintegrationExamples%2Fgpt%2Fappnexus-test.html&pp=${AUCTION_PRICE}"></script>',
          'adid': '29681110',
          'adomain': ['appnexus.com'],
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
          impid: 'div-gpt-ad-1460505748561-0',
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

const RESPONSE_OPENRTB_NATIVE = {
  'id': 'c7dcf14f',
  'seatbid': [
    {
      'bid': [
        {
          'id': '6451317310275562039',
          'impid': 'div-gpt-ad-1460505748561-0',
          'price': 10,
          'adm': {
            'ver': '1.2',
            'assets': [
              {
                'id': 1,
                'img': {
                  'url': 'https://vcdn.adnxs.com/p/creative-image/f8/7f/0f/13/f87f0f13-230c-4f05-8087-db9216e393de.jpg',
                  'w': 989,
                  'h': 742,
                  'ext': {
                    'appnexus': {
                      'prevent_crop': 0
                    }
                  }
                }
              },
              {
                'id': 0,
                'title': {
                  'text': 'This is a Prebid Native Creative'
                }
              },
              {
                'id': 2,
                'data': {
                  'value': 'Prebid.org'
                }
              }
            ],
            'link': {
              'url': 'https://lax1-ib.adnxs.com/click?AAAAAAAAJEAAAAAAAAAkQAAAAAAAACRAAAAAAAAAJEAAAAAAAAAkQGdce2vBWudAJZpFu1er1zA7ZzddAAAAAOLoyQBtJAAAbSQAAAIAAAC8pM8FnPgWAAAAAABVU0QAVVNEAAEAAQBNXQAAAAABAgMCAAAAALsAuhVqdgAAAAA./cpcpm=AAAAAAAAAAA=/bcr=AAAAAAAA8D8=/pp=${AUCTION_PRICE}/cnd=%213Q5HCQj8-LwKELzJvi4YnPFbIAQoADEAAAAAAAAkQDoJTEFYMTo0MDc3QKcPSQAAAAAAAPA_UQAAAAAAAAAAWQAAAAAAAAAAYQAAAAAAAAAAaQAAAAAAAAAAcQAAAAAAAAAA/cca=OTMyNSNMQVgxOjQwNzc=/bn=84305/test=1/clickenc=http%3A%2F%2Fprebid.org%2Fdev-docs%2Fshow-native-ads.html'
            },
            'eventtrackers': [
              {
                'event': 1,
                'method': 1,
                'url': 'https://lax1-ib.adnxs.com/it?an_audit=0&test=1&referrer=http%3A%2F%2Flocalhost%3A9999%2FintegrationExamples%2Fgpt%2Fdemo_native.html&e=wqT_3QKCCKACBAAAAwDWAAUBCLvO3ekFEOe47duW2NbzQBiltJba--rq6zAqNgkAAAECCCRAEQEHEAAAJEAZEQkAIREJACkRCQAxEQmoMOLRpwY47UhA7UhIAlC8yb4uWJzxW2AAaM26dXjRkgWAAQGKAQNVU0SSAQEG8FKYAQGgAQGoAQGwAQC4AQLAAQPIAQLQAQnYAQDgAQHwAQCKAjt1ZignYScsIDI1Mjk4ODUsIDE1NjM5MTE5OTUpO3VmKCdyJywgOTc0OTQyMDQsIC4eAPQ0AZICnQIhb2pkaWlnajgtTHdLRUx6SnZpNFlBQ0NjOFZzd0FEZ0FRQVJJN1VoUTR0R25CbGdBWVAwQmFBQndBSGdBZ0FFQWlBRUFrQUVCbUFFQm9BRUJxQUVEc0FFQXVRSHpyV3FrQUFBa1FNRUI4NjFxcEFBQUpFREpBVVZpYmxDaFpRQkEyUUVBQUFBQUFBRHdQLUFCQVBVQkFBQUFBUGdCQUpnQ0FLQUNBTFVDQUFBQUFMMENBQUFBQU1BQ0FNZ0NBT0FDQU9nQ0FQZ0NBSUFEQVpBREFKZ0RBYWdEX1BpOENyb0RDVXhCV0RFNk5EQTNOLUFEcHctUUJBQ1lCQUhCQkFBQUFBQUFBQUFBeVFRQUFBQUFBQUFBQU5nRUFBLi6aAoUBITNRNUhDUWo4LUx3S0VMeiUhJG5QRmJJQVFvQUQRvVhBa1FEb0pURUZZTVRvME1EYzNRS2NQUxFUDFBBX1URDAxBQUFXHQwAWR0MAGEdDABjHQz0FwHYAgDgAq2YSOoCPmh0dHA6Ly9sb2NhbGhvc3Q6OTk5OS9pbnRlZ3JhdGlvbkV4YW1wbGVzL2dwdC9kZW1vX25hdGl2ZS5odG1sgAMAiAMBkAMAmAMUoAMBqgMAwAPgqAHIAwDYAwDgAwDoAwD4AwOABACSBAkvb3BlbnJ0YjKYBACiBA0xNzMuMjQ0LjM2LjQwqATtoySyBAwIABAAGAAgADAAOAC4BADABADIBADSBA45MzI1I0xBWDE6NDA3N9oEAggB4AQA8AS8yb4uiAUBmAUAoAX___________8BqgUkZTU5YzNlYjYtNmRkNi00MmQ5LWExMWEtM2FhMTFjOTc5MGUwwAUAyQUAAAAAAADwP9IFCQkAaVh0ANgFAeAFAfAFmfQh-gUECAAQAJAGAZgGALgGAMEGCSQk8D_IBgDaBhYKEAkQGQEBwTTgBgzyBgIIAIAHAYgHAA..&s=11ababa390e9f7983de260493fc5b91ec5b1b3d4&pp=${AUCTION_PRICE}'
              }
            ]
          },
          'adid': '97494204',
          'adomain': [
            'http://prebid.org'
          ],
          'iurl': 'https://lax1-ib.adnxs.com/cr?id=97494204',
          'cid': '9325',
          'crid': '97494204',
          'cat': [
            'IAB3-1'
          ],
          'ext': {
            'prebid': {
              'targeting': {
                'hb_bidder': 'appnexus',
                'hb_pb': '10.00'
              },
              'type': 'native',
              'video': {
                'duration': 0,
                'primary_category': ''
              }
            },
            'bidder': {
              'appnexus': {
                'brand_id': 555545,
                'auction_id': 4676806524825984103,
                'bidder_id': 2,
                'bid_ad_type': 3
              }
            }
          }
        }
      ],
      'seat': 'appnexus'
    }
  ]
};

const RESPONSE_UNSUPPORTED_BIDDER = {
  'tid': '437fbbf5-33f5-487a-8e16-a7112903cfe5',
  'status': 'OK',
  'bidder_status': [{
    'bidder': '33Across',
    'error': 'Unsupported bidder'
  }]
};

describe('S2S Adapter', function () {
  let adapter,
    addBidResponse = sinon.spy(),
    done = sinon.spy();

  beforeEach(function () {
    adapter = new Adapter();
    BID_REQUESTS = [
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
              'member': 123,
              'keywords': {
                'foo': ['bar', 'baz'],
                'fizz': ['buzz']
              }
            },
            'bid_id': '123',
            'adUnitCode': 'div-gpt-ad-1460505748561-0',
            'mediaTypes': {
              'banner': {
                'sizes': [[300, 250]]
              }
            },
            'transactionId': '4ef956ad-fd83-406d-bd35-e4bb786ab86c',
            'sizes': [300, 250],
            'bidId': '123',
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
  });

  afterEach(function () {
    addBidResponse.resetHistory();
    done.resetHistory();
  });

  describe('request function', function () {
    let xhr;
    let requests;

    beforeEach(function () {
      xhr = sinon.useFakeXMLHttpRequest();
      requests = [];
      xhr.onCreate = request => requests.push(request);
      config.resetConfig();
      resetSyncedStatus();
    });

    afterEach(function () {
      xhr.restore();
    });

    it('should not add outstrean without renderer', function () {
      let ortb2Config = utils.deepClone(CONFIG);
      ortb2Config.endpoint = 'https://prebid.adnxs.com/pbs/v1/openrtb2/auction'

      config.setConfig({ s2sConfig: ortb2Config });
      adapter.callBids(OUTSTREAM_VIDEO_REQUEST, BID_REQUESTS, addBidResponse, done, ajax);

      const requestBid = JSON.parse(requests[0].requestBody);
      expect(requestBid.imp[0].banner).to.exist;
      expect(requestBid.imp[0].video).to.not.exist;
    });

    it('exists and is a function', function () {
      expect(adapter.callBids).to.exist.and.to.be.a('function');
    });

    it('exists converts types', function () {
      config.setConfig({ s2sConfig: CONFIG });
      adapter.callBids(REQUEST, BID_REQUESTS, addBidResponse, done, ajax);
      const requestBid = JSON.parse(requests[0].requestBody);
      expect(requestBid).to.have.property('cache_markup', 2);
      expect(requestBid.ad_units[0].bids[0].params.placementId).to.exist.and.to.be.a('number');
      expect(requestBid.ad_units[0].bids[0].params.member).to.exist.and.to.be.a('string');
    });

    describe('gdpr tests', function () {
      afterEach(function () {
        config.resetConfig();
        $$PREBID_GLOBAL$$.requestBids.removeAll();
      });

      it('adds gdpr consent information to ortb2 request depending on presence of module', function () {
        let ortb2Config = utils.deepClone(CONFIG);
        ortb2Config.endpoint = 'https://prebid.adnxs.com/pbs/v1/openrtb2/auction'

        let consentConfig = { consentManagement: { cmpApi: 'iab' }, s2sConfig: ortb2Config };
        config.setConfig(consentConfig);

        let gdprBidRequest = utils.deepClone(BID_REQUESTS);
        gdprBidRequest[0].gdprConsent = {
          consentString: 'abc123',
          gdprApplies: true
        };

        adapter.callBids(REQUEST, gdprBidRequest, addBidResponse, done, ajax);
        let requestBid = JSON.parse(requests[0].requestBody);

        expect(requestBid.regs.ext.gdpr).is.equal(1);
        expect(requestBid.user.ext.consent).is.equal('abc123');

        config.resetConfig();
        config.setConfig({ s2sConfig: CONFIG });

        adapter.callBids(REQUEST, BID_REQUESTS, addBidResponse, done, ajax);
        requestBid = JSON.parse(requests[1].requestBody);

        expect(requestBid.regs).to.not.exist;
        expect(requestBid.user).to.not.exist;
      });

      it('check gdpr info gets added into cookie_sync request: have consent data', function () {
        let cookieSyncConfig = utils.deepClone(CONFIG);
        cookieSyncConfig.syncEndpoint = 'https://prebid.adnxs.com/pbs/v1/cookie_sync';

        let consentConfig = { consentManagement: { cmpApi: 'iab' }, s2sConfig: cookieSyncConfig };
        config.setConfig(consentConfig);

        let gdprBidRequest = utils.deepClone(BID_REQUESTS);

        gdprBidRequest[0].gdprConsent = {
          consentString: 'abc123def',
          gdprApplies: true
        };

        adapter.callBids(REQUEST, gdprBidRequest, addBidResponse, done, ajax);
        let requestBid = JSON.parse(requests[0].requestBody);

        expect(requestBid.gdpr).is.equal(1);
        expect(requestBid.gdpr_consent).is.equal('abc123def');
        expect(requestBid.bidders).to.contain('appnexus').and.to.have.lengthOf(1);
        expect(requestBid.account).is.equal('1');
      });

      it('check gdpr info gets added into cookie_sync request: have consent data but gdprApplies is false', function () {
        let cookieSyncConfig = utils.deepClone(CONFIG);
        cookieSyncConfig.syncEndpoint = 'https://prebid.adnxs.com/pbs/v1/cookie_sync';

        let consentConfig = { consentManagement: { cmpApi: 'iab' }, s2sConfig: cookieSyncConfig };
        config.setConfig(consentConfig);

        let gdprBidRequest = utils.deepClone(BID_REQUESTS);
        gdprBidRequest[0].gdprConsent = {
          consentString: 'xyz789abcc',
          gdprApplies: false
        };

        adapter.callBids(REQUEST, gdprBidRequest, addBidResponse, done, ajax);
        let requestBid = JSON.parse(requests[0].requestBody);

        expect(requestBid.gdpr).is.equal(0);
        expect(requestBid.gdpr_consent).is.undefined;
      });

      it('checks gdpr info gets added to cookie_sync request: consent data unknown', function () {
        let cookieSyncConfig = utils.deepClone(CONFIG);
        cookieSyncConfig.syncEndpoint = 'https://prebid.adnxs.com/pbs/v1/cookie_sync';

        let consentConfig = { consentManagement: { cmpApi: 'iab' }, s2sConfig: cookieSyncConfig };
        config.setConfig(consentConfig);

        let gdprBidRequest = utils.deepClone(BID_REQUESTS);
        gdprBidRequest[0].gdprConsent = {
          consentString: undefined,
          gdprApplies: undefined
        };

        adapter.callBids(REQUEST, gdprBidRequest, addBidResponse, done, ajax);
        let requestBid = JSON.parse(requests[0].requestBody);

        expect(requestBid.gdpr).is.undefined;
        expect(requestBid.gdpr_consent).is.undefined;
      });
    });

    it('sets invalid cacheMarkup value to 0', function () {
      const s2sConfig = Object.assign({}, CONFIG, {
        cacheMarkup: 999
      });
      config.setConfig({ s2sConfig: s2sConfig });
      adapter.callBids(REQUEST, BID_REQUESTS, addBidResponse, done, ajax);
      const requestBid = JSON.parse(requests[0].requestBody);
      expect(requestBid).to.have.property('cache_markup', 0);
    });

    it('adds digitrust id is present and user is not optout', function () {
      let ortb2Config = utils.deepClone(CONFIG);
      ortb2Config.endpoint = 'https://prebid.adnxs.com/pbs/v1/openrtb2/auction';

      let consentConfig = { s2sConfig: ortb2Config };
      config.setConfig(consentConfig);

      let digiTrustObj = {
        privacy: {
          optout: false
        },
        id: 'testId',
        keyv: 'testKeyV'
      };

      let digiTrustBidRequest = utils.deepClone(BID_REQUESTS);
      digiTrustBidRequest[0].bids[0].userId = { digitrustid: { data: digiTrustObj } };

      adapter.callBids(REQUEST, digiTrustBidRequest, addBidResponse, done, ajax);
      let requestBid = JSON.parse(requests[0].requestBody);

      expect(requestBid.user.ext.digitrust).to.deep.equal({
        id: digiTrustObj.id,
        keyv: digiTrustObj.keyv
      });

      digiTrustObj.privacy.optout = true;

      adapter.callBids(REQUEST, digiTrustBidRequest, addBidResponse, done, ajax);
      requestBid = JSON.parse(requests[1].requestBody);

      expect(requestBid.user && request.user.ext && requestBid.user.ext.digitrust).to.not.exist;
    });

    it('adds device and app objects to request', function () {
      const _config = {
        s2sConfig: CONFIG,
        device: { ifa: '6D92078A-8246-4BA4-AE5B-76104861E7DC' },
        app: { bundle: 'com.test.app' },
      };

      config.setConfig(_config);
      adapter.callBids(REQUEST, BID_REQUESTS, addBidResponse, done, ajax);
      const requestBid = JSON.parse(requests[0].requestBody);
      expect(requestBid.device).to.deep.equal({
        ifa: '6D92078A-8246-4BA4-AE5B-76104861E7DC',
        w: window.innerWidth,
        h: window.innerHeight
      });
      expect(requestBid.app).to.deep.equal({
        bundle: 'com.test.app',
        publisher: { 'id': '1' }
      });
    });

    it('adds device and app objects to request for OpenRTB', function () {
      const s2sConfig = Object.assign({}, CONFIG, {
        endpoint: 'https://prebid.adnxs.com/pbs/v1/openrtb2/auction'
      });

      const _config = {
        s2sConfig: s2sConfig,
        device: { ifa: '6D92078A-8246-4BA4-AE5B-76104861E7DC' },
        app: { bundle: 'com.test.app' },
      };

      config.setConfig(_config);
      adapter.callBids(REQUEST, BID_REQUESTS, addBidResponse, done, ajax);
      const requestBid = JSON.parse(requests[0].requestBody);
      expect(requestBid.device).to.deep.equal({
        ifa: '6D92078A-8246-4BA4-AE5B-76104861E7DC',
        w: window.innerWidth,
        h: window.innerHeight
      });
      expect(requestBid.app).to.deep.equal({
        bundle: 'com.test.app',
        publisher: { 'id': '1' }
      });
    });

    it('adds device.w and device.h even if the config lacks a device object', function () {
      const s2sConfig = Object.assign({}, CONFIG, {
        endpoint: 'https://prebid.adnxs.com/pbs/v1/openrtb2/auction'
      });

      const _config = {
        s2sConfig: s2sConfig,
        app: { bundle: 'com.test.app' },
      };

      config.setConfig(_config);
      adapter.callBids(REQUEST, BID_REQUESTS, addBidResponse, done, ajax);
      const requestBid = JSON.parse(requests[0].requestBody);
      expect(requestBid.device).to.deep.equal({
        w: window.innerWidth,
        h: window.innerHeight
      });
      expect(requestBid.app).to.deep.equal({
        bundle: 'com.test.app',
        publisher: { 'id': '1' }
      });
    });

    it('adds native request for OpenRTB', function () {
      const s2sConfig = Object.assign({}, CONFIG, {
        endpoint: 'https://prebid.adnxs.com/pbs/v1/openrtb2/auction'
      });

      const _config = {
        s2sConfig: s2sConfig
      };

      config.setConfig(_config);
      adapter.callBids(REQUEST, BID_REQUESTS, addBidResponse, done, ajax);
      const requestBid = JSON.parse(requests[0].requestBody);

      expect(requestBid.imp[0].native).to.deep.equal({
        request: JSON.stringify({
          'context': 1,
          'plcmttype': 1,
          'eventtrackers': [{
            event: 1,
            methods: [1]
          }],
          'assets': [
            {
              'required': 1,
              'title': {
                'len': 800
              }
            },
            {
              'required': 1,
              'img': {
                'type': 3,
                'w': 989,
                'h': 742
              }
            },
            {
              'required': 1,
              'data': {
                'type': 1
              }
            }
          ]
        }),
        ver: '1.2'
      });
    });

    it('adds site if app is not present', function () {
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

    it('adds appnexus aliases to request', function () {
      const s2sConfig = Object.assign({}, CONFIG, {
        endpoint: 'https://prebid.adnxs.com/pbs/v1/openrtb2/auction'
      });
      config.setConfig({ s2sConfig: s2sConfig });

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
          },
          targeting: {
            includebidderkeys: false,
            includewinners: true
          }
        }
      });
    });

    it('adds dynamic aliases to request', function () {
      const s2sConfig = Object.assign({}, CONFIG, {
        endpoint: 'https://prebid.adnxs.com/pbs/v1/openrtb2/auction'
      });
      config.setConfig({ s2sConfig: s2sConfig });

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
          },
          targeting: {
            includebidderkeys: false,
            includewinners: true
          }
        }
      });
    });

    it('converts appnexus params to expected format for PBS', function () {
      const s2sConfig = Object.assign({}, CONFIG, {
        endpoint: 'https://prebid.adnxs.com/pbs/v1/openrtb2/auction'
      });
      config.setConfig({ s2sConfig: s2sConfig });

      const myRequest = utils.deepClone(REQUEST);
      myRequest.ad_units[0].bids[0].params.usePaymentRule = true;
      myRequest.ad_units[0].bids[0].params.keywords = {
        foo: ['bar', 'baz'],
        fizz: ['buzz']
      };

      adapter.callBids(myRequest, BID_REQUESTS, addBidResponse, done, ajax);
      const requestBid = JSON.parse(requests[0].requestBody);

      expect(requestBid.imp[0].ext.appnexus).to.exist;
      expect(requestBid.imp[0].ext.appnexus.placement_id).to.exist.and.to.equal(10433394);
      expect(requestBid.imp[0].ext.appnexus.use_pmt_rule).to.exist.and.to.be.true;
      expect(requestBid.imp[0].ext.appnexus.member).to.exist;
      expect(requestBid.imp[0].ext.appnexus.keywords).to.exist.and.to.deep.equal([{
        key: 'foo',
        value: ['bar', 'baz']
      }, {
        key: 'fizz',
        value: ['buzz']
      }]);

      config.resetConfig();
      const oldS2sConfig = Object.assign({}, CONFIG);
      config.setConfig({ s2sConfig: oldS2sConfig });

      const myRequest2 = utils.deepClone(REQUEST);
      myRequest2.ad_units[0].bids[0].params.keywords = {
        foo: ['bar', 'baz'],
        fizz: ['buzz']
      };

      adapter.callBids(myRequest2, BID_REQUESTS, addBidResponse, done, ajax);
      const requestBid2 = JSON.parse(requests[1].requestBody);

      expect(requestBid2.ad_units[0].bids[0].params.keywords).to.exist.and.to.deep.equal([{
        key: 'foo',
        value: ['bar', 'baz']
      }, {
        key: 'fizz',
        value: ['buzz']
      }]);
    });

    it('adds limit to the cookie_sync request if userSyncLimit is greater than 0', function () {
      let cookieSyncConfig = utils.deepClone(CONFIG);
      cookieSyncConfig.syncEndpoint = 'https://prebid.adnxs.com/pbs/v1/cookie_sync';
      cookieSyncConfig.userSyncLimit = 1;

      config.setConfig({ s2sConfig: cookieSyncConfig });

      let bidRequest = utils.deepClone(BID_REQUESTS);
      adapter.callBids(REQUEST, bidRequest, addBidResponse, done, ajax);
      let requestBid = JSON.parse(requests[0].requestBody);

      expect(requestBid.bidders).to.contain('appnexus').and.to.have.lengthOf(1);
      expect(requestBid.account).is.equal('1');
      expect(requestBid.limit).is.equal(1);
    });

    it('does not add limit to cooke_sync request if userSyncLimit is missing or 0', function () {
      let cookieSyncConfig = utils.deepClone(CONFIG);
      cookieSyncConfig.syncEndpoint = 'https://prebid.adnxs.com/pbs/v1/cookie_sync';
      config.setConfig({ s2sConfig: cookieSyncConfig });

      let bidRequest = utils.deepClone(BID_REQUESTS);
      adapter.callBids(REQUEST, bidRequest, addBidResponse, done, ajax);
      let requestBid = JSON.parse(requests[0].requestBody);

      expect(requestBid.bidders).to.contain('appnexus').and.to.have.lengthOf(1);
      expect(requestBid.account).is.equal('1');
      expect(requestBid.limit).is.undefined;

      cookieSyncConfig.userSyncLimit = 0;
      config.resetConfig();
      config.setConfig({ s2sConfig: cookieSyncConfig });

      bidRequest = utils.deepClone(BID_REQUESTS);
      adapter.callBids(REQUEST, bidRequest, addBidResponse, done, ajax);
      requestBid = JSON.parse(requests[0].requestBody);

      expect(requestBid.bidders).to.contain('appnexus').and.to.have.lengthOf(1);
      expect(requestBid.account).is.equal('1');
      expect(requestBid.limit).is.undefined;
    });

    it('adds s2sConfig adapterOptions to request for ORTB', function () {
      const s2sConfig = Object.assign({}, CONFIG, {
        endpoint: 'https://prebid.adnxs.com/pbs/v1/openrtb2/auction',
        adapterOptions: {
          appnexus: {
            key: 'value'
          }
        }
      });
      const _config = {
        s2sConfig: s2sConfig,
        device: { ifa: '6D92078A-8246-4BA4-AE5B-76104861E7DC' },
        app: { bundle: 'com.test.app' },
      };

      config.setConfig(_config);
      adapter.callBids(REQUEST, BID_REQUESTS, addBidResponse, done, ajax);
      const requestBid = JSON.parse(requests[0].requestBody);
      expect(requestBid.imp[0].ext.appnexus).to.haveOwnProperty('key');
      expect(requestBid.imp[0].ext.appnexus.key).to.be.equal('value')
    });

    it('when userId is defined on bids, it\'s properties should be copied to user.ext.tpid properties', function () {
      let ortb2Config = utils.deepClone(CONFIG);
      ortb2Config.endpoint = 'https://prebid.adnxs.com/pbs/v1/openrtb2/auction';

      let consentConfig = { s2sConfig: ortb2Config };
      config.setConfig(consentConfig);

      let userIdBidRequest = utils.deepClone(BID_REQUESTS);
      userIdBidRequest[0].bids[0].userId = {
        tdid: 'abc123',
        pubcid: '1234',
        parrableid: '01.1563917337.test-eid',
        lipb: {
          lipbid: 'li-xyz'
        }
      };

      adapter.callBids(REQUEST, userIdBidRequest, addBidResponse, done, ajax);
      let requestBid = JSON.parse(requests[0].requestBody);
      expect(typeof requestBid.user.ext.eids).is.equal('object');
      expect(Array.isArray(requestBid.user.ext.eids)).to.be.true;
      expect(requestBid.user.ext.eids.filter(eid => eid.source === 'adserver.org')).is.not.empty;
      expect(requestBid.user.ext.eids.filter(eid => eid.source === 'adserver.org')[0].uids[0].id).is.equal('abc123');
      expect(requestBid.user.ext.eids.filter(eid => eid.source === 'pubcommon')).is.not.empty;
      expect(requestBid.user.ext.eids.filter(eid => eid.source === 'pubcommon')[0].uids[0].id).is.equal('1234');
      expect(requestBid.user.ext.eids.filter(eid => eid.source === 'parrable.com')).is.not.empty;
      expect(requestBid.user.ext.eids.filter(eid => eid.source === 'parrable.com')[0].uids[0].id).is.equal('01.1563917337.test-eid');
      expect(requestBid.user.ext.eids.filter(eid => eid.source === 'liveintent.com')).is.not.empty;
      expect(requestBid.user.ext.eids.filter(eid => eid.source === 'liveintent.com')[0].uids[0].id).is.equal('li-xyz');
    });

    it('when config \'currency.adServerCurrency\' value is an array: ORTB has property \'cur\' value set to a single item array', function () {
      let s2sConfig = utils.deepClone(CONFIG);
      s2sConfig.endpoint = 'https://prebid.adnxs.com/pbs/v1/openrtb2/auction';
      config.setConfig({
        currency: { adServerCurrency: ['USD', 'GB', 'UK', 'AU'] },
        s2sConfig: s2sConfig
      });

      const bidRequests = utils.deepClone(BID_REQUESTS);
      adapter.callBids(REQUEST, bidRequests, addBidResponse, done, ajax);

      const parsedRequestBody = JSON.parse(requests[0].requestBody);
      expect(parsedRequestBody.cur).to.deep.equal(['USD']);
    });

    it('when config \'currency.adServerCurrency\' value is a string: ORTB has property \'cur\' value set to a single item array', function () {
      let s2sConfig = utils.deepClone(CONFIG);
      s2sConfig.endpoint = 'https://prebid.adnxs.com/pbs/v1/openrtb2/auction';
      config.setConfig({
        currency: { adServerCurrency: 'NZ' },
        s2sConfig: s2sConfig
      });

      const bidRequests = utils.deepClone(BID_REQUESTS);
      adapter.callBids(REQUEST, bidRequests, addBidResponse, done, ajax);

      const parsedRequestBody = JSON.parse(requests[1].requestBody);
      expect(parsedRequestBody.cur).to.deep.equal(['NZ']);
    });

    it('when config \'currency.adServerCurrency\' is unset: ORTB should not define a \'cur\' property', function () {
      let s2sConfig = utils.deepClone(CONFIG);
      s2sConfig.endpoint = 'https://prebid.adnxs.com/pbs/v1/openrtb2/auction';
      config.setConfig({ s2sConfig: s2sConfig });

      const bidRequests = utils.deepClone(BID_REQUESTS);
      adapter.callBids(REQUEST, bidRequests, addBidResponse, done, ajax);

      const parsedRequestBody = JSON.parse(requests[0].requestBody);
      expect(typeof parsedRequestBody.cur).to.equal('undefined');
    });

    it('always add ext.prebid.targeting.includebidderkeys: false for ORTB', function () {
      const s2sConfig = Object.assign({}, CONFIG, {
        endpoint: 'https://prebid.adnxs.com/pbs/v1/openrtb2/auction',
        adapterOptions: {
          appnexus: {
            key: 'value'
          }
        }
      });
      const _config = {
        s2sConfig: s2sConfig,
        device: { ifa: '6D92078A-8246-4BA4-AE5B-76104861E7DC' },
        app: { bundle: 'com.test.app' },
      };

      config.setConfig(_config);
      adapter.callBids(REQUEST, BID_REQUESTS, addBidResponse, done, ajax);
      const requestBid = JSON.parse(requests[0].requestBody);

      expect(requestBid.ext.prebid.targeting).to.haveOwnProperty('includebidderkeys');
      expect(requestBid.ext.prebid.targeting.includebidderkeys).to.equal(false);
    });

    it('always add ext.prebid.targeting.includewinners: true for ORTB', function () {
      const s2sConfig = Object.assign({}, CONFIG, {
        endpoint: 'https://prebid.adnxs.com/pbs/v1/openrtb2/auction',
        adapterOptions: {
          appnexus: {
            key: 'value'
          }
        }
      });
      const _config = {
        s2sConfig: s2sConfig,
        device: { ifa: '6D92078A-8246-4BA4-AE5B-76104861E7DC' },
        app: { bundle: 'com.test.app' },
      };

      config.setConfig(_config);
      adapter.callBids(REQUEST, BID_REQUESTS, addBidResponse, done, ajax);
      const requestBid = JSON.parse(requests[0].requestBody);

      expect(requestBid.ext.prebid.targeting).to.haveOwnProperty('includewinners');
      expect(requestBid.ext.prebid.targeting.includewinners).to.equal(true);
    });

    it('adds s2sConfig video.ext.prebid to request for ORTB', function () {
      const s2sConfig = Object.assign({}, CONFIG, {
        endpoint: 'https://prebid.adnxs.com/pbs/v1/openrtb2/auction',
        extPrebid: {
          foo: 'bar'
        }
      });
      const _config = {
        s2sConfig: s2sConfig,
        device: { ifa: '6D92078A-8246-4BA4-AE5B-76104861E7DC' },
        app: { bundle: 'com.test.app' },
      };

      config.setConfig(_config);
      adapter.callBids(REQUEST, BID_REQUESTS, addBidResponse, done, ajax);
      const requestBid = JSON.parse(requests[0].requestBody);

      expect(requestBid).to.haveOwnProperty('ext');
      expect(requestBid.ext).to.haveOwnProperty('prebid');
      expect(requestBid.ext.prebid).to.deep.equal({
        foo: 'bar',
        targeting: {
          includewinners: true,
          includebidderkeys: false
        }
      });
    });

    it('overrides request.ext.prebid properties using s2sConfig video.ext.prebid values for ORTB', function () {
      const s2sConfig = Object.assign({}, CONFIG, {
        endpoint: 'https://prebid.adnxs.com/pbs/v1/openrtb2/auction',
        extPrebid: {
          targeting: {
            includewinners: false,
            includebidderkeys: true
          }
        }
      });
      const _config = {
        s2sConfig: s2sConfig,
        device: { ifa: '6D92078A-8246-4BA4-AE5B-76104861E7DC' },
        app: { bundle: 'com.test.app' },
      };

      config.setConfig(_config);
      adapter.callBids(REQUEST, BID_REQUESTS, addBidResponse, done, ajax);
      const requestBid = JSON.parse(requests[0].requestBody);

      expect(requestBid).to.haveOwnProperty('ext');
      expect(requestBid.ext).to.haveOwnProperty('prebid');
      expect(requestBid.ext.prebid).to.deep.equal({
        targeting: {
          includewinners: false,
          includebidderkeys: true
        }
      });
    });

    it('overrides request.ext.prebid properties using s2sConfig video.ext.prebid values for ORTB', function () {
      const s2sConfig = Object.assign({}, CONFIG, {
        endpoint: 'https://prebid.adnxs.com/pbs/v1/openrtb2/auction',
        extPrebid: {
          cache: {
            vastxml: 'vastxml-set-though-extPrebid.cache.vastXml'
          },
          targeting: {
            includewinners: false,
            includebidderkeys: false
          }
        }
      });
      const _config = {
        s2sConfig: s2sConfig,
        device: { ifa: '6D92078A-8246-4BA4-AE5B-76104861E7DC' },
        app: { bundle: 'com.test.app' },
      };

      config.setConfig(_config);
      adapter.callBids(REQUEST, BID_REQUESTS, addBidResponse, done, ajax);
      const requestBid = JSON.parse(requests[0].requestBody);

      expect(requestBid).to.haveOwnProperty('ext');
      expect(requestBid.ext).to.haveOwnProperty('prebid');
      expect(requestBid.ext.prebid).to.deep.equal({
        cache: {
          vastxml: 'vastxml-set-though-extPrebid.cache.vastXml'
        },
        targeting: {
          includewinners: false,
          includebidderkeys: false
        }
      });
    });

    it('passes schain object in request', function () {
      const bidRequests = utils.deepClone(BID_REQUESTS);
      const schainObject = {
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
      bidRequests[0].bids[0].schain = schainObject;
      adapter.callBids(REQUEST, bidRequests, addBidResponse, done, ajax);
      const parsedRequestBody = JSON.parse(requests[0].requestBody);
      expect(parsedRequestBody.source.ext.schain).to.deep.equal(schainObject);
    })
  });

  describe('response handler', function () {
    let server;
    let logWarnSpy;

    beforeEach(function () {
      server = sinon.fakeServer.create();
      sinon.stub(utils, 'triggerPixel');
      sinon.stub(utils, 'insertUserSyncIframe');
      sinon.stub(utils, 'logError');
      sinon.stub(events, 'emit');
      logWarnSpy = sinon.spy(utils, 'logWarn');
    });

    afterEach(function () {
      server.restore();
      utils.triggerPixel.restore();
      utils.insertUserSyncIframe.restore();
      utils.logError.restore();
      events.emit.restore();
      logWarnSpy.restore();
    });

    // TODO: test dependent on pbjs_api_spec.  Needs to be isolated
    it('registers bids and calls BIDDER_DONE', function () {
      server.respondWith(JSON.stringify(RESPONSE));

      config.setConfig({ s2sConfig: CONFIG });
      adapter.callBids(REQUEST, BID_REQUESTS, addBidResponse, done, ajax);
      server.respond();
      sinon.assert.calledOnce(addBidResponse);

      sinon.assert.calledOnce(events.emit);
      const event = events.emit.firstCall.args;
      expect(event[0]).to.equal(CONSTANTS.EVENTS.BIDDER_DONE);
      expect(event[1].bids[0]).to.have.property('serverResponseTimeMs', 52);

      const response = addBidResponse.firstCall.args[1];
      expect(response).to.have.property('statusMessage', 'Bid available');
      expect(response).to.have.property('cpm', 0.5);
      expect(response).to.have.property('requestId', '123');
      expect(response).to.not.have.property('videoCacheKey');
      expect(response).to.have.property('cache_id', '7654321');
      expect(response).to.have.property('cache_url', 'http://www.test.com/cache?uuid=7654321');
      expect(response).to.not.have.property('vastUrl');
    });

    it('registers video bids', function () {
      server.respondWith(JSON.stringify(VIDEO_RESPONSE));

      config.setConfig({ s2sConfig: CONFIG });
      adapter.callBids(VIDEO_REQUEST, BID_REQUESTS, addBidResponse, done, ajax);
      server.respond();
      sinon.assert.calledOnce(addBidResponse);

      const response = addBidResponse.firstCall.args[1];
      expect(response).to.have.property('statusMessage', 'Bid available');
      expect(response).to.have.property('cpm', 0.5);
      expect(response).to.have.property('requestId', '123');
      expect(response).to.have.property('videoCacheKey', 'video_cache_id');
      expect(response).to.have.property('cache_id', 'video_cache_id');
      expect(response).to.have.property('cache_url', 'video_cache_url');
      expect(response).to.have.property('vastUrl', 'video_cache_url');
    });

    it('does not call addBidResponse and calls done when ad unit not set', function () {
      server.respondWith(JSON.stringify(RESPONSE_NO_BID_NO_UNIT));

      config.setConfig({ s2sConfig: CONFIG });
      adapter.callBids(REQUEST, BID_REQUESTS, addBidResponse, done, ajax);
      server.respond();

      sinon.assert.notCalled(addBidResponse);
      sinon.assert.calledOnce(done);
    });

    it('does not call addBidResponse and calls done when server requests cookie sync', function () {
      server.respondWith(JSON.stringify(RESPONSE_NO_COOKIE));

      config.setConfig({ s2sConfig: CONFIG });
      adapter.callBids(REQUEST, BID_REQUESTS, addBidResponse, done, ajax);
      server.respond();

      sinon.assert.notCalled(addBidResponse);
      sinon.assert.calledOnce(done);
    });

    it('does not call addBidResponse and calls done  when ad unit is set', function () {
      server.respondWith(JSON.stringify(RESPONSE_NO_BID_UNIT_SET));

      config.setConfig({ s2sConfig: CONFIG });
      adapter.callBids(REQUEST, BID_REQUESTS, addBidResponse, done, ajax);
      server.respond();

      sinon.assert.notCalled(addBidResponse);
      sinon.assert.calledOnce(done);
    });

    it('registers successful bids and calls done when there are less bids than requests', function () {
      server.respondWith(JSON.stringify(RESPONSE));

      config.setConfig({ s2sConfig: CONFIG });
      adapter.callBids(REQUEST, BID_REQUESTS, addBidResponse, done, ajax);
      server.respond();

      sinon.assert.calledOnce(addBidResponse);
      sinon.assert.calledOnce(done);

      expect(addBidResponse.firstCall.args[0]).to.equal('div-gpt-ad-1460505748561-0');

      expect(addBidResponse.firstCall.args[1]).to.have.property('requestId', '123');

      expect(addBidResponse.firstCall.args[1])
        .to.have.property('statusMessage', 'Bid available');
    });

    it('should have dealId in bidObject', function () {
      server.respondWith(JSON.stringify(RESPONSE));

      config.setConfig({ s2sConfig: CONFIG });
      adapter.callBids(REQUEST, BID_REQUESTS, addBidResponse, done, ajax);
      server.respond();
      const response = addBidResponse.firstCall.args[1];
      expect(response).to.have.property('dealId', 'test-dealid');
    });

    it('should pass through default adserverTargeting if present in bidObject', function () {
      server.respondWith(JSON.stringify(RESPONSE));

      config.setConfig({ s2sConfig: CONFIG });
      adapter.callBids(REQUEST, BID_REQUESTS, addBidResponse, done, ajax);
      server.respond();
      const response = addBidResponse.firstCall.args[1];
      expect(response).to.have.property('adserverTargeting').that.deep.equals({ 'foo': 'bar' });
    });

    it('registers client user syncs when client bid adapter is present', function () {
      let rubiconAdapter = {
        registerSyncs: sinon.spy()
      };
      sinon.stub(adapterManager, 'getBidAdapter').callsFake(() => rubiconAdapter);

      server.respondWith(JSON.stringify(RESPONSE_NO_PBS_COOKIE));

      config.setConfig({ s2sConfig: CONFIG });
      adapter.callBids(REQUEST, BID_REQUESTS, addBidResponse, done, ajax);
      server.respond();

      sinon.assert.calledOnce(rubiconAdapter.registerSyncs);

      adapterManager.getBidAdapter.restore();
    });

    it('registers client user syncs when using OpenRTB endpoint', function () {
      let rubiconAdapter = {
        registerSyncs: sinon.spy()
      };
      sinon.stub(adapterManager, 'getBidAdapter').returns(rubiconAdapter);

      const s2sConfig = Object.assign({}, CONFIG, {
        endpoint: 'https://prebid.adnxs.com/pbs/v1/openrtb2/auction'
      });
      config.setConfig({ s2sConfig });

      server.respondWith(JSON.stringify(RESPONSE_OPENRTB));
      adapter.callBids(REQUEST, BID_REQUESTS, addBidResponse, done, ajax);
      server.respond();

      sinon.assert.calledOnce(rubiconAdapter.registerSyncs);

      adapterManager.getBidAdapter.restore();
    });

    it('registers bid responses when server requests cookie sync', function () {
      server.respondWith(JSON.stringify(RESPONSE_NO_PBS_COOKIE));

      config.setConfig({ s2sConfig: CONFIG });
      adapter.callBids(REQUEST, BID_REQUESTS, addBidResponse, done, ajax);
      server.respond();
      sinon.assert.calledOnce(addBidResponse);

      const ad_unit_code = addBidResponse.firstCall.args[0];
      expect(ad_unit_code).to.equal('div-gpt-ad-1460505748561-0');

      const response = addBidResponse.firstCall.args[1];
      expect(response).to.have.property('statusMessage', 'Bid available');
      expect(response).to.have.property('source', 's2s');

      const bid_request_passed = addBidResponse.firstCall.args[1];
      expect(bid_request_passed).to.have.property('requestId', '123');
    });

    it('handles OpenRTB responses and call BIDDER_DONE', function () {
      const s2sConfig = Object.assign({}, CONFIG, {
        endpoint: 'https://prebid.adnxs.com/pbs/v1/openrtb2/auction'
      });
      config.setConfig({ s2sConfig });

      server.respondWith(JSON.stringify(RESPONSE_OPENRTB));
      adapter.callBids(REQUEST, BID_REQUESTS, addBidResponse, done, ajax);
      server.respond();

      sinon.assert.calledOnce(events.emit);
      const event = events.emit.firstCall.args;
      expect(event[0]).to.equal(CONSTANTS.EVENTS.BIDDER_DONE);
      expect(event[1].bids[0]).to.have.property('serverResponseTimeMs', 8);

      sinon.assert.calledOnce(addBidResponse);
      const response = addBidResponse.firstCall.args[1];
      expect(response).to.have.property('statusMessage', 'Bid available');
      expect(response).to.have.property('bidderCode', 'appnexus');
      expect(response).to.have.property('requestId', '123');
      expect(response).to.have.property('cpm', 0.5);
    });

    it('handles OpenRTB video responses', function () {
      const s2sConfig = Object.assign({}, CONFIG, {
        endpoint: 'https://prebidserverurl/openrtb2/auction?querystring=param'
      });
      config.setConfig({ s2sConfig });

      server.respondWith(JSON.stringify(RESPONSE_OPENRTB_VIDEO));
      adapter.callBids(VIDEO_REQUEST, BID_REQUESTS, addBidResponse, done, ajax);
      server.respond();

      sinon.assert.calledOnce(addBidResponse);
      const response = addBidResponse.firstCall.args[1];
      expect(response).to.have.property('statusMessage', 'Bid available');
      expect(response).to.have.property('vastXml', RESPONSE_OPENRTB_VIDEO.seatbid[0].bid[0].adm);
      expect(response).to.have.property('mediaType', 'video');
      expect(response).to.have.property('bidderCode', 'appnexus');
      expect(response).to.have.property('requestId', '123');
      expect(response).to.have.property('cpm', 10);
    });

    it('handles response cache from ext.prebid.cache.vastXml', function () {
      const s2sConfig = Object.assign({}, CONFIG, {
        endpoint: 'https://prebidserverurl/openrtb2/auction?querystring=param'
      });
      config.setConfig({ s2sConfig });
      const cacheResponse = utils.deepClone(RESPONSE_OPENRTB_VIDEO);
      cacheResponse.seatbid.forEach(item => {
        item.bid[0].ext.prebid.cache = {
          vastXml: {
            cacheId: 'abcd1234',
            url: 'https://prebid-cache.net/cache?uuid=abcd1234'
          }
        }
      });
      server.respondWith(JSON.stringify(cacheResponse));
      adapter.callBids(VIDEO_REQUEST, BID_REQUESTS, addBidResponse, done, ajax);
      server.respond();

      sinon.assert.calledOnce(addBidResponse);
      const response = addBidResponse.firstCall.args[1];

      expect(response).to.have.property('statusMessage', 'Bid available');
      expect(response).to.have.property('videoCacheKey', 'abcd1234');
      expect(response).to.have.property('vastUrl', 'https://prebid-cache.net/cache?uuid=abcd1234');
    });

    it('add adserverTargeting object to bids when ext.prebid.targeting is defined', function () {
      const s2sConfig = Object.assign({}, CONFIG, {
        endpoint: 'https://prebidserverurl/openrtb2/auction?querystring=param'
      });
      config.setConfig({ s2sConfig });
      const cacheResponse = utils.deepClone(RESPONSE_OPENRTB_VIDEO);
      const targetingTestData = {
        hb_cache_path: '/cache',
        hb_cache_host: 'prebid-cache.testurl.com'
      };

      cacheResponse.seatbid.forEach(item => {
        item.bid[0].ext.prebid.targeting = targetingTestData
      });
      server.respondWith(JSON.stringify(cacheResponse));
      adapter.callBids(VIDEO_REQUEST, BID_REQUESTS, addBidResponse, done, ajax);
      server.respond();

      sinon.assert.calledOnce(addBidResponse);
      const response = addBidResponse.firstCall.args[1];

      expect(response).to.have.property('adserverTargeting');
      expect(response.adserverTargeting).to.deep.equal({
        'hb_cache_path': '/cache',
        'hb_cache_host': 'prebid-cache.testurl.com'
      });
    });

    it('handles response cache from ext.prebid.targeting', function () {
      const s2sConfig = Object.assign({}, CONFIG, {
        endpoint: 'https://prebidserverurl/openrtb2/auction?querystring=param'
      });
      config.setConfig({ s2sConfig });
      const cacheResponse = utils.deepClone(RESPONSE_OPENRTB_VIDEO);
      cacheResponse.seatbid.forEach(item => {
        item.bid[0].ext.prebid.targeting = {
          hb_uuid: 'a5ad3993',
          hb_cache_host: 'prebid-cache.net',
          hb_cache_path: '/cache'
        }
      });
      server.respondWith(JSON.stringify(cacheResponse));
      adapter.callBids(VIDEO_REQUEST, BID_REQUESTS, addBidResponse, done, ajax);
      server.respond();

      sinon.assert.calledOnce(addBidResponse);
      const response = addBidResponse.firstCall.args[1];

      expect(response).to.have.property('statusMessage', 'Bid available');
      expect(response).to.have.property('videoCacheKey', 'a5ad3993');
      expect(response).to.have.property('vastUrl', 'https://prebid-cache.net/cache?uuid=a5ad3993');
    });

    it('handles OpenRTB native responses', function () {
      sinon.stub(utils, 'getBidRequest').returns({
        adUnitCode: 'div-gpt-ad-1460505748561-0',
        bidder: 'appnexus',
        bidId: '123'
      });
      const s2sConfig = Object.assign({}, CONFIG, {
        endpoint: 'https://prebidserverurl/openrtb2/auction?querystring=param'
      });
      config.setConfig({ s2sConfig });

      server.respondWith(JSON.stringify(RESPONSE_OPENRTB_NATIVE));
      adapter.callBids(REQUEST, BID_REQUESTS, addBidResponse, done, ajax);
      server.respond();

      sinon.assert.calledOnce(addBidResponse);
      const response = addBidResponse.firstCall.args[1];
      expect(response).to.have.property('statusMessage', 'Bid available');
      expect(response).to.have.property('adm').deep.equal(RESPONSE_OPENRTB_NATIVE.seatbid[0].bid[0].adm);
      expect(response).to.have.property('mediaType', 'native');
      expect(response).to.have.property('bidderCode', 'appnexus');
      expect(response).to.have.property('requestId', '123');
      expect(response).to.have.property('cpm', 10);

      utils.getBidRequest.restore();
    });

    it('should log warning for unsupported bidder', function () {
      server.respondWith(JSON.stringify(RESPONSE_UNSUPPORTED_BIDDER));

      const s2sConfig = Object.assign({}, CONFIG, {
        bidders: ['33Across']
      });

      const _config = {
        s2sConfig: s2sConfig,
      }

      config.setConfig(_config);
      config.setConfig({ s2sConfig: CONFIG });
      adapter.callBids(REQUEST, BID_REQUESTS, addBidResponse, done, ajax);
      server.respond();

      sinon.assert.calledOnce(logWarnSpy);
    });
  });

  describe('s2sConfig', function () {
    let xhr;
    let requests;
    let logErrorSpy;

    beforeEach(function () {
      xhr = sinon.useFakeXMLHttpRequest();
      requests = [];
      xhr.onCreate = request => requests.push(request);
      logErrorSpy = sinon.spy(utils, 'logError');
      resetSyncedStatus();
    });

    afterEach(function () {
      xhr.restore();
      utils.logError.restore();
    });

    it('should log an error when accountId is missing', function () {
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

    it('should log an error when bidders is missing', function () {
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

    it('should log an error when endpoint is missing', function () {
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

    it('should log an error when using an unknown vendor', function () {
      const options = {
        accountId: '1',
        bidders: ['appnexus'],
        defaultVendor: 'mytest'
      };

      config.setConfig({ s2sConfig: options });
      sinon.assert.calledOnce(logErrorSpy);
    });

    it('should configure the s2sConfig object with appnexus vendor defaults unless specified by user', function () {
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
      expect(vendorConfig.enabled).to.be.true;
      expect(vendorConfig).to.have.property('endpoint', '//prebid.adnxs.com/pbs/v1/openrtb2/auction');
      expect(vendorConfig).to.have.property('syncEndpoint', '//prebid.adnxs.com/pbs/v1/cookie_sync');
      expect(vendorConfig).to.have.property('timeout', 750);
    });

    it('should configure the s2sConfig object with rubicon vendor defaults unless specified by user', function () {
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
      expect(vendorConfig.enabled).to.be.true;
      expect(vendorConfig).to.have.property('endpoint', '//prebid-server.rubiconproject.com/openrtb2/auction');
      expect(vendorConfig).to.have.property('syncEndpoint', '//prebid-server.rubiconproject.com/cookie_sync');
      expect(vendorConfig).to.have.property('timeout', 750);
    });

    it('should return proper defaults', function () {
      expect(config.getConfig('s2sConfig')).to.deep.equal({
        'accountId': 'abc',
        'adapter': 'prebidServer',
        'bidders': ['rubicon'],
        'defaultVendor': 'rubicon',
        'enabled': true,
        'endpoint': '//prebid-server.rubiconproject.com/openrtb2/auction',
        'syncEndpoint': '//prebid-server.rubiconproject.com/cookie_sync',
        'timeout': 750
      })
    });

    it('should return default adapterOptions if not set', function () {
      config.setConfig({
        s2sConfig: {
          accountId: 'abc',
          bidders: ['rubicon'],
          defaultVendor: 'rubicon',
          timeout: 750
        }
      });
      expect(config.getConfig('s2sConfig')).to.deep.equal({
        enabled: true,
        timeout: 750,
        adapter: 'prebidServer',
        accountId: 'abc',
        bidders: ['rubicon'],
        defaultVendor: 'rubicon',
        endpoint: '//prebid-server.rubiconproject.com/openrtb2/auction',
        syncEndpoint: '//prebid-server.rubiconproject.com/cookie_sync'
      })
    });

    it('should set adapterOptions', function () {
      config.setConfig({
        s2sConfig: {
          adapterOptions: {
            rubicon: {
              singleRequest: true,
              foo: 'bar'
            }
          }
        }
      });
      expect(config.getConfig('s2sConfig').adapterOptions).to.deep.equal({
        rubicon: {
          singleRequest: true,
          foo: 'bar'
        }
      })
    });

    it('should set syncUrlModifier', function () {
      config.setConfig({
        s2sConfig: {
          syncUrlModifier: {
            appnexus: () => { }
          }
        }
      });
      expect(typeof config.getConfig('s2sConfig').syncUrlModifier.appnexus).to.equal('function')
    });

    it('should set correct bidder names to bidders property when using an alias for that bidder', function () {
      const s2sConfig = utils.deepClone(CONFIG);

      // Add syncEndpoint so that the request goes to the User Sync endpoint
      // Modify the bidders property to include an alias for Rubicon adapter
      s2sConfig.syncEndpoint = 'https://prebid.adnxs.com/pbs/v1/cookie_sync';
      s2sConfig.bidders = ['appnexus', 'rubicon-alias'];

      const request = utils.deepClone(REQUEST);

      // Add another bidder, `rubicon-alias`
      request.ad_units[0].bids.push({
        bidder: 'rubicon-alias',
        params: {
          accoundId: 14062,
          siteId: 70608,
          zoneId: 498816
        }
      });

      // create an alias for the Rubicon Bid Adapter
      adapterManager.aliasBidAdapter('rubicon', 'rubicon-alias');

      config.setConfig({ s2sConfig });

      const bidRequest = utils.deepClone(BID_REQUESTS);
      bidRequest.push({
        'bidderCode': 'rubicon-alias',
        'auctionId': '4146ab2b-9422-4040-9b1c-966fffbfe2d4',
        'bidderRequestId': '4b1a4f9c3e4546',
        'tid': 'd7fa8342-ae22-4ca1-b237-331169350f84',
        'bids': [
          {
            'bidder': 'rubicon-alias',
            'params': {
              'accountId': 14062,
              'siteId': 70608,
              'zoneId': 498816
            },
            'bid_id': '2a9523915411c3',
            'mediaTypes': {
              'banner': {
                'sizes': [
                  [
                    300,
                    250
                  ]
                ]
              }
            },
            'adUnitCode': 'div-gpt-ad-1460505748561-0',
            'transactionId': '78ddc106-b7d8-45d1-bd29-86993098e53d',
            'sizes': [
              [
                300,
                250
              ]
            ],
            'bidId': '2a9523915411c3',
            'bidderRequestId': '4b1a4f9c3e4546',
            'auctionId': '4146ab2b-9422-4040-9b1c-966fffbfe2d4'
          }
        ],
        'auctionStart': 1569234122602,
        'timeout': 1000,
        'src': 's2s'
      });

      adapter.callBids(request, bidRequest, addBidResponse, done, ajax);

      const requestBid = JSON.parse(requests[0].requestBody);
      expect(requestBid.bidders).to.deep.equal(['appnexus', 'rubicon']);
    });
  });
});
