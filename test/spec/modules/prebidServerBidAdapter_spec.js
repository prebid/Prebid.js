import { expect } from 'chai';
import { PrebidServer as Adapter, resetSyncedStatus, resetWurlMap } from 'modules/prebidServerBidAdapter/index.js';
import adapterManager from 'src/adapterManager.js';
import * as utils from 'src/utils.js';
import { ajax } from 'src/ajax.js';
import { config } from 'src/config.js';
import events from 'src/events.js';
import CONSTANTS from 'src/constants.json';
import { server } from 'test/mocks/xhr.js';
import { createEidsArray } from 'modules/userId/eids.js';

let CONFIG = {
  accountId: '1',
  enabled: true,
  bidders: ['appnexus'],
  timeout: 1000,
  cacheMarkup: 2,
  endpoint: 'https://prebid.adnxs.com/pbs/v1/openrtb2/auction'
};

const REQUEST = {
  'account_id': '1',
  'tid': '437fbbf5-33f5-487a-8e16-a7112903cfe5',
  'max_bids': 1,
  'timeout_millis': 1000,
  'secure': 0,
  'url': '',
  'prebid_version': '0.30.0-pre',
  's2sConfig': CONFIG,
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
          'icon': {
            'required': true,
            'aspect_ratios': [{
              'min_height': 10,
              'min_width': 10,
              'ratio_height': 1,
              'ratio_width': 1
            }]
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
  's2sConfig': CONFIG,
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
  's2sConfig': CONFIG,
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
  ],
};

