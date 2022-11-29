import {expect} from 'chai';
import {spec} from 'modules/feedadBidAdapter.js';
import {BANNER, NATIVE, VIDEO} from '../../../src/mediaTypes.js';
import {server} from 'test/mocks/xhr.js';

const CODE = 'feedad';

describe('FeedAdAdapter', function () {
  describe('Public API', function () {
    it('should have the FeedAd bidder code', function () {
      expect(spec.code).to.equal(CODE);
    });
    it('should only support video and banner ads', function () {
      expect(spec.supportedMediaTypes).to.be.a('array');
      expect(spec.supportedMediaTypes).to.include(BANNER);
      expect(spec.supportedMediaTypes).not.to.include(VIDEO);
      expect(spec.supportedMediaTypes).not.to.include(NATIVE);
    });
    it('should export the BidderSpec functions', function () {
      expect(spec.isBidRequestValid).to.be.a('function');
      expect(spec.buildRequests).to.be.a('function');
      expect(spec.interpretResponse).to.be.a('function');
      expect(spec.onTimeout).to.be.a('function');
      expect(spec.onBidWon).to.be.a('function');
    });
    it('should export the TCF vendor ID', function () {
      expect(spec.gvlid).to.equal(781);
    })
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
        page: 'the referer'
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
    it('should pass through additional bid parameters', function () {
      let bid = {
        code: 'feedad',
        mediaTypes: {
          banner: {
            sizes: [[320, 250]]
          }
        },
        params: {clientToken: 'clientToken', placementId: 'placement-id', another: 'parameter', more: 'parameters'}
      };
      let result = spec.buildRequests([bid], bidderRequest);
      expect(result.data.bids).to.be.lengthOf(1);
      expect(result.data.bids[0].params.another).to.equal('parameter');
      expect(result.data.bids[0].params.more).to.equal('parameters');
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
    it('should not include GDPR data if the bidder request has none available', function () {
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
      expect(result.data.gdprApplies).to.be.undefined;
      expect(result.data.consentIabTcf).to.be.undefined;
    });
    it('should include GDPR data if the bidder requests contains it', function () {
      let bid = {
        code: 'feedad',
        mediaTypes: {
          banner: {
            sizes: [[320, 250]]
          }
        },
        params: {clientToken: 'clientToken', placementId: 'placement-id'}
      };
      let request = Object.assign({}, bidderRequest, {
        gdprConsent: {
          consentString: 'the consent string',
          gdprApplies: true
        }
      });
      let result = spec.buildRequests([bid], request);
      expect(result.data.gdprApplies).to.equal(request.gdprConsent.gdprApplies);
      expect(result.data.consentIabTcf).to.equal(request.gdprConsent.consentString);
    });
  });

  describe('interpretResponse', function () {
    it('should convert string bodies to JSON', function () {
      const body = [{
        ad: 'bar',
      }];
      let result = spec.interpretResponse({body: JSON.stringify(body)});
      expect(result).to.deep.equal(body);
    });

    it('should pass through object bodies', function () {
      const body = [{
        ad: 'bar',
      }];
      let result = spec.interpretResponse({body});
      expect(result).to.deep.equal(body);
    });

    it('should pass through only bodies with ad fields', function () {
      const bid1 = {
        ad: 'bar',
        other: 'field',
        some: 'thing'
      };
      const bid2 = {
        foo: 'bar'
      };
      const bid3 = {
        ad: 'ad html',
      };
      const body = [bid1, bid2, bid3];
      let result = spec.interpretResponse({body: JSON.stringify(body)});
      expect(result).to.deep.equal([bid1, bid3]);
    });

    it('should remove extension fields from bid responses', function () {
      const bid = {
        ext: {},
        ad: 'ad html',
        cpm: 100
      };
      const result = spec.interpretResponse({body: JSON.stringify([bid])});
      expect(result[0]).not.to.haveOwnProperty('ext');
    });

    it('should return an empty array if the response is not an array', function () {
      const bid = {};
      const result = spec.interpretResponse({body: JSON.stringify(bid)});
      expect(result).to.deep.equal([]);
    });
  });

  describe('getUserSyncs', function () {
    const pixelSync1 = {type: 'image', url: 'the pixel url 1'};
    const pixelSync2 = {type: 'image', url: 'the pixel url 2'};
    const iFrameSync1 = {type: 'iframe', url: 'the iFrame url 1'};
    const iFrameSync2 = {type: 'iframe', url: 'the iFrame url 2'};

    it('should pass through the syncs out of the extension fields of the server response', function () {
      const serverResponse = [{
        ext: {
          pixels: [pixelSync1, pixelSync2],
          iframes: [iFrameSync1, iFrameSync2],
        }
      }];
      const result = spec.getUserSyncs({iframeEnabled: true, pixelEnabled: true}, serverResponse)
      expect(result).to.deep.equal([
        pixelSync1,
        pixelSync2,
        iFrameSync1,
        iFrameSync2,
      ]);
    });

    it('should concat the syncs of all responses', function () {
      const serverResponse = [{
        ext: {
          pixels: [pixelSync1],
          iframes: [iFrameSync2],
        },
        ad: 'ad html',
        cpm: 100
      }, {
        ext: {
          iframes: [iFrameSync1],
        }
      }, {
        ext: {
          pixels: [pixelSync2],
        }
      }];
      const result = spec.getUserSyncs({iframeEnabled: true, pixelEnabled: true}, serverResponse);
      expect(result).to.deep.equal([
        pixelSync1,
        iFrameSync2,
        iFrameSync1,
        pixelSync2,
      ]);
    });

    it('should filter out duplicates', function () {
      const serverResponse = [{
        ext: {
          pixels: [pixelSync1, pixelSync1],
          iframes: [iFrameSync2, iFrameSync2],
        }
      }, {
        ext: {
          iframes: [iFrameSync2, iFrameSync2],
        }
      }];
      const result = spec.getUserSyncs({iframeEnabled: true, pixelEnabled: true}, serverResponse);
      expect(result).to.deep.equal([
        pixelSync1,
        iFrameSync2,
      ]);
    });

    it('should not include iFrame syncs if the option is disabled', function () {
      const serverResponse = [{
        ext: {
          pixels: [pixelSync1, pixelSync2],
          iframes: [iFrameSync1, iFrameSync2],
        }
      }];
      const result = spec.getUserSyncs({iframeEnabled: false, pixelEnabled: true}, serverResponse);
      expect(result).to.deep.equal([
        pixelSync1,
        pixelSync2,
      ]);
    });

    it('should not include pixel syncs if the option is disabled', function () {
      const serverResponse = [{
        ext: {
          pixels: [pixelSync1, pixelSync2],
          iframes: [iFrameSync1, iFrameSync2],
        }
      }];
      const result = spec.getUserSyncs({iframeEnabled: true, pixelEnabled: false}, serverResponse);
      expect(result).to.deep.equal([
        iFrameSync1,
        iFrameSync2,
      ]);
    });

    it('should not include any syncs if the sync options are disabled or missing', function () {
      const serverResponse = [{
        ext: {
          pixels: [pixelSync1, pixelSync2],
          iframes: [iFrameSync1, iFrameSync2],
        }
      }];
      const result = spec.getUserSyncs({iframeEnabled: false, pixelEnabled: false}, serverResponse);
      expect(result).to.deep.equal([]);
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
        page: referer
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
            sdk_version: '1.0.3'
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
