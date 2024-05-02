/* eslint-disable no-trailing-spaces */
import {expect} from 'chai';
import {
  PrebidServer as Adapter,
  resetSyncedStatus,
  resetWurlMap,
  s2sDefaultConfig
} from 'modules/prebidServerBidAdapter/index.js';
import adapterManager, {PBS_ADAPTER_NAME} from 'src/adapterManager.js';
import * as utils from 'src/utils.js';
import {deepAccess, deepClone, mergeDeep} from 'src/utils.js';
import {ajax} from 'src/ajax.js';
import {config} from 'src/config.js';
import * as events from 'src/events.js';
import { EVENTS } from 'src/constants.js';
import {server} from 'test/mocks/xhr.js';
import 'modules/appnexusBidAdapter.js'; // appnexus alias test
import 'modules/rubiconBidAdapter.js'; // rubicon alias test
import 'src/prebid.js'; // $$PREBID_GLOBAL$$.aliasBidder test
import 'modules/currency.js'; // adServerCurrency test
import 'modules/userId/index.js';
import 'modules/multibid/index.js';
import 'modules/priceFloors.js';
import 'modules/consentManagement.js';
import 'modules/consentManagementUsp.js';
import 'modules/schain.js';
import 'modules/fledgeForGpt.js';
import * as redactor from 'src/activities/redactor.js';
import * as activityRules from 'src/activities/rules.js';
import {hook} from '../../../src/hook.js';
import {decorateAdUnitsWithNativeParams} from '../../../src/native.js';
import {auctionManager} from '../../../src/auctionManager.js';
import {stubAuctionIndex} from '../../helpers/indexStub.js';
import {addComponentAuction, registerBidder} from 'src/adapters/bidderFactory.js';
import {getGlobal} from '../../../src/prebidGlobal.js';
import {syncAddFPDToBidderRequest} from '../../helpers/fpd.js';
import {deepSetValue} from '../../../src/utils.js';
import {ACTIVITY_TRANSMIT_UFPD} from '../../../src/activities/activities.js';
import {MODULE_TYPE_PREBID} from '../../../src/activities/modules.js';

