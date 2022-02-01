import fluctAnalyticsAdapter, {
  getAdUnitCodeBeforeReplication,
} from '../../../modules/fluctAnalyticsAdapter';
import { expect } from 'chai';
import * as events from 'src/events.js';
import * as utils from 'src/utils.js'
import CONSTANTS from 'src/constants.json';
import { config } from 'src/config.js';
import { server } from 'test/mocks/xhr.js';
import * as mockGpt from '../integration/faker/googletag.js';
import {
  setConfig,
  addBidResponseHook,
} from 'modules/currency.js';
// import * as rtdModule from 'modules/rtdModule/index.js';

describe('正規表現にマッチしている', () => {
  const slots = {
    'div-gpt-ad-1629864618640-0': '/62532913/p_fluctmagazine_320x50_surface_15377',
    'browsi_ad_0_ai_1_rc_0': '/62532913/p_fluctmagazine_320x50_surface_15377'
  }

  it('browsi枠codeから複製前の枠codeを取得できる', () => {
    const adUnitCode = getAdUnitCodeBeforeReplication(slots, 'browsi_ad_0_ai_1_rc_0')
    expect(adUnitCode).to.equal('div-gpt-ad-1629864618640-0')
  })

  it('browsi枠ではない枠codeは変化しない', () => {
    const adUnitCode = getAdUnitCodeBeforeReplication(slots, 'div-gpt-ad-1629864618640-0')
    expect(adUnitCode).to.equal('div-gpt-ad-1629864618640-0')
  })

  it('adUnitPathが一致する枠が存在しない', () => {
    Object.assign(slots, { 'browsi_ad_500_ai_1_rc_0': 'DUMMY_PATH' })
    const adUnitCode = getAdUnitCodeBeforeReplication(slots, 'browsi_ad_500_ai_1_rc_0')
    expect(adUnitCode).to.equal('browsi_ad_500_ai_1_rc_0')
  })
})

const {
  EVENTS: {
    AUCTION_INIT,
    AUCTION_END,
    BID_WON,
  }
} = CONSTANTS;

