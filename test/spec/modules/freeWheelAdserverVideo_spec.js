import { expect } from 'chai';
import { getTargeting } from 'modules/freeWheelAdserverVideo';
import { auctionManager } from 'src/auctionManager';
import { config } from 'src/config';
import * as adpod from 'modules/adpod';

describe('freeWheel adserver module', function() {
  let amStub;
  let amGetAdUnitsStub;
  let pbcStub;

  before(function () {
    let adUnits = [{
      code: 'preroll_1',
      mediaTypes: {
        video: {
          context: 'adpod',
          playerSize: [640, 480],
          adPodDurationSec: 60,
          durationRangeSec: [15, 30],
          requireExactDuration: true
        }
      },
      bids: [
        {
          bidder: 'appnexus',
          params: {
            placementId: 14542875,
          }
        }
      ]
    }, {
      code: 'midroll_1',
      mediaTypes: {
        video: {
          context: 'adpod',
          playerSize: [640, 480],
          adPodDurationSec: 60,
          durationRangeSec: [15, 30],
          requireExactDuration: true
        }
      },
      bids: [
        {
          bidder: 'appnexus',
          params: {
            placementId: 14542875,
          }
        }
      ]
    }];

    amGetAdUnitsStub = sinon.stub(auctionManager, 'getAdUnits');
    amGetAdUnitsStub.returns(adUnits);
    amStub = sinon.stub(auctionManager, 'getBidsReceived');
    pbcStub = sinon.stub(adpod, 'callPrebidCacheAfterAuction').callsFake(function (...args) {
      args[1](null, getBidsReceived());
    });
  });

  beforeEach(function () {
    config.setConfig({
      adpod: {
        brandCategoryExclusion: false,
        deferCaching: false
      }
    });
  })

  afterEach(function() {
    config.resetConfig();
  });

  after(function () {
    amGetAdUnitsStub.restore();
    amStub.restore();
  });

  it('should return targeting for all adunits', function() {
    amStub.returns(getBidsReceived());
    let targeting;
    getTargeting({
      callback: function(errorMsg, targetingResult) {
        targeting = targetingResult;
      }
    });

    expect(targeting['preroll_1'].length).to.equal(3);
    expect(targeting['midroll_1'].length).to.equal(2);
  });

  it('should return targeting for passed adunit code', function() {
    amStub.returns(getBidsReceived());
    let targeting;
    getTargeting({
      codes: ['preroll_1'],
      callback: function(errorMsg, targetingResult) {
        targeting = targetingResult;
      }
    });

    expect(targeting['preroll_1']).to.exist;
    expect(targeting['midroll_1']).to.not.exist;
  });

  it('should only use adpod bids', function() {
    let bannerBid = [{
      'ad': 'creative',
      'cpm': '1.99',
      'width': 300,
      'height': 250,
      'requestId': '1',
      'creativeId': 'some-id',
      'currency': 'USD',
      'netRevenue': true,
      'ttl': 360,
      'bidderCode': 'appnexus',
      'statusMessage': 'Bid available',
      'adId': '28f24ced14586c',
      'adUnitCode': 'preroll_1'
    }];
    amStub.returns(getBidsReceived().concat(bannerBid));
    let targeting;
    getTargeting({
      callback: function(errorMsg, targetingResult) {
        targeting = targetingResult;
      }
    });

    expect(targeting['preroll_1'].length).to.equal(3);
    expect(targeting['midroll_1'].length).to.equal(2);
  });

  it('should return unique category bids when competitive exclusion is enabled', function() {
    config.setConfig({
      adpod: {
        brandCategoryExclusion: true,
        deferCaching: false
      }
    });
    amStub.returns([
      createBid(10, 'preroll_1', 30, '10.00_airline_30s', '123', 'airline'),
      createBid(15, 'preroll_1', 30, '15.00_airline_30s', '123', 'airline'),
      createBid(15, 'midroll_1', 60, '15.00_travel_60s', '123', 'travel'),
      createBid(10, 'preroll_1', 30, '10.00_airline_30s', '123', 'airline')
    ]);
    let targeting;
    getTargeting({
      callback: function(errorMsg, targetingResult) {
        targeting = targetingResult;
      }
    });

    expect(targeting['preroll_1'].length).to.equal(3);
    expect(targeting['midroll_1'].length).to.equal(2);
  });

  it('should only select bids less than adpod duration', function() {
    amStub.returns([
      createBid(10, 'preroll_1', 90, '10.00_airline_90s', '123', 'airline'),
      createBid(15, 'preroll_1', 90, '15.00_airline_90s', '123', 'airline'),
      createBid(15, 'midroll_1', 90, '15.00_travel_90s', '123', 'travel')
    ]);
    let targeting;
    getTargeting({
      callback: function(errorMsg, targetingResult) {
        targeting = targetingResult;
      }
    });

    expect(targeting['preroll_1']).to.be.empty;
    expect(targeting['midroll_1']).to.be.empty;
  });

  it('should select bids when deferCaching is enabled', function() {
    config.setConfig({
      adpod: {
        deferCaching: true
      }
    });
    amStub.returns(getBidsReceived());
    let targeting;
    getTargeting({
      callback: function(errorMsg, targetingResult) {
        targeting = targetingResult;
      }
    });

    expect(pbcStub.called).to.equal(true);
    expect(targeting['preroll_1'].length).to.equal(3);
    expect(targeting['midroll_1'].length).to.equal(4);
  });
});

