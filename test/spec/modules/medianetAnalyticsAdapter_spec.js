import {expect} from 'chai';
import medianetAnalytics from 'modules/medianetAnalyticsAdapter.js';
import * as utils from 'src/utils.js';
import {EVENTS, REJECTION_REASON} from 'src/constants.js';
import * as events from 'src/events.js';
import {clearEvents} from 'src/events.js';
import {deepAccess} from 'src/utils.js';
import 'src/prebid.js';
import {config} from 'src/config.js';

import {getGlobal} from 'src/prebidGlobal.js';
import sinon from "sinon";
import * as mnUtils from '../../../libraries/medianetUtils/utils.js';

const {
  AUCTION_INIT,
  BID_REQUESTED,
  BID_RESPONSE,
  NO_BID,
  BID_TIMEOUT,
  AUCTION_END,
  SET_TARGETING,
  BID_WON,
  AD_RENDER_FAILED,
  AD_RENDER_SUCCEEDED,
  STALE_RENDER,
  BID_REJECTED
} = EVENTS;

function createBidResponse(bidderCode, requestId, cpm, adId = '3e6e4bce5c8fb3') {
  return {
    bidderCode,
    width: 300,
    height: 250,
    adId,
    requestId,
    mediaType: 'banner',
    source: 'client',
    ext: {pvid: 123, crid: '321'},
    no_bid: false,
    cpm,
    ad: 'AD_CODE',
    ttl: 180,
    creativeId: 'Test1',
    netRevenue: true,
    currency: 'USD',
    dfp_id: 'div-gpt-ad-1460505748561-0',
    originalCpm: cpm,
    originalCurrency: 'USD',
    floorData: {floorValue: 1.10, floorRule: 'banner'},
    auctionId: '8e0d5245-deb3-406c-96ca-9b609e077ff7',
    snm: 'SUCCESS',
    responseTimestamp: 1584563606009,
    requestTimestamp: 1584563605743,
    bidder: 'medianet',
    adUnitCode: 'div-gpt-ad-1460505748561-0',
    timeToRespond: 266,
    pbLg: '2.00',
    pbMg: '2.20',
    pbHg: '2.29',
    pbAg: '2.25',
    pbDg: '2.29',
    pbCg: '2.00',
    size: '300x250',
    adserverTargeting: {
      hb_bidder: 'medianet',
      hb_adid: adId,
      hb_pb: '1.8',
      hb_size: '300x250',
      hb_source: 'client',
      hb_format: 'banner',
      prebid_test: 1
    },
    params: [{cid: 'test123', crid: '451466393'}]
  };
}

function createBidRequest(bidderCode, auctionId, bidId, adUnits) {
  return {
    bidderCode,
    auctionId,
    bids: adUnits.map(adUnit => ({
      bidder: bidderCode,
      params: {cid: 'TEST_CID', crid: '451466393'},
      mediaTypes: adUnit.mediaTypes,
      adUnitCode: adUnit.code,
      sizes: [(adUnit.mediaTypes.banner?.sizes || []), (adUnit.mediaTypes.native?.image?.sizes || []), (adUnit.mediaTypes.video?.playerSize || [])],
      bidId,
      auctionId,
      src: 'client'
    })),
    auctionStart: Date.now(),
    timeout: 6000,
    uspConsent: '1YY',
    start: Date.now()
  };
}

function createNoBid(bidder, params) {
  return {
    bidder,
    params,
    mediaTypes: {banner: {sizes: [[300, 250]], ext: ['asdads']}},
    adUnitCode: 'div-gpt-ad-1460505748561-0',
    transactionId: '303fa0c6-682f-4aea-8e4a-dc68f0d5c7d5',
    sizes: [[300, 250], [300, 600]],
    bidId: '28248b0e6aece2',
    bidderRequestId: '13fccf3809fe43',
    auctionId: '8e0d5245-deb3-406c-96ca-9b609e077ff7',
    src: 'client'
  };
}

function createBidTimeout(bidId, bidder, auctionId, params) {
  return [{
    bidId: '28248b0e6aece2',
    bidder: 'medianet',
    adUnitCode: 'div-gpt-ad-1460505748561-0',
    auctionId,
    params,
    timeout: 6
  }];
}

function createBidWon(bidderCode, adId, requestId, cpm) {
  return {
    bidderCode,
    width: 300,
    height: 250,
    statusMessage: 'Bid available',
    adId,
    requestId,
    mediaType: 'banner',
    source: 'client',
    no_bid: false,
    cpm,
    ad: 'AD_CODE',
    ttl: 180,
    creativeId: 'Test1',
    netRevenue: true,
    currency: 'USD',
    dfp_id: 'div-gpt-ad-1460505748561-0',
    originalCpm: 1.1495,
    originalCurrency: 'USD',
    auctionId: '8e0d5245-deb3-406c-96ca-9b609e077ff7',
    responseTimestamp: 1584563606009,
    requestTimestamp: 1584563605743,
    bidder: 'medianet',
    adUnitCode: 'div-gpt-ad-1460505748561-0',
    snm: 'SUCCESS',
    timeToRespond: 266,
    pbLg: '2.00',
    pbMg: '2.20',
    pbHg: '2.29',
    pbAg: '2.25',
    pbDg: '2.29',
    pbCg: '2.00',
    size: '300x250',
    adserverTargeting: {
      hb_bidder: 'medianet',
      hb_adid: adId,
      hb_pb: '2.00',
      hb_size: '300x250',
      hb_source: 'client',
      hb_format: 'banner',
      prebid_test: 1
    },
    status: 'rendered',
    params: [{cid: 'test123', crid: '451466393'}]
  };
}

