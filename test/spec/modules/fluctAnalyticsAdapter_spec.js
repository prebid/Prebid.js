import fluctAnalyticsAdapter from '../../../modules/fluctAnalyticsAdapter';
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
          eidsSource: null,
          height: 100,
          netRevenue: true,
          noBid: false,
          pbadslot: null,
          prebidWon: true,
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