function getBidsReceived() {
  return [
    createBid(10, 'preroll_1', 15, '10.00_airline_15s', '123', 'airline'),
    createBid(15, 'preroll_1', 15, '15.00_airline_15s', '123', 'airline'),
    createBid(15, 'midroll_1', 30, '15.00_travel_30s', '123', 'travel'),
    createBid(5, 'midroll_1', 5, '5.00_travel_5s', '123', 'travel'),
    createBid(20, 'midroll_1', 60, '20.00_travel_60s', '123', 'travel'),
  ]
}

function createBid(cpm, adUnitCode, durationBucket, priceIndustryDuration, uuid, industry) {
  return {
    'bidderCode': 'appnexus',
    'width': 640,
    'height': 360,
    'statusMessage': 'Bid available',
    'adId': '28f24ced14586c',
    'mediaType': 'video',
    'source': 'client',
    'requestId': '28f24ced14586c',
    'cpm': cpm,
    'creativeId': 97517771,
    'currency': 'USD',
    'netRevenue': true,
    'ttl': 3600,
    'adUnitCode': adUnitCode,
    'video': {
      'context': 'adpod',
      'durationBucket': durationBucket
    },
    'appnexus': {
      'buyerMemberId': 9325
    },
    'vastUrl': 'http://nym1-ib.adnxs.com/ab?ro=1&referrer=http%3A%2F%2Fprebid.org%2Fexamples%2Fvideo%2FjwPlayerPrebid.html&e=wqT_3QKQCKAQBAAAAwDWAAUBCOC2reIFENXVz86_iKrdKRiyjp7_7P7s0GQqNgkAAAECCBRAEQEHNAAAFEAZAAAA4HoUFEAhERIAKREJADERG6gw6dGnBjjtSEDtSEgCUMuBwC5YnPFbYABozbp1eIHdBIABAYoBA1VTRJIBAQbwUJgBAaABAagBAbABALgBA8ABBMgBAtABANgBAOABAPABAIoCO3VmKCdhJywgMjUyOTg4NSwgMTU0ODQ0MjQ2NCk7dWYoJ3InLCA5NzUxNzc3MTYeAPQAAZIC8QEhOXpPdkVBaTItTHdLRU11QndDNFlBQ0NjOFZzd0FEZ0FRQVJJN1VoUTZkR25CbGdBWUVwb0FIQ0FBWGdBZ0FHMEFvZ0JBSkFCQVpnQkFhQUJBYWdCQTdBQkFMa0I4NjFxcEFBQUZFREJBZk90YXFRQUFCUkF5UUhWSVlsRnN5SDRQOWtCQUFBQUFBQUE4RF9nQVFEMUFRQUFBQUNZQWdDZ0FnQzFBZ0FBQUFDOUFnQUFBQURBQWdESUFnRGdBZ0RvQWdENEFnQ0FBd0dRQXdDWUF3R29BN2I0dkFxNkF3bE9XVTB5T2pRd016SGdBODBGmgJhIU53M1VaUWkyLvQAKG5QRmJJQVFvQURFCY1cQUFVUURvSlRsbE5Nam8wTURNeFFNMEZTBZwYQUFBUEFfVREMDEFBQVcdDPBMwgI_aHR0cDovL3ByZWJpZC5vcmcvZGV2LWRvY3Mvc2hvdy12aWRlby13aXRoLWEtZGZwLXZpZGVvLXRhZy5odG1s2AIA4AKtmEjqAjRGSgAgZXhhbXBsZXMvBUUkL2p3UGxheWVyUAlseGh0bWzyAhMKD0NVU1RPTV9NT0RFTF9JRBIA8gIaChYyFgAgTEVBRl9OQU1FAR0IHgoaNh0ACEFTVAE-4ElGSUVEEgCAAwCIAwGQAwCYAxegAwGqAwDAA-CoAcgDANgDAOADAOgDAPgDAYAEAJIEDS91dC92Mw3-8E6YBACiBAsxMC4xLjEyLjE4MKgEjq4IsgQSCAEQAhiABSDoAigBKAIwADgDuAQAwAQAyAQA0gQOOTMyNSNOWU0yOjQwMzHaBAIIAeAEAPAEYTYgiAUBmAUAoAX_EQEUAcAFAMkFaXAU8D_SBQkJCQx4AADYBQHgBQHwBcOVC_oFBAgAEACQBgGYBgC4BgDBBgklJPA_yAYA2gYWChAJEDQAAAAAAAAAAAAAEAAYAA..&s=539bcaeb9ce05a13a8c4a6cab3c000194a8e8f53',
    'vastImpUrl': 'http://nym1-ib.adnxs.com/vast_track/v2?info=ZQAAAAMArgAFAQlgW0tcAAAAABHV6tP5Q6i6KRlgW0tcAAAAACDLgcAuKAAw7Ug47UhA0-hISLuv1AFQ6dGnBljDlQtiAkZSaAFwAXgAgAEBiAEBkAGABZgB6AKgAQCoAcuBwC4.&s=61db1767c8c362ef1a58d2c5587dd6a9b1015aeb&event_type=1',
    'auctionId': 'ec266b31-d652-49c5-8295-e83fafe5532b',
    'responseTimestamp': 1548442460888,
    'requestTimestamp': 1548442460827,
    'bidder': 'appnexus',
    'timeToRespond': 61,
    'pbLg': '5.00',
    'pbMg': '5.00',
    'pbHg': '5.00',
    'pbAg': '5.00',
    'pbDg': '5.00',
    'pbCg': '',
    'size': '640x360',
    'adserverTargeting': {
      'hb_bidder': 'appnexus',
      'hb_adid': '28f24ced14586c',
      'hb_pb': '5.00',
      'hb_size': '640x360',
      'hb_source': 'client',
      'hb_format': 'video',
      'hb_pb_cat_dur': priceIndustryDuration,
      'hb_cache_id': uuid
    },
    'customCacheKey': `${priceIndustryDuration}_${uuid}`,
    'meta': {
      'iabSubCatId': 'iab-1',
      'adServerCatId': industry
    },
    'videoCacheKey': '4cf395af-8fee-4960-af0e-88d44e399f14'
  }
}
