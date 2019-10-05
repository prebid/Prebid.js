import { expect } from 'chai'
import { spec, pixel } from 'modules/justpremiumBidAdapter'

describe('justpremium adapter', function () {
  let sandbox;
  let pixelStub;

  beforeEach(function() {
    sandbox = sinon.sandbox.create();
    pixelStub = sandbox.stub(pixel, 'fire');
  });

  afterEach(function() {
    sandbox.restore();
  });

  let adUnits = [
    {
      adUnitCode: 'div-gpt-ad-1471513102552-1',
      bidder: 'justpremium',
      crumbs: {
        pubcid: '0000000'
      },
      userId: {
        tdid: '1111111',
        id5id: '2222222',
        digitrustid: {
          data: {
            id: '3333333'
          }
        }
      },
      params: {
        zone: 28313,
        allow: ['lb', 'wp']
      }
    },
    {
      adUnitCode: 'div-gpt-ad-1471513102552-2',
      bidder: 'justpremium',
      params: {
        zone: 32831,
        exclude: ['sa']
      }
    },
  ]

  let bidderRequest = {
    refererInfo: {
      referer: 'http://justpremium.com'
    }
  }

  describe('isBidRequestValid', function () {
    it('Verifies bidder code', function () {
      expect(spec.code).to.equal('justpremium')
    })

    it('Verify build request', function () {
      expect(spec.isBidRequestValid({bidder: 'justpremium', params: {}})).to.equal(false)
      expect(spec.isBidRequestValid({})).to.equal(false)
      expect(spec.isBidRequestValid(adUnits[0])).to.equal(true)
      expect(spec.isBidRequestValid(adUnits[1])).to.equal(true)
    })
  })

  describe('buildRequests', function () {
    it('Verify build request and parameters', function () {
      const request = spec.buildRequests(adUnits, bidderRequest)
      expect(request.method).to.equal('POST')
      expect(request.url).to.match(/pre.ads.justpremium.com\/v\/2.0\/t\/xhr/)

      const jpxRequest = JSON.parse(request.data)
      expect(jpxRequest).to.not.equal(null)
      expect(jpxRequest.zone).to.not.equal('undefined')
      expect(bidderRequest.refererInfo.referer).to.equal('http://justpremium.com')
      expect(jpxRequest.sw).to.equal(window.top.screen.width)
      expect(jpxRequest.sh).to.equal(window.top.screen.height)
      expect(jpxRequest.ww).to.equal(window.top.innerWidth)
      expect(jpxRequest.wh).to.equal(window.top.innerHeight)
      expect(jpxRequest.c).to.not.equal('undefined')
      expect(jpxRequest.id).to.equal(adUnits[0].params.zone)
      expect(jpxRequest.sizes).to.not.equal('undefined')
      expect(jpxRequest.version.prebid).to.equal('$prebid.version$')
      expect(jpxRequest.version.jp_adapter).to.equal('1.4')
      expect(jpxRequest.pubcid).to.equal('0000000')
      expect(jpxRequest.uids.tdid).to.equal('1111111')
      expect(jpxRequest.uids.id5id).to.equal('2222222')
      expect(jpxRequest.uids.digitrustid.data.id).to.equal('3333333')
    })
  })

  describe('interpretResponse', function () {
    const request = spec.buildRequests(adUnits, bidderRequest)
    it('Verify server response', function () {
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
          ttl: 60000,
          format: 'lb'
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
      expect(result[0].format).to.equal('lb')
    })

    it('Verify wrong server response', function () {
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

  describe('getUserSyncs', function () {
    it('Verifies sync options', function () {
      const options = spec.getUserSyncs({iframeEnabled: true})
      expect(options).to.not.be.undefined
      expect(options[0].type).to.equal('iframe')
      expect(options[0].url).to.match(/\/\/pre.ads.justpremium.com\/v\/1.0\/t\/sync/)
    })
  })

  describe('onTimeout', function () {
    it('onTimeout', function(done) {
      spec.onTimeout([{
        'bidId': '25cd3ec3fd6ed7',
        'bidder': 'justpremium',
        'adUnitCode': 'div-gpt-ad-1471513102552-1',
        'auctionId': '6fbd0562-f613-4151-a6df-6cb446fc717b',
        'params': [{
          'adType': 'iab',
          'zone': 21521
        }],
        'timeout': 1
      }, {
        'bidId': '3b51df1f254e32',
        'bidder': 'justpremium',
        'adUnitCode': 'div-gpt-ad-1471513102552-3',
        'auctionId': '6fbd0562-f613-4151-a6df-6cb446fc717b',
        'params': [{
          'adType': 'iab',
          'zone': 21521
        }],
        'timeout': 1
      }]);

      expect(pixelStub.calledOnce).to.equal(true);

      done()
    })
  })
})
