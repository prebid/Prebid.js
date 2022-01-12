import { assert } from 'chai';
import { trackInstreamDeliveredImpressions } from 'modules/instreamTracking.js';
import { config } from 'src/config.js';
import * as events from 'src/events.js';
import * as utils from 'src/utils.js';
import * as sinon from 'sinon';
import { INSTREAM, OUTSTREAM } from 'src/video.js';

const BIDDER_CODE = 'sampleBidder';
const VIDEO_CACHE_KEY = '4cf395af-8fee-4960-af0e-88d44e399f14';

let sandbox;

function enableInstreamTracking(regex) {
  let configStub = sandbox.stub(config, 'getConfig');
  configStub.withArgs('instreamTracking').returns(Object.assign(
    {
      enabled: true,
      maxWindow: 10,
      pollingFreq: 0
    },
    regex && {urlPattern: regex},
  ));
}

function mockPerformanceApi({adServerCallSent, videoPresent}) {
  let performanceStub = sandbox.stub(window.performance, 'getEntriesByType');
  let entries = [{
    name: 'https://domain.com/img.png',
    initiatorType: 'img'
  }, {
    name: 'https://domain.com/script.js',
    initiatorType: 'script'
  }, {
    name: 'https://domain.com/xhr',
    initiatorType: 'xmlhttprequest'
  }, {
    name: 'https://domain.com/fetch',
    initiatorType: 'fetch'
  }];

  if (adServerCallSent || videoPresent) {
    entries.push({
      name: 'https://adserver.com/ads?custom_params=hb_uuid%3D' + VIDEO_CACHE_KEY + '%26pos%3D' + VIDEO_CACHE_KEY,
      initiatorType: 'xmlhttprequest'
    });
  }

  if (videoPresent) {
    entries.push({
      name: 'https://prebid-vast-cache.com/cache?key=' + VIDEO_CACHE_KEY,
      initiatorType: 'xmlhttprequest'
    });
  }

  performanceStub.withArgs('resource').returns(entries);
}

function mockBidResponse(adUnit, requestId) {
  const bid = {
    'adUnitCod': adUnit.code,
    'bidderCode': adUnit.bids[0].bidder,
    'width': adUnit.sizes[0][0],
    'height': adUnit.sizes[0][1],
    'statusMessage': 'Bid available',
    'adId': 'id',
    'requestId': requestId,
    'source': 'client',
    'no_bid': false,
    'cpm': '1.1495',
    'ttl': 180,
    'creativeId': 'id',
    'netRevenue': true,
    'currency': 'USD',
  }
  if (adUnit.mediaTypes.video) {
    bid.videoCacheKey = VIDEO_CACHE_KEY;
  }
  return bid
}

function mockBidRequest(adUnit, bidResponse) {
  return {
    'bidderCode': bidResponse.bidderCode,
    'auctionId': '20882439e3238c',
    'bidderRequestId': 'bidderRequestId',
    'bids': [
      {
        'adUnitCode': adUnit.code,
        'mediaTypes': adUnit.mediaTypes,
        'bidder': bidResponse.bidderCode,
        'bidId': bidResponse.requestId,
        'sizes': adUnit.sizes,
        'params': adUnit.bids[0].params,
        'bidderRequestId': 'bidderRequestId',
        'auctionId': '20882439e3238c',
      }
    ],
    'auctionStart': 1505250713622,
    'timeout': 3000
  };
}

function getMockInput(mediaType) {
  const bannerAdUnit = {
    code: 'banner',
    mediaTypes: {banner: {sizes: [[300, 250]]}},
    sizes: [[300, 250]],
    bids: [{bidder: BIDDER_CODE, params: {placementId: 'id'}}]
  };
  const outStreamAdUnit = {
    code: 'video-' + OUTSTREAM,
    mediaTypes: {video: {playerSize: [640, 480], context: OUTSTREAM}},
    sizes: [[640, 480]],
    bids: [{bidder: BIDDER_CODE, params: {placementId: 'id'}}]
  };
  const inStreamAdUnit = {
    code: 'video-' + INSTREAM,
    mediaTypes: {video: {playerSize: [640, 480], context: INSTREAM}},
    sizes: [[640, 480]],
    bids: [{bidder: BIDDER_CODE, params: {placementId: 'id'}}]
  };

  let adUnit;
  switch (mediaType) {
    default:
    case 'banner':
      adUnit = bannerAdUnit;
      break;
    case OUTSTREAM:
      adUnit = outStreamAdUnit;
      break;
    case INSTREAM:
      adUnit = inStreamAdUnit;
      break;
  }

  const bidResponse = mockBidResponse(adUnit, utils.getUniqueIdentifierStr());
  const bidderRequest = mockBidRequest(adUnit, bidResponse);
  return {
    adUnits: [adUnit],
    bidsReceived: [bidResponse],
    bidderRequests: [bidderRequest],
  };
}

describe('Instream Tracking', function () {
  beforeEach(function () {
    sandbox = sinon.sandbox.create();
  });

  afterEach(function () {
    sandbox.restore();
  });

  describe('gaurd checks', function () {
    it('skip if tracking not enable', function () {
      sandbox.stub(config, 'getConfig').withArgs('instreamTracking').returns(undefined);
      assert.isNotOk(trackInstreamDeliveredImpressions({
        adUnits: [],
        bidsReceived: [],
        bidderRequests: []
      }), 'should not start tracking when tracking is disabled');
    });

    it('run only if instream bids are present', function () {
      enableInstreamTracking();
      assert.isNotOk(trackInstreamDeliveredImpressions({adUnits: [], bidsReceived: [], bidderRequests: []}));
    });

    it('checks for instream bids', function (done) {
      enableInstreamTracking();
      assert.isNotOk(trackInstreamDeliveredImpressions(getMockInput('banner')), 'should not start tracking when banner bids are present')
      assert.isNotOk(trackInstreamDeliveredImpressions(getMockInput(OUTSTREAM)), 'should not start tracking when outstream bids are present')
      mockPerformanceApi({});
      assert.isOk(trackInstreamDeliveredImpressions(getMockInput(INSTREAM)), 'should start tracking when instream bids are present')
      setTimeout(done, 10);
    });
  });

  describe('instream bids check', function () {
    let spyEventsOn;

    beforeEach(function () {
      spyEventsOn = sandbox.spy(events, 'emit');
    });

    it('BID WON event is not emitted when no video cache key entries are present', function (done) {
      enableInstreamTracking();
      trackInstreamDeliveredImpressions(getMockInput(INSTREAM));
      mockPerformanceApi({});
      setTimeout(function () {
        assert.isNotOk(spyEventsOn.calledWith('bidWon'))
        done()
      }, 10);
    });

    it('BID WON event is not emitted when ad server call is sent', function (done) {
      enableInstreamTracking();
      mockPerformanceApi({adServerCallSent: true});
      setTimeout(function () {
        assert.isNotOk(spyEventsOn.calledWith('bidWon'))
        done()
      }, 10);
    });

    it('BID WON event is emitted when video cache key is present', function (done) {
      enableInstreamTracking(/cache/);
      const bidWonSpy = sandbox.spy();
      events.on('bidWon', bidWonSpy);
      mockPerformanceApi({adServerCallSent: true, videoPresent: true});

      trackInstreamDeliveredImpressions(getMockInput(INSTREAM));
      setTimeout(function () {
        assert.isOk(spyEventsOn.calledWith('bidWon'))
        assert(bidWonSpy.args[0][0].videoCacheKey, VIDEO_CACHE_KEY, 'Video cache key in bid won should be equal to video cache call');
        done()
      }, 10);
    });
  });
});
