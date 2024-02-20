import { expect } from 'chai';
import { spec } from 'modules/smilewantedBidAdapter.js';
import { config } from 'src/config.js';

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
  ortb2Imp: {
    ext: {
      tid: 'trans_abcd1234',
    }
  },
}];

const DISPLAY_REQUEST_WITH_EIDS = [{
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
  ortb2Imp: {
    ext: {
      tid: 'trans_abcd1234',
    }
  },
  userIdAsEids: [{
    source: 'pubcid.org',
    uids: [{
      id: 'some-random-id-value',
      atype: 1
    }]
  }, {
    source: 'adserver.org',
    uids: [{
      id: 'some-random-id-value',
      atype: 1,
      ext: {
        rtiPartner: 'TDID'
      }
    }]
  }]
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
  ortb2Imp: {
    ext: {
      tid: 'trans_abcd1234',
    }
  },
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
    video: {
      context: 'instream',
      mimes: ['video/mp4'],
      minduration: 0,
      maxduration: 120,
      protocols: [1, 2, 3, 4, 5, 6, 7, 8],
      startdelay: 0,
      placement: 1,
      skip: 1,
      skipafter: 10,
      minbitrate: 10,
      maxbitrate: 10,
      delivery: [1],
      playbackmethod: [2],
      api: [1, 2],
      linearity: 1,
      playerSize: [640, 480]
    }
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
  ortb2Imp: {
    ext: {
      tid: 'trans_abcd1234',
    }
  }
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
  ortb2Imp: {
    ext: {
      tid: 'trans_abcd1234',
    }
  }
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

const NATIVE_REQUEST = [{
  adUnitCode: 'native_300x250',
  code: '/19968336/prebid_native_example_1',
  bidId: '12345',
  sizes: [
    [300, 250]
  ],
  mediaTypes: {
    native: {
      sendTargetingKeys: false,
      title: {
        required: true,
        len: 140
      },
      image: {
        required: true,
        sizes: [300, 250]
      },
      icon: {
        required: false,
        sizes: [50, 50]
      },
      sponsoredBy: {
        required: true
      },
      body: {
        required: true
      },
      clickUrl: {
        required: false
      },
      privacyLink: {
        required: false
      },
      cta: {
        required: false
      },
      rating: {
        required: false
      },
      likes: {
        required: false
      },
      downloads: {
        required: false
      },
      price: {
        required: false
      },
      salePrice: {
        required: false
      },
      phone: {
        required: false
      },
      address: {
        required: false
      },
      desc2: {
        required: false
      },
      displayUrl: {
        required: false
      }
    }
  },
  bidder: 'smilewanted',
  params: {
    zoneId: 4,
  },
  requestId: 'request_abcd1234',
  ortb2Imp: {
    ext: {
      tid: 'trans_abcd1234',
    }
  },
}];

const BID_RESPONSE_NATIVE = {
  body: {
    cpm: 3,
    width: 300,
    height: 250,
    creativeId: 'crea_sw_1',
    currency: 'EUR',
    isNetCpm: true,
    ttl: 300,
    ad: '{"link":{"url":"https://www.smilewanted.com"},"assets":[{"id":0,"required":1,"title":{"len":50}},{"id":1,"required":1,"img":{"type":3,"w":150,"h":50,"ext":{"aspectratios":["2:1"]}}},{"id":2,"required":0,"img":{"type":1,"w":50,"h":50,"ext":{"aspectratios":["2:1"]}}},{"id":3,"required":1,"data":{"type":1,"value":"Smilewanted sponsor"}},{"id":4,"required":1,"data":{"type":2,"value":"Smilewanted Description"}}]}',
    cSyncUrl: 'https://csync.smilewanted.com',
    formatTypeSw: 'native'
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
    expect(requestVideoInstreamContent).to.have.property('videoParams');
    expect(requestVideoInstreamContent.videoParams).to.have.property('context').and.to.equal('instream').and.to.not.be.undefined;
    expect(requestVideoInstreamContent.videoParams).to.have.property('mimes').to.be.an('array').that.include('video/mp4').and.to.not.be.undefined;
    expect(requestVideoInstreamContent.videoParams).to.have.property('minduration').and.to.equal(0).and.to.not.be.undefined;
    expect(requestVideoInstreamContent.videoParams).to.have.property('maxduration').and.to.equal(120).and.to.not.be.undefined;
    expect(requestVideoInstreamContent.videoParams).to.have.property('protocols').to.be.an('array').that.include.members([1, 2, 3, 4, 5, 6, 7, 8]).and.to.not.be.undefined;
    expect(requestVideoInstreamContent.videoParams).to.have.property('startdelay').and.to.equal(0).and.to.not.be.undefined;
    expect(requestVideoInstreamContent.videoParams).to.have.property('placement').and.to.equal(1).and.to.not.be.undefined;
    expect(requestVideoInstreamContent.videoParams).to.have.property('skip').and.to.equal(1).and.to.not.be.undefined;
    expect(requestVideoInstreamContent.videoParams).to.have.property('skipafter').and.to.equal(10).and.to.not.be.undefined;
    expect(requestVideoInstreamContent.videoParams).to.have.property('minbitrate').and.to.equal(10).and.to.not.be.undefined;
    expect(requestVideoInstreamContent.videoParams).to.have.property('maxbitrate').and.to.equal(10).and.to.not.be.undefined;
    expect(requestVideoInstreamContent.videoParams).to.have.property('delivery').to.be.an('array').that.include(1).and.to.not.be.undefined;
    expect(requestVideoInstreamContent.videoParams).to.have.property('playbackmethod').to.be.an('array').that.include(2).and.to.not.be.undefined;
    expect(requestVideoInstreamContent.videoParams).to.have.property('api').to.be.an('array').that.include.members([1, 2]).and.to.not.be.undefined;
    expect(requestVideoInstreamContent.videoParams).to.have.property('linearity').and.to.equal(1).and.to.not.be.undefined;
    expect(requestVideoInstreamContent.videoParams).to.have.property('playerSize').to.be.an('array').that.include.members([640, 480]).and.to.not.be.undefined;

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

    const requestNative = spec.buildRequests(NATIVE_REQUEST);
    expect(requestNative[0]).to.have.property('url').and.to.equal('https://prebid.smilewanted.com');
    expect(requestNative[0]).to.have.property('method').and.to.equal('POST');
    const requestNativeContent = JSON.parse(requestNative[0].data);
    expect(requestNativeContent).to.have.property('zoneId').and.to.equal(4);
    expect(requestNativeContent).to.have.property('currencyCode').and.to.equal('EUR');
    expect(requestNativeContent).to.have.property('sizes');
    expect(requestNativeContent.sizes[0]).to.have.property('w').and.to.equal(300);
    expect(requestNativeContent.sizes[0]).to.have.property('h').and.to.equal(250);
    expect(requestNativeContent).to.have.property('transactionId').and.to.not.equal(null).and.to.not.be.undefined;
    expect(requestNativeContent).to.have.property('context').and.to.equal('native').and.to.not.be.undefined;
    expect(requestNativeContent).to.have.property('nativeParams');
    expect(requestNativeContent.nativeParams.title).to.have.property('required').and.to.equal(true);
    expect(requestNativeContent.nativeParams.title).to.have.property('len').and.to.equal(140);
    expect(requestNativeContent.nativeParams.image).to.have.property('required').and.to.equal(true);
    expect(requestNativeContent.nativeParams.image).to.have.property('sizes').to.be.an('array').that.include.members([300, 250]).and.to.not.be.undefined;
    expect(requestNativeContent.nativeParams.icon).to.have.property('required').and.to.equal(false);
    expect(requestNativeContent.nativeParams.icon).to.have.property('sizes').to.be.an('array').that.include.members([50, 50]).and.to.not.be.undefined;
    expect(requestNativeContent.nativeParams.sponsoredBy).to.have.property('required').and.to.equal(true);
    expect(requestNativeContent.nativeParams.body).to.have.property('required').and.to.equal(true);
    expect(requestNativeContent.nativeParams.clickUrl).to.have.property('required').and.to.equal(false);
    expect(requestNativeContent.nativeParams.privacyLink).to.have.property('required').and.to.equal(false);
    expect(requestNativeContent.nativeParams.cta).to.have.property('required').and.to.equal(false);
    expect(requestNativeContent.nativeParams.rating).to.have.property('required').and.to.equal(false);
    expect(requestNativeContent.nativeParams.likes).to.have.property('required').and.to.equal(false);
    expect(requestNativeContent.nativeParams.downloads).to.have.property('required').and.to.equal(false);
    expect(requestNativeContent.nativeParams.price).to.have.property('required').and.to.equal(false);
    expect(requestNativeContent.nativeParams.salePrice).to.have.property('required').and.to.equal(false);
    expect(requestNativeContent.nativeParams.phone).to.have.property('required').and.to.equal(false);
    expect(requestNativeContent.nativeParams.address).to.have.property('required').and.to.equal(false);
    expect(requestNativeContent.nativeParams.desc2).to.have.property('required').and.to.equal(false);
    expect(requestNativeContent.nativeParams.displayUrl).to.have.property('required').and.to.equal(false);
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

  it('Verify external ids in request and ids found', function () {
    config.setConfig({
      'currency': {
        'adServerCurrency': 'EUR'
      }
    });
    const request = spec.buildRequests(DISPLAY_REQUEST_WITH_EIDS, {});
    const requestContent = JSON.parse(request[0].data);

    expect(requestContent).to.have.property('eids');
    expect(requestContent.eids).to.not.equal(null).and.to.not.be.undefined;
    expect(requestContent.eids.length).to.greaterThan(0);
    for (let index in requestContent.eids) {
      let eid = requestContent.eids[index];
      expect(eid.source).to.not.equal(null).and.to.not.be.undefined;
      expect(eid.uids).to.not.equal(null).and.to.not.be.undefined;
      for (let uidsIndex in eid.uids) {
        let uid = eid.uids[uidsIndex];
        expect(uid.id).to.not.equal(null).and.to.not.be.undefined;
      }
    }
  });

  describe('gdpr tests', function () {
    afterEach(function () {
      config.resetConfig();
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

  it('SmileWanted - Verify parse response - Video Outstream', function () {
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

  it('SmileWanted - Verify parse response - Native', function () {
    const request = spec.buildRequests(NATIVE_REQUEST);
    const bids = spec.interpretResponse(BID_RESPONSE_NATIVE, request[0]);
    expect(bids).to.have.lengthOf(1);
    const bid = bids[0];
    expect(bid.cpm).to.equal(3);
    expect(bid.ad).to.equal('{"link":{"url":"https://www.smilewanted.com"},"assets":[{"id":0,"required":1,"title":{"len":50}},{"id":1,"required":1,"img":{"type":3,"w":150,"h":50,"ext":{"aspectratios":["2:1"]}}},{"id":2,"required":0,"img":{"type":1,"w":50,"h":50,"ext":{"aspectratios":["2:1"]}}},{"id":3,"required":1,"data":{"type":1,"value":"Smilewanted sponsor"}},{"id":4,"required":1,"data":{"type":2,"value":"Smilewanted Description"}}]}');
    expect(bid.width).to.equal(300);
    expect(bid.height).to.equal(250);
    expect(bid.creativeId).to.equal('crea_sw_1');
    expect(bid.currency).to.equal('EUR');
    expect(bid.netRevenue).to.equal(true);
    expect(bid.ttl).to.equal(300);
    expect(bid.requestId).to.equal(NATIVE_REQUEST[0].bidId);

    expect(function () {
      spec.interpretResponse(BID_RESPONSE_NATIVE, {
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
