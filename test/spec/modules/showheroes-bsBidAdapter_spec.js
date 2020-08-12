import {expect} from 'chai'
import {spec} from 'modules/showheroes-bsBidAdapter.js'
import {newBidder} from 'src/adapters/bidderFactory.js'
import {VIDEO, BANNER} from 'src/mediaTypes.js'

const bidderRequest = {
  refererInfo: {
    referer: 'https://example.com'
  }
}

const gdpr = {
  'gdprConsent': {
    'consentString': 'BOEFEAyOEFEAyAHABDENAI4AAAB9vABAASA',
    'gdprApplies': true
  }
}

const bidRequestCommonParams = {
  'bidder': 'showheroes-bs',
  'params': {
    'playerId': '47427aa0-f11a-4d24-abca-1295a46a46cd',
  },
  'adUnitCode': 'adunit-code-1',
  'sizes': [[640, 480]],
  'bidId': '38b373e1e31c18',
  'bidderRequestId': '12e3ade2543ba6',
  'auctionId': '43aa080090a47f',
}

const bidRequestVideo = {
  ...bidRequestCommonParams,
  ...{
    'mediaTypes': {
      'video': {
        'playerSize': [640, 480],
        'context': 'instream',
      }
    }
  }
}

const bidRequestOutstream = {
  ...bidRequestCommonParams,
  ...{
    'mediaTypes': {
      'video': {
        'playerSize': [640, 480],
        'context': 'outstream',
      }
    }
  }
}

const bidRequestVideoVpaid = {
  ...bidRequestCommonParams,
  ...{
    'params': {
      'playerId': '47427aa0-f11a-4d24-abca-1295a46a46cd',
      'vpaidMode': true,
    },
    'mediaTypes': {
      'video': {
        'playerSize': [640, 480],
        'context': 'instream',
      }
    }
  }
}

const bidRequestBanner = {
  ...bidRequestCommonParams,
  ...{
    'mediaTypes': {
      'banner': {
        'sizes': [[640, 360]]
      }
    }
  }
}

const bidRequestBannerMultiSizes = {
  ...bidRequestCommonParams,
  ...{
    'mediaTypes': {
      'banner': {
        'sizes': [[640, 360], [480, 320]]
      }
    }
  }
}

