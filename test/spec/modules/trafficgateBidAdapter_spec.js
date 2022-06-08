import { expect } from 'chai'
import { spec } from '../../../modules/trafficgateBidAdapter'
import { deepStrictEqual, notStrictEqual, ok, strictEqual } from 'assert'

describe('TrafficGateAdapter', () => {
  const bid = {
    bidId: '9ec5b177515ee2e5',
    bidder: 'trafficgate',
    params: {
      placementId: 1,
      host: 'example'
    },
    mediaTypes: {
      banner: {
        sizes: [[300, 250]]
      }
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

    it('Should return false if at least one of parameters is not present', () => {
      const b = { ...bid }
      delete b.params.host
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
      strictEqual('https://example.bc-plugin.com/?c=o&m=multi', serverRequest.url)
    })

    it('Returns valid data if array of bids is valid', () => {
      const { data } = serverRequest
      strictEqual('object', typeof data)
      deepStrictEqual(['language', 'secure', 'host', 'page', 'placements'], Object.keys(data))
      strictEqual('string', typeof data.language)
      strictEqual('string', typeof data.host)
      strictEqual('string', typeof data.page)
      notStrictEqual(-1, [0, 1].indexOf(data.secure))

      const placement = data.placements[0]
      deepStrictEqual(['placementId', 'bidId', 'traffic'], Object.keys(placement))
      strictEqual(1, placement.placementId)
      strictEqual('9ec5b177515ee2e5', placement.bidId)
      strictEqual('banner', placement.traffic)
    })

    it('Returns empty data if no valid requests are passed', () => {
      deepStrictEqual([], spec.buildRequests([]))
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
          dealId: '1',
          meta: {
            advertiserDomains: ['test.com']
          }
        }]
      },
      {
        body: [{
          vastUrl: 'example.com',
          mediaType: 'video',
          cpm: 0.5,
          requestId: '9ec5b177515ee2e5',
          ttl: 120,
          creativeId: '2',
          netRevenue: true,
          currency: 'USD',
          dealId: '1',
          meta: {
            advertiserDomains: ['test.com']
          }
        }]
      },
      {
        body: [{
          mediaType: 'native',
          clickUrl: 'example.com',
          title: 'Test',
          image: 'example.com',
          creativeId: '2',
          impressionTrackers: ['example.com'],
          ttl: 120,
          cpm: 0.4,
          requestId: '9ec5b177515ee2e5',
          netRevenue: true,
          currency: 'USD',
          meta: {
            advertiserDomains: ['test.com']
          }
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
        deepStrictEqual(copy, response[0])
      })
    }

    for (const obj of validData) {
      it(`Should interpret response has meta.advertiserDomains`, () => {
        const response = spec.interpretResponse(obj)

        expect(response[0]['meta']['advertiserDomains']).to.be.an('array')
        expect(response[0]['meta']['advertiserDomains'][0]).to.be.an('string')
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
          clickUrl: 'example.com',
          title: 'Test',
          impressionTrackers: ['example.com'],
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
})
