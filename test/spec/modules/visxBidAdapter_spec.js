import { expect } from 'chai';
import { spec } from 'modules/visxBidAdapter.js';
import { config } from 'src/config.js';
import { newBidder } from 'src/adapters/bidderFactory.js';
import * as utils from 'src/utils.js';

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
        'uid': '903536'
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

    it('it should fail on invalid video bid', function () {
      let videoBid = Object.assign({}, bid);
      videoBid.mediaTypes = {
        video: {
          context: 'instream',
          playerSize: [400, 300]
        }
      };
      expect(spec.isBidRequestValid(videoBid)).to.equal(false);
    });

    it('it should pass on valid video bid', function () {
      let videoBid = Object.assign({}, bid);
      videoBid.mediaTypes = {
        video: {
          context: 'instream',
          playerSize: [400, 300],
          mimes: ['video/mp4'],
          protocols: [3, 6]
        }
      };
      expect(spec.isBidRequestValid(videoBid)).to.equal(true);
    })
  });

  describe('buildRequests', function () {
    const bidderRequest = {
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
    const schainString = JSON.stringify(schainObject);
    let bidRequests = [
      {
        'bidder': 'visx',
        'params': {
          'uid': '903535'
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
          'uid': '903536'
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
          'uid': '903537'
        },
        'adUnitCode': 'adunit-code-video-3',
        'mediaTypes': {
          'video': {
            'context': 'instream',
            'playerSize': [400, 300],
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

    it('should attach valid params to the tag', function () {
      const request = spec.buildRequests([bidRequests[0]], bidderRequest);
      const payload = request.data;
      expect(payload).to.be.an('object');
      expect(payload).to.have.property('u', referrer);
      expect(payload).to.have.property('pt', 'net');
      expect(payload).to.have.property('auids', '903535');
      expect(payload).to.have.property('sizes', '300x250,300x600');
      expect(payload).to.have.property('r', '22edbae2733bf6');
      expect(payload).to.have.property('cur', 'EUR');
    });

    it('sizes must not be duplicated', function () {
      const request = spec.buildRequests(bidRequests, bidderRequest);
      const payload = request.data;
      expect(payload).to.be.an('object');
      expect(payload).to.have.property('u', referrer);
      expect(payload).to.have.property('pt', 'net');
      expect(payload).to.have.property('auids', '903535,903535,903536,903537');
      expect(payload).to.have.property('sizes', '300x250,300x600,728x90');
      expect(payload).to.have.property('r', '22edbae2733bf6');
      expect(payload).to.have.property('cur', 'EUR');
    });

    it('pt parameter must be "net" if params.priceType === "gross"', function () {
      bidRequests[1].params.priceType = 'gross';
      const request = spec.buildRequests(bidRequests, bidderRequest);
      const payload = request.data;
      expect(payload).to.be.an('object');
      expect(payload).to.have.property('u', referrer);
      expect(payload).to.have.property('pt', 'net');
      expect(payload).to.have.property('auids', '903535,903535,903536,903537');
      expect(payload).to.have.property('sizes', '300x250,300x600,728x90');
      expect(payload).to.have.property('r', '22edbae2733bf6');
      expect(payload).to.have.property('cur', 'EUR');
      delete bidRequests[1].params.priceType;
    });
    it('pt parameter must be "net" if params.priceType === "net"', function () {
      bidRequests[1].params.priceType = 'net';
      const request = spec.buildRequests(bidRequests, bidderRequest);
      const payload = request.data;
      expect(payload).to.be.an('object');
      expect(payload).to.have.property('u', referrer);
      expect(payload).to.have.property('pt', 'net');
      expect(payload).to.have.property('auids', '903535,903535,903536,903537');
      expect(payload).to.have.property('sizes', '300x250,300x600,728x90');
      expect(payload).to.have.property('r', '22edbae2733bf6');
      expect(payload).to.have.property('cur', 'EUR');
      delete bidRequests[1].params.priceType;
    });

    it('pt parameter must be "net" if params.priceType === "undefined"', function () {
      bidRequests[1].params.priceType = 'undefined';
      const request = spec.buildRequests(bidRequests, bidderRequest);
      const payload = request.data;
      expect(payload).to.be.an('object');
      expect(payload).to.have.property('u', referrer);
      expect(payload).to.have.property('pt', 'net');
      expect(payload).to.have.property('auids', '903535,903535,903536,903537');
      expect(payload).to.have.property('sizes', '300x250,300x600,728x90');
      expect(payload).to.have.property('r', '22edbae2733bf6');
      expect(payload).to.have.property('cur', 'EUR');
      delete bidRequests[1].params.priceType;
    });

    it('should add currency from currency.bidderCurrencyDefault', function () {
      const getConfigStub = sinon.stub(config, 'getConfig').callsFake(
        arg => arg === 'currency.bidderCurrencyDefault.visx' ? 'GBP' : 'USD');
      const request = spec.buildRequests(bidRequests, bidderRequest);
      const payload = request.data;
      expect(payload).to.be.an('object');
      expect(payload).to.have.property('u', referrer);
      expect(payload).to.have.property('pt', 'net');
      expect(payload).to.have.property('auids', '903535,903535,903536,903537');
      expect(payload).to.have.property('sizes', '300x250,300x600,728x90');
      expect(payload).to.have.property('r', '22edbae2733bf6');
      expect(payload).to.have.property('cur', 'GBP');
      getConfigStub.restore();
    });

    it('should add currency from currency.adServerCurrency', function () {
      const getConfigStub = sinon.stub(config, 'getConfig').callsFake(
        arg => arg === 'currency.bidderCurrencyDefault.visx' ? '' : 'USD');
      const request = spec.buildRequests(bidRequests, bidderRequest);
      const payload = request.data;
      expect(payload).to.be.an('object');
      expect(payload).to.have.property('u', referrer);
      expect(payload).to.have.property('pt', 'net');
      expect(payload).to.have.property('auids', '903535,903535,903536,903537');
      expect(payload).to.have.property('sizes', '300x250,300x600,728x90');
      expect(payload).to.have.property('r', '22edbae2733bf6');
      expect(payload).to.have.property('cur', 'USD');
      getConfigStub.restore();
    });

    it('if gdprConsent is present payload must have gdpr params', function () {
      const request = spec.buildRequests(bidRequests, {gdprConsent: {consentString: 'AAA', gdprApplies: true}});
      const payload = request.data;
      expect(payload).to.be.an('object');
      expect(payload).to.have.property('gdpr_consent', 'AAA');
      expect(payload).to.have.property('gdpr_applies', 1);
    });

    it('if gdprApplies is false gdpr_applies must be 0', function () {
      const request = spec.buildRequests(bidRequests, {gdprConsent: {consentString: 'AAA', gdprApplies: false}});
      const payload = request.data;
      expect(payload).to.be.an('object');
      expect(payload).to.have.property('gdpr_consent', 'AAA');
      expect(payload).to.have.property('gdpr_applies', 0);
    });

    it('if gdprApplies is undefined gdpr_applies must be 1', function () {
      const request = spec.buildRequests(bidRequests, {gdprConsent: {consentString: 'AAA'}});
      const payload = request.data;
      expect(payload).to.be.an('object');
      expect(payload).to.have.property('gdpr_consent', 'AAA');
      expect(payload).to.have.property('gdpr_applies', 1);
    });

    it('if schain is present payload must have schain param', function () {
      const schainBidRequests = [
        Object.assign({schain: schainObject}, bidRequests[0]),
        bidRequests[1],
        bidRequests[2]
      ];
      const request = spec.buildRequests(schainBidRequests, bidderRequest);
      const payload = request.data;
      expect(payload).to.be.an('object');
      expect(payload).to.have.property('schain', schainString);
      expect(payload).to.have.property('u', referrer);
      expect(payload).to.have.property('pt', 'net');
      expect(payload).to.have.property('auids', '903535,903535,903536');
      expect(payload).to.have.property('sizes', '300x250,300x600,728x90');
      expect(payload).to.have.property('r', '22edbae2733bf6');
      expect(payload).to.have.property('cur', 'EUR');
    });

    it('if userId is available payload must have appropriate params', function () {
      const schainBidRequests = [
        Object.assign({userId: {
          tdid: '111',
          id5id: { uid: '222' },
          digitrustid: {data: {id: 'DTID', keyv: 4, privacy: {optout: false}, producer: 'ABC', version: 2}}
        }}, bidRequests[0]),
        bidRequests[1],
        bidRequests[2]
      ];
      const request = spec.buildRequests(schainBidRequests, bidderRequest);
      const payload = request.data;
      expect(payload).to.be.an('object');
      expect(payload).to.have.property('tdid', '111');
      expect(payload).to.have.property('id5', '222');
      expect(payload).to.have.property('dtid', 'DTID');
    });

    it('should pass grouped video bid\'s params in payload', function () {
      const request = spec.buildRequests(bidRequests, bidderRequest);
      const payload = request.data;
      expect(payload).to.have.property('protocols', ',,,3|6');
      expect(payload).to.have.property('mimes', ',,,video/mp4|video/mpeg');
      expect(payload).to.have.property('playerSize', ',,,400x300');
      expect(payload).to.have.property('minduration', ',,,5');
      expect(payload).to.have.property('maxduration', ',,,30');
      expect(payload).to.not.have.property('skip');
    });
  });

  describe('buildRequests (multiple media types w/ unsupported video+outstream)', function () {
    const bidderRequest = {
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
            'playerSize': [400, 300]
          }
        },
        'bidId': '39aff3a7169a6a',
        'bidderRequestId': '22edffe2733bf6',
        'auctionId': '1d1a030790a476',
      }
    ];

    it('should send requst for banner bid', function () {
      const request = spec.buildRequests([bidRequests[0]], bidderRequest);
      const payload = request.data;
      expect(payload).to.be.an('object');
      expect(payload).to.have.property('u', referrer);
      expect(payload).to.have.property('pt', 'net');
      expect(payload).to.have.property('auids', '903538');
      expect(payload).to.have.property('sizes', '300x250,300x600');
      expect(payload).to.not.have.property('playerSize');
    });
  });

  describe('interpretResponse', function () {
    const responses = [
      {'bid': [{'price': 1.15, 'adm': '<div>test content 1</div>', 'auid': 903535, 'h': 250, 'w': 300, 'cur': 'EUR', 'mediaType': 'banner', 'advertiserDomains': ['some_domain.com']}], 'seat': '1'},
      {'bid': [{'price': 0.5, 'adm': '<div>test content 2</div>', 'auid': 903536, 'h': 600, 'w': 300, 'cur': 'EUR', 'mediaType': 'banner'}], 'seat': '1'},
      {'bid': [{'price': 0.15, 'adm': '<div>test content 3</div>', 'auid': 903535, 'h': 90, 'w': 728, 'cur': 'EUR', 'mediaType': 'banner'}], 'seat': '1'},
      {'bid': [{'price': 0, 'auid': 903537, 'h': 250, 'w': 300, 'cur': 'EUR'}], 'seat': '1'},
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
          'bidId': '659423fff799cb',
          'bidderRequestId': '5f2009617a7c0a',
          'auctionId': '1cbd2feafe5e8b',
        }
      ];
      const request = spec.buildRequests(bidRequests);
      const expectedResponse = [
        {
          'requestId': '659423fff799cb',
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
          'bidId': '659423fff799cb',
          'bidderRequestId': '5f2009617a7c0a',
          'auctionId': '1cbd2feafe5e8b',
        }
      ];
      const getConfigStub = sinon.stub(config, 'getConfig').returns('PLN');
      const request = spec.buildRequests(bidRequests);
      const expectedResponse = [
        {
          'requestId': '659423fff799cb',
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
        {'bid': [{'price': 1.15, 'adm': '<div>test content 1</div>', 'auid': 903535, 'h': 250, 'w': 300, 'cur': 'EUR', 'mediaType': 'banner', 'advertiserDomains': ['some_domain.com']}], 'seat': '1'},
        {'bid': [{'price': 0.5, 'adm': '<div>test content 2</div>', 'auid': 903536, 'h': 600, 'w': 300, 'cur': 'EUR', 'mediaType': 'banner'}], 'seat': '1'},
        {'bid': [{'price': 0.15, 'adm': '<div>test content 3</div>', 'auid': 903535, 'h': 90, 'w': 728, 'cur': 'EUR', 'mediaType': 'banner'}], 'seat': '1'},
        {'bid': [{'price': 0.15, 'adm': '<div>test content 4</div>', 'auid': 903535, 'h': 600, 'w': 300, 'cur': 'EUR', 'mediaType': 'banner'}], 'seat': '1'},
        {'bid': [{'price': 0.5, 'adm': '<div>test content 5</div>', 'auid': 903536, 'h': 600, 'w': 350, 'cur': 'EUR', 'mediaType': 'banner'}], 'seat': '1'},
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
        {'bid': [{'price': 1.15, 'adm': '<div>test content 1</div>', 'auid': 903535, 'h': 250, 'w': 300, 'cur': 'EUR', 'mediaType': 'banner'}], 'seat': '1'},
        {'bid': [{'price': 0.5, 'adm': '<div>test content 2</div>', 'auid': 903535, 'h': 250, 'w': 300, 'cur': 'EUR', 'mediaType': 'banner'}], 'seat': '1'},
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
        {'bid': [{'price': 0.5, 'adm': '<VAST/>', 'auid': 903537, 'w': 400, 'h': 300, 'cur': 'EUR', 'mediaType': 'video'}], 'seat': '1'},
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
              'playerSize': [400, 300],
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

    it('should get right ext data in bid response', function () {
      const bidRequests = [
        {
          'bidder': 'visx',
          'params': {
            'uid': '903535'
          },
          'adUnitCode': 'adunit-code-1',
          'sizes': [[300, 250], [300, 600]],
          'bidId': '659423fff799cb',
          'bidderRequestId': '5f2009617a7c0a',
          'auctionId': '1cbd2feafe5e8b',
        }
      ];
      const request = spec.buildRequests(bidRequests);
      const pendingUrl = 'https://t.visx.net/track/pending/123123123';
      const winUrl = 'https://t.visx.net/track/win/53245341';
      const expectedResponse = [
        {
          'requestId': '659423fff799cb',
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
          'ext': {
            'events': {
              'pending': pendingUrl,
              'win': winUrl
            }
          }
        }
      ];
      const serverResponse = Object.assign({}, responses[0]);
      serverResponse.bid = [Object.assign({}, {ext: {
        prebid: {
          events: {
            'pending': pendingUrl,
            'win': winUrl
          }
        }
      }}, serverResponse.bid[0])];
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
      const data = { timeout: 3000, bidId: '23423', params: { uid: 1 } };
      spec.onTimeout(data);
      expect(utils.triggerPixel.calledOnceWith('https://t.visx.net/track/bid_timeout?data=' + JSON.stringify(data))).to.equal(true);
    });
  });
});
