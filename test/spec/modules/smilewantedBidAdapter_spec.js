import { expect } from 'chai';
import { spec } from 'modules/smilewantedBidAdapter';
import { newBidder } from 'src/adapters/bidderFactory';
import { config } from 'src/config';
import * as utils from 'src/utils';
import { requestBidsHook } from 'modules/consentManagement';

// Default params with optional ones
describe('smilewantedBidAdapterTests', function () {
  var DEFAULT_PARAMS = [{
    adUnitCode: 'sw_300x250',
    bidId: '12345',
    sizes: [
      [300, 250],
      [300, 200]
    ],
    bidder: 'smilewanted',
    params: {
      zoneId: '1234',
      bidfloor: 2.50
    },
    requestId: 'request_abcd1234',
    transactionId: 'trans_abcd1234'
  }];

  var BID_RESPONSE = {
    body: {
      cpm: 3,
      width: 300,
      height: 250,
      creativeId: 'crea_sw_1',
      currency: 'EUR',
      isNetCpm: true,
      ttl: 300,
      adUrl: 'https://www.smilewanted.com',
      ad: '< --- sw script --- >',
      cSyncUrl: 'https://csync.smilewanted.com'
    }
  };

  it('SmileWanted - Verify build request', function () {
    config.setConfig({
      'currency': {
        'adServerCurrency': 'EUR'
      }
    });
    const request = spec.buildRequests(DEFAULT_PARAMS);
    expect(request[0]).to.have.property('url').and.to.equal('https://prebid.smilewanted.com');
    expect(request[0]).to.have.property('method').and.to.equal('POST');
    const requestContent = JSON.parse(request[0].data);
    expect(requestContent).to.have.property('zoneId').and.to.equal('1234');
    expect(requestContent).to.have.property('currencyCode').and.to.equal('EUR');
    expect(requestContent).to.have.property('bidfloor').and.to.equal(2.50);
    expect(requestContent).to.have.property('sizes');
    expect(requestContent.sizes[0]).to.have.property('w').and.to.equal(300);
    expect(requestContent.sizes[0]).to.have.property('h').and.to.equal(250);
    expect(requestContent.sizes[1]).to.have.property('w').and.to.equal(300);
    expect(requestContent.sizes[1]).to.have.property('h').and.to.equal(200);
    expect(requestContent).to.have.property('transactionId').and.to.not.equal(null).and.to.not.be.undefined;
  });

  it('SmileWanted - Verify build request with referrer', function () {
    const request = spec.buildRequests(DEFAULT_PARAMS, {
      refererInfo: {
        referer: 'http://localhost/Prebid.js/integrationExamples/gpt/hello_world.html'
      }
    });
    const requestContent = JSON.parse(request[0].data);
    expect(requestContent).to.have.property('pageDomain').and.to.equal('http://localhost/Prebid.js/integrationExamples/gpt/hello_world.html');
  });

  describe('gdpr tests', function () {
    afterEach(function () {
      config.resetConfig();
      $$PREBID_GLOBAL$$.requestBids.removeAll();
    });

    it('SmileWanted - Verify build request with GDPR', function () {
      config.setConfig({
        'currency': {
          'adServerCurrency': 'EUR'
        },
        consentManagement: {
          cmp: 'iab',
          consentRequired: true,
          timeout: 1000,
          allowAuctionWithoutConsent: true
        }
      });
      const request = spec.buildRequests(DEFAULT_PARAMS, {
        gdprConsent: {
          consentString: 'BOO_ch7OO_ch7AKABBENA2-AAAAZ97_______9______9uz_Gv_r_f__33e8_39v_h_7_u___m_-zzV4-_lvQV1yPA1OrfArgFA',
          gdprApplies: true
        }
      });
      const requestContent = JSON.parse(request[0].data);
      expect(requestContent).to.have.property('gdpr').and.to.equal(true);
      expect(requestContent).to.have.property('gdpr_consent').and.to.equal('BOO_ch7OO_ch7AKABBENA2-AAAAZ97_______9______9uz_Gv_r_f__33e8_39v_h_7_u___m_-zzV4-_lvQV1yPA1OrfArgFA');
    });

    it('SmileWanted - Verify build request with GDPR without gdprApplies', function () {
      config.setConfig({
        'currency': {
          'adServerCurrency': 'EUR'
        },
        consentManagement: {
          cmp: 'iab',
          consentRequired: true,
          timeout: 1000,
          allowAuctionWithoutConsent: true
        }
      });
      const request = spec.buildRequests(DEFAULT_PARAMS, {
        gdprConsent: {
          consentString: 'BOO_ch7OO_ch7AKABBENA2-AAAAZ97_______9______9uz_Gv_r_f__33e8_39v_h_7_u___m_-zzV4-_lvQV1yPA1OrfArgFA'
        }
      });
      const requestContent = JSON.parse(request[0].data);
      expect(requestContent).to.not.have.property('gdpr');
      expect(requestContent).to.have.property('gdpr_consent').and.to.equal('BOO_ch7OO_ch7AKABBENA2-AAAAZ97_______9______9uz_Gv_r_f__33e8_39v_h_7_u___m_-zzV4-_lvQV1yPA1OrfArgFA');
    });
  });

  it('SmileWanted - Verify parse response', function () {
    const request = spec.buildRequests(DEFAULT_PARAMS);
    const bids = spec.interpretResponse(BID_RESPONSE, request[0]);
    expect(bids).to.have.lengthOf(1);
    const bid = bids[0];
    expect(bid.cpm).to.equal(3);
    expect(bid.adUrl).to.equal('https://www.smilewanted.com');
    expect(bid.ad).to.equal('< --- sw script --- >');
    expect(bid.width).to.equal(300);
    expect(bid.height).to.equal(250);
    expect(bid.creativeId).to.equal('crea_sw_1');
    expect(bid.currency).to.equal('EUR');
    expect(bid.netRevenue).to.equal(true);
    expect(bid.ttl).to.equal(300);
    expect(bid.requestId).to.equal(DEFAULT_PARAMS[0].bidId);

    expect(function () {
      spec.interpretResponse(BID_RESPONSE, {
        data: 'invalid Json'
      })
    }).to.not.throw();
  });

  it('SmileWanted - Verify bidder code', function () {
    expect(spec.code).to.equal('smilewanted');
  });

  it('SmileWanted - Verify bidder aliases', function () {
    expect(spec.aliases).to.have.lengthOf(2);
    expect(spec.aliases[0]).to.equal('smile');
    expect(spec.aliases[1]).to.equal('sw');
  });

  it('SmileWanted - Verify if bid request valid', function () {
    expect(spec.isBidRequestValid(DEFAULT_PARAMS[0])).to.equal(true);
    expect(spec.isBidRequestValid({
      params: {
        zoneId: 1234
      }
    })).to.equal(true);
  });

  it('SmileWanted - Verify if params(zoneId) is not passed', function () {
    expect(spec.isBidRequestValid({})).to.equal(false);
    expect(spec.isBidRequestValid({
      params: {}
    })).to.equal(false);
  });

  it('SmileWanted - Verify user sync', function () {
    var syncs = spec.getUserSyncs({
      iframeEnabled: true
    }, [BID_RESPONSE]);
    expect(syncs).to.have.lengthOf(1);
    expect(syncs[0].type).to.equal('iframe');
    expect(syncs[0].url).to.equal('https://csync.smilewanted.com');

    syncs = spec.getUserSyncs({
      iframeEnabled: false
    }, [BID_RESPONSE]);
    expect(syncs).to.have.lengthOf(0);

    syncs = spec.getUserSyncs({
      iframeEnabled: true
    }, []);
    expect(syncs).to.have.lengthOf(0);
  });
});