const bidRequestVideoAndBanner = {
  ...bidRequestBanner,
  ...bidRequestVideo
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

    it('check sizes formats', function () {
      const request = spec.buildRequests([{
        'params': {},
        'mediaTypes': {},
        'sizes': [[640, 480]],
      }], bidderRequest)
      const payload = request.data.requests[0];
      expect(payload).to.be.an('object');
      expect(payload.size).to.have.property('width', 640);
      expect(payload.size).to.have.property('height', 480);

      const request2 = spec.buildRequests([{
        'params': {},
        'mediaTypes': {},
        'sizes': [320, 240],
      }], bidderRequest)
      const payload2 = request2.data.requests[0];
      expect(payload).to.be.an('object');
      expect(payload2.size).to.have.property('width', 320);
      expect(payload2.size).to.have.property('height', 240);
    })

    it('should get size from mediaTypes when sizes property is empty', function () {
      const request = spec.buildRequests([{
        'params': {},
        'mediaTypes': {
          'video': {
            'playerSize': [640, 480]
          }
        },
        'sizes': [],
      }], bidderRequest)
      const payload = request.data.requests[0];
      expect(payload).to.be.an('object');
      expect(payload.size).to.have.property('width', 640);
      expect(payload.size).to.have.property('height', 480);

      const request2 = spec.buildRequests([{
        'params': {},
        'mediaTypes': {
          'banner': {
            'sizes': [[320, 240]]
          }
        },
        'sizes': [],
      }], bidderRequest)
      const payload2 = request2.data.requests[0];
      expect(payload).to.be.an('object');
      expect(payload2.size).to.have.property('width', 320);
      expect(payload2.size).to.have.property('height', 240);
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

    it('should attach valid params to the payload when type is banner (multi sizes)', function () {
      const request = spec.buildRequests([bidRequestBannerMultiSizes], bidderRequest)
      const payload = request.data.requests[0];
      expect(payload).to.be.an('object');
      expect(payload).to.have.property('playerId', '47427aa0-f11a-4d24-abca-1295a46a46cd');
      expect(payload).to.have.property('mediaType', BANNER);
      expect(payload).to.have.property('type', 5);
      expect(payload).to.have.nested.property('size.width', 640);
      expect(payload).to.have.nested.property('size.height', 360);
      const payload2 = request.data.requests[1];
      expect(payload2).to.be.an('object');
      expect(payload2).to.have.property('playerId', '47427aa0-f11a-4d24-abca-1295a46a46cd');
      expect(payload2).to.have.property('mediaType', BANNER);
      expect(payload2).to.have.property('type', 5);
      expect(payload2).to.have.nested.property('size.width', 480);
      expect(payload2).to.have.nested.property('size.height', 320);
    })

    it('should attach valid params to the payload when type is banner and video', function () {
      const request = spec.buildRequests([bidRequestVideoAndBanner], bidderRequest)
      const payload = request.data.requests[0];
      expect(payload).to.be.an('object');
      expect(payload).to.have.property('playerId', '47427aa0-f11a-4d24-abca-1295a46a46cd');
      expect(payload).to.have.property('mediaType', VIDEO);
      expect(payload).to.have.property('type', 2);
      const payload2 = request.data.requests[1];
      expect(payload2).to.be.an('object');
      expect(payload2).to.have.property('playerId', '47427aa0-f11a-4d24-abca-1295a46a46cd');
      expect(payload2).to.have.property('mediaType', BANNER);
      expect(payload2).to.have.property('type', 5);
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

    const vastTag = 'https://video-library.stage.showheroes.com/commercial/wrapper?player_id=47427aa0-f11a-4d24-abca-1295a46a46cd&ad_bidder=showheroes-bs&master_shadt=1&description_url=https%3A%2F%2Fbid-service.stage.showheroes.com%2Fvast%2Fad%2Fcache%2F4840b920-40e1-4e09-9231-60bbf088c8d6'
    const vastXml = '<?xml version="1.0" encoding="utf-8"?><VAST version="3.0"><Error><![CDATA[https://static.showheroes.com/shim.gif]]></Error></VAST>'

    const basicResponse = {
      'cpm': 5,
      'currency': 'EUR',
      'mediaType': VIDEO,
      'context': 'instream',
      'bidId': '38b373e1e31c18',
      'size': {'width': 640, 'height': 480},
      'vastTag': 'https:\/\/video-library.stage.showheroes.com\/commercial\/wrapper?player_id=47427aa0-f11a-4d24-abca-1295a46a46cd&ad_bidder=showheroes-bs&master_shadt=1&description_url=https%3A%2F%2Fbid-service.stage.showheroes.com%2Fvast%2Fad%2Fcache%2F4840b920-40e1-4e09-9231-60bbf088c8d6',
      'vastXml': vastXml,
    };

    const responseVideo = {
      'bids': [{
        ...basicResponse,
      }],
    };

    const responseVideoOutstream = {
      'bids': [{
        ...basicResponse,
        'context': 'outstream',
      }],
    };

    const responseBanner = {
      'bids': [{
        ...basicResponse,
        'mediaType': BANNER,
      }],
    };

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
          'vastUrl': vastTag,
          'vastXml': vastXml,
          'requestId': '38b373e1e31c18',
          'ttl': 300,
          'adResponse': {
            'content': vastXml
          }
        }
      ]

      const result = spec.interpretResponse({'body': responseVideo}, request)
      expect(result).to.deep.equal(expectedResponse)
    })

    it('should get correct bid response when type is banner', function () {
      const request = spec.buildRequests([bidRequestBanner], bidderRequest)

      const result = spec.interpretResponse({'body': responseBanner}, request)
      expect(result[0]).to.have.property('mediaType', BANNER);
      expect(result[0].ad).to.include('<script async src="https://static.showheroes.com/publishertag.js')
      expect(result[0].ad).to.include('<div class="showheroes-spot"')
    })

    it('should get correct bid response when type is outstream (slot)', function () {
      const bidRequest = JSON.parse(JSON.stringify(bidRequestOutstream));
      const slotId = 'testSlot'
      bidRequest.params.outstreamOptions = {
        slot: slotId
      }

      const container = document.createElement('div')
      container.setAttribute('id', slotId)
      document.body.appendChild(container)

      const request = spec.buildRequests([bidRequest], bidderRequest)

      const result = spec.interpretResponse({'body': responseVideoOutstream}, request)
      const bid = result[0]
      expect(bid).to.have.property('mediaType', VIDEO);

      const renderer = bid.renderer
      expect(renderer).to.be.an('object')
      expect(renderer.id).to.equal(bidRequest.bidId)
      expect(renderer.config.vastUrl).to.equal(vastTag)
      renderer.render(bid)

      // TODO: fix these. our tests should not be reliant on third-party scripts. wtf
      // const scripts = document.querySelectorAll('script[src="https://static.showheroes.com/publishertag.js"]')
      // expect(scripts.length).to.equal(1)

      const spots = document.querySelectorAll('.showheroes-spot')
      expect(spots.length).to.equal(1)
    })

    it('should get correct bid response when type is outstream (iframe)', function () {
      const bidRequest = JSON.parse(JSON.stringify(bidRequestOutstream));
      const slotId = 'testIframe'
      bidRequest.params.outstreamOptions = {
        iframe: slotId
      }

      const iframe = document.createElement('iframe')
      iframe.setAttribute('id', slotId)
      document.body.appendChild(iframe)

      const request = spec.buildRequests([bidRequest], bidderRequest)

      const result = spec.interpretResponse({'body': responseVideoOutstream}, request)
      const bid = result[0]
      expect(bid).to.have.property('mediaType', VIDEO);

      const renderer = bid.renderer
      expect(renderer).to.be.an('object')
      expect(renderer.id).to.equal(bidRequest.bidId)
      renderer.render(bid)

      const iframeDocument = iframe.contentDocument || (iframe.contentWindow && iframe.contentWindow.document)
      // const scripts = iframeDocument.querySelectorAll('script[src="https://static.showheroes.com/publishertag.js"]')
      // expect(scripts.length).to.equal(1)
      const spots = iframeDocument.querySelectorAll('.showheroes-spot')
      expect(spots.length).to.equal(1)
    })

    it('should get correct bid response when type is outstream (customRender)', function (done) {
      const bidRequest = JSON.parse(JSON.stringify(bidRequestOutstream));
      bidRequest.params.outstreamOptions = {
        customRender: function (bid, embedCode) {
          const container = document.createElement('div')
          container.appendChild(embedCode)
          // const scripts = container.querySelectorAll('script[src="https://static.showheroes.com/publishertag.js"]')
          // expect(scripts.length).to.equal(1)
          const spots = container.querySelectorAll('.showheroes-spot')
          expect(spots.length).to.equal(1)

          expect(bid.renderer.config.vastUrl).to.equal(vastTag)
          expect(bid.renderer.config.vastXml).to.equal(vastXml)
          done()
        }
      }

      const request = spec.buildRequests([bidRequest], bidderRequest)

      const result = spec.interpretResponse({'body': responseVideoOutstream}, request)
      const bid = result[0]
      expect(bid).to.have.property('mediaType', VIDEO);

      const renderer = bid.renderer
      expect(renderer).to.be.an('object')
      expect(renderer.id).to.equal(bidRequest.bidId)
      renderer.render(bid)
    })
  })

  describe('getUserSyncs', function () {
    const response = [{
      body: {
        userSync: {
          iframes: ['https://sync.showheroes.com/iframe'],
          pixels: ['https://sync.showheroes.com/pixel']
        }
      }
    }]

    it('empty', function () {
      let result = spec.getUserSyncs({}, []);

      expect(result).to.deep.equal([]);
    });

    it('iframe', function () {
      let result = spec.getUserSyncs({
        iframeEnabled: true
      }, response);

      expect(result[0].type).to.equal('iframe');
      expect(result[0].url).to.equal('https://sync.showheroes.com/iframe');
    });

    it('pixel', function () {
      let result = spec.getUserSyncs({
        pixelEnabled: true
      }, response);

      expect(result[0].type).to.equal('image');
      expect(result[0].url).to.equal('https://sync.showheroes.com/pixel');
    });
  });
})
