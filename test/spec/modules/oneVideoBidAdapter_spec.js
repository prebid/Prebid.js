import { expect } from 'chai';
import { spec } from 'modules/oneVideoBidAdapter.js';

describe('OneVideoBidAdapter', function () {
  let bidRequest;
  let bidderRequest = {
    'bidderCode': 'oneVideo',
    'auctionId': 'e158486f-8c7f-472f-94ce-b0cbfbb50ab4',
    'bidderRequestId': '1e498b84fffc39',
    'bids': bidRequest,
    'auctionStart': 1520001292880,
    'timeout': 3000,
    'start': 1520001292884,
    'doneCbCallCount': 0,
    'refererInfo': {
      'numIframes': 1,
      'reachedTop': true,
      'referer': 'test.com'
    }
  };
  let mockConfig;

  beforeEach(function () {
    bidRequest = {
      mediaTypes: {
        video: {
          context: 'instream',
          playerSize: [640, 480]
        }
      },
      bidder: 'oneVideo',
      sizes: [640, 480],
      bidId: '30b3efwfwe1e',
      adUnitCode: 'video1',
      params: {
        video: {
          playerWidth: 640,
          playerHeight: 480,
          mimes: ['video/mp4', 'application/javascript'],
          protocols: [2, 5],
          api: [2],
          position: 1,
          delivery: [2],
          playbackmethod: [1, 5],
          sid: 134,
          rewarded: 1,
          placement: 1,
          hp: 1,
          inventoryid: 123
        },
        site: {
          id: 1,
          page: 'https://news.yahoo.com/portfolios',
          referrer: 'http://www.yahoo.com'
        },
        pubId: 'brxd'
      }
    };
  });

  describe('spec.isBidRequestValid', function () {
    it('should return false when mediaTypes video OR banner not declared', function () {
      bidRequest.mediaTypes = {};
      expect(spec.isBidRequestValid(bidRequest)).to.equal(false);
    });

    it('should return true (skip validations) when e2etest = true', function () {
      bidRequest.params.video = {
        e2etest: true
      };
      expect(spec.isBidRequestValid(bidRequest)).to.equal(true);
    });

    it('should return true when mediaTypes.video has all mandatory params', function () {
      bidRequest.mediaTypes.video = {
        context: 'instream',
        playerSize: [640, 480],
        mimes: ['video/mp4', 'application/javascript'],
      }
      bidRequest.params.video = {};
      expect(spec.isBidRequestValid(bidRequest)).to.equal(true);
    });

    it('should return true when params.video has all override params instead of mediaTypes.video', function () {
      bidRequest.mediaTypes.video = {
        context: 'instream'
      };
      bidRequest.params.video = {
        playerWidth: 640,
        playerHeight: 480,
        mimes: ['video/mp4', 'application/javascript']
      };
      expect(spec.isBidRequestValid(bidRequest)).to.equal(true);
    });

    it('should return true when playerWidth & playerHeight are passed in params.video', function () {
      bidRequest.mediaTypes.video = {
        context: 'instream',
        mimes: ['video/mp4', 'application/javascript']
      };
      bidRequest.params.video = {
        playerWidth: 640,
        playerHeight: 480,
      };
      expect(spec.isBidRequestValid(bidRequest)).to.equal(true);
    });

    it('should return true when mimes is passed in params.video', function () {
      bidRequest.mediaTypes.video = {
        context: 'instream',
        playerSizes: [640, 480]
      };
      bidRequest.video = {
        mimes: ['video/mp4', 'application/javascript']
      };
      expect(spec.isBidRequestValid(bidRequest)).to.equal(true);
    });

    it('should return false when both mediaTypes.video and params.video Objects are missing', function () {
      bidRequest.mediaTypes = {};
      bidRequest.params = {
        pubId: 'brxd'
      };
      expect(spec.isBidRequestValid(bidRequest)).to.equal(false);
    });

    it('should return false when both mediaTypes.video and params.video are missing mimes and player size', function () {
      bidRequest.mediaTypes = {
        video: {
          context: 'instream'
        }
      };
      bidRequest.params = {
        pubId: 'brxd'
      };
      expect(spec.isBidRequestValid(bidRequest)).to.equal(false);
    });

    it('should return false when the "pubId" param is missing', function () {
      bidRequest.params = {
        video: {
          playerWidth: 480,
          playerHeight: 640,
          mimes: ['video/mp4', 'application/javascript'],
        }
      };
      expect(spec.isBidRequestValid(bidRequest)).to.equal(false);
    });

    it('should return true when the "pubId" param exists', function () {
      bidRequest.mediaTypes = {
        video: {
          playerSizes: [640, 480],
          mimes: ['video/mp4', 'application/javascript']
        },
        pubId: 'brxd'
      };
      expect(spec.isBidRequestValid(bidRequest)).to.equal(true);
    });

    it('should return false when no bid params are passed', function () {
      bidRequest.params = {};
      expect(spec.isBidRequestValid(bidRequest)).to.equal(false);
    });

    it('should return false when the mediaType is "banner" and display="undefined" (DAP 3P)', function () {
      bidRequest = {
        mediaTypes: {
          banner: {
            sizes: [640, 480]
          }
        }
      }
      expect(spec.isBidRequestValid(bidRequest)).to.equal(false);
    })

    it('should return true when the mediaType is "banner" and display=1 (DAP 3P)', function () {
      bidRequest = {
        mediaTypes: {
          banner: {
            sizes: [640, 480]
          }
        },
        bidder: 'oneVideo',
        sizes: [640, 480],
        bidId: '30b3efwfwe1e',
        adUnitCode: 'video1',
        params: {
          video: {
            playerWidth: 640,
            playerHeight: 480,
            mimes: ['video/mp4', 'application/javascript'],
            protocols: [2, 5],
            api: [2],
            position: 1,
            delivery: [2],
            playbackmethod: [1, 5],
            sid: 134,
            rewarded: 1,
            placement: 1,
            inventoryid: 123,
            display: 1
          },
          site: {
            id: 1,
            page: 'https://news.yahoo.com/portfolios',
            referrer: 'http://www.yahoo.com'
          },
          pubId: 'brxd'
        }
      };
      expect(spec.isBidRequestValid(bidRequest)).to.equal(true);
    })

    it('should return false when the mediaType is "video" and context="outstream" and display=1 (DAP 3P)', function () {
      bidRequest = {
        mediaTypes: {
          video: {
            context: 'outstream',
            playerSize: [640, 480]
          }
        },
        params: {
          video: {
            display: 1
          }
        }
      }
      expect(spec.isBidRequestValid(bidRequest)).to.equal(false);
    })

    it('should return true for Multi-Format AdUnits, when the mediaTypes are both "banner" and "video" (Multi-Format Support)', function () {
      bidRequest = {
        mediaTypes: {
          banner: {
            sizes: [640, 480]
          },
          video: {
            context: 'outstream',
            playerSize: [640, 480],
            mimes: ['video/mp4', 'application/javascript']
          }
        },
        bidder: 'oneVideo',
        sizes: [640, 480],
        bidId: '30b3efwfwe1e',
        adUnitCode: 'video1',
        params: {
          video: {
            protocols: [2, 5],
            api: [2]
          },
          site: {
            page: 'https://news.yahoo.com/portfolios',
            referrer: 'http://www.yahoo.com'
          },
          pubId: 'brxd'
        }
      };
      expect(spec.isBidRequestValid(bidRequest)).to.equal(true);
    })
  });

  describe('spec.buildRequests', function () {
    it('should create a POST request for every bid', function () {
      const requests = spec.buildRequests([bidRequest], bidderRequest);
      expect(requests[0].method).to.equal('POST');
      expect(requests[0].url).to.equal(spec.ENDPOINT + bidRequest.params.pubId);
    });

    it('should attach the bid request object', function () {
      const requests = spec.buildRequests([bidRequest], bidderRequest);
      expect(requests[0].bidRequest).to.equal(bidRequest);
    });

    it('should attach request data', function () {
      const requests = spec.buildRequests([bidRequest], bidderRequest);
      const data = requests[0].data;
      const [width, height] = bidRequest.sizes;
      const placement = bidRequest.params.video.placement;
      const rewarded = bidRequest.params.video.rewarded;
      const inventoryid = bidRequest.params.video.inventoryid;
      const VERSION = '3.1.2';
      expect(data.imp[0].video.w).to.equal(width);
      expect(data.imp[0].video.h).to.equal(height);
      expect(data.imp[0].bidfloor).to.equal(bidRequest.params.bidfloor);
      expect(data.imp[0].ext.rewarded).to.equal(rewarded);
      expect(data.imp[0].video.placement).to.equal(placement);
      expect(data.imp[0].ext.inventoryid).to.equal(inventoryid);
      expect(data.imp[0].ext.prebidver).to.equal('$prebid.version$');
      expect(data.imp[0].ext.adapterver).to.equal(VERSION);
    });

    it('must parse bid size from a nested array', function () {
      const width = 640;
      const height = 480;
      bidRequest.sizes = [
        [width, height]
      ];
      const requests = spec.buildRequests([bidRequest], bidderRequest);
      const data = requests[0].data;
      expect(data.imp[0].video.w).to.equal(width);
      expect(data.imp[0].video.h).to.equal(height);
    });

    it('should set pubId to HBExchange when bid.params.video.e2etest = true', function () {
      bidRequest.params.video.e2etest = true;
      const requests = spec.buildRequests([bidRequest], bidderRequest);
      expect(requests[0].method).to.equal('POST');
      expect(requests[0].url).to.equal(spec.E2ETESTENDPOINT + 'HBExchange');
    });

    it('should attach End 2 End test data', function () {
      bidRequest.params.video.e2etest = true;
      const requests = spec.buildRequests([bidRequest], bidderRequest);
      const data = requests[0].data;
      expect(data.imp[0].bidfloor).to.not.exist;
      expect(data.imp[0].video.w).to.equal(300);
      expect(data.imp[0].video.h).to.equal(250);
      expect(data.imp[0].video.mimes).to.eql(['video/mp4', 'application/javascript']);
      expect(data.imp[0].video.api).to.eql([2]);
      expect(data.site.page).to.equal('https://verizonmedia.com');
      expect(data.site.ref).to.equal('https://verizonmedia.com');
      expect(data.tmax).to.equal(1000);
    });

    it('it should create new schain and send it if video.params.sid exists', function () {
      const requests = spec.buildRequests([bidRequest], bidderRequest);
      const data = requests[0].data;
      const schain = data.source.ext.schain;
      expect(schain.nodes.length).to.equal(1);
      expect(schain.nodes[0].sid).to.equal(bidRequest.params.video.sid);
      expect(schain.nodes[0].rid).to.equal(data.id);
    })

    it('should send Global or Bidder specific schain if sid is not passed in video.params.sid', function () {
      bidRequest.params.video.sid = null;
      const globalSchain = {
        ver: '1.0',
        complete: 1,
        nodes: [{
          asi: 'some-platform.com',
          sid: '111111',
          rid: bidRequest.id,
          hp: 1
        }]
      };
      bidRequest.schain = globalSchain;
      const requests = spec.buildRequests([bidRequest], bidderRequest);
      const data = requests[0].data;
      const schain = data.source.ext.schain;
      expect(schain.nodes.length).to.equal(1);
      expect(schain).to.equal(globalSchain);
    });

    it('should ignore Global or Bidder specific schain if video.params.sid exists and send new schain', function () {
      const globalSchain = {
        ver: '1.0',
        complete: 1,
        nodes: [{
          asi: 'some-platform.com',
          sid: '111111',
          rid: bidRequest.id,
          hp: 1
        }]
      };
      bidRequest.schain = globalSchain;
      const requests = spec.buildRequests([bidRequest], bidderRequest);
      const data = requests[0].data;
      const schain = data.source.ext.schain;
      expect(schain.nodes.length).to.equal(1);
      expect(schain.complete).to.equal(1);
      expect(schain.nodes[0].sid).to.equal(bidRequest.params.video.sid);
      expect(schain.nodes[0].rid).to.equal(data.id);
    })

    it('should append hp to new schain created by sid if video.params.hp is passed', function () {
      const requests = spec.buildRequests([bidRequest], bidderRequest);
      const data = requests[0].data;
      const schain = data.source.ext.schain;
      expect(schain.nodes[0].hp).to.equal(bidRequest.params.video.hp);
    })
    it('should not accept key values pairs if custom is Undefined ', function () {
      bidRequest.params.video.custom = null;
      const requests = spec.buildRequests([bidRequest], bidderRequest);
      const data = requests[0].data;
      expect(data.imp[0].ext.custom).to.be.undefined;
    });
    it('should not accept key values pairs if custom is Array ', function () {
      bidRequest.params.video.custom = [];
      const requests = spec.buildRequests([bidRequest], bidderRequest);
      const data = requests[0].data;
      expect(data.imp[0].ext.custom).to.be.undefined;
    });
    it('should not accept key values pairs if custom is Number ', function () {
      bidRequest.params.video.custom = 123456;
      const requests = spec.buildRequests([bidRequest], bidderRequest);
      const data = requests[0].data;
      expect(data.imp[0].ext.custom).to.be.undefined;
    });
    it('should not accept key values pairs if custom is String ', function () {
      bidRequest.params.video.custom = 'keyValuePairs';
      const requests = spec.buildRequests([bidRequest], bidderRequest);
      const data = requests[0].data;
      expect(data.imp[0].ext.custom).to.be.undefined;
    });
    it('should not accept key values pairs if custom is Boolean ', function () {
      bidRequest.params.video.custom = true;
      const requests = spec.buildRequests([bidRequest], bidderRequest);
      const data = requests[0].data;
      expect(data.imp[0].ext.custom).to.be.undefined;
    });
    it('should accept key values pairs if custom is Object ', function () {
      bidRequest.params.video.custom = {};
      const requests = spec.buildRequests([bidRequest], bidderRequest);
      const data = requests[0].data;
      expect(data.imp[0].ext.custom).to.be.a('object');
    });
    it('should accept key values pairs if custom is Object ', function () {
      bidRequest.params.video.custom = {
        key1: 'value1',
        key2: 'value2',
        key3: 4444444,
        key4: false,
        key5: {
          nested: 'object'
        },
        key6: ['string', 2, true, null],
        key7: null,
        key8: undefined
      };
      const requests = spec.buildRequests([bidRequest], bidderRequest);
      const custom = requests[0].data.imp[0].ext.custom;
      expect(custom['key1']).to.be.a('string');
      expect(custom['key2']).to.be.a('string');
      expect(custom['key3']).to.be.a('number');
      expect(custom['key4']).to.not.exist;
      expect(custom['key5']).to.not.exist;
      expect(custom['key6']).to.not.exist;
      expect(custom['key7']).to.not.exist;
      expect(custom['key8']).to.not.exist;
    });

    describe('content object validations', function () {
      it('should not accept content object if value is Undefined ', function () {
        bidRequest.params.video.content = null;
        const requests = spec.buildRequests([bidRequest], bidderRequest);
        const data = requests[0].data;
        expect(data.site.content).to.be.undefined;
      });
      it('should not accept content object if value is is Array ', function () {
        bidRequest.params.video.content = [];
        const requests = spec.buildRequests([bidRequest], bidderRequest);
        const data = requests[0].data;
        expect(data.site.content).to.be.undefined;
      });
      it('should not accept content object if value is Number ', function () {
        bidRequest.params.video.content = 123456;
        const requests = spec.buildRequests([bidRequest], bidderRequest);
        const data = requests[0].data;
        expect(data.site.content).to.be.undefined;
      });
      it('should not accept content object if value is String ', function () {
        bidRequest.params.video.content = 'keyValuePairs';
        const requests = spec.buildRequests([bidRequest], bidderRequest);
        const data = requests[0].data;
        expect(data.site.content).to.be.undefined;
      });
      it('should not accept content object if value is Boolean ', function () {
        bidRequest.params.video.content = true;
        const requests = spec.buildRequests([bidRequest], bidderRequest);
        const data = requests[0].data;
        expect(data.site.content).to.be.undefined;
      });
      it('should accept content object if value is Object ', function () {
        bidRequest.params.video.content = {};
        const requests = spec.buildRequests([bidRequest], bidderRequest);
        const data = requests[0].data;
        expect(data.site.content).to.be.a('object');
      });

      it('should not append unsupported content object keys', function () {
        bidRequest.params.video.content = {
          fake: 'news',
          unreal: 'param',
          counterfit: 'data'
        };
        const requests = spec.buildRequests([bidRequest], bidderRequest);
        const data = requests[0].data;
        expect(data.site.content).to.be.empty;
      });

      it('should not append content string parameters if value is not string ', function () {
        bidRequest.params.video.content = {
          id: 1234,
          title: ['Title'],
          series: ['Series'],
          season: ['Season'],
          genre: ['Genre'],
          contentrating: {1: 'C-Rating'},
          language: {1: 'EN'}
        };
        const requests = spec.buildRequests([bidRequest], bidderRequest);
        const data = requests[0].data;
        expect(data.site.content).to.be.a('object');
        expect(data.site.content).to.be.empty
      });
      it('should not append content Number parameters if value is not Number ', function () {
        bidRequest.params.video.content = {
          episode: '1',
          context: 'context',
          livestream: {0: 'stream'},
          len: [360],
          prodq: [1],
        };
        const requests = spec.buildRequests([bidRequest], bidderRequest);
        const data = requests[0].data;
        expect(data.site.content).to.be.a('object');
        expect(data.site.content).to.be.empty
      });
      it('should not append content Array parameters if value is not Array ', function () {
        bidRequest.params.video.content = {
          cat: 'categories',
        };
        const requests = spec.buildRequests([bidRequest], bidderRequest);
        const data = requests[0].data;
        expect(data.site.content).to.be.a('object');
        expect(data.site.content).to.be.empty
      });
      it('should not append content ext if value is not Object ', function () {
        bidRequest.params.video.content = {
          ext: 'content.ext',
        };
        const requests = spec.buildRequests([bidRequest], bidderRequest);
        const data = requests[0].data;
        expect(data.site.content).to.be.a('object');
        expect(data.site.content).to.be.empty
      });
      it('should append supported parameters if value match validations ', function () {
        bidRequest.params.video.content = {
          id: '1234',
          title: 'Title',
          series: 'Series',
          season: 'Season',
          cat: [
            'IAB1'
          ],
          genre: 'Genre',
          contentrating: 'C-Rating',
          language: 'EN',
          episode: 1,
          prodq: 1,
          context: 1,
          livestream: 0,
          len: 360,
          ext: {}
        };
        const requests = spec.buildRequests([bidRequest], bidderRequest);
        const data = requests[0].data;
        expect(data.site.content).to.deep.equal(bidRequest.params.video.content);
      });
    });
  });

  describe('price floor module validations', function () {
    beforeEach(function () {
      bidRequest.getFloor = (floorObj) => {
        return {
          floor: bidRequest.floors.values[floorObj.mediaType + '|640x480'],
          currency: floorObj.currency,
          mediaType: floorObj.mediaType
        }
      }
    });

    it('should get bidfloor from getFloor method', function () {
      bidRequest.params.cur = 'EUR';
      bidRequest.floors = {
        currency: 'EUR',
        values: {
          'video|640x480': 5.55
        }
      };
      const requests = spec.buildRequests([bidRequest], bidderRequest);
      const data = requests[0].data;
      expect(data.cur).is.a('string');
      expect(data.cur).to.equal('EUR');
      expect(data.imp[0].bidfloor).is.a('number');
      expect(data.imp[0].bidfloor).to.equal(5.55);
    });

    it('should use adUnit/module currency & floor instead of bid.params.bidfloor', function () {
      bidRequest.params.cur = 'EUR';
      bidRequest.params.bidfloor = 3.33;
      bidRequest.floors = {
        currency: 'EUR',
        values: {
          'video|640x480': 5.55
        }
      };
      const requests = spec.buildRequests([bidRequest], bidderRequest);
      const data = requests[0].data;
      expect(data.cur).is.a('string');
      expect(data.cur).to.equal('EUR');
      expect(data.imp[0].bidfloor).is.a('number');
      expect(data.imp[0].bidfloor).to.equal(5.55);
    });

    it('should load banner instead of video floor when DAP is active bid.params.video.display = 1', function () {
      bidRequest.params.video.display = 1;
      bidRequest.params.cur = 'EUR';
      bidRequest.mediaTypes = {
        banner: {
          sizes: [
            [640, 480]
          ]
        }
      };
      bidRequest.floors = {
        currency: 'EUR',
        values: {
          'banner|640x480': 2.22,
          'video|640x480': 9.99
        }
      };
      const requests = spec.buildRequests([bidRequest], bidderRequest);
      const data = requests[0].data;
      expect(data.cur).is.a('string');
      expect(data.cur).to.equal('EUR');
      expect(data.imp[0].bidfloor).is.a('number');
      expect(data.imp[0].bidfloor).to.equal(2.22);
    })

    it('should load video floor when multi-format adUnit is present', function () {
      bidRequest.params.cur = 'EUR';
      bidRequest.mediaTypes.banner = {
        sizes: [
          [640, 480]
        ]
      };
      bidRequest.floors = {
        currency: 'EUR',
        values: {
          'banner|640x480': 2.22,
          'video|640x480': 9.99
        }
      };
      const requests = spec.buildRequests([bidRequest], bidderRequest);
      const data = requests[0].data;
      expect(data.cur).is.a('string');
      expect(data.cur).to.equal('EUR');
      expect(data.imp[0].bidfloor).is.a('number');
      expect(data.imp[0].bidfloor).to.equal(9.99);
    })
  })

  describe('spec.interpretResponse', function () {
    it('should return no bids if the response is not valid', function () {
      const bidResponse = spec.interpretResponse({
        body: null
      }, {
        bidRequest
      });
      expect(bidResponse.length).to.equal(0);
    });

    it('should return no bids if the response "nurl" and "adm" are missing', function () {
      const serverResponse = {
        seatbid: [{
          bid: [{
            price: 6.01
          }]
        }]
      };
      const bidResponse = spec.interpretResponse({
        body: serverResponse
      }, {
        bidRequest
      });
      expect(bidResponse.length).to.equal(0);
    });

    it('should return no bids if the response "price" is missing', function () {
      const serverResponse = {
        seatbid: [{
          bid: [{
            adm: '<VAST></VAST>'
          }]
        }]
      };
      const bidResponse = spec.interpretResponse({
        body: serverResponse
      }, {
        bidRequest
      });
      expect(bidResponse.length).to.equal(0);
    });

    it('should return a valid video bid response with just "adm"', function () {
      const serverResponse = {
        seatbid: [{
          bid: [{
            id: 1,
            adid: 123,
            crid: 2,
            price: 6.01,
            adm: '<VAST></VAST>',
            adomain: [
              'verizonmedia.com'
            ],
          }]
        }],
        cur: 'USD'
      };
      const bidResponse = spec.interpretResponse({
        body: serverResponse
      }, {
        bidRequest
      });
      let o = {
        requestId: bidRequest.bidId,
        bidderCode: spec.code,
        cpm: serverResponse.seatbid[0].bid[0].price,
        creativeId: serverResponse.seatbid[0].bid[0].crid,
        vastXml: serverResponse.seatbid[0].bid[0].adm,
        width: 640,
        height: 480,
        mediaType: 'video',
        currency: 'USD',
        ttl: 300,
        netRevenue: true,
        adUnitCode: bidRequest.adUnitCode,
        renderer: (bidRequest.mediaTypes.video.context === 'outstream') ? newRenderer(bidRequest, bidResponse) : undefined,
        meta: {
          advertiserDomains: ['verizonmedia.com']
        }
      };
      expect(bidResponse).to.deep.equal(o);
    });
    // @abrowning14 check that banner DAP response is appended to o.ad + mediaType: 'banner'
    it('should return a valid DAP banner bid-response', function () {
      bidRequest = {
        mediaTypes: {
          banner: {
            sizes: [640, 480]
          }
        },
        params: {
          video: {
            display: 1
          }
        }
      }
      const serverResponse = {
        seatbid: [{
          bid: [{
            id: 1,
            adid: 123,
            crid: 2,
            price: 6.01,
            adm: '<div>DAP UNIT HERE</div>'
          }]
        }],
        cur: 'USD'
      };
      const bidResponse = spec.interpretResponse({
        body: serverResponse
      }, {
        bidRequest
      });
      expect(bidResponse.ad).to.equal('<div>DAP UNIT HERE</div>');
      expect(bidResponse.mediaType).to.equal('banner');
      expect(bidResponse.renderer).to.be.undefined;
    });

    it('should default ttl to 300', function () {
      const serverResponse = {seatbid: [{bid: [{id: 1, adid: 123, crid: 2, price: 6.01, adm: '<VAST></VAST>'}]}], cur: 'USD'};
      const bidResponse = spec.interpretResponse({ body: serverResponse }, { bidRequest });
      expect(bidResponse.ttl).to.equal(300);
    });
    it('should not allow ttl above 3601, default to 300', function () {
      bidRequest.params.video.ttl = 3601;
      const serverResponse = {seatbid: [{bid: [{id: 1, adid: 123, crid: 2, price: 6.01, adm: '<VAST></VAST>'}]}], cur: 'USD'};
      const bidResponse = spec.interpretResponse({ body: serverResponse }, { bidRequest });
      expect(bidResponse.ttl).to.equal(300);
    });
    it('should not allow ttl below 1, default to 300', function () {
      bidRequest.params.video.ttl = 0;
      const serverResponse = {seatbid: [{bid: [{id: 1, adid: 123, crid: 2, price: 6.01, adm: '<VAST></VAST>'}]}], cur: 'USD'};
      const bidResponse = spec.interpretResponse({ body: serverResponse }, { bidRequest });
      expect(bidResponse.ttl).to.equal(300);
    });
    it('should use custom ttl if under 3600', function () {
      bidRequest.params.video.ttl = 1000;
      const serverResponse = {seatbid: [{bid: [{id: 1, adid: 123, crid: 2, price: 6.01, adm: '<VAST></VAST>'}]}], cur: 'USD'};
      const bidResponse = spec.interpretResponse({ body: serverResponse }, { bidRequest });
      expect(bidResponse.ttl).to.equal(1000);
    });
  });

  describe('when GDPR and uspConsent applies', function () {
    beforeEach(function () {
      bidderRequest = {
        'gdprConsent': {
          'consentString': 'test-gdpr-consent-string',
          'gdprApplies': true
        },
        'uspConsent': '1YN-',
        'bidderCode': 'oneVideo',
        'auctionId': 'e158486f-8c7f-472f-94ce-b0cbfbb50ab4',
        'bidderRequestId': '1e498b84fffc39',
        'bids': bidRequest,
        'auctionStart': 1520001292880,
        'timeout': 3000,
        'start': 1520001292884,
        'doneCbCallCount': 0,
        'refererInfo': {
          'numIframes': 1,
          'reachedTop': true,
          'referer': 'test.com'
        }
      };

      mockConfig = {
        consentManagement: {
          gdpr: {
            cmpApi: 'iab',
            timeout: 3000,
            allowAuctionWithoutConsent: 'cancel'
          },
          usp: {
            cmpApi: 'iab',
            timeout: 1000,
            allowAuctionWithoutConsent: 'cancel'
          }
        }
      };
    });

    it('should send a signal to specify that GDPR applies to this request', function () {
      const request = spec.buildRequests([bidRequest], bidderRequest);
      expect(request[0].data.regs.ext.gdpr).to.equal(1);
    });

    it('should send the consent string', function () {
      const request = spec.buildRequests([bidRequest], bidderRequest);
      expect(request[0].data.user.ext.consent).to.equal(bidderRequest.gdprConsent.consentString);
    });

    it('should send the uspConsent string', function () {
      const request = spec.buildRequests([bidRequest], bidderRequest);
      expect(request[0].data.regs.ext.us_privacy).to.equal(bidderRequest.uspConsent);
    });

    it('should send the uspConsent and GDPR ', function () {
      const request = spec.buildRequests([bidRequest], bidderRequest);
      expect(request[0].data.regs.ext.gdpr).to.equal(1);
      expect(request[0].data.regs.ext.us_privacy).to.equal(bidderRequest.uspConsent);
    });
  });

  describe('should send banner object', function () {
    it('should send banner object when display is 1 and context="instream" (DAP O&O)', function () {
      bidRequest = {
        mediaTypes: {
          video: {
            context: 'instream',
            playerSize: [640, 480]
          }
        },
        bidder: 'oneVideo',
        sizes: [640, 480],
        bidId: '30b3efwfwe1e',
        adUnitCode: 'video1',
        params: {
          video: {
            playerWidth: 640,
            playerHeight: 480,
            mimes: ['video/mp4', 'application/javascript'],
            protocols: [2, 5],
            api: [2],
            position: 1,
            delivery: [2],
            playbackmethod: [1, 5],
            placement: 1,
            inventoryid: 123,
            sid: 134,
            display: 1,
            minduration: 10,
            maxduration: 30
          },
          site: {
            id: 1,
            page: 'https://www.yahoo.com/',
            referrer: 'http://www.yahoo.com'
          },
          pubId: 'OneMDisplay'
        }
      };
      const requests = spec.buildRequests([bidRequest], bidderRequest);
      const data = requests[0].data;
      const width = bidRequest.params.video.playerWidth;
      const height = bidRequest.params.video.playerHeight;
      const position = bidRequest.params.video.position;
      expect(spec.isBidRequestValid(bidRequest)).to.equal(true);
      expect(data.imp[0].banner.w).to.equal(width);
      expect(data.imp[0].banner.h).to.equal(height);
      expect(data.imp[0].banner.pos).to.equal(position);
      expect(data.imp[0].ext.inventoryid).to.equal(bidRequest.params.video.inventoryid);
      expect(data.imp[0].banner.mimes).to.equal(bidRequest.params.video.mimes);
      expect(data.imp[0].banner.placement).to.equal(bidRequest.params.video.placement);
      expect(data.imp[0].banner.ext.minduration).to.equal(bidRequest.params.video.minduration);
      expect(data.imp[0].banner.ext.maxduration).to.equal(bidRequest.params.video.maxduration);
      expect(data.site.id).to.equal(bidRequest.params.site.id);
    });
    it('should send video object when display is other than 1 (VAST for All)', function () {
      bidRequest = {
        mediaTypes: {
          video: {
            context: 'instream',
            playerSize: [640, 480]
          }
        },
        bidder: 'oneVideo',
        sizes: [640, 480],
        bidId: '30b3efwfwe1e',
        adUnitCode: 'video1',
        params: {
          video: {
            playerWidth: 640,
            playerHeight: 480,
            mimes: ['video/mp4', 'application/javascript'],
            protocols: [2, 5],
            api: [2],
            position: 1,
            delivery: [2],
            playbackmethod: [1, 5],
            placement: 123,
            sid: 134,
            display: 12
          },
          site: {
            id: 1,
            page: 'https://www.yahoo.com/',
            referrer: 'http://www.yahoo.com'
          },
          pubId: 'OneMDisplay'
        }
      };
      const requests = spec.buildRequests([bidRequest], bidderRequest);
      const data = requests[0].data;
      const width = bidRequest.params.video.playerWidth;
      const height = bidRequest.params.video.playerHeight;
      const position = bidRequest.params.video.position;
      expect(spec.isBidRequestValid(bidRequest)).to.equal(true);
      expect(data.imp[0].video.w).to.equal(width);
      expect(data.imp[0].video.h).to.equal(height);
      expect(data.imp[0].video.pos).to.equal(position);
      expect(data.imp[0].video.mimes).to.equal(bidRequest.params.video.mimes);
    });
    it('should send video object when display is not passed (VAST for All)', function () {
      bidRequest = {
        mediaTypes: {
          video: {
            context: 'instream',
            playerSize: [640, 480]
          }
        },
        bidder: 'oneVideo',
        sizes: [640, 480],
        bidId: '30b3efwfwe1e',
        adUnitCode: 'video1',
        params: {
          video: {
            playerWidth: 640,
            playerHeight: 480,
            mimes: ['video/mp4', 'application/javascript'],
            protocols: [2, 5],
            api: [2],
            position: 1,
            delivery: [2],
            playbackmethod: [1, 5],
            placement: 123,
            sid: 134,
            minduration: 10,
            maxduration: 30
          },
          site: {
            id: 1,
            page: 'https://www.yahoo.com/',
            referrer: 'http://www.yahoo.com'
          },
          pubId: 'OneMDisplay'
        }
      };
      const requests = spec.buildRequests([bidRequest], bidderRequest);
      const data = requests[0].data;
      const width = bidRequest.params.video.playerWidth;
      const height = bidRequest.params.video.playerHeight;
      const position = bidRequest.params.video.position;
      expect(spec.isBidRequestValid(bidRequest)).to.equal(true);
      expect(data.imp[0].video.w).to.equal(width);
      expect(data.imp[0].video.h).to.equal(height);
      expect(data.imp[0].video.pos).to.equal(position);
      expect(data.imp[0].video.mimes).to.equal(bidRequest.params.video.mimes);
      expect(data.imp[0].video.protocols).to.equal(bidRequest.params.video.protocols);
      expect(data.imp[0].video.linearity).to.equal(1);
      expect(data.imp[0].video.maxduration).to.equal(bidRequest.params.video.maxduration);
      expect(data.imp[0].video.minduration).to.equal(bidRequest.params.video.minduration);
    });
    describe('getUserSyncs', function () {
      const GDPR_CONSENT_STRING = 'GDPR_CONSENT_STRING';

      it('should get correct user sync when iframeEnabled', function () {
        let pixel = spec.getUserSyncs({
          pixelEnabled: true
        }, {}, {
          gdprApplies: true,
          consentString: GDPR_CONSENT_STRING
        })
        expect(pixel[1].type).to.equal('image');
        expect(pixel[1].url).to.equal('https://sync-tm.everesttech.net/upi/pid/m7y5t93k?gdpr=1&gdpr_consent=' + GDPR_CONSENT_STRING + '&redir=https%3A%2F%2Fpixel.advertising.com%2Fups%2F55986%2Fsync%3Fuid%3D%24%7BUSER_ID%7D%26_origin%3D0&gdpr=1&gdpr_consent=' + encodeURI(GDPR_CONSENT_STRING));
      });

      it('should default to gdprApplies=0 when consentData is undefined', function () {
        let pixel = spec.getUserSyncs({
          pixelEnabled: true
        }, {}, undefined);
        expect(pixel[1].url).to.equal('https://sync-tm.everesttech.net/upi/pid/m7y5t93k?gdpr=0&gdpr_consent=&redir=https%3A%2F%2Fpixel.advertising.com%2Fups%2F55986%2Fsync%3Fuid%3D%24%7BUSER_ID%7D%26_origin%3D0&gdpr=0&gdpr_consent=');
      });
    });

    describe('verify sync pixels', function () {
      let pixel = spec.getUserSyncs({
        pixelEnabled: true
      }, {}, undefined);
      it('should be UPS sync pixel for DBM', function () {
        expect(pixel[0].url).to.equal('https://pixel.advertising.com/ups/57304/sync?gdpr=&gdpr_consent=&_origin=0&redir=true')
      });

      it('should be TTD sync pixel', function () {
        expect(pixel[2].url).to.equal('https://match.adsrvr.org/track/cmf/generic?ttd_pid=adaptv&ttd_tpi=1')
      });
    })
  });
});
