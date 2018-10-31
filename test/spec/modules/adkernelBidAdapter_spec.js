import {expect} from 'chai';
import {spec} from 'modules/adkernelBidAdapter';
import * as utils from 'src/utils';

describe('Adkernel adapter', function () {
  const bid1_zone1 = {
      bidder: 'adkernel',
      bidId: 'Bid_01',
      params: {zoneId: 1, host: 'rtb.adkernel.com'},
      adUnitCode: 'ad-unit-1',
      sizes: [[300, 250], [300, 200]]
    }, bid2_zone2 = {
      bidder: 'adkernel',
      bidId: 'Bid_02',
      params: {zoneId: 2, host: 'rtb.adkernel.com'},
      adUnitCode: 'ad-unit-2',
      sizes: [728, 90]
    }, bid3_host2 = {
      bidder: 'adkernel',
      bidId: 'Bid_02',
      params: {zoneId: 1, host: 'rtb-private.adkernel.com'},
      adUnitCode: 'ad-unit-2',
      sizes: [[728, 90]]
    }, bid_without_zone = {
      bidder: 'adkernel',
      bidId: 'Bid_W',
      params: {host: 'rtb-private.adkernel.com'},
      adUnitCode: 'ad-unit-1',
      sizes: [[728, 90]]
    }, bid_without_host = {
      bidder: 'adkernel',
      bidId: 'Bid_W',
      params: {zoneId: 1},
      adUnitCode: 'ad-unit-1',
      sizes: [[728, 90]]
    }, bid_with_wrong_zoneId = {
      bidder: 'adkernel',
      bidId: 'Bid_02',
      params: {zoneId: 'wrong id', host: 'rtb.adkernel.com'},
      adUnitCode: 'ad-unit-2',
      sizes: [[728, 90]]
    }, bid_video = {
      bidder: 'adkernel',
      transactionId: '866394b8-5d37-4d49-803e-f1bdb595f73e',
      bidId: 'Bid_Video',
      bidderRequestId: '18b2a61ea5d9a7',
      auctionId: 'de45acf1-9109-4e52-8013-f2b7cf5f6766',
      sizes: [[640, 480]],
      params: {
        zoneId: 1,
        host: 'rtb.adkernel.com'
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
          nurl: 'https://rtb.com/win?i=ZjKoPYSFI3Y_0',
          adm: '<!-- admarkup here -->',
          w: 300,
          h: 250
        }]
      }],
      cur: 'USD',
      ext: {
        adk_usersync: ['http://adk.sync.com/sync']
      }
    }, bidResponse2 = {
      id: 'bid2',
      seatbid: [{
        bid: [{
          id: '2',
          impid: 'Bid_02',
          crid: '100_002',
          price: 1.31,
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
          nurl: 'https://rtb.com/win?i=sZSYq5zYMxo_0&f=nurl',
          cid: '16855'
        }]
      }],
      cur: 'USD'
    }, usersyncOnlyResponse = {
      id: 'nobid1',
      ext: {
        adk_usersync: ['http://adk.sync.com/sync']
      }
    };

  function buildBidderRequest(url = 'https://example.com/index.html', params = {}) {
    return Object.assign({}, params, {refererInfo: {referer: url, reachedTop: true}})
  }
  const DEFAULT_BIDDER_REQUEST = buildBidderRequest();
  function buildRequest(bidRequests, bidderRequest = DEFAULT_BIDDER_REQUEST, dnt = true) {
    let dntmock = sinon.stub(utils, 'getDNT').callsFake(() => dnt);
    let pbRequests = spec.buildRequests(bidRequests, bidderRequest);
    dntmock.restore();
    let rtbRequests = pbRequests.map(r => JSON.parse(r.data.r));
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
        buildBidderRequest('http://example.com/index.html',
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

  describe('requests routing', function () {
    it('should issue a request for each host', function () {
      let [pbRequests, _] = buildRequest([bid1_zone1, bid3_host2]);
      expect(pbRequests).to.have.length(2);
      expect(pbRequests[0].url).to.have.string(`//${bid1_zone1.params.host}/`);
      expect(pbRequests[1].url).to.have.string(`//${bid3_host2.params.host}/`);
    });

    it('should issue a request for each zone', function () {
      let [pbRequests, _] = buildRequest([bid1_zone1, bid2_zone2]);
      expect(pbRequests).to.have.length(2);
      expect(pbRequests[0].data.zone).to.be.equal(bid1_zone1.params.zoneId);
      expect(pbRequests[1].data.zone).to.be.equal(bid2_zone2.params.zoneId);
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
      let syncs = spec.getUserSyncs({iframeEnabled: false}, [{body: bidResponse1}]);
      expect(syncs).to.have.length(0);
      syncs = spec.getUserSyncs({iframeEnabled: true}, [{body: bidResponse1}]);
      expect(syncs).to.have.length(1);
      expect(syncs[0]).to.have.property('type', 'iframe');
      expect(syncs[0]).to.have.property('url', 'http://adk.sync.com/sync');
    });
  });
});
