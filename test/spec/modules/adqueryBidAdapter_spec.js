import { expect } from 'chai'
import { spec } from 'modules/adqueryBidAdapter.js'
import { newBidder } from 'src/adapters/bidderFactory.js'
import * as utils from '../../../src/utils';

describe('adqueryBidAdapter', function () {
  const adapter = newBidder(spec)

  let bidRequest = {
    bidder: 'adquery',
    params: {
      placementId: '6d93f2a0e5f0fe2cc3a6e9e3ade964b43b07f897',
      type: 'banner300x250'
    },
    mediaTypes: {
      banner: {
        sizes: [[300, 250]],
      }
    }
  }

  let expectedResponse = [
    {'data':
        {
          'emission_id': 402517033,
          'question': '',
          'creationType': 5,
          'externalEmissionCodes': 'https://example.com',
          'correctAnswer': 1,
          'answerInfo': '',
          'answerOne': '',
          'answerTwo': '',
          'answerThree': '',
          'wrongAnswer': '',
          'popupTitle': '',
          'popupContent': '',
          'link': 'https://example.com',
          'clickTracker': 'https://example.com',
          'impressionTracker': 'https://example.com',
          'viewabilityTracker': 'https://example.com',
          'eventTracker': 'https://example.com',
          'medias': [
            {
              'src': 'banner/2021-04-09/938',
              'ext': 'zip',
              'type': 3,
            }
          ],
          'domain': 'https://example.com',
          'trackerBtnOne': '',
          'trackerBtnTwo': '',
          'trackerBtnThree': '',
          'width': 0,
          'height': 0,
          'logo': 'https://example.com',
          'urlAdq': 'https://example.com',
          'creationId': 1,
          'currency': 'PLN',
          'adDomains': ['https://example.com'],
          'tag': '<ad-adquery data-type="banner300x250"  data-placement="6d93f2a0e5f0fe2cc3a6e9e3ade964b43b07f897"> </ad-adquery>',
          'adqLib': 'https://example.com/js/adquery-0.1.min.js',
          'mediaType': {'width': 300, 'height': 250, 'name': 'BANNER', 'type': 'banner300x250'}
        }
    }]

  describe('codes', function () {
    it('should return a bidder code of adquery', function () {
      expect(spec.code).to.equal('adquery')
    })
  })

  describe('isBidRequestValid', function () {
    let inValidBid = Object.assign({}, bidRequest)
    delete inValidBid.params
    it('should return true if all params present', function () {
      expect(spec.isBidRequestValid(bidRequest)).to.equal(true)
    })

    it('should return false if any parameter missing', function () {
      expect(spec.isBidRequestValid(inValidBid)).to.be.false
    })
  })

  describe('buildRequests', function () {
    let req = spec.buildRequests([ bidRequest ], { refererInfo: { } })
    let rdata

    it('should return request object', function () {
      expect(req).to.not.be.null
    })

    it('should build request data', function () {
      expect(req.data).to.not.be.null
    })

    it('should include one request', function () {
      rdata = JSON.parse(req.data)
      expect(rdata.data).to.not.be.null
    })

    it('should include placementCode', function () {
      expect(rdata.placementCode).not.be.null
    })

    it('should include type', function () {
      expect(rdata.type !== null).not.be.null
    })

    it('should include all publisher params', function () {
      expect(rdata.type !== null && rdata.placementCode !== null).to.be.true
    })

    it('should include bidder', function () {
      expect(rdata.bidder !== null).to.be.true
    })
  })

  describe('interpretResponse', function () {
    it('should get the correct bid response', function () {
      let result = spec.interpretResponse(expectedResponse[0])
      expect(result).to.be.an('array').that.is.not.empty
      expect(result[0].meta.advertiserDomains[0]).to.equal('https://example.com');
    })

    it('should interpret bids in data', function () {
      let bidResponse = [{
        'data':
          {
            'emission_id': 402517033,
            'question': '',
            'creationType': 5,
            'externalEmissionCodes': 'https://example.com',
            'correctAnswer': 1,
            'answerInfo': '',
            'answerOne': '',
            'answerTwo': '',
            'answerThree': '',
            'wrongAnswer': '',
            'popupTitle': '',
            'popupContent': '',
            'link': 'https://example.com',
            'clickTracker': 'https://example.com',
            'impressionTracker': 'https://example.com',
            'viewabilityTracker': 'https://example.com',
            'eventTracker': 'https://example.com',
            'medias': [
              {
                'src': 'banner/2021-04-09/938',
                'ext': 'zip',
                'type': 3,
              }
            ],
            'domain': 'https://example.com',
            'trackerBtnOne': '',
            'trackerBtnTwo': '',
            'trackerBtnThree': '',
            'width': 0,
            'height': 0,
            'logo': 'https://example.com',
            'urlAdq': 'https://example.com',
            'creationId': 1,
            'currency': 'PLN',
            'adDomains': ['https://example.com'],
            'tag': '<ad-adquery data-type="banner300x250"  data-placement="6d93f2a0e5f0fe2cc3a6e9e3ade964b43b07f897"> </ad-adquery>',
            'adqLib': 'https://example.com/js/example.js',
            'mediaType': {'width': 300, 'height': 250, 'name': 'BANNER', 'type': 'banner300x250'}
          }
      }]
      let result = spec.interpretResponse(bidResponse[0]).map(bid => {
        const {requestId} = bid;
        return [ requestId ];
      });

      assert.equal(result.length, 1);
    })
  })

  describe('getUserSyncs', function () {
    it('should return iframe sync', function () {
      let sync = spec.getUserSyncs()
      expect(sync.length).to.equal(1)
      expect(sync[0].type === 'iframe')
      expect(typeof sync[0].url === 'string')
    })
  })

  describe('test onBidWon function', function () {
    beforeEach(function() {
      sinon.stub(utils, 'triggerPixel');
    });
    afterEach(function() {
      utils.triggerPixel.restore();
    });
    it('exists and is a function', () => {
      expect(spec.onBidWon).to.exist.and.to.be.a('function');
    });
    it('should return nothing', function () {
      var response = spec.onBidWon({});
      expect(response).to.be.an('undefined')
      expect(utils.triggerPixel.called).to.equal(true);
    });
  })
})
