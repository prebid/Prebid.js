import {expect} from 'chai';
import {spec} from 'modules/adkernelAdnBidAdapter';
import * as utils from 'src/utils';

describe('AdkernelAdn adapter', function () {
  const bid1_pub1 = {
      bidder: 'adkernelAdn',
      transactionId: 'transact0',
      bidderRequestId: 'req0',
      auctionId: '5c66da22-426a-4bac-b153-77360bef5337',
      bidId: 'bidid_1',
      params: {
        pubId: 1
      },
      adUnitCode: 'ad-unit-1',
      sizes: [[300, 250], [300, 200]]
    },
    bid2_pub1 = {
      bidder: 'adkernelAdn',
      transactionId: 'transact0',
      bidderRequestId: 'req0',
      auctionId: '5c66da22-426a-4bac-b153-77360bef5337',
      bidId: 'bidid_2',
      params: {
        pubId: 1
      },
      adUnitCode: 'ad-unit-2',
      sizes: [300, 250]
    },
    bid1_pub2 = {
      bidder: 'adkernelAdn',
      transactionId: 'transact2',
      bidderRequestId: 'req1',
      auctionId: '5c66da22-426a-4bac-b153-77360bef5337',
      bidId: 'bidid_3',
      params: {
        pubId: 7,
        host: 'dps-test.com'
      },
      adUnitCode: 'ad-unit-2',
      sizes: [[728, 90]]
    }, bid_video1 = {
      bidder: 'adkernelAdn',
      transactionId: 'transact3',
      bidderRequestId: 'req1',
      auctionId: '5c66da22-426a-4bac-b153-77360bef5337',
      bidId: 'bidid_4',
      mediaType: 'video',
      sizes: [640, 300],
      adUnitCode: 'video_wrapper',
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
      auctionId: '5c66da22-426a-4bac-b153-77360bef5337',
      bidId: 'bidid_5',
      sizes: [[1920, 1080]],
      mediaTypes: {
        video: {
          playerSize: [1920, 1080],
          context: 'instream'
        }
      },

      adUnitCode: 'video_wrapper2',
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

  describe('input parameters validation', function () {
    it('empty request shouldn\'t generate exception', function () {
      expect(spec.isBidRequestValid({bidderCode: 'adkernelAdn'
      })).to.be.equal(false);
    });
    it('request without pubid should be ignored', function () {
      expect(spec.isBidRequestValid({
        bidder: 'adkernelAdn',
        params: {},
        placementCode: 'ad-unit-0',
        sizes: [[300, 250]]
      })).to.be.equal(false);
    });
    it('request with invalid pubid should be ignored', function () {
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

  function buildRequest(bidRequests, bidderRequest = {}) {
    let mock = sinon.stub(utils, 'getTopWindowLocation').callsFake(() => {
      return {
        protocol: 'https:',
        hostname: 'example.com',
        host: 'example.com',
        pathname: '/index.html',
        href: 'https://example.com/index.html'
      };
    });

    bidderRequest.auctionId = bidRequests[0].auctionId;
    bidderRequest.transactionId = bidRequests[0].transactionId;
    bidderRequest.bidderRequestId = bidRequests[0].bidderRequestId;

    let pbRequests = spec.buildRequests(bidRequests, bidderRequest);
    let tagRequests = pbRequests.map(r => JSON.parse(r.data));
    mock.restore();

    return [pbRequests, tagRequests];
  }

  describe('banner request building', function () {
    let [_, tagRequests] = buildRequest([bid1_pub1]);
    let tagRequest = tagRequests[0];

    it('should have request id', function () {
      expect(tagRequest).to.have.property('id');
    });
    it('should have transaction id', function () {
      expect(tagRequest).to.have.property('tid');
    });
    it('should have sizes', function () {
      expect(tagRequest.imp[0].banner).to.have.property('format');
      expect(tagRequest.imp[0].banner.format).to.be.eql(['300x250', '300x200']);
    });
    it('should have impression id', function () {
      expect(tagRequest.imp[0]).to.have.property('id', 'bidid_1');
    });
    it('should have tagid', function () {
      expect(tagRequest.imp[0]).to.have.property('tagid', 'ad-unit-1');
    });
    it('should create proper site block', function () {
      expect(tagRequest.site).to.have.property('page', 'https://example.com/index.html');
      expect(tagRequest.site).to.have.property('secure', 1);
    });

    it('should not have user object', function () {
      expect(tagRequest).to.not.have.property('user');
    });

    it('shouldn\'t contain gdpr-related information for default request', function () {
      let [_, tagRequests] = buildRequest([bid1_pub1]);
      expect(tagRequests[0]).to.not.have.property('user');
    });

    it('should contain gdpr-related information if consent is configured', function () {
      let [_, bidRequests] = buildRequest([bid1_pub1],
        {gdprConsent: {gdprApplies: true, consentString: 'test-consent-string'}});
      expect(bidRequests[0]).to.have.property('user');
      expect(bidRequests[0].user).to.have.property('gdpr', 1);
      expect(bidRequests[0].user).to.have.property('consent', 'test-consent-string');
    });

    it('should\'t contain consent string if gdpr isn\'t applied', function () {
      let [_, bidRequests] = buildRequest([bid1_pub1], {gdprConsent: {gdprApplies: false}});
      expect(bidRequests[0]).to.have.property('user');
      expect(bidRequests[0].user).to.have.property('gdpr', 0);
      expect(bidRequests[0].user).to.not.have.property('consent');
    });
  });

  describe('video request building', function () {
    let [_, tagRequests] = buildRequest([bid_video1, bid_video2]);
    let tagRequest = tagRequests[0];

    it('should have video object', function () {
      expect(tagRequest.imp[0]).to.have.property('video');
      expect(tagRequest.imp[1]).to.have.property('video');
    });
    it('should have tagid', function () {
      expect(tagRequest.imp[0]).to.have.property('tagid', 'video_wrapper');
      expect(tagRequest.imp[1]).to.have.property('tagid', 'video_wrapper2');
    });
    it('should have size', function () {
      expect(tagRequest.imp[0].video).to.have.property('w', 640);
      expect(tagRequest.imp[0].video).to.have.property('h', 300);
      expect(tagRequest.imp[1].video).to.have.property('w', 1920);
      expect(tagRequest.imp[1].video).to.have.property('h', 1080);
    });
  });

  describe('requests routing', function () {
    it('should issue a request for each publisher', function () {
      let [pbRequests, tagRequests] = buildRequest([bid1_pub1, bid_video1]);
      expect(pbRequests).to.have.length(2);
      expect(pbRequests[0].url).to.have.string(`account=${bid1_pub1.params.pubId}`);
      expect(pbRequests[1].url).to.have.string(`account=${bid1_pub2.params.pubId}`);
      expect(tagRequests[0].imp).to.have.length(1);
      expect(tagRequests[1].imp).to.have.length(1);
    });
    it('should issue a request for each host', function () {
      let [pbRequests, tagRequests] = buildRequest([bid1_pub1, bid1_pub2]);
      expect(pbRequests).to.have.length(2);
      expect(pbRequests[0].url).to.have.string('//tag.adkernel.com/tag');
      expect(pbRequests[1].url).to.have.string(`//${bid1_pub2.params.host}/tag`);
      expect(tagRequests[0].imp).to.have.length(1);
      expect(tagRequests[1].imp).to.have.length(1);
    });
  });

  describe('responses processing', function () {
    let responses;
    before(function () {
      responses = spec.interpretResponse({body: response});
    });
    it('should parse all responses', function () {
      expect(responses).to.have.length(3);
    });
    it('should return fully-initialized bid-response', function () {
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
    it('should return fully-initialized video bid-response', function () {
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
    it('should perform usersync', function () {
      let syncs = spec.getUserSyncs({iframeEnabled: false}, [{body: response}]);
      expect(syncs).to.have.length(0);
      syncs = spec.getUserSyncs({iframeEnabled: true}, [{body: response}]);
      expect(syncs).to.have.length(1);
      expect(syncs[0]).to.have.property('type', 'iframe');
      expect(syncs[0]).to.have.property('url', 'https://dsp.adkernel.com/sync');
    });
    it('should handle user-sync only response', function () {
      let [pbRequests, tagRequests] = buildRequest([bid1_pub1]);
      let resp = spec.interpretResponse({body: usersyncOnlyResponse}, pbRequests[0]);
      expect(resp).to.have.length(0);
    });
    it('shouldn\' fail on empty response', function () {
      let syncs = spec.getUserSyncs({iframeEnabled: true}, [{body: ''}]);
      expect(syncs).to.have.length(0);
    });
  });
});
