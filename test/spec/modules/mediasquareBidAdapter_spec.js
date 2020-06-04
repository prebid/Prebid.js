import {expect} from 'chai';
import {spec} from 'modules/mediasquareBidAdapter.js';
import {newBidder} from 'src/adapters/bidderFactory.js';
import {config} from 'src/config.js';
import * as utils from 'src/utils.js';
import { requestBidsHook } from 'modules/consentManagement.js';

describe('MediaSquare bid adapter tests', function () {
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
    bidder: 'mediasquare',
    params: {
      owner: 'test',
      code: 'publishername_atf_desktop_rg_pave'
    },
  }];

  var BID_RESPONSE = {'body': {
    'responses': [{
      'transaction_id': 'cccc1234',
      'cpm': 22.256608,
      'width': 300,
      'height': 250,
      'creative_id': '158534630',
      'currency': 'USD',
      'net_revenue': true,
      'ttl': 300,
      'ad': '< --- creative code --- >',
      'bidder': 'msqClassic',
      'code': 'test/publishername_atf_desktop_rg_pave',
      'bid_id': 'aaaa1234',
    }]
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
    }
  };
  it('Verify build request', function () {
    const request = spec.buildRequests(DEFAULT_PARAMS, DEFAULT_OPTIONS);
    expect(request).to.have.property('url').and.to.equal('https://pbs-front.mediasquare.fr/msq_prebid');
    expect(request).to.have.property('method').and.to.equal('POST');
    const requestContent = JSON.parse(request.data);
    expect(requestContent.codes[0]).to.have.property('owner').and.to.equal('test');
    expect(requestContent.codes[0]).to.have.property('code').and.to.equal('publishername_atf_desktop_rg_pave');
    expect(requestContent.codes[0]).to.have.property('adunit').and.to.equal('banner-div');
    expect(requestContent.codes[0]).to.have.property('bidId').and.to.equal('aaaa1234');
    expect(requestContent.codes[0]).to.have.property('auctionId').and.to.equal('bbbb1234');
    expect(requestContent.codes[0]).to.have.property('transactionId').and.to.equal('cccc1234');
    expect(requestContent.codes[0]).to.have.property('mediatypes').exist;
  });

  it('Verify parse response', function () {
    const request = spec.buildRequests(DEFAULT_PARAMS, DEFAULT_OPTIONS);
    const response = spec.interpretResponse(BID_RESPONSE, request);
    expect(response).to.have.lengthOf(1);
    const bid = response[0];
    expect(bid.cpm).to.equal(22.256608);
    expect(bid.ad).to.equal('< --- creative code --- >');
    expect(bid.width).to.equal(300);
    expect(bid.height).to.equal(250);
    expect(bid.creativeId).to.equal('158534630');
    expect(bid.currency).to.equal('USD');
    expect(bid.netRevenue).to.equal(true);
    expect(bid.ttl).to.equal(300);
    expect(bid.requestId).to.equal('aaaa1234');
    expect(bid.mediasquare).to.exist;
    expect(bid.mediasquare.bidder).to.equal('msqClassic');
    expect(bid.mediasquare.code).to.equal([DEFAULT_PARAMS[0].params.owner, DEFAULT_PARAMS[0].params.code].join('/'));
  });

  it('Verifies bidder code', function () {
    expect(spec.code).to.equal('mediasquare');
  });

  it('Verifies bidder aliases', function () {
    expect(spec.aliases).to.have.lengthOf(1);
    expect(spec.aliases[0]).to.equal('msq');
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
  it('Verifies user sync', function () {
    var syncs = spec.getUserSyncs({
      iframeEnabled: true,
      pixelEnabled: false,
    }, [BID_RESPONSE], DEFAULT_OPTIONS.gdprConsent);
    expect(syncs).to.have.property('type').and.to.equal('iframe');
    syncs = spec.getUserSyncs({
      iframeEnabled: false,
      pixelEnabled: true,
    }, [BID_RESPONSE], DEFAULT_OPTIONS.gdprConsent);
    expect(syncs).to.have.property('type').and.to.equal('image');
    syncs = spec.getUserSyncs({
      iframeEnabled: false,
      pixelEnabled: false,
    }, [BID_RESPONSE], DEFAULT_OPTIONS.gdprConsent);
    expect(syncs).to.equal(false);
  });
});
