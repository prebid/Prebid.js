import { expect } from 'chai'
import { spec } from 'modules/idxBidAdapter.js'

const BIDDER_CODE = 'idx'
const ENDPOINT_URL = 'https://dev-event.dxmdp.com/rest/api/v1/bid'
const DEFAULT_PRICE = 1
const DEFAULT_CURRENCY = 'USD'
const DEFAULT_BANNER_WIDTH = 300
const DEFAULT_BANNER_HEIGHT = 250

describe('idxBidAdapter', function () {
  describe('isBidRequestValid', function () {
    let validBid = {
      bidder: BIDDER_CODE,
      mediaTypes: {
        banner: {
          sizes: [[DEFAULT_BANNER_WIDTH, DEFAULT_BANNER_HEIGHT]]
        }
      }
    }

    it('should return true when required params found', function () {
      expect(spec.isBidRequestValid(validBid)).to.equal(true)
    })

    it('should return false when required params are not passed', function () {
      let bid = Object.assign({}, validBid)
      bid.mediaTypes = {}
      expect(spec.isBidRequestValid(bid)).to.equal(false)
    })
  })
  describe('buildRequests', function () {
    let bidRequests = [
      {
        bidder: BIDDER_CODE,
        bidId: 'asdf12345',
        mediaTypes: {
          banner: {
            sizes: [[DEFAULT_BANNER_WIDTH, DEFAULT_BANNER_HEIGHT]]
          }
        },
      }
    ]
    let bidderRequest = {
      bidderCode: BIDDER_CODE,
      bidderRequestId: '12345asdf',
      bids: [
        {
          ...bidRequests[0]
        }
      ],
    }

    it('sends video bid request to ENDPOINT via POST', function () {
      const request = spec.buildRequests(bidRequests, bidderRequest)
      expect(request.url).to.equal(ENDPOINT_URL)
      expect(request.method).to.equal('POST')
    })
  })
  describe('interpretResponse', function () {
    it('should get correct bid response', function () {
      let response = {
        id: 'f6adb85f-4e19-45a0-b41e-2a5b9a48f23a',
        seatbid: [
          {
            bid: [
              {
                id: '123',
                impid: 'b4f290d7-d4ab-4778-ab94-2baf06420b22',
                price: DEFAULT_PRICE,
                adm: '<b>hi</b>',
                cid: 'test_cid',
                crid: 'test_banner_crid',
                w: DEFAULT_BANNER_WIDTH,
                h: DEFAULT_BANNER_HEIGHT,
                adomain: [],
              }
            ],
            seat: BIDDER_CODE
          }
        ],
      }

      let expectedResponse = [
        {
          requestId: 'b4f290d7-d4ab-4778-ab94-2baf06420b22',
          cpm: DEFAULT_PRICE,
          width: DEFAULT_BANNER_WIDTH,
          height: DEFAULT_BANNER_HEIGHT,
          creativeId: 'test_banner_crid',
          ad: '<b>hi</b>',
          currency: DEFAULT_CURRENCY,
          netRevenue: true,
          ttl: 300,
          meta: { advertiserDomains: [] },
        }
      ]
      let result = spec.interpretResponse({ body: response })

      expect(Object.keys(result[0])).to.have.members(Object.keys(expectedResponse[0]))
    })
  })
})
