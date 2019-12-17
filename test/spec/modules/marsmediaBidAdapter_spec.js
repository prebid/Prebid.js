import { expect } from 'chai'
import { spec, _getPlatform } from 'modules/marsmediaBidAdapter'
// import { newBidder } from 'src/adapters/bidderFactory'

describe('marsmediaBidAdapter', function () {
  // const adapter = newBidder(spec)

  let bidRequest = {
    'bidder': 'marsmedia',
    'params': {
      'zoneId': 9999
    },
    'adUnitCode': 'adunit-code',
    'mediaTypes': {
      'banner': {
        sizes: [[300, 250]]
      }
    },
    'bidId': '37386aade21a71'
  }

  describe('codes', function () {
    it('should return a bidder code of marsmedia', function () {
      expect(spec.code).to.equal('marsmedia')
    })
    it('should alias mars', function () {
      expect(spec.aliases.length > 0 && spec.aliases[0] === 'mars').to.be.true
    })
  })

  describe('isBidRequestValid', function () {
    it('should return true if all params present', function () {
      expect(spec.isBidRequestValid(bidRequest)).to.be.true
    })

    it('should return false if any parameter missing', function () {
      expect(spec.isBidRequestValid(Object.assign(bidRequest, { params: { zoneId: null } }))).to.be.false
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
      expect(rdata.imp.length).to.equal(1)
    })

    it('should include all zoneId params', function () {
      let r = rdata.imp[0]
      expect(r.zoneId !== null).to.be.true
    })
  })

  describe('interpretResponse', function () {
    let response;
    beforeEach(function () {
      response = {
        body: {
          'id': '37386aade21a71',
          'seatbid': [{
            'bid': [{
              'id': '1',
              'impid': '1',
			        'cid': '1',
              'price': 0.1,
              'nurl': '<!-- NURL -->',
              'adm': '<!-- Creative -->',
              'w': 320,
              'h': 250
            }]
          }]
        }
      };
    });

    /* it('should get the correct bid response', function () {
      let expectedResponse = [{
        'requestId': '37386aade21a71',
        'cpm': 0.1,
        'width': 320,
        'height': 250,
        'creativeId': '1',
        'currency': 'USD',
        'netRevenue': true,
        'ad': `<!-- Creative -->`,
        'ttl': 60
      }];

      let result = spec.interpretResponse(response);
      expect(result[0]).to.deep.equal(expectedResponse[0]);
    }); */

    it('handles empty bid response', function () {
      let response = {
        body: ''
      };
      let result = spec.interpretResponse(response);
      expect(result.length).to.equal(0);
    });
  });

  describe('getUserSyncs', function () {
    /* it('should return iframe sync', function () {
      let sync = spec.getUserSyncs({ iframeEnabled: true })
      expect(sync.length).to.equal(1)
      expect(sync[0].type === 'iframe')
      expect(typeof sync[0].url === 'string')
    })

    it('should return pixel sync', function () {
      let sync = spec.getUserSyncs({ pixelEnabled: true })
      expect(sync.length).to.equal(1)
      expect(sync[0].type === 'image')
      expect(typeof sync[0].url === 'string')
    }) */
  })
})