const BANNER_AD_UNIT = {code: 'div-gpt-ad-1460505748561-0', mediaTypes: {banner: {sizes: [[300, 250]]}}};
const VIDEO_AD_UNIT = {
  code: 'div-gpt-ad-1460505748561-0',
  mediaTypes: {video: {playerSize: [640, 480], context: 'outstream'}}
};
const INSTREAM_VIDEO_AD_UNIT = {
  code: 'div-gpt-ad-1460505748561-0',
  mediaTypes: {video: {playerSize: [640, 480], context: 'instream'}}
};
const BANNER_NATIVE_AD_UNIT = {
  code: 'div-gpt-ad-1460505748561-0',
  mediaTypes: {banner: {sizes: [[300, 250]]}, native: {image: {required: true, sizes: [150, 50]}}}
};
const BANNER_NATIVE_VIDEO_AD_UNIT = {
  code: 'div-gpt-ad-1460505748561-0',
  mediaTypes: {
    banner: {sizes: [[300, 250]]},
    video: {playerSize: [640, 480], context: 'outstream'},
    native: {image: {required: true, sizes: [150, 50]}, title: {required: true, len: 80}}
  }
};

function createS2SBidRequest(bidderCode, auctionId, bidId, adUnits) {
  const bidRequest = createBidRequest(bidderCode, auctionId, bidId, adUnits);
  // Update to mark as S2S
  bidRequest.src = 's2s';
  bidRequest.bids.forEach(bid => {
    bid.src = 's2s';
  });
  return bidRequest;
}

function createS2SBidResponse(bidderCode, requestId, cpm, adId = '3e6e4bce5c8fb3') {
  const bidResponse = createBidResponse(bidderCode, requestId, cpm, adId);
  // Update to mark as S2S
  bidResponse.source = 's2s';
  return bidResponse;
}

const MOCK = {
  AD_UNITS: [BANNER_NATIVE_AD_UNIT, VIDEO_AD_UNIT],
  AUCTION_INIT: {
    auctionId: '8e0d5245-deb3-406c-96ca-9b609e077ff7',
    timestamp: 1584563605739,
    timeout: 6000,
    bidderRequests: [{bids: [{floorData: {enforcements: {enforceJS: true}}}]}]
  },
  MNET_BID_REQUESTED: createBidRequest('medianet', '8e0d5245-deb3-406c-96ca-9b609e077ff7', '28248b0e6aece2', [BANNER_NATIVE_VIDEO_AD_UNIT]),
  MNET_BID_RESPONSE: createBidResponse('medianet', '28248b0e6aece2', 2.299),
  COMMON_REQ_ID_BID_REQUESTS: [
    createBidRequest('medianet', '8e0d5245-deb3-406c-96ca-9b609e077ff7', '28248b0e6aece2', [BANNER_AD_UNIT]),
    createBidRequest('appnexus', '8e0d5245-deb3-406c-96ca-9b609e077ff7', '28248b0e6aecd5', [BANNER_AD_UNIT])
  ],
  COMMON_REQ_ID_BID_RESPONSES: [
    createBidResponse('medianet', '28248b0e6aece2', 2.299, '3e6e4bce5c8fb3'),
    createBidResponse('appnexus', '28248b0e6aecd5', 1.299, '3e6e4bce5c8fb4')
  ],
  COMMON_REQ_ID_BID_RESPONSES_EQUAL_CPM: [
    createBidResponse('medianet', '28248b0e6aece2', 2.299, '3e6e4bce5c8fb3'),
    createBidResponse('medianet', '28248b0e6aece2', 2.299, '3e6e4bce5c8fb4')
  ],
  MULTI_BID_RESPONSES: [
    createBidResponse('medianet', '28248b0e6aece2', 2.299, '3e6e4bce5c8fb3'),
    Object.assign(createBidResponse('medianet', '28248b0e6aebecc', 3.299, '3e6e4bce5c8fb4'),
      {originalBidder: 'bidA2', originalRequestId: '28248b0e6aece2'}),
  ],
  MNET_NO_BID: createNoBid('medianet', {cid: 'test123', crid: '451466393', site: {}}),
  MNET_BID_TIMEOUT: createBidTimeout('28248b0e6aece2', 'medianet', '8e0d5245-deb3-406c-96ca-9b609e077ff7', [{
    cid: 'test123',
    crid: '451466393',
    site: {}
  }, {cid: '8CUX0H51P', crid: '451466393', site: {}}]),
  AUCTION_END: {
    auctionId: '8e0d5245-deb3-406c-96ca-9b609e077ff7',
    auctionEnd: 1584563605739,
    bidderRequests: [createBidRequest('medianet', '8e0d5245-deb3-406c-96ca-9b609e077ff7', '28248b0e6aece2', [BANNER_NATIVE_VIDEO_AD_UNIT])]
  },
  MNET_BID_WON: createBidWon('medianet', '3e6e4bce5c8fb3', '28248b0e6aece2', 2.299),
  BID_WON_UNKNOWN: createBidWon('appnexus', '3e6e4bce5c8fkk', '28248b0e6aecd5', 2.299),
  MNET_SET_TARGETING: {
    'div-gpt-ad-1460505748561-0': {
      prebid_test: '1',
      hb_format: 'banner',
      hb_source: 'client',
      hb_size: '300x250',
      hb_pb: '1.8',
      hb_adid: '3e6e4bce5c8fb3',
      hb_bidder: 'medianet',
      hb_format_medianet: 'banner',
      hb_source_medianet: 'client',
      hb_size_medianet: '300x250',
      hb_pb_medianet: '2.00',
      hb_adid_medianet: '3e6e4bce5c8fb3',
      hb_bidder_medianet: 'medianet'
    }
  },
  NO_BID_SET_TARGETING: {'div-gpt-ad-1460505748561-0': {}},
  // S2S mocks
  MNET_S2S_BID_REQUESTED: createS2SBidRequest('medianet', '8e0d5245-deb3-406c-96ca-9b609e077ff7', '28248b0e6aece2', [BANNER_AD_UNIT]),
  MNET_S2S_BID_RESPONSE: createS2SBidResponse('medianet', '28248b0e6aece2', 2.299),
  MNET_S2S_BID_WON: Object.assign({}, createBidWon('medianet', '3e6e4bce5c8fb3', '28248b0e6aece2', 2.299), {source: 's2s'}),
  MNET_S2S_SET_TARGETING: {
    'div-gpt-ad-1460505748561-0': {
      prebid_test: '1',
      hb_format: 'banner',
      hb_source: 's2s',
      hb_size: '300x250',
      hb_pb: '1.8',
      hb_adid: '3e6e4bce5c8fb3',
      hb_bidder: 'medianet',
      hb_format_medianet: 'banner',
      hb_source_medianet: 's2s',
      hb_size_medianet: '300x250',
      hb_pb_medianet: '2.00',
      hb_adid_medianet: '3e6e4bce5c8fb3',
      hb_bidder_medianet: 'medianet'
    }
  },
  // Currency conversion mocks
  MNET_JPY_BID_RESPONSE: Object.assign({}, createBidResponse('medianet', '28248b0e6aece2', 250, '3e6e4bce5c8fb5'), {
    currency: 'JPY',
    originalCurrency: 'JPY',
    originalCpm: 250
  })
};

