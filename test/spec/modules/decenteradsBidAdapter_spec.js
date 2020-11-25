import { expect } from 'chai'
import { spec } from '../../../modules/decenteradsBidAdapter.js'
import { deepStrictEqual, notEqual, ok, strictEqual } from 'assert'

describe('DecenteradsAdapter', () => {
  const bid = {
    bidId: '9ec5b177515ee2e5',
    bidder: 'decenterads',
    params: {
      placementId: 0,
      traffic: 'banner'
    }
  }

  describe('isBidRequestValid', () => {
    it('Should return true if there are bidId, params and placementId parameters present', () => {
      strictEqual(true, spec.isBidRequestValid(bid))
    })

    it('Should return false if at least one of parameters is not present', () => {
      const b = { ...bid }
      delete b.params.placementId
      strictEqual(false, spec.isBidRequestValid(b))
    })
  })

  describe('buildRequests', () => {
    const serverRequest = spec.buildRequests([bid])

    it('Creates a ServerRequest object with method, URL and data', () => {
      ok(serverRequest)
      ok(serverRequest.method)
      ok(serverRequest.url)
      ok(serverRequest.data)
    })

    it('Returns POST method', () => {
      strictEqual('POST', serverRequest.method)
    })

    it('Returns valid URL', () => {
      strictEqual('https://supply.decenterads.com/?c=o&m=multi', serverRequest.url)
    })

    it('Returns valid data if array of bids is valid', () => {
      const { data } = serverRequest
      strictEqual('object', typeof data)
      deepStrictEqual(['deviceWidth', 'deviceHeight', 'language', 'secure', 'host', 'page', 'placements'], Object.keys(data))
      strictEqual('number', typeof data.deviceWidth)
      strictEqual('number', typeof data.deviceHeight)
      strictEqual('string', typeof data.language)
      strictEqual('string', typeof data.host)
      strictEqual('string', typeof data.page)
      notEqual(-1, [0, 1].indexOf(data.secure))

      const placement = data.placements[0]
      deepStrictEqual(['placementId', 'bidId', 'traffic'], Object.keys(placement))
      strictEqual(0, placement.placementId)
      strictEqual('9ec5b177515ee2e5', placement.bidId)
      strictEqual('banner', placement.traffic)
    })

    it('Returns empty data if no valid requests are passed', () => {
      const { placements } = spec.buildRequests([]).data

      expect(spec.buildRequests([]).data.placements).to.be.an('array')
      strictEqual(0, placements.length)
    })
  })

  describe('interpretResponse', () => {
    const validData = [
      {
        body: [{
          mediaType: 'banner',
          width: 300,
          height: 250,
          cpm: 0.4,
          ad: 'Test',
          requestId: '9ec5b177515ee2e5',
          ttl: 120,
          creativeId: '2',
          netRevenue: true,
          currency: 'USD',
          dealId: '1'
        }]
      },
      {
        body: [{
          vastUrl: 'decenterads.com',
          mediaType: 'video',
          cpm: 0.5,
          requestId: '9ec5b177515ee2e5',
          ttl: 120,
          creativeId: '2',
          netRevenue: true,
          currency: 'USD',
          dealId: '1'
        }]
      },
      {
        body: [{
          mediaType: 'native',
          clickUrl: 'decenterads.com',
          title: 'Test',
          image: 'decenterads.com',
          creativeId: '2',
          impressionTrackers: ['decenterads.com'],
          ttl: 120,
          cpm: 0.4,
          requestId: '9ec5b177515ee2e5',
          netRevenue: true,
          currency: 'USD',
        }]
      }
    ]

    for (const obj of validData) {
      const { mediaType } = obj.body[0]

      it(`Should interpret ${mediaType} response`, () => {
        const response = spec.interpretResponse(obj)

        expect(response).to.be.an('array')
        strictEqual(1, response.length)

        const copy = { ...obj.body[0] }
        delete copy.mediaType
        deepStrictEqual(copy, response[0])
      })
    }

    const invalidData = [
      {
        body: [{
          width: 300,
          cpm: 0.4,
          ad: 'Test',
          requestId: '9ec5b177515ee2e5',
          ttl: 120,
          creativeId: '2',
          netRevenue: true,
          currency: 'USD',
          dealId: '1'
        }]
      },
      {
        body: [{
          mediaType: 'video',
          cpm: 0.5,
          requestId: '9ec5b177515ee2e5',
          ttl: 120,
          creativeId: '2',
          netRevenue: true,
          currency: 'USD',
          dealId: '1'
        }]
      },
      {
        body: [{
          mediaType: 'native',
          clickUrl: 'decenterads.com',
          title: 'Test',
          impressionTrackers: ['decenterads.com'],
          ttl: 120,
          requestId: '9ec5b177515ee2e5',
          creativeId: '2',
          netRevenue: true,
          currency: 'USD',
        }]
      }
    ]

    for (const obj of invalidData) {
      const { mediaType } = obj.body[0]

      it(`Should return an empty array if invalid ${mediaType} response is passed `, () => {
        const response = spec.interpretResponse(obj)

        expect(response).to.be.an('array')
        strictEqual(0, response.length)
      })
    }

    it('Should return an empty array if invalid response is passed', () => {
      const response = spec.interpretResponse({
        body: [{
          ttl: 120,
          creativeId: '2',
          netRevenue: true,
          currency: 'USD',
          dealId: '1'
        }]
      })

      expect(response).to.be.an('array')
      strictEqual(0, response.length)
    })
  })

  describe('getUserSyncs', () => {
    it('Returns valid URL and type', () => {
      const expectedResult = [{ type: 'image', url: 'https://supply.decenterads.com/?c=o&m=cookie' }]
      deepStrictEqual(expectedResult, spec.getUserSyncs())
    })
  })
})