let CONFIG = {
  accountId: '1',
  enabled: true,
  bidders: ['appnexus'],
  timeout: 1000,
  cacheMarkup: 2,
  endpoint: {
    p1Consent: 'https://prebid.adnxs.com/pbs/v1/openrtb2/auction',
    noP1Consent: 'https://prebid.adnxs.com/pbs/v1/openrtb2/auction'
  }
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
      'adUnitId': 'au-id-1',
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

const NATIVE_ORTB_MTO = {
  ortb: {
    context: 3,
    plcmttype: 2,
    eventtrackers: [
      {
        event: 1,
        methods: [
          1
        ]
      },
      {
        event: 2,
        methods: [
          2
        ]
      }
    ],
    assets: [
      {
        id: 1,
        required: 1,
        img: {
          type: 3,
          w: 300,
          h: 250
        }
      },
      {
        id: 2,
        required: 1,
        img: {
          type: 1,
          w: 127,
          h: 83
        }
      },
      {
        id: 3,
        required: 1,
        data: {
          type: 1,
          len: 25
        }
      },
      {
        id: 4,
        required: 1,
        title: {
          len: 140
        }
      },
      {
        id: 5,
        required: 1,
        data: {
          type: 2,
          len: 40
        }
      },
      {
        id: 6,
        required: 1,
        data: {
          type: 12,
          len: 15
        }
      },
    ],
    ext: {
      custom_param: {
        key: 'custom_value'
      }
    },
    ver: '1.2'
  }
}

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
          mimes: ['video/mp4'],
          renderer: {
            url: 'https://acdn.adnxs.com/video/outstream/ANOutstreamVideo.js',
            render: function (bid) {
              ANOutstreamVideo.renderAd({
                targetId: bid.adUnitCode,
                adResponse: bid.adResponse,
              });
            }
          }
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
          mimes: ['video/mp4'],
          skip: 1
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
      ]
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
              },
              'meta': {
                'dchain': { 'ver': '1.0', 'complete': 0, 'nodes': [{ 'asi': 'magnite.com', 'bsid': '123456789', }] }
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

function addFpdEnrichmentsToS2SRequest(s2sReq, bidderRequests) {
  return {
    ...s2sReq,
    ortb2Fragments: {
      ...(s2sReq.ortb2Fragments || {}),
      global: syncAddFPDToBidderRequest({...(bidderRequests?.[0] || {}), ortb2: s2sReq.ortb2Fragments?.global || {}}).ortb2
    }
  }
}

describe('S2S Adapter', function () {
  let adapter,
    addBidResponse = sinon.spy(),
    done = sinon.spy();

  addBidResponse.reject = sinon.spy();

  function prepRequest(req) {
    req.ad_units.forEach((adUnit) => {
      delete adUnit.nativeParams
    });
    decorateAdUnitsWithNativeParams(req.ad_units);
  }

  before(() => {
    hook.ready();
    prepRequest(REQUEST);
  });

  beforeEach(function () {
    config.resetConfig();
    config.setConfig({floors: {enabled: false}});
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
        'doneCbCallCount': 0,
        'refererInfo': {
          'page': 'http://mytestpage.com'
        }
      }
    ];
  });

  afterEach(function () {
    addBidResponse.resetHistory();
    addBidResponse.reject = sinon.spy();
    done.resetHistory();
  });

  after(function () {
    config.resetConfig();
  });

  describe('request function', function () {
    beforeEach(function () {
      resetSyncedStatus();
    });

    describe('FPD redaction', () => {
      let sandbox, ortb2Fragments, redactorMocks, s2sReq;

      beforeEach(() => {
        sandbox = sinon.sandbox.create();
        redactorMocks = {};
        sandbox.stub(redactor, 'redactor').callsFake((params) => {
          if (!redactorMocks.hasOwnProperty(params.component)) {
            redactorMocks[params.component] = {
              ortb2: sinon.stub().callsFake(o => o),
              bidRequest: sinon.stub().callsFake(o => o)
            }
          }
          return redactorMocks[params.component];
        })
        ortb2Fragments = {
          global: {
            mock: 'value'
          },
          bidder: {
            appnexus: {
              mock: 'A'
            }
          }
        }
        const s2sConfig = {
          ...CONFIG,
        };
        config.setConfig({s2sConfig});
        s2sReq = {
          ...REQUEST,
          s2sConfig
        };
      });

      afterEach(() => {
        sandbox.restore();
      })

      function callBids() {
        adapter.callBids({
          ...s2sReq,
          ortb2Fragments
        }, BID_REQUESTS, addBidResponse, done, ajax);
      }

      it('should be applied to ortb2Fragments', () => {
        callBids();
        sinon.assert.calledWithMatch(redactorMocks['prebid.pbsBidAdapter'].ortb2, ortb2Fragments.global);
        Object.entries(ortb2Fragments.bidder).forEach(([bidder, ortb2]) => {
          sinon.assert.calledWith(redactorMocks[`bidder.${bidder}`].ortb2, ortb2);
        });
      });

      it('should be applied to ad units', () => {
        callBids();
        s2sReq.ad_units.forEach(au => {
          sinon.assert.calledWith(redactorMocks['prebid.pbsBidAdapter'].bidRequest, au);
          au.bids.forEach((bid) => {
            sinon.assert.calledWith(redactorMocks[`bidder.${bid.bidder}`].bidRequest, bid);
          })
        })
      })
    });

    describe('transaction IDs', () => {
      let s2sReq;
      beforeEach(() => {
        s2sReq = {
          ...REQUEST,
          ortb2Fragments: {global: {}},
          ad_units: REQUEST.ad_units.map(au => ({...au, ortb2Imp: {ext: {tid: 'mock-tid'}}})),
        };
        BID_REQUESTS[0].bids[0].ortb2Imp = {ext: {tid: 'mock-tid'}};
      });

      function makeRequest() {
        adapter.callBids(s2sReq, BID_REQUESTS, addBidResponse, done, ajax);
        return JSON.parse(server.requests[0].requestBody);
      }

      it('should not be set when transmitTid is not allowed, with ext.prebid.createtids: false', () => {
        config.setConfig({ s2sConfig: CONFIG, enableTIDs: false });
        const req = makeRequest();
        expect(req.source?.tid).to.not.exist;
        expect(req.imp[0].ext?.tid).to.not.exist;
        expect(req.ext.prebid.createtids).to.equal(false);
      });

      it('should be set to auction ID otherwise', () => {
        config.setConfig({s2sConfig: CONFIG, enableTIDs: true});
        const req = makeRequest();
        expect(req.source.tid).to.eql(BID_REQUESTS[0].auctionId);
        expect(req.imp[0].ext.tid).to.eql('mock-tid');
      })
    })

    describe('browsingTopics', () => {
      const sandbox = sinon.createSandbox();
      afterEach(() => {
        sandbox.restore()
      });
      Object.entries({
        'allowed': true,
        'not allowed': false,
      }).forEach(([t, allow]) => {
        it(`should be set to ${allow} when transmitUfpd is ${t}`, () => {
          sandbox.stub(activityRules, 'isActivityAllowed').callsFake((activity, params) => {
            if (activity === ACTIVITY_TRANSMIT_UFPD && params.component === `${MODULE_TYPE_PREBID}.${PBS_ADAPTER_NAME}`) {
              return allow;
            }
            return false;
          });
          config.setConfig({s2sConfig: CONFIG});
          const ajax = sinon.stub();
          adapter.callBids(REQUEST, BID_REQUESTS, addBidResponse, done, ajax);
          sinon.assert.calledWith(ajax, sinon.match.any, sinon.match.any, sinon.match.any, sinon.match({
            browsingTopics: allow
          }));
        });
      });
    })

    it('should set tmax to s2sConfig.timeout', () => {
      const cfg = {...CONFIG, timeout: 123};
      config.setConfig({s2sConfig: cfg});
      adapter.callBids({...REQUEST, s2sConfig: cfg}, BID_REQUESTS, addBidResponse, done, ajax);
      const req = JSON.parse(server.requests[0].requestBody);
      expect(req.tmax).to.eql(123);
    });

    it('should block request if config did not define p1Consent URL in endpoint object config', function () {
      let badConfig = utils.deepClone(CONFIG);
      badConfig.endpoint = { noP1Consent: 'https://prebid.adnxs.com/pbs/v1/openrtb2/auction' };
      config.setConfig({ s2sConfig: badConfig });

      let badCfgRequest = utils.deepClone(REQUEST);
      badCfgRequest.s2sConfig = badConfig;

      adapter.callBids(badCfgRequest, BID_REQUESTS, addBidResponse, done, ajax);

      expect(server.requests.length).to.equal(0);
    });

    it('should block request if config did not define noP1Consent URL in endpoint object config', function () {
      let badConfig = utils.deepClone(CONFIG);
      badConfig.endpoint = { p1Consent: 'https://prebid.adnxs.com/pbs/v1/openrtb2/auction' };
      config.setConfig({ s2sConfig: badConfig });

      let badCfgRequest = utils.deepClone(REQUEST);
      badCfgRequest.s2sConfig = badConfig;

      let badBidderRequest = utils.deepClone(BID_REQUESTS);
      badBidderRequest[0].gdprConsent = {
        consentString: 'abc123',
        addtlConsent: 'superduperconsent',
        gdprApplies: true,
        apiVersion: 2,
        vendorData: {
          purpose: {
            consents: {
              1: false
            }
          }
        }
      };

      adapter.callBids(badCfgRequest, badBidderRequest, addBidResponse, done, ajax);

      expect(server.requests.length).to.equal(0);
    });

    it('should block request if config did not define any URLs in endpoint object config', function () {
      let badConfig = utils.deepClone(CONFIG);
      badConfig.endpoint = {};
      config.setConfig({ s2sConfig: badConfig });

      let badCfgRequest = utils.deepClone(REQUEST);
      badCfgRequest.s2sConfig = badConfig;

      adapter.callBids(badCfgRequest, BID_REQUESTS, addBidResponse, done, ajax);

      expect(server.requests.length).to.equal(0);
    });

    if (FEATURES.VIDEO) {
      it('should add outstream bc renderer exists on mediatype', function () {
        config.setConfig({ s2sConfig: CONFIG });

        adapter.callBids(OUTSTREAM_VIDEO_REQUEST, BID_REQUESTS, addBidResponse, done, ajax);

        const requestBid = JSON.parse(server.requests[0].requestBody);
        expect(requestBid.imp[0].banner).to.exist;
        expect(requestBid.imp[0].video).to.exist;
      });

      it('should default video placement if not defined and instream', function () {
        let ortb2Config = utils.deepClone(CONFIG);
        ortb2Config.endpoint.p1Consent = 'https://prebid.adnxs.com/pbs/v1/openrtb2/auction';

        config.setConfig({ s2sConfig: ortb2Config });

        let videoBid = utils.deepClone(VIDEO_REQUEST);
        videoBid.ad_units[0].mediaTypes.video.context = 'instream';
        adapter.callBids(videoBid, BID_REQUESTS, addBidResponse, done, ajax);

        const requestBid = JSON.parse(server.requests[0].requestBody);
        expect(requestBid.imp[0].banner).to.not.exist;
        expect(requestBid.imp[0].video).to.exist;
        expect(requestBid.imp[0].video.placement).to.equal(1);
      });

      it('converts video mediaType properties into openRTB format', function () {
        let ortb2Config = utils.deepClone(CONFIG);
        ortb2Config.endpoint.p1Consent = 'https://prebid.adnxs.com/pbs/v1/openrtb2/auction';

        config.setConfig({ s2sConfig: ortb2Config });

        let videoBid = utils.deepClone(VIDEO_REQUEST);
        videoBid.ad_units[0].mediaTypes.video.context = 'instream';
        adapter.callBids(videoBid, BID_REQUESTS, addBidResponse, done, ajax);

        const requestBid = JSON.parse(server.requests[0].requestBody);
        expect(requestBid.imp[0].banner).to.not.exist;
        expect(requestBid.imp[0].video).to.exist;
        expect(requestBid.imp[0].video.placement).to.equal(1);
        expect(requestBid.imp[0].video.w).to.equal(640);
        expect(requestBid.imp[0].video.h).to.equal(480);
        expect(requestBid.imp[0].video.playerSize).to.be.undefined;
        expect(requestBid.imp[0].video.context).to.be.undefined;
      });
    }

    it('exists and is a function', function () {
      expect(adapter.callBids).to.exist.and.to.be.a('function');
    });

    function mockTCF({applies = true, hasP1Consent = true} = {}) {
      return {
        consentString: 'mockConsent',
        gdprApplies: applies,
        vendorData: {purpose: {consents: {1: hasP1Consent}}},
      }
    }

    describe('gdpr tests', function () {
      afterEach(function () {
        $$PREBID_GLOBAL$$.requestBids.removeAll();
      });

      it('adds gdpr consent information to ortb2 request depending on presence of module', function () {
        let consentConfig = { consentManagement: { cmpApi: 'iab' }, s2sConfig: CONFIG };
        config.setConfig(consentConfig);

        let gdprBidRequest = utils.deepClone(BID_REQUESTS);
        gdprBidRequest[0].gdprConsent = mockTCF();

        adapter.callBids(addFpdEnrichmentsToS2SRequest(REQUEST, gdprBidRequest), gdprBidRequest, addBidResponse, done, ajax);
        let requestBid = JSON.parse(server.requests[0].requestBody);

        expect(requestBid.regs.ext.gdpr).is.equal(1);
        expect(requestBid.user.ext.consent).is.equal('mockConsent');

        config.resetConfig();
        config.setConfig({ s2sConfig: CONFIG });

        adapter.callBids(addFpdEnrichmentsToS2SRequest(REQUEST, BID_REQUESTS), BID_REQUESTS, addBidResponse, done, ajax);
        requestBid = JSON.parse(server.requests[1].requestBody);

        expect(requestBid.regs).to.not.exist;
        expect(requestBid.user).to.not.exist;
      });

      it('adds additional consent information to ortb2 request depending on presence of module', function () {
        let consentConfig = { consentManagement: { cmpApi: 'iab' }, s2sConfig: CONFIG };
        config.setConfig(consentConfig);

        let gdprBidRequest = utils.deepClone(BID_REQUESTS);
        gdprBidRequest[0].gdprConsent = Object.assign(mockTCF(), {
          addtlConsent: 'superduperconsent',
        });

        adapter.callBids(addFpdEnrichmentsToS2SRequest(REQUEST, gdprBidRequest), gdprBidRequest, addBidResponse, done, ajax);
        let requestBid = JSON.parse(server.requests[0].requestBody);

        expect(requestBid.regs.ext.gdpr).is.equal(1);
        expect(requestBid.user.ext.consent).is.equal('mockConsent');
        expect(requestBid.user.ext.ConsentedProvidersSettings.consented_providers).is.equal('superduperconsent');

        config.resetConfig();
        config.setConfig({ s2sConfig: CONFIG });

        adapter.callBids(REQUEST, BID_REQUESTS, addBidResponse, done, ajax);
        requestBid = JSON.parse(server.requests[1].requestBody);

        expect(requestBid.regs).to.not.exist;
        expect(requestBid.user).to.not.exist;
      });
    });

    describe('us_privacy (ccpa) consent data', function () {
      afterEach(function () {
        $$PREBID_GLOBAL$$.requestBids.removeAll();
      });

      it('is added to ortb2 request when in FPD', function () {
        config.setConfig({ s2sConfig: CONFIG });

        let uspBidRequest = utils.deepClone(BID_REQUESTS);
        uspBidRequest[0].uspConsent = '1NYN';

        adapter.callBids(addFpdEnrichmentsToS2SRequest(REQUEST, uspBidRequest), uspBidRequest, addBidResponse, done, ajax);
        let requestBid = JSON.parse(server.requests[0].requestBody);

        expect(requestBid.regs.ext.us_privacy).is.equal('1NYN');

        config.resetConfig();
        config.setConfig({ s2sConfig: CONFIG });

        adapter.callBids(addFpdEnrichmentsToS2SRequest(REQUEST, BID_REQUESTS), BID_REQUESTS, addBidResponse, done, ajax);
        requestBid = JSON.parse(server.requests[1].requestBody);

        expect(requestBid.regs).to.not.exist;
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
        consentBidRequest[0].gdprConsent = mockTCF();

        adapter.callBids(addFpdEnrichmentsToS2SRequest(REQUEST, consentBidRequest), consentBidRequest, addBidResponse, done, ajax);
        let requestBid = JSON.parse(server.requests[0].requestBody);

        expect(requestBid.regs.ext.us_privacy).is.equal('1NYN');
        expect(requestBid.regs.ext.gdpr).is.equal(1);
        expect(requestBid.user.ext.consent).is.equal('mockConsent');

        config.resetConfig();
        config.setConfig({ s2sConfig: CONFIG });

        adapter.callBids(REQUEST, BID_REQUESTS, addBidResponse, done, ajax);
        requestBid = JSON.parse(server.requests[1].requestBody);

        expect(requestBid.regs).to.not.exist;
        expect(requestBid.user).to.not.exist;
      });

      it('is added to cookie_sync request when in bidRequest', function () {
        let cookieSyncConfig = utils.deepClone(CONFIG);
        cookieSyncConfig.syncEndpoint = { p1Consent: 'https://prebid.adnxs.com/pbs/v1/cookie_sync' };
        config.setConfig({ s2sConfig: cookieSyncConfig });

        let consentBidRequest = utils.deepClone(BID_REQUESTS);
        consentBidRequest[0].uspConsent = '1YNN';
        consentBidRequest[0].gdprConsent = mockTCF();

        const s2sBidRequest = utils.deepClone(REQUEST);
        s2sBidRequest.s2sConfig = cookieSyncConfig

        adapter.callBids(s2sBidRequest, consentBidRequest, addBidResponse, done, ajax);
        let requestBid = JSON.parse(server.requests[0].requestBody);

        expect(requestBid.us_privacy).is.equal('1YNN');
        expect(requestBid.gdpr).is.equal(1);
        expect(requestBid.gdpr_consent).is.equal('mockConsent');
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
      adapter.callBids(addFpdEnrichmentsToS2SRequest(REQUEST, BID_REQUESTS), BID_REQUESTS, addBidResponse, done, ajax);
      const requestBid = JSON.parse(server.requests[0].requestBody);
      sinon.assert.match(requestBid.device, {
        ifa: '6D92078A-8246-4BA4-AE5B-76104861E7DC',
        w: window.innerWidth,
        h: window.innerHeight
      })
      sinon.assert.match(requestBid.app, {
        bundle: 'com.test.app',
        publisher: { 'id': '1' }
      });
    });

    it('adds device and app objects to request for OpenRTB', function () {
      const s2sConfig = Object.assign({}, CONFIG, {
        endpoint: {
          p1Consent: 'https://prebid.adnxs.com/pbs/v1/openrtb2/auction'
        }
      });

      const _config = {
        s2sConfig: s2sConfig,
        device: { ifa: '6D92078A-8246-4BA4-AE5B-76104861E7DC' },
        app: { bundle: 'com.test.app' },
      };

      config.setConfig(_config);
      adapter.callBids(addFpdEnrichmentsToS2SRequest(REQUEST, BID_REQUESTS), BID_REQUESTS, addBidResponse, done, ajax);
      const requestBid = JSON.parse(server.requests[0].requestBody);
      sinon.assert.match(requestBid.device, {
        ifa: '6D92078A-8246-4BA4-AE5B-76104861E7DC',
        w: window.innerWidth,
        h: window.innerHeight
      })
      sinon.assert.match(requestBid.app, {
        bundle: 'com.test.app',
        publisher: { 'id': '1' }
      });
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
            mediaType: '*',
            size: '*'
          })
        ).to.be.true;

        // if getFloor does not return number
        getFloorResponse = { currency: 'EUR', floor: 'not a number' };
        runTest(undefined, undefined);

        // if getFloor does not return currency
        getFloorResponse = { floor: 1.1 };
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
        getFloorResponse = { currency: 'USD', floor: '1.23' };
        runTest(1.23, 'USD');
        // make sure getFloor was called
        expect(
          BID_REQUESTS[0].bids[0].getFloor.calledWith({
            currency: 'USD',
            mediaType: '*',
            size: '*'
          })
        ).to.be.true;

        // returns non USD and number floor
        getFloorResponse = { currency: 'EUR', floor: 0.85 };
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
        getFloorResponse = { currency: 'JPY', floor: 97.2 };
        runTest(97.2, 'JPY');
        // make sure getFloor was called with JPY
        expect(
          BID_REQUESTS[0].bids[0].getFloor.calledWith({
            currency: 'JPY',
            mediaType: '*',
            size: '*'
          })
        ).to.be.true;
      });

      it('should find the floor when not all bidderRequests contain it', () => {
        config.setConfig({
          s2sConfig: {
            ...CONFIG,
            bidders: ['b1', 'b2']
          },
        });
        const bidderRequests = [
          {
            ...BID_REQUESTS[0],
            bidderCode: 'b1',
            bids: [{
              bidder: 'b1',
              bidId: 1,
            }]
          },
          {
            ...BID_REQUESTS[0],
            bidderCode: 'b2',
            bids: [{
              bidder: 'b2',
              bidId: 2,
              getFloor: () => ({
                currency: 'CUR',
                floor: 123
              })
            }],
          }
        ];
        const adUnits = [
          {
            code: 'au1',
            transactionId: 't1',
            mediaTypes: {
              banner: {sizes: [1, 1]}
            },
            bids: [{bidder: 'b1', bid_id: 1}]
          },
          {
            code: 'au2',
            transactionId: 't2',
            bids: [{bidder: 'b2', bid_id: 2}],
            mediaTypes: {
              banner: {sizes: [1, 1]}
            }
          }
        ];
        const s2sReq = {
          ...REQUEST,
          ad_units: adUnits
        }

        adapter.callBids(s2sReq, bidderRequests, addBidResponse, done, ajax);

        const pbsReq = JSON.parse(server.requests[server.requests.length - 1].requestBody);
        const [imp1, imp2] = pbsReq.imp;

        expect(imp1.bidfloor).to.be.undefined;
        expect(imp1.bidfloorcur).to.be.undefined;

        expect(imp2.bidfloor).to.eql(123);
        expect(imp2.bidfloorcur).to.eql('CUR');
      });

      describe('when different bids have different floors', () => {
        let s2sReq;
        beforeEach(() => {
          config.setConfig({
            s2sConfig: {
              ...CONFIG,
              bidders: ['b1', 'b2', 'b3']
            },
          });
          BID_REQUESTS = [
            {
              ...BID_REQUESTS[0],
              bidderCode: 'b2',
              bids: [{
                bidder: 'b2',
                bidId: 2,
                getFloor: () => ({
                  currency: '1',
                  floor: 2
                })
              }],
            },
            {
              ...BID_REQUESTS[0],
              bidderCode: 'b1',
              bids: [{
                bidder: 'b1',
                bidId: 1,
                getFloor: () => ({
                  floor: 10,
                  currency: '0.1'
                })
              }]
            },
            {
              ...BID_REQUESTS[0],
              bidderCode: 'b3',
              bids: [{
                bidder: 'b3',
                bidId: 3,
                getFloor: () => ({
                  currency: '10',
                  floor: 1
                })
              }],
            }
          ];
          s2sReq = {
            ...REQUEST,
            ad_units: [
              {
                code: 'au1',
                transactionId: 't1',
                mediaTypes: {
                  banner: {sizes: [1, 1]}
                },
                bids: [
                  {bidder: 'b2', bid_id: 2},
                  {bidder: 'b3', bid_id: 3},
                  {bidder: 'b1', bid_id: 1},
                ]
              }
            ]
          };
        });

        Object.entries({
          'cannot compute a floor': (bid) => { bid.getFloor = () => { throw new Error() } },
          'does not set a floor': (bid) => { delete bid.getFloor; },
        }).forEach(([t, updateBid]) => {
          it(`should not set pricefloor if any one of them ${t}`, () => {
            updateBid(BID_REQUESTS[1].bids[0]);
            adapter.callBids(s2sReq, BID_REQUESTS, addBidResponse, done, ajax);
            const pbsReq = JSON.parse(server.requests[server.requests.length - 1].requestBody);
            expect(pbsReq.imp[0].bidfloor).to.be.undefined;
            expect(pbsReq.imp[0].bidfloorcur).to.be.undefined;
          });
        })

        Object.entries({
          'is available': {
            expectDesc: 'minimum after conversion',
            expectedFloor: 10,
            expectedCur: '0.1',
            conversionFn: (amount, from, to) => {
              from = parseFloat(from);
              to = parseFloat(to);
              return amount * from / to;
            },
          },
          'is not available': {
            expectDesc: 'absolute minimum',
            expectedFloor: 1,
            expectedCur: '10',
            conversionFn: null
          },
          'is not working': {
            expectDesc: 'absolute minimum',
            expectedFloor: 1,
            expectedCur: '10',
            conversionFn: () => {
              throw new Error();
            }
          }
        }).forEach(([t, {expectDesc, expectedFloor, expectedCur, conversionFn}]) => {
          describe(`and currency conversion ${t}`, () => {
            let mockConvertCurrency;
            const origConvertCurrency = getGlobal().convertCurrency;
            beforeEach(() => {
              if (conversionFn) {
                getGlobal().convertCurrency = mockConvertCurrency = sinon.stub().callsFake(conversionFn)
              } else {
                mockConvertCurrency = null;
                delete getGlobal().convertCurrency;
              }
            });

            afterEach(() => {
              if (origConvertCurrency != null) {
                getGlobal().convertCurrency = origConvertCurrency;
              } else {
                delete getGlobal().convertCurrency;
              }
            });

            it(`should pick the ${expectDesc}`, () => {
              adapter.callBids(s2sReq, BID_REQUESTS, addBidResponse, done, ajax);
              const pbsReq = JSON.parse(server.requests[server.requests.length - 1].requestBody);
              expect(pbsReq.imp[0].bidfloor).to.eql(expectedFloor);
              expect(pbsReq.imp[0].bidfloorcur).to.eql(expectedCur);
            });
          });
        });
      });
    });

    if (FEATURES.NATIVE) {
      describe('native requests', function () {
        const ORTB_NATIVE_REQ = {
          'ver': '1.2',
          'assets': [
            {
              'required': 1,
              'id': 0,
              'title': {
                'len': 800
              }
            },
            {
              'required': 1,
              'id': 1,
              'img': {
                'type': 3,
                'w': 989,
                'h': 742
              }
            },
            {
              'required': 1,
              'id': 2,
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
              'id': 3,
              'data': {
                'type': 1
              }
            }
          ]
        };

        it('adds device.w and device.h even if the config lacks a device object', function () {
          const _config = {
            s2sConfig: CONFIG,
            app: { bundle: 'com.test.app' },
          };

          config.setConfig(_config);
          adapter.callBids(addFpdEnrichmentsToS2SRequest(REQUEST, BID_REQUESTS), BID_REQUESTS, addBidResponse, done, ajax);
          const requestBid = JSON.parse(server.requests[0].requestBody);
          sinon.assert.match(requestBid.device, {
            w: window.innerWidth,
            h: window.innerHeight
          })
          sinon.assert.match(requestBid.app, {
            bundle: 'com.test.app',
            publisher: { 'id': '1' }
          });
          expect(requestBid.imp[0].native.ver).to.equal('1.2');
        });

        it('adds native request for OpenRTB', function () {
          const _config = {
            s2sConfig: CONFIG
          };

          config.setConfig(_config);
          adapter.callBids({...REQUEST, s2sConfig: Object.assign({}, CONFIG, s2sDefaultConfig)}, BID_REQUESTS, addBidResponse, done, ajax);
          const requestBid = JSON.parse(server.requests[0].requestBody);
          const ortbReq = JSON.parse(requestBid.imp[0].native.request);
          expect(ortbReq).to.deep.equal({
            ...ORTB_NATIVE_REQ,
            'eventtrackers': [{
              event: 1,
              methods: [1, 2]
            }],
          });
          expect(requestBid.imp[0].native.ver).to.equal('1.2');
        });

        it('adds native ortb request for OpenRTB', function () {
          const _config = {
            s2sConfig: CONFIG
          };

          const openRtbNativeRequest = deepClone(REQUEST);
          delete openRtbNativeRequest.ad_units[0].mediaTypes.native;
          delete openRtbNativeRequest.ad_units[0].nativeParams;

          openRtbNativeRequest.ad_units[0].mediaTypes.native = NATIVE_ORTB_MTO;
          prepRequest(openRtbNativeRequest);

          config.setConfig(_config);
          adapter.callBids(openRtbNativeRequest, BID_REQUESTS, addBidResponse, done, ajax);
          const requestBid = JSON.parse(server.requests[0].requestBody);
          const nativeReq = JSON.parse(requestBid.imp[0].native.request);
          expect(nativeReq).to.deep.equal(NATIVE_ORTB_MTO.ortb);
          expect(requestBid.imp[0].native.ver).to.equal('1.2');
        });

        it('can override default values for imp.native.request with s2sConfig.ortbNative', () => {
          const cfg = {
            ...CONFIG,
            ortbNative: {
              eventtrackers: [
                {event: 1, methods: [1, 2]}
              ]
            }
          }
          config.setConfig({
            s2sConfig: cfg
          });
          adapter.callBids({...REQUEST, s2sConfig: cfg}, BID_REQUESTS, addBidResponse, done, ajax);
          const requestBid = JSON.parse(server.requests[0].requestBody);
          const ortbReq = JSON.parse(requestBid.imp[0].native.request);
          expect(ortbReq).to.eql({
            ...ORTB_NATIVE_REQ,
            eventtrackers: [
              {event: 1, methods: [1, 2]}
            ]
          })
        })

        it('should not include ext.aspectratios if adunit\'s aspect_ratios do not define radio_width and ratio_height', () => {
          const req = deepClone(REQUEST);
          req.ad_units[0].mediaTypes.native.icon.aspect_ratios[0] = {'min_width': 1, 'min_height': 2};
          prepRequest(req);
          adapter.callBids(req, BID_REQUESTS, addBidResponse, done, ajax);
          const nativeReq = JSON.parse(JSON.parse(server.requests[0].requestBody).imp[0].native.request);
          const icons = nativeReq.assets.map((a) => a.img).filter((img) => img && img.type === 1);
          expect(icons).to.have.length(1);
          expect(icons[0].hmin).to.equal(2);
          expect(icons[0].wmin).to.equal(1);
          expect(deepAccess(icons[0], 'ext.aspectratios')).to.be.undefined;
        });
      });
    }

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
      adapter.callBids(addFpdEnrichmentsToS2SRequest(REQUEST, BID_REQUESTS), BID_REQUESTS, addBidResponse, done, ajax);
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
        domain: 'mytestpage.com',
        page: 'http://mytestpage.com'
      });
    });

    it('site should not be present when app is present', function () {
      const _config = {
        s2sConfig: CONFIG,
        app: { bundle: 'com.test.app' },
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
      adapter.callBids(addFpdEnrichmentsToS2SRequest(REQUEST, BID_REQUESTS), BID_REQUESTS, addBidResponse, done, ajax);
      const requestBid = JSON.parse(server.requests[0].requestBody);
      expect(requestBid.site).to.not.exist;
      expect(requestBid.app).to.exist.and.to.be.a('object');
    });

    it('adds appnexus aliases to request', function () {
      config.setConfig({ s2sConfig: CONFIG });

      const aliasBidder = {
        bidder: 'beintoo',
        bid_id: REQUEST.ad_units[0].bids[0].bid_id,
        params: { placementId: '123456' }
      };

      const request = utils.deepClone(REQUEST);
      request.ad_units[0].bids = [aliasBidder];

      adapter.callBids(request, [{...BID_REQUESTS[0], bidderCode: 'beintoo'}], addBidResponse, done, ajax);

      const requestBid = JSON.parse(server.requests[0].requestBody);
      expect(requestBid.ext).to.haveOwnProperty('prebid');
      expect(requestBid.ext.prebid).to.deep.include({
        aliases: {
          beintoo: 'appnexus'
        },
        auctiontimestamp: 1510852447530,
        targeting: {
          includebidderkeys: false,
          includewinners: true
        }
      });
    });

    it('unregistered bidder should alias', function () {
      const adjustedConfig = utils.deepClone(CONFIG);
      adjustedConfig.bidders = 'bidderD'
      config.setConfig({ s2sConfig: adjustedConfig });

      const aliasBidder = {
        ...REQUEST.ad_units[0].bids[0],
        bidder: 'bidderD',
        params: {
          unit: '10433394',
        }
      };

      $$PREBID_GLOBAL$$.aliasBidder('mockBidder', aliasBidder.bidder);

      const request = utils.deepClone(REQUEST);
      request.ad_units[0].bids = [aliasBidder];
      request.s2sConfig = adjustedConfig;

      adapter.callBids(request, [{...BID_REQUESTS[0], bidderCode: aliasBidder.bidder}], addBidResponse, done, ajax);

      const requestBid = JSON.parse(server.requests[0].requestBody);
      expect(requestBid.ext.prebid.aliases).to.deep.equal({ bidderD: 'mockBidder' });
    });

    it('adds dynamic aliases to request', function () {
      config.setConfig({ s2sConfig: CONFIG });

      const alias = 'foobar';
      const aliasBidder = {
        bidder: alias,
        bid_id: REQUEST.ad_units[0].bids[0].bid_id,
        params: { placementId: '123456' }
      };

      const request = utils.deepClone(REQUEST);
      request.ad_units[0].bids = [aliasBidder];

      // TODO: stub this
      $$PREBID_GLOBAL$$.aliasBidder('appnexus', alias);
      adapter.callBids(request, [{...BID_REQUESTS[0], bidderCode: 'foobar'}], addBidResponse, done, ajax);

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

    it('skips pbs alias when skipPbsAliasing is enabled in adapter', function () {
      const s2sConfig = Object.assign({}, CONFIG, {
        endpoint: {
          p1Consent: 'https://prebid.adnxs.com/pbs/v1/openrtb2/auction'
        }
      });
      config.setConfig({ s2sConfig: s2sConfig });
      registerBidder({
        code: 'bidderCodeForTestSkipBPSAlias',
        aliases: [{
          code: 'bidderCodeForTestSkipBPSAlias_Alias',
          skipPbsAliasing: true
        }]
      })
      const aliasBidder = {
        bidder: 'bidderCodeForTestSkipBPSAlias_Alias',
        bid_id: REQUEST.ad_units[0].bids[0].bid_id,
        params: { aid: 123 }
      };

      const request = utils.deepClone(REQUEST);
      request.ad_units[0].bids = [aliasBidder];

      adapter.callBids(request, [{...BID_REQUESTS[0], bidderCode: aliasBidder.bidder}], addBidResponse, done, ajax);

      const requestBid = JSON.parse(server.requests[0].requestBody);

      sinon.assert.match(requestBid.ext.prebid, {
        auctiontimestamp: 1510852447530,
        targeting: {
          includebidderkeys: false,
          includewinners: true
        },
        channel: {
          name: 'pbjs',
          version: 'v$prebid.version$'
        }
      })
    });

    it('skips dynamic aliases to request when skipPbsAliasing enabled', function () {
      const s2sConfig = Object.assign({}, CONFIG, {
        endpoint: {
          p1Consent: 'https://prebid.adnxs.com/pbs/v1/openrtb2/auction'
        }
      });
      config.setConfig({ s2sConfig: s2sConfig });

      const alias = 'foobar_1';
      const aliasBidder = {
        bidder: alias,
        bid_id: REQUEST.ad_units[0].bids[0].bid_id,
        params: { aid: 1234567 }
      };

      const request = utils.deepClone(REQUEST);
      request.ad_units[0].bids = [aliasBidder];

      // TODO: stub this
      $$PREBID_GLOBAL$$.aliasBidder('appnexus', alias, { skipPbsAliasing: true });
      adapter.callBids(request, [{...BID_REQUESTS[0], bidderCode: aliasBidder.bidder}], addBidResponse, done, ajax);

      const requestBid = JSON.parse(server.requests[0].requestBody);

      sinon.assert.match(requestBid.ext.prebid, {
        auctiontimestamp: 1510852447530,
        targeting: {
          includebidderkeys: false,
          includewinners: true
        },
        channel: {
          name: 'pbjs',
          version: 'v$prebid.version$'
        }
      });
    });

    it('converts appnexus params to expected format for PBS', function () {
      const s2sConfig = Object.assign({}, CONFIG, {
        endpoint: {
          p1Consent: 'https://prebid.adnxs.com/pbs/v1/openrtb2/auction'
        }
      });
      config.setConfig({ s2sConfig: s2sConfig });

      Object.assign(BID_REQUESTS[0].bids[0].params, {
        usePaymentRule: true,
        keywords: {
          foo: ['bar', 'baz'],
          fizz: ['buzz']
        }
      })

      adapter.callBids(REQUEST, BID_REQUESTS, addBidResponse, done, ajax);
      const requestBid = JSON.parse(server.requests[0].requestBody);

      const requestParams = requestBid.imp[0].ext.prebid.bidder;
      expect(requestParams.appnexus).to.exist;
      expect(requestParams.appnexus.placement_id).to.exist.and.to.equal(10433394);
      expect(requestParams.appnexus.use_pmt_rule).to.exist.and.to.be.true;
      expect(requestParams.appnexus.member).to.exist;
      expect(requestParams.appnexus.keywords).to.exist.and.to.deep.equal([{
        key: 'foo',
        value: ['bar', 'baz']
      }, {
        key: 'fizz',
        value: ['buzz']
      }]);
    });

    describe('cookie sync', () => {
      let s2sConfig, bidderReqs;

      beforeEach(() => {
        bidderReqs = utils.deepClone(BID_REQUESTS);
        s2sConfig = utils.deepClone(CONFIG);
        s2sConfig.syncEndpoint = { p1Consent: 'https://prebid.adnxs.com/pbs/v1/cookie_sync' };
      })

      function callCookieSync() {
        const s2sBidRequest = utils.deepClone(REQUEST);
        s2sBidRequest.s2sConfig = s2sConfig;
        config.setConfig({ s2sConfig: s2sConfig });
        adapter.callBids(s2sBidRequest, bidderReqs, addBidResponse, done, ajax);
        return JSON.parse(server.requests[0].requestBody);
      }

      describe('filterSettings', function () {
        it('correctly adds filterSettings to the cookie_sync request if userSync.filterSettings is present in the config and only the all key is present in userSync.filterSettings', function () {
          config.setConfig({
            userSync: {
              filterSettings: {
                all: {
                  bidders: ['appnexus', 'rubicon', 'pubmatic'],
                  filter: 'exclude'
                }
              }
            }
          });
          expect(callCookieSync().filterSettings).to.deep.equal({
            'image': {
              'bidders': ['appnexus', 'rubicon', 'pubmatic'],
              'filter': 'exclude'
            },
            'iframe': {
              'bidders': ['appnexus', 'rubicon', 'pubmatic'],
              'filter': 'exclude'
            }
          });
        });

        it('correctly adds filterSettings to the cookie_sync request if userSync.filterSettings is present in the config and only the iframe key is present in userSync.filterSettings', function () {
          config.setConfig({
            userSync: {
              filterSettings: {
                iframe: {
                  bidders: ['rubicon', 'pubmatic'],
                  filter: 'include'
                }
              }
            }
          })

          expect(callCookieSync().filterSettings).to.deep.equal({
            'image': {
              'bidders': '*',
              'filter': 'include'
            },
            'iframe': {
              'bidders': ['rubicon', 'pubmatic'],
              'filter': 'include'
            }
          });
        });

        it('correctly adds filterSettings to the cookie_sync request if userSync.filterSettings is present in the config and the image and iframe keys are both present in userSync.filterSettings', function () {
          config.setConfig({
            userSync: {
              filterSettings: {
                image: {
                  bidders: ['triplelift', 'appnexus'],
                  filter: 'include'
                },
                iframe: {
                  bidders: ['pulsepoint', 'triplelift', 'appnexus', 'rubicon'],
                  filter: 'exclude'
                }
              }
            }
          })

          expect(callCookieSync().filterSettings).to.deep.equal({
            'image': {
              'bidders': ['triplelift', 'appnexus'],
              'filter': 'include'
            },
            'iframe': {
              'bidders': ['pulsepoint', 'triplelift', 'appnexus', 'rubicon'],
              'filter': 'exclude'
            }
          });
        });

        it('correctly adds filterSettings to the cookie_sync request if userSync.filterSettings is present in the config and the all and iframe keys are both present in userSync.filterSettings', function () {
          config.setConfig({
            userSync: {
              filterSettings: {
                all: {
                  bidders: ['triplelift', 'appnexus'],
                  filter: 'include'
                },
                iframe: {
                  bidders: ['pulsepoint', 'triplelift', 'appnexus', 'rubicon'],
                  filter: 'exclude'
                }
              }
            }
          })

          expect(callCookieSync().filterSettings).to.deep.equal({
            'image': {
              'bidders': ['triplelift', 'appnexus'],
              'filter': 'include'
            },
            'iframe': {
              'bidders': ['pulsepoint', 'triplelift', 'appnexus', 'rubicon'],
              'filter': 'exclude'
            }
          });
        });
      });

      describe('limit', () => {
        it('is added to request if userSyncLimit is greater than 0', function () {
          s2sConfig.userSyncLimit = 1;
          const req = callCookieSync();
          expect(req.limit).is.equal(1);
        });

        Object.entries({
          'missing': () => null,
          '0': () => { s2sConfig.userSyncLimit = 0; }
        }).forEach(([t, setup]) => {
          it(`is not added to request if userSyncLimit is ${t}`, () => {
            setup();
            const req = callCookieSync();
            expect(req.limit).to.not.exist;
          });
        });
      });

      describe('gdpr data is set', () => {
        it('when we have consent data', function () {
          bidderReqs[0].gdprConsent = mockTCF();
          const req = callCookieSync();
          expect(req.gdpr).is.equal(1);
          expect(req.gdpr_consent).is.equal('mockConsent');
        });

        it('when gdprApplies is false', () => {
          bidderReqs[0].gdprConsent = mockTCF({applies: false});
          const req = callCookieSync();
          expect(req.gdpr).is.equal(0);
          expect(req.gdpr_consent).is.undefined;
        });
      });

      it('adds USP data from bidder request', () => {
        bidderReqs[0].uspConsent = '1YNN';
        expect(callCookieSync().us_privacy).to.equal('1YNN');
      });

      it('adds GPP data from bidder requests', () => {
        bidderReqs[0].gppConsent = {
          applicableSections: [1, 2, 3],
          gppString: 'mock-string'
        };
        const req = callCookieSync();
        expect(req.gpp).to.eql('mock-string');
        expect(req.gpp_sid).to.eql('1,2,3');
      });
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
      const requestParams = requestBid.imp[0].ext.prebid.bidder;
      expect(requestParams.appnexus).to.haveOwnProperty('key');
      expect(requestParams.appnexus.key).to.be.equal('value')
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

        adapter.callBids(addFpdEnrichmentsToS2SRequest(s2sBidRequest, BID_REQUESTS), BID_REQUESTS, addBidResponse, done, ajax);
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

        adapter.callBids(addFpdEnrichmentsToS2SRequest(s2sBidRequest, BID_REQUESTS), BID_REQUESTS, addBidResponse, done, ajax);

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
      userIdBidRequest[0].bids[0].userIdAsEids = [{id: 1}, {id: 2}];

      adapter.callBids(REQUEST, userIdBidRequest, addBidResponse, done, ajax);
      let requestBid = JSON.parse(server.requests[0].requestBody);
      expect(typeof requestBid.user.ext.eids).is.equal('object');
      expect(requestBid.user.ext.eids).to.eql([{id: 1}, {id: 2}]);
    });

    it('when config \'currency.adServerCurrency\' value is a string: ORTB has property \'cur\' value set to a single item array', function () {
      config.setConfig({
        currency: { adServerCurrency: 'NZ' },
      });

      const bidRequests = utils.deepClone(BID_REQUESTS);
      adapter.callBids(REQUEST, bidRequests, addBidResponse, done, ajax);

      const parsedRequestBody = JSON.parse(server.requests.find(req => req.method === 'POST').requestBody);
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

    it('should have extPrebid.schains present on req object if bidder specific schains were configured with pbjs', function () {
      let bidRequest = utils.deepClone(BID_REQUESTS);
      bidRequest[0].bids[0].schain = {
        complete: 1,
        nodes: [{
          asi: 'test.com',
          hp: 1,
          sid: '11111'
        }],
        ver: '1.0'
      };

      adapter.callBids(REQUEST, bidRequest, addBidResponse, done, ajax);
      let requestBid = JSON.parse(server.requests[0].requestBody);

      expect(requestBid.ext.prebid.schains).to.deep.equal([
        {
          bidders: ['appnexus'],
          schain: {
            complete: 1,
            nodes: [
              {
                asi: 'test.com',
                hp: 1,
                sid: '11111'
              }
            ],
            ver: '1.0'
          }
        }
      ]);
    });

    it('should skip over adding any bid specific schain entries that already exist on extPrebid.schains', function () {
      let bidRequest = utils.deepClone(BID_REQUESTS);
      bidRequest[0].bids[0].schain = {
        complete: 1,
        nodes: [{
          asi: 'pbjs.com',
          hp: 1,
          sid: '22222'
        }],
        ver: '1.0'
      };

      const s2sConfig = Object.assign({}, CONFIG, {
        extPrebid: {
          schains: [
            {
              bidders: ['appnexus'],
              schain: {
                complete: 1,
                nodes: [
                  {
                    asi: 'pbs.com',
                    hp: 1,
                    sid: '11111'
                  }
                ],
                ver: '1.0'
              }
            }
          ]
        }
      });

      const s2sBidRequest = utils.deepClone(REQUEST);
      s2sBidRequest.s2sConfig = s2sConfig;

      adapter.callBids(s2sBidRequest, bidRequest, addBidResponse, done, ajax);

      let requestBid = JSON.parse(server.requests[0].requestBody);
      expect(requestBid.ext.prebid.schains).to.deep.equal([
        {
          bidders: ['appnexus'],
          schain: {
            complete: 1,
            nodes: [
              {
                asi: 'pbs.com',
                hp: 1,
                sid: '11111'
              }
            ],
            ver: '1.0'
          }
        }
      ]);
    });

    it('should add a bidder name to pbs schain if the schain is equal to a pbjs one but the pbjs bidder name is not in the bidder array on the pbs side', function () {
      let bidRequest = utils.deepClone(BID_REQUESTS);
      bidRequest[0].bids[0].schain = {
        complete: 1,
        nodes: [{
          asi: 'test.com',
          hp: 1,
          sid: '11111'
        }],
        ver: '1.0'
      };

      bidRequest[0].bids[1] = {
        bidder: 'rubicon',
        params: {
          accountId: 14062,
          siteId: 70608,
          zoneId: 498816
        }
      };

      const s2sConfig = Object.assign({}, CONFIG, {
        bidders: ['rubicon', 'appnexus'],
        extPrebid: {
          schains: [
            {
              bidders: ['rubicon'],
              schain: {
                complete: 1,
                nodes: [
                  {
                    asi: 'test.com',
                    hp: 1,
                    sid: '11111'
                  }
                ],
                ver: '1.0'
              }
            }
          ]
        }
      });

      const s2sBidRequest = utils.deepClone(REQUEST);
      s2sBidRequest.s2sConfig = s2sConfig;

      adapter.callBids(s2sBidRequest, bidRequest, addBidResponse, done, ajax);

      let requestBid = JSON.parse(server.requests[0].requestBody);
      expect(requestBid.ext.prebid.schains).to.deep.equal([
        {
          bidders: ['rubicon', 'appnexus'],
          schain: {
            complete: 1,
            nodes: [
              {
                asi: 'test.com',
                hp: 1,
                sid: '11111'
              }
            ],
            ver: '1.0'
          }
        }
      ]);
    });

    it('should "promote" the most reused bidder schain to source.ext.schain', () => {
      const bidderReqs = [
        {...deepClone(BID_REQUESTS[0]), bidderCode: 'A'},
        {...deepClone(BID_REQUESTS[0]), bidderCode: 'B'},
        {...deepClone(BID_REQUESTS[0]), bidderCode: 'C'}
      ];
      const chain1 = {chain: 1};
      const chain2 = {chain: 2};

      bidderReqs[0].bids[0].schain = chain1;
      bidderReqs[1].bids[0].schain = chain2;
      bidderReqs[2].bids[0].schain = chain2;

      adapter.callBids(REQUEST, bidderReqs, addBidResponse, done, ajax);
      const req = JSON.parse(server.requests[0].requestBody);
      expect(req.source.ext.schain).to.eql(chain2);
    });

    it('passes multibid array in request', function () {
      const bidRequests = utils.deepClone(BID_REQUESTS);
      const multibid = [{
        bidder: 'bidderA',
        maxBids: 2
      }, {
        bidder: 'bidderB',
        maxBids: 2
      }];
      const expected = [{
        bidder: 'bidderA',
        maxbids: 2
      }, {
        bidder: 'bidderB',
        maxbids: 2
      }];

      config.setConfig({ multibid: multibid });

      adapter.callBids(REQUEST, bidRequests, addBidResponse, done, ajax);
      const parsedRequestBody = JSON.parse(server.requests[0].requestBody);
      expect(parsedRequestBody.ext.prebid.multibid).to.deep.equal(expected);
    });

    it('sets and passes pbjs version in request if channel does not exist in s2sConfig', () => {
      const s2sBidRequest = utils.deepClone(REQUEST);
      const bidRequests = utils.deepClone(BID_REQUESTS);

      adapter.callBids(s2sBidRequest, bidRequests, addBidResponse, done, ajax);

      const parsedRequestBody = JSON.parse(server.requests[0].requestBody);
      expect(parsedRequestBody.ext.prebid.channel).to.deep.equal({ name: 'pbjs', version: 'v$prebid.version$' });
    });

    it('extPrebid is now mergedDeep -> should include default channel as well', () => {
      const s2sBidRequest = utils.deepClone(REQUEST);
      const bidRequests = utils.deepClone(BID_REQUESTS);

      utils.deepSetValue(s2sBidRequest, 's2sConfig.extPrebid.channel', { test: 1 });

      adapter.callBids(s2sBidRequest, bidRequests, addBidResponse, done, ajax);

      const parsedRequestBody = JSON.parse(server.requests[0].requestBody);

      // extPrebid is now deep merged with
      expect(parsedRequestBody.ext.prebid.channel).to.deep.equal({
        name: 'pbjs',
        test: 1,
        version: 'v$prebid.version$'
      });
    });

    it('passes first party data in request', () => {
      const s2sBidRequest = utils.deepClone(REQUEST);
      const bidRequests = utils.deepClone(BID_REQUESTS);

      const commonSite = {
        keywords: ['power tools'],
        search: 'drill'
      };
      const commonUser = {
        keywords: ['a', 'b'],
        gender: 'M'
      };

      const site = {
        content: {userrating: 4},
        ext: {
          data: {
            pageType: 'article',
            category: 'tools'
          }
        }
      };
      const user = {
        yob: '1984',
        geo: { country: 'ca' },
        ext: {
          data: {
            registered: true,
            interests: ['cars']
          }
        }
      };
      const bcat = ['IAB25', 'IAB7-39'];
      const badv = ['blockedAdv-1.com', 'blockedAdv-2.com'];
      const allowedBidders = ['appnexus'];

      const expected = allowedBidders.map(bidder => ({
        bidders: [bidder],
        config: {
          ortb2: {
            site: {
              content: { userrating: 4 },
              ext: {
                data: {
                  pageType: 'article',
                  category: 'tools'
                }
              }
            },
            user: {
              yob: '1984',
              geo: { country: 'ca' },
              ext: {
                data: {
                  registered: true,
                  interests: ['cars']
                }
              }
            },
            bcat: ['IAB25', 'IAB7-39'],
            badv: ['blockedAdv-1.com', 'blockedAdv-2.com']
          }
        }
      }));
      const commonContextExpected = utils.mergeDeep({
        'page': 'http://mytestpage.com',
        'domain': 'mytestpage.com',
        'publisher': {
          'id': '1',
          'domain': 'mytestpage.com'
        }
      }, commonSite);

      const ortb2Fragments = {
        global: {site: commonSite, user: commonUser, badv, bcat},
        bidder: Object.fromEntries(allowedBidders.map(bidder => [bidder, {site, user, bcat, badv}]))
      };

      adapter.callBids(addFpdEnrichmentsToS2SRequest({...s2sBidRequest, ortb2Fragments}, bidRequests), bidRequests, addBidResponse, done, ajax);
      const parsedRequestBody = JSON.parse(server.requests[0].requestBody);
      expect(parsedRequestBody.ext.prebid.bidderconfig).to.deep.equal(expected);
      expect(parsedRequestBody.site).to.deep.equal(commonContextExpected);
      expect(parsedRequestBody.user).to.deep.equal(commonUser);
      expect(parsedRequestBody.badv).to.deep.equal(badv);
      expect(parsedRequestBody.bcat).to.deep.equal(bcat);
    });

    it('passes first party data in request for unknown when allowUnknownBidderCodes is true', () => {
      const cfg = { ...CONFIG, allowUnknownBidderCodes: true };
      config.setConfig({ s2sConfig: cfg });

      const clonedReq = {...REQUEST, s2sConfig: cfg}
      const s2sBidRequest = utils.deepClone(clonedReq);
      const bidRequests = utils.deepClone(BID_REQUESTS);

      const commonSite = {
        keywords: ['power tools'],
        search: 'drill'
      };
      const commonUser = {
        keywords: ['a', 'b'],
        gender: 'M'
      };

      const site = {
        content: {userrating: 4},
        ext: {
          data: {
            pageType: 'article',
            category: 'tools'
          }
        }
      };
      const user = {
        yob: '1984',
        geo: { country: 'ca' },
        ext: {
          data: {
            registered: true,
            interests: ['cars']
          }
        }
      };
      const bcat = ['IAB25', 'IAB7-39'];
      const badv = ['blockedAdv-1.com', 'blockedAdv-2.com'];
      const allowedBidders = ['appnexus', 'unknown'];

      const expected = allowedBidders.map(bidder => ({
        bidders: [bidder],
        config: {
          ortb2: {
            site: {
              content: { userrating: 4 },
              ext: {
                data: {
                  pageType: 'article',
                  category: 'tools'
                }
              }
            },
            user: {
              yob: '1984',
              geo: { country: 'ca' },
              ext: {
                data: {
                  registered: true,
                  interests: ['cars']
                }
              }
            },
            bcat: ['IAB25', 'IAB7-39'],
            badv: ['blockedAdv-1.com', 'blockedAdv-2.com']
          }
        }
      }));
      const commonContextExpected = utils.mergeDeep({
        'page': 'http://mytestpage.com',
        'domain': 'mytestpage.com',
        'publisher': {
          'id': '1',
          'domain': 'mytestpage.com'
        }
      }, commonSite);

      const ortb2Fragments = {
        global: {site: commonSite, user: commonUser, badv, bcat},
        bidder: Object.fromEntries(allowedBidders.map(bidder => [bidder, {site, user, bcat, badv}]))
      };

      // adapter.callBids({ ...REQUEST, s2sConfig: cfg }, BID_REQUESTS, addBidResponse, done, ajax);

      adapter.callBids(addFpdEnrichmentsToS2SRequest({...s2sBidRequest, ortb2Fragments}, bidRequests, cfg), bidRequests, addBidResponse, done, ajax);
      const parsedRequestBody = JSON.parse(server.requests[0].requestBody);
      // eslint-disable-next-line no-console
      console.log(parsedRequestBody);
      expect(parsedRequestBody.ext.prebid.bidderconfig).to.deep.equal(expected);
      expect(parsedRequestBody.site).to.deep.equal(commonContextExpected);
      expect(parsedRequestBody.user).to.deep.equal(commonUser);
      expect(parsedRequestBody.badv).to.deep.equal(badv);
      expect(parsedRequestBody.bcat).to.deep.equal(bcat);
    });

    describe('pbAdSlot config', function () {
      it('should not send \"imp.ext.data.pbadslot\" if \"ortb2Imp.ext\" is undefined', function () {
        const consentConfig = { s2sConfig: CONFIG };
        config.setConfig(consentConfig);
        const bidRequest = utils.deepClone(REQUEST);

        adapter.callBids(bidRequest, BID_REQUESTS, addBidResponse, done, ajax);
        const parsedRequestBody = JSON.parse(server.requests[0].requestBody);

        expect(parsedRequestBody.imp).to.be.a('array');
        expect(parsedRequestBody.imp[0]).to.be.a('object');
        expect(parsedRequestBody.imp[0]).to.not.have.deep.nested.property('ext.data.pbadslot');
      });

      it('should not send \"imp.ext.data.pbadslot\" if \"ortb2Imp.ext.data.pbadslot\" is undefined', function () {
        const consentConfig = { s2sConfig: CONFIG };
        config.setConfig(consentConfig);
        const bidRequest = utils.deepClone(REQUEST);
        bidRequest.ad_units[0].ortb2Imp = {};

        adapter.callBids(bidRequest, BID_REQUESTS, addBidResponse, done, ajax);
        const parsedRequestBody = JSON.parse(server.requests[0].requestBody);

        expect(parsedRequestBody.imp).to.be.a('array');
        expect(parsedRequestBody.imp[0]).to.be.a('object');
        expect(parsedRequestBody.imp[0]).to.not.have.deep.nested.property('ext.data.pbadslot');
      });

      it('should not send \"imp.ext.data.pbadslot\" if \"ortb2Imp.ext.data.pbadslot\" is empty string', function () {
        const consentConfig = { s2sConfig: CONFIG };
        config.setConfig(consentConfig);
        const bidRequest = utils.deepClone(REQUEST);
        bidRequest.ad_units[0].ortb2Imp = {
          ext: {
            data: {
              pbadslot: ''
            }
          }
        };

        adapter.callBids(bidRequest, BID_REQUESTS, addBidResponse, done, ajax);
        const parsedRequestBody = JSON.parse(server.requests[0].requestBody);

        expect(parsedRequestBody.imp).to.be.a('array');
        expect(parsedRequestBody.imp[0]).to.be.a('object');
        expect(parsedRequestBody.imp[0]).to.not.have.deep.nested.property('ext.data.pbadslot');
      });

      it('should send \"imp.ext.data.pbadslot\" if \"ortb2Imp.ext.data.pbadslot\" value is a non-empty string', function () {
        const consentConfig = { s2sConfig: CONFIG };
        config.setConfig(consentConfig);
        const bidRequest = utils.deepClone(REQUEST);
        bidRequest.ad_units[0].ortb2Imp = {
          ext: {
            data: {
              pbadslot: '/a/b/c'
            }
          }
        };

        adapter.callBids(bidRequest, BID_REQUESTS, addBidResponse, done, ajax);
        const parsedRequestBody = JSON.parse(server.requests[0].requestBody);

        expect(parsedRequestBody.imp).to.be.a('array');
        expect(parsedRequestBody.imp[0]).to.be.a('object');
        expect(parsedRequestBody.imp[0]).to.have.deep.nested.property('ext.data.pbadslot');
        expect(parsedRequestBody.imp[0].ext.data.pbadslot).to.equal('/a/b/c');
      });
    });

    describe('GAM ad unit config', function () {
      it('should not send \"imp.ext.data.adserver.adslot\" if \"ortb2Imp.ext\" is undefined', function () {
        const consentConfig = { s2sConfig: CONFIG };
        config.setConfig(consentConfig);
        const bidRequest = utils.deepClone(REQUEST);

        adapter.callBids(bidRequest, BID_REQUESTS, addBidResponse, done, ajax);
        const parsedRequestBody = JSON.parse(server.requests[0].requestBody);

        expect(parsedRequestBody.imp).to.be.a('array');
        expect(parsedRequestBody.imp[0]).to.be.a('object');
        expect(parsedRequestBody.imp[0]).to.not.have.deep.nested.property('ext.data.adslot');
      });

      it('should not send \"imp.ext.data.adserver.adslot\" if \"ortb2Imp.ext.data.adserver.adslot\" is undefined', function () {
        const consentConfig = { s2sConfig: CONFIG };
        config.setConfig(consentConfig);
        const bidRequest = utils.deepClone(REQUEST);
        bidRequest.ad_units[0].ortb2Imp = {};

        adapter.callBids(bidRequest, BID_REQUESTS, addBidResponse, done, ajax);
        const parsedRequestBody = JSON.parse(server.requests[0].requestBody);

        expect(parsedRequestBody.imp).to.be.a('array');
        expect(parsedRequestBody.imp[0]).to.be.a('object');
        expect(parsedRequestBody.imp[0]).to.not.have.deep.nested.property('ext.data.adslot');
      });

      it('should not send \"imp.ext.data.adserver.adslot\" if \"ortb2Imp.ext.data.adserver.adslot\" is empty string', function () {
        const consentConfig = { s2sConfig: CONFIG };
        config.setConfig(consentConfig);
        const bidRequest = utils.deepClone(REQUEST);
        bidRequest.ad_units[0].ortb2Imp = {
          ext: {
            data: {
              adserver: {
                adslot: ''
              }
            }
          }
        };

        adapter.callBids(bidRequest, BID_REQUESTS, addBidResponse, done, ajax);
        const parsedRequestBody = JSON.parse(server.requests[0].requestBody);

        expect(parsedRequestBody.imp).to.be.a('array');
        expect(parsedRequestBody.imp[0]).to.be.a('object');
        expect(parsedRequestBody.imp[0]).to.not.have.deep.nested.property('ext.data.adslot');
      });

      it('should send both \"adslot\" and \"name\" from \"imp.ext.data.adserver\" if \"ortb2Imp.ext.data.adserver.adslot\" and \"ortb2Imp.ext.data.adserver.name\" values are non-empty strings', function () {
        const consentConfig = { s2sConfig: CONFIG };
        config.setConfig(consentConfig);
        const bidRequest = utils.deepClone(REQUEST);
        bidRequest.ad_units[0].ortb2Imp = {
          ext: {
            data: {
              adserver: {
                adslot: '/a/b/c',
                name: 'adserverName1'
              }
            }
          }
        };

        adapter.callBids(bidRequest, BID_REQUESTS, addBidResponse, done, ajax);
        const parsedRequestBody = JSON.parse(server.requests[0].requestBody);

        expect(parsedRequestBody.imp).to.be.a('array');
        expect(parsedRequestBody.imp[0]).to.be.a('object');
        expect(parsedRequestBody.imp[0]).to.have.deep.nested.property('ext.data.adserver.adslot');
        expect(parsedRequestBody.imp[0]).to.have.deep.nested.property('ext.data.adserver.name');
        expect(parsedRequestBody.imp[0].ext.data.adserver.adslot).to.equal('/a/b/c');
        expect(parsedRequestBody.imp[0].ext.data.adserver.name).to.equal('adserverName1');
      });
    });
  });

  describe('Bidder-level ortb2Imp', () => {
    beforeEach(() => {
      config.setConfig({
        s2sConfig: {
          ...CONFIG,
          bidders: ['A', 'B']
        }
      })
    })
    it('should be set on imp.ext.prebid.imp', () => {
      const s2sReq = utils.deepClone(REQUEST);
      s2sReq.ad_units[0].ortb2Imp = {l0: 'adUnit'};
      s2sReq.ad_units[0].bids = [
        {
          bidder: 'A',
          bid_id: 1,
          ortb2Imp: {
            l2: 'A'
          }
        },
        {
          bidder: 'B',
          bid_id: 2,
          ortb2Imp: {
            l2: 'B'
          }
        }
      ];
      const bidderReqs = [
        {
          ...BID_REQUESTS[0],
          bidderCode: 'A',
          bids: [{
            bidId: 1,
            bidder: 'A'
          }]
        },
        {
          ...BID_REQUESTS[0],
          bidderCode: 'B',
          bids: [{
            bidId: 2,
            bidder: 'B'
          }]
        }
      ]
      adapter.callBids(s2sReq, bidderReqs, addBidResponse, done, ajax);
      const req = JSON.parse(server.requests[0].requestBody);
      expect(req.imp[0].l0).to.eql('adUnit');
      expect(req.imp[0].ext.prebid.imp).to.eql({
        A: {l2: 'A'},
        B: {l2: 'B'}
      });
    });
  });

  describe('ext.prebid config', function () {
    it('should send \"imp.ext.prebid.storedrequest.id\" if \"ortb2Imp.ext.prebid.storedrequest.id\" is set', function () {
      const consentConfig = { s2sConfig: CONFIG };
      config.setConfig(consentConfig);
      const bidRequest = utils.deepClone(REQUEST);
      const storedRequestId = 'my-id';
      bidRequest.ad_units[0].ortb2Imp = {
        ext: {
          prebid: {
            storedrequest: {
              id: storedRequestId
            }
          }
        }
      };

      adapter.callBids(bidRequest, BID_REQUESTS, addBidResponse, done, ajax);
      const parsedRequestBody = JSON.parse(server.requests[0].requestBody);

      expect(parsedRequestBody.imp).to.be.a('array');
      expect(parsedRequestBody.imp[0]).to.be.a('object');
      expect(parsedRequestBody.imp[0]).to.have.deep.nested.property('ext.prebid.storedrequest.id');
      expect(parsedRequestBody.imp[0].ext.prebid.storedrequest.id).to.equal(storedRequestId);
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

    it('triggers BIDDER_ERROR on server error', () => {
      config.setConfig({ s2sConfig: CONFIG });
      adapter.callBids(REQUEST, BID_REQUESTS, addBidResponse, done, ajax);
      server.requests[0].respond(400, {}, {});
      BID_REQUESTS.forEach(bidderRequest => {
        sinon.assert.calledWith(events.emit, EVENTS.BIDDER_ERROR, sinon.match({ bidderRequest }))
      })
    })

    describe('calls done', () => {
      let success, error;
      beforeEach(() => {
        const mockAjax = function (_, callback) {
          ({success, error} = callback);
        }
        config.setConfig({ s2sConfig: CONFIG });
        adapter.callBids(REQUEST, BID_REQUESTS, addBidResponse, done, mockAjax);
      })

      it('passing timedOut = false on succcess', () => {
        success({});
        sinon.assert.calledWith(done, false);
      });

      Object.entries({
        'timeouts': true,
        'other errors': false
      }).forEach(([t, timedOut]) => {
        it(`passing timedOut = ${timedOut} on ${t}`, () => {
          error('', {timedOut});
          sinon.assert.calledWith(done, timedOut);
        })
      })
    })

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

    if (FEATURES.VIDEO) {
      it('should pass through default adserverTargeting if present in bidObject for video request', function () {
        config.setConfig({ s2sConfig: CONFIG });
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
    }

    it('should set the bidResponse currency to whats in the PBS response', function () {
      adapter.callBids(REQUEST, BID_REQUESTS, addBidResponse, done, ajax);
      server.requests[0].respond(200, {}, JSON.stringify(RESPONSE_OPENRTB));
      sinon.assert.calledOnce(addBidResponse);
      const pbjsResponse = addBidResponse.firstCall.args[1];
      expect(pbjsResponse).to.have.property('currency', 'EUR');
    });

    it('should set the default bidResponse currency when not specified in OpenRTB', function () {
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
      expect(event[0]).to.equal(EVENTS.BIDDER_DONE);
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
      expect(response.meta).to.have.property('dchain');
      expect(response.meta.dchain.ver).to.equal('1.0');
      expect(response.meta.dchain.nodes[0].asi).to.equal('magnite.com');
      expect(response).to.not.have.property('vastUrl');
      expect(response).to.not.have.property('videoCacheKey');
      expect(response).to.have.property('ttl', 60);
    });

    it('handles seatnonbid responses and emits SEAT_NON_BID', function () {
      const original = CONFIG;
      CONFIG.extPrebid = { returnallbidstatus: true };
      const nonbidResponse = {...RESPONSE_OPENRTB, ext: {seatnonbid: [{}]}};
      config.setConfig({ CONFIG });
      CONFIG = original;
      adapter.callBids(REQUEST, BID_REQUESTS, addBidResponse, done, ajax);
      const responding = deepClone(nonbidResponse);
      Object.assign(responding.ext.seatnonbid, [{auctionId: 2}])
      server.requests[0].respond(200, {}, JSON.stringify(responding));
      const event = events.emit.secondCall.args;
      expect(event[0]).to.equal(EVENTS.SEAT_NON_BID);
      expect(event[1].seatnonbid[0]).to.have.property('auctionId', 2);
      expect(event[1].requestedBidders).to.deep.equal(['appnexus']);
      expect(event[1].response).to.deep.equal(responding);
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

    if (FEATURES.VIDEO) {
      it('handles OpenRTB video responses', function () {
        const s2sConfig = Object.assign({}, CONFIG, {
          endpoint: {
            p1Consent: 'https://prebidserverurl/openrtb2/auction?querystring=param'
          }
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
          endpoint: {
            p1Consent: 'https://prebidserverurl/openrtb2/auction?querystring=param'
          }
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
    }

    it('add adserverTargeting object to bids when ext.prebid.targeting is defined', function () {
      const s2sConfig = Object.assign({}, CONFIG, {
        endpoint: {
          p1Consent: 'https://prebidserverurl/openrtb2/auction?querystring=param'
        }
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

      if (FEATURES.VIDEO) {
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
      }
    });

    it('handles response cache from ext.prebid.targeting', function () {
      const s2sConfig = Object.assign({}, CONFIG, {
        endpoint: {
          p1Consent: 'https://prebidserverurl/openrtb2/auction?querystring=param'
        }
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

      if (FEATURES.VIDEO) {
        const s2sVidRequest = utils.deepClone(VIDEO_REQUEST);
        s2sVidRequest.s2sConfig = s2sConfig;

        adapter.callBids(s2sVidRequest, BID_REQUESTS, addBidResponse, done, ajax);
        server.requests[0].respond(200, {}, JSON.stringify(cacheResponse));

        sinon.assert.calledOnce(addBidResponse);
        const response = addBidResponse.firstCall.args[1];

        expect(response).to.have.property('statusMessage', 'Bid available');
        expect(response).to.have.property('videoCacheKey', 'a5ad3993');
        expect(response).to.have.property('vastUrl', 'https://prebid-cache.net/cache?uuid=a5ad3993');
      }
    });

    it('handles response cache from ext.prebid.targeting with wurl', function () {
      const s2sConfig = Object.assign({}, CONFIG, {
        endpoint: {
          p1Consent: 'https://prebidserverurl/openrtb2/auction?querystring=param'
        }
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

      if (FEATURES.VIDEO) {
        const s2sVidRequest = utils.deepClone(VIDEO_REQUEST);
        s2sVidRequest.s2sConfig = s2sConfig;

        adapter.callBids(s2sVidRequest, BID_REQUESTS, addBidResponse, done, ajax);
        server.requests[0].respond(200, {}, JSON.stringify(cacheResponse));

        sinon.assert.calledOnce(addBidResponse);
        const response = addBidResponse.firstCall.args[1];
        expect(response).to.have.property('pbsBidId', '654321');
      }
    });

    it('add request property pbsBidId with ext.prebid.bidid value', function () {
      const s2sConfig = Object.assign({}, CONFIG, {
        endpoint: {
          p1Consent: 'https://prebidserverurl/openrtb2/auction?querystring=param'
        }
      });
      config.setConfig({ s2sConfig });
      const cacheResponse = utils.deepClone(RESPONSE_OPENRTB_VIDEO);

      if (FEATURES.VIDEO) {
        const s2sVidRequest = utils.deepClone(VIDEO_REQUEST);
        s2sVidRequest.s2sConfig = s2sConfig;

        adapter.callBids(s2sVidRequest, BID_REQUESTS, addBidResponse, done, ajax);
        server.requests[0].respond(200, {}, JSON.stringify(cacheResponse));

        sinon.assert.calledOnce(addBidResponse);
        const response = addBidResponse.firstCall.args[1];

        expect(response).to.have.property('pbsBidId', '654321');
      }
    });

    if (FEATURES.NATIVE) {
      it('handles OpenRTB native responses', function () {
        const stub = sinon.stub(auctionManager, 'index');
        stub.get(() => stubAuctionIndex({adUnits: REQUEST.ad_units}));
        const s2sConfig = Object.assign({}, CONFIG, {
          endpoint: {
            p1Consent: 'https://prebidserverurl/openrtb2/auction?querystring=param'
          }
        });
        config.setConfig({s2sConfig});

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

        stub.restore();
      });
    }

    it('should reject invalid bids', () => {
      config.setConfig({ s2sConfig: CONFIG });
      adapter.callBids(REQUEST, BID_REQUESTS, addBidResponse, done, ajax);
      const response = deepClone(RESPONSE_OPENRTB);
      Object.assign(response.seatbid[0].bid[0], {w: null, h: null});
      server.requests[0].respond(200, {}, JSON.stringify(response));
      expect(addBidResponse.reject.calledOnce).to.be.true;
      expect(addBidResponse.called).to.be.false;
    });

    it('does not (by default) allow bids that were not requested', function () {
      config.setConfig({ s2sConfig: CONFIG });
      adapter.callBids(REQUEST, BID_REQUESTS, addBidResponse, done, ajax);
      const response = deepClone(RESPONSE_OPENRTB);
      response.seatbid[0].seat = 'unknown';
      server.requests[0].respond(200, {}, JSON.stringify(response));

      expect(addBidResponse.called).to.be.false;
      expect(addBidResponse.reject.calledOnce).to.be.true;
    });

    it('allows unrequested bids if config.allowUnknownBidderCodes', function () {
      const cfg = { ...CONFIG, allowUnknownBidderCodes: true };
      config.setConfig({ s2sConfig: cfg });
      adapter.callBids({ ...REQUEST, s2sConfig: cfg }, BID_REQUESTS, addBidResponse, done, ajax);
      const response = deepClone(RESPONSE_OPENRTB);
      response.seatbid[0].seat = 'unknown';
      server.requests[0].respond(200, {}, JSON.stringify(response));

      expect(addBidResponse.calledWith(sinon.match.any, sinon.match({ bidderCode: 'unknown' }))).to.be.true;
    });

    describe('stored impressions', () => {
      let bidReq, response;

      function mks2sReq(s2sConfig = CONFIG) {
        return {...REQUEST, s2sConfig, ad_units: [{...REQUEST.ad_units[0], bids: [{bidder: null, bid_id: 'testId'}]}]};
      }

      beforeEach(() => {
        bidReq = {...BID_REQUESTS[0], bidderCode: null, bids: [{...BID_REQUESTS[0].bids[0], bidder: null, bidId: 'testId'}]}
        response = deepClone(RESPONSE_OPENRTB);
        response.seatbid[0].seat = 'storedImpression';
      })

      it('uses "null" request\'s ID for all responses, when a null request is present', function () {
        const cfg = {...CONFIG, allowUnknownBidderCodes: true};
        config.setConfig({s2sConfig: cfg});
        adapter.callBids(mks2sReq(cfg), [bidReq], addBidResponse, done, ajax);
        server.requests[0].respond(200, {}, JSON.stringify(response));
        sinon.assert.calledWith(addBidResponse, sinon.match.any, sinon.match({bidderCode: 'storedImpression', requestId: 'testId'}))
      });

      it('does not allow null requests (= stored impressions) if allowUnknownBidderCodes is not set', () => {
        config.setConfig({s2sConfig: CONFIG});
        adapter.callBids(mks2sReq(), [bidReq], addBidResponse, done, ajax);
        server.requests[0].respond(200, {}, JSON.stringify(response));
        expect(addBidResponse.called).to.be.false;
        expect(addBidResponse.reject.calledOnce).to.be.true;
      });
    })

    it('copies ortb2Imp to response when there is only a null bid', () => {
      const cfg = {...CONFIG};
      config.setConfig({s2sConfig: cfg});
      const ortb2Imp = {ext: {prebid: {storedrequest: 'value'}}};
      const req = {...REQUEST, s2sConfig: cfg, ad_units: [{...REQUEST.ad_units[0], bids: [{bidder: null, bid_id: 'testId'}], ortb2Imp}]};
      const bidReq = {...BID_REQUESTS[0], bidderCode: null, bids: [{...BID_REQUESTS[0].bids[0], bidder: null, bidId: 'testId'}]}
      adapter.callBids(req, [bidReq], addBidResponse, done, ajax);
      const actual = JSON.parse(server.requests[0].requestBody);
      sinon.assert.match(actual.imp[0], sinon.match(ortb2Imp));
    });

    it('setting adapterCode for default bidder', function () {
      config.setConfig({ CONFIG });
      adapter.callBids(REQUEST, BID_REQUESTS, addBidResponse, done, ajax);
      server.requests[0].respond(200, {}, JSON.stringify(RESPONSE_OPENRTB));

      const response = addBidResponse.firstCall.args[1];
      expect(response).to.have.property('adapterCode', 'appnexus');
    });

    it('setting adapterCode for alternate bidder', function () {
      config.setConfig({ CONFIG });
      let RESPONSE_OPENRTB2 = deepClone(RESPONSE_OPENRTB);
      RESPONSE_OPENRTB2.seatbid[0].bid[0].ext.prebid.meta.adaptercode = 'appnexus2'
      adapter.callBids(REQUEST, BID_REQUESTS, addBidResponse, done, ajax);
      server.requests[0].respond(200, {}, JSON.stringify(RESPONSE_OPENRTB2));

      const response = addBidResponse.firstCall.args[1];
      expect(response).to.have.property('adapterCode', 'appnexus2');
    });

    describe('on sync requested with no cookie', () => {
      let cfg, req, csRes;

      beforeEach(() => {
        cfg = utils.deepClone(CONFIG);
        req = utils.deepClone(REQUEST);
        cfg.syncEndpoint = { p1Consent: 'https://prebid.adnxs.com/pbs/v1/cookie_sync' };
        req.s2sConfig = cfg;
        config.setConfig({ s2sConfig: cfg });
        csRes = utils.deepClone(RESPONSE_NO_COOKIE);
      });

      afterEach(() => {
        resetSyncedStatus();
      })

      Object.entries({
        iframe: () => utils.insertUserSyncIframe,
        image: () => utils.triggerPixel,
      }).forEach(([type, syncer]) => {
        it(`passes timeout to ${type} syncs`, () => {
          cfg.syncTimeout = 123;
          csRes.bidder_status[0].usersync.type = type;
          adapter.callBids(req, BID_REQUESTS, addBidResponse, done, ajax);
          server.requests[0].respond(200, {}, JSON.stringify(csRes));
          expect(syncer().args[0]).to.include.members([123]);
        });
      });
    });
    describe('when the response contains ext.prebid.fledge', () => {
      const AU = 'div-gpt-ad-1460505748561-0';
      const FLEDGE_RESP = {
        ext: {
          prebid: {
            fledge: {
              auctionconfigs: [
                {
                  impid: AU,
                  bidder: 'appnexus',
                  config: {
                    id: 1
                  }
                },
                {
                  impid: AU,
                  bidder: 'other',
                  config: {
                    id: 2
                  }
                }
              ]
            }
          }
        }
      }

      let fledgeStub, request, bidderRequests;

      function fledgeHook(next, ...args) {
        fledgeStub(...args);
      }

      before(() => {
        addComponentAuction.before(fledgeHook);
      });

      after(() => {
        addComponentAuction.getHooks({hook: fledgeHook}).remove();
      })

      beforeEach(function () {
        fledgeStub = sinon.stub();
        config.setConfig({CONFIG});
        bidderRequests = deepClone(BID_REQUESTS);
        AU
        bidderRequests.forEach(req => {
          Object.assign(req, {
            fledgeEnabled: true,
            ortb2: {
              fpd: 1
            }
          })
          req.bids.forEach(bid => {
            Object.assign(bid, {
              ortb2Imp: {
                fpd: 2
              }
            })
          })
        });
        request = deepClone(REQUEST);
        request.ad_units.forEach(au => deepSetValue(au, 'ortb2Imp.ext.ae', 1));
      });

      function expectFledgeCalls() {
        const auctionId = bidderRequests[0].auctionId;
        sinon.assert.calledWith(fledgeStub, sinon.match({auctionId, adUnitCode: AU, ortb2: bidderRequests[0].ortb2, ortb2Imp: bidderRequests[0].bids[0].ortb2Imp}), {id: 1})
        sinon.assert.calledWith(fledgeStub, sinon.match({auctionId, adUnitCode: AU, ortb2: undefined, ortb2Imp: undefined}), {id: 2})
      }

      it('calls addComponentAuction alongside addBidResponse', function () {
        adapter.callBids(request, bidderRequests, addBidResponse, done, ajax);
        server.requests[0].respond(200, {}, JSON.stringify(mergeDeep({}, RESPONSE_OPENRTB, FLEDGE_RESP)));
        expect(addBidResponse.called).to.be.true;
        expectFledgeCalls();
      });

      it('calls addComponentAuction when there is no bid in the response', () => {
        adapter.callBids(request, bidderRequests, addBidResponse, done, ajax);
        server.requests[0].respond(200, {}, JSON.stringify(FLEDGE_RESP));
        expect(addBidResponse.called).to.be.false;
        expectFledgeCalls();
      })
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
          endpoint: {
            p1Consent: 'https://prebid.adnxs.com/pbs/v1/openrtb2/auction'
          }
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

      events.emit(EVENTS.BID_WON, {
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

      events.emit(EVENTS.BID_WON, {
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

      events.emit(EVENTS.BID_WON, {
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
        endpoint: {
          p1Consent: 'https://prebid.adnxs.com/pbs/v1/openrtb2/auction'
        }
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

    it('should configure the s2sConfig object with appnexuspsp vendor defaults unless specified by user', function () {
      const options = {
        accountId: '123',
        bidders: ['appnexus'],
        defaultVendor: 'appnexuspsp',
        timeout: 750
      };

      config.setConfig({ s2sConfig: options });
      sinon.assert.notCalled(logErrorSpy);

      let vendorConfig = config.getConfig('s2sConfig');
      expect(vendorConfig).to.have.property('accountId', '123');
      expect(vendorConfig).to.have.property('adapter', 'prebidServer');
      expect(vendorConfig.bidders).to.deep.equal(['appnexus']);
      expect(vendorConfig.enabled).to.be.true;
      expect(vendorConfig.endpoint).to.deep.equal({
        p1Consent: 'https://ib.adnxs.com/openrtb2/prebid',
        noP1Consent: 'https://ib.adnxs-simple.com/openrtb2/prebid'
      });
      expect(vendorConfig.syncEndpoint).to.deep.equal({
        p1Consent: 'https://prebid.adnxs.com/pbs/v1/cookie_sync',
        noP1Consent: 'https://prebid.adnxs-simple.com/pbs/v1/cookie_sync'
      });
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
      expect(vendorConfig.endpoint).to.deep.equal({
        p1Consent: 'https://prebid-server.rubiconproject.com/openrtb2/auction',
        noP1Consent: 'https://prebid-server.rubiconproject.com/openrtb2/auction'
      });
      expect(vendorConfig.syncEndpoint).to.deep.equal({
        p1Consent: 'https://prebid-server.rubiconproject.com/cookie_sync',
        noP1Consent: 'https://prebid-server.rubiconproject.com/cookie_sync'
      });
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
        'endpoint': {
          p1Consent: 'https://prebid-server.rubiconproject.com/openrtb2/auction',
          noP1Consent: 'https://prebid-server.rubiconproject.com/openrtb2/auction'
        },
        'syncEndpoint': {
          p1Consent: 'https://prebid-server.rubiconproject.com/cookie_sync',
          noP1Consent: 'https://prebid-server.rubiconproject.com/cookie_sync'
        },
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
        endpoint: {
          p1Consent: 'https://prebid-server.rubiconproject.com/openrtb2/auction',
          noP1Consent: 'https://prebid-server.rubiconproject.com/openrtb2/auction'
        },
        syncEndpoint: {
          p1Consent: 'https://prebid-server.rubiconproject.com/cookie_sync',
          noP1Consent: 'https://prebid-server.rubiconproject.com/cookie_sync'
        },
      })
    });

    it('should configure the s2sConfig object with openwrap vendor defaults unless specified by user', function () {
      const options = {
        accountId: '1234',
        bidders: ['pubmatic'],
        defaultVendor: 'openwrap'
      };

      config.setConfig({ s2sConfig: options });
      sinon.assert.notCalled(logErrorSpy);

      let vendorConfig = config.getConfig('s2sConfig');
      expect(vendorConfig).to.have.property('accountId', '1234');
      expect(vendorConfig).to.have.property('adapter', 'prebidServer');
      expect(vendorConfig.bidders).to.deep.equal(['pubmatic']);
      expect(vendorConfig.enabled).to.be.true;
      expect(vendorConfig.endpoint).to.deep.equal({
        p1Consent: 'https://ow.pubmatic.com/openrtb2/auction?source=pbjs',
        noP1Consent: 'https://ow.pubmatic.com/openrtb2/auction?source=pbjs'
      });
      expect(vendorConfig).to.have.property('timeout', 500);
    });

    it('should return proper defaults', function () {
      const options = {
        accountId: '1234',
        bidders: ['pubmatic'],
        defaultVendor: 'openwrap',
        timeout: 500
      };

      config.setConfig({ s2sConfig: options });
      expect(config.getConfig('s2sConfig')).to.deep.equal({
        'accountId': '1234',
        'adapter': 'prebidServer',
        'bidders': ['pubmatic'],
        'defaultVendor': 'openwrap',
        'enabled': true,
        'endpoint': {
          p1Consent: 'https://ow.pubmatic.com/openrtb2/auction?source=pbjs',
          noP1Consent: 'https://ow.pubmatic.com/openrtb2/auction?source=pbjs'
        },
        'timeout': 500
      })
    });

    it('should return default adapterOptions if not set', function () {
      config.setConfig({
        s2sConfig: {
          accountId: '1234',
          bidders: ['pubmatic'],
          defaultVendor: 'openwrap',
          timeout: 500
        }
      });
      expect(config.getConfig('s2sConfig')).to.deep.equal({
        enabled: true,
        timeout: 500,
        adapter: 'prebidServer',
        accountId: '1234',
        bidders: ['pubmatic'],
        defaultVendor: 'openwrap',
        endpoint: {
          p1Consent: 'https://ow.pubmatic.com/openrtb2/auction?source=pbjs',
          noP1Consent: 'https://ow.pubmatic.com/openrtb2/auction?source=pbjs'
        },
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
            appnexus: () => {
            }
          }
        }
      });
      expect(typeof config.getConfig('s2sConfig').syncUrlModifier.appnexus).to.equal('function')
    });

    it('should set correct bidder names to bidders property when using an alias for that bidder', function () {
      const s2sConfig = utils.deepClone(CONFIG);

      // Add syncEndpoint so that the request goes to the User Sync endpoint
      // Modify the bidders property to include an alias for Rubicon adapter
      s2sConfig.syncEndpoint = { p1Consent: 'https://prebid.adnxs.com/pbs/v1/cookie_sync' };
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
      s2sConfig.syncEndpoint = { p1Consent: 'https://prebid.adnxs.com/pbs/v1/cookie_sync' };

      const s2sBidRequest = utils.deepClone(REQUEST);
      s2sBidRequest.s2sConfig = s2sConfig;

      let bidRequest = utils.deepClone(BID_REQUESTS);

      adapter.callBids(s2sBidRequest, bidRequest, addBidResponse, done, ajax);
      let requestBid = JSON.parse(server.requests[0].requestBody);

      expect(requestBid.coopSync).to.equal(false);
    });

    it('should not add cooperative sync flag to cookie_sync request if property is not present', function () {
      let s2sConfig = utils.deepClone(CONFIG);
      s2sConfig.syncEndpoint = { p1Consent: 'https://prebid.adnxs.com/pbs/v1/cookie_sync' };

      const s2sBidRequest = utils.deepClone(REQUEST);
      s2sBidRequest.s2sConfig = s2sConfig;

      let bidRequest = utils.deepClone(BID_REQUESTS);

      adapter.callBids(s2sBidRequest, bidRequest, addBidResponse, done, ajax);
      let requestBid = JSON.parse(server.requests[0].requestBody);

      expect(requestBid.coopSync).to.be.undefined;
    });

    it('should set imp banner if ortb2Imp.banner is present', function () {
      const consentConfig = { s2sConfig: CONFIG };
      config.setConfig(consentConfig);
      const bidRequest = utils.deepClone(REQUEST);
      bidRequest.ad_units[0].ortb2Imp = {
        banner: {
          api: 7
        },
        instl: 1
      };

      adapter.callBids(bidRequest, BID_REQUESTS, addBidResponse, done, ajax);
      const parsedRequestBody = JSON.parse(server.requests[0].requestBody);

      expect(parsedRequestBody.imp[0].banner.api).to.equal(7);
      expect(parsedRequestBody.imp[0].instl).to.equal(1);
    });

    it('adds debug flag', function () {
      config.setConfig({ debug: true });

      let bidRequest = utils.deepClone(BID_REQUESTS);

      adapter.callBids(REQUEST, bidRequest, addBidResponse, done, ajax);
      let requestBid = JSON.parse(server.requests[0].requestBody);

      expect(requestBid.ext.prebid.debug).is.equal(true);
    });

    it('should correctly add floors flag', function () {
      let bidRequest = utils.deepClone(BID_REQUESTS);

      // should not pass if floorData is undefined
      adapter.callBids(REQUEST, bidRequest, addBidResponse, done, ajax);
      let requestBid = JSON.parse(server.requests[0].requestBody);

      expect(requestBid.ext.prebid.floors).to.be.undefined;

      config.setConfig({floors: {}});

      adapter.callBids(REQUEST, bidRequest, addBidResponse, done, ajax);
      requestBid = JSON.parse(server.requests[1].requestBody);

      expect(requestBid.ext.prebid.floors).to.deep.equal({ enabled: false });
    });

    it('should override prebid server default DEFAULT_S2S_CURRENCY', function () {
      config.setConfig({
        currency: { adServerCurrency: 'JPY' },
      });

      const bidRequests = utils.deepClone(BID_REQUESTS);
      adapter.callBids(REQUEST, bidRequests, addBidResponse, done, ajax);

      const parsedRequestBody = JSON.parse(server.requests[1].requestBody);
      expect(parsedRequestBody.cur).to.deep.equal(['JPY']);
    });

    it('should correctly set the floorMin key when multiple bids with various bidfloors exist', function () {
      const s2sConfig = Object.assign({}, CONFIG, {
        extPrebid: {
          floors: {
            enabled: true
          }
        },
        bidders: ['b1', 'b2']
      });

      const bidderRequests = [
        {
          ...BID_REQUESTS[0],
          bidderCode: 'b1',
          bids: [{
            bidder: 'b1',
            bidId: 1,
            getFloor: () => ({
              currency: 'US',
              floor: 1.23
            })
          }]
        },
        {
          ...BID_REQUESTS[0],
          bidderCode: 'b2',
          bids: [{
            bidder: 'b2',
            bidId: 2,
            getFloor: () => ({
              currency: 'EUR',
              floor: 3.21
            })
          }],
        }
      ];

      const adUnits = [
        {
          code: 'au1',
          transactionId: 't1',
          mediaTypes: {
            banner: {sizes: [1, 1]}
          },
          bids: [{bidder: 'b1', bid_id: 1}]
        },
        {
          code: 'au2',
          transactionId: 't2',
          bids: [{bidder: 'b2', bid_id: 2}],
          mediaTypes: {
            banner: {sizes: [1, 1]}
          }
        }
      ];

      const _config = {
        s2sConfig: s2sConfig,
      };

      const s2sBidRequest = utils.deepClone(REQUEST);
      s2sBidRequest.s2sConfig = s2sConfig;
      s2sBidRequest.ad_units = adUnits;
      config.setConfig(_config);

      adapter.callBids(s2sBidRequest, bidderRequests, addBidResponse, done, ajax);
      const requestBid = JSON.parse(server.requests[0].requestBody);
      expect(requestBid.imp[0].bidfloor).to.equal(1.23);
      expect(requestBid.imp[1].bidfloor).to.equal(3.21);

      // first imp floorCur should be set
      expect(requestBid.ext.prebid.floors).to.deep.equal({ enabled: true, floorMin: 1.23, floorMinCur: 'US' });
    });

    it('should correctly set the floorMin key when multiple bids with various bidfloors exist and ortb2Imp contains the lowest floorMin', function () {
      const s2sConfig = Object.assign({}, CONFIG, {
        extPrebid: {
          floors: {
            enabled: true
          }
        },
        bidders: ['b1', 'b2']
      });

      const bidderRequests = [
        {
          ...BID_REQUESTS[0],
          bidderCode: 'b1',
          bids: [{
            bidder: 'b1',
            bidId: 1,
            getFloor: () => ({
              currency: 'CUR',
              floor: 1.23
            })
          }]
        },
        {
          ...BID_REQUESTS[0],
          bidderCode: 'b2',
          bids: [{
            bidder: 'b2',
            bidId: 2,
            getFloor: () => ({
              currency: 'CUR',
              floor: 3.21
            })
          }],
        }
      ];

      const adUnits = [
        {
          code: 'au1',
          transactionId: 't1',
          mediaTypes: {
            banner: {sizes: [1, 1]}
          },
          bids: [{bidder: 'b1', bid_id: 1}]
        },
        {
          code: 'au2',
          transactionId: 't2',
          bids: [{bidder: 'b2', bid_id: 2}],
          mediaTypes: {
            banner: {sizes: [1, 1]}
          },
          ortb2Imp: {
            ext: {
              prebid: {
                floors: {
                  floorMin: 1
                }
              }
            }
          }
        }
      ];

      const _config = {
        s2sConfig: s2sConfig,
      };

      const s2sBidRequest = utils.deepClone(REQUEST);
      s2sBidRequest.s2sConfig = s2sConfig;
      s2sBidRequest.ad_units = adUnits;
      config.setConfig(_config);

      adapter.callBids(s2sBidRequest, bidderRequests, addBidResponse, done, ajax);
      const requestBid = JSON.parse(server.requests[0].requestBody);
      expect(requestBid.imp[0].bidfloor).to.equal(1.23);
      expect(requestBid.imp[1].bidfloor).to.equal(3.21);

      expect(requestBid.ext.prebid.floors).to.deep.equal({ enabled: true, floorMin: 1, floorMinCur: 'CUR' });
    });
  });
});
