import { expect } from 'chai';
import { spec } from 'modules/relaidoBidAdapter.js';
import * as utils from 'src/utils.js';

const UUID_KEY = 'relaido_uuid';
const DEFAULT_USER_AGENT = window.navigator.userAgent;
const MOBILE_USER_AGENT = 'Mozilla/5.0 (iPhone; CPU iPhone OS 13_3_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.0.5 Mobile/15E148 Safari/604.1';

const setUADefault = () => { window.navigator.__defineGetter__('userAgent', function () { return DEFAULT_USER_AGENT }) };
const setUAMobile = () => { window.navigator.__defineGetter__('userAgent', function () { return MOBILE_USER_AGENT }) };

describe('RelaidoAdapter', function () {
  const relaido_uuid = 'hogehoge';
  let bidRequest;
  let bidderRequest;
  let serverResponse;
  let serverRequest;

  beforeEach(function () {
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
      transactionId: '5c2d064c-7b76-42e8-a383-983603afdc45',
      bidRequestsCount: 1,
      bidderRequestsCount: 1,
      bidderWinsCount: 0
    };
    bidderRequest = {
      timeout: 1000,
      refererInfo: {
        referer: 'https://publisher.com/home'
      }
    };
    serverResponse = {
      body: {
        status: 'ok',
        price: 500,
        model: 'vcpm',
        currency: 'JPY',
        creativeId: 1000,
        uuid: relaido_uuid,
        vast: '<VAST version="3.0"><Ad><InLine></InLine></Ad></VAST>',
        playerUrl: 'https://relaido/player.js',
        syncUrl: 'https://relaido/sync.html'
      }
    };
    serverRequest = {
      method: 'GET',
      bidId: bidRequest.bidId,
      width: bidRequest.mediaTypes.video.playerSize[0][0],
      height: bidRequest.mediaTypes.video.playerSize[0][1],
      mediaType: 'video',
    };
    localStorage.setItem(UUID_KEY, relaido_uuid);
  });

  describe('spec.isBidRequestValid', function () {
    it('should return true when the required params are passed by video', function () {
      expect(spec.isBidRequestValid(bidRequest)).to.equal(true);
    });

    it('should return true when the required params are passed by banner', function () {
      setUAMobile();
      bidRequest.mediaTypes = {
        banner: {
          sizes: [
            [300, 250]
          ]
        }
      };
      expect(spec.isBidRequestValid(bidRequest)).to.equal(true);
      setUADefault();
    });

    it('should return false when the uuid are missing', function () {
      localStorage.removeItem(UUID_KEY);
      const result = !!(utils.isSafariBrowser());
      expect(spec.isBidRequestValid(bidRequest)).to.equal(result);
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
      setUAMobile();
      bidRequest.mediaTypes = {
        banner: {}
      };
      expect(spec.isBidRequestValid(bidRequest)).to.equal(false);
      setUADefault();
    });

    it('should return false when the non-mobile', function () {
      bidRequest.mediaTypes = {
        banner: {
          sizes: [
            [300, 250]
          ]
        }
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
      expect(bidRequests).to.have.lengthOf(1);
      const request = bidRequests[0];
      expect(request.method).to.equal('GET');
      expect(request.url).to.equal('https://api.relaido.jp/vast/v1/out/bid/100000');
      expect(request.bidId).to.equal(bidRequest.bidId);
      expect(request.width).to.equal(bidRequest.mediaTypes.video.playerSize[0][0]);
      expect(request.height).to.equal(bidRequest.mediaTypes.video.playerSize[0][1]);
      expect(request.mediaType).to.equal('video');
      expect(request.data.ref).to.equal(bidderRequest.refererInfo.referer);
      expect(request.data.timeout_ms).to.equal(bidderRequest.timeout);
      expect(request.data.ad_unit_code).to.equal(bidRequest.adUnitCode);
      expect(request.data.auction_id).to.equal(bidRequest.auctionId);
      expect(request.data.bidder).to.equal(bidRequest.bidder);
      expect(request.data.bidder_request_id).to.equal(bidRequest.bidderRequestId);
      expect(request.data.bid_requests_count).to.equal(bidRequest.bidRequestsCount);
      expect(request.data.bid_id).to.equal(bidRequest.bidId);
      expect(request.data.transaction_id).to.equal(bidRequest.transactionId);
      expect(request.data.media_type).to.equal('video');
      expect(request.data.uuid).to.equal(relaido_uuid);
      expect(request.data.width).to.equal(bidRequest.mediaTypes.video.playerSize[0][0]);
      expect(request.data.height).to.equal(bidRequest.mediaTypes.video.playerSize[0][1]);
    });

    it('should build bid requests by banner', function () {
      bidRequest.mediaTypes = {
        banner: {
          sizes: [
            [640, 360]
          ]
        }
      };
      const bidRequests = spec.buildRequests([bidRequest], bidderRequest);
      expect(bidRequests).to.have.lengthOf(1);
      const request = bidRequests[0];
      expect(request.mediaType).to.equal('banner');
    });

    it('The referrer should be the last', function () {
      const bidRequests = spec.buildRequests([bidRequest], bidderRequest);
      expect(bidRequests).to.have.lengthOf(1);
      const request = bidRequests[0];
      const keys = Object.keys(request.data);
      expect(keys[0]).to.equal('version');
      expect(keys[keys.length - 1]).to.equal('ref');
    });
  });

  describe('spec.interpretResponse', function () {
    it('should build bid response by video', function () {
      const bidResponses = spec.interpretResponse(serverResponse, serverRequest);
      expect(bidResponses).to.have.lengthOf(1);
      const response = bidResponses[0];
      expect(response.requestId).to.equal(serverRequest.bidId);
      expect(response.width).to.equal(serverRequest.width);
      expect(response.height).to.equal(serverRequest.height);
      expect(response.cpm).to.equal(serverResponse.body.price);
      expect(response.currency).to.equal(serverResponse.body.currency);
      expect(response.creativeId).to.equal(serverResponse.body.creativeId);
      expect(response.vastXml).to.equal(serverResponse.body.vast);
      expect(response.ad).to.be.undefined;
    });

    it('should build bid response by banner', function () {
      serverRequest.mediaType = 'banner';
      const bidResponses = spec.interpretResponse(serverResponse, serverRequest);
      expect(bidResponses).to.have.lengthOf(1);
      const response = bidResponses[0];
      expect(response.requestId).to.equal(serverRequest.bidId);
      expect(response.width).to.equal(serverRequest.width);
      expect(response.height).to.equal(serverRequest.height);
      expect(response.cpm).to.equal(serverResponse.body.price);
      expect(response.currency).to.equal(serverResponse.body.currency);
      expect(response.creativeId).to.equal(serverResponse.body.creativeId);
      expect(response.vastXml).to.be.undefined;
      expect(response.ad).to.include(`<div id="rop-prebid">`);
      expect(response.ad).to.include(`<script src="https://relaido/player.js"></script>`);
      expect(response.ad).to.include(`window.RelaidoPlayer.renderAd`);
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
        url: serverResponse.body.syncUrl
      }]);
    });

    it('should choose iframe sync urls if serverResponse are empty', function () {
      let userSyncs = spec.getUserSyncs({iframeEnabled: true}, []);
      expect(userSyncs).to.deep.equal([{
        type: 'iframe',
        url: 'https://api.relaido.jp/tr/v1/prebid/sync.html'
      }]);
    });

    it('should choose iframe sync urls if syncUrl are undefined', function () {
      serverResponse.body.syncUrl = undefined;
      let userSyncs = spec.getUserSyncs({iframeEnabled: true}, [serverResponse]);
      expect(userSyncs).to.deep.equal([{
        type: 'iframe',
        url: 'https://api.relaido.jp/tr/v1/prebid/sync.html'
      }]);
    });

    it('should return empty if iframeEnabled are false', function () {
      let userSyncs = spec.getUserSyncs({iframeEnabled: false}, [serverResponse]);
      expect(userSyncs).to.have.lengthOf(0);
    });
  });

  describe('spec.onBidWon', function () {
    let stub;
    beforeEach(() => {
      stub = sinon.stub(utils, 'triggerPixel');
    });
    afterEach(() => {
      stub.restore();
    });

    it('Should create nurl pixel if bid nurl', function () {
      let bid = {
        bidder: bidRequest.bidder,
        creativeId: serverResponse.body.creativeId,
        cpm: serverResponse.body.price,
        params: [bidRequest.params],
        auctionId: bidRequest.auctionId,
        requestId: bidRequest.bidId,
        adId: '3b286a4db7031f',
        adUnitCode: bidRequest.adUnitCode,
        ref: window.location.href,
      }
      spec.onBidWon(bid);
      const parser = utils.parseUrl(stub.getCall(0).args[0]);
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
    let stub;
    beforeEach(() => {
      stub = sinon.stub(utils, 'triggerPixel');
    });
    afterEach(() => {
      stub.restore();
    });

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
      const parser = utils.parseUrl(stub.getCall(0).args[0]);
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
