import {expect} from 'chai';
import {spec} from 'modules/relaidoBidAdapter.js';
import * as utils from 'src/utils.js';
import {VIDEO} from 'src/mediaTypes.js';
import {getCoreStorageManager} from '../../../src/storageManager.js';
import * as mockGpt from '../integration/faker/googletag.js';

const UUID_KEY = 'relaido_uuid';
const relaido_uuid = 'hogehoge';

describe('RelaidoAdapter', function () {
  let bidRequest;
  let bidderRequest;
  let serverResponse;
  let serverResponseBanner;
  let serverRequest;
  let generateUUIDStub;
  let triggerPixelStub;
  let sandbox;

  before(() => {
    const storage = getCoreStorageManager();
    storage.setCookie(UUID_KEY, relaido_uuid);
  });

  beforeEach(function () {
    mockGpt.disable();
    generateUUIDStub = sinon.stub(utils, 'generateUUID').returns(relaido_uuid);
    triggerPixelStub = sinon.stub(utils, 'triggerPixel');
    sandbox = sinon.sandbox.create();
    bidRequest = {
      bidder: 'relaido',
      params: {
        placementId: '100000',
      },
      mediaTypes: {
        video: {
          context: 'outstream',
          playerSize: [
            [640, 360]
          ]
        }
      },
      adUnitCode: 'test',
      bidId: '2ed93003f7bb99',
      bidderRequestId: '1c50443387a1f2',
      auctionId: '413ed000-8c7a-4ba1-a1fa-9732e006f8c3',
      ortb2Imp: {
        ext: {
          tid: '5c2d064c-7b76-42e8-a383-983603afdc45',
        }
      },
      bidRequestsCount: 1,
      bidderRequestsCount: 1,
      bidderWinsCount: 0
    };
    bidderRequest = {
      timeout: 1000,
      refererInfo: {
        page: 'https://publisher.com/home?aaa=test1&bbb=test2',
        canonicalUrl: 'https://publisher.com/home'
      }
    };
    serverResponse = {
      body: {
        status: 'ok',
        ads: [{
          placementId: 100000,
          width: 640,
          height: 360,
          bidId: '2ed93003f7bb99',
          price: 500,
          model: 'vcpm',
          currency: 'JPY',
          creativeId: 1000,
          vast: '<VAST version="3.0"><Ad><InLine></InLine></Ad></VAST>',
          syncUrl: 'https://relaido/sync.html',
          adomain: ['relaido.co.jp', 'www.cmertv.co.jp'],
          mediaType: 'video'
        }],
        playerUrl: 'https://relaido/player.js',
        syncUrl: 'https://api-dev.ulizaex.com/tr/v1/prebid/sync.html',
        uuid: relaido_uuid,
      }
    };
    serverResponseBanner = {
      body: {
        status: 'ok',
        ads: [{
          placementId: 100000,
          width: 640,
          height: 360,
          bidId: '2ed93003f7bb99',
          price: 500,
          model: 'vcpm',
          currency: 'JPY',
          creativeId: 1000,
          adTag: '%3Cdiv%3E%3Cimg%20src%3D%22https%3A%2F%2Frelaido%2Ftest.jpg%22%20%2F%3E%3C%2Fdiv%3E',
          syncUrl: 'https://relaido/sync.html',
          adomain: ['relaido.co.jp', 'www.cmertv.co.jp'],
          mediaType: 'banner'
        }],
        syncUrl: 'https://api-dev.ulizaex.com/tr/v1/prebid/sync.html',
        uuid: relaido_uuid,
      }
    };
    serverRequest = {
      method: 'POST',
      data: {
        bids: [{
          bidId: bidRequest.bidId,
          width: bidRequest.mediaTypes.video.playerSize[0][0] || bidRequest.mediaTypes.video.playerSize[0],
          height: bidRequest.mediaTypes.video.playerSize[0][1] || bidRequest.mediaTypes.video.playerSize[1],
          mediaType: 'video'
        }]
      }
    };
  });

  afterEach(() => {
    generateUUIDStub.restore();
    triggerPixelStub.restore();
    sandbox.restore();
  });

  describe('spec.isBidRequestValid', function () {
    it('should return true when the required params are passed by video', function () {
      expect(spec.isBidRequestValid(bidRequest)).to.equal(true);
    });

    it('should return true when not existed mediaTypes.video.playerSize and existed valid params.video.playerSize by video', function () {
      bidRequest.mediaTypes = {
        video: {
          context: 'outstream'
        }
      };
      bidRequest.params = {
        placementId: '100000',
        video: {
          playerSize: [
            [640, 360]
          ]
        }
      };
      expect(spec.isBidRequestValid(bidRequest)).to.equal(true);
    });

    it('should return even true when the playerSize is Array[Number, Number] by video', function () {
      bidRequest.mediaTypes = {
        video: {
          context: 'outstream',
          playerSize: [640, 360]
        }
      };
      expect(spec.isBidRequestValid(bidRequest)).to.equal(true);
    });

    it('should return true when the required params are passed by banner', function () {
      bidRequest.mediaTypes = {
        banner: {
          sizes: [
            [300, 250]
          ]
        }
      };
      expect(spec.isBidRequestValid(bidRequest)).to.equal(true);
    });

    it('should return false when missing 300x250 over and 1x1 by banner', function () {
      bidRequest.mediaTypes = {
        banner: {
          sizes: [
            [100, 100],
            [300, 100]
          ]
        }
      };
      expect(spec.isBidRequestValid(bidRequest)).to.equal(false);
    });

    it('should return true when 300x250 by banner', function () {
      bidRequest.mediaTypes = {
        banner: {
          sizes: [
            [300, 250]
          ]
        }
      };
      expect(spec.isBidRequestValid(bidRequest)).to.equal(true);
    });

    it('should return true when 1x1 by banner', function () {
      bidRequest.mediaTypes = {
        banner: {
          sizes: [
            [1, 1]
          ]
        }
      };
      expect(spec.isBidRequestValid(bidRequest)).to.equal(true);
    });

    it('should return true when 300x250 over by banner', function () {
      bidRequest.mediaTypes = {
        banner: {
          sizes: [
            [100, 100],
            [300, 250]
          ]
        }
      };
      expect(spec.isBidRequestValid(bidRequest)).to.equal(true);
    });

    it('should return false when the placementId params are missing', function () {
      bidRequest.params.placementId = undefined;
      expect(spec.isBidRequestValid(bidRequest)).to.equal(false);
    });

    it('should return false when the mediaType video params are missing', function () {
      bidRequest.mediaTypes = {
        video: {}
      };
      expect(spec.isBidRequestValid(bidRequest)).to.equal(false);
    });

    it('should return false when the mediaType banner params are missing', function () {
      bidRequest.mediaTypes = {
        banner: {}
      };
      expect(spec.isBidRequestValid(bidRequest)).to.equal(false);
    });

    it('should return false when the mediaTypes params are missing', function () {
      bidRequest.mediaTypes = {};
      expect(spec.isBidRequestValid(bidRequest)).to.equal(false);
    });
  });

  describe('spec.buildRequests', function () {
    it('should build bid requests by video', function () {
      const bidRequests = spec.buildRequests([bidRequest], bidderRequest);
      const data = JSON.parse(bidRequests.data);
      expect(data.bids).to.have.lengthOf(1);
      const request = data.bids[0];
      expect(bidRequests.method).to.equal('POST');
      expect(bidRequests.url).to.equal('https://api.relaido.jp/bid/v1/sprebid');
      expect(data.canonical_url).to.equal('https://publisher.com/home');
      expect(data.canonical_url_hash).to.equal('e6092f44a0044903ae3764126eedd6187c1d9f04');
      expect(data.ref).to.equal(bidderRequest.refererInfo.page);
      expect(data.timeout_ms).to.equal(bidderRequest.timeout);
      expect(request.ad_unit_code).to.equal(bidRequest.adUnitCode);
      expect(request.auction_id).to.equal(bidRequest.auctionId);
      expect(data.bidder).to.equal(bidRequest.bidder);
      expect(request.bidder_request_id).to.equal(bidRequest.bidderRequestId);
      expect(data.bid_requests_count).to.equal(bidRequest.bidRequestsCount);
      expect(request.bid_id).to.equal(bidRequest.bidId);
      expect(request.transaction_id).to.equal(bidRequest.ortb2Imp.ext.tid);
      expect(request.media_type).to.equal('video');
      expect(request.pagekvt).to.deep.equal({});
      expect(data.uuid).to.equal(relaido_uuid);
      expect(data.pv).to.equal('$prebid.version$');
      expect(request.userIdAsEids).to.be.an('array');
    });

    it('should build bid requests by banner', function () {
      bidRequest.mediaTypes = {
        video: {
          context: 'outstream',
          playerSize: [
            [320, 180]
          ]
        },
        banner: {
          sizes: [
            [640, 360],
            [1, 1]
          ]
        }
      };
      const bidRequests = spec.buildRequests([bidRequest], bidderRequest);
      const data = JSON.parse(bidRequests.data);
      expect(data.bids).to.have.lengthOf(1);
      const request = data.bids[0];
      expect(request.media_type).to.equal('banner');
      expect(request.banner_sizes).to.equal('640x360,1x1');
    });

    it('should take 1x1 size', function () {
      bidRequest.mediaTypes = {
        video: {
          context: 'outstream',
          playerSize: [
            [320, 180]
          ]
        },
        banner: {
          sizes: [
            [640, 360],
            [1, 1]
          ]
        }
      };
      const bidRequests = spec.buildRequests([bidRequest], bidderRequest);
      const data = JSON.parse(bidRequests.data);
      expect(data.bids).to.have.lengthOf(1);
      const request = data.bids[0];

      expect(request.width).to.equal(1);
    });

    it('The referrer should be the last', function () {
      const bidRequests = spec.buildRequests([bidRequest], bidderRequest);
      const data = JSON.parse(bidRequests.data);
      expect(data.bids).to.have.lengthOf(1);
      const keys = Object.keys(data);
      expect(keys[0]).to.equal('version');
      expect(keys[keys.length - 1]).to.equal('ref');
    });

    it('should get imuid', function () {
      bidRequest.userId = {}
      bidRequest.userId.imuid = 'i.tjHcK_7fTcqnbrS_YA2vaw';
      const bidRequests = spec.buildRequests([bidRequest], bidderRequest);
      const data = JSON.parse(bidRequests.data);
      expect(data.bids).to.have.lengthOf(1);
      expect(data.imuid).to.equal('i.tjHcK_7fTcqnbrS_YA2vaw');
    });

    it('should get userIdAsEids', function () {
      const userIdAsEids = [
        {
          source: 'hogehoge.com',
          uids: {
            atype: 1,
            id: 'hugahuga'
          }
        }
      ]
      bidRequest.userIdAsEids = userIdAsEids
      const bidRequests = spec.buildRequests([bidRequest], bidderRequest);
      const data = JSON.parse(bidRequests.data);
      expect(data.bids[0].userIdAsEids).to.have.lengthOf(1);
      expect(data.bids[0].userIdAsEids[0].source).to.equal('hogehoge.com');
    });

    it('should get pagekvt', function () {
      mockGpt.enable();
      window.googletag.pubads().clearTargeting();
      window.googletag.pubads().setTargeting('testkey', ['testvalue']);
      bidRequest.adUnitCode = 'test-adunit-code-1';
      window.googletag.pubads().setSlots([mockGpt.makeSlot({ code: bidRequest.adUnitCode })]);
      const bidRequests = spec.buildRequests([bidRequest], bidderRequest);
      const data = JSON.parse(bidRequests.data);
      expect(data.bids).to.have.lengthOf(1);
      const request = data.bids[0];
      expect(request.pagekvt).to.deep.equal({testkey: ['testvalue']});
    });

    it('should get canonicalUrl (ogUrl:true)', function () {
      bidRequest.params.ogUrl = true;
      bidderRequest.refererInfo.canonicalUrl = null;
      let documentStub = sandbox.stub(window.top.document, 'querySelector');
      documentStub.withArgs('meta[property="og:url"]').returns({
        content: 'http://localhost:9999/fb-test'
      });
      const bidRequests = spec.buildRequests([bidRequest], bidderRequest);
      const data = JSON.parse(bidRequests.data);
      expect(data.bids).to.have.lengthOf(1);
      expect(data.canonical_url).to.equal('http://localhost:9999/fb-test');
      expect(data.canonical_url_hash).to.equal('cd106829f866d60ee4ed43c6e2a5d0a5212ffc97');
    });

    it('should not get canonicalUrl (ogUrl:false)', function () {
      bidRequest.params.ogUrl = false;
      bidderRequest.refererInfo.canonicalUrl = null;
      let documentStub = sandbox.stub(window.top.document, 'querySelector');
      documentStub.withArgs('meta[property="og:url"]').returns({
        content: 'http://localhost:9999/fb-test'
      });
      const bidRequests = spec.buildRequests([bidRequest], bidderRequest);
      const data = JSON.parse(bidRequests.data);
      expect(data.bids).to.have.lengthOf(1);
      expect(data.canonical_url).to.be.null;
      expect(data.canonical_url_hash).to.be.null;
    });

    it('should not get canonicalUrl (ogUrl:nothing)', function () {
      bidderRequest.refererInfo.canonicalUrl = null;
      let documentStub = sandbox.stub(window.top.document, 'querySelector');
      documentStub.withArgs('meta[property="og:url"]').returns({
        content: 'http://localhost:9999/fb-test'
      });
      const bidRequests = spec.buildRequests([bidRequest], bidderRequest);
      const data = JSON.parse(bidRequests.data);
      expect(data.bids).to.have.lengthOf(1);
      expect(data.canonical_url).to.be.null;
      expect(data.canonical_url_hash).to.be.null;
    });
  });

  describe('spec.interpretResponse', function () {
    it('should build bid response by video and serverResponse contains vast', function () {
      const bidResponses = spec.interpretResponse(serverResponse, serverRequest);
      expect(bidResponses).to.have.lengthOf(1);
      const response = bidResponses[0];
      expect(response.requestId).to.equal(serverRequest.data.bids[0].bidId);
      expect(response.placementId).to.equal(serverResponse.body.ads[0].placementId);
      expect(response.width).to.equal(serverRequest.data.bids[0].width);
      expect(response.height).to.equal(serverRequest.data.bids[0].height);
      expect(response.cpm).to.equal(serverResponse.body.ads[0].price);
      expect(response.currency).to.equal(serverResponse.body.ads[0].currency);
      expect(response.creativeId).to.equal(serverResponse.body.ads[0].creativeId);
      expect(response.vastXml).to.equal(serverResponse.body.ads[0].vast);
      expect(response.playerUrl).to.equal(serverResponse.body.playerUrl);
      expect(response.meta.advertiserDomains).to.equal(serverResponse.body.ads[0].adomain);
      expect(response.meta.mediaType).to.equal(VIDEO);
      expect(response.ad).to.be.undefined;
    });

    it('should build bid response by banner and serverResponse contains vast', function () {
      serverResponse.body.ads[0].mediaType = 'banner';
      const bidResponses = spec.interpretResponse(serverResponse, serverRequest);
      expect(bidResponses).to.have.lengthOf(1);
      const response = bidResponses[0];
      expect(response.requestId).to.equal(serverRequest.data.bids[0].bidId);
      expect(response.placementId).to.equal(serverResponse.body.ads[0].placementId);
      expect(response.width).to.equal(serverRequest.data.bids[0].width);
      expect(response.height).to.equal(serverRequest.data.bids[0].height);
      expect(response.cpm).to.equal(serverResponse.body.ads[0].price);
      expect(response.currency).to.equal(serverResponse.body.ads[0].currency);
      expect(response.creativeId).to.equal(serverResponse.body.ads[0].creativeId);
      expect(response.vastXml).to.be.undefined;
      expect(response.playerUrl).to.equal(serverResponse.body.playerUrl);
      expect(response.ad).to.include(`<div id="rop-prebid">`);
      expect(response.ad).to.include(`<script src="https://relaido/player.js"></script>`);
      expect(response.ad).to.include(`window.RelaidoPlayer.renderAd`);
    });

    it('should build bid response by banner and serverResponse contains adTag', function () {
      const bidResponses = spec.interpretResponse(serverResponseBanner, serverRequest);
      expect(bidResponses).to.have.lengthOf(1);
      const response = bidResponses[0];
      expect(response.requestId).to.equal(serverRequest.data.bids[0].bidId);
      expect(response.placementId).to.equal(serverResponseBanner.body.ads[0].placementId);
      expect(response.cpm).to.equal(serverResponseBanner.body.ads[0].price);
      expect(response.currency).to.equal(serverResponseBanner.body.ads[0].currency);
      expect(response.creativeId).to.equal(serverResponseBanner.body.ads[0].creativeId);
      expect(response.vastXml).to.be.undefined;
      expect(response.playerUrl).to.be.undefined;
      expect(response.ad).to.include(`<div><img src="https://relaido/test.jpg" /></div>`);
    });

    it('should build bid response by video and playerUrl in ads', function () {
      serverResponse.body.ads[0].playerUrl = 'https://relaido/player-customized.js';
      const bidResponses = spec.interpretResponse(serverResponse, serverRequest);
      expect(bidResponses).to.have.lengthOf(1);
      const response = bidResponses[0];
      expect(response.playerUrl).to.equal(serverResponse.body.ads[0].playerUrl);
    });

    it('should build bid response by banner and playerUrl in ads', function () {
      serverResponse.body.ads[0].playerUrl = 'https://relaido/player-customized.js';
      serverResponse.body.ads[0].mediaType = 'banner';
      const bidResponses = spec.interpretResponse(serverResponse, serverRequest);
      expect(bidResponses).to.have.lengthOf(1);
      const response = bidResponses[0];
      expect(response.playerUrl).to.equal(serverResponse.body.ads[0].playerUrl);
    });

    it('should not build bid response', function () {
      serverResponse = {};
      const bidResponses = spec.interpretResponse(serverResponse, serverRequest);
      expect(bidResponses).to.have.lengthOf(0);
    });

    it('should not build bid response', function () {
      serverResponse = {
        body: {
          status: 'no_ad',
        }
      };
      const bidResponses = spec.interpretResponse(serverResponse, serverRequest);
      expect(bidResponses).to.have.lengthOf(0);
    });
  });

  describe('spec.getUserSyncs', function () {
    it('should choose iframe sync urls', function () {
      let userSyncs = spec.getUserSyncs({iframeEnabled: true}, [serverResponse]);
      expect(userSyncs).to.deep.equal([{
        type: 'iframe',
        url: serverResponse.body.syncUrl + '?uu=hogehoge'
      }]);
    });

    it('should choose iframe sync urls if serverResponse are empty', function () {
      let userSyncs = spec.getUserSyncs({iframeEnabled: true}, []);
      expect(userSyncs).to.deep.equal([{
        type: 'iframe',
        url: 'https://api.relaido.jp/tr/v1/prebid/sync.html?uu=hogehoge'
      }]);
    });

    it('should choose iframe sync urls if syncUrl are undefined', function () {
      serverResponse.body.syncUrl = undefined;
      let userSyncs = spec.getUserSyncs({iframeEnabled: true}, [serverResponse]);
      expect(userSyncs).to.deep.equal([{
        type: 'iframe',
        url: 'https://api.relaido.jp/tr/v1/prebid/sync.html?uu=hogehoge'
      }]);
    });

    it('should return empty if iframeEnabled are false', function () {
      let userSyncs = spec.getUserSyncs({iframeEnabled: false}, [serverResponse]);
      expect(userSyncs).to.have.lengthOf(0);
    });
  });

  describe('spec.onBidWon', function () {
    it('Should create nurl pixel if bid nurl', function () {
      let bid = {
        bidder: bidRequest.bidder,
        creativeId: serverResponse.body.ads[0].creativeId,
        cpm: serverResponse.body.ads[0].price,
        params: [bidRequest.params],
        auctionId: bidRequest.auctionId,
        requestId: bidRequest.bidId,
        adId: '3b286a4db7031f',
        adUnitCode: bidRequest.adUnitCode,
        ref: window.location.href,
      }
      spec.onBidWon(bid);
      const parser = utils.parseUrl(triggerPixelStub.getCall(0).args[0]);
      const query = parser.search;
      expect(parser.hostname).to.equal('api.relaido.jp');
      expect(parser.pathname).to.equal('/tr/v1/prebid/win.gif');
      expect(query.placement_id).to.equal('100000');
      expect(query.creative_id).to.equal('1000');
      expect(query.price).to.equal('500');
      expect(query.auction_id).to.equal('413ed000-8c7a-4ba1-a1fa-9732e006f8c3');
      expect(query.bid_id).to.equal('2ed93003f7bb99');
      expect(query.ad_id).to.equal('3b286a4db7031f');
      expect(query.ad_unit_code).to.equal('test');
      expect(query.ref).to.include(window.location.href);
    });
  });

  describe('spec.onTimeout', function () {
    it('Should create nurl pixel if bid nurl', function () {
      const data = [{
        bidder: bidRequest.bidder,
        bidId: bidRequest.bidId,
        adUnitCode: bidRequest.adUnitCode,
        auctionId: bidRequest.auctionId,
        params: [bidRequest.params],
        timeout: bidderRequest.timeout,
      }];
      spec.onTimeout(data);
      const parser = utils.parseUrl(triggerPixelStub.getCall(0).args[0]);
      const query = parser.search;
      expect(parser.hostname).to.equal('api.relaido.jp');
      expect(parser.pathname).to.equal('/tr/v1/prebid/timeout.gif');
      expect(query.placement_id).to.equal('100000');
      expect(query.timeout).to.equal('1000');
      expect(query.auction_id).to.equal('413ed000-8c7a-4ba1-a1fa-9732e006f8c3');
      expect(query.bid_id).to.equal('2ed93003f7bb99');
      expect(query.ad_unit_code).to.equal('test');
      expect(query.ref).to.include(window.location.href);
    });
  });
});
