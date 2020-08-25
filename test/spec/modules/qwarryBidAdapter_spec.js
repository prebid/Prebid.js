import {expect} from 'chai'
import {spec} from 'modules/qwarryBidAdapter.js'

const REQUEST = {
  'bidder': 'qwarry',
  'sizes': [[720, 480]],
  'renderMode': 'video',
  'params': {
    zoneToken: 'f4ae4e4c-8d27-41fb-92d8-c62104d03ea1'
  }
}

const serverResponse = {
  ad: '',
  requestId: 1111,
  cpm: 0.3,
  currency: 'USD',
  width: 720,
  height: 480,
  ttl: 200,
  creativeId: 1,
  netRevenue: true,
  winUrl: 'https://event-logger.kantics.co/event/win?id=H4sIAAAAAAAAAGNgZmBgLJrb5FfJwMgAAYwYDGYGRvuDr1vldgS-YbRM0rj_5bTTnDZ9juNrUzLEGLDoAwAZjHHDVQAAAA==&zoneId=1',
  format: 'video'
}

describe('qwarryBidAdapter', function () {

  describe('isBidRequestValid', function () {
    it('should return true when required params found', function () {
      expect(spec.isBidRequestValid(REQUEST)).to.equal(true)
    })
  })

  describe('buildRequests', function () {
    let bidRequests = [REQUEST]
    const request = spec.buildRequests(bidRequests, {})

    it('sends bid request to ENDPOINT via GET', function () {
      expect(request[0].method).to.equal('GET')
    })
  })

  describe('interpretResponse', function () {
    let bidderRequest = {
      bidderCode: 'bidderCode',
      bids: []
    }

    it('should get correct bid response', function () {
      const result = spec.interpretResponse({body: serverResponse}, REQUEST)
      expect(result[0]).to.have.property('cpm').equal(0.3)
      expect(result[0]).to.have.property('width').equal(720)
      expect(result[0]).to.have.property('height').equal(480)
      expect(result[0]).to.have.property('mediaType').equal('video')
      expect(result[0]).to.have.property('ad')
    })

    it('handles nobid responses', function () {
      const nobidServerResponse = {bids: []}
      const nobidResult = spec.interpretResponse({body: nobidServerResponse}, bidderRequest)
      expect(nobidResult.length).to.equal(0)
    })
  })
})
