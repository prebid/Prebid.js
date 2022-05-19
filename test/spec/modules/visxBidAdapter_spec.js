import { expect } from 'chai';
import { spec } from 'modules/visxBidAdapter.js';
import { config } from 'src/config.js';
import { newBidder } from 'src/adapters/bidderFactory.js';
import * as utils from 'src/utils.js';
import { makeSlot } from '../integration/faker/googletag.js';

describe('VisxAdapter', function () {
  const adapter = newBidder(spec);

  describe('inherited functions', function () {
    it('exists and is a function', function () {
      expect(adapter.callBids).to.exist.and.to.be.a('function');
    });
  });

  describe('isBidRequestValid', function () {
    let bid = {
      'bidder': 'visx',
      'params': {
        'uid': 903536
      },
      'adUnitCode': 'adunit-code',
      'sizes': [[300, 250], [300, 600]],
      'bidId': '30b31c1838de1e',
      'bidderRequestId': '22edbae2733bf6',
      'auctionId': '1d1a030790a475',
    };

    it('should return true when required params found', function () {
      expect(spec.isBidRequestValid(bid)).to.equal(true);
    });

    it('should return false when required params are not passed', function () {
      let bid = Object.assign({}, bid);
      delete bid.params;
      bid.params = {
        'uid': 0
      };
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });

    it('should return false when uid can not be parsed as number', function () {
      let bid = Object.assign({}, bid);
      delete bid.params;
      bid.params = {
        'uid': 'sdvsdv'
      };
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });

    it('it should fail on invalid video bid', function () {
      let videoBid = Object.assign({}, bid);
      videoBid.mediaTypes = {
        video: {
          context: 'instream',
          mimes: ['video/mp4'],
          protocols: [3, 6]
        }
      };
      expect(spec.isBidRequestValid(videoBid)).to.equal(false);
    });

    it('it should pass on valid video bid', function () {
      let videoBid = Object.assign({}, bid);
      videoBid.mediaTypes = {
        video: {
          context: 'instream',
          playerSize: [[400, 300]]
        }
      };
      expect(spec.isBidRequestValid(videoBid)).to.equal(true);
    })
  });

  describe('buildRequests', function () {
    function parseRequest(url) {
      const res = {};
      (url.split('?')[1] || '').split('&').forEach((it) => {
        const couple = it.split('=');
        res[couple[0]] = decodeURIComponent(couple[1]);
      });
      return res;
    }
    const bidderRequest = {
      timeout: 3000,
      refererInfo: {
        referer: 'https://example.com'
      }
    };
    const referrer = bidderRequest.refererInfo.referer;
    const schainObject = {
      ver: '1.0',
      nodes: [
        {asi: 'exchange2.com', sid: 'abcd', hp: 1},
        {asi: 'exchange1.com', sid: '1234!abcd', hp: 1, name: 'publisher, Inc.', domain: 'publisher.com'}
      ]
    };
    let bidRequests = [
      {
        'bidder': 'visx',
        'params': {
          'uid': 903535
        },
        'adUnitCode': 'adunit-code-1',
        'sizes': [[300, 250], [300, 600]],
        'bidId': '30b31c1838de1e',
        'bidderRequestId': '22edbae2733bf6',
        'auctionId': '1d1a030790a475',
      },
      {
        'bidder': 'visx',
        'params': {
          'uid': '903535'
        },
        'adUnitCode': 'adunit-code-2',
        'sizes': [[728, 90], [300, 250]],
        'bidId': '3150ccb55da321',
        'bidderRequestId': '22edbae2733bf6',
        'auctionId': '1d1a030790a475',
      },
      {
        'bidder': 'visx',
        'params': {
          'uid': 903536
        },
        'adUnitCode': 'adunit-code-1',
        'sizes': [[300, 250], [300, 600]],
        'bidId': '42dbe3a7168a6a',
        'bidderRequestId': '22edbae2733bf6',
        'auctionId': '1d1a030790a475',
      },
      {
        'bidder': 'visx',
        'params': {
          'uid': 903537
        },
        'adUnitCode': 'adunit-code-video-3',
        'mediaTypes': {
          'video': {
            'context': 'instream',
            'playerSize': [[400, 300]],
            'mimes': ['video/mp4', 'video/mpeg'],
            'protocols': [3, 6],
            'minduration': 5,
            'maxduration': 30
          }
        },
        'bidId': '39a4e3a7168a6a',
        'bidderRequestId': '22edbae2733bf6',
        'auctionId': '1d1a030790a475',
      }
    ];

    const expectedFullImps = [{
      'id': '30b31c1838de1e',
      'banner': {'format': [{'w': 300, 'h': 250}, {'w': 300, 'h': 600}]},
      'ext': {'bidder': {'uid': 903535, 'adslotExists': false}}
    },
    {
      'id': '3150ccb55da321',
      'banner': {'format': [{'w': 728, 'h': 90}, {'w': 300, 'h': 250}]},
      'ext': {'bidder': {'uid': 903535, 'adslotExists': false}}
    },
    {
      'id': '42dbe3a7168a6a',
      'banner': {'format': [{'w': 300, 'h': 250}, {'w': 300, 'h': 600}]},
      'ext': {'bidder': {'uid': 903536, 'adslotExists': false}}
    },
    {
      'id': '39a4e3a7168a6a',
      'video': {
        'w': 400,
        'h': 300,
        'mimes': ['video/mp4', 'video/mpeg'],
        'protocols': [3, 6],
        'minduration': 5,
        'maxduration': 30
      },
      'ext': {'bidder': {'uid': 903537}}
    }];

    it('should attach valid params to the tag', function () {
      const firstBid = bidRequests[0];
      const bids = [firstBid];
      const request = spec.buildRequests(bids, bidderRequest);
      const payload = parseRequest(request.url);
      expect(request.url).to.be.an('string');
      expect(payload).to.have.property('auids', '903535');

      const postData = request.data;
      expect(postData).to.be.an('object');
      expect(postData).to.deep.equal({
        'id': '22edbae2733bf6',
        'imp': [expectedFullImps[0]],
        'tmax': 3000,
        'cur': ['EUR'],
        'source': {'ext': {'wrapperType': 'Prebid_js', 'wrapperVersion': '$prebid.version$'}},
        'site': {'page': referrer}
      });
    });

    it('should attach valid params to the tag with multiformat request', function () {
      const request = spec.buildRequests(bidRequests, bidderRequest);
      const payload = parseRequest(request.url);
      expect(payload).to.be.an('object');
      expect(payload).to.have.property('auids', '903535,903535,903536,903537');

      const postData = request.data;
      expect(postData).to.be.an('object');
      expect(postData).to.deep.equal({
        'id': '22edbae2733bf6',
        'imp': expectedFullImps,
        'tmax': 3000,
        'cur': ['EUR'],
        'source': {'ext': {'wrapperType': 'Prebid_js', 'wrapperVersion': '$prebid.version$'}},
        'site': {'page': referrer}
      });
    });

    it('should add currency from currency.bidderCurrencyDefault', function () {
      const getConfigStub = sinon.stub(config, 'getConfig').callsFake(
        arg => arg === 'currency.bidderCurrencyDefault.visx' ? 'GBP' : 'USD');
      const request = spec.buildRequests(bidRequests, bidderRequest);
      const payload = parseRequest(request.url);
      expect(payload).to.be.an('object');
      expect(payload).to.have.property('auids', '903535,903535,903536,903537');

      const postData = request.data;
      expect(postData).to.be.an('object');
      expect(postData).to.deep.equal({
        'id': '22edbae2733bf6',
        'imp': expectedFullImps,
        'tmax': 3000,
        'cur': ['GBP'],
        'source': {'ext': {'wrapperType': 'Prebid_js', 'wrapperVersion': '$prebid.version$'}},
        'site': {'page': referrer}
      });

      getConfigStub.restore();
    });

    it('should add currency from currency.adServerCurrency', function () {
      const getConfigStub = sinon.stub(config, 'getConfig').callsFake(
        arg => arg === 'currency.bidderCurrencyDefault.visx' ? '' : 'USD');
      const request = spec.buildRequests(bidRequests, bidderRequest);
      const payload = parseRequest(request.url);
      expect(payload).to.be.an('object');
      expect(payload).to.have.property('auids', '903535,903535,903536,903537');

      const postData = request.data;
      expect(postData).to.be.an('object');
      expect(postData).to.deep.equal({
        'id': '22edbae2733bf6',
        'imp': expectedFullImps,
        'tmax': 3000,
        'cur': ['USD'],
        'source': {'ext': {'wrapperType': 'Prebid_js', 'wrapperVersion': '$prebid.version$'}},
        'site': {'page': referrer}
      });

      getConfigStub.restore();
    });

    it('if gdprConsent is present payload must have gdpr params', function () {
      const request = spec.buildRequests(bidRequests, Object.assign({gdprConsent: {consentString: 'AAA', gdprApplies: true}}, bidderRequest));

      const postData = request.data;
      expect(postData).to.be.an('object');
      expect(postData).to.deep.equal({
        'id': '22edbae2733bf6',
        'imp': expectedFullImps,
        'tmax': 3000,
        'cur': ['EUR'],
        'source': {'ext': {'wrapperType': 'Prebid_js', 'wrapperVersion': '$prebid.version$'}},
        'site': {'page': referrer},
        'user': {'ext': {'consent': 'AAA'}},
        'regs': {'ext': {'gdpr': 1}}
      });
    });

    it('if gdprApplies is false gdpr_applies must be 0', function () {
      const request = spec.buildRequests(bidRequests, Object.assign({gdprConsent: {consentString: 'AAA', gdprApplies: false}}, bidderRequest));

      const postData = request.data;
      expect(postData).to.be.an('object');
      expect(postData).to.deep.equal({
        'id': '22edbae2733bf6',
        'imp': expectedFullImps,
        'tmax': 3000,
        'cur': ['EUR'],
        'source': {'ext': {'wrapperType': 'Prebid_js', 'wrapperVersion': '$prebid.version$'}},
        'site': {'page': referrer},
        'user': {'ext': {'consent': 'AAA'}},
        'regs': {'ext': {'gdpr': 0}}
      });
    });

    it('if gdprApplies is undefined gdpr_applies must be 1', function () {
      const request = spec.buildRequests(bidRequests, Object.assign({gdprConsent: {consentString: 'AAA'}}, bidderRequest));

      const postData = request.data;
      expect(postData).to.be.an('object');
      expect(postData).to.deep.equal({
        'id': '22edbae2733bf6',
        'imp': expectedFullImps,
        'tmax': 3000,
        'cur': ['EUR'],
        'source': {'ext': {'wrapperType': 'Prebid_js', 'wrapperVersion': '$prebid.version$'}},
        'site': {'page': referrer},
        'user': {'ext': {'consent': 'AAA'}},
        'regs': {'ext': {'gdpr': 1}}
      });
    });

    it('if schain is present payload must have schain param', function () {
      const schainBidRequests = [
        Object.assign({schain: schainObject}, bidRequests[0]),
        bidRequests[1],
        bidRequests[2]
      ];
      const request = spec.buildRequests(schainBidRequests, bidderRequest);
      const payload = parseRequest(request.url);
      expect(payload).to.be.an('object');
      expect(payload).to.have.property('auids', '903535,903535,903536');

      const postData = request.data;
      expect(postData).to.be.an('object');
      expect(postData).to.deep.equal({
        'id': '22edbae2733bf6',
        'imp': expectedFullImps.slice(0, -1),
        'tmax': 3000,
        'cur': ['EUR'],
        'source': {
          'ext': {
            'wrapperType': 'Prebid_js',
            'wrapperVersion': '$prebid.version$',
            'schain': schainObject
          }
        },
        'site': {'page': referrer},
      });
    });

    it('if userId is available payload must have appropriate params', function () {
      const eids = [
        {
          source: 'pubcid.org',
          uids: [{
            id: 'some-random-id-value',
            atype: 1
          }]
        },
        {
          source: 'adserver.org',
          uids: [{
            id: 'some-random-id-value',
            atype: 1,
            ext: {
              rtiPartner: 'TDID'
            }
          }]
        }
      ];
      const userIdBidRequests = [
        Object.assign({userId: {
          tdid: '111',
          id5id: { uid: '222' },
          digitrustid: {data: {id: 'DTID', keyv: 4, privacy: {optout: false}, producer: 'ABC', version: 2}}
        },
        userIdAsEids: eids}, bidRequests[0]),
        bidRequests[1],
        bidRequests[2]
      ];
      const request = spec.buildRequests(userIdBidRequests, bidderRequest);

      const postData = request.data;
      expect(postData).to.be.an('object');
      expect(postData).to.deep.equal({
        'id': '22edbae2733bf6',
        'imp': expectedFullImps.slice(0, -1),
        'tmax': 3000,
        'cur': ['EUR'],
        'source': {
          'ext': {
            'wrapperType': 'Prebid_js',
            'wrapperVersion': '$prebid.version$'
          }
        },
        'site': {'page': referrer},
        'user': {'ext': {'eids': eids}}
      });
    });

    it('should pass grouped video bid\'s params in payload', function () {
      const request = spec.buildRequests(bidRequests, bidderRequest);

      const postData = request.data;
      expect(postData).to.be.an('object');
      expect(postData).to.deep.equal({
        'id': '22edbae2733bf6',
        'imp': expectedFullImps,
        'tmax': 3000,
        'cur': ['EUR'],
        'source': {
          'ext': {
            'wrapperType': 'Prebid_js',
            'wrapperVersion': '$prebid.version$'
          }
        },
        'site': {'page': referrer}
      });
    });
  });

  describe('buildRequests (multiple media types w/ unsupported video+outstream)', function () {
    function parseRequest(url) {
      const res = {};
      (url.split('?')[1] || '').split('&').forEach((it) => {
        const couple = it.split('=');
        res[couple[0]] = decodeURIComponent(couple[1]);
      });
      return res;
    }
    const bidderRequest = {
      timeout: 3000,
      refererInfo: {
        referer: 'https://example.com'
      }
    };
    const referrer = bidderRequest.refererInfo.referer;
    const bidRequests = [
      {
        'bidder': 'visx',
        'params': {
          'uid': '903538'
        },
        'adUnitCode': 'misconfigured-video',
        'sizes': [[300, 250], [300, 600]],
        'mediaTypes': {
          'video': {
            'context': 'outstream',
            'playerSize': [[400, 300]]
          }
        },
        'bidId': '39aff3a7169a6a',
        'bidderRequestId': '22edbae2733bf6',
        'auctionId': '1d1a030790a476',
      }
    ];

    it('should send requst for banner bid', function () {
      const request = spec.buildRequests([bidRequests[0]], bidderRequest);
      const payload = parseRequest(request.url);
      expect(payload).to.be.an('object');
      expect(payload).to.have.property('auids', '903538');

      const postData = request.data;
      expect(postData).to.be.an('object');
      expect(postData).to.deep.equal({
        'id': '22edbae2733bf6',
        'imp': [{
          'id': '39aff3a7169a6a',
          'banner': {'format': [{'w': 300, 'h': 250}, {'w': 300, 'h': 600}]},
          'ext': {'bidder': {'uid': 903538, 'adslotExists': false}}
        }],
        'tmax': 3000,
        'cur': ['EUR'],
        'source': {
          'ext': {
            'wrapperType': 'Prebid_js',
            'wrapperVersion': '$prebid.version$'
          }
        },
        'site': {'page': referrer}
      });
    });
  });

  describe('buildRequests (check ad slot exists)', function () {
    function parseRequest(url) {
      const res = {};
      (url.split('?')[1] || '').split('&').forEach((it) => {
        const couple = it.split('=');
        res[couple[0]] = decodeURIComponent(couple[1]);
      });
      return res;
    }
    const bidderRequest = {
      timeout: 3000,
      refererInfo: {
        referer: 'https://example.com'
      }
    };
    const referrer = bidderRequest.refererInfo.referer;
    const bidRequests = [
      {
        'bidder': 'visx',
        'params': {
          'uid': 903535
        },
        'adUnitCode': 'visx-adunit-code-1',
        'sizes': [[300, 250], [300, 600]],
        'bidId': '30b31c1838de1e',
        'bidderRequestId': '22edbae2733bf6',
        'auctionId': '1d1a030790a475',
      },
      {
        'bidder': 'visx',
        'params': {
          'uid': 903535
        },
        'adUnitCode': 'visx-adunit-code-2',
        'sizes': [[300, 250], [300, 600]],
        'bidId': '30b31c1838de1e',
        'bidderRequestId': '22edbae2733bf6',
        'auctionId': '1d1a030790a475',
      }
    ];
    let sandbox;
    let documentStub;

    before(function() {
      sandbox = sinon.sandbox.create();
      documentStub = sandbox.stub(document, 'getElementById');
      documentStub.withArgs('visx-adunit-code-1').returns({
        id: 'visx-adunit-code-1'
      });
      documentStub.withArgs('visx-adunit-element-2').returns({
        id: 'visx-adunit-element-2'
      });
    });

    after(function() {
      sandbox.restore();
    });

    it('should find ad slot by ad unit code as element id', function () {
      const request = spec.buildRequests([bidRequests[0]], bidderRequest);
      const payload = parseRequest(request.url);
      expect(payload).to.be.an('object');
      expect(payload).to.have.property('auids', '903535');

      const postData = request.data;
      expect(postData).to.be.an('object');
      expect(postData).to.deep.equal({
        'id': '22edbae2733bf6',
        'imp': [{
          'id': '30b31c1838de1e',
          'banner': {'format': [{'w': 300, 'h': 250}, {'w': 300, 'h': 600}]},
          'ext': {'bidder': {'uid': 903535, 'adslotExists': true}}
        }],
        'tmax': 3000,
        'cur': ['EUR'],
        'source': {
          'ext': {
            'wrapperType': 'Prebid_js',
            'wrapperVersion': '$prebid.version$'
          }
        },
        'site': {'page': referrer}
      });
    });

    it('should find ad slot by ad unit code as adUnitPath', function () {
      makeSlot({code: 'visx-adunit-code-2', divId: 'visx-adunit-element-2'});

      const request = spec.buildRequests([bidRequests[1]], bidderRequest);
      const payload = parseRequest(request.url);
      expect(payload).to.be.an('object');
      expect(payload).to.have.property('auids', '903535');

      const postData = request.data;
      expect(postData).to.be.an('object');
      expect(postData).to.deep.equal({
        'id': '22edbae2733bf6',
        'imp': [{
          'id': '30b31c1838de1e',
          'banner': {'format': [{'w': 300, 'h': 250}, {'w': 300, 'h': 600}]},
          'ext': {'bidder': {'uid': 903535, 'adslotExists': true}}
        }],
        'tmax': 3000,
        'cur': ['EUR'],
        'source': {
          'ext': {
            'wrapperType': 'Prebid_js',
            'wrapperVersion': '$prebid.version$'
          }
        },
        'site': {'page': referrer}
      });
    });
  });

  describe('interpretResponse', function () {
    const responses = [
      {'bid': [{'price': 1.15, 'impid': '300bfeb0d71a5b', 'adm': '<div>test content 1</div>', 'auid': 903535, 'h': 250, 'w': 300, 'cur': 'EUR', 'mediaType': 'banner', 'advertiserDomains': ['some_domain.com'], 'ext': {'prebid': {'targeting': {'hb_visx_product': 'understitial', 'hb_visx_width': 300, 'hb_visx_height': 250}}}}], 'seat': '1'},
      {'bid': [{'price': 0.5, 'impid': '4dff80cc4ee346', 'adm': '<div>test content 2</div>', 'auid': 903536, 'h': 600, 'w': 300, 'cur': 'EUR', 'mediaType': 'banner'}], 'seat': '1'},
      {'bid': [{'price': 0.15, 'impid': '5703af74d0472a', 'adm': '<div>test content 3</div>', 'auid': 903535, 'h': 90, 'w': 728, 'cur': 'EUR', 'mediaType': 'banner'}], 'seat': '1'},
      {'bid': [{'price': 0, 'impid': '300bfeb0d7190gf', 'auid': 903537, 'h': 250, 'w': 300, 'cur': 'EUR'}], 'seat': '1'},
      {'bid': [{'price': 0, 'adm': '<div>test content 5</div>', 'h': 250, 'w': 300, 'cur': 'EUR'}], 'seat': '1'},
      undefined,
      {'bid': [], 'seat': '1'},
      {'seat': '1'},
    ];

    it('should get correct bid response', function () {
      const bidRequests = [
        {
          'bidder': 'visx',
          'params': {
            'uid': '903535'
          },
          'adUnitCode': 'adunit-code-1',
          'sizes': [[300, 250], [300, 600]],
          'bidId': '300bfeb0d71a5b',
          'bidderRequestId': '5f2009617a7c0a',
          'auctionId': '1cbd2feafe5e8b',
        }
      ];
      const request = spec.buildRequests(bidRequests);
      const expectedResponse = [
        {
          'requestId': '300bfeb0d71a5b',
          'cpm': 1.15,
          'creativeId': 903535,
          'dealId': undefined,
          'width': 300,
          'height': 250,
          'ad': '<div>test content 1</div>',
          'currency': 'EUR',
          'netRevenue': true,
          'ttl': 360,
          'meta': {
            'advertiserDomains': ['some_domain.com'],
            'mediaType': 'banner',
          },
          'adserverTargeting': {
            'hb_visx_product': 'understitial',
            'hb_visx_width': 300,
            'hb_visx_height': 250,
          },
          'ext': {
            'targeting': {
              'hb_visx_product': 'understitial',
              'hb_visx_width': 300,
              'hb_visx_height': 250,
            }
          }
        }
      ];

      const result = spec.interpretResponse({'body': {'seatbid': [responses[0]]}}, request);
      expect(result).to.deep.equal(expectedResponse);
    });

    it('should get correct multi bid response', function () {
      const bidRequests = [
        {
          'bidder': 'visx',
          'params': {
            'uid': '903535'
          },
          'adUnitCode': 'adunit-code-1',
          'sizes': [[300, 250], [300, 600]],
          'bidId': '300bfeb0d71a5b',
          'bidderRequestId': '2c2bb1972df9a',
          'auctionId': '1fa09aee5c8c99',
        },
        {
          'bidder': 'visx',
          'params': {
            'uid': '903536'
          },
          'adUnitCode': 'adunit-code-1',
          'sizes': [[300, 250], [300, 600]],
          'bidId': '4dff80cc4ee346',
          'bidderRequestId': '2c2bb1972df9a',
          'auctionId': '1fa09aee5c8c99',
        },
        {
          'bidder': 'visx',
          'params': {
            'uid': '903535'
          },
          'adUnitCode': 'adunit-code-2',
          'sizes': [[728, 90]],
          'bidId': '5703af74d0472a',
          'bidderRequestId': '2c2bb1972df9a',
          'auctionId': '1fa09aee5c8c99',
        }
      ];
      const request = spec.buildRequests(bidRequests);
      const expectedResponse = [
        {
          'requestId': '300bfeb0d71a5b',
          'cpm': 1.15,
          'creativeId': 903535,
          'dealId': undefined,
          'width': 300,
          'height': 250,
          'ad': '<div>test content 1</div>',
          'currency': 'EUR',
          'netRevenue': true,
          'ttl': 360,
          'meta': {
            'advertiserDomains': ['some_domain.com'],
            'mediaType': 'banner',
          },
          'adserverTargeting': {
            'hb_visx_product': 'understitial',
            'hb_visx_width': 300,
            'hb_visx_height': 250,
          },
          'ext': {
            'targeting': {
              'hb_visx_product': 'understitial',
              'hb_visx_width': 300,
              'hb_visx_height': 250,
            }
          }
        },
        {
          'requestId': '4dff80cc4ee346',
          'cpm': 0.5,
          'creativeId': 903536,
          'dealId': undefined,
          'width': 300,
          'height': 600,
          'ad': '<div>test content 2</div>',
          'currency': 'EUR',
          'netRevenue': true,
          'ttl': 360,
          'meta': {
            'advertiserDomains': [],
            'mediaType': 'banner',
          },
        },
        {
          'requestId': '5703af74d0472a',
          'cpm': 0.15,
          'creativeId': 903535,
          'dealId': undefined,
          'width': 728,
          'height': 90,
          'ad': '<div>test content 3</div>',
          'currency': 'EUR',
          'netRevenue': true,
          'ttl': 360,
          'meta': {
            'advertiserDomains': [],
            'mediaType': 'banner',
          },
        }
      ];

      const result = spec.interpretResponse({'body': {'seatbid': responses.slice(0, 3)}}, request);
      expect(result).to.deep.equal(expectedResponse);
    });

    it('should return right currency', function () {
      const bidRequests = [
        {
          'bidder': 'visx',
          'params': {
            'uid': '903535'
          },
          'adUnitCode': 'adunit-code-1',
          'sizes': [[300, 250], [300, 600]],
          'bidId': '300bfeb0d71a5b',
          'bidderRequestId': '5f2009617a7c0a',
          'auctionId': '1cbd2feafe5e8b',
        }
      ];
      const getConfigStub = sinon.stub(config, 'getConfig').returns('PLN');
      const request = spec.buildRequests(bidRequests);
      const expectedResponse = [
        {
          'requestId': '300bfeb0d71a5b',
          'cpm': 1.15,
          'creativeId': 903535,
          'dealId': undefined,
          'width': 300,
          'height': 250,
          'ad': '<div>test content 1</div>',
          'currency': 'PLN',
          'netRevenue': true,
          'ttl': 360,
          'meta': {
            'advertiserDomains': ['some_domain.com'],
            'mediaType': 'banner',
          },
          'adserverTargeting': {
            'hb_visx_product': 'understitial',
            'hb_visx_width': 300,
            'hb_visx_height': 250,
          },
          'ext': {
            'targeting': {
              'hb_visx_product': 'understitial',
              'hb_visx_width': 300,
              'hb_visx_height': 250,
            }
          }
        }
      ];

      const response = Object.assign({}, responses[0]);
      response.bid = [Object.assign({}, response.bid[0], {'cur': 'PLN'})];
      const result = spec.interpretResponse({'body': {'seatbid': [response]}}, request);
      expect(result).to.deep.equal(expectedResponse);
      getConfigStub.restore();
    });

    it('handles wrong and nobid responses', function () {
      const bidRequests = [
        {
          'bidder': 'visx',
          'params': {
            'uid': '903537'
          },
          'adUnitCode': 'adunit-code-1',
          'sizes': [[300, 250], [300, 600]],
          'bidId': '300bfeb0d7190gf',
          'bidderRequestId': '2c2bb1972d23af',
          'auctionId': '1fa09aee5c84d34',
        },
        {
          'bidder': 'visx',
          'params': {
            'uid': '903538'
          },
          'adUnitCode': 'adunit-code-1',
          'sizes': [[300, 250], [300, 600]],
          'bidId': '300bfeb0d71321',
          'bidderRequestId': '2c2bb1972d23af',
          'auctionId': '1fa09aee5c84d34',
        },
        {
          'bidder': 'visx',
          'params': {
            'uid': '903539'
          },
          'adUnitCode': 'adunit-code-2',
          'sizes': [[728, 90]],
          'bidId': '300bfeb0d7183bb',
          'bidderRequestId': '2c2bb1972d23af',
          'auctionId': '1fa09aee5c84d34',
        }
      ];
      const request = spec.buildRequests(bidRequests);
      const result = spec.interpretResponse({'body': {'seatbid': responses.slice(3)}}, request);
      expect(result.length).to.equal(0);
    });

    it('complicated case', function () {
      const fullResponse = [
        {'bid': [{'price': 1.15, 'impid': '2164be6358b9', 'adm': '<div>test content 1</div>', 'auid': 903535, 'h': 250, 'w': 300, 'cur': 'EUR', 'mediaType': 'banner', 'advertiserDomains': ['some_domain.com']}], 'seat': '1'},
        {'bid': [{'price': 0.5, 'impid': '4e111f1b66e4', 'adm': '<div>test content 2</div>', 'auid': 903536, 'h': 600, 'w': 300, 'cur': 'EUR', 'mediaType': 'banner'}], 'seat': '1'},
        {'bid': [{'price': 0.15, 'impid': '26d6f897b516', 'adm': '<div>test content 3</div>', 'auid': 903535, 'h': 90, 'w': 728, 'cur': 'EUR', 'mediaType': 'banner'}], 'seat': '1'},
        {'bid': [{'price': 0.15, 'impid': '326bde7fbf69', 'adm': '<div>test content 4</div>', 'auid': 903535, 'h': 600, 'w': 300, 'cur': 'EUR', 'mediaType': 'banner'}], 'seat': '1'},
        {'bid': [{'price': 0.5, 'impid': '1751cd90161', 'adm': '<div>test content 5</div>', 'auid': 903536, 'h': 600, 'w': 350, 'cur': 'EUR', 'mediaType': 'banner'}], 'seat': '1'},
      ];
      const bidRequests = [
        {
          'bidder': 'visx',
          'params': {
            'uid': '903535'
          },
          'adUnitCode': 'adunit-code-1',
          'sizes': [[300, 250], [300, 600]],
          'bidId': '2164be6358b9',
          'bidderRequestId': '106efe3247',
          'auctionId': '32a1f276cb87cb8',
        },
        {
          'bidder': 'visx',
          'params': {
            'uid': '903535'
          },
          'adUnitCode': 'adunit-code-1',
          'sizes': [[300, 250], [300, 600]],
          'bidId': '326bde7fbf69',
          'bidderRequestId': '106efe3247',
          'auctionId': '32a1f276cb87cb8',
        },
        {
          'bidder': 'visx',
          'params': {
            'uid': '903536'
          },
          'adUnitCode': 'adunit-code-1',
          'sizes': [[300, 250], [300, 600]],
          'bidId': '4e111f1b66e4',
          'bidderRequestId': '106efe3247',
          'auctionId': '32a1f276cb87cb8',
        },
        {
          'bidder': 'visx',
          'params': {
            'uid': '903535'
          },
          'adUnitCode': 'adunit-code-2',
          'sizes': [[728, 90]],
          'bidId': '26d6f897b516',
          'bidderRequestId': '106efe3247',
          'auctionId': '32a1f276cb87cb8',
        },
        {
          'bidder': 'visx',
          'params': {
            'uid': '903536'
          },
          'adUnitCode': 'adunit-code-2',
          'sizes': [[728, 90]],
          'bidId': '1751cd90161',
          'bidderRequestId': '106efe3247',
          'auctionId': '32a1f276cb87cb8',
        }
      ];
      const request = spec.buildRequests(bidRequests);
      const expectedResponse = [
        {
          'requestId': '2164be6358b9',
          'cpm': 1.15,
          'creativeId': 903535,
          'dealId': undefined,
          'width': 300,
          'height': 250,
          'ad': '<div>test content 1</div>',
          'currency': 'EUR',
          'netRevenue': true,
          'ttl': 360,
          'meta': {
            'advertiserDomains': ['some_domain.com'],
            'mediaType': 'banner',
          },
        },
        {
          'requestId': '4e111f1b66e4',
          'cpm': 0.5,
          'creativeId': 903536,
          'dealId': undefined,
          'width': 300,
          'height': 600,
          'ad': '<div>test content 2</div>',
          'currency': 'EUR',
          'netRevenue': true,
          'ttl': 360,
          'meta': {
            'advertiserDomains': [],
            'mediaType': 'banner',
          },
        },
        {
          'requestId': '26d6f897b516',
          'cpm': 0.15,
          'creativeId': 903535,
          'dealId': undefined,
          'width': 728,
          'height': 90,
          'ad': '<div>test content 3</div>',
          'currency': 'EUR',
          'netRevenue': true,
          'ttl': 360,
          'meta': {
            'advertiserDomains': [],
            'mediaType': 'banner',
          },
        },
        {
          'requestId': '326bde7fbf69',
          'cpm': 0.15,
          'creativeId': 903535,
          'dealId': undefined,
          'width': 300,
          'height': 600,
          'ad': '<div>test content 4</div>',
          'currency': 'EUR',
          'netRevenue': true,
          'ttl': 360,
          'meta': {
            'advertiserDomains': [],
            'mediaType': 'banner',
          },
        },
        {
          'requestId': '1751cd90161',
          'cpm': 0.5,
          'creativeId': 903536,
          'dealId': undefined,
          'width': 350,
          'height': 600,
          'ad': '<div>test content 5</div>',
          'currency': 'EUR',
          'netRevenue': true,
          'ttl': 360,
          'meta': {
            'advertiserDomains': [],
            'mediaType': 'banner',
          },
        }
      ];

      const result = spec.interpretResponse({'body': {'seatbid': fullResponse}}, request);
      expect(result).to.deep.equal(expectedResponse);
    });

    it('dublicate uids and sizes in one slot', function () {
      const fullResponse = [
        {'bid': [{'price': 1.15, 'impid': '5126e301f4be', 'adm': '<div>test content 1</div>', 'auid': 903535, 'h': 250, 'w': 300, 'cur': 'EUR', 'mediaType': 'banner'}], 'seat': '1'},
        {'bid': [{'price': 0.5, 'impid': '57b2ebe70e16', 'adm': '<div>test content 2</div>', 'auid': 903535, 'h': 250, 'w': 300, 'cur': 'EUR', 'mediaType': 'banner'}], 'seat': '1'},
      ];
      const bidRequests = [
        {
          'bidder': 'visx',
          'params': {
            'uid': '903535'
          },
          'adUnitCode': 'adunit-code-1',
          'sizes': [[300, 250], [300, 600]],
          'bidId': '5126e301f4be',
          'bidderRequestId': '171c5405a390',
          'auctionId': '35bcbc0f7e79c',
        },
        {
          'bidder': 'visx',
          'params': {
            'uid': '903535'
          },
          'adUnitCode': 'adunit-code-1',
          'sizes': [[300, 250], [300, 600]],
          'bidId': '57b2ebe70e16',
          'bidderRequestId': '171c5405a390',
          'auctionId': '35bcbc0f7e79c',
        },
        {
          'bidder': 'visx',
          'params': {
            'uid': '903535'
          },
          'adUnitCode': 'adunit-code-1',
          'sizes': [[300, 250], [300, 600]],
          'bidId': '225fcd44b18c',
          'bidderRequestId': '171c5405a390',
          'auctionId': '35bcbc0f7e79c',
        }
      ];
      const request = spec.buildRequests(bidRequests);
      const expectedResponse = [
        {
          'requestId': '5126e301f4be',
          'cpm': 1.15,
          'creativeId': 903535,
          'dealId': undefined,
          'width': 300,
          'height': 250,
          'ad': '<div>test content 1</div>',
          'currency': 'EUR',
          'netRevenue': true,
          'ttl': 360,
          'meta': {
            'advertiserDomains': [],
            'mediaType': 'banner',
          },
        },
        {
          'requestId': '57b2ebe70e16',
          'cpm': 0.5,
          'creativeId': 903535,
          'dealId': undefined,
          'width': 300,
          'height': 250,
          'ad': '<div>test content 2</div>',
          'currency': 'EUR',
          'netRevenue': true,
          'ttl': 360,
          'meta': {
            'advertiserDomains': [],
            'mediaType': 'banner',
          },
        }
      ];

      const result = spec.interpretResponse({'body': {'seatbid': fullResponse}}, request);
      expect(result).to.deep.equal(expectedResponse);
    });

    it('handles video bid', function () {
      const fullResponse = [
        {'bid': [{'price': 0.5, 'impid': '2164be6358b9', 'adm': '<VAST/>', 'auid': 903537, 'w': 400, 'h': 300, 'cur': 'EUR', 'mediaType': 'video'}], 'seat': '1'},
      ];
      const bidRequests = [
        {
          'bidder': 'visx',
          'params': {
            'uid': '903537'
          },
          'adUnitCode': 'adunit-code-1',
          'mediaTypes': {
            'video': {
              'context': 'instream',
              'playerSize': [[400, 300]],
              'mimes': ['video/mp4'],
              'protocols': [3, 6]
            }
          },
          'sizes': [[400, 300]],
          'bidId': '2164be6358b9',
          'bidderRequestId': '106efe3247',
          'auctionId': '32a1f276cb87cb8',
        }
      ];
      const request = spec.buildRequests(bidRequests);
      const expectedResponse = [
        {
          'mediaType': 'video',
          'requestId': '2164be6358b9',
          'cpm': 0.5,
          'creativeId': 903537,
          'dealId': undefined,
          'width': 400,
          'height': 300,
          'vastXml': '<VAST/>',
          'currency': 'EUR',
          'netRevenue': true,
          'ttl': 360,
          'meta': {
            'advertiserDomains': [],
            'mediaType': 'video',
          },
        }
      ];
      const result = spec.interpretResponse({'body': {'seatbid': fullResponse}}, request);
      expect(result).to.deep.equal(expectedResponse);
    });

    it('handles multiformat bid response with outstream+banner as banner', function () {
      const fullResponse = [
        {'bid': [{'price': 0.5, 'impid': '2164be6358b9', 'adm': '<VAST/>', 'auid': 903537, 'w': 400, 'h': 300, 'cur': 'EUR', 'mediaType': 'video'}], 'seat': '1'},
      ];
      const bidRequests = [
        {
          'bidder': 'visx',
          'params': {
            'uid': '903537'
          },
          'adUnitCode': 'adunit-code-1',
          'mediaTypes': {
            'video': {
              'context': 'outstream',
              'playerSize': [[400, 300]],
              'mimes': ['video/mp4'],
              'protocols': [3, 6]
            }
          },
          'banner': {
            'sizes': []
          },
          'sizes': [[400, 300]],
          'bidId': '2164be6358b9',
          'bidderRequestId': '106efe3247',
          'auctionId': '32a1f276cb87cb8',
        }
      ];
      const request = spec.buildRequests(bidRequests);
      const expectedResponse = [
        {
          'ad': '<VAST/>',
          'requestId': '2164be6358b9',
          'cpm': 0.5,
          'creativeId': 903537,
          'dealId': undefined,
          'width': 400,
          'height': 300,
          'currency': 'EUR',
          'netRevenue': true,
          'ttl': 360,
          'meta': {
            'advertiserDomains': [],
            'mediaType': 'video',
          },
        }
      ];
      const result = spec.interpretResponse({'body': {'seatbid': fullResponse}}, request);
      expect(result).to.deep.equal(expectedResponse);
    });

    it('should get right ext data in bid response', function () {
      const bidRequests = [
        {
          'bidder': 'visx',
          'params': {
            'uid': '903535'
          },
          'adUnitCode': 'adunit-code-1',
          'sizes': [[300, 250], [300, 600]],
          'bidId': '300bfeb0d71a5b',
          'bidderRequestId': '5f2009617a7c0a',
          'auctionId': '1cbd2feafe5e8b',
        }
      ];
      const request = spec.buildRequests(bidRequests);
      const pendingUrl = 'https://t.visx.net/track/pending/123123123';
      const winUrl = 'https://t.visx.net/track/win/53245341';
      const expectedResponse = [
        {
          'requestId': '300bfeb0d71a5b',
          'cpm': 1.15,
          'creativeId': 903535,
          'dealId': undefined,
          'width': 300,
          'height': 250,
          'ad': '<div>test content 1</div>',
          'currency': 'EUR',
          'netRevenue': true,
          'ttl': 360,
          'meta': {
            'advertiserDomains': ['some_domain.com'],
            'mediaType': 'banner',
          },
          'adserverTargeting': {
            'hb_visx_product': 'understitial',
            'hb_visx_width': 300,
            'hb_visx_height': 250,
          },
          'ext': {
            'events': {
              'pending': pendingUrl,
              'win': winUrl
            },
            'targeting': {
              'hb_visx_product': 'understitial',
              'hb_visx_width': 300,
              'hb_visx_height': 250,
            }
          }
        }
      ];
      const serverResponse = Object.assign({}, responses[0]);
      serverResponse.bid = [Object.assign({}, serverResponse.bid[0])];
      serverResponse.bid[0].ext.prebid = Object.assign({}, serverResponse.bid[0].ext.prebid);
      utils.deepSetValue(serverResponse.bid[0], 'ext.prebid.events', {
        pending: pendingUrl,
        win: winUrl,
      });
      const result = spec.interpretResponse({'body': {'seatbid': [serverResponse]}}, request);
      expect(result).to.deep.equal(expectedResponse);
    });
  });
  describe('check trackers', function () {
    beforeEach(function () {
      sinon.stub(utils, 'triggerPixel');
    });

    afterEach(function () {
      utils.triggerPixel.restore();
    });

    it('onSetTargeting', function () {
      const trackUrl = 'https://t.visx.net/track/pending/123123123';
      const bid = { ext: { events: { pending: trackUrl } } };
      spec.onSetTargeting(bid);
      expect(utils.triggerPixel.calledOnceWith(trackUrl)).to.equal(true);
    });

    it('onBidWon', function () {
      const trackUrl = 'https://t.visx.net/track/win/123123123';
      const bid = { ext: { events: { win: trackUrl } } };
      spec.onBidWon(bid);
      expect(utils.triggerPixel.calledOnceWith(trackUrl)).to.equal(true);
    });

    it('onTimeout', function () {
      const data = [{ timeout: 3000, adUnitCode: 'adunit-code-1', auctionId: '1cbd2feafe5e8b', bidder: 'visx', bidId: '23423', params: [{ uid: '1' }] }];
      const expectedData = [{ ...data[0], params: [{ uid: 1 }] }];
      spec.onTimeout(data);
      expect(utils.triggerPixel.calledOnceWith('https://t.visx.net/track/bid_timeout//' + JSON.stringify(expectedData))).to.equal(true);
    });
  });

  describe('user sync', function () {
    function parseUrl(url) {
      const [, path, querySt] = url.match(/^https?:\/\/[^\/]+(?:\/([^?]+)?)?(?:\?(.+)?)?$/) || [];
      const query = {};
      (querySt || '').split('&').forEach((q) => {
        var kv = q.split('=');
        if (kv[0]) {
          query[kv[0]] = decodeURIComponent(kv[1] || '');
        }
      });
      return { path, query };
    }
    it('should call iframe', function () {
      let syncs = spec.getUserSyncs({
        iframeEnabled: true
      });

      expect(Array.isArray(syncs)).to.equal(true);
      expect(syncs.length).to.equal(1);
      expect(syncs[0]).to.have.property('type', 'iframe');
      expect(syncs[0]).to.have.property('url');
      expect(syncs[0].url).to.be.an('string');

      const { path, query } = parseUrl(syncs[0].url);
      expect(path).to.equal('push_sync');
      expect(query).to.deep.equal({iframe: '1'});
    });

    it('should call image', function () {
      let syncs = spec.getUserSyncs({
        pixelEnabled: true
      });

      expect(Array.isArray(syncs)).to.equal(true);
      expect(syncs.length).to.equal(1);
      expect(syncs[0]).to.have.property('type', 'image');
      expect(syncs[0]).to.have.property('url');
      expect(syncs[0].url).to.be.an('string');

      const { path, query } = parseUrl(syncs[0].url);
      expect(path).to.equal('push_sync');
      expect(query).to.deep.equal({});
    });
  });
});
