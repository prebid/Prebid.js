import { expect } from 'chai'
import * as utils from 'src/utils'
import { spec } from 'modules/rdnBidAdapter'
import { newBidder } from 'src/adapters/bidderFactory'

describe('rdnBidAdapter', function() {
  const adapter = newBidder(spec)
  const ENDPOINT = ''

  describe('inherited functions', () => {
    it('exists and is a function', () => {
      expect(adapter.callBids).to.exist.and.to.be.a('function')
    })
  })

  describe('isBidRequestValid', () => {
    let bid = {
      bidder: 'rdn',
      params: {
        adSpotId: '56789'
      }
    }

    it('should return true when required params found', () => {
      expect(spec.isBidRequestValid(bid)).to.equal(true)
    })

    it('should return false when required params are not passed', () => {
      bid.params.adSpotId = ''
      expect(spec.isBidRequestValid(bid)).to.equal(false)
    })

    it('should return false when required params are not passed', () => {
      let bid = Object.assign({}, bid)
      delete bid.params
      bid.params = {}
      expect(spec.isBidRequestValid(bid)).to.equal(false)
    })
  })

  describe('buildRequests', () => {
    const bidRequests = [
      {
        // banner
        params: {
          adSpotId: '58278'
        }
      }
    ]

    it('sends bid request to ENDPOINT via GET', () => {
      const request = spec.buildRequests(bidRequests)[0]
      expect(request.url).to.equal(ENDPOINT)
      expect(request.method).to.equal('GET')
    })
  })
})
