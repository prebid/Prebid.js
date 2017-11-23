import {expect} from 'chai';
import {spec} from 'modules/adkernelBidAdapter';
import * as utils from 'src/utils';

describe('Adkernel adapter', () => {
  const bid1_zone1 = {
      bidder: 'adkernel',
      bidId: 'Bid_01',
      params: {zoneId: 1, host: 'rtb.adkernel.com'},
      placementCode: 'ad-unit-1',
      sizes: [[300, 250]]
    }, bid2_zone2 = {
      bidder: 'adkernel',
      bidId: 'Bid_02',
      params: {zoneId: 2, host: 'rtb.adkernel.com'},
      placementCode: 'ad-unit-2',
      sizes: [[728, 90]]
    }, bid3_host2 = {
      bidder: 'adkernel',
      bidId: 'Bid_02',
      params: {zoneId: 1, host: 'rtb-private.adkernel.com'},
      placementCode: 'ad-unit-2',
      sizes: [[728, 90]]
    }, bid_without_zone = {
      bidder: 'adkernel',
      bidId: 'Bid_W',
      params: {host: 'rtb-private.adkernel.com'},
      placementCode: 'ad-unit-1',
      sizes: [[728, 90]]
    }, bid_without_host = {
      bidder: 'adkernel',
      bidId: 'Bid_W',
      params: {zoneId: 1},
      placementCode: 'ad-unit-1',
      sizes: [[728, 90]]
    }, bid_with_wrong_zoneId = {
      bidder: 'adkernel',
      bidId: 'Bid_02',
      params: {zoneId: 'wrong id', host: 'rtb.adkernel.com'},
      placementCode: 'ad-unit-2',
      sizes: [[728, 90]]
    }, bid_video = {
      bidder: 'adkernel',
      bidId: 'Bid_Video',
      sizes: [640, 480],
      mediaType: 'video',
      params: {
        zoneId: 1,
        host: 'rtb.adkernel.com',
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
          adm: '<!-- admarkup here -->'
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
          adm: '<!-- admarkup here -->'
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

  describe('input parameters validation', () => {
    it('empty request shouldn\'t generate exception', () => {
      expect(spec.isBidRequestValid({
        bidderCode: 'adkernel'
      })).to.be.equal(false);
    });

    it('request without zone shouldn\'t issue a request', () => {
      expect(spec.isBidRequestValid(bid_without_zone)).to.be.equal(false);
    });

    it('request without host shouldn\'t issue a request', () => {
      expect(spec.isBidRequestValid(bid_without_host)).to.be.equal(false);
    });

    it('empty request shouldn\'t generate exception', () => {
      expect(spec.isBidRequestValid(bid_with_wrong_zoneId)).to.be.equal(false);
    });
  });

  describe('banner request building', () => {
    let bidRequest;
    let mock;

    before(() => {
      mock = sinon.stub(utils, 'getTopWindowLocation', () => {
        return {
          protocol: 'https:',
          hostname: 'example.com',
          host: 'example.com',
          pathname: '/index.html',
          href: 'https://example.com/index.html'
        };
      });
      let request = spec.buildRequests([bid1_zone1])[0];
      bidRequest = JSON.parse(request.data.r);
      mock.restore();
    });

    it('should be a first-price auction', () => {
      expect(bidRequest).to.have.property('at', 1);
    });

    it('should have banner object', () => {
      expect(bidRequest.imp[0]).to.have.property('banner');
    });

    it('should have h/w', () => {
      expect(bidRequest.imp[0].banner).to.have.property('w', 300);
      expect(bidRequest.imp[0].banner).to.have.property('h', 250);
    });

    it('should respect secure connection', () => {
      expect(bidRequest.imp[0]).to.have.property('secure', 1);
    });

    it('should have tagid', () => {
      expect(bidRequest.imp[0]).to.have.property('tagid', 'ad-unit-1');
    });

    it('should create proper site block', () => {
      expect(bidRequest.site).to.have.property('domain', 'example.com');
      expect(bidRequest.site).to.have.property('page', 'https://example.com/index.html');
    });

    it('should fill device with caller macro', () => {
      expect(bidRequest).to.have.property('device');
      expect(bidRequest.device).to.have.property('ip', 'caller');
      expect(bidRequest.device).to.have.property('ua', 'caller');
    })
  });

  describe('video request building', () => {
    let bidRequest;

    before(() => {
      let request = spec.buildRequests([bid_video])[0];
      bidRequest = JSON.parse(request.data.r);
    });

    it('should have video object', () => {
      expect(bidRequest.imp[0]).to.have.property('video');
    });

    it('should have h/w', () => {
      expect(bidRequest.imp[0].video).to.have.property('w', 640);
      expect(bidRequest.imp[0].video).to.have.property('h', 480);
    });

    it('should have tagid', () => {
      expect(bidRequest.imp[0]).to.have.property('tagid', 'ad-unit-1');
    });
  });

  describe('requests routing', () => {
    it('should issue a request for each host', () => {
      let pbRequests = spec.buildRequests([bid1_zone1, bid3_host2]);
      expect(pbRequests).to.have.length(2);
      expect(pbRequests[0].url).to.have.string(`//${bid1_zone1.params.host}/`);
      expect(pbRequests[1].url).to.have.string(`//${bid3_host2.params.host}/`);
    });

    it('should issue a request for each zone', () => {
      let pbRequests = spec.buildRequests([bid1_zone1, bid2_zone2]);
      expect(pbRequests).to.have.length(2);
      expect(pbRequests[0].data.zone).to.be.equal(bid1_zone1.params.zoneId);
      expect(pbRequests[1].data.zone).to.be.equal(bid2_zone2.params.zoneId);
    });
  });

  describe('responses processing', () => {
    it('should return fully-initialized banner bid-response', () => {
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

    it('should return fully-initialized video bid-response', () => {
      let request = spec.buildRequests([bid_video])[0];
      let resp = spec.interpretResponse({body: videoBidResponse}, request)[0];
      expect(resp).to.have.property('requestId', 'Bid_Video');
      expect(resp.mediaType).to.equal('video');
      expect(resp.cpm).to.equal(0.00145);
      expect(resp.vastUrl).to.equal('https://rtb.com/win?i=sZSYq5zYMxo_0&f=nurl');
      expect(resp.width).to.equal(640);
      expect(resp.height).to.equal(480);
    });

    it('should add nurl as pixel for banner response', () => {
      let request = spec.buildRequests([bid1_zone1])[0];
      let resp = spec.interpretResponse({body: bidResponse1}, request)[0];
      let expectedNurl = bidResponse1.seatbid[0].bid[0].nurl + '&px=1';
      expect(resp.ad).to.have.string(expectedNurl);
    });

    it('should handle bidresponse with user-sync only', () => {
      let request = spec.buildRequests([bid1_zone1])[0];
      let resp = spec.interpretResponse({body: usersyncOnlyResponse}, request);
      expect(resp).to.have.length(0);
    });

    it('should perform usersync', () => {
      let syncs = spec.getUserSyncs({iframeEnabled: false}, [{body: bidResponse1}]);
      expect(syncs).to.have.length(0);
      syncs = spec.getUserSyncs({iframeEnabled: true}, [{body: bidResponse1}]);
      expect(syncs).to.have.length(1);
      expect(syncs[0]).to.have.property('type', 'iframe');
      expect(syncs[0]).to.have.property('url', 'http://adk.sync.com/sync');
    });
  });
});
