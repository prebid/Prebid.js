import {expect} from 'chai';
import {spec} from 'modules/feedadBidAdapter';
import {BANNER, NATIVE, VIDEO} from '../../../src/mediaTypes';
import {server} from 'test/mocks/xhr';

const CODE = 'feedad';

describe('FeedAdAdapter', function () {
  describe('Public API', function () {
    it('should have the FeedAd bidder code', function () {
      expect(spec.code).to.equal(CODE);
    });
    it('should only support video and banner ads', function () {
      expect(spec.supportedMediaTypes).to.be.a('array');
      expect(spec.supportedMediaTypes).to.include(BANNER);
      expect(spec.supportedMediaTypes).to.include(VIDEO);
      expect(spec.supportedMediaTypes).not.to.include(NATIVE);
    });
    it('should export the BidderSpec functions', function () {
      expect(spec.isBidRequestValid).to.be.a('function');
      expect(spec.buildRequests).to.be.a('function');
      expect(spec.interpretResponse).to.be.a('function');
      expect(spec.onTimeout).to.be.a('function');
      expect(spec.onBidWon).to.be.a('function');
    });
  });

  describe('isBidRequestValid', function () {
    it('should detect missing params', function () {
      let result = spec.isBidRequestValid({
        bidder: 'feedad',
        sizes: []
      });
      expect(result).to.equal(false);
    });
    it('should detect missing client token', function () {
      let result = spec.isBidRequestValid({
        bidder: 'feedad',
        sizes: [],
        params: {placementId: 'placement'}
      });
      expect(result).to.equal(false);
    });
    it('should detect zero length client token', function () {
      let result = spec.isBidRequestValid({
        bidder: 'feedad',
        sizes: [],
        params: {clientToken: '', placementId: 'placement'}
      });
      expect(result).to.equal(false);
    });
    it('should detect missing placement id', function () {
      let result = spec.isBidRequestValid({
        bidder: 'feedad',
        sizes: [],
        params: {clientToken: 'clientToken'}
      });
      expect(result).to.equal(false);
    });
    it('should detect zero length placement id', function () {
      let result = spec.isBidRequestValid({
        bidder: 'feedad',
        sizes: [],
        params: {clientToken: 'clientToken', placementId: ''}
      });
      expect(result).to.equal(false);
    });
    it('should detect too long placement id', function () {
      var placementId = '';
      for (var i = 0; i < 300; i++) {
        placementId += 'a';
      }
      let result = spec.isBidRequestValid({
        bidder: 'feedad',
        sizes: [],
        params: {clientToken: 'clientToken', placementId}
      });
      expect(result).to.equal(false);
    });
    it('should detect invalid placement id', function () {
      [
        'placement id with spaces',
        'some|id',
        'PLACEMENTID',
        'placeme:ntId'
      ].forEach(id => {
        let result = spec.isBidRequestValid({
          bidder: 'feedad',
          sizes: [],
          params: {clientToken: 'clientToken', placementId: id}
        });
        expect(result).to.equal(false);
      });
    });
    it('should accept valid parameters', function () {
      let result = spec.isBidRequestValid({
        bidder: 'feedad',
        sizes: [],
        params: {clientToken: 'clientToken', placementId: 'placement-id'}
      });
      expect(result).to.equal(true);
    });
  });

  describe('buildRequests', function () {
    const bidderRequest = {
      refererInfo: {
        referer: 'the referer'
      },
      some: 'thing'
    };

    it('should accept empty lists', function () {
      let result = spec.buildRequests([], bidderRequest);
      expect(result).to.be.empty;
    });
    it('should filter native media types', function () {
      let bid = {
        code: 'feedad',
        mediaTypes: {
          native: {
            sizes: [[300, 250], [300, 600]],
          }
        },
        params: {clientToken: 'clientToken', placementId: 'placement-id'}
      };
      let result = spec.buildRequests([bid], bidderRequest);
      expect(result).to.be.empty;
    });
    it('should filter video media types without outstream context', function () {
      let bid = {
        code: 'feedad',
        mediaTypes: {
          video: {
            context: 'instream'
          }
        },
        params: {clientToken: 'clientToken', placementId: 'placement-id'}
      };
      let result = spec.buildRequests([bid], bidderRequest);
      expect(result).to.be.empty;
    });
    it('should pass through outstream video media', function () {
      let bid = {
        code: 'feedad',
        mediaTypes: {
          video: {
            context: 'outstream'
          }
        },
        params: {clientToken: 'clientToken', placementId: 'placement-id'}
      };
      let result = spec.buildRequests([bid], bidderRequest);
      expect(result.data.bids).to.be.lengthOf(1);
      expect(result.data.bids[0]).to.deep.equal(bid);
    });
    it('should pass through banner media', function () {
      let bid = {
        code: 'feedad',
        mediaTypes: {
          banner: {
            sizes: [[320, 250]]
          }
        },
        params: {clientToken: 'clientToken', placementId: 'placement-id'}
      };
      let result = spec.buildRequests([bid], bidderRequest);
      expect(result.data.bids).to.be.lengthOf(1);
      expect(result.data.bids[0]).to.deep.equal(bid);
    });
    it('should detect empty media types', function () {
      let bid = {
        code: 'feedad',
        mediaTypes: {
          banner: undefined,
          video: undefined,
          native: undefined
        },
        params: {clientToken: 'clientToken', placementId: 'placement-id'}
      };
      let result = spec.buildRequests([bid], bidderRequest);
      expect(result).to.be.empty;
    });
    it('should use POST', function () {
      let bid = {
        code: 'feedad',
        mediaTypes: {
          banner: {
            sizes: [[320, 250]]
          }
        },
        params: {clientToken: 'clientToken', placementId: 'placement-id'}
      };
      let result = spec.buildRequests([bid], bidderRequest);
      expect(result.method).to.equal('POST');
    });
    it('should use the correct URL', function () {
      let bid = {
        code: 'feedad',
        mediaTypes: {
          banner: {
            sizes: [[320, 250]]
          }
        },
        params: {clientToken: 'clientToken', placementId: 'placement-id'}
      };
      let result = spec.buildRequests([bid], bidderRequest);
      expect(result.url).to.equal('https://api.feedad.com/1/prebid/web/bids');
    });
    it('should specify the content type explicitly', function () {
      let bid = {
        code: 'feedad',
        mediaTypes: {
          banner: {
            sizes: [[320, 250]]
          }
        },
        params: {clientToken: 'clientToken', placementId: 'placement-id'}
      };
      let result = spec.buildRequests([bid], bidderRequest);
      expect(result.options).to.deep.equal({
        contentType: 'application/json'
      })
    });
    it('should include the bidder request', function () {
      let bid = {
        code: 'feedad',
        mediaTypes: {
          banner: {
            sizes: [[320, 250]]
          }
        },
        params: {clientToken: 'clientToken', placementId: 'placement-id'}
      };
      let result = spec.buildRequests([bid, bid, bid], bidderRequest);
      expect(result.data).to.deep.include(bidderRequest);
    });
    it('should detect missing bidder request parameter', function () {
      let bid = {
        code: 'feedad',
        mediaTypes: {
          banner: {
            sizes: [[320, 250]]
          }
        },
        params: {clientToken: 'clientToken', placementId: 'placement-id'}
      };
      let result = spec.buildRequests([bid, bid, bid]);
      expect(result).to.be.empty;
    });
  });

  describe('interpretResponse', function () {
    const body = [{
      foo: 'bar',
      sub: {
        obj: 5
      }
    }, {
      bar: 'foo'
    }];

    it('should convert string bodies to JSON', function () {
      let result = spec.interpretResponse({body: JSON.stringify(body)});
      expect(result).to.deep.equal(body);
    });

    it('should pass through body objects', function () {
      let result = spec.interpretResponse({body});
      expect(result).to.deep.equal(body);
    });
  });

  describe('event tracking calls', function () {
    const clientToken = 'clientToken';
    const placementId = 'placement id';
    const auctionId = 'the auction id';
    const bidId = 'the bid id';
    const transactionId = 'the transaction id';
    const referer = 'the referer';
    const bidderRequest = {
      refererInfo: {
        referer: referer
      },
      some: 'thing'
    };
    const bid = {
      'bidder': 'feedad',
      'params': {
        'clientToken': 'fupp',
        'placementId': 'prebid-test'
      },
      'crumbs': {
        'pubcid': '6254a85f-bded-489a-9736-83c45d45ef1d'
      },
      'mediaTypes': {
        'banner': {
          'sizes': [
            [
              300,
              250
            ]
          ]
        }
      },
      'adUnitCode': 'div-gpt-ad-1460505748561-0',
      'transactionId': transactionId,
      'sizes': [
        [
          300,
          250
        ]
      ],
      'bidId': bidId,
      'bidderRequestId': '10739fe6fe2127',
      'auctionId': '5ac67dff-d971-4b56-84a3-345a87a1f786',
      'src': 'client',
      'bidRequestsCount': 1
    };
    const timeoutData = {
      'bidId': bidId,
      'bidder': 'feedad',
      'adUnitCode': 'div-gpt-ad-1460505748561-0',
      'auctionId': auctionId,
      'params': [
        {
          'clientToken': clientToken,
          'placementId': placementId
        }
      ],
      'timeout': 3000
    };
    const bidWonData = {
      'bidderCode': 'feedad',
      'width': 300,
      'height': 250,
      'statusMessage': 'Bid available',
      'adId': '3a4529aa05114d',
      'requestId': bidId,
      'mediaType': 'banner',
      'source': 'client',
      'cpm': 0.5,
      'ad': 'ad content',
      'ttl': 60,
      'creativeId': 'feedad-21-0',
      'netRevenue': true,
      'currency': 'EUR',
      'auctionId': auctionId,
      'responseTimestamp': 1558365914596,
      'requestTimestamp': 1558365914506,
      'bidder': 'feedad',
      'adUnitCode': 'div-gpt-ad-1460505748561-0',
      'timeToRespond': 90,
      'pbLg': '0.50',
      'pbMg': '0.50',
      'pbHg': '0.50',
      'pbAg': '0.50',
      'pbDg': '0.50',
      'pbCg': '',
      'size': '300x250',
      'adserverTargeting': {
        'hb_bidder': 'feedad',
        'hb_adid': '3a4529aa05114d',
        'hb_pb': '0.50',
        'hb_size': '300x250',
        'hb_source': 'client',
        'hb_format': 'banner'
      },
      'status': 'rendered',
      'params': [
        {
          'clientToken': clientToken,
          'placementId': placementId
        }
      ]
    };
    const cases = [
      ['onTimeout', timeoutData, 'prebid_bidTimeout'],
      ['onBidWon', bidWonData, 'prebid_bidWon'],
    ];

    cases.forEach(([name, data, eventKlass]) => {
      let subject = spec[name];
      describe(name + ' handler', function () {
        it('should do nothing on empty data', function () {
          subject(undefined);
          subject(null);
          expect(server.requests.length).to.equal(0);
        });

        it('should do nothing when bid metadata is not set', function () {
          subject(data);
          expect(server.requests.length).to.equal(0);
        });

        it('should send tracking params when correct metadata was set', function () {
          spec.buildRequests([bid], bidderRequest);
          let expectedData = {
            app_hybrid: false,
            client_token: clientToken,
            placement_id: placementId,
            klass: eventKlass,
            prebid_auction_id: auctionId,
            prebid_bid_id: bidId,
            prebid_transaction_id: transactionId,
            referer,
            sdk_version: '1.0.0'
          };
          subject(data);
          expect(server.requests.length).to.equal(1);
          let call = server.requests[0];
          expect(call.url).to.equal('https://api.feedad.com/1/prebid/web/events');
          expect(JSON.parse(call.requestBody)).to.deep.equal(expectedData);
          expect(call.method).to.equal('POST');
          expect(call.requestHeaders).to.include({'Content-Type': 'application/json;charset=utf-8'});
        })
      });
    });
  });
});
