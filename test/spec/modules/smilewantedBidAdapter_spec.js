import { expect } from 'chai';
import { spec } from 'modules/smilewantedBidAdapter.js';
import { newBidder } from 'src/adapters/bidderFactory.js';
import { config } from 'src/config.js';
import * as utils from 'src/utils.js';
import { requestBidsHook } from 'modules/consentManagement.js';

const DISPLAY_REQUEST = [{
  adUnitCode: 'sw_300x250',
  bidId: '12345',
  sizes: [
    [300, 250],
    [300, 200]
  ],
  bidder: 'smilewanted',
  params: {
    zoneId: 1
  },
  requestId: 'request_abcd1234',
  transactionId: 'trans_abcd1234'
}];

const DISPLAY_REQUEST_WITH_POSITION_TYPE = [{
  adUnitCode: 'sw_300x250',
  bidId: '12345',
  sizes: [
    [300, 250],
    [300, 200]
  ],
  bidder: 'smilewanted',
  params: {
    zoneId: 1,
    positionType: 'infeed'
  },
  requestId: 'request_abcd1234',
  transactionId: 'trans_abcd1234'
}];

const BID_RESPONSE_DISPLAY = {
  body: {
    cpm: 3,
    width: 300,
    height: 250,
    creativeId: 'crea_sw_1',
    currency: 'EUR',
    isNetCpm: true,
    ttl: 300,
    ad: '< --- sw script --- >',
    cSyncUrl: 'https://csync.smilewanted.com'
  }
};

const VIDEO_INSTREAM_REQUEST = [{
  code: 'video1',
  mediaTypes: {
    video: {}
  },
  sizes: [
    [640, 480]
  ],
  bidder: 'smilewanted',
  params: {
    zoneId: 2,
    bidfloor: 2.50
  },
  requestId: 'request_abcd1234',
  transactionId: 'trans_abcd1234'
}];

const BID_RESPONSE_VIDEO_INSTREAM = {
  body: {
    cpm: 3,
    width: 640,
    height: 480,
    creativeId: 'crea_sw_2',
    currency: 'EUR',
    isNetCpm: true,
    ttl: 300,
    ad: 'https://vast.smilewanted.com',
    cSyncUrl: 'https://csync.smilewanted.com',
    formatTypeSw: 'video_instream'
  }
};

const VIDEO_OUTSTREAM_REQUEST = [{
  code: 'video1',
  mediaTypes: {
    video: {}
  },
  sizes: [
    [640, 480]
  ],
  bidder: 'smilewanted',
  params: {
    zoneId: 3,
    bidfloor: 2.50
  },
  requestId: 'request_abcd1234',
  transactionId: 'trans_abcd1234'
}];

const BID_RESPONSE_VIDEO_OUTSTREAM = {
  body: {
    cpm: 3,
    width: 640,
    height: 480,
    creativeId: 'crea_sw_3',
    currency: 'EUR',
    isNetCpm: true,
    ttl: 300,
    ad: 'https://vast.smilewanted.com',
    cSyncUrl: 'https://csync.smilewanted.com',
    OustreamTemplateUrl: 'https://prebid.smilewanted.com/scripts_outstream/infeed.js',
    formatTypeSw: 'video_outstream'
  }
};

