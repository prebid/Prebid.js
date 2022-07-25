import fluctAnalyticsAdapter, {
  convertReplicatedAdUnit,
} from '../../../modules/fluctAnalyticsAdapter';
import { expect } from 'chai';
import * as events from 'src/events.js';
import { EVENTS } from 'src/constants.json';
import { server } from 'test/mocks/xhr.js';
import * as mockGpt from '../integration/faker/googletag.js';
import $$PREBID_GLOBAL$$ from '../../../src/prebid';

const adUnits = [
  {
    code: 'div-gpt-ad-1587114265584-0',
    path: '/62532913/p_fluctmagazine_320x50_surface_15377',
    mediaTypes: {
      banner: {
        sizes: [
          [
            300,
            250
          ],
          [
            336,
            280
          ]
        ],
        name: 'p_fluctmagazine_320x50_surface_15377'
      }
    },
    analytics: [
      {
        bidder: 'bidder1',
        dwid: 'dwid1'
      },
    ],
    ext: {
      device: 'SP'
    },
    bids: [
      {
        bidder: 'bidder1',
        params: {
          networkId: 11021
        },
        dwid: 'dwid1'
      },
    ],
  }
]

describe('複製枠のadUnitsをマッピングできる', () => {
  const slots = {
    'div-gpt-ad-1587114265584-0': '/62532913/p_fluctmagazine_320x50_surface_15377',
    'browsi_ad_0_ai_1_rc_0': '/62532913/p_fluctmagazine_320x50_surface_15377'
  }
  it('adUnitsに複製元codeとdwidを付与できる', () => {
    const browsiAdUnit = {
      code: 'browsi_ad_0_ai_1_rc_0',
      mediaTypes: {
        banner: {
          name: 'p_fluctmagazine_320x50_surface_15377',
          sizes: [
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
    const actual = convertReplicatedAdUnit(browsiAdUnit, [browsiAdUnit, ...adUnits], slots)
    const expected = {
      ...browsiAdUnit,
      code: 'div-gpt-ad-1587114265584-0',
      originalCode: browsiAdUnit.code,
      bids: [
        {
          bidder: 'bidder1',
          params: {
            networkId: 11021
          },
          dwid: 'dwid1'
        },
      ],
      analytics: [
        {
          bidder: 'bidder1',
          dwid: 'dwid1',
        }
      ],
    }
    expect(expected).to.deep.equal(actual)
  })
})

const MOCK = {
  AUCTION_INIT: {
    'auctionId': 'eeca6754-525b-4c4c-a697-b06b1fc6c352',
    'timestamp': 1635837149209,
    'auctionStatus': 'inProgress',
    'adUnits': adUnits
  },
  BID_REQUESTED: {
    'auctionId': 'eeca6754-525b-4c4c-a697-b06b1fc6c352',
    'bidderRequestId': '9481bc7a501fb8',
    'bids': [{
      'bidder': adUnits[0].bids[0].bidder,
      'dwid': adUnits[0].bids[0].dwid,
      'params': adUnits[0].bids[0].params,
      'adUnitCode': adUnits[0].code,
      'bidId': '22697ff3e5bf7ee',
      'bidderRequestId': '9481bc7a501fb8',
    }]
  },
  AUCTION_END: {
    'auctionId': 'eeca6754-525b-4c4c-a697-b06b1fc6c352',
    'timestamp': 1635837149209,
    'auctionEnd': 1635837149840,
    'auctionStatus': 'completed',
    'adUnits': adUnits,
    'adUnitCodes': adUnits.map(adUnit => adUnit.code),
    'noBids': [],
    'bidderRequests': [
      {
        'bidderCode': adUnits[0].bids[0].bidder,
        'auctionId': 'eeca6754-525b-4c4c-a697-b06b1fc6c352',
        'bidderRequestId': '9481bc7a501fb8',
        'bids': [
          {
            'bidder': adUnits[0].bids[0].bidder,
            'dwid': adUnits[0].bids[0].dwid,
            'params': adUnits[0].bids[0].params,
            'adUnitCode': adUnits[0].code,
            // 'transactionId': 'transactionId',
            'bidId': '22697ff3e5bf7ee',
            'bidderRequestId': '9481bc7a501fb8',
            'auctionId': 'eeca6754-525b-4c4c-a697-b06b1fc6c352',
            'src': 'client',
            'bidRequestsCount': 1,
            'bidderRequestsCount': 1,
            'bidderWinsCount': 0,
          }
        ],
        'auctionStart': 1635837149209,
      }
    ],
    'bidsReceived': [
      {
        'dwid': adUnits[0].bids[0].dwid,
        'bidder': adUnits[0].bids[0].bidder,
        'bidderCode': adUnits[0].bids[0].bidder,
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
          'fbs_bidder': 'bidder1',
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
  SET_TARGETING: adUnits.reduce((prev, current) => Object.assign(prev, { [current.code]: {} }), {})
}

describe('fluct analytics adapter', () => {
  beforeEach(() => {
    mockGpt.enable()
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
    $$PREBID_GLOBAL$$.adUnits = adUnits
    fluctAnalyticsAdapter.enableAnalytics({ provider: 'fluct' })
  })
  afterEach(() => {
    mockGpt.disable()
    fluctAnalyticsAdapter.disableAnalytics()
  })
  it('EVENT: `AUCTION_END` 時に値を送信できる', () => {
    events.emit(EVENTS.AUCTION_INIT, MOCK.AUCTION_INIT)
    events.emit(EVENTS.BID_REQUESTED, MOCK.BID_REQUESTED)
    events.emit(EVENTS.AUCTION_END, MOCK.AUCTION_END)
    expect(server.requests.length).to.equal(1)

    const actual = JSON.parse(server.requests[0].requestBody)
    const expected = {
      auctionId: MOCK.AUCTION_END.auctionId,
      bids: [
        {
          adserverTargeting: {
            fbs_bidder: "bidder1",
            fbs_adid: "5c28bc93-b1a0-481b-ae59-0641f316ad1a",
            fbs_pb: "4.00",
            fbs_size: "320x100",
            fbs_source: "client",
            fbs_format: "banner",
            fbs_adomain: ""
          },
          adUnitCode: "div-gpt-ad-1587114265584-0",
          bidder: "bidder1",
          bidWon: false,
          cpm: 5.386152744293213,
          creativeId: "11017985",
          dwid: "dwid1",
          height: 100,
          netRevenue: true,
          noBid: false,
          prebidWon: true,
          requestId: "22697ff3e5bf7ee",
          timeout: false,
          timeToRespond: 216,
          width: 320,
        }
      ],
      timestamp: actual.timestamp,
    }
    expect(expected).to.deep.equal(actual)
  })
})