let BID_REQUESTS;

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
          'dealid': 'test-dealid',
          'w': 300,
          'h': 250,
          'ext': {
            'prebid': {
              'type': 'banner',
              'event': {
                'win': 'http://wurl.org?id=333'
              }
            },
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
  'cur': 'EUR',
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
          dealid: 'test-dealid',
          w: 1,
          h: 1,
          ext: {
            prebid: {
              type: 'video',
              bidid: '654321'
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
                'id': 2,
                'img': {
                  'url': 'https://vcdn.adnxs.com/p/creative-image/1a/3e/e9/5b/1a3ee95b-06cd-4260-98c7-0258627c9197.png',
                  'w': 127,
                  'h': 83,
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
                'id': 3,
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

describe('S2S Adapter', function () {
  let adapter,
    addBidResponse = sinon.spy(),
    done = sinon.spy();

  beforeEach(function () {
    config.resetConfig();
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
            'auctionId': '173afb6d132ba3',
            'storedAuctionResponse': 11111
          }
        ],
        'auctionStart': 1510852447530,
        'timeout': 5000,
        'src': 's2s',
        'doneCbCallCount': 0,
        'refererInfo': {
          'referer': 'http://mytestpage.com'
        }
      }
    ];
  });

  afterEach(function () {
    addBidResponse.resetHistory();
    done.resetHistory();
  });

  after(function () {
    config.resetConfig();
  });

  describe('request function', function () {
    beforeEach(function () {
      resetSyncedStatus();
    });

    it('should not add outstrean without renderer', function () {
      config.setConfig({ s2sConfig: CONFIG });

      adapter.callBids(OUTSTREAM_VIDEO_REQUEST, BID_REQUESTS, addBidResponse, done, ajax);

      const requestBid = JSON.parse(server.requests[0].requestBody);
      expect(requestBid.imp[0].banner).to.exist;
      expect(requestBid.imp[0].video).to.not.exist;
    });

    it('should default video placement if not defined and instream', function () {
      let ortb2Config = utils.deepClone(CONFIG);
      ortb2Config.endpoint = 'https://prebid.adnxs.com/pbs/v1/openrtb2/auction';

      config.setConfig({ s2sConfig: ortb2Config });

      let videoBid = utils.deepClone(VIDEO_REQUEST);
      videoBid.ad_units[0].mediaTypes.video.context = 'instream';
      adapter.callBids(videoBid, BID_REQUESTS, addBidResponse, done, ajax);

      const requestBid = JSON.parse(server.requests[0].requestBody);
      expect(requestBid.imp[0].banner).to.not.exist;
      expect(requestBid.imp[0].video).to.exist;
      expect(requestBid.imp[0].video.placement).to.equal(1);
    });

    it('exists and is a function', function () {
      expect(adapter.callBids).to.exist.and.to.be.a('function');
    });

    describe('gdpr tests', function () {
      afterEach(function () {
        $$PREBID_GLOBAL$$.requestBids.removeAll();
      });

      it('adds gdpr consent information to ortb2 request depending on presence of module', function () {
        let consentConfig = { consentManagement: { cmpApi: 'iab' }, s2sConfig: CONFIG };
        config.setConfig(consentConfig);

        let gdprBidRequest = utils.deepClone(BID_REQUESTS);
        gdprBidRequest[0].gdprConsent = {
          consentString: 'abc123',
          gdprApplies: true
        };

        adapter.callBids(REQUEST, gdprBidRequest, addBidResponse, done, ajax);
        let requestBid = JSON.parse(server.requests[0].requestBody);

        expect(requestBid.regs.ext.gdpr).is.equal(1);
        expect(requestBid.user.ext.consent).is.equal('abc123');

        config.resetConfig();
        config.setConfig({ s2sConfig: CONFIG });

        adapter.callBids(REQUEST, BID_REQUESTS, addBidResponse, done, ajax);
        requestBid = JSON.parse(server.requests[1].requestBody);

        expect(requestBid.regs).to.not.exist;
        expect(requestBid.user).to.not.exist;
      });

      it('adds additional consent information to ortb2 request depending on presence of module', function () {
        let consentConfig = { consentManagement: { cmpApi: 'iab' }, s2sConfig: CONFIG };
        config.setConfig(consentConfig);

        let gdprBidRequest = utils.deepClone(BID_REQUESTS);
        gdprBidRequest[0].gdprConsent = {
          consentString: 'abc123',
          addtlConsent: 'superduperconsent',
          gdprApplies: true
        };

        adapter.callBids(REQUEST, gdprBidRequest, addBidResponse, done, ajax);
        let requestBid = JSON.parse(server.requests[0].requestBody);

        expect(requestBid.regs.ext.gdpr).is.equal(1);
        expect(requestBid.user.ext.consent).is.equal('abc123');
        expect(requestBid.user.ext.ConsentedProvidersSettings.consented_providers).is.equal('superduperconsent');

        config.resetConfig();
        config.setConfig({ s2sConfig: CONFIG });

        adapter.callBids(REQUEST, BID_REQUESTS, addBidResponse, done, ajax);
        requestBid = JSON.parse(server.requests[1].requestBody);

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

        const s2sBidRequest = utils.deepClone(REQUEST);
        s2sBidRequest.s2sConfig = cookieSyncConfig;

        adapter.callBids(s2sBidRequest, gdprBidRequest, addBidResponse, done, ajax);
        let requestBid = JSON.parse(server.requests[0].requestBody);

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

        const s2sBidRequest = utils.deepClone(REQUEST);
        s2sBidRequest.s2sConfig = cookieSyncConfig;

        let gdprBidRequest = utils.deepClone(BID_REQUESTS);
        gdprBidRequest[0].gdprConsent = {
          consentString: 'xyz789abcc',
          gdprApplies: false
        };

        adapter.callBids(s2sBidRequest, gdprBidRequest, addBidResponse, done, ajax);
        let requestBid = JSON.parse(server.requests[0].requestBody);

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

        const s2sBidRequest = utils.deepClone(REQUEST);
        s2sBidRequest.s2sConfig = cookieSyncConfig;

        adapter.callBids(s2sBidRequest, gdprBidRequest, addBidResponse, done, ajax);
        let requestBid = JSON.parse(server.requests[0].requestBody);

        expect(requestBid.gdpr).is.undefined;
        expect(requestBid.gdpr_consent).is.undefined;
      });
    });

    describe('us_privacy (ccpa) consent data', function () {
      afterEach(function () {
        $$PREBID_GLOBAL$$.requestBids.removeAll();
      });

      it('is added to ortb2 request when in bidRequest', function () {
        config.setConfig({ s2sConfig: CONFIG });

        let uspBidRequest = utils.deepClone(BID_REQUESTS);
        uspBidRequest[0].uspConsent = '1NYN';

        adapter.callBids(REQUEST, uspBidRequest, addBidResponse, done, ajax);
        let requestBid = JSON.parse(server.requests[0].requestBody);

        expect(requestBid.regs.ext.us_privacy).is.equal('1NYN');

        config.resetConfig();
        config.setConfig({ s2sConfig: CONFIG });

        adapter.callBids(REQUEST, BID_REQUESTS, addBidResponse, done, ajax);
        requestBid = JSON.parse(server.requests[1].requestBody);

        expect(requestBid.regs).to.not.exist;
      });

      it('is added to cookie_sync request when in bidRequest', function () {
        let cookieSyncConfig = utils.deepClone(CONFIG);
        cookieSyncConfig.syncEndpoint = 'https://prebid.adnxs.com/pbs/v1/cookie_sync';
        config.setConfig({ s2sConfig: cookieSyncConfig });

        let uspBidRequest = utils.deepClone(BID_REQUESTS);
        uspBidRequest[0].uspConsent = '1YNN';

        const s2sBidRequest = utils.deepClone(REQUEST);
        s2sBidRequest.s2sConfig = cookieSyncConfig;

        adapter.callBids(s2sBidRequest, uspBidRequest, addBidResponse, done, ajax);
        let requestBid = JSON.parse(server.requests[0].requestBody);

        expect(requestBid.us_privacy).is.equal('1YNN');
        expect(requestBid.bidders).to.contain('appnexus').and.to.have.lengthOf(1);
        expect(requestBid.account).is.equal('1');
      });
    });

    describe('gdpr and us_privacy (ccpa) consent data', function () {
      afterEach(function () {
        $$PREBID_GLOBAL$$.requestBids.removeAll();
      });

      it('is added to ortb2 request when in bidRequest', function () {
        config.setConfig({ s2sConfig: CONFIG });

        let consentBidRequest = utils.deepClone(BID_REQUESTS);
        consentBidRequest[0].uspConsent = '1NYN';
        consentBidRequest[0].gdprConsent = {
          consentString: 'abc123',
          gdprApplies: true
        };

        adapter.callBids(REQUEST, consentBidRequest, addBidResponse, done, ajax);
        let requestBid = JSON.parse(server.requests[0].requestBody);

        expect(requestBid.regs.ext.us_privacy).is.equal('1NYN');
        expect(requestBid.regs.ext.gdpr).is.equal(1);
        expect(requestBid.user.ext.consent).is.equal('abc123');

        config.resetConfig();
        config.setConfig({ s2sConfig: CONFIG });

        adapter.callBids(REQUEST, BID_REQUESTS, addBidResponse, done, ajax);
        requestBid = JSON.parse(server.requests[1].requestBody);

        expect(requestBid.regs).to.not.exist;
        expect(requestBid.user).to.not.exist;
      });

      it('is added to cookie_sync request when in bidRequest', function () {
        let cookieSyncConfig = utils.deepClone(CONFIG);
        cookieSyncConfig.syncEndpoint = 'https://prebid.adnxs.com/pbs/v1/cookie_sync';
        config.setConfig({ s2sConfig: cookieSyncConfig });

        let consentBidRequest = utils.deepClone(BID_REQUESTS);
        consentBidRequest[0].uspConsent = '1YNN';
        consentBidRequest[0].gdprConsent = {
          consentString: 'abc123def',
          gdprApplies: true
        };

        const s2sBidRequest = utils.deepClone(REQUEST);
        s2sBidRequest.s2sConfig = cookieSyncConfig

        adapter.callBids(s2sBidRequest, consentBidRequest, addBidResponse, done, ajax);
        let requestBid = JSON.parse(server.requests[0].requestBody);

        expect(requestBid.us_privacy).is.equal('1YNN');
        expect(requestBid.gdpr).is.equal(1);
        expect(requestBid.gdpr_consent).is.equal('abc123def');
        expect(requestBid.bidders).to.contain('appnexus').and.to.have.lengthOf(1);
        expect(requestBid.account).is.equal('1');
      });
    });

    it('adds device and app objects to request', function () {
      const _config = {
        s2sConfig: CONFIG,
        device: { ifa: '6D92078A-8246-4BA4-AE5B-76104861E7DC' },
        app: { bundle: 'com.test.app' },
      };

      config.setConfig(_config);
      adapter.callBids(REQUEST, BID_REQUESTS, addBidResponse, done, ajax);
      const requestBid = JSON.parse(server.requests[0].requestBody);
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
      const requestBid = JSON.parse(server.requests[0].requestBody);
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

    it('adds debugging value from storedAuctionResponse to OpenRTB', function () {
      const _config = {
        s2sConfig: CONFIG,
        device: { ifa: '6D92078A-8246-4BA4-AE5B-76104861E7DC' },
        app: { bundle: 'com.test.app' }
      };

      config.setConfig(_config);
      adapter.callBids(REQUEST, BID_REQUESTS, addBidResponse, done, ajax);
      const requestBid = JSON.parse(server.requests[0].requestBody);
      expect(requestBid.imp).to.exist.and.to.be.a('array');
      expect(requestBid.imp).to.have.lengthOf(1);
      expect(requestBid.imp[0].ext).to.exist.and.to.be.a('object');
      expect(requestBid.imp[0].ext.prebid).to.exist.and.to.be.a('object');
      expect(requestBid.imp[0].ext.prebid.storedauctionresponse).to.exist.and.to.be.a('object');
      expect(requestBid.imp[0].ext.prebid.storedauctionresponse.id).to.equal('11111');
    });

    describe('price floors module', function () {
      function runTest(expectedFloor, expectedCur) {
        adapter.callBids(REQUEST, BID_REQUESTS, addBidResponse, done, ajax);
        const requestBid = JSON.parse(server.requests[requestCount].requestBody);
        expect(requestBid.imp[0].bidfloor).to.equal(expectedFloor);
        expect(requestBid.imp[0].bidfloorcur).to.equal(expectedCur);
        requestCount += 1;
      }

      let getFloorResponse, requestCount;
      beforeEach(function () {
        getFloorResponse = {};
        requestCount = 0;
      });

      it('should NOT pass bidfloor and bidfloorcur when getFloor not present or returns invalid response', function () {
        const _config = {
          s2sConfig: CONFIG,
        };

        config.setConfig(_config);

        // if no get floor
        runTest(undefined, undefined);

        // if getFloor returns empty object
        BID_REQUESTS[0].bids[0].getFloor = () => getFloorResponse;
        sinon.spy(BID_REQUESTS[0].bids[0], 'getFloor');

        runTest(undefined, undefined);
        // make sure getFloor was called
        expect(
          BID_REQUESTS[0].bids[0].getFloor.calledWith({
            currency: 'USD',
          })
        ).to.be.true;

        // if getFloor does not return number
        getFloorResponse = {currency: 'EUR', floor: 'not a number'};
        runTest(undefined, undefined);

        // if getFloor does not return currency
        getFloorResponse = {floor: 1.1};
        runTest(undefined, undefined);
      });

      it('should correctly pass bidfloor and bidfloorcur', function () {
        const _config = {
          s2sConfig: CONFIG,
        };

        config.setConfig(_config);

        BID_REQUESTS[0].bids[0].getFloor = () => getFloorResponse;
        sinon.spy(BID_REQUESTS[0].bids[0], 'getFloor');

        // returns USD and string floor
        getFloorResponse = {currency: 'USD', floor: '1.23'};
        runTest(1.23, 'USD');
        // make sure getFloor was called
        expect(
          BID_REQUESTS[0].bids[0].getFloor.calledWith({
            currency: 'USD',
          })
        ).to.be.true;

        // returns non USD and number floor
        getFloorResponse = {currency: 'EUR', floor: 0.85};
        runTest(0.85, 'EUR');
      });

      it('should correctly pass adServerCurrency when set to getFloor not default', function () {
        config.setConfig({
          s2sConfig: CONFIG,
          currency: { adServerCurrency: 'JPY' },
        });

        // we have to start requestCount at 1 because a conversion rates fetch occurs when adServerCur is not USD!
        requestCount = 1;

        BID_REQUESTS[0].bids[0].getFloor = () => getFloorResponse;
        sinon.spy(BID_REQUESTS[0].bids[0], 'getFloor');

        // returns USD and string floor
        getFloorResponse = {currency: 'JPY', floor: 97.2};
        runTest(97.2, 'JPY');
        // make sure getFloor was called with JPY
        expect(
          BID_REQUESTS[0].bids[0].getFloor.calledWith({
            currency: 'JPY',
          })
        ).to.be.true;
      });
    });

    it('adds device.w and device.h even if the config lacks a device object', function () {
      const _config = {
        s2sConfig: CONFIG,
        app: { bundle: 'com.test.app' },
      };

      config.setConfig(_config);
      adapter.callBids(REQUEST, BID_REQUESTS, addBidResponse, done, ajax);
      const requestBid = JSON.parse(server.requests[0].requestBody);
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
      const _config = {
        s2sConfig: CONFIG
      };

      config.setConfig(_config);
      adapter.callBids(REQUEST, BID_REQUESTS, addBidResponse, done, ajax);
      const requestBid = JSON.parse(server.requests[0].requestBody);

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
              'img': {
                'type': 1,
                'wmin': 10,
                'hmin': 10,
                'ext': {
                  'aspectratios': ['1:1']
                }
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
      const _config = {
        s2sConfig: CONFIG,
        site: {
          publisher: {
            id: '1234',
            domain: 'test.com'
          },
          content: {
            language: 'en'
          }
        }
      };

      config.setConfig(_config);
      adapter.callBids(REQUEST, BID_REQUESTS, addBidResponse, done, ajax);
      const requestBid = JSON.parse(server.requests[0].requestBody);
      expect(requestBid.site).to.exist.and.to.be.a('object');
      expect(requestBid.site.publisher).to.exist.and.to.be.a('object');
      expect(requestBid.site.publisher.id).to.exist.and.to.be.a('string');
      expect(requestBid.site.publisher.domain).to.exist.and.to.be.a('string');
      expect(requestBid.site.page).to.exist.and.to.be.a('string');
      expect(requestBid.site.content).to.exist.and.to.be.a('object');
      expect(requestBid.site.content.language).to.exist.and.to.be.a('string');
      expect(requestBid.site).to.deep.equal({
        publisher: {
          id: '1234',
          domain: 'test.com'
        },
        content: {
          language: 'en'
        },
        page: 'http://mytestpage.com'
      });
    });

    it('adds appnexus aliases to request', function () {
      config.setConfig({ s2sConfig: CONFIG });

      const aliasBidder = {
        bidder: 'brealtime',
        params: { placementId: '123456' }
      };

      const request = utils.deepClone(REQUEST);
      request.ad_units[0].bids = [aliasBidder];

      adapter.callBids(request, BID_REQUESTS, addBidResponse, done, ajax);

      const requestBid = JSON.parse(server.requests[0].requestBody);
      expect(requestBid.ext).to.haveOwnProperty('prebid');
      expect(requestBid.ext.prebid).to.deep.include({
        aliases: {
          brealtime: 'appnexus'
        },
        auctiontimestamp: 1510852447530,
        targeting: {
          includebidderkeys: false,
          includewinners: true
        }
      });
    });

    it('adds dynamic aliases to request', function () {
      config.setConfig({ s2sConfig: CONFIG });

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

      const requestBid = JSON.parse(server.requests[0].requestBody);
      expect(requestBid.ext).to.haveOwnProperty('prebid');
      expect(requestBid.ext.prebid).to.deep.include({
        aliases: {
          [alias]: 'appnexus'
        },
        auctiontimestamp: 1510852447530,
        targeting: {
          includebidderkeys: false,
          includewinners: true
        }
      });
    });

    it('skips pbs alias when skipPbsAliasing is enabled in adapter', function() {
      const s2sConfig = Object.assign({}, CONFIG, {
        endpoint: 'https://prebid.adnxs.com/pbs/v1/openrtb2/auction'
      });
      config.setConfig({ s2sConfig: s2sConfig });

      const aliasBidder = {
        bidder: 'mediafuse',
        params: { aid: 123 }
      };

      const request = utils.deepClone(REQUEST);
      request.ad_units[0].bids = [aliasBidder];

      adapter.callBids(request, BID_REQUESTS, addBidResponse, done, ajax);

      const requestBid = JSON.parse(server.requests[0].requestBody);

      expect(requestBid.ext).to.deep.equal({
        prebid: {
          auctiontimestamp: 1510852447530,
          targeting: {
            includebidderkeys: false,
            includewinners: true
          }
        }
      });
    });

    it('skips dynamic aliases to request when skipPbsAliasing enabled', function () {
      const s2sConfig = Object.assign({}, CONFIG, {
        endpoint: 'https://prebid.adnxs.com/pbs/v1/openrtb2/auction'
      });
      config.setConfig({ s2sConfig: s2sConfig });

      const alias = 'foobar_1';
      const aliasBidder = {
        bidder: alias,
        params: { aid: 123456 }
      };

      const request = utils.deepClone(REQUEST);
      request.ad_units[0].bids = [aliasBidder];

      // TODO: stub this
      $$PREBID_GLOBAL$$.aliasBidder('appnexus', alias, { skipPbsAliasing: true });
      adapter.callBids(request, BID_REQUESTS, addBidResponse, done, ajax);

      const requestBid = JSON.parse(server.requests[0].requestBody);

      expect(requestBid.ext).to.deep.equal({
        prebid: {
          auctiontimestamp: 1510852447530,
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
      const requestBid = JSON.parse(server.requests[0].requestBody);

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
    });

    it('adds limit to the cookie_sync request if userSyncLimit is greater than 0', function () {
      let cookieSyncConfig = utils.deepClone(CONFIG);
      cookieSyncConfig.syncEndpoint = 'https://prebid.adnxs.com/pbs/v1/cookie_sync';
      cookieSyncConfig.userSyncLimit = 1;

      const s2sBidRequest = utils.deepClone(REQUEST);
      s2sBidRequest.s2sConfig = cookieSyncConfig;

      config.setConfig({ s2sConfig: cookieSyncConfig });

      let bidRequest = utils.deepClone(BID_REQUESTS);
      adapter.callBids(s2sBidRequest, bidRequest, addBidResponse, done, ajax);
      let requestBid = JSON.parse(server.requests[0].requestBody);

      expect(requestBid.bidders).to.contain('appnexus').and.to.have.lengthOf(1);
      expect(requestBid.account).is.equal('1');
      expect(requestBid.limit).is.equal(1);
    });

    it('does not add limit to cooke_sync request if userSyncLimit is missing or 0', function () {
      let cookieSyncConfig = utils.deepClone(CONFIG);
      cookieSyncConfig.syncEndpoint = 'https://prebid.adnxs.com/pbs/v1/cookie_sync';
      config.setConfig({ s2sConfig: cookieSyncConfig });

      const s2sBidRequest = utils.deepClone(REQUEST);
      s2sBidRequest.s2sConfig = cookieSyncConfig;

      let bidRequest = utils.deepClone(BID_REQUESTS);
      adapter.callBids(s2sBidRequest, bidRequest, addBidResponse, done, ajax);
      let requestBid = JSON.parse(server.requests[0].requestBody);

      expect(requestBid.bidders).to.contain('appnexus').and.to.have.lengthOf(1);
      expect(requestBid.account).is.equal('1');
      expect(requestBid.limit).is.undefined;

      cookieSyncConfig.userSyncLimit = 0;
      config.resetConfig();
      config.setConfig({ s2sConfig: cookieSyncConfig });

      const s2sBidRequest2 = utils.deepClone(REQUEST);
      s2sBidRequest2.s2sConfig = cookieSyncConfig;

      bidRequest = utils.deepClone(BID_REQUESTS);
      adapter.callBids(s2sBidRequest2, bidRequest, addBidResponse, done, ajax);
      requestBid = JSON.parse(server.requests[0].requestBody);

      expect(requestBid.bidders).to.contain('appnexus').and.to.have.lengthOf(1);
      expect(requestBid.account).is.equal('1');
      expect(requestBid.limit).is.undefined;
    });

    it('adds s2sConfig adapterOptions to request for ORTB', function () {
      const s2sConfig = Object.assign({}, CONFIG, {
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

      const s2sBidRequest = utils.deepClone(REQUEST);
      s2sBidRequest.s2sConfig = s2sConfig;

      config.setConfig(_config);
      adapter.callBids(s2sBidRequest, BID_REQUESTS, addBidResponse, done, ajax);
      const requestBid = JSON.parse(server.requests[0].requestBody);
      expect(requestBid.imp[0].ext.appnexus).to.haveOwnProperty('key');
      expect(requestBid.imp[0].ext.appnexus.key).to.be.equal('value')
    });

    describe('config site value is added to the oRTB request', function () {
      const s2sConfig = Object.assign({}, CONFIG, {
        adapterOptions: {
          appnexus: {
            key: 'value'
          }
        }
      });
      const device = {
        ua: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_12_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.36',
        ip: '75.97.0.47'
      };

      const s2sBidRequest = utils.deepClone(REQUEST);
      s2sBidRequest.s2sConfig = s2sConfig;

      it('and overrides publisher and page', function () {
        config.setConfig({
          s2sConfig: s2sConfig,
          site: {
            domain: 'nytimes.com',
            page: 'http://www.nytimes.com',
            publisher: { id: '2' }
          },
          device: device
        });

        adapter.callBids(s2sBidRequest, BID_REQUESTS, addBidResponse, done, ajax);
        const requestBid = JSON.parse(server.requests[0].requestBody);

        expect(requestBid.site).to.exist.and.to.be.a('object');
        expect(requestBid.site.domain).to.equal('nytimes.com');
        expect(requestBid.site.page).to.equal('http://www.nytimes.com');
        expect(requestBid.site.publisher).to.exist.and.to.be.a('object');
        expect(requestBid.site.publisher.id).to.equal('2');
      });

      it('and merges domain and page with the config site value', function () {
        config.setConfig({
          s2sConfig: s2sConfig,
          site: {
            foo: 'bar'
          },
          device: device
        });

        adapter.callBids(s2sBidRequest, BID_REQUESTS, addBidResponse, done, ajax);

        const requestBid = JSON.parse(server.requests[0].requestBody);
        expect(requestBid.site).to.exist.and.to.be.a('object');
        expect(requestBid.site.foo).to.equal('bar');
        expect(requestBid.site.page).to.equal('http://mytestpage.com');
        expect(requestBid.site.publisher).to.exist.and.to.be.a('object');
        expect(requestBid.site.publisher.id).to.equal('1');
      });
    });

    it('when userId is defined on bids, it\'s properties should be copied to user.ext.tpid properties', function () {
      let consentConfig = { s2sConfig: CONFIG };
      config.setConfig(consentConfig);

      let userIdBidRequest = utils.deepClone(BID_REQUESTS);
      userIdBidRequest[0].bids[0].userId = {
        criteoId: '44VmRDeUE3ZGJ5MzRkRVJHU3BIUlJ6TlFPQUFU',
        tdid: 'abc123',
        pubcid: '1234',
        parrableId: { eid: '01.1563917337.test-eid' },
        lipb: {
          lipbid: 'li-xyz',
          segments: ['segA', 'segB']
        },
        idl_env: '0000-1111-2222-3333',
        id5id: {
          uid: '11111',
          ext: {
            linkType: 'some-link-type'
          }
        }
      };
      userIdBidRequest[0].bids[0].userIdAsEids = createEidsArray(userIdBidRequest[0].bids[0].userId);

      adapter.callBids(REQUEST, userIdBidRequest, addBidResponse, done, ajax);
      let requestBid = JSON.parse(server.requests[0].requestBody);
      expect(typeof requestBid.user.ext.eids).is.equal('object');
      expect(Array.isArray(requestBid.user.ext.eids)).to.be.true;
      expect(requestBid.user.ext.eids.filter(eid => eid.source === 'adserver.org')).is.not.empty;
      expect(requestBid.user.ext.eids.filter(eid => eid.source === 'adserver.org')[0].uids[0].id).is.equal('abc123');
      expect(requestBid.user.ext.eids.filter(eid => eid.source === 'criteo.com')).is.not.empty;
      expect(requestBid.user.ext.eids.filter(eid => eid.source === 'criteo.com')[0].uids[0].id).is.equal('44VmRDeUE3ZGJ5MzRkRVJHU3BIUlJ6TlFPQUFU');
      expect(requestBid.user.ext.eids.filter(eid => eid.source === 'pubcid.org')).is.not.empty;
      expect(requestBid.user.ext.eids.filter(eid => eid.source === 'pubcid.org')[0].uids[0].id).is.equal('1234');
      expect(requestBid.user.ext.eids.filter(eid => eid.source === 'parrable.com')).is.not.empty;
      expect(requestBid.user.ext.eids.filter(eid => eid.source === 'parrable.com')[0].uids[0].id).is.equal('01.1563917337.test-eid');
      expect(requestBid.user.ext.eids.filter(eid => eid.source === 'liveintent.com')).is.not.empty;
      expect(requestBid.user.ext.eids.filter(eid => eid.source === 'liveintent.com')[0].uids[0].id).is.equal('li-xyz');
      expect(requestBid.user.ext.eids.filter(eid => eid.source === 'liveintent.com')[0].ext.segments.length).is.equal(2);
      expect(requestBid.user.ext.eids.filter(eid => eid.source === 'liveintent.com')[0].ext.segments[0]).is.equal('segA');
      expect(requestBid.user.ext.eids.filter(eid => eid.source === 'liveintent.com')[0].ext.segments[1]).is.equal('segB');
      expect(requestBid.user.ext.eids.filter(eid => eid.source === 'id5-sync.com')).is.not.empty;
      expect(requestBid.user.ext.eids.filter(eid => eid.source === 'id5-sync.com')[0].uids[0].id).is.equal('11111');
      expect(requestBid.user.ext.eids.filter(eid => eid.source === 'id5-sync.com')[0].uids[0].ext.linkType).is.equal('some-link-type');
      // LiveRamp should exist
      expect(requestBid.user.ext.eids.filter(eid => eid.source === 'liveramp.com')[0].uids[0].id).is.equal('0000-1111-2222-3333');
    });

    it('when config \'currency.adServerCurrency\' value is an array: ORTB has property \'cur\' value set to a single item array', function () {
      config.setConfig({
        currency: { adServerCurrency: ['USD', 'GB', 'UK', 'AU'] },
      });

      const bidRequests = utils.deepClone(BID_REQUESTS);
      adapter.callBids(REQUEST, bidRequests, addBidResponse, done, ajax);

      const parsedRequestBody = JSON.parse(server.requests[0].requestBody);
      expect(parsedRequestBody.cur).to.deep.equal(['USD']);
    });

    it('when config \'currency.adServerCurrency\' value is a string: ORTB has property \'cur\' value set to a single item array', function () {
      config.setConfig({
        currency: { adServerCurrency: 'NZ' },
      });

      const bidRequests = utils.deepClone(BID_REQUESTS);
      adapter.callBids(REQUEST, bidRequests, addBidResponse, done, ajax);

      const parsedRequestBody = JSON.parse(server.requests[1].requestBody);
      expect(parsedRequestBody.cur).to.deep.equal(['NZ']);
    });

    it('when config \'currency.adServerCurrency\' is unset: ORTB should not define a \'cur\' property', function () {
      config.setConfig({ s2sConfig: CONFIG });

      const bidRequests = utils.deepClone(BID_REQUESTS);
      adapter.callBids(REQUEST, bidRequests, addBidResponse, done, ajax);

      const parsedRequestBody = JSON.parse(server.requests[0].requestBody);
      expect(typeof parsedRequestBody.cur).to.equal('undefined');
    });

    it('always add ext.prebid.targeting.includebidderkeys: false for ORTB', function () {
      const s2sConfig = Object.assign({}, CONFIG, {
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

      const s2sBidRequest = utils.deepClone(REQUEST);
      s2sBidRequest.s2sConfig = s2sConfig;

      adapter.callBids(s2sBidRequest, BID_REQUESTS, addBidResponse, done, ajax);
      const requestBid = JSON.parse(server.requests[0].requestBody);

      expect(requestBid.ext.prebid.targeting).to.haveOwnProperty('includebidderkeys');
      expect(requestBid.ext.prebid.targeting.includebidderkeys).to.equal(false);
    });

    it('always add ext.prebid.targeting.includewinners: true for ORTB', function () {
      const s2sConfig = Object.assign({}, CONFIG, {
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

      const s2sBidRequest = utils.deepClone(REQUEST);
      s2sBidRequest.s2sConfig = s2sConfig;

      adapter.callBids(s2sBidRequest, BID_REQUESTS, addBidResponse, done, ajax);
      const requestBid = JSON.parse(server.requests[0].requestBody);

      expect(requestBid.ext.prebid.targeting).to.haveOwnProperty('includewinners');
      expect(requestBid.ext.prebid.targeting.includewinners).to.equal(true);
    });

    it('adds s2sConfig video.ext.prebid to request for ORTB', function () {
      const s2sConfig = Object.assign({}, CONFIG, {
        extPrebid: {
          foo: 'bar'
        }
      });
      const _config = {
        s2sConfig: s2sConfig,
        device: { ifa: '6D92078A-8246-4BA4-AE5B-76104861E7DC' },
        app: { bundle: 'com.test.app' },
      };

      const s2sBidRequest = utils.deepClone(REQUEST);
      s2sBidRequest.s2sConfig = s2sConfig;

      config.setConfig(_config);
      adapter.callBids(s2sBidRequest, BID_REQUESTS, addBidResponse, done, ajax);
      const requestBid = JSON.parse(server.requests[0].requestBody);

      expect(requestBid).to.haveOwnProperty('ext');
      expect(requestBid.ext).to.haveOwnProperty('prebid');
      expect(requestBid.ext.prebid).to.deep.include({
        auctiontimestamp: 1510852447530,
        foo: 'bar',
        targeting: {
          includewinners: true,
          includebidderkeys: false
        }
      });
    });

    it('overrides request.ext.prebid properties using s2sConfig video.ext.prebid values for ORTB', function () {
      const s2sConfig = Object.assign({}, CONFIG, {
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

      const s2sBidRequest = utils.deepClone(REQUEST);
      s2sBidRequest.s2sConfig = s2sConfig;

      config.setConfig(_config);
      adapter.callBids(s2sBidRequest, BID_REQUESTS, addBidResponse, done, ajax);
      const requestBid = JSON.parse(server.requests[0].requestBody);

      expect(requestBid).to.haveOwnProperty('ext');
      expect(requestBid.ext).to.haveOwnProperty('prebid');
      expect(requestBid.ext.prebid).to.deep.include({
        auctiontimestamp: 1510852447530,
        targeting: {
          includewinners: false,
          includebidderkeys: true
        }
      });
    });

    it('overrides request.ext.prebid properties using s2sConfig video.ext.prebid values for ORTB', function () {
      const s2sConfig = Object.assign({}, CONFIG, {
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

      const s2sBidRequest = utils.deepClone(REQUEST);
      s2sBidRequest.s2sConfig = s2sConfig;

      config.setConfig(_config);
      adapter.callBids(s2sBidRequest, BID_REQUESTS, addBidResponse, done, ajax);
      const requestBid = JSON.parse(server.requests[0].requestBody);

      expect(requestBid).to.haveOwnProperty('ext');
      expect(requestBid.ext).to.haveOwnProperty('prebid');
      expect(requestBid.ext.prebid).to.deep.include({
        auctiontimestamp: 1510852447530,
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
      const parsedRequestBody = JSON.parse(server.requests[0].requestBody);
      expect(parsedRequestBody.source.ext.schain).to.deep.equal(schainObject);
    });

    it('passes first party data in request', () => {
      const s2sBidRequest = utils.deepClone(REQUEST);
      const bidRequests = utils.deepClone(BID_REQUESTS);

      const commonContext = {
        keywords: ['power tools'],
        search: 'drill'
      };
      const commonUser = {
        keywords: ['a', 'b'],
        gender: 'M'
      };

      const context = {
        content: { userrating: 4 },
        data: {
          pageType: 'article',
          category: 'tools'
        }
      };
      const user = {
        yob: '1984',
        geo: { country: 'ca' },
        data: {
          registered: true,
          interests: ['cars']
        }
      };
      const allowedBidders = [ 'rubicon', 'appnexus' ];

      const expected = allowedBidders.map(bidder => ({
        bidders: [ bidder ],
        config: { fpd: { site: context, user } }
      }));

      config.setConfig({ fpd: { context: commonContext, user: commonUser } });
      config.setBidderConfig({ bidders: allowedBidders, config: { fpd: { context, user } } });
      adapter.callBids(s2sBidRequest, bidRequests, addBidResponse, done, ajax);
      const parsedRequestBody = JSON.parse(server.requests[0].requestBody);
      expect(parsedRequestBody.ext.prebid.bidderconfig).to.deep.equal(expected);
      expect(parsedRequestBody.site.ext.data).to.deep.equal(commonContext);
      expect(parsedRequestBody.user.ext.data).to.deep.equal(commonUser);
    });

    describe('pbAdSlot config', function () {
      it('should not send \"imp.ext.context.data.pbadslot\" if \"fpd.context\" is undefined', function () {
        const consentConfig = { s2sConfig: CONFIG };
        config.setConfig(consentConfig);
        const bidRequest = utils.deepClone(REQUEST);

        adapter.callBids(bidRequest, BID_REQUESTS, addBidResponse, done, ajax);
        const parsedRequestBody = JSON.parse(server.requests[0].requestBody);

        expect(parsedRequestBody.imp).to.be.a('array');
        expect(parsedRequestBody.imp[0]).to.be.a('object');
        expect(parsedRequestBody.imp[0]).to.not.have.deep.nested.property('ext.context.data.pbadslot');
      });

      it('should not send \"imp.ext.context.data.pbadslot\" if \"fpd.context.pbAdSlot\" is undefined', function () {
        const consentConfig = { s2sConfig: CONFIG };
        config.setConfig(consentConfig);
        const bidRequest = utils.deepClone(REQUEST);
        bidRequest.ad_units[0].fpd = {};

        adapter.callBids(bidRequest, BID_REQUESTS, addBidResponse, done, ajax);
        const parsedRequestBody = JSON.parse(server.requests[0].requestBody);

        expect(parsedRequestBody.imp).to.be.a('array');
        expect(parsedRequestBody.imp[0]).to.be.a('object');
        expect(parsedRequestBody.imp[0]).to.not.have.deep.nested.property('ext.context.data.pbadslot');
      });

      it('should not send \"imp.ext.context.data.pbadslot\" if \"fpd.context.pbAdSlot\" is empty string', function () {
        const consentConfig = { s2sConfig: CONFIG };
        config.setConfig(consentConfig);
        const bidRequest = utils.deepClone(REQUEST);
        bidRequest.ad_units[0].fpd = {
          context: {
            pbAdSlot: ''
          }
        };

        adapter.callBids(bidRequest, BID_REQUESTS, addBidResponse, done, ajax);
        const parsedRequestBody = JSON.parse(server.requests[0].requestBody);

        expect(parsedRequestBody.imp).to.be.a('array');
        expect(parsedRequestBody.imp[0]).to.be.a('object');
        expect(parsedRequestBody.imp[0]).to.not.have.deep.nested.property('ext.context.data.pbadslot');
      });

      it('should send \"imp.ext.context.data.pbadslot\" if \"fpd.context.pbAdSlot\" value is a non-empty string', function () {
        const consentConfig = { s2sConfig: CONFIG };
        config.setConfig(consentConfig);
        const bidRequest = utils.deepClone(REQUEST);
        bidRequest.ad_units[0].fpd = {
          context: {
            pbAdSlot: '/a/b/c'
          }
        };

        adapter.callBids(bidRequest, BID_REQUESTS, addBidResponse, done, ajax);
        const parsedRequestBody = JSON.parse(server.requests[0].requestBody);

        expect(parsedRequestBody.imp).to.be.a('array');
        expect(parsedRequestBody.imp[0]).to.be.a('object');
        expect(parsedRequestBody.imp[0]).to.have.deep.nested.property('ext.context.data.pbadslot');
        expect(parsedRequestBody.imp[0].ext.context.data.pbadslot).to.equal('/a/b/c');
      });
    });

    describe('GAM ad unit config', function () {
      it('should not send \"imp.ext.context.data.adserver.adslot\" if \"fpd.context\" is undefined', function () {
        const consentConfig = { s2sConfig: CONFIG };
        config.setConfig(consentConfig);
        const bidRequest = utils.deepClone(REQUEST);

        adapter.callBids(bidRequest, BID_REQUESTS, addBidResponse, done, ajax);
        const parsedRequestBody = JSON.parse(server.requests[0].requestBody);

        expect(parsedRequestBody.imp).to.be.a('array');
        expect(parsedRequestBody.imp[0]).to.be.a('object');
        expect(parsedRequestBody.imp[0]).to.not.have.deep.nested.property('ext.context.data.adslot');
      });

      it('should not send \"imp.ext.context.data.adserver.adslot\" if \"fpd.context.adserver.adSlot\" is undefined', function () {
        const consentConfig = { s2sConfig: CONFIG };
        config.setConfig(consentConfig);
        const bidRequest = utils.deepClone(REQUEST);
        bidRequest.ad_units[0].fpd = {};

        adapter.callBids(bidRequest, BID_REQUESTS, addBidResponse, done, ajax);
        const parsedRequestBody = JSON.parse(server.requests[0].requestBody);

        expect(parsedRequestBody.imp).to.be.a('array');
        expect(parsedRequestBody.imp[0]).to.be.a('object');
        expect(parsedRequestBody.imp[0]).to.not.have.deep.nested.property('ext.context.data.adslot');
      });

      it('should not send \"imp.ext.context.data.adserver.adslot\" if \"fpd.context.adserver.adSlot\" is empty string', function () {
        const consentConfig = { s2sConfig: CONFIG };
        config.setConfig(consentConfig);
        const bidRequest = utils.deepClone(REQUEST);
        bidRequest.ad_units[0].fpd = {
          context: {
            adServer: {
              adSlot: ''
            }
          }
        };

        adapter.callBids(bidRequest, BID_REQUESTS, addBidResponse, done, ajax);
        const parsedRequestBody = JSON.parse(server.requests[0].requestBody);

        expect(parsedRequestBody.imp).to.be.a('array');
        expect(parsedRequestBody.imp[0]).to.be.a('object');
        expect(parsedRequestBody.imp[0]).to.not.have.deep.nested.property('ext.context.data.adslot');
      });

      it('should send both \"adslot\" and \"name\" from \"imp.ext.context.data.adserver\" if \"fpd.context.adserver.adSlot\" and \"fpd.context.adserver.name\" values are non-empty strings', function () {
        const consentConfig = { s2sConfig: CONFIG };
        config.setConfig(consentConfig);
        const bidRequest = utils.deepClone(REQUEST);
        bidRequest.ad_units[0].fpd = {
          context: {
            adserver: {
              adSlot: '/a/b/c',
              name: 'adserverName1'
            }
          }
        };

        adapter.callBids(bidRequest, BID_REQUESTS, addBidResponse, done, ajax);
        const parsedRequestBody = JSON.parse(server.requests[0].requestBody);

        expect(parsedRequestBody.imp).to.be.a('array');
        expect(parsedRequestBody.imp[0]).to.be.a('object');
        expect(parsedRequestBody.imp[0]).to.have.deep.nested.property('ext.context.data.adserver.adslot');
        expect(parsedRequestBody.imp[0]).to.have.deep.nested.property('ext.context.data.adserver.name');
        expect(parsedRequestBody.imp[0].ext.context.data.adserver.adslot).to.equal('/a/b/c');
        expect(parsedRequestBody.imp[0].ext.context.data.adserver.name).to.equal('adserverName1');
      });
    });
  });

  describe('response handler', function () {
    beforeEach(function () {
      sinon.stub(utils, 'triggerPixel');
      sinon.stub(utils, 'insertUserSyncIframe');
      sinon.stub(utils, 'logError');
      sinon.stub(events, 'emit');
    });

    afterEach(function () {
      utils.triggerPixel.restore();
      utils.insertUserSyncIframe.restore();
      utils.logError.restore();
      events.emit.restore();
    });

    // TODO: test dependent on pbjs_api_spec.  Needs to be isolated
    it('does not call addBidResponse and calls done when ad unit not set', function () {
      config.setConfig({ s2sConfig: CONFIG });
      adapter.callBids(REQUEST, BID_REQUESTS, addBidResponse, done, ajax);
      server.requests[0].respond(200, {}, JSON.stringify(RESPONSE_NO_BID_NO_UNIT));

      sinon.assert.notCalled(addBidResponse);
      sinon.assert.calledOnce(done);
    });

    it('does not call addBidResponse and calls done when server requests cookie sync', function () {
      config.setConfig({ s2sConfig: CONFIG });
      adapter.callBids(REQUEST, BID_REQUESTS, addBidResponse, done, ajax);
      server.requests[0].respond(200, {}, JSON.stringify(RESPONSE_NO_COOKIE));

      sinon.assert.notCalled(addBidResponse);
      sinon.assert.calledOnce(done);
    });

    it('does not call addBidResponse and calls done  when ad unit is set', function () {
      config.setConfig({ s2sConfig: CONFIG });
      adapter.callBids(REQUEST, BID_REQUESTS, addBidResponse, done, ajax);
      server.requests[0].respond(200, {}, JSON.stringify(RESPONSE_NO_BID_UNIT_SET));

      sinon.assert.notCalled(addBidResponse);
      sinon.assert.calledOnce(done);
    });

    it('registers successful bids and calls done when there are less bids than requests', function () {
      config.setConfig({ s2sConfig: CONFIG });
      adapter.callBids(REQUEST, BID_REQUESTS, addBidResponse, done, ajax);
      server.requests[0].respond(200, {}, JSON.stringify(RESPONSE_OPENRTB));

      sinon.assert.calledOnce(addBidResponse);
      sinon.assert.calledOnce(done);

      expect(addBidResponse.firstCall.args[0]).to.equal('div-gpt-ad-1460505748561-0');

      expect(addBidResponse.firstCall.args[1]).to.have.property('requestId', '123');

      expect(addBidResponse.firstCall.args[1])
        .to.have.property('statusMessage', 'Bid available');
    });

    it('should have dealId in bidObject', function () {
      config.setConfig({ s2sConfig: CONFIG });
      adapter.callBids(REQUEST, BID_REQUESTS, addBidResponse, done, ajax);
      server.requests[0].respond(200, {}, JSON.stringify(RESPONSE_OPENRTB));
      const response = addBidResponse.firstCall.args[1];
      expect(response).to.have.property('dealId', 'test-dealid');
    });

    it('should pass through default adserverTargeting if present in bidObject for video request', function () {
      config.setConfig({s2sConfig: CONFIG});
      const cacheResponse = utils.deepClone(RESPONSE_OPENRTB);
      const targetingTestData = {
        hb_cache_path: '/cache',
        hb_cache_host: 'prebid-cache.testurl.com'
      };

      cacheResponse.seatbid.forEach(item => {
        item.bid[0].ext.prebid.targeting = targetingTestData
      });
      adapter.callBids(VIDEO_REQUEST, BID_REQUESTS, addBidResponse, done, ajax);
      server.requests[0].respond(200, {}, JSON.stringify(cacheResponse));

      sinon.assert.calledOnce(addBidResponse);
      const response = addBidResponse.firstCall.args[1];
      expect(response).to.have.property('adserverTargeting');
      expect(response.adserverTargeting).to.deep.equal({
        'hb_cache_path': '/cache',
        'hb_cache_host': 'prebid-cache.testurl.com'
      });
    });

    it('should set the bidResponse currency to whats in the PBS response', function() {
      adapter.callBids(REQUEST, BID_REQUESTS, addBidResponse, done, ajax);
      server.requests[0].respond(200, {}, JSON.stringify(RESPONSE_OPENRTB));
      sinon.assert.calledOnce(addBidResponse);
      const pbjsResponse = addBidResponse.firstCall.args[1];
      expect(pbjsResponse).to.have.property('currency', 'EUR');
    });

    it('should set the default bidResponse currency when not specified in OpenRTB', function() {
      let modifiedResponse = utils.deepClone(RESPONSE_OPENRTB);
      modifiedResponse.cur = '';
      adapter.callBids(REQUEST, BID_REQUESTS, addBidResponse, done, ajax);
      server.requests[0].respond(200, {}, JSON.stringify(modifiedResponse));
      sinon.assert.calledOnce(addBidResponse);
      const pbjsResponse = addBidResponse.firstCall.args[1];
      expect(pbjsResponse).to.have.property('currency', 'USD');
    });

    it('should pass through default adserverTargeting if present in bidObject for banner request', function () {
      const cacheResponse = utils.deepClone(RESPONSE_OPENRTB);

      const targetingTestData = {
        'foo': 'bar'
      };

      cacheResponse.seatbid.forEach(item => {
        item.bid[0].ext.prebid.targeting = targetingTestData
      });

      config.setConfig({ s2sConfig: CONFIG });
      adapter.callBids(REQUEST, BID_REQUESTS, addBidResponse, done, ajax);
      server.requests[0].respond(200, {}, JSON.stringify(cacheResponse));
      sinon.assert.calledOnce(addBidResponse);
      const response = addBidResponse.firstCall.args[1];
      expect(response).to.have.property('adserverTargeting').that.deep.equals({ 'foo': 'bar' });
    });

    it('registers client user syncs when client bid adapter is present', function () {
      let rubiconAdapter = {
        registerSyncs: sinon.spy()
      };
      sinon.stub(adapterManager, 'getBidAdapter').callsFake(() => rubiconAdapter);

      config.setConfig({ s2sConfig: CONFIG });
      adapter.callBids(REQUEST, BID_REQUESTS, addBidResponse, done, ajax);
      server.requests[0].respond(200, {}, JSON.stringify(RESPONSE_NO_PBS_COOKIE));

      sinon.assert.calledOnce(rubiconAdapter.registerSyncs);

      adapterManager.getBidAdapter.restore();
    });

    it('registers client user syncs when using OpenRTB endpoint', function () {
      let rubiconAdapter = {
        registerSyncs: sinon.spy()
      };
      sinon.stub(adapterManager, 'getBidAdapter').returns(rubiconAdapter);

      config.setConfig({ CONFIG });

      adapter.callBids(REQUEST, BID_REQUESTS, addBidResponse, done, ajax);
      server.requests[0].respond(200, {}, JSON.stringify(RESPONSE_OPENRTB));

      sinon.assert.calledOnce(rubiconAdapter.registerSyncs);

      adapterManager.getBidAdapter.restore();
    });

    it('handles OpenRTB responses and call BIDDER_DONE', function () {
      config.setConfig({ CONFIG });

      adapter.callBids(REQUEST, BID_REQUESTS, addBidResponse, done, ajax);
      server.requests[0].respond(200, {}, JSON.stringify(RESPONSE_OPENRTB));

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
      expect(response).to.have.property('meta');
      expect(response.meta).to.have.property('advertiserDomains');
      expect(response.meta.advertiserDomains[0]).to.equal('appnexus.com');
      expect(response).to.not.have.property('vastUrl');
      expect(response).to.not.have.property('videoCacheKey');
      expect(response).to.have.property('ttl', 60);
    });

    it('respects defaultTtl', function () {
      const s2sConfig = Object.assign({}, CONFIG, {
        defaultTtl: 30
      });

      const s2sBidRequest = utils.deepClone(REQUEST);
      s2sBidRequest.s2sConfig = s2sConfig;

      adapter.callBids(s2sBidRequest, BID_REQUESTS, addBidResponse, done, ajax);
      server.requests[0].respond(200, {}, JSON.stringify(RESPONSE_OPENRTB));

      sinon.assert.calledOnce(events.emit);
      const event = events.emit.firstCall.args;
      sinon.assert.calledOnce(addBidResponse);
      const response = addBidResponse.firstCall.args[1];
      expect(response).to.have.property('ttl', 30);
    });

    it('handles OpenRTB video responses', function () {
      const s2sConfig = Object.assign({}, CONFIG, {
        endpoint: 'https://prebidserverurl/openrtb2/auction?querystring=param'
      });
      config.setConfig({ s2sConfig });

      const s2sVidRequest = utils.deepClone(VIDEO_REQUEST);
      s2sVidRequest.s2sConfig = s2sConfig;

      adapter.callBids(s2sVidRequest, BID_REQUESTS, addBidResponse, done, ajax);
      server.requests[0].respond(200, {}, JSON.stringify(RESPONSE_OPENRTB_VIDEO));

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

      const s2sVidRequest = utils.deepClone(VIDEO_REQUEST);
      s2sVidRequest.s2sConfig = s2sConfig;

      adapter.callBids(s2sVidRequest, BID_REQUESTS, addBidResponse, done, ajax);
      server.requests[0].respond(200, {}, JSON.stringify(cacheResponse));

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

      const s2sVidRequest = utils.deepClone(VIDEO_REQUEST);
      s2sVidRequest.s2sConfig = s2sConfig;

      adapter.callBids(s2sVidRequest, BID_REQUESTS, addBidResponse, done, ajax);
      server.requests[0].respond(200, {}, JSON.stringify(cacheResponse));

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

      const s2sVidRequest = utils.deepClone(VIDEO_REQUEST);
      s2sVidRequest.s2sConfig = s2sConfig;

      adapter.callBids(s2sVidRequest, BID_REQUESTS, addBidResponse, done, ajax);
      server.requests[0].respond(200, {}, JSON.stringify(cacheResponse));

      sinon.assert.calledOnce(addBidResponse);
      const response = addBidResponse.firstCall.args[1];

      expect(response).to.have.property('statusMessage', 'Bid available');
      expect(response).to.have.property('videoCacheKey', 'a5ad3993');
      expect(response).to.have.property('vastUrl', 'https://prebid-cache.net/cache?uuid=a5ad3993');
    });

    it('handles response cache from ext.prebid.targeting with wurl', function () {
      const s2sConfig = Object.assign({}, CONFIG, {
        endpoint: 'https://prebidserverurl/openrtb2/auction?querystring=param'
      });
      config.setConfig({ s2sConfig });
      const cacheResponse = utils.deepClone(RESPONSE_OPENRTB_VIDEO);
      cacheResponse.seatbid.forEach(item => {
        item.bid[0].ext.prebid.events = {
          win: 'https://wurl.com?a=1&b=2'
        };
        item.bid[0].ext.prebid.targeting = {
          hb_uuid: 'a5ad3993',
          hb_cache_host: 'prebid-cache.net',
          hb_cache_path: '/cache'
        }
      });
      const s2sVidRequest = utils.deepClone(VIDEO_REQUEST);
      s2sVidRequest.s2sConfig = s2sConfig;

      adapter.callBids(s2sVidRequest, BID_REQUESTS, addBidResponse, done, ajax);
      server.requests[0].respond(200, {}, JSON.stringify(cacheResponse));

      sinon.assert.calledOnce(addBidResponse);
      const response = addBidResponse.firstCall.args[1];
      expect(response).to.have.property('pbsBidId', '654321');
    });

    it('handles response cache from ext.prebid.targeting with wurl and removes invalid targeting', function () {
      const s2sConfig = Object.assign({}, CONFIG, {
        endpoint: 'https://prebidserverurl/openrtb2/auction?querystring=param'
      });
      config.setConfig({ s2sConfig });
      const cacheResponse = utils.deepClone(RESPONSE_OPENRTB_VIDEO);
      cacheResponse.seatbid.forEach(item => {
        item.bid[0].ext.prebid.events = {
          win: 'https://wurl.com?a=1&b=2'
        };
        item.bid[0].ext.prebid.targeting = {
          hb_uuid: 'a5ad3993',
          hb_cache_host: 'prebid-cache.net',
          hb_cache_path: '/cache',
          hb_winurl: 'https://hbwinurl.com?a=1&b=2',
          hb_bidid: '1234567890',
        }
      });

      const s2sVidRequest = utils.deepClone(VIDEO_REQUEST);
      s2sVidRequest.s2sConfig = s2sConfig;

      adapter.callBids(s2sVidRequest, BID_REQUESTS, addBidResponse, done, ajax);
      server.requests[0].respond(200, {}, JSON.stringify(cacheResponse));

      sinon.assert.calledOnce(addBidResponse);
      const response = addBidResponse.firstCall.args[1];

      expect(response.adserverTargeting).to.deep.equal({
        hb_uuid: 'a5ad3993',
        hb_cache_host: 'prebid-cache.net',
        hb_cache_path: '/cache'
      });
    });

    it('add request property pbsBidId with ext.prebid.bidid value', function () {
      const s2sConfig = Object.assign({}, CONFIG, {
        endpoint: 'https://prebidserverurl/openrtb2/auction?querystring=param'
      });
      config.setConfig({ s2sConfig });
      const cacheResponse = utils.deepClone(RESPONSE_OPENRTB_VIDEO);

      const s2sVidRequest = utils.deepClone(VIDEO_REQUEST);
      s2sVidRequest.s2sConfig = s2sConfig;

      adapter.callBids(s2sVidRequest, BID_REQUESTS, addBidResponse, done, ajax);
      server.requests[0].respond(200, {}, JSON.stringify(cacheResponse));

      sinon.assert.calledOnce(addBidResponse);
      const response = addBidResponse.firstCall.args[1];

      expect(response).to.have.property('pbsBidId', '654321');
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

      const s2sBidRequest = utils.deepClone(REQUEST);
      s2sBidRequest.s2sConfig = s2sConfig;

      adapter.callBids(s2sBidRequest, BID_REQUESTS, addBidResponse, done, ajax);
      server.requests[0].respond(200, {}, JSON.stringify(RESPONSE_OPENRTB_NATIVE));

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
  });

  describe('bid won events', function () {
    let uniqueIdCount = 0;
    let triggerPixelStub;
    const staticUniqueIds = ['1000', '1001', '1002', '1003'];

    before(function () {
      triggerPixelStub = sinon.stub(utils, 'triggerPixel');
    });

    beforeEach(function () {
      resetWurlMap();
      sinon.stub(utils, 'insertUserSyncIframe');
      sinon.stub(utils, 'logError');
      sinon.stub(utils, 'getUniqueIdentifierStr').callsFake(() => {
        uniqueIdCount++;
        return staticUniqueIds[uniqueIdCount - 1];
      });
      triggerPixelStub.resetHistory();

      config.setConfig({
        s2sConfig: Object.assign({}, CONFIG, {
          endpoint: 'https://prebid.adnxs.com/pbs/v1/openrtb2/auction'
        })
      });
    });

    afterEach(function () {
      utils.triggerPixel.resetHistory();
      utils.insertUserSyncIframe.restore();
      utils.logError.restore();
      utils.getUniqueIdentifierStr.restore();
      uniqueIdCount = 0;
    });

    after(function () {
      triggerPixelStub.restore();
    });

    it('should call triggerPixel if wurl is defined', function () {
      const clonedResponse = utils.deepClone(RESPONSE_OPENRTB);
      clonedResponse.seatbid[0].bid[0].ext.prebid.events = {
        win: 'https://wurl.org'
      };

      adapter.callBids(REQUEST, BID_REQUESTS, addBidResponse, done, ajax);
      server.requests[0].respond(200, {}, JSON.stringify(clonedResponse));

      events.emit(CONSTANTS.EVENTS.BID_WON, {
        auctionId: '173afb6d132ba3',
        adId: '1000'
      });

      sinon.assert.calledOnce(addBidResponse);
      expect(utils.triggerPixel.called).to.be.true;
      expect(utils.triggerPixel.getCall(0).args[0]).to.include('https://wurl.org');
    });

    it('should not call triggerPixel if the wurl cache does not contain the winning bid', function () {
      const clonedResponse = utils.deepClone(RESPONSE_OPENRTB);
      clonedResponse.seatbid[0].bid[0].ext.prebid.events = {
        win: 'https://wurl.org'
      };

      adapter.callBids(REQUEST, BID_REQUESTS, addBidResponse, done, ajax);
      server.requests[0].respond(200, {}, JSON.stringify(clonedResponse));

      events.emit(CONSTANTS.EVENTS.BID_WON, {
        auctionId: '173afb6d132ba3',
        adId: 'missingAdId'
      });

      sinon.assert.calledOnce(addBidResponse)
      expect(utils.triggerPixel.called).to.be.false;
    });

    it('should not call triggerPixel if wurl is undefined', function () {
      const clonedResponse = utils.deepClone(RESPONSE_OPENRTB);
      clonedResponse.seatbid[0].bid[0].ext.prebid.events = {};

      adapter.callBids(REQUEST, BID_REQUESTS, addBidResponse, done, ajax);
      server.requests[0].respond(200, {}, JSON.stringify(clonedResponse));

      events.emit(CONSTANTS.EVENTS.BID_WON, {
        auctionId: '173afb6d132ba3',
        adId: '1060'
      });

      sinon.assert.calledOnce(addBidResponse)
      expect(utils.triggerPixel.called).to.be.false;
    });
  })

  describe('s2sConfig', function () {
    let logErrorSpy;

    beforeEach(function () {
      logErrorSpy = sinon.spy(utils, 'logError');
      resetSyncedStatus();
    });

    afterEach(function () {
      utils.logError.restore();
    });

    it('should log an error when accountId is missing', function () {
      const options = {
        enabled: true,
        bidders: ['appnexus'],
        timeout: 1000,
        adapter: 'prebidServer',
        endpoint: 'https://prebid.adnxs.com/pbs/v1/openrtb2/auction'
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
        endpoint: 'https://prebid.adnxs.com/pbs/v1/openrtb2/auction'
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
      expect(vendorConfig).to.have.property('endpoint', 'https://prebid.adnxs.com/pbs/v1/openrtb2/auction');
      expect(vendorConfig).to.have.property('syncEndpoint', 'https://prebid.adnxs.com/pbs/v1/cookie_sync');
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
      expect(vendorConfig).to.have.property('endpoint', 'https://prebid-server.rubiconproject.com/openrtb2/auction');
      expect(vendorConfig).to.have.property('syncEndpoint', 'https://prebid-server.rubiconproject.com/cookie_sync');
      expect(vendorConfig).to.have.property('timeout', 750);
    });

    it('should return proper defaults', function () {
      const options = {
        accountId: 'abc',
        bidders: ['rubicon'],
        defaultVendor: 'rubicon',
        timeout: 750
      };

      config.setConfig({ s2sConfig: options });
      expect(config.getConfig('s2sConfig')).to.deep.equal({
        'accountId': 'abc',
        'adapter': 'prebidServer',
        'bidders': ['rubicon'],
        'defaultVendor': 'rubicon',
        'enabled': true,
        'endpoint': 'https://prebid-server.rubiconproject.com/openrtb2/auction',
        'syncEndpoint': 'https://prebid-server.rubiconproject.com/cookie_sync',
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
        endpoint: 'https://prebid-server.rubiconproject.com/openrtb2/auction',
        syncEndpoint: 'https://prebid-server.rubiconproject.com/cookie_sync',
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

    it('should set default s2s ttl', function () {
      config.setConfig({
        s2sConfig: {
          defaultTtl: 30
        }
      });
      expect(config.getConfig('s2sConfig').defaultTtl).to.deep.equal(30);
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

      const s2sBidRequest = utils.deepClone(REQUEST);
      s2sBidRequest.s2sConfig = s2sConfig;

      // Add another bidder, `rubicon-alias`
      s2sBidRequest.ad_units[0].bids.push({
        bidder: 'rubicon-alias',
        params: {
          accoundId: 14062,
          siteId: 70608,
          zoneId: 498816
        }
      });

      // create an alias for the Rubicon Bid Adapter
      adapterManager.aliasBidAdapter('rubicon', 'rubicon-alias');

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

      adapter.callBids(s2sBidRequest, bidRequest, addBidResponse, done, ajax);

      const requestBid = JSON.parse(server.requests[0].requestBody);
      expect(requestBid.bidders).to.deep.equal(['appnexus', 'rubicon']);
    });

    it('should add cooperative sync flag to cookie_sync request if property is present', function () {
      let s2sConfig = utils.deepClone(CONFIG);
      s2sConfig.coopSync = false;
      s2sConfig.syncEndpoint = 'https://prebid.adnxs.com/pbs/v1/cookie_sync';

      const s2sBidRequest = utils.deepClone(REQUEST);
      s2sBidRequest.s2sConfig = s2sConfig;

      let bidRequest = utils.deepClone(BID_REQUESTS);

      adapter.callBids(s2sBidRequest, bidRequest, addBidResponse, done, ajax);
      let requestBid = JSON.parse(server.requests[0].requestBody);

      expect(requestBid.coopSync).to.equal(false);
    });

    it('should not add cooperative sync flag to cookie_sync request if property is not present', function () {
      let s2sConfig = utils.deepClone(CONFIG);
      s2sConfig.syncEndpoint = 'https://prebid.adnxs.com/pbs/v1/cookie_sync';

      const s2sBidRequest = utils.deepClone(REQUEST);
      s2sBidRequest.s2sConfig = s2sConfig;

      let bidRequest = utils.deepClone(BID_REQUESTS);

      adapter.callBids(s2sBidRequest, bidRequest, addBidResponse, done, ajax);
      let requestBid = JSON.parse(server.requests[0].requestBody);

      expect(requestBid.coopSync).to.be.undefined;
    });
  });
});