function getQueryData(url, decode = false) {
  const queryArgs = url.split('?')[1].split('&');
  return queryArgs.reduce((data, arg) => {
    let [key, val] = arg.split('=');
    if (decode) {
      val = decodeURIComponent(val);
    }
    if (data[key] !== undefined) {
      if (!Array.isArray(data[key])) {
        data[key] = [data[key]];
      }
      data[key].push(val);
    } else {
      data[key] = val;
    }
    return data;
  }, {});
}

function waitForPromiseResolve(promise) {
  return new Promise((resolve, reject) => {
    promise.then(resolve).catch(reject);
  });
}

function performNoBidAuction() {
  events.emit(AUCTION_INIT, Object.assign({}, MOCK.AUCTION_INIT, {adUnits: MOCK.AD_UNITS}));
  events.emit(BID_REQUESTED, MOCK.MNET_BID_REQUESTED);
  events.emit(NO_BID, MOCK.MNET_NO_BID);
  events.emit(AUCTION_END, Object.assign({}, MOCK.AUCTION_END, {bidderRequests: [MOCK.MNET_BID_REQUESTED]}));
  events.emit(SET_TARGETING, MOCK.MNET_SET_TARGETING);
}

function performBidWonAuction() {
  events.emit(AUCTION_INIT, Object.assign({}, MOCK.AUCTION_INIT, {adUnits: MOCK.AD_UNITS}));
  events.emit(BID_REQUESTED, MOCK.MNET_BID_REQUESTED);
  events.emit(BID_RESPONSE, MOCK.MNET_BID_RESPONSE);
  events.emit(SET_TARGETING, MOCK.MNET_SET_TARGETING);
  events.emit(BID_WON, MOCK.MNET_BID_WON);
}

function performBidTimeoutAuction() {
  events.emit(AUCTION_INIT, Object.assign({}, MOCK.AUCTION_INIT, {adUnits: MOCK.AD_UNITS}));
  events.emit(BID_REQUESTED, MOCK.MNET_BID_REQUESTED);
  events.emit(BID_TIMEOUT, MOCK.MNET_BID_TIMEOUT);
  events.emit(AUCTION_END, Object.assign({}, MOCK.AUCTION_END, {bidderRequests: [MOCK.MNET_BID_REQUESTED]}));
  events.emit(SET_TARGETING, MOCK.MNET_SET_TARGETING);
}

function performAuctionWithSameRequestIdBids(bidRespArray) {
  events.emit(AUCTION_INIT, Object.assign({}, MOCK.AUCTION_INIT, {adUnits: MOCK.AD_UNITS}));
  events.emit(BID_REQUESTED, MOCK.MNET_BID_REQUESTED);
  bidRespArray.forEach(bidResp => events.emit(BID_RESPONSE, bidResp));
  events.emit(AUCTION_END, Object.assign({}, MOCK.AUCTION_END, {bidderRequests: [MOCK.MNET_BID_REQUESTED]}));
  events.emit(SET_TARGETING, MOCK.MNET_SET_TARGETING);
  events.emit(BID_WON, MOCK.MNET_BID_WON);
}

