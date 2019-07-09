import {expect} from 'chai'
import {spec} from 'modules/shBidAdapter'
import {newBidder} from 'src/adapters/bidderFactory'
import {VIDEO, BANNER} from 'src/mediaTypes'

const bidderRequest = {
  refererInfo: {
    referer: 'http://example.com'
  }
}

const gdpr = {
  'gdprConsent': {
    'consentString': 'BOEFEAyOEFEAyAHABDENAI4AAAB9vABAASA',
    'gdprApplies': true
  }
}

const bidRequestVideo = {
  'bidder': 'showheroes-bs',
  'params': {
    'playerId': '47427aa0-f11a-4d24-abca-1295a46a46cd',
  },
  'mediaTypes': {
    'video': {
      'playerSize': [640, 480],
      'context': 'instream',
    }
  },
  'adUnitCode': 'adunit-code-1',
  'sizes': [[640, 480]],
  'bidId': '38b373e1e31c18',
  'bidderRequestId': '12e3ade2543ba6',
  'auctionId': '43aa080090a47f',
}

const bidRequestVideoVpaid = {
  'bidder': 'showheroes-bs',
  'params': {
    'playerId': '47427aa0-f11a-4d24-abca-1295a46a46cd',
    'vpaidMode': true,
  },
  'mediaTypes': {
    'video': {
      'playerSize': [640, 480],
      'context': 'instream',
    }
  },
  'adUnitCode': 'adunit-code-1',
  'sizes': [[640, 480]],
  'bidId': '38b373e1e31c18',
  'bidderRequestId': '12e3ade2543ba6',
  'auctionId': '43aa080090a47f',
}

const bidRequestBanner = {
  'bidder': 'showheroes-bs',
  'params': {
    'playerId': '47427aa0-f11a-4d24-abca-1295a46a46cd',
  },
  'mediaTypes': {
    'banner': {
      'sizes': [[640, 360]]
    }
  },
  'adUnitCode': 'adunit-code-1',
  'sizes': [[640, 480]],
  'bidId': '38b373e1e31c18',
  'bidderRequestId': '12e3ade2543ba6',
  'auctionId': '43aa080090a47f',
}

describe('shBidAdapter', function () {
  const adapter = newBidder(spec)

  describe('inherited functions', function () {
    it('exists and is a function', function () {
      expect(adapter.callBids).to.exist.and.to.be.a('function')
    })
  })

  describe('isBidRequestValid', function () {
    it('should return true when required params found', function () {
      const request = {
        'params': {
          'playerId': '47427aa0-f11a-4d24-abca-1295a46a46cd',
        }
      }
      expect(spec.isBidRequestValid(request)).to.equal(true)
    })

    it('should return false when required params are not passed', function () {
      const request = {
        'params': {}
      }
      expect(spec.isBidRequestValid(request)).to.equal(false)
    })
  })

  describe('buildRequests', function () {
    it('sends bid request to ENDPOINT via POST', function () {
      const request = spec.buildRequests([bidRequestVideo], bidderRequest)
      expect(request.method).to.equal('POST')
    })

    it('should attach valid params to the payload when type is video', function () {
      const request = spec.buildRequests([bidRequestVideo], bidderRequest)
      const payload = request.data.requests[0];
      expect(payload).to.be.an('object');
      expect(payload).to.have.property('playerId', '47427aa0-f11a-4d24-abca-1295a46a46cd');
      expect(payload).to.have.property('mediaType', VIDEO);
      expect(payload).to.have.property('type', 2);
    })

    it('should attach valid params to the payload when type is video & vpaid mode on', function () {
      const request = spec.buildRequests([bidRequestVideoVpaid], bidderRequest)
      const payload = request.data.requests[0];
      expect(payload).to.be.an('object');
      expect(payload).to.have.property('playerId', '47427aa0-f11a-4d24-abca-1295a46a46cd');
      expect(payload).to.have.property('mediaType', VIDEO);
      expect(payload).to.have.property('type', 1);
    })

    it('should attach valid params to the payload when type is banner', function () {
      const request = spec.buildRequests([bidRequestBanner], bidderRequest)
      const payload = request.data.requests[0];
      expect(payload).to.be.an('object');
      expect(payload).to.have.property('playerId', '47427aa0-f11a-4d24-abca-1295a46a46cd');
      expect(payload).to.have.property('mediaType', BANNER);
      expect(payload).to.have.property('type', 5);
    })

    it('passes gdpr if present', function () {
      const request = spec.buildRequests([bidRequestVideo], {...bidderRequest, ...gdpr})
      const payload = request.data.requests[0];
      expect(payload).to.be.an('object');
      expect(payload.gdprConsent).to.eql(gdpr.gdprConsent)
    })
  })

  describe('interpretResponse', function () {
    it('handles nobid responses', function () {
      expect(spec.interpretResponse({body: {}}, {data: {meta: {}}}).length).to.equal(0)
      expect(spec.interpretResponse({body: []}, {data: {meta: {}}}).length).to.equal(0)
    })

    const response = {
      'bids': [{
        'cpm': 5,
        'currency': 'EUR',
        'bidId': '38b373e1e31c18',
        'video': {'width': 640, 'height': 480},
        'vastTag': 'https:\/\/video-library.stage.showheroes.com\/commercial\/wrapper?player_id=47427aa0-f11a-4d24-abca-1295a46a46cd&ad_bidder=showheroes-bs&master_shadt=1&description_url=https%3A%2F%2Fbid-service.stage.showheroes.com%2Fvast%2Fad%2Fcache%2F4840b920-40e1-4e09-9231-60bbf088c8d6',
      }],
    }

    it('should get correct bid response when type is video', function () {
      const request = spec.buildRequests([bidRequestVideo], bidderRequest)
      const expectedResponse = [
        {
          'cpm': 5,
          'creativeId': 'c_38b373e1e31c18',
          'currency': 'EUR',
          'width': 640,
          'height': 480,
          'mediaType': 'video',
          'netRevenue': true,
          'vastUrl': 'https://video-library.stage.showheroes.com/commercial/wrapper?player_id=47427aa0-f11a-4d24-abca-1295a46a46cd&ad_bidder=showheroes-bs&master_shadt=1&description_url=https%3A%2F%2Fbid-service.stage.showheroes.com%2Fvast%2Fad%2Fcache%2F4840b920-40e1-4e09-9231-60bbf088c8d6',
          'requestId': '38b373e1e31c18',
          'ttl': 300,
        }
      ]

      const result = spec.interpretResponse({'body': response}, request)
      expect(result).to.deep.equal(expectedResponse)
    })

    it('should get correct bid response when type is banner', function () {
      const request = spec.buildRequests([bidRequestBanner], bidderRequest)

      const result = spec.interpretResponse({'body': response}, request)
      expect(result[0]).to.have.property('mediaType', BANNER);
      expect(result[0].ad).to.include('<script async src="https://static.showheroes.com/publishertag.js')
      expect(result[0].ad).to.include('<div class="showheroes-spot"')
    })
  })
})
