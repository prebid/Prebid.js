import sharethroughAnalytics from 'src/adapters/analytics/sharethrough_analytics';
import { expect } from 'chai';

describe('sharethrough analytics adapter', () => {
  let sandbox;

  beforeEach(() => {
    sandbox = sinon.sandbox.create();
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe('track', () => {
    describe('when event type is bidRequested', () => {
      beforeEach(() => {
        let eventType = 'bidRequested';
        let args = {'bidderCode': 'sharethrough', 'bids': {'0': {'placementCode': 'fake placement Code'}}};
        sharethroughAnalytics.track({eventType, args})
      });

      it('placementCodeSet contains a value', () => {
        expect(sharethroughAnalytics.placementCodeSet['fake placement Code'] == undefined).to.equal(false)
      });
    });
  });

  describe('bid won handler', () => {
    let fireLoseBeaconStub;

    beforeEach(() => {
      fireLoseBeaconStub = sandbox.stub(sharethroughAnalytics, 'fireLoseBeacon');
    });

    describe('when bidderCode is not sharethrough and sharethrough is in bid', () => {
      beforeEach(() => {
        sharethroughAnalytics.placementCodeSet['div-gpt-ad-1460505748561-0'] = {'adserverRequestId': '0eca470d-fcac-48e6-845a-c86483ccaa0c'}
        var args = {
          'bidderCode': 'someoneelse',
          'width': 600,
          'height': 300,
          'statusMessage': 'Bid available',
          'adId': '23fbe93a90c924',
          'cpm': 3.984986853301525,
          'adserverRequestId': '0eca470d-fcac-48e6-845a-c86483ccaa0c',
          'winId': '1c404469-f7bb-4e50-b6f6-a8eaf0808999',
          'pkey': 'xKcxTTHyndFyVx7T8GKSzxPE',
          'ad': '<div></div>',
          'requestId': 'dd2420bd-cdc2-4c66-8479-f3499ece73da',
          'responseTimestamp': 1473983655565,
          'requestTimestamp': 1473983655458,
          'bidder': 'sharethrough',
          'adUnitCode': 'div-gpt-ad-1460505748561-0',
          'timeToRespond': 107,
          'pbLg': '3.50',
          'pbMg': '3.90',
          'pbHg': '3.98',
          'pbAg': '3.95',
          'pbDg': '3.95',
          'size': '600x300',
          'adserverTargeting': {
            'hb_bidder': 'sharethrough',
            'hb_adid': '23fbe93a90c924',
            'hb_pb': '3.90',
            'hb_size': '600x300'
          }
        };

        sharethroughAnalytics.bidWon(args);
      });

      it('should fire lose beacon', () => {
        sinon.assert.calledOnce(fireLoseBeaconStub);
      });
    });
  });

  describe('lose beacon is fired', () => {
    beforeEach(() => {
      sandbox.stub(sharethroughAnalytics, 'fireBeacon');
      sharethroughAnalytics.fireLoseBeacon('someoneelse', 10.0, 'arid', 'losebeacontype');
    });

    it('should call correct url', () => {
      let winUrl = sharethroughAnalytics.fireBeacon.firstCall.args[0];
      expect(winUrl).to.contain(sharethroughAnalytics.STR_BEACON_HOST + 'winnerBidderCode=someoneelse&winnerCpm=10&arid=arid&type=losebeacontype&hbVersion=%24prebid.version%24&strVersion=0.1.0&hbSource=prebid&');
    });
  });
});