/*

import { expect } from 'chai'
import { spec } from 'modules/marsmediaBidAdapter'
import * as utils from 'src/utils';

describe('Marsmedia adapter', function () {
  const bid1_zone1 = {
      bidder: 'marsmedia',
      params: {zoneId: 1},
      adUnitCode: 'ad-unit-1',
      bidId: 'Bid_01',
      bidderRequestId: 'req-001',
      auctionId: 'auc-001',
      mediaTypes: {
        banner: {
          sizes: [[300, 250]]
        }
      }
    }, bid_video = {
      bidder: 'marsmedia',
      transactionId: '866394b8-5d37-4d49-803e-f1bdb595f73e',
      bidId: 'Bid_Video',
      bidderRequestId: '18b2a61ea5d9a7',
      auctionId: 'de45acf1-9109-4e52-8013-f2b7cf5f6766',
      params: {
        zoneId: 1
      },
      mediaTypes: {
        video: {
          context: 'instream',
          playerSize: [[640, 480]]
        }
      },
      adUnitCode: 'ad-unit-1'
    };

  const bidResponse1 = {
      id: 'bid1',
      seatbid: [{
        bid: [{
          id: '1',
          impid: 'Bid_01',
          crid: '100_001',
          price: 3.01,
          adm: '<!-- admarkup here -->',
          w: 300,
          h: 250
        }]
      }],
      cur: 'USD'
    }, videoBidResponse = {
      id: '47ce4badcf7482',
      seatbid: [{
        bid: [{
          id: 'sZSYq5zYMxo_0',
          impid: 'Bid_Video',
          crid: '100_003',
          price: 0.00145,
          adid: '158801',
          adm: '<!-- admarkup here -->',
          cid: '16855'
        }]
      }],
      cur: 'USD'
    };

  function buildBidderRequest(url = 'https://example.com/index.html', params = {}) {
    return Object.assign({}, params, {refererInfo: {referer: url, reachedTop: true}, timeout: 3000});
  }
  const DEFAULT_BIDDER_REQUEST = buildBidderRequest();

  function buildRequest(bidRequests, bidderRequest = DEFAULT_BIDDER_REQUEST, dnt = true) {
    let dntmock = sinon.stub(utils, 'getDNT').callsFake(() => dnt);
    let pbRequests = spec.buildRequests(bidRequests, bidderRequest);
    dntmock.restore();
    let rtbRequests = pbRequests.map(r => JSON.parse(r.data));
    return [pbRequests, rtbRequests];
  }

  describe('isBidRequestValid', function () {
    it('should return true if all params present', function () {
      expect(spec.isBidRequestValid(bid1_zone1)).to.be.true
    })

    it('should return false if any parameter missing', function () {
      expect(spec.isBidRequestValid(Object.assign(bid1_zone1, { params: { zoneId: null } }))).to.be.false
    })
  })

  describe('banner request building', function () {
    let bidRequest, bidRequests, _;
    before(function () {
      [_, bidRequests] = buildRequest([bid1_zone1]);
      bidRequest = bidRequests[0];
    });

    it('should be a first-price auction', function () {
      expect(bidRequest).to.have.property('at', 1);
    });

    it('should have banner object', function () {
      expect(bidRequest.imp[0]).to.have.property('banner');
    });

    it('should have id', function () {
      expect(bidRequest.imp[0]).to.have.property('id');
      expect(bidRequest.imp[0].id).to.be.eql('Bid_01');
    });

    it('should have w/h', function () {
      expect(bidRequest.imp[0].banner).to.have.property('format');
      expect(bidRequest.imp[0].banner.format).to.be.eql([{w: 300, h: 250}]);
    });

    it('should respect secure connection', function () {
      expect(bidRequest.imp[0]).to.have.property('secure', 1);
    });

    it('should have tagid', function () {
      expect(bidRequest.imp[0]).to.have.property('tagid', 'ad-unit-1');
    });

    it('should create proper site block', function () {
      expect(bidRequest.site).to.have.property('domain', 'example.com');
      expect(bidRequest.site).to.have.property('page', 'https://example.com/index.html');
    });

    it('should fill device with caller macro', function () {
      expect(bidRequest).to.have.property('device');
      expect(bidRequest.device).to.have.property('ip', 'caller');
      expect(bidRequest.device).to.have.property('ua', 'caller');
      expect(bidRequest.device).to.have.property('dnt', 1);
    });

    it('shouldn\'t contain gdpr-related information for default request', function () {
      let [_, bidRequests] = buildRequest([bid1_zone1]);
      expect(bidRequests[0]).to.not.have.property('regs');
      expect(bidRequests[0]).to.not.have.property('user');
    });

    it('should contain gdpr-related information if consent is configured', function () {
      let [_, bidRequests] = buildRequest([bid1_zone1],
        buildBidderRequest('https://example.com/index.html',
          {gdprConsent: {gdprApplies: true, consentString: 'test-consent-string', vendorData: {}}}));
      let bidRequest = bidRequests[0];
      expect(bidRequest).to.have.property('regs');
      expect(bidRequest.regs.ext).to.be.eql({'gdpr': 1});
      expect(bidRequest).to.have.property('user');
      expect(bidRequest.user.ext).to.be.eql({'consent': 'test-consent-string'});
    });

    it('should\'t contain consent string if gdpr isn\'t applied', function () {
      let [_, bidRequests] = buildRequest([bid1_zone1], buildBidderRequest('https://example.com/index.html', {gdprConsent: {gdprApplies: false}}));
      let bidRequest = bidRequests[0];
      expect(bidRequest).to.have.property('regs');
      expect(bidRequest.regs.ext).to.be.eql({'gdpr': 0});
      expect(bidRequest).to.not.have.property('user');
    });

    it('should\'t pass dnt if state is unknown', function () {
      let [_, bidRequests] = buildRequest([bid1_zone1], DEFAULT_BIDDER_REQUEST, false);
      expect(bidRequests[0].device).to.not.have.property('dnt');
    });

    it('should forward default bidder timeout', function() {
      let [_, bidRequests] = buildRequest([bid1_zone1], DEFAULT_BIDDER_REQUEST);
      let bidRequest = bidRequests[0];
      expect(bidRequests[0]).to.have.property('tmax', 3000);
    });
  });

  describe('video request building', function () {
    let _, bidRequests;
    before(function () {
      [_, bidRequests] = buildRequest([bid_video]);
    });

    it('should have video object', function () {
      expect(bidRequests[0].imp[0]).to.have.property('video');
    });

    it('should have h/w', function () {
      expect(bidRequests[0].imp[0].video).to.have.property('w', 640);
      expect(bidRequests[0].imp[0].video).to.have.property('h', 480);
    });

    it('should have tagid', function () {
      expect(bidRequests[0].imp[0]).to.have.property('tagid', 'ad-unit-1');
    });
  });

  describe('responses processing', function () {
    it('should return fully-initialized banner bid-response', function () {
      let [pbRequests, _] = buildRequest([bid1_zone1]);
      let resp = spec.interpretResponse({body: bidResponse1}, pbRequests[0])[0];
      expect(resp).to.have.property('requestId', 'Bid_01');
      expect(resp).to.have.property('cpm', 3.01);
      expect(resp).to.have.property('width', 300);
      expect(resp).to.have.property('height', 250);
      expect(resp).to.have.property('creativeId', '100_001');
      expect(resp).to.have.property('mediaType', 'banner');
      expect(resp).to.have.property('ad');
      expect(resp.ad).to.have.string('<!-- admarkup here -->');
    });

    it('should return fully-initialized video bid-response', function () {
      let [pbRequests, _] = buildRequest([bid_video]);
      let resp = spec.interpretResponse({body: videoBidResponse}, pbRequests[0])[0];
      expect(resp).to.have.property('requestId', 'Bid_Video');
      expect(resp.mediaType).to.equal('video');
      expect(resp.cpm).to.equal(0.00145);
      expect(resp.width).to.equal(640);
      expect(resp.height).to.equal(480);
      expect(resp).to.have.property('ad');
      expect(resp.ad).to.have.string('<!-- admarkup here -->');
    });
  });

  describe('adapter configuration', () => {
    it('should return a bidder code of marsmedia', function () {
      expect(spec.code).to.equal('marsmedia')
    })
    it('should alias mars', function () {
      expect(spec.aliases.length > 0 && spec.aliases[0] === 'mars').to.be.true
    })
  });

  describe('getUserSyncs', function () {

  })
});

*/