const MOCK = {
  AUCTION_INIT: {
    'auctionId': 'eeca6754-525b-4c4c-a697-b06b1fc6c352',
    'timestamp': 1635837149209,
    'auctionStatus': 'inProgress',
    'adUnits': [
      {
        'code': 'div-gpt-ad-1587114265584-0',
        'bids': [
          {
            'bidder': 'criteo',
            'params': {
              'networkId': '11021'
            },
            'ortb2Imp': {
              'ext': {
                'data': {
                  'adserver': {
                    'name': 'gam',
                    'adslot': '/11598608/sk_sp_article_footeroverlay'
                  },
                  'pbadslot': '/11598608/sk_sp_article_footeroverlay'
                }
              }
            },
            'mediaTypes': {
              'banner': {
                'sizes': [
                  [
                    320,
                    100
                  ],
                  [
                    320,
                    50
                  ]
                ],
                'name': 'sk_sp_article_footeroverlay'
              }
            },
            'adUnitCode': 'div-gpt-ad-1587114265584-0',
            'transactionId': '411f223f-299e-484f-8ffd-4ce75db58112',
            'sizes': [
              [
                320,
                100
              ],
              [
                320,
                50
              ]
            ],
            'bidId': '22697ff3e5bf7ee',
            'bidderRequestId': '19ef6cc0e7a746c',
            'auctionId': 'eeca6754-525b-4c4c-a697-b06b1fc6c352',
            'src': 'client',
            'bidRequestsCount': 1,
            'bidderRequestsCount': 1,
            'bidderWinsCount': 0
          },
        ],
        'auctionStart': 1635837149209,
        'timeout': 1500,
        'refererInfo': {
          'referer': 'https://www.soccer-king.jp/news/world/esp/20211013/1578369.html?cx_top=topix&pbjs_debug=true',
          'reachedTop': true,
          'isAmp': false,
          'numIframes': 0,
          'stack': [
            'https://www.soccer-king.jp/news/world/esp/20211013/1578369.html?cx_top=topix&pbjs_debug=true'
          ],
          'canonicalUrl': 'https://www.soccer-king.jp/news/world/esp/20211013/1578369.html'
        },
        'start': 1635837149282
      }
    ],
    'noBids': [],
    'bidsReceived': [
      {
        'bidderCode': 'criteo',
        'width': 320,
        'height': 100,
        'statusMessage': 'Bid available',
        'adId': '5c28bc93-b1a0-481b-ae59-0641f316ad1a',
        'requestId': '22697ff3e5bf7ee',
        'mediaType': 'banner',
        'source': 'client',
        'cpm': 5.386152744293213,
        'currency': 'JPY',
        'netRevenue': true,
        'ttl': 60,
        'creativeId': '11017985',
        'dealId': '',
        'ad': 'HTML_CODE',
        'originalCpm': 5.386152744293213,
        'originalCurrency': 'JPY',
        'meta': {},
        'auctionId': 'eeca6754-525b-4c4c-a697-b06b1fc6c352',
        'responseTimestamp': 1635837149448,
        'requestTimestamp': 1635837149232,
        'bidder': 'criteo',
        'adUnitCode': 'div-gpt-ad-1587114265584-0',
        'timeToRespond': 216,
        'pbLg': '5.00',
        'pbMg': '5.30',
        'pbHg': '5.38',
        'pbAg': '5.30',
        'pbDg': '5.35',
        'pbCg': '4.00',
        'size': '320x100',
        'adserverTargeting': {
          'fbs_bidder': 'criteo',
          'fbs_adid': '5c28bc93-b1a0-481b-ae59-0641f316ad1a',
          'fbs_pb': '4.00',
          'fbs_size': '320x100',
          'fbs_source': 'client',
          'fbs_format': 'banner',
          'fbs_adomain': ''
        },
        'status': 'rendered',
        'params': [
          {
            'networkId': '11021'
          }
        ]
      },
    ],
    'winningBids': [],
    'timeout': 1500
  },
  AUCTION_END: {
    'auctionId': 'eeca6754-525b-4c4c-a697-b06b1fc6c352',
    'timestamp': 1635837149209,
    'auctionEnd': 1635837149840,
    'auctionStatus': 'completed',
    'adUnits': [
      {
        'code': 'div-gpt-ad-1587114265584-0',
        'bids': [
          {
            'bidder': 'criteo',
            'params': {
              'networkId': '11021'
            }
          }
        ],
        'mediaTypes': {
          'banner': {
            'sizes': [
              [
                320,
                100
              ],
              [
                320,
                50
              ]
            ],
            'name': 'sk_sp_article_footeroverlay'
          }
        },
        'analytics': [
          {
            'bidder': 'appnexus',
            'dwid': 'ecnavi_jp_22749357_soccer_king_hb_sp_network'
          },
          {
            'bidder': 'criteo',
            'dwid': '1609486'
          },
          {
            'bidder': 'ix',
            'dwid': '721766'
          },
          {
            'bidder': 'logicad',
            'dwid': 'JMk4_QAoN'
          },
          {
            'bidder': 'pubmatic',
            'dwid': '4065991'
          }
        ],
        'ext': {
          'device': 'SP'
        },
        'sizes': [
          [
            320,
            100
          ],
          [
            320,
            50
          ]
        ],
        'transactionId': '411f223f-299e-484f-8ffd-4ce75db58112',
        'ortb2Imp': {
          'ext': {
            'data': {
              'adserver': {
                'name': 'gam',
                'adslot': '/11598608/sk_sp_article_footeroverlay'
              },
              'pbadslot': '/11598608/sk_sp_article_footeroverlay'
            }
          }
        },
        'adserverTargeting': {
          'browsiViewability': [
            '1.00'
          ]
        }
      }
    ],
    'adUnitCodes': [
      'div-gpt-ad-1587114265584-0'
    ],
    'bidderRequests': [
      {
        'bidderCode': 'criteo',
        'auctionId': 'eeca6754-525b-4c4c-a697-b06b1fc6c352',
        'bidderRequestId': '19ef6cc0e7a746c',
        'bids': [
          {
            'bidder': 'criteo',
            'params': {
              'networkId': '11021'
            },
            'ortb2Imp': {
              'ext': {
                'data': {
                  'adserver': {
                    'name': 'gam',
                    'adslot': '/11598608/sk_sp_article_footeroverlay'
                  },
                  'pbadslot': '/11598608/sk_sp_article_footeroverlay'
                }
              }
            },
            'mediaTypes': {
              'banner': {
                'sizes': [
                  [
                    320,
                    100
                  ],
                  [
                    320,
                    50
                  ]
                ],
                'name': 'sk_sp_article_footeroverlay'
              }
            },
            'adUnitCode': 'div-gpt-ad-1587114265584-0',
            'transactionId': '411f223f-299e-484f-8ffd-4ce75db58112',
            'sizes': [
              [
                320,
                100
              ],
              [
                320,
                50
              ]
            ],
            'bidId': '22697ff3e5bf7ee',
            'bidderRequestId': '19ef6cc0e7a746c',
            'auctionId': 'eeca6754-525b-4c4c-a697-b06b1fc6c352',
            'src': 'client',
            'bidRequestsCount': 1,
            'bidderRequestsCount': 1,
            'bidderWinsCount': 0
          }
        ],
        'auctionStart': 1635837149209,
        'timeout': 1500,
        'refererInfo': {
          'referer': 'https://www.soccer-king.jp/news/world/esp/20211013/1578369.html?cx_top=topix&pbjs_debug=true',
          'reachedTop': true,
          'isAmp': false,
          'numIframes': 0,
          'stack': [
            'https://www.soccer-king.jp/news/world/esp/20211013/1578369.html?cx_top=topix&pbjs_debug=true'
          ],
          'canonicalUrl': 'https://www.soccer-king.jp/news/world/esp/20211013/1578369.html'
        },
        'start': 1635837149232
      }
    ],
    'noBids': [],
    'bidsReceived': [
      {
        'bidderCode': 'criteo',
        'width': 320,
        'height': 100,
        'statusMessage': 'Bid available',
        'adId': '5c28bc93-b1a0-481b-ae59-0641f316ad1a',
        'requestId': '22697ff3e5bf7ee',
        'mediaType': 'banner',
        'source': 'client',
        'cpm': 5.386152744293213,
        'currency': 'JPY',
        'netRevenue': true,
        'ttl': 60,
        'creativeId': '11017985',
        'dealId': '',
        'ad': 'HTML_CODE',
        'originalCpm': 5.386152744293213,
        'originalCurrency': 'JPY',
        'meta': {},
        'auctionId': 'eeca6754-525b-4c4c-a697-b06b1fc6c352',
        'responseTimestamp': 1635837149448,
        'requestTimestamp': 1635837149232,
        'bidder': 'criteo',
        'adUnitCode': 'div-gpt-ad-1587114265584-0',
        'timeToRespond': 216,
        'pbLg': '5.00',
        'pbMg': '5.30',
        'pbHg': '5.38',
        'pbAg': '5.30',
        'pbDg': '5.35',
        'pbCg': '4.00',
        'size': '320x100',
        'adserverTargeting': {
          'fbs_bidder': 'criteo',
          'fbs_adid': '5c28bc93-b1a0-481b-ae59-0641f316ad1a',
          'fbs_pb': '4.00',
          'fbs_size': '320x100',
          'fbs_source': 'client',
          'fbs_format': 'banner',
          'fbs_adomain': ''
        },
        'status': 'rendered',
        'params': [
          {
            'networkId': '11021'
          }
        ]
      }
    ],
    'winningBids': [],
    'timeout': 1500
  },
  BID_WON: {
    'bidderCode': 'criteo',
    'width': 320,
    'height': 100,
    'statusMessage': 'Bid available',
    'adId': '5c28bc93-b1a0-481b-ae59-0641f316ad1a',
    'requestId': '22697ff3e5bf7ee',
    'mediaType': 'banner',
    'source': 'client',
    'cpm': 5.386152744293213,
    'currency': 'JPY',
    'netRevenue': true,
    'ttl': 60,
    'creativeId': '11017985',
    'dealId': '',
    'ad': 'HTML_CODE',
    'originalCpm': 5.386152744293213,
    'originalCurrency': 'JPY',
    'meta': {},
    'auctionId': 'eeca6754-525b-4c4c-a697-b06b1fc6c352',
    'responseTimestamp': 1635837149448,
    'requestTimestamp': 1635837149232,
    'bidder': 'criteo',
    'adUnitCode': 'div-gpt-ad-1587114265584-0',
    'timeToRespond': 216,
    'pbLg': '5.00',
    'pbMg': '5.30',
    'pbHg': '5.38',
    'pbAg': '5.30',
    'pbDg': '5.35',
    'pbCg': '4.00',
    'size': '320x100',
    'adserverTargeting': {
      'fbs_bidder': 'criteo',
      'fbs_adid': '5c28bc93-b1a0-481b-ae59-0641f316ad1a',
      'fbs_pb': '4.00',
      'fbs_size': '320x100',
      'fbs_source': 'client',
      'fbs_format': 'banner',
      'fbs_adomain': ''
    },
    'status': 'rendered',
    'params': [
      {
        'networkId': '11021'
      }
    ]
  },
}

describe('fluct analytics adapter', () => {
  let sandbox
  beforeEach(() => {
    sandbox = sinon.sandbox.create()
    sandbox.stub(events, 'getEvents').returns([])
    config.resetConfig()
    mockGpt.reset()
    mockGpt.makeSlot({ code: '/11598608/sk_sp_article_InArticle', divId: 'div-gpt-ad-1587114265584-0' })
    mockGpt.makeSlot({ code: '/11598608/sk_sp_article_InArticle', divId: 'browsi_ad_0_ai_1_rc_0' })
    fluctAnalyticsAdapter.enableAnalytics({ provider: 'fluct' })
  })

  afterEach(() => {
    config.resetConfig()
    mockGpt.reset()
    sandbox.restore()
    fluctAnalyticsAdapter.disableAnalytics()
  })

  it('EVENT: `AUCTION_END` 時に値を送信できる', () => {
    events.emit(AUCTION_INIT, MOCK.AUCTION_INIT)
    events.emit(AUCTION_END, MOCK.AUCTION_END)
    expect(server.requests.length).to.equal(1)
    expect(JSON.parse(server.requests[0].requestBody).auctionId).to.equal(MOCK.AUCTION_END.auctionId)
  })
})
