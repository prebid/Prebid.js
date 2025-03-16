import { expect } from 'chai';
import { spec, SSMAS_CODE, SSMAS_ENDPOINT, SSMAS_REQUEST_METHOD } from 'modules/ssmasBidAdapter.js';
import {newBidder} from 'src/adapters/bidderFactory.js';
import * as utils from 'src/utils.js';

describe('ssmasBidAdapter', function () {
  const bid = {
    bidder: SSMAS_CODE,
    adUnitCode: 'adunit-code',
    sizes: [[300, 250]],
    bidId: '30b31c1838de1e',
    bidderRequestId: '22edbae2733bf6',
    auctionId: '1d1a030790a475',
    params: {
      placementId: '1'
    }
  };

  const bidderRequest = {
    'bidderCode': SSMAS_CODE,
    'auctionId': 'd912faa2-174f-4636-b755-7396a0a964d8',
    'bidderRequestId': '109db5a5f5c6788',
    'bids': [
      bid
    ],
    'auctionStart': 1684799653734,
    'timeout': 20000,
    'metrics': {},
    'ortb2': {
      'site': {
        'domain': 'localhost:9999',
        'publisher': {
          'domain': 'localhost:9999'
        },
        'page': 'http://localhost:9999/integrationExamples/noadserver/basic_noadserver.html',
        'ref': 'http://localhost:9999/integrationExamples/noadserver/'
      },
      'device': {
        'w': 1536,
        'h': 711,
        'dnt': 0,
        'ua': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/113.0',
        'language': 'es'
      }
    },
    'start': 1684799653737
  };

  describe('Build Requests', () => {
    it('Check bid request', function () {
      const request = spec.buildRequests([bid], bidderRequest);
      expect(request[0].method).to.equal(SSMAS_REQUEST_METHOD);
      expect(request[0].url).to.equal(SSMAS_ENDPOINT);
    });
  });

  describe('register adapter functions', () => {
    const adapter = newBidder(spec);
    it('is registered', () => {
      expect(adapter.callBids).to.exist.and.to.be.a('function');
    });
  });

  describe('isBidRequestValid', function () {
    it('validate bid request building', function () {
      expect(spec.isBidRequestValid(bid)).to.be.true;
    });

    it('test bad bid request', function () {
      // empty bid
      expect(spec.isBidRequestValid({bidId: '', params: {}})).to.be.false;

      // empty bidId
      bid.bidId = '';
      expect(spec.isBidRequestValid(bid)).to.be.false;

      // empty placementId
      bid.bidId = '1231';
      bid.params.placementId = '';
      expect(spec.isBidRequestValid(bid)).to.be.false;
    });

    it('check bid request bidder is Sem Seo & Mas', function() {
      const invalidBid = {
        ...bid, bidder: 'invalidBidder'
      };
      expect(spec.isBidRequestValid(invalidBid)).to.be.false;
    });
  });

  describe('interpretResponse', function () {
    let bidOrtbResponse = {
      'id': 'aa02e2fe-56d9-4713-88f9-d8672ceae8ab',
      'seatbid': [
        {
          'bid': [
            {
              'id': '0001',
              'impid': '3919400af0b73e8',
              'price': 7.01,
              'adid': null,
              'nurl': null,
              'adm': '<a href=\"https://ssmas.com/es\" target=\"blank\"><img src=\"https://source.unsplash.com/featured/300x202\"/></a><style>body{overflow:hidden;}</style>',
              'adomain': [
                'ssmas.com'
              ],
              'iurl': null,
              'cid': null,
              'crid': '3547894',
              'attr': [],
              'api': 0,
              'protocol': 0,
              'dealid': null,
              'h': 600,
              'w': 300,
              'cat': null,
              'ext': null,
              'builder': {
                'id': '0001',
                'adid': null,
                'impid': '3919400af0b73e8',
                'adomainList': [
                  'ssmas.com'
                ],
                'attrList': []
              },
              'adomainList': [
                'ssmas.com'
              ],
              'attrList': []
            }
          ],
          'seat': null,
          'group': 0
        }
      ],
      'bidid': '408731cc-c018-4976-bfc6-89f9c61e97a0',
      'cur': 'EUR',
      'nbr': -1
    };
    let bidResponse = {
      'mediaType': 'banner',
      'ad': '<a href=\"https://ssmas.com/es\" target=\"blank\"><img src=\"https://source.unsplash.com/featured/300x202\"/></a><style>body{overflow:hidden;}</style>',
      'requestId': '37c658fe8ba57b',
      'seatBidId': '0001',
      'cpm': 10,
      'currency': 'EUR',
      'width': 300,
      'height': 250,
      'dealId': null,
      'creative_id': '3547894',
      'creativeId': '3547894',
      'ttl': 30,
      'netRevenue': true,
      'meta': {
        'advertiserDomains': [
          'ssmas.com'
        ]
      }
    };
    let bidRequest = {
      'imp': [
        {
          'ext': {
            'tid': '937db9c3-c22d-4454-b786-fcad76a349e5',
            'data': {
              'pbadslot': 'test-div'
            }
          },
          'id': '3919400af0b73e8',
          'banner': {
            'topframe': 1,
            'format': [
              {
                'w': 300,
                'h': 600
              }
            ]
          }
        },
        {
          'ext': {
            'tid': '0c0d3d1b-0ad0-4786-896d-24c15fc6531d',
            'data': {
              'pbadslot': 'test-div2'
            }
          },
          'id': '3919400af0b73e8',
          'banner': {
            'topframe': 1,
            'format': [
              {
                'w': 300,
                'h': 600
              }
            ]
          }
        }
      ],
      'site': {
        'domain': 'localhost:9999',
        'publisher': {
          'domain': 'localhost:9999'
        },
        'page': 'http://localhost:9999/integrationExamples/noadserver/basic_noadserver.html',
        'ref': 'http://localhost:9999/integrationExamples/noadserver/',
        'id': 1,
        'ext': {
          'placementId': 13144370
        }
      },
      'device': {
        'w': 1536,
        'h': 711,
        'dnt': 0,
        'ua': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/113.0',
        'language': 'es'
      },
      'id': '8cc2f4b0-084d-4f40-acfa-5bec2023b1ab',
      'test': 0,
      'tmax': 20000,
      'source': {
        'tid': '8cc2f4b0-084d-4f40-acfa-5bec2023b1ab'
      }
    }
  });

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
      expect(utils.triggerPixel.called).to.equal(false);
    });
  });
});
