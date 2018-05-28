import {expect} from 'chai';
import {spec} from 'modules/adkernelAdnBidAdapter';
import * as utils from 'src/utils';

describe('AdkernelAdn adapter', () => {
  const bid1_pub1 = {
      bidder: 'adkernelAdn',
      transactionId: 'transact0',
      bidderRequestId: 'req0',
      bidId: 'bidid_1',
      params: {
        pubId: 1
      },
      placementCode: 'ad-unit-1',
      sizes: [[300, 250], [300, 200]]
    },
    bid2_pub1 = {
      bidder: 'adkernelAdn',
      transactionId: 'transact1',
      bidderRequestId: 'req1',
      bidId: 'bidid_2',
      params: {
        pubId: 1
      },
      placementCode: 'ad-unit-2',
      sizes: [[300, 250]]
    },
    bid1_pub2 = {
      bidder: 'adkernelAdn',
      transactionId: 'transact2',
      bidderRequestId: 'req1',
      bidId: 'bidid_3',
      params: {
        pubId: 7,
        host: 'dps-test.com'
      },
      placementCode: 'ad-unit-2',
      sizes: [[728, 90]]
    }, bid_video1 = {
      bidder: 'adkernelAdn',
      transactionId: 'transact3',
      bidderRequestId: 'req1',
      bidId: 'bidid_4',
      mediaType: 'video',
      sizes: [640, 300],
      placementCode: 'video_wrapper',
      params: {
        pubId: 7,
        video: {
          mimes: ['video/mp4', 'video/webm', 'video/x-flv'],
          api: [1, 2, 3, 4],
          protocols: [1, 2, 3, 4, 5, 6]
        }
      }
    }, bid_video2 = {
      bidder: 'adkernelAdn',
      transactionId: 'transact3',
      bidderRequestId: 'req1',
      bidId: 'bidid_5',
      mediaTypes: {video: {context: 'instream'}},
      sizes: [640, 300],
      placementCode: 'video_wrapper2',
      params: {
        pubId: 7,
        video: {
          mimes: ['video/mp4', 'video/webm', 'video/x-flv'],
          api: [1, 2, 3, 4],
          protocols: [1, 2, 3, 4, 5, 6]
        }
      }
    };

  const response = {
      tags: [{
        id: 'ad-unit-1',
        impid: '2c5e951baeeadd',
        crid: '108_159810',
        bid: 5.0,
        tag: '<!-- tag goes here -->',
        w: 300,
        h: 250
      }, {
        id: 'ad-unit-2',
        impid: '31d798477126c4',
        crid: '108_21226',
        bid: 2.5,
        tag: '<!-- tag goes here -->',
        w: 300,
        h: 250
      }, {
        id: 'video_wrapper',
        impid: '57d602ad1c9545',
        crid: '108_158802',
        bid: 10.0,
        vast_url: 'http://vast.com/vast.xml'
      }],
      syncpages: ['https://dsp.adkernel.com/sync']
    }, usersyncOnlyResponse = {
      syncpages: ['https://dsp.adkernel.com/sync']
    };

  describe('input parameters validation', () => {
    it('empty request shouldn\'t generate exception', () => {
      expect(spec.isBidRequestValid({
        bidderCode: 'adkernelAdn'
      })).to.be.equal(false);
    });
    it('request without pubid should be ignored', () => {
      expect(spec.isBidRequestValid({
        bidder: 'adkernelAdn',
        params: {},
        placementCode: 'ad-unit-0',
        sizes: [[300, 250]]
      })).to.be.equal(false);
    });
    it('request with invalid pubid should be ignored', () => {
      expect(spec.isBidRequestValid({
        bidder: 'adkernelAdn',
        params: {
          pubId: 'invalid id'
        },
        placementCode: 'ad-unit-0',
        sizes: [[300, 250]]
      })).to.be.equal(false);
    });
  });

  describe('banner request building', () => {
    let pbRequest;
    let tagRequest;

    before(() => {
      let mock = sinon.stub(utils, 'getTopWindowLocation', () => {
        return {
          protocol: 'https:',
          hostname: 'example.com',
          host: 'example.com',
          pathname: '/index.html',
          href: 'https://example.com/index.html'
        };
      });
      pbRequest = spec.buildRequests([bid1_pub1])[0];
      tagRequest = JSON.parse(pbRequest.data);
      mock.restore();
    });

    it('should have request id', () => {
      expect(tagRequest).to.have.property('id');
    });
    it('should have transaction id', () => {
      expect(tagRequest).to.have.property('tid');
    });
    it('should have sizes', () => {
      expect(tagRequest.imp[0].banner).to.have.property('format');
      expect(tagRequest.imp[0].banner.format).to.be.eql(['300x250', '300x200']);
    });
    it('should have impression id', () => {
      expect(tagRequest.imp[0]).to.have.property('id', 'bidid_1');
    });
    it('should have tagid', () => {
      expect(tagRequest.imp[0]).to.have.property('tagid', 'ad-unit-1');
    });
    it('should create proper site block', () => {
      expect(tagRequest.site).to.have.property('page', 'https://example.com/index.html');
      expect(tagRequest.site).to.have.property('secure', 1);
    });
  });

  describe('video request building', () => {
    let pbRequest = spec.buildRequests([bid_video1, bid_video2])[0];
    let tagRequest = JSON.parse(pbRequest.data);

    it('should have video object', () => {
      expect(tagRequest.imp[0]).to.have.property('video');
      expect(tagRequest.imp[1]).to.have.property('video');
    });
    it('should have tagid', () => {
      expect(tagRequest.imp[0]).to.have.property('tagid', 'video_wrapper');
      expect(tagRequest.imp[1]).to.have.property('tagid', 'video_wrapper2');
    });
  });

  describe('requests routing', () => {
    it('should issue a request for each publisher', () => {
      let pbRequests = spec.buildRequests([bid1_pub1, bid_video1]);
      expect(pbRequests).to.have.length(2);
      expect(pbRequests[0].url).to.have.string(`account=${bid1_pub1.params.pubId}`);
      expect(pbRequests[1].url).to.have.string(`account=${bid1_pub2.params.pubId}`);
      let tagRequest1 = JSON.parse(pbRequests[0].data);
      let tagRequest2 = JSON.parse(pbRequests[1].data);
      expect(tagRequest1.imp).to.have.length(1);
      expect(tagRequest2.imp).to.have.length(1);
    });
    it('should issue a request for each host', () => {
      let pbRequests = spec.buildRequests([bid1_pub1, bid1_pub2]);
      expect(pbRequests).to.have.length(2);
      expect(pbRequests[0].url).to.have.string('//tag.adkernel.com/tag');
      expect(pbRequests[1].url).to.have.string(`//${bid1_pub2.params.host}/tag`);
      let tagRequest1 = JSON.parse(pbRequests[0].data);
      let tagRequest2 = JSON.parse(pbRequests[1].data);
      expect(tagRequest1.imp).to.have.length(1);
      expect(tagRequest2.imp).to.have.length(1);
    });
  });

  describe('responses processing', () => {
    let responses;
    before(() => {
      responses = spec.interpretResponse({body: response});
    });
    it('should parse all responses', () => {
      expect(responses).to.have.length(3);
    });
    it('should return fully-initialized bid-response', () => {
      let resp = responses[0];
      expect(resp).to.have.property('bidderCode', 'adkernelAdn');
      expect(resp).to.have.property('requestId', '2c5e951baeeadd');
      expect(resp).to.have.property('cpm', 5.0);
      expect(resp).to.have.property('width', 300);
      expect(resp).to.have.property('height', 250);
      expect(resp).to.have.property('creativeId', '108_159810');
      expect(resp).to.have.property('currency');
      expect(resp).to.have.property('ttl');
      expect(resp).to.have.property('mediaType', 'banner');
      expect(resp).to.have.property('ad');
      expect(resp.ad).to.have.string('<!-- tag goes here -->');
    });
    it('should return fully-initialized video bid-response', () => {
      let resp = responses[2];
      expect(resp).to.have.property('bidderCode', 'adkernelAdn');
      expect(resp).to.have.property('requestId', '57d602ad1c9545');
      expect(resp).to.have.property('cpm', 10.0);
      expect(resp).to.have.property('creativeId', '108_158802');
      expect(resp).to.have.property('currency');
      expect(resp).to.have.property('ttl');
      expect(resp).to.have.property('mediaType', 'video');
      expect(resp).to.have.property('vastUrl', 'http://vast.com/vast.xml');
      expect(resp).to.not.have.property('ad');
    });
    it('should perform usersync', () => {
      let syncs = spec.getUserSyncs({iframeEnabled: false}, [{body: response}]);
      expect(syncs).to.have.length(0);
      syncs = spec.getUserSyncs({iframeEnabled: true}, [{body: response}]);
      expect(syncs).to.have.length(1);
      expect(syncs[0]).to.have.property('type', 'iframe');
      expect(syncs[0]).to.have.property('url', 'https://dsp.adkernel.com/sync');
    });
    it('should handle user-sync only response', () => {
      let request = spec.buildRequests([bid1_pub1])[0];
      let resp = spec.interpretResponse({body: usersyncOnlyResponse}, request);
      expect(resp).to.have.length(0);
    });
  });
});