// Default params with optional ones
describe('smilewantedBidAdapterTests', function () {
  it('SmileWanted - Verify build request', function () {
    config.setConfig({
      'currency': {
        'adServerCurrency': 'EUR'
      }
    });

    const requestDisplay = spec.buildRequests(DISPLAY_REQUEST);
    expect(requestDisplay[0]).to.have.property('url').and.to.equal('https://prebid.smilewanted.com');
    expect(requestDisplay[0]).to.have.property('method').and.to.equal('POST');
    const requestDisplayContent = JSON.parse(requestDisplay[0].data);
    expect(requestDisplayContent).to.have.property('zoneId').and.to.equal(1);
    expect(requestDisplayContent).to.have.property('currencyCode').and.to.equal('EUR');
    expect(requestDisplayContent).to.have.property('sizes');
    expect(requestDisplayContent.sizes[0]).to.have.property('w').and.to.equal(300);
    expect(requestDisplayContent.sizes[0]).to.have.property('h').and.to.equal(250);
    expect(requestDisplayContent.sizes[1]).to.have.property('w').and.to.equal(300);
    expect(requestDisplayContent.sizes[1]).to.have.property('h').and.to.equal(200);
    expect(requestDisplayContent).to.have.property('transactionId').and.to.not.equal(null).and.to.not.be.undefined;

    const requestVideoInstream = spec.buildRequests(VIDEO_INSTREAM_REQUEST);
    expect(requestVideoInstream[0]).to.have.property('url').and.to.equal('https://prebid.smilewanted.com');
    expect(requestVideoInstream[0]).to.have.property('method').and.to.equal('POST');
    const requestVideoInstreamContent = JSON.parse(requestVideoInstream[0].data);
    expect(requestVideoInstreamContent).to.have.property('zoneId').and.to.equal(2);
    expect(requestVideoInstreamContent).to.have.property('currencyCode').and.to.equal('EUR');
    expect(requestVideoInstreamContent).to.have.property('sizes');
    expect(requestVideoInstreamContent.sizes[0]).to.have.property('w').and.to.equal(640);
    expect(requestVideoInstreamContent.sizes[0]).to.have.property('h').and.to.equal(480);
    expect(requestVideoInstreamContent).to.have.property('transactionId').and.to.not.equal(null).and.to.not.be.undefined;

    const requestVideoOutstream = spec.buildRequests(VIDEO_OUTSTREAM_REQUEST);
    expect(requestVideoOutstream[0]).to.have.property('url').and.to.equal('https://prebid.smilewanted.com');
    expect(requestVideoOutstream[0]).to.have.property('method').and.to.equal('POST');
    const requestVideoOutstreamContent = JSON.parse(requestVideoOutstream[0].data);
    expect(requestVideoOutstreamContent).to.have.property('zoneId').and.to.equal(3);
    expect(requestVideoOutstreamContent).to.have.property('currencyCode').and.to.equal('EUR');
    expect(requestVideoOutstreamContent).to.have.property('sizes');
    expect(requestVideoOutstreamContent.sizes[0]).to.have.property('w').and.to.equal(640);
    expect(requestVideoOutstreamContent.sizes[0]).to.have.property('h').and.to.equal(480);
    expect(requestVideoOutstreamContent).to.have.property('transactionId').and.to.not.equal(null).and.to.not.be.undefined;
  });

  it('SmileWanted - Verify build request with referrer', function () {
    const request = spec.buildRequests(DISPLAY_REQUEST, {
      refererInfo: {
        page: 'https://localhost/Prebid.js/integrationExamples/gpt/hello_world.html'
      }
    });
    const requestContent = JSON.parse(request[0].data);
    expect(requestContent).to.have.property('pageDomain').and.to.equal('https://localhost/Prebid.js/integrationExamples/gpt/hello_world.html');
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
      const request = spec.buildRequests(DISPLAY_REQUEST, {
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
      const request = spec.buildRequests(DISPLAY_REQUEST, {
        gdprConsent: {
          consentString: 'BOO_ch7OO_ch7AKABBENA2-AAAAZ97_______9______9uz_Gv_r_f__33e8_39v_h_7_u___m_-zzV4-_lvQV1yPA1OrfArgFA'
        }
      });
      const requestContent = JSON.parse(request[0].data);
      expect(requestContent).to.not.have.property('gdpr');
      expect(requestContent).to.have.property('gdpr_consent').and.to.equal('BOO_ch7OO_ch7AKABBENA2-AAAAZ97_______9______9uz_Gv_r_f__33e8_39v_h_7_u___m_-zzV4-_lvQV1yPA1OrfArgFA');
    });
  });

  it('SmileWanted - Verify parse response - Display', function () {
    const request = spec.buildRequests(DISPLAY_REQUEST);
    const bids = spec.interpretResponse(BID_RESPONSE_DISPLAY, request[0]);
    expect(bids).to.have.lengthOf(1);
    const bid = bids[0];
    expect(bid.cpm).to.equal(3);
    expect(bid.ad).to.equal('< --- sw script --- >');
    expect(bid.width).to.equal(300);
    expect(bid.height).to.equal(250);
    expect(bid.creativeId).to.equal('crea_sw_1');
    expect(bid.currency).to.equal('EUR');
    expect(bid.netRevenue).to.equal(true);
    expect(bid.ttl).to.equal(300);
    expect(bid.requestId).to.equal(DISPLAY_REQUEST[0].bidId);

    expect(function () {
      spec.interpretResponse(BID_RESPONSE_DISPLAY, {
        data: 'invalid Json'
      })
    }).to.not.throw();
  });

  it('SmileWanted - Verify parse response - Video Instream', function () {
    const request = spec.buildRequests(VIDEO_INSTREAM_REQUEST);
    const bids = spec.interpretResponse(BID_RESPONSE_VIDEO_INSTREAM, request[0]);
    expect(bids).to.have.lengthOf(1);
    const bid = bids[0];
    expect(bid.cpm).to.equal(3);
    expect(bid.ad).to.equal(null);
    expect(bid.vastUrl).to.equal('https://vast.smilewanted.com');
    expect(bid.width).to.equal(640);
    expect(bid.height).to.equal(480);
    expect(bid.creativeId).to.equal('crea_sw_2');
    expect(bid.currency).to.equal('EUR');
    expect(bid.netRevenue).to.equal(true);
    expect(bid.ttl).to.equal(300);
    expect(bid.requestId).to.equal(VIDEO_INSTREAM_REQUEST[0].bidId);

    expect(function () {
      spec.interpretResponse(BID_RESPONSE_VIDEO_INSTREAM, {
        data: 'invalid Json'
      })
    }).to.not.throw();
  });

  it('SmileWanted - Verify parse response - Video Oustream', function () {
    const request = spec.buildRequests(VIDEO_OUTSTREAM_REQUEST);
    const bids = spec.interpretResponse(BID_RESPONSE_VIDEO_OUTSTREAM, request[0]);
    expect(bids).to.have.lengthOf(1);
    const bid = bids[0];
    expect(bid.cpm).to.equal(3);
    expect(bid.vastUrl).to.equal('https://vast.smilewanted.com');
    expect(bid.renderer.url).to.equal('https://prebid.smilewanted.com/scripts_outstream/infeed.js');
    expect(bid.width).to.equal(640);
    expect(bid.height).to.equal(480);
    expect(bid.creativeId).to.equal('crea_sw_3');
    expect(bid.currency).to.equal('EUR');
    expect(bid.netRevenue).to.equal(true);
    expect(bid.ttl).to.equal(300);
    expect(bid.requestId).to.equal(VIDEO_OUTSTREAM_REQUEST[0].bidId);

    expect(function () {
      spec.interpretResponse(BID_RESPONSE_VIDEO_OUTSTREAM, {
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
    expect(spec.isBidRequestValid(DISPLAY_REQUEST[0])).to.equal(true);
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

  it('SmileWanted - Verify if payload(positionType) is default value when nothing is passed on the param', function () {
    const request = spec.buildRequests(DISPLAY_REQUEST, {});
    const requestContent = JSON.parse(request[0].data);
    expect(requestContent).to.have.property('positionType').and.to.equal('');
  });

  it('SmileWanted - Verify if payload(positionType) is well passed', function () {
    const request = spec.buildRequests(DISPLAY_REQUEST_WITH_POSITION_TYPE, {});
    const requestContent = JSON.parse(request[0].data);
    expect(requestContent).to.have.property('positionType').and.to.equal('infeed');
  });

  it('SmileWanted - Verify user sync', function () {
    var syncs = spec.getUserSyncs({iframeEnabled: true}, {}, {
      consentString: 'foo'
    }, '1NYN');
    expect(syncs).to.have.lengthOf(1);
    expect(syncs[0].type).to.equal('iframe');
    expect(syncs[0].url).to.equal('https://csync.smilewanted.com?gdpr_consent=foo&us_privacy=1NYN');

    syncs = spec.getUserSyncs({
      iframeEnabled: false
    }, [BID_RESPONSE_DISPLAY]);
    expect(syncs).to.have.lengthOf(0);

    syncs = spec.getUserSyncs({
      iframeEnabled: true
    }, []);
    expect(syncs).to.have.lengthOf(1);
  });
});
