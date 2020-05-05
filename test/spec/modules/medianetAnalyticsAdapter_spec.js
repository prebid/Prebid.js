import { expect } from 'chai';
import medianetAnalytics from 'modules/medianetAnalyticsAdapter.js';
import * as utils from 'src/utils.js';
import CONSTANTS from 'src/constants.json';
import events from 'src/events.js';

const {
  EVENTS: { AUCTION_INIT, BID_REQUESTED, BID_RESPONSE, NO_BID, BID_TIMEOUT, AUCTION_END, SET_TARGETING, BID_WON }
} = CONSTANTS;

const MOCK = {
  AUCTION_INIT: {'auctionId': '8e0d5245-deb3-406c-96ca-9b609e077ff7', 'timestamp': 1584563605739},
  BID_REQUESTED: {'bidderCode': 'medianet', 'auctionId': '8e0d5245-deb3-406c-96ca-9b609e077ff7', 'bids': [{'bidder': 'medianet', 'params': {'cid': 'TEST_CID', 'crid': '451466393'}, 'mediaTypes': {'banner': {'sizes': [[300, 250]], 'ext': ['asdads']}}, 'adUnitCode': 'div-gpt-ad-1460505748561-0', 'sizes': [[300, 250]], 'bidId': '28248b0e6aece2', 'auctionId': '8e0d5245-deb3-406c-96ca-9b609e077ff7', 'src': 'client'}], 'auctionStart': 1584563605739, 'timeout': 6000, 'uspConsent': '1YY', 'start': 1584563605743},
  BID_RESPONSE: {'bidderCode': 'medianet', 'width': 300, 'height': 250, 'adId': '3e6e4bce5c8fb3', 'requestId': '28248b0e6aece2', 'mediaType': 'banner', 'source': 'client', 'ext': {'pvid': 123, 'crid': '321'}, 'no_bid': false, 'cpm': 2.299, 'ad': 'AD_CODE', 'ttl': 180, 'creativeId': 'Test1', 'netRevenue': true, 'currency': 'USD', 'dfp_id': 'div-gpt-ad-1460505748561-0', 'originalCpm': 1.1495, 'originalCurrency': 'USD', 'auctionId': '8e0d5245-deb3-406c-96ca-9b609e077ff7', 'responseTimestamp': 1584563606009, 'requestTimestamp': 1584563605743, 'bidder': 'medianet', 'adUnitCode': 'div-gpt-ad-1460505748561-0', 'timeToRespond': 266, 'pbLg': '2.00', 'pbMg': '2.20', 'pbHg': '2.29', 'pbAg': '2.25', 'pbDg': '2.29', 'pbCg': '2.00', 'size': '300x250', 'adserverTargeting': {'hb_bidder': 'medianet', 'hb_adid': '3e6e4bce5c8fb3', 'hb_pb': '2.00', 'hb_size': '300x250', 'hb_source': 'client', 'hb_format': 'banner', 'prebid_test': 1}, 'status': 'rendered', 'params': [{'cid': 'test123', 'crid': '451466393'}]},
  AUCTION_END: {'auctionId': '8e0d5245-deb3-406c-96ca-9b609e077ff7', 'auctionEnd': 1584563605739},
  SET_TARGETING: {'div-gpt-ad-1460505748561-0': {'prebid_test': '1', 'hb_format': 'banner', 'hb_source': 'client', 'hb_size': '300x250', 'hb_pb': '2.00', 'hb_adid': '3e6e4bce5c8fb3', 'hb_bidder': 'medianet', 'hb_format_medianet': 'banner', 'hb_source_medianet': 'client', 'hb_size_medianet': '300x250', 'hb_pb_medianet': '2.00', 'hb_adid_medianet': '3e6e4bce5c8fb3', 'hb_bidder_medianet': 'medianet'}},
  BID_WON: {'bidderCode': 'medianet', 'width': 300, 'height': 250, 'statusMessage': 'Bid available', 'adId': '3e6e4bce5c8fb3', 'requestId': '28248b0e6aece2', 'mediaType': 'banner', 'source': 'client', 'no_bid': false, 'cpm': 2.299, 'ad': 'AD_CODE', 'ttl': 180, 'creativeId': 'Test1', 'netRevenue': true, 'currency': 'USD', 'dfp_id': 'div-gpt-ad-1460505748561-0', 'originalCpm': 1.1495, 'originalCurrency': 'USD', 'auctionId': '8e0d5245-deb3-406c-96ca-9b609e077ff7', 'responseTimestamp': 1584563606009, 'requestTimestamp': 1584563605743, 'bidder': 'medianet', 'adUnitCode': 'div-gpt-ad-1460505748561-0', 'timeToRespond': 266, 'pbLg': '2.00', 'pbMg': '2.20', 'pbHg': '2.29', 'pbAg': '2.25', 'pbDg': '2.29', 'pbCg': '2.00', 'size': '300x250', 'adserverTargeting': {'hb_bidder': 'medianet', 'hb_adid': '3e6e4bce5c8fb3', 'hb_pb': '2.00', 'hb_size': '300x250', 'hb_source': 'client', 'hb_format': 'banner', 'prebid_test': 1}, 'status': 'rendered', 'params': [{'cid': 'test123', 'crid': '451466393'}]},
  NO_BID: {'bidder': 'medianet', 'params': {'cid': 'test123', 'crid': '451466393', 'site': {}}, 'mediaTypes': {'banner': {'sizes': [[300, 250]], 'ext': ['asdads']}}, 'adUnitCode': 'div-gpt-ad-1460505748561-0', 'transactionId': '303fa0c6-682f-4aea-8e4a-dc68f0d5c7d5', 'sizes': [[300, 250], [300, 600]], 'bidId': '28248b0e6aece2', 'bidderRequestId': '13fccf3809fe43', 'auctionId': '8e0d5245-deb3-406c-96ca-9b609e077ff7', 'src': 'client'},
  BID_TIMEOUT: [{'bidId': '28248b0e6aece2', 'bidder': 'medianet', 'adUnitCode': 'div-gpt-ad-1460505748561-0', 'auctionId': '8e0d5245-deb3-406c-96ca-9b609e077ff7', 'params': [{'cid': 'test123', 'crid': '451466393', 'site': {}}, {'cid': '8CUX0H51P', 'crid': '451466393', 'site': {}}], 'timeout': 6}]
}

