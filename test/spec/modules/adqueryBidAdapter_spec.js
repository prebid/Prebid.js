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

  let expectedResponse = {
    'body': {
      'data':
        {
          'requestId': 1,
          'emission_id': 1,
          'eventTracker': 'https://example.com',
          'externalEmissionCodes': 'https://example.com',
          'impressionTracker': 'https://example.com',
          'viewabilityTracker': 'https://example.com',
          'clickTracker': 'https://example.com',
          'link': 'https://example.com',
          'logo': 'https://example.com',
          'medias': [
            {
              'src': 'banner/2021-04-09/938',
              'ext': 'zip',
              'type': 3,
            }
          ],
          'domain': 'https://example.com',
          'urlAdq': 'https://example.com',
          'creationId': 1,
          'currency': 'PLN',
          'adDomains': ['https://example.com'],
          'tag': '<ad-adquery data-type="banner300x250"  data-placement="6d93f2a0e5f0fe2cc3a6e9e3ade964b43b07f897"> </ad-adquery>',
          'adqLib': 'https://example.com/js/example.js',
          'mediaType': {'width': 300, 'height': 250, 'name': 'banner', 'type': 'banner300x250'},
          'cpm': 2.5,
          'meta': {
            'advertiserDomains': ['example.com'],
            'mediaType': 'banner',
          }
        }
    }
  }
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

    it('should return false when sizes for banner are not specified', () => {
      const bid = utils.deepClone(bidRequest);
      delete bid.mediaTypes.banner.sizes;

      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });
  })

  describe('buildRequests', function () {
    let req;
    beforeEach(() => {
      req = spec.buildRequests([ bidRequest ], { refererInfo: { } })[0]
    })

    let rdata

    it('should return request object', function () {
      expect(req).to.not.be.null
    })

    it('should build request data', function () {
      expect(req.data).to.not.be.null
    })

    it('should include one request', function () {
      rdata = req.data;
      expect(rdata.data).to.not.be.null
    })

    it('should include placementCode', function () {
      expect(rdata.placementCode).not.be.null
    })

    it('should include qid', function () {
      expect(rdata.qid).not.be.null
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

    it('should include sizes', function () {
      expect(rdata.sizes).not.be.null
    })

    it('should include version', function () {
      expect(rdata.v).not.be.null
      expect(rdata.v).equal('$prebid.version$')
    })

    it('should include referrer', function () {
      expect(rdata.bidPageUrl).not.be.null
    })
  })

  describe('interpretResponse', function () {
    it('should get the correct bid response', function () {
      let result = spec.interpretResponse(expectedResponse)
      expect(result).to.be.an('array')
    })

    it('validate response params', function() {
      const newResponse = spec.interpretResponse(expectedResponse, bidRequest);
      expect(newResponse[0].requestId).to.be.equal(1)
    });
    it('handles empty bid response', function () {
      let response = {
        body: {}
      };
      let result = spec.interpretResponse(response);
      expect(result.length).to.equal(0);
    })
  })

  describe('getUserSyncs', function () {
    it('should return iframe sync', function () {
      let sync = spec.getUserSyncs()
      expect(sync.length).to.equal(1)
      expect(sync[0].type === 'iframe')
      expect(typeof sync[0].url === 'string')
    })

    it('Should return array of objects with proper sync config , include GDPR', function() {
      const syncData = spec.getUserSyncs({}, {}, {
        consentString: 'ALL',
        gdprApplies: true,
      }, {});
      expect(syncData).to.be.an('array').which.is.not.empty;
      expect(syncData[0]).to.be.an('object')
      expect(syncData[0].type).to.be.a('string')
      expect(syncData[0].type).to.equal('image')
    });
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

  describe('onTimeout', function () {
    const timeoutData = [{
      timeout: null
    }];

    it('should exists and be a function', () => {
      expect(spec.onTimeout).to.exist.and.to.be.a('function');
    });
    it('should include timeoutData', function () {
      expect(spec.onTimeout(timeoutData)).to.be.undefined;
    })
  });

  it(`onSetTargeting is present and type function`, function () {
    expect(spec.onSetTargeting).to.exist.and.to.be.a('function')
  });
})
