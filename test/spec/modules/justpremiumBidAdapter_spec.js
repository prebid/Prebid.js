import { expect } from 'chai'
import { spec } from 'modules/justpremiumBidAdapter'

describe('justpremium adapter', () => {
  let adUnits = [
    {
      bidder: 'justpremium',
      params: {
        zone: 28313,
        allow: ['lb', 'wp']
      }
    },
    {
      bidder: 'justpremium',
      params: {
        zone: 32831,
        exclude: ['sa']
      }
    },
  ]

  describe('isBidRequestValid', () => {
    it('Verifies bidder code', () => {
      expect(spec.code).to.equal('justpremium')
    })

    it('Verify build request', () => {
      expect(spec.isBidRequestValid({bidder: 'justpremium', params: {}})).to.equal(false)
      expect(spec.isBidRequestValid({})).to.equal(false)
      expect(spec.isBidRequestValid(adUnits[0])).to.equal(true)
      expect(spec.isBidRequestValid(adUnits[1])).to.equal(true)
    })
  })

  describe('buildRequests', () => {
    it('Verify build request and parameters', () => {
      const request = spec.buildRequests(adUnits)
      expect(request.method).to.equal('POST')
      expect(request.url).to.match(/pre.ads.justpremium.com\/v\/2.0\/t\/xhr/)

      const jpxRequest = JSON.parse(request.data)
      expect(jpxRequest).to.not.equal(null)
      expect(jpxRequest.zone).to.not.equal('undefined')
      expect(jpxRequest.hostname).to.equal(top.document.location.hostname)
      expect(jpxRequest.protocol).to.equal(top.document.location.protocol.replace(':', ''))
      expect(jpxRequest.sw).to.equal(window.top.screen.width)
      expect(jpxRequest.sh).to.equal(window.top.screen.height)
      expect(jpxRequest.ww).to.equal(window.top.innerWidth)
      expect(jpxRequest.wh).to.equal(window.top.innerHeight)
      expect(jpxRequest.c).to.not.equal('undefined')
      expect(jpxRequest.id).to.equal(adUnits[0].params.zone)
      expect(jpxRequest.sizes).to.not.equal('undefined')
    })
  })

  describe('interpretResponse', () => {
    const request = spec.buildRequests(adUnits)
    it('Verify server response', () => {
      let response = {
        'bid': {
          '28313': [{
            'id': 3213123,
            'height': 250,
            'width': 970,
            'price': 0.52,
            'format': 'lb',
            'adm': 'creative code'
          }]
        },
        'pass': {
          '28313': false
        },
        'deals': {}
      }

      let expectedResponse = [
        {
          requestId: '319a5029c362f4',
          creativeId: 3213123,
          width: 970,
          height: 250,
          ad: 'creative code',
          cpm: 0.52,
          netRevenue: true,
          currency: 'USD',
          ttl: 60000
        }
      ]

      let result = spec.interpretResponse({body: response}, request)
      expect(Object.keys(result[0])).to.deep.equal(Object.keys(expectedResponse[0]))

      expect(result[0]).to.not.equal(null)
      expect(result[0].width).to.equal(970)
      expect(result[0].height).to.equal(250)
      expect(result[0].ad).to.equal('creative code')
      expect(result[0].cpm).to.equal(0.52)
      expect(result[0].currency).to.equal('USD')
      expect(result[0].ttl).to.equal(60000)
      expect(result[0].creativeId).to.equal(3213123)
      expect(result[0].netRevenue).to.equal(true)
    })

    it('Verify wrong server response', () => {
      let response = {
        'bid': {
          '28313': []
        },
        'pass': {
          '28313': true
        }
      }

      let result = spec.interpretResponse({body: response}, request)
      expect(result.length).to.equal(0)
    })
  })

  describe('getUserSyncs', () => {
    it('Verifies sync options', () => {
      const options = spec.getUserSyncs({iframeEnabled: true})
      expect(options).to.not.be.undefined
      expect(options[0].type).to.equal('iframe')
      expect(options[0].url).to.match(/\/\/pre.ads.justpremium.com\/v\/1.0\/t\/sync/)
    })
  })
})