function performStandardAuctionWithWinner() {
  events.emit(AUCTION_INIT, MOCK.AUCTION_INIT);
  events.emit(BID_REQUESTED, MOCK.BID_REQUESTED);
  events.emit(BID_RESPONSE, MOCK.BID_RESPONSE);
  events.emit(AUCTION_END, MOCK.AUCTION_END);
  events.emit(SET_TARGETING, MOCK.SET_TARGETING);
  events.emit(BID_WON, MOCK.BID_WON);
}

function performStandardAuctionWithNoBid() {
  events.emit(AUCTION_INIT, MOCK.AUCTION_INIT);
  events.emit(BID_REQUESTED, MOCK.BID_REQUESTED);
  events.emit(NO_BID, MOCK.NO_BID);
  events.emit(AUCTION_END, MOCK.AUCTION_END);
  events.emit(SET_TARGETING, MOCK.SET_TARGETING);
}

function performStandardAuctionWithTimeout() {
  events.emit(AUCTION_INIT, MOCK.AUCTION_INIT);
  events.emit(BID_REQUESTED, MOCK.BID_REQUESTED);
  events.emit(BID_TIMEOUT, MOCK.BID_TIMEOUT);
  events.emit(AUCTION_END, MOCK.AUCTION_END);
  events.emit(SET_TARGETING, MOCK.SET_TARGETING);
}