function performAuctionNoWin() {
  events.emit(AUCTION_INIT, Object.assign({}, MOCK.AUCTION_INIT, {adUnits: MOCK.AD_UNITS}));
  MOCK.COMMON_REQ_ID_BID_REQUESTS.forEach(bidReq => events.emit(BID_REQUESTED, bidReq));
  MOCK.COMMON_REQ_ID_BID_RESPONSES.forEach(bidResp => events.emit(BID_RESPONSE, bidResp));
  events.emit(AUCTION_END, Object.assign({}, MOCK.AUCTION_END, {bidderRequests: MOCK.COMMON_REQ_ID_BID_REQUESTS}));
  events.emit(SET_TARGETING, MOCK.MNET_SET_TARGETING);
}

function performMultiBidAuction() {
  const bidRequest = createBidRequest('medianet', '8e0d5245-deb3-406c-96ca-9b609e077ff7', '28248b0e6aece2', [BANNER_AD_UNIT]);
  events.emit(AUCTION_INIT, Object.assign({}, MOCK.AUCTION_INIT, {adUnits: MOCK.AD_UNITS}));
  events.emit(BID_REQUESTED, bidRequest);
  MOCK.MULTI_BID_RESPONSES.forEach(bidResp => events.emit(BID_RESPONSE, bidResp));
  events.emit(AUCTION_END, Object.assign({}, MOCK.AUCTION_END, {bidderRequests: [bidRequest]}));
  events.emit(SET_TARGETING, MOCK.MNET_SET_TARGETING);
}

function performBidRejectedAuction() {
  events.emit(AUCTION_INIT, Object.assign({}, MOCK.AUCTION_INIT, {adUnits: MOCK.AD_UNITS}));
  events.emit(BID_REQUESTED, MOCK.MNET_BID_REQUESTED);
  events.emit(BID_RESPONSE, MOCK.MNET_BID_RESPONSE);
  events.emit(BID_REJECTED, Object.assign({}, MOCK.MNET_BID_RESPONSE, {
    rejectionReason: REJECTION_REASON.FLOOR_NOT_MET,
  }));
  events.emit(AUCTION_END, Object.assign({}, MOCK.AUCTION_END, {bidderRequests: [MOCK.MNET_BID_REQUESTED]}));
}

function performS2SAuction() {
  events.emit(AUCTION_INIT, Object.assign({}, MOCK.AUCTION_INIT, {adUnits: MOCK.AD_UNITS}));
  events.emit(BID_REQUESTED, MOCK.MNET_S2S_BID_REQUESTED);
  events.emit(BID_RESPONSE, MOCK.MNET_S2S_BID_RESPONSE);
  events.emit(AUCTION_END, Object.assign({}, MOCK.AUCTION_END, {bidderRequests: [MOCK.MNET_S2S_BID_REQUESTED]}));
  events.emit(SET_TARGETING, MOCK.MNET_S2S_SET_TARGETING);
  events.emit(BID_WON, MOCK.MNET_S2S_BID_WON);
}

function performCurrencyConversionAuction() {
  events.emit(AUCTION_INIT, Object.assign({}, MOCK.AUCTION_INIT, {adUnits: MOCK.AD_UNITS}));
  events.emit(BID_REQUESTED, MOCK.MNET_BID_REQUESTED);
  events.emit(BID_RESPONSE, MOCK.MNET_JPY_BID_RESPONSE);
  events.emit(AUCTION_END, Object.assign({}, MOCK.AUCTION_END, {bidderRequests: [MOCK.MNET_BID_REQUESTED]}));
}

