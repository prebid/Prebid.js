import {expect} from 'chai';
import {spec} from 'modules/rtbdemandadkBidAdapter';
import * as utils from 'src/utils';

describe('rtbdemandadk adapter', function () {
  const bid1_zone1 = {
      bidder: 'rtbdemandadk',
      bidId: 'Bid_01',
      params: {zoneId: 1, host: 'rtb.rtbdemand.com'},
      placementCode: 'ad-unit-1',
      sizes: [[300, 250], [300, 200]]
    }, bid2_zone2 = {
      bidder: 'rtbdemandadk',
      bidId: 'Bid_02',
      params: {zoneId: 2, host: 'rtb.rtbdemand.com'},
      placementCode: 'ad-unit-2',
      sizes: [[728, 90]]
    }, bid3_host2 = {
      bidder: 'rtbdemandadk',
      bidId: 'Bid_02',
      params: {zoneId: 1, host: 'rtb-private.rtbdemand.com'},
      placementCode: 'ad-unit-2',
      sizes: [[728, 90]]
    }, bid_without_zone = {
      bidder: 'rtbdemandadk',
      bidId: 'Bid_W',
      params: {host: 'rtb-private.rtbdemand.com'},
      placementCode: 'ad-unit-1',
      sizes: [[728, 90]]
    }, bid_without_host = {
      bidder: 'rtbdemandadk',
      bidId: 'Bid_W',
      params: {zoneId: 1},
      placementCode: 'ad-unit-1',
      sizes: [[728, 90]]
    }, bid_with_wrong_zoneId = {
      bidder: 'rtbdemandadk',
      bidId: 'Bid_02',
      params: {zoneId: 'wrong id', host: 'rtb.rtbdemand.com'},
      placementCode: 'ad-unit-2',
      sizes: [[728, 90]]
    }, bid_video = {
      bidder: 'rtbdemandadk',
      bidId: 'Bid_Video',
      sizes: [640, 480],
      mediaType: 'video',
      params: {
        zoneId: 1,
        host: 'rtb.rtbdemand.com',
        video: {
          mimes: ['video/mp4', 'video/webm', 'video/x-flv']
        }
      },
      placementCode: 'ad-unit-1'
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

  describe('input parameters validation', function () {
    it('empty request shouldn\'t generate exception', function () {
      expect(spec.isBidRequestValid({
        bidderCode: 'rtbdemandadk'
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
    let bidRequest;
    before(function () {
      let wmock = sinon.stub(utils, 'getTopWindowLocation').callsFake(() => ({
        protocol: 'https:',
        hostname: 'example.com',
        host: 'example.com',
        pathname: '/index.html',
        href: 'https://example.com/index.html'
      }));
      let dntmock = sinon.stub(utils, 'getDNT').callsFake(() => true);
      let request = spec.buildRequests([bid1_zone1])[0];
      bidRequest = JSON.parse(request.data.r);
      wmock.restore();
      dntmock.restore();
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
  });

  describe('video request building', function () {
    let bidRequest;

    before(function () {
      let request = spec.buildRequests([bid_video])[0];
      bidRequest = JSON.parse(request.data.r);
    });

    it('should have video object', function () {
      expect(bidRequest.imp[0]).to.have.property('video');
    });

    it('should have h/w', function () {
      expect(bidRequest.imp[0].video).to.have.property('w', 640);
      expect(bidRequest.imp[0].video).to.have.property('h', 480);
    });

    it('should have tagid', function () {
      expect(bidRequest.imp[0]).to.have.property('tagid', 'ad-unit-1');
    });
  });

  describe('requests routing', function () {
    it('should issue a request for each host', function () {
      let pbRequests = spec.buildRequests([bid1_zone1, bid3_host2]);
      expect(pbRequests).to.have.length(2);
      expect(pbRequests[0].url).to.have.string(`//${bid1_zone1.params.host}/`);
      expect(pbRequests[1].url).to.have.string(`//${bid3_host2.params.host}/`);
    });

    it('should issue a request for each zone', function () {
      let pbRequests = spec.buildRequests([bid1_zone1, bid2_zone2]);
      expect(pbRequests).to.have.length(2);
      expect(pbRequests[0].data.zone).to.be.equal(bid1_zone1.params.zoneId);
      expect(pbRequests[1].data.zone).to.be.equal(bid2_zone2.params.zoneId);
    });
  });

  describe('responses processing', function () {
    it('should return fully-initialized banner bid-response', function () {
      let request = spec.buildRequests([bid1_zone1])[0];
      let resp = spec.interpretResponse({body: bidResponse1}, request)[0];
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
      let request = spec.buildRequests([bid_video])[0];
      let resp = spec.interpretResponse({body: videoBidResponse}, request)[0];
      expect(resp).to.have.property('requestId', 'Bid_Video');
      expect(resp.mediaType).to.equal('video');
      expect(resp.cpm).to.equal(0.00145);
      expect(resp.vastUrl).to.equal('https://rtb.com/win?i=sZSYq5zYMxo_0&f=nurl');
      expect(resp.width).to.equal(640);
      expect(resp.height).to.equal(480);
    });

    it('should add nurl as pixel for banner response', function () {
      let request = spec.buildRequests([bid1_zone1])[0];
      let resp = spec.interpretResponse({body: bidResponse1}, request)[0];
      let expectedNurl = bidResponse1.seatbid[0].bid[0].nurl + '&px=1';
      expect(resp.ad).to.have.string(expectedNurl);
    });

    it('should handle bidresponse with user-sync only', function () {
      let request = spec.buildRequests([bid1_zone1])[0];
      let resp = spec.interpretResponse({body: usersyncOnlyResponse}, request);
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
