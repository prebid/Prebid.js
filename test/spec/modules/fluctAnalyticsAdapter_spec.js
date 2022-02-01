import fluctAnalyticsAdapter, {
  convertReplicatedAdUnits,
} from '../../../modules/fluctAnalyticsAdapter';
import { expect } from 'chai';
import * as events from 'src/events.js';
import CONSTANTS from 'src/constants.json';
import { config } from 'src/config.js';
import { server } from 'test/mocks/xhr.js';
import * as mockGpt from '../integration/faker/googletag.js';

describe('正規表現にマッチしている', () => {
  const adUnits = [
    {
      'code': 'div-gpt-ad-1629864618640-0',
      'mediaTypes': {
        'banner': {
          'sizes': [
            [
              300,
              250
            ],
            [
              336,
              280
            ]
          ],
          'name': 'p_fluctmagazine_320x50_surface_15377'
        }
      },
      'analytics': [
        {
          'bidder': 'bidder1',
          'dwid': 'dwid1'
        },
        {
          'bidder': 'bidder2',
          'dwid': 'dwid2'
        }
      ],
      'ext': {
        'device': 'SP'
      }
    },
    {
      'code': 'browsi_ad_0_ai_1_rc_0',
      'mediaTypes': {
        'banner': {
          'sizes': [
            [
              300,
              250
            ],
            [
              336,
              280
            ]
          ]
        }
      }
    }
  ]
  const slots = {
    'div-gpt-ad-1629864618640-0': '/62532913/p_fluctmagazine_320x50_surface_15377',
    'browsi_ad_0_ai_1_rc_0': '/62532913/p_fluctmagazine_320x50_surface_15377'
  }

  it('', () => {
    const actual = [
      {
        '_code': 'div-gpt-ad-1629864618640-0',
        'analytics': [
          {
            'bidder': 'bidder1',
            'dwid': 'dwid1',
          },
          {
            'bidder': 'bidder2',
            'dwid': 'dwid2',
          },
        ],
        'bids': undefined,
        'code': 'div-gpt-ad-1629864618640-0',
        'ext': {
          'device': 'SP',
        },
        'mediaTypes': {
          'banner': {
            'name': 'p_fluctmagazine_320x50_surface_15377',
            'sizes': [
              [
                300,
                250,
              ],
              [
                336,
                280,
              ],
            ],
          },
        },
      },
      {
        '_code': 'div-gpt-ad-1629864618640-0',
        'analytics': [
          {
            'bidder': 'bidder1',
            'dwid': 'dwid1',
          },
          {
            'bidder': 'bidder2',
            'dwid': 'dwid2',
          },
        ],
        'bids': undefined,
        'code': 'browsi_ad_0_ai_1_rc_0',
        'mediaTypes': {
          'banner': {
            'name': 'p_fluctmagazine_320x50_surface_15377',
            'sizes': [
              [
                300,
                250,
              ],
              [
                336,
                280,
              ]
            ]
          }
        }
      }
    ]
    expect(convertReplicatedAdUnits(adUnits, slots)).to.deep.equal(actual)
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
            'name': 'p_fluctmagazine_320x50_surface_15377'
          }
        }
      }
    ]
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
            'name': 'p_fluctmagazine_320x50_surface_15377'
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
      }
    ],
    'adUnitCodes': [
      'div-gpt-ad-1587114265584-0'
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
  }
}

describe('fluct analytics adapter', () => {
  let sandbox
  beforeEach(() => {
    sandbox = sinon.sandbox.create()
    sandbox.stub(events, 'getEvents').returns([])
    config.resetConfig()
    mockGpt.reset()
    fluctAnalyticsAdapter.enableAnalytics({ provider: 'fluct' })
  })

  afterEach(() => {
    config.resetConfig()
    mockGpt.reset()
    sandbox.restore()
    fluctAnalyticsAdapter.disableAnalytics()
  })

  it('EVENT: `AUCTION_END` 時に値を送信できる', () => {
    window.googletag.pubads().setSlots([
      mockGpt.makeSlot({
        code: '/62532913/p_fluctmagazine_320x50_surface_15377',
        divId: 'div-gpt-ad-1587114265584-0'
      }),
      mockGpt.makeSlot({
        code: '/62532913/p_fluctmagazine_320x50_surface_15377',
        divId: 'browsi_ad_0_ai_1_rc_0'
      })
    ])
    events.emit(AUCTION_INIT, MOCK.AUCTION_INIT)
    events.emit(AUCTION_END, MOCK.AUCTION_END)
    expect(server.requests.length).to.equal(1)
    expect(JSON.parse(server.requests[0].requestBody).auctionId).to.equal(MOCK.AUCTION_END.auctionId)
  })
})