describe('Media.net Analytics Adapter', function () {
  let sandbox;
  let clock;
  const CUSTOMER_ID = 'test123';
  const VALID_CONFIGURATION = {
    options: {
      cid: CUSTOMER_ID
    }
  }

  before(() => {
    clearEvents();
  });

  beforeEach(function () {
    sandbox = sinon.createSandbox();
    clock = sinon.useFakeTimers();
  });

  afterEach(function () {
    sandbox.restore();
    clock.restore();
  });

  describe('Configuration', function () {
    it('should log error if publisher id is not passed', function () {
      sandbox.stub(utils, 'logError');

      medianetAnalytics.enableAnalytics();
      expect(
        utils.logError.calledWith(
          'Media.net Analytics adapter: cid is required.'
        )
      ).to.be.true;
    });

    it('should not log error if valid config is passed', function () {
      sandbox.stub(utils, 'logError');

      medianetAnalytics.enableAnalytics(VALID_CONFIGURATION);
      expect(utils.logError.called).to.equal(false);
      medianetAnalytics.disableAnalytics();
    });
  });

  describe('VAST Tracking', function () {
    beforeEach(function () {
      medianetAnalytics.enableAnalytics({
        options: {
          cid: 'test123'
        }
      });
      medianetAnalytics.clearlogsQueue();
      // Set config required for vastTrackerHandler
      config.setConfig({
        cache: {
          url: 'https://test.cache.url/endpoint'
        }
      });
    });

    afterEach(function () {
      medianetAnalytics.disableAnalytics();
      config.resetConfig();
    });

    it('should generate valid tracking URL for video bids', function () {
      const VIDEO_AUCTION = Object.assign({}, MOCK.AUCTION_INIT, {adUnits: [INSTREAM_VIDEO_AD_UNIT]});
      const VIDEO_BID_REQUESTED = createBidRequest('medianet', '8e0d5245-deb3-406c-96ca-9b609e077ff7', '28248b0e6aece2', [INSTREAM_VIDEO_AD_UNIT]);
      const videoBidResponse = Object.assign({}, MOCK.MNET_BID_RESPONSE, {
        mediaType: 'video',
        playerSize: [640, 480]
      });

      events.emit(AUCTION_INIT, VIDEO_AUCTION);
      events.emit(BID_REQUESTED, VIDEO_BID_REQUESTED);
      events.emit(BID_RESPONSE, videoBidResponse);

      const trackers = medianetAnalytics.getVastTrackerHandler()(videoBidResponse, {
        auction: VIDEO_AUCTION,
        bidRequest: VIDEO_BID_REQUESTED.bids[0]
      });

      expect(trackers).to.be.an('array');
      expect(trackers.length).to.equal(1);
      expect(trackers[0].event).to.equal('impressions');
      expect(trackers[0].url).to.include('https://');

      const urlData = getQueryData(trackers[0].url);
      expect(urlData.lgtp).to.equal('RA');
      expect(urlData.pvnm).to.include('medianet');
      expect(urlData.bdp).to.equal('2.299');
      expect(urlData.vplcmtt).to.equal('1');
    });

    it('should return error tracker when auction is missing', function () {
      const videoBidResponse = Object.assign({}, MOCK.MNET_BID_RESPONSE, {
        mediaType: 'video',
        vastUrl: 'https://vast.example.com/vast.xml',
        videoCacheKey: 'video_cache_123',
        auctionId: 'missing_auction_id'  // This auction ID doesn't exist
      });

      const trackers = medianetAnalytics.getVastTrackerHandler()(videoBidResponse, {
        bidRequest: MOCK.MNET_BID_REQUESTED.bids[0],
        auction: MOCK.AUCTION_INIT
      });

      expect(trackers).to.be.an('array');
      expect(trackers.length).to.equal(1);
      expect(trackers[0].url).to.include('vast_tracker_handler_missing_auction');
    });

    it('should return error tracker when bidrequest is missing', function () {
      const VIDEO_AUCTION = Object.assign({}, MOCK.AUCTION_INIT, {adUnits: [INSTREAM_VIDEO_AD_UNIT]});
      const VIDEO_BID_REQUESTED = createBidRequest('medianet', '8e0d5245-deb3-406c-96ca-9b609e077ff7', '28248b0e6aece2', [INSTREAM_VIDEO_AD_UNIT]);
      const videoBidResponse = Object.assign({}, MOCK.MNET_BID_RESPONSE, {
        mediaType: 'video',
        playerSize: [640, 480],
      });

      events.emit(AUCTION_INIT, VIDEO_AUCTION);

      const trackers = medianetAnalytics.getVastTrackerHandler()(videoBidResponse, {
        auction: VIDEO_AUCTION,
        bidRequest: VIDEO_BID_REQUESTED.bids[0]
      });
      expect(trackers).to.be.an('array');
      expect(trackers.length).to.equal(1);
      expect(trackers[0].url).to.include('missing_bidrequest');
    });
  });

  describe('Events', function () {
    beforeEach(function () {
      sandbox.stub(mnUtils, 'onHidden').callsFake(() => {
      })
      medianetAnalytics.enableAnalytics({
        options: {
          cid: 'test123'
        }
      });
      medianetAnalytics.clearlogsQueue();
    });
    afterEach(function () {
      sandbox.restore();
      medianetAnalytics.disableAnalytics();
    });

    it('can handle multi bid module', function (done) {
      performMultiBidAuction();
      clock.tick(2000);

      waitForPromiseResolve(Promise.resolve()).then(() => {
        const queue = medianetAnalytics.getlogsQueue();
        expect(queue.length).equals(1);
        const multiBidLog = queue.map((log) => getQueryData(log, true))[0];
        expect(multiBidLog.pvnm).to.have.ordered.members(['-2', 'medianet', 'medianet']);
        expect(multiBidLog.status).to.have.ordered.members(['1', '1', '1']);
        done();
      }).catch(done);
    });

    it('should have all applicable sizes in request', function (done) {
      performNoBidAuction();
      clock.tick(2000);

      waitForPromiseResolve(Promise.resolve()).then(() => {
        const noBidLog = medianetAnalytics.getlogsQueue().map((log) => getQueryData(log))[0];
        expect(noBidLog.mtype).to.have.ordered.members([encodeURIComponent('banner|native|video'), encodeURIComponent('banner|video|native')]);
        expect(noBidLog.szs).to.have.ordered.members([encodeURIComponent('300x250|1x1|640x480'), encodeURIComponent('300x250|1x1|640x480')]);
        expect(noBidLog.vplcmtt).to.equal('6');
        done();
      }).catch(done);
    });

    it('AP log should fire only once', function (done) {
      performNoBidAuction();
      clock.tick(2000);

      waitForPromiseResolve(Promise.resolve()).then(() => {
        const logs = medianetAnalytics.getlogsQueue().map((log) => getQueryData(log, true));
        expect(logs[0]).to.exist;
        expect(logs[0].lgtp).to.equal('APPR');
        done();
      }).catch(done);
    });

    it('should have no bid status', function (done) {
      performNoBidAuction();
      clock.tick(2000);

      waitForPromiseResolve(Promise.resolve()).then(() => {
        let noBidLog = medianetAnalytics.getlogsQueue().map((log) => getQueryData(log));
        noBidLog = noBidLog[0];

        expect(noBidLog.pvnm).to.have.ordered.members(['-2', 'medianet']);
        expect(noBidLog.iwb).to.have.ordered.members(['0', '0']);
        expect(noBidLog.status).to.have.ordered.members(['1', '2']);
        expect(noBidLog.src).to.have.ordered.members(['client', 'client']);
        expect(noBidLog.curr).to.have.ordered.members(['', '']);
        expect(noBidLog.mtype).to.have.ordered.members([encodeURIComponent('banner|native|video'), encodeURIComponent('banner|video|native')]);
        expect(noBidLog.ogbdp).to.have.ordered.members(['', '']);
        expect(noBidLog.mpvid).to.have.ordered.members(['', '']);
        expect(noBidLog.crid).to.have.ordered.members(['', '451466393']);
        done();
      }).catch(done);
    });

    it('should have timeout status', function (done) {
      performBidTimeoutAuction();
      clock.tick(2000);

      waitForPromiseResolve(Promise.resolve()).then(() => {
        let timeoutLog = medianetAnalytics.getlogsQueue().map((log) => getQueryData(log));
        timeoutLog = timeoutLog[0];

        expect(timeoutLog.pvnm).to.have.ordered.members(['-2', 'medianet']);
        expect(timeoutLog.iwb).to.have.ordered.members(['0', '0']);
        expect(timeoutLog.status).to.have.ordered.members(['3', '3']);
        expect(timeoutLog.src).to.have.ordered.members(['client', 'client']);
        expect(timeoutLog.curr).to.have.ordered.members(['', '']);
        expect(timeoutLog.mtype).to.have.ordered.members([encodeURIComponent('banner|native|video'), encodeURIComponent('banner|video|native')]);
        expect(timeoutLog.ogbdp).to.have.ordered.members(['', '']);
        expect(timeoutLog.mpvid).to.have.ordered.members(['', '']);
        expect(timeoutLog.crid).to.have.ordered.members(['', '451466393']);
        done();
      }).catch(done);
    });

    it('should have correct bid values after and before bidCmpAdjustment', function (done) {
      const bidCopy = utils.deepClone(MOCK.MNET_BID_RESPONSE);
      bidCopy.cpm = bidCopy.originalCpm * 0.8; // Simulate bidCpmAdjustment

      // Emit events to simulate an auction
      events.emit(AUCTION_INIT, Object.assign({}, MOCK.AUCTION_INIT, {adUnits: MOCK.AD_UNITS}));
      events.emit(BID_REQUESTED, MOCK.MNET_BID_REQUESTED);
      events.emit(BID_RESPONSE, bidCopy);
      events.emit(AUCTION_END, MOCK.AUCTION_END);
      events.emit(SET_TARGETING, MOCK.MNET_SET_TARGETING);
      clock.tick(2000);

      waitForPromiseResolve(Promise.resolve()).then(() => {
        const adjustedLog = medianetAnalytics.getlogsQueue().map((log) => getQueryData(log))[0];

        expect(adjustedLog.bdp[1]).to.equal(String(bidCopy.cpm));
        expect(adjustedLog.ogbdp[1]).to.equal(String(bidCopy.originalCpm));
        expect(adjustedLog.cbdp[1]).to.equal(String(bidCopy.cpm));
        expect(adjustedLog.dfpbd[1]).to.equal(String(deepAccess(bidCopy, 'adserverTargeting.hb_pb')));
        done();
      }).catch(done);
    });

    it('should pick winning bid if multibids with same request id', function (done) {
      sandbox.stub(getGlobal(), 'getAdserverTargetingForAdUnitCode').returns({
        hb_pb: '2.299',
        hb_adid: '3e6e4bce5c8fb3',
        hb_pb_medianet: '2.299',
        hb_adid_medianet: '3e6e4bce5c8fb3',
        hb_pb_appnexus: '1.299',
        hb_adid_appnexus: '3e6e4bce5c8fb4',
      });
      performAuctionWithSameRequestIdBids(MOCK.COMMON_REQ_ID_BID_RESPONSES);
      clock.tick(2000);

      waitForPromiseResolve(Promise.resolve()).then(() => {
        const winningBid = medianetAnalytics.getlogsQueue().map((log) => getQueryData(log)).filter(log => log.winner === '1')[0];
        expect(winningBid.adid).equals('3e6e4bce5c8fb3');
        medianetAnalytics.clearlogsQueue();

        performAuctionWithSameRequestIdBids([...MOCK.COMMON_REQ_ID_BID_RESPONSES].reverse());
        clock.tick(2000);

        return waitForPromiseResolve(Promise.resolve());
      }).then(() => {
        const winningBid = medianetAnalytics.getlogsQueue().map((log) => getQueryData(log)).filter(log => log.winner === '1')[0];
        expect(winningBid.adid).equals('3e6e4bce5c8fb3');
        done();
      }).catch(done);
    });

    it('should pick winning bid if multibids with same request id and same time to respond', function (done) {
      performAuctionWithSameRequestIdBids(MOCK.COMMON_REQ_ID_BID_RESPONSES_EQUAL_CPM);
      clock.tick(2000);

      waitForPromiseResolve(Promise.resolve()).then(() => {
        const winningBid = medianetAnalytics.getlogsQueue().map((log) => getQueryData(log)).filter(log => log.winner === '1')[0];
        expect(winningBid.adid).equals('3e6e4bce5c8fb3');
        medianetAnalytics.clearlogsQueue();
        done();
      }).catch(done);
    });

    it('should ignore unknown winning bid and log error', function (done) {
      performAuctionNoWin();
      events.emit(BID_WON, MOCK.BID_WON_UNKNOWN);
      clock.tick(2000);

      waitForPromiseResolve(Promise.resolve()).then(() => {
        const winningBids = medianetAnalytics.getlogsQueue().map((log) => getQueryData(log)).filter(log => log.winner);
        const errors = medianetAnalytics.getErrorQueue().map((log) => getQueryData(log));
        expect(winningBids.length).equals(0);
        expect(errors.length).equals(1);
        expect(errors[0].event).equals('winning_bid_absent');
        done();
      }).catch(done);
    });

    it('should have correct bid status for bid rejected', function (done) {
      performBidRejectedAuction();
      clock.tick(2000);

      waitForPromiseResolve(Promise.resolve()).then(() => {
        const bidRejectedLog = medianetAnalytics.getlogsQueue().map((log) => getQueryData(log))[0];
        expect(bidRejectedLog.pvnm).to.have.ordered.members(['-2', 'medianet', 'medianet', 'medianet']);
        expect(bidRejectedLog.status).to.have.ordered.members(['1', '1', '12', '12']);
        done();
      }).catch(done);
    });

    it('should handle S2S auction correctly', function (done) {
      performS2SAuction();
      clock.tick(2000);

      waitForPromiseResolve(Promise.resolve()).then(() => {
        const queue = medianetAnalytics.getlogsQueue();
        const s2sLog = queue.map((log) => getQueryData(log, true))[0];

        // Verify S2S source is recorded correctly
        expect(s2sLog.src).to.equal('s2s');
        expect(s2sLog.pvnm).to.include('medianet');
        expect(s2sLog.status).to.include('1');
        expect(s2sLog.winner).to.equal('1');

        done();
      }).catch(done);
    });

    it('should set serverLatencyMillis and filtered pbsExt for S2S bids on AUCTION_END', function (done) {
      // enable analytics and start an S2S auction flow
      medianetAnalytics.clearlogsQueue();
      events.emit(AUCTION_INIT, Object.assign({}, MOCK.AUCTION_INIT, {adUnits: MOCK.AD_UNITS}));
      events.emit(BID_REQUESTED, MOCK.MNET_S2S_BID_REQUESTED);
      events.emit(BID_RESPONSE, MOCK.MNET_S2S_BID_RESPONSE);

      // craft bidderRequests with S2S info and pbs ext including debug
      const bidderRequestsWithExt = Object.assign({}, MOCK.MNET_S2S_BID_REQUESTED, {
        serverResponseTimeMs: 123,
        pbsExt: { foo: 'bar', baz: 1, debug: { trace: true } }
      });

      // trigger AUCTION_END with the enriched bidderRequests
      events.emit(AUCTION_END, Object.assign({}, MOCK.AUCTION_END, { bidderRequests: [bidderRequestsWithExt] }));
      // advance fake timers to allow async auctionEnd processing to run
      clock.tick(2000);

      waitForPromiseResolve(Promise.resolve()).then(() => {
        // inspect internal auctions state through prebid global
        const auctions = getGlobal().medianetGlobals.analytics.auctions;
        const auctionObj = auctions[MOCK.AUCTION_END.auctionId];
        expect(auctionObj).to.exist;

        // locate the bid by id from the S2S request
        const bidId = MOCK.MNET_S2S_BID_REQUESTED.bids[0].bidId;
        const bidObj = auctionObj.bidsReceived.find(b => b.bidId === bidId);
        expect(bidObj).to.exist;
        expect(bidObj.serverLatencyMillis).to.equal(123);
        // pbsExt should not include 'debug'
        expect(bidObj.pbsExt).to.deep.equal({ foo: 'bar', baz: 1 });
        done();
      }).catch(done);
    });

    it('should map PBS server error to bid status for S2S timed-out bids', function (done) {
      // Start S2S auction and create a timed-out bid for the same bidId
      medianetAnalytics.clearlogsQueue();
      const auctionId = MOCK.MNET_S2S_BID_REQUESTED.auctionId;
      const bidId = MOCK.MNET_S2S_BID_REQUESTED.bids[0].bidId;

      events.emit(AUCTION_INIT, Object.assign({}, MOCK.AUCTION_INIT, {adUnits: MOCK.AD_UNITS}));
      events.emit(BID_REQUESTED, MOCK.MNET_S2S_BID_REQUESTED);

      // mark the bid as timed out so bidsReceived contains a non-success entry
      const timedOut = [{
        bidId,
        bidder: 'medianet',
        adUnitCode: MOCK.MNET_S2S_BID_REQUESTED.bids[0].adUnitCode,
        auctionId,
        params: MOCK.MNET_S2S_BID_REQUESTED.bids[0].params,
        timeout: 100,
        src: 's2s'
      }];
      events.emit(BID_TIMEOUT, timedOut);

      // bidderRequests with serverErrors (e.g., 501)
      const bidderRequestsWithError = Object.assign({}, MOCK.MNET_S2S_BID_REQUESTED, {
        serverResponseTimeMs: 50,
        pbsExt: {},
        serverErrors: [{ code: 501 }]
      });

      events.emit(AUCTION_END, Object.assign({}, MOCK.AUCTION_END, { bidderRequests: [bidderRequestsWithError] }));
      // advance fake timers to allow async auctionEnd processing to run
      clock.tick(2000);

      waitForPromiseResolve(Promise.resolve()).then(() => {
        const auctions = getGlobal().medianetGlobals.analytics.auctions;
        const auctionObj = auctions[auctionId];
        expect(auctionObj).to.exist;
        const bidObj = auctionObj.bidsReceived.find(b => b.bidId === bidId);
        expect(bidObj).to.exist;
        // 2000 (PBS_ERROR_STATUS_START) + 501
        expect(bidObj.status).to.equal(2000 + 501);
        done();
      }).catch(done);
    });

    it('should handle currency conversion from JPY to USD', function (done) {
      const prebidGlobal = getGlobal();
      prebidGlobal.convertCurrency = prebidGlobal.convertCurrency || function () {
      };
      const convertStub = sandbox.stub(prebidGlobal, 'convertCurrency');
      convertStub.withArgs(250, 'JPY', 'USD').returns(2.25);

      performCurrencyConversionAuction();
      clock.tick(2000);

      waitForPromiseResolve(Promise.resolve()).then(() => {
        const queue = medianetAnalytics.getlogsQueue();
        expect(queue.length).to.be.greaterThan(0);
        const currencyLog = queue.map((log) => getQueryData(log, true))[0];

        expect(currencyLog.curr).to.have.ordered.members(['', 'JPY', '']);
        expect(currencyLog.ogbdp).to.have.ordered.members(['', '2.25', '']);
        expect(currencyLog.bdp).to.have.ordered.members(['', '2.25', '']);
        expect(currencyLog.bdp).to.have.ordered.members(['', '2.25', '']);
        expect(convertStub.calledWith(250, 'JPY', 'USD')).to.be.true;
        done();
      }).catch(done).finally(() => {
        convertStub.restore();
      });
    });

    it('should have winner log in standard auction', function () {
      performBidWonAuction();

      const winnerLog = medianetAnalytics.getlogsQueue().map((log) => getQueryData(log)).filter((log) => log.winner);
      expect(winnerLog.length).to.equal(1);
      expect(winnerLog[0].lgtp).to.equal('RA');
    });

    it('should have correct values in winner log', function () {
      performBidWonAuction();

      const winnerLog = medianetAnalytics.getlogsQueue().map((log) => getQueryData(log)).filter((log) => log.winner);
      expect(winnerLog[0]).to.include({
        winner: '1',
        pvnm: 'medianet',
        curr: 'USD',
        src: 'client',
        size: '300x250',
        mtype: 'banner',
        gdpr: '0',
        cid: 'test123',
        lper: '1',
        ogbdp: '2.299',
        flt: '1',
        supcrid: 'div-gpt-ad-1460505748561-0',
        mpvid: '123',
        bidflr: '1.1'
      });
    });

    it('should have correct bid floor data in winner log', function (done) {
      performBidWonAuction();
      const winnerLog = medianetAnalytics.getlogsQueue().map((log) => getQueryData(log)).filter((log) => log.winner);
      expect(winnerLog[0]).to.include({
        winner: '1',
        curr: 'USD',
        ogbdp: '2.299',
        bidflr: '1.1',
        flrrule: 'banner',
        flrdata: encodeURIComponent('ln=||skp=||sr=||fs=||enfj=true||enfd=')
      });
      done();
    });

    it('should log error on AD_RENDER_FAILED event', function () {
      const errorData = {
        reason: 'timeout',
        message: 'Ad failed to render',
        bid: {
          auctionId: '8e0d5245-deb3-406c-96ca-9b609e077ff7',
          adUnitCode: 'div-gpt-ad-1460505748561-0',
          bidder: 'medianet',
          creativeId: 'Test1'
        }
      };
      events.emit(AD_RENDER_FAILED, errorData);

      const errors = medianetAnalytics.getErrorQueue().map((log) => getQueryData(log));
      expect(errors.length).to.equal(1);
      const relatedData = JSON.parse(decodeURIComponent(errors[0].rd));
      expect(errors[0].event).to.equal(AD_RENDER_FAILED);
      expect(relatedData.reason).to.equal('timeout');
      expect(relatedData.message).to.equal('Ad failed to render');
    });

    it('should log success on AD_RENDER_SUCCEEDED event', function () {
      const successData = {
        bid: {
          auctionId: '8e0d5245-deb3-406c-96ca-9b609e077ff7',
          adUnitCode: 'div-gpt-ad-1460505748561-0',
          bidder: 'medianet',
          creativeId: 'Test1'
        }
      };
      events.emit(AD_RENDER_SUCCEEDED, successData);

      const logs = medianetAnalytics.getErrorQueue().map((log) => getQueryData(log));
      expect(logs.length).to.equal(1);
      expect(logs[0].event).to.equal(AD_RENDER_SUCCEEDED);
    });

    it('should log error on STALE_RENDER event', function () {
      const staleData = {
        auctionId: '8e0d5245-deb3-406c-96ca-9b609e077ff7',
        adUnitCode: 'div-gpt-ad-1460505748561-0',
        bidder: 'medianet',
        creativeId: 'Test1',
        adId: '3e6e4bce5c8fb3',
        cpm: 2.299
      };
      events.emit(STALE_RENDER, staleData);

      const errors = medianetAnalytics.getErrorQueue().map((log) => getQueryData(log));
      expect(errors.length).to.equal(1);
      const relatedData = JSON.parse(decodeURIComponent(errors[0].rd));
      expect(errors[0].event).to.equal(STALE_RENDER);
      expect(relatedData.adId).to.equal('3e6e4bce5c8fb3');
    });
  });
});
