import {expect} from 'chai';
import {spec} from 'modules/nexx360BidAdapter.js';
import {newBidder} from 'src/adapters/bidderFactory.js';
import {config} from 'src/config.js';
import * as utils from 'src/utils.js';
import { requestBidsHook } from 'modules/consentManagement.js';

describe('Nexx360 bid adapter tests', function () {
  var DEFAULT_PARAMS = [{
    adUnitCode: 'banner-div',
    bidId: 'aaaa1234',
    auctionId: 'bbbb1234',
    transactionId: 'cccc1234',
    mediaTypes: {
      banner: {
        sizes: [
          [300, 250]
        ]
      }
    },
    bidder: 'nexx360',
    params: {
      account: '1067',
      tagId: 'luvxjvgn'
    },
  }];

  var BID_RESPONSE = {'body': {
    'responses': [
      {
        'bidId': '49a705a42610a',
        'cpm': 0.437245,
        'width': 300,
        'height': 250,
        'creativeId': '98493581',
        'currency': 'EUR',
        'netRevenue': true,
        'ttl': 360,
        'uuid': 'ce6d1ee3-2a05-4d7c-b97a-9e62097798ec',
        'bidder': 'appnexus',
        'consent': 1,
        'tagId': 'luvxjvgn'
      }
    ],
  }};

  const DEFAULT_OPTIONS = {
    gdprConsent: {
      gdprApplies: true,
      consentString: 'BOzZdA0OzZdA0AGABBENDJ-AAAAvh7_______9______9uz_Ov_v_f__33e8__9v_l_7_-___u_-33d4-_1vf99yfm1-7ftr3tp_87ues2_Xur__79__3z3_9pxP78k89r7337Mw_v-_v-b7JCPN_Y3v-8Kg',
      vendorData: {}
    },
    refererInfo: {
      referer: 'https://www.prebid.org',
      canonicalUrl: 'https://www.prebid.org/the/link/to/the/page'
    },
    uspConsent: '111222333',
    userId: { 'id5id': { uid: '1111' } },
    schain: {
      'ver': '1.0',
      'complete': 1,
      'nodes': [{
        'asi': 'exchange1.com',
        'sid': '1234',
        'hp': 1,
        'rid': 'bid-request-1',
        'name': 'publisher',
        'domain': 'publisher.com'
      }]
    },
  };
  it('Verify build request', function () {
    const request = spec.buildRequests(DEFAULT_PARAMS, DEFAULT_OPTIONS);
    expect(request).to.have.property('url').and.to.equal('https://fast.nexx360.io/prebid');
    expect(request).to.have.property('method').and.to.equal('POST');
    const requestContent = JSON.parse(request.data);
    expect(requestContent.adUnits[0]).to.have.property('account').and.to.equal('1067');
    expect(requestContent.adUnits[0]).to.have.property('tagId').and.to.equal('luvxjvgn');
    expect(requestContent.adUnits[0]).to.have.property('label').and.to.equal('banner-div');
    expect(requestContent.adUnits[0]).to.have.property('bidId').and.to.equal('aaaa1234');
    expect(requestContent.adUnits[0]).to.have.property('auctionId').and.to.equal('bbbb1234');
    expect(requestContent.adUnits[0]).to.have.property('mediatypes').exist;
  });

  it('Verify parse response', function () {
    const request = spec.buildRequests(DEFAULT_PARAMS, DEFAULT_OPTIONS);
    const response = spec.interpretResponse(BID_RESPONSE, request);
    expect(response).to.have.lengthOf(1);
    const bid = response[0];
    expect(bid.cpm).to.equal(0.437245);
    expect(bid.adUrl).to.equal('https://fast.nexx360.io/cache?uuid=ce6d1ee3-2a05-4d7c-b97a-9e62097798ec');
    expect(bid.width).to.equal(300);
    expect(bid.height).to.equal(250);
    expect(bid.creativeId).to.equal('98493581');
    expect(bid.currency).to.equal('EUR');
    expect(bid.netRevenue).to.equal(true);
    expect(bid.ttl).to.equal(360);
    expect(bid.requestId).to.equal('49a705a42610a');
    expect(bid.nexx360).to.exist;
    expect(bid.nexx360.ssp).to.equal('appnexus');
  });
  it('Verifies bidder code', function () {
    expect(spec.code).to.equal('nexx360');
  });

  it('Verifies bidder aliases', function () {
    expect(spec.aliases).to.have.lengthOf(1);
    expect(spec.aliases[0]).to.equal('revenuemaker');
  });
  it('Verifies if bid request valid', function () {
    expect(spec.isBidRequestValid(DEFAULT_PARAMS[0])).to.equal(true);
  });
  it('Verifies bid won', function () {
    const request = spec.buildRequests(DEFAULT_PARAMS, DEFAULT_OPTIONS);
    const response = spec.interpretResponse(BID_RESPONSE, request);
    const won = spec.onBidWon(response[0]);
    expect(won).to.equal(true);
  });
  it('Verifies user sync without cookie in bid response', function () {
    var syncs = spec.getUserSyncs({}, [BID_RESPONSE], DEFAULT_OPTIONS.gdprConsent, DEFAULT_OPTIONS.uspConsent);
    expect(syncs).to.have.lengthOf(0);
  });
  it('Verifies user sync with cookies in bid response', function () {
    BID_RESPONSE.body.cookies = [{'type': 'image', 'url': 'http://www.cookie.sync.org/'}];
    var syncs = spec.getUserSyncs({}, [BID_RESPONSE], DEFAULT_OPTIONS.gdprConsent);
    expect(syncs).to.have.lengthOf(1);
    expect(syncs[0]).to.have.property('type').and.to.equal('image');
    expect(syncs[0]).to.have.property('url').and.to.equal('http://www.cookie.sync.org/');
  });
  it('Verifies user sync with no bid response', function() {
    var syncs = spec.getUserSyncs({}, null, DEFAULT_OPTIONS.gdprConsent, DEFAULT_OPTIONS.uspConsent);
    expect(syncs).to.have.lengthOf(0);
  });
  it('Verifies user sync with no bid body response', function() {
    var syncs = spec.getUserSyncs({}, [], DEFAULT_OPTIONS.gdprConsent, DEFAULT_OPTIONS.uspConsent);
    expect(syncs).to.have.lengthOf(0);
    var syncs = spec.getUserSyncs({}, [{}], DEFAULT_OPTIONS.gdprConsent, DEFAULT_OPTIONS.uspConsent);
    expect(syncs).to.have.lengthOf(0);
  });
});