function getQueryData(url) {
  const queryArgs = url.split('?')[1].split('&');
  return queryArgs.reduce((data, arg) => {
    const [key, val] = arg.split('=');
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

describe('Media.net Analytics Adapter', function() {
  let sandbox;
  let CUSTOMER_ID = 'test123';
  let VALID_CONFIGURATION = {
    options: {
      cid: CUSTOMER_ID
    }
  }
  beforeEach(function () {
    sandbox = sinon.sandbox.create();
  });

  afterEach(function () {
    sandbox.restore();
  });

  describe('Configuration', function() {
    it('should log error if publisher id is not passed', function() {
      sandbox.stub(utils, 'logError');

      medianetAnalytics.enableAnalytics();
      expect(
        utils.logError.calledWith(
          'Media.net Analytics adapter: cid is required.'
        )
      ).to.be.true;
    });

    it('should not log error if valid config is passed', function() {
      sandbox.stub(utils, 'logError');

      medianetAnalytics.enableAnalytics(VALID_CONFIGURATION);
      expect(utils.logError.called).to.equal(false);
      medianetAnalytics.disableAnalytics();
    });
  });

  describe('Events', function() {
    beforeEach(function () {
      medianetAnalytics.enableAnalytics({
        options: {
          cid: 'test123'
        }
      });
    });
    afterEach(function () {
      medianetAnalytics.disableAnalytics();
    });

    it('should not log if only Auction Init', function() {
      medianetAnalytics.clearlogsQueue();
      medianetAnalytics.track({ AUCTION_INIT })
      expect(medianetAnalytics.getlogsQueue().length).to.equal(0);
    });

    it('should have winner log in standard auction', function() {
      medianetAnalytics.clearlogsQueue();
      performStandardAuctionWithWinner();
      let winnerLog = medianetAnalytics.getlogsQueue().map((log) => getQueryData(log)).filter((log) => log.winner);
      medianetAnalytics.clearlogsQueue();

      expect(winnerLog.length).to.equal(1);
    });

    it('should have correct values in winner log', function() {
      medianetAnalytics.clearlogsQueue();
      performStandardAuctionWithWinner();
      let winnerLog = medianetAnalytics.getlogsQueue().map((log) => getQueryData(log)).filter((log) => log.winner);
      medianetAnalytics.clearlogsQueue();

      expect(winnerLog[0]).to.include({
        winner: '1',
        pvnm: 'medianet',
        curr: 'USD',
        src: 'client',
        size: '300x250',
        mtype: 'banner',
        cid: 'test123',
        lper: '1',
        ogbdp: '1.1495',
        flt: '1',
        supcrid: 'div-gpt-ad-1460505748561-0',
        mpvid: '123'
      });
    });

    it('should have no bid status', function() {
      medianetAnalytics.clearlogsQueue();
      performStandardAuctionWithNoBid();
      let noBidLog = medianetAnalytics.getlogsQueue().map((log) => getQueryData(log));
      noBidLog = noBidLog[0];

      medianetAnalytics.clearlogsQueue();
      expect(noBidLog.pvnm).to.have.ordered.members(['-2', 'medianet']);
      expect(noBidLog.iwb).to.have.ordered.members(['0', '0']);
      expect(noBidLog.status).to.have.ordered.members(['1', '2']);
      expect(noBidLog.src).to.have.ordered.members(['client', 'client']);
      expect(noBidLog.curr).to.have.ordered.members(['', '']);
      expect(noBidLog.mtype).to.have.ordered.members(['', '']);
      expect(noBidLog.ogbdp).to.have.ordered.members(['', '']);
      expect(noBidLog.mpvid).to.have.ordered.members(['', '']);
      expect(noBidLog.crid).to.have.ordered.members(['', '451466393']);
    });

    it('should have timeout status', function() {
      medianetAnalytics.clearlogsQueue();
      performStandardAuctionWithTimeout();
      let timeoutLog = medianetAnalytics.getlogsQueue().map((log) => getQueryData(log));
      timeoutLog = timeoutLog[0];

      medianetAnalytics.clearlogsQueue();
      expect(timeoutLog.pvnm).to.have.ordered.members(['-2', 'medianet']);
      expect(timeoutLog.iwb).to.have.ordered.members(['0', '0']);
      expect(timeoutLog.status).to.have.ordered.members(['1', '3']);
      expect(timeoutLog.src).to.have.ordered.members(['client', 'client']);
      expect(timeoutLog.curr).to.have.ordered.members(['', '']);
      expect(timeoutLog.mtype).to.have.ordered.members(['', '']);
      expect(timeoutLog.ogbdp).to.have.ordered.members(['', '']);
      expect(timeoutLog.mpvid).to.have.ordered.members(['', '']);
      expect(timeoutLog.crid).to.have.ordered.members(['', '451466393']);
    });
  });
});
