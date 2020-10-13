import {expect} from 'chai';
import {spec} from 'modules/adkernelBidAdapter.js';
import * as utils from 'src/utils.js';
import {NATIVE, BANNER, VIDEO} from 'src/mediaTypes';
import {config} from 'src/config.js';

describe('Adkernel adapter', function () {
  const bid1_zone1 = {
      bidder: 'adkernel',
      params: {zoneId: 1, host: 'rtb.adkernel.com'},
      adUnitCode: 'ad-unit-1',
      bidId: 'Bid_01',
      bidderRequestId: 'req-001',
      auctionId: 'auc-001',
      mediaTypes: {
        banner: {
          sizes: [[300, 250], [300, 200]]
        }
      }
    }, bid2_zone2 = {
      bidder: 'adkernel',
      params: {zoneId: 2, host: 'rtb.adkernel.com'},
      adUnitCode: 'ad-unit-2',
      bidId: 'Bid_02',
      bidderRequestId: 'req-001',
      auctionId: 'auc-001',
      mediaTypes: {
        banner: {
          sizes: [[728, 90]]
        }
      }
    }, bid3_host2 = {
      bidder: 'adkernel',
      params: {zoneId: 1, host: 'rtb-private.adkernel.com'},
      adUnitCode: 'ad-unit-2',
      bidId: 'Bid_02',
      bidderRequestId: 'req-001',
      auctionId: 'auc-001',
      mediaTypes: {
        banner: {
          sizes: [[728, 90]]
        }
      }
    }, bid_without_zone = {
      bidder: 'adkernel',
      params: {host: 'rtb-private.adkernel.com'},
      adUnitCode: 'ad-unit-1',
      bidId: 'Bid_W',
      bidderRequestId: 'req-002',
      auctionId: 'auc-002',
      mediaTypes: {
        banner: {
          sizes: [[728, 90]]
        }
      }
    }, bid_without_host = {
      bidder: 'adkernel',
      params: {zoneId: 1},
      adUnitCode: 'ad-unit-1',
      bidId: 'Bid_W',
      bidderRequestId: 'req-002',
      auctionId: 'auc-002',
      mediaTypes: {
        banner: {
          sizes: [[728, 90]]
        }
      }
    }, bid_with_wrong_zoneId = {
      bidder: 'adkernel',
      params: {zoneId: 'wrong id', host: 'rtb.adkernel.com'},
      adUnitCode: 'ad-unit-2',
      bidId: 'Bid_02',
      bidderRequestId: 'req-002',
      auctionId: 'auc-002',
      mediaTypes: {
        banner: {
          sizes: [[728, 90]]
        }
      }
    }, bid_video = {
      bidder: 'adkernel',
      transactionId: '866394b8-5d37-4d49-803e-f1bdb595f73e',
      bidId: 'Bid_Video',
      bidderRequestId: '18b2a61ea5d9a7',
      auctionId: 'de45acf1-9109-4e52-8013-f2b7cf5f6766',
      params: {
        zoneId: 1,
        host: 'rtb.adkernel.com',
        video: {api: [1, 2]}
      },
      mediaTypes: {
        video: {
          context: 'instream',
          playerSize: [[640, 480]]
        }
      },
      adUnitCode: 'ad-unit-1'
    }, bid_multiformat = {
      bidder: 'adkernel',
      params: {zoneId: 1, host: 'rtb.adkernel.com'},
      mediaTypes: {
        banner: {sizes: [[300, 250], [300, 200]]},
        video: {context: 'instream', playerSize: [[640, 480]]}
      },
      adUnitCode: 'ad-unit-1',
      transactionId: 'f82c64b8-c602-42a4-9791-4a268f6559ed',
      bidId: 'Bid_01',
      bidderRequestId: 'req-001',
      auctionId: 'auc-001'
    }, bid_native = {
      bidder: 'adkernel',
      params: {zoneId: 1, host: 'rtb.adkernel.com'},
      mediaTypes: {
        native: {
          title: {
            required: true,
            len: 80
          },
          body: {
            required: true
          },
          body2: {
            required: true
          },
          icon: {
            required: true,
            aspect_ratios: [{min_width: 50, min_height: 50}]
          },
          image: {
            required: true,
            sizes: [300, 200]
          },
          clickUrl: {
            required: true
          },
          rating: {
            required: false
          },
          price: {
            required: false
          },
          privacyLink: {
            required: false
          },
          cta: {
            required: false
          },
          sponsoredBy: {
            required: false
          },
          displayUrl: {
            required: false
          }
        }
      },
      adUnitCode: 'ad-unit-1',
      transactionId: 'f82c64b8-c602-42a4-9791-4a268f6559ed',
      bidId: 'Bid_01',
      bidderRequestId: 'req-001',
      auctionId: 'auc-001'
    };

  const bidResponse1 = {
      id: 'bid1',
      seatbid: [{
        bid: [{
          id: '1',
          impid: 'Bid_01',
          crid: '100_001',
          price: 3.01,
          nurl: 'https://rtb.com/win?i=ZjKoPYSFI3Y_0',
          adm: '<!-- admarkup here -->',
          w: 300,
          h: 250,
          dealid: 'deal'
        }]
      }],
      cur: 'USD',
      ext: {
        adk_usersync: [{type: 1, url: 'https://adk.sync.com/sync'}]
      }
    }, videoBidResponse = {
      id: '47ce4badcf7482',
      seatbid: [{
        bid: [{
          id: 'sZSYq5zYMxo_0',
          impid: 'Bid_Video',
          crid: '100_003',
          price: 0.00145,
          adid: '158801',
          nurl: 'https://rtb.com/win?i=sZSYq5zYMxo_0&f=nurl',
          cid: '16855'
        }]
      }],
      cur: 'USD'
    }, usersyncOnlyResponse = {
      id: 'nobid1',
      ext: {
        adk_usersync: [{type: 2, url: 'https://adk.sync.com/sync'}]
      }
    }, nativeResponse = {
      id: '56fbc713-b737-4651-9050-13376aed9818',
      seatbid: [{
        bid: [{
          id: 'someid_01',
          impid: 'Bid_01',
          price: 2.25,
          adid: '4',
          adm: JSON.stringify({
            native: {
              assets: [
                {id: 0, title: {text: 'Title'}},
                {id: 3, data: {value: 'Description'}},
                {id: 4, data: {value: 'Additional description'}},
                {id: 1, img: {url: 'http://rtb.com/thumbnail?i=pTuOlf5KHUo_0&imgt=icon', w: 50, h: 50}},
                {id: 2, img: {url: 'http://rtb.com/thumbnail?i=pTuOlf5KHUo_0', w: 300, h: 200}},
                {id: 5, data: {value: 'Sponsor.com'}},
                {id: 14, data: {value: 'displayurl.com'}}
              ],
              link: {url: 'http://rtb.com/click?i=pTuOlf5KHUo_0'},
              imptrackers: ['http://rtb.com/win?i=pTuOlf5KHUo_0&f=imp']
            }
          }),
          adomain: ['displayurl.com'],
          cid: '1',
          crid: '4'
        }]
      }],
      bidid: 'pTuOlf5KHUo',
      cur: 'USD'
    };

  var sandbox;
  beforeEach(function () {
    sandbox = sinon.sandbox.create();
  });

  afterEach(function () {
    sandbox.restore();
  });

  function buildBidderRequest(url = 'https://example.com/index.html', params = {}) {
    return Object.assign({}, params, {refererInfo: {referer: url, reachedTop: true}, timeout: 3000, bidderCode: 'adkernel'});
  }
  const DEFAULT_BIDDER_REQUEST = buildBidderRequest();

  function buildRequest(bidRequests, bidderRequest = DEFAULT_BIDDER_REQUEST, dnt = true) {
    let dntmock = sandbox.stub(utils, 'getDNT').callsFake(() => dnt);
    let pbRequests = spec.buildRequests(bidRequests, bidderRequest);
    dntmock.restore();
    let rtbRequests = pbRequests.map(r => JSON.parse(r.data));
    return [pbRequests, rtbRequests];
  }

  describe('input parameters validation', function () {
    it('empty request shouldn\'t generate exception', function () {
      expect(spec.isBidRequestValid({
        bidderCode: 'adkernel'
      })).to.be.equal(false);
    });

    it('request without zone shouldn\'t issue a request', function () {
      expect(spec.isBidRequestValid(bid_without_zone)).to.be.equal(false);
    });

    it('request without host shouldn\'t issue a request', function () {
      expect(spec.isBidRequestValid(bid_without_host)).to.be.equal(false);
    });

    it('empty request shouldn\'t generate exception', function () {
      expect(spec.isBidRequestValid(bid_with_wrong_zoneId)).to.be.equal(false);
    });

    it('valid native requests should pass', () => {
      expect(spec.isBidRequestValid(bid_native)).to.be.equal(true);
    })
  });

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
      expect(bidRequest.imp[0].banner.format).to.be.eql([{w: 300, h: 250}, {w: 300, h: 200}]);
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
      expect(bidRequest.device).to.have.property('ipv6', 'caller');
      expect(bidRequest.device).to.have.property('ua', 'caller');
      expect(bidRequest.device).to.have.property('dnt', 1);
    });

    it('shouldn\'t contain gdpr nor ccpa information for default request', function () {
      let [_, bidRequests] = buildRequest([bid1_zone1]);
      expect(bidRequests[0]).to.not.have.property('regs');
      expect(bidRequests[0]).to.not.have.property('user');
    });

    it('should contain gdpr-related information if consent is configured', function () {
      let [_, bidRequests] = buildRequest([bid1_zone1],
        buildBidderRequest('https://example.com/index.html',
          {gdprConsent: {gdprApplies: true, consentString: 'test-consent-string', vendorData: {}}, uspConsent: '1YNN'}));
      let bidRequest = bidRequests[0];
      expect(bidRequest).to.have.property('regs');
      expect(bidRequest.regs.ext).to.be.eql({'gdpr': 1, 'us_privacy': '1YNN'});
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

    it('should have openrtb video impression parameters', function() {
      expect(bidRequests[0].imp[0].video).to.have.property('api');
      expect(bidRequests[0].imp[0].video.api).to.be.eql([1, 2]);
    });
  });

  describe('multiformat request building', function () {
    let _, bidRequests;
    before(function () {
      [_, bidRequests] = buildRequest([bid_multiformat]);
    });
    it('should contain single request', function () {
      expect(bidRequests).to.have.length(1);
      expect(bidRequests[0].imp).to.have.length(1);
    });
    it('should contain banner-only impression', function () {
      expect(bidRequests[0].imp).to.have.length(1);
      expect(bidRequests[0].imp[0]).to.have.property('banner');
      expect(bidRequests[0].imp[0]).to.not.have.property('video');
    });
  });

  describe('requests routing', function () {
    it('should issue a request for each host', function () {
      let [pbRequests, _] = buildRequest([bid1_zone1, bid3_host2]);
      expect(pbRequests).to.have.length(2);
      expect(pbRequests[0].url).to.have.string(`https://${bid1_zone1.params.host}/`);
      expect(pbRequests[1].url).to.have.string(`https://${bid3_host2.params.host}/`);
    });

    it('should issue a request for each zone', function () {
      let [pbRequests, _] = buildRequest([bid1_zone1, bid2_zone2]);
      expect(pbRequests).to.have.length(2);
      expect(pbRequests[0].url).to.include(`zone=${bid1_zone1.params.zoneId}`);
      expect(pbRequests[1].url).to.include(`zone=${bid2_zone2.params.zoneId}`);
    });
  });

  describe('User sync request signals', function() {
    it('should respect syncEnabled option', function() {
      config.setConfig({
        userSync: {
          syncEnabled: false,
          filterSettings: {
            all: {
              bidders: '*',
              filter: 'include'
            }
          }
        }
      });
      let [pbRequests, bidRequests] = buildRequest([bid1_zone1]);
      expect(bidRequests).to.have.length(1);
      expect(bidRequests[0]).to.not.have.property('ext');
    });

    it('should respect all config node', function() {
      config.setConfig({
        userSync: {
          syncEnabled: true,
          filterSettings: {
            all: {
              bidders: '*',
              filter: 'include'
            }
          }
        }
      });
      let [pbRequests, bidRequests] = buildRequest([bid1_zone1]);
      expect(bidRequests).to.have.length(1);
      expect(bidRequests[0].ext).to.have.property('adk_usersync', 1);
    });

    it('should respect exclude filter', function() {
      config.setConfig({
        userSync: {
          syncEnabled: true,
          filterSettings: {
            image: {
              bidders: '*',
              filter: 'include'
            },
            iframe: {
              bidders: ['adkernel'],
              filter: 'exclude'
            }
          }
        }
      });
      let [pbRequests, bidRequests] = buildRequest([bid1_zone1]);
      expect(bidRequests).to.have.length(1);
      expect(bidRequests[0].ext).to.have.property('adk_usersync', 2);
    });

    it('should respect total exclusion', function() {
      config.setConfig({
        userSync: {
          syncEnabled: true,
          filterSettings: {
            image: {
              bidders: ['adkernel'],
              filter: 'exclude'
            },
            iframe: {
              bidders: ['adkernel'],
              filter: 'exclude'
            }
          }
        }
      });
      let [pbRequests, bidRequests] = buildRequest([bid1_zone1]);
      expect(bidRequests).to.have.length(1);
      expect(bidRequests[0]).to.not.have.property('ext');
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
      expect(resp).to.have.property('currency');
      expect(resp).to.have.property('ttl');
      expect(resp).to.have.property('mediaType', BANNER);
      expect(resp).to.have.property('ad');
      expect(resp).to.have.property('dealId', 'deal');
      expect(resp.ad).to.have.string('<!-- admarkup here -->');
    });

    it('should return fully-initialized video bid-response', function () {
      let [pbRequests, _] = buildRequest([bid_video]);
      let resp = spec.interpretResponse({body: videoBidResponse}, pbRequests[0])[0];
      expect(resp).to.have.property('requestId', 'Bid_Video');
      expect(resp.mediaType).to.equal(VIDEO);
      expect(resp.cpm).to.equal(0.00145);
      expect(resp.vastUrl).to.equal('https://rtb.com/win?i=sZSYq5zYMxo_0&f=nurl');
      expect(resp.width).to.equal(640);
      expect(resp.height).to.equal(480);
    });

    it('should add nurl as pixel for banner response', function () {
      let [pbRequests, _] = buildRequest([bid1_zone1]);
      let resp = spec.interpretResponse({body: bidResponse1}, pbRequests[0])[0];
      let expectedNurl = bidResponse1.seatbid[0].bid[0].nurl + '&px=1';
      expect(resp.ad).to.have.string(expectedNurl);
    });

    it('should handle bidresponse with user-sync only', function () {
      let [pbRequests, _] = buildRequest([bid1_zone1]);
      let resp = spec.interpretResponse({body: usersyncOnlyResponse}, pbRequests[0]);
      expect(resp).to.have.length(0);
    });

    it('should perform usersync', function () {
      let syncs = spec.getUserSyncs({iframeEnabled: true, pixelEnabled: true}, []);
      expect(syncs).to.have.length(0);
      syncs = spec.getUserSyncs({iframeEnabled: false, pixelEnabled: false}, [{body: bidResponse1}]);
      expect(syncs).to.have.length(0);
      syncs = spec.getUserSyncs({iframeEnabled: true, pixelEnabled: true}, [{body: bidResponse1}]);
      expect(syncs).to.have.length(1);
      expect(syncs[0]).to.have.property('type', 'iframe');
      expect(syncs[0]).to.have.property('url', 'https://adk.sync.com/sync');
      syncs = spec.getUserSyncs({iframeEnabled: false, pixelEnabled: true}, [{body: usersyncOnlyResponse}]);
      expect(syncs).to.have.length(1);
      expect(syncs[0]).to.have.property('type', 'image');
      expect(syncs[0]).to.have.property('url', 'https://adk.sync.com/sync');
    });
  });

  describe('adapter configuration', () => {
    it('should have aliases', () => {
      expect(spec.aliases).to.have.lengthOf(6);
      expect(spec.aliases).to.include.members(['headbidding', 'adsolut', 'oftmediahb', 'audiencemedia', 'waardex_ak', 'roqoon']);
    });
  });

  describe('native support', () => {
    let _, bidRequests;
    before(function () {
      [_, bidRequests] = buildRequest([bid_native]);
    });

    it('native request building', () => {
      expect(bidRequests[0].imp).to.have.length(1);
      expect(bidRequests[0].imp[0]).to.have.property('native');
      expect(bidRequests[0].imp[0].native).to.have.property('request');
      let request = JSON.parse(bidRequests[0].imp[0].native.request);
      expect(request).to.have.property('ver', '1.1');
      expect(request.assets).to.have.length(10);
      expect(request.assets[0]).to.be.eql({id: 0, required: 1, title: {len: 80}});
      expect(request.assets[1]).to.be.eql({id: 3, required: 1, data: {type: 2}});
      expect(request.assets[2]).to.be.eql({id: 4, required: 1, data: {type: 10}});
      expect(request.assets[3]).to.be.eql({id: 1, required: 1, img: {wmin: 50, hmin: 50, type: 1}});
      expect(request.assets[4]).to.be.eql({id: 2, required: 1, img: {w: 300, h: 200, type: 3}});
      expect(request.assets[5]).to.be.eql({id: 11, required: 0, data: {type: 3}});
      expect(request.assets[6]).to.be.eql({id: 8, required: 0, data: {type: 6}});
      expect(request.assets[7]).to.be.eql({id: 10, required: 0, data: {type: 12}});
      expect(request.assets[8]).to.be.eql({id: 5, required: 0, data: {type: 1}});
      expect(request.assets[9]).to.be.eql({id: 14, required: 0, data: {type: 11}});
    });

    it('native response processing', () => {
      let [pbRequests, _] = buildRequest([bid_native]);
      let resp = spec.interpretResponse({body: nativeResponse}, pbRequests[0])[0];
      expect(resp).to.have.property('requestId', 'Bid_01');
      expect(resp).to.have.property('cpm', 2.25);
      expect(resp).to.have.property('currency', 'USD');
      expect(resp).to.have.property('mediaType', NATIVE);
      expect(resp).to.have.property('native');
      expect(resp.native).to.have.property('clickUrl', 'http://rtb.com/click?i=pTuOlf5KHUo_0');
      expect(resp.native.impressionTrackers).to.be.eql(['http://rtb.com/win?i=pTuOlf5KHUo_0&f=imp']);
      expect(resp.native).to.have.property('title', 'Title');
      expect(resp.native).to.have.property('body', 'Description');
      expect(resp.native).to.have.property('body2', 'Additional description');
      expect(resp.native.icon).to.be.eql({url: 'http://rtb.com/thumbnail?i=pTuOlf5KHUo_0&imgt=icon', width: 50, height: 50});
      expect(resp.native.image).to.be.eql({url: 'http://rtb.com/thumbnail?i=pTuOlf5KHUo_0', width: 300, height: 200});
      expect(resp.native).to.have.property('sponsoredBy', 'Sponsor.com');
      expect(resp.native).to.have.property('displayUrl', 'displayurl.com');
    });
  });
});
