// import or require modules necessary for the test, e.g.:
import {expect} from 'chai'; // may prefer 'assert' in place of 'expect'
// import spec from 'modules/richAudienceBidAdapter';
import {
  spec
} from 'modules/richAudienceBidAdapter';
import {config} from 'src/config';
import * as utils from 'src/utils';

describe('Rich Audience adapter tests', function () {
  var DEFAULT_PARAMS = [{
    adUnitCode: 'test-div',
    bidId: '2c7c8e9c900244',
    sizes: [
      [300, 250],
      [300, 600],
      [728, 90],
      [970, 250]
    ],
    bidder: 'richaudience',
    params: {
      bidfloor: 0.5,
      pid: 'ADb1f40rmi',
      supplyType: 'site'
    },
    auctionId: '0cb3144c-d084-4686-b0d6-f5dbe917c563',
    bidRequestsCount: 1,
    bidderRequestId: '1858b7382993ca',
    transactionId: '29df2112-348b-4961-8863-1b33684d95e6'
  }];

  var DEFAULT_PARAMS_APP = [{
    adUnitCode: 'test-div',
    bidId: '2c7c8e9c900244',
    sizes: [
      [300, 250],
      [300, 600],
      [728, 90],
      [970, 250]
    ],
    bidder: 'richaudience',
    params: {
      bidfloor: 0.5,
      ifa: 'AAAAAAAAA-BBBB-CCCC-1111-222222220000',
      pid: 'ADb1f40rmi',
      supplyType: 'app',
    },
    auctionId: '0cb3144c-d084-4686-b0d6-f5dbe917c563',
    bidRequestsCount: 1,
    bidderRequestId: '1858b7382993ca',
    transactionId: '29df2112-348b-4961-8863-1b33684d95e6'
  }];

  var DEFAULT_PARAMS_WO_OPTIONAL = [{
    adUnitCode: 'test-div',
    bidId: '2c7c8e9c900244',
    sizes: [
      [300, 250],
      [300, 600],
      [728, 90],
      [970, 250]
    ],
    bidder: 'richaudience',
    params: {
      pid: 'ADb1f40rmi',
      supplyType: 'site',
    },
    auctionId: '851adee7-d843-48f9-a7e9-9ff00573fcbf',
    bidRequestsCount: 1,
    bidderRequestId: '1858b7382993ca',
    transactionId: '29df2112-348b-4961-8863-1b33684d95e6'
  }];

  var BID_RESPONSE = {
    body: {
      cpm: 1.50,
      adm: '<!-- script -->',
      media_type: 'js',
      width: 300,
      height: 250,
      creative_id: '189198063',
      netRevenue: true,
      currency: 'USD',
      ttl: 300
    }
  };

  var BID_RESPONSE_VIDEO = {
    body: {
      cpm: 1.50,
      media_type: 'video',
      width: 1,
      height: 1,
      creative_id: '189198063',
      netRevenue: true,
      currency: 'USD',
      ttl: 300,
      vastXML: '<VAST></VAST>'
    }
  };

  it('Verify build request', function () {
    config.setConfig({
      'currency': {
        'adServerCurrency': 'USD'
      }
    });

    const request = spec.buildRequests(DEFAULT_PARAMS, {
      gdprConsent: {
        consentString: 'BOZcQl_ObPFjWAeABAESCD-AAAAjx7_______9______9uz_Ov_v_f__33e8__9v_l_7_-___u_-33d4-_1vf99yfm1-7ftr3tp_87ues2_Xur__59__3z3_NohBgA',
        gdprApplies: true
      },
      refererInfo: {
        referer: 'http://domain.com',
        numIframes: 0
      }
    });

    expect(request[0]).to.have.property('method').and.to.equal('POST');
    const requestContent = JSON.parse(request[0].data);
    expect(requestContent).to.have.property('bidfloor').and.to.equal(0.5);
    expect(requestContent).to.have.property('pid').and.to.equal('ADb1f40rmi');
    expect(requestContent).to.have.property('supplyType').and.to.equal('site');
    expect(requestContent).to.have.property('auctionId').and.to.equal('0cb3144c-d084-4686-b0d6-f5dbe917c563');
    expect(requestContent).to.have.property('bidId').and.to.equal('2c7c8e9c900244');
    expect(requestContent).to.have.property('BidRequestsCount').and.to.equal(1);
    expect(requestContent).to.have.property('bidder').and.to.equal('richaudience');
    expect(requestContent).to.have.property('bidderRequestId').and.to.equal('1858b7382993ca');
    expect(requestContent).to.have.property('tagId').and.to.equal('test-div');
    expect(requestContent).to.have.property('referer').and.to.equal('http%3A%2F%2Fdomain.com');
    expect(requestContent).to.have.property('sizes');
    expect(requestContent.sizes[0]).to.have.property('w').and.to.equal(300);
    expect(requestContent.sizes[0]).to.have.property('h').and.to.equal(250);
    expect(requestContent.sizes[1]).to.have.property('w').and.to.equal(300);
    expect(requestContent.sizes[1]).to.have.property('h').and.to.equal(600);
    expect(requestContent).to.have.property('transactionId').and.to.equal('29df2112-348b-4961-8863-1b33684d95e6');
    expect(requestContent).to.have.property('timeout').and.to.equal(3000);
  });

  describe('gdpr test', function () {
    it('Verify build request with GDPR', function () {
      config.setConfig({
        'currency': {
          'adServerCurrency': 'USD'
        },
        consentManagement: {
          cmpApi: 'iab',
          timeout: 8000,
          allowAuctionWithoutConsent: true
        }
      });

      const request = spec.buildRequests(DEFAULT_PARAMS_WO_OPTIONAL, {
        gdprConsent: {
          consentString: 'BOZcQl_ObPFjWAeABAESCD-AAAAjx7_______9______9uz_Ov_v_f__33e8__9v_l_7_-___u_-33d4-_1vf99yfm1-7ftr3tp_87ues2_Xur__59__3z3_NohBgA',
          gdprApplies: true
        },
        refererInfo: {
          referer: 'http://domain.com',
          numIframes: 0
        }
      });
      const requestContent = JSON.parse(request[0].data);
      expect(requestContent).to.have.property('gdpr_consent').and.to.equal('BOZcQl_ObPFjWAeABAESCD-AAAAjx7_______9______9uz_Ov_v_f__33e8__9v_l_7_-___u_-33d4-_1vf99yfm1-7ftr3tp_87ues2_Xur__59__3z3_NohBgA');
    });

    it('Verify adding ifa when supplyType equal to app', function () {
      const request = spec.buildRequests(DEFAULT_PARAMS_APP, {
        gdprConsent: {
          consentString: 'BOZcQl_ObPFjWAeABAESCD-AAAAjx7_______9______9uz_Ov_v_f__33e8__9v_l_7_-___u_-33d4-_1vf99yfm1-7ftr3tp_87ues2_Xur__59__3z3_NohBgA',
          gdprApplies: true
        },
        refererInfo: {
          referer: 'http://domain.com',
          numIframes: 0
        }
      });
    });

    it('Verify build request with GDPR without gdprApplies', function () {
      config.setConfig({
        'currency': {
          'adServerCurrency': 'EUR'
        },
        consentManagement: {
          cmp: 'iab',
          consentRequired: true,
          timeout: 8000,
          allowAuctionWithoutConsent: true
        }
      });
      const request = spec.buildRequests(DEFAULT_PARAMS_WO_OPTIONAL, {
        gdprConsent: {
          consentString: 'BOZcQl_ObPFjWAeABAESCD-AAAAjx7_______9______9uz_Ov_v_f__33e8__9v_l_7_-___u_-33d4-_1vf99yfm1-7ftr3tp_87ues2_Xur__59__3z3_NohBgA'
        },
        refererInfo: {
          referer: 'http://domain.com',
          numIframes: 0
        }
      });
      const requestContent = JSON.parse(request[0].data);
      expect(requestContent).to.have.property('gdpr_consent').and.to.equal('BOZcQl_ObPFjWAeABAESCD-AAAAjx7_______9______9uz_Ov_v_f__33e8__9v_l_7_-___u_-33d4-_1vf99yfm1-7ftr3tp_87ues2_Xur__59__3z3_NohBgA');
    });
  });

  it('Verify interprete response', function () {
    const request = spec.buildRequests(DEFAULT_PARAMS, {
      gdprConsent: {
        consentString: 'BOZcQl_ObPFjWAeABAESCD-AAAAjx7_______9______9uz_Ov_v_f__33e8__9v_l_7_-___u_-33d4-_1vf99yfm1-7ftr3tp_87ues2_Xur__59__3z3_NohBgA',
        gdprApplies: true
      },
      refererInfo: {
        referer: 'http://domain.com',
        numIframes: 0
      }
    });

    const bids = spec.interpretResponse(BID_RESPONSE, request[0]);
    expect(bids).to.have.lengthOf(1);
    const bid = bids[0];
    expect(bid.cpm).to.equal(1.50);
    expect(bid.ad).to.equal('<!-- script -->');
    expect(bid.mediaType).to.equal('js');
    expect(bid.width).to.equal(300);
    expect(bid.height).to.equal(250);
    expect(bid.creativeId).to.equal('189198063');
    expect(bid.netRevenue).to.equal(true);
    expect(bid.currency).to.equal('USD');
    expect(bid.ttl).to.equal(300);
  });

  it('no banner media response', function () {
    const request = spec.buildRequests(DEFAULT_PARAMS, {
      gdprConsent: {
        consentString: 'BOZcQl_ObPFjWAeABAESCD-AAAAjx7_______9______9uz_Ov_v_f__33e8__9v_l_7_-___u_-33d4-_1vf99yfm1-7ftr3tp_87ues2_Xur__59__3z3_NohBgA',
        gdprApplies: true
      },
      refererInfo: {
        referer: 'http://domain.com',
        numIframes: 0
      }
    });

    const bids = spec.interpretResponse(BID_RESPONSE_VIDEO, request[0]);
    const bid = bids[0];
    expect(bid.vastXml).to.equal('<VAST></VAST>');
  });

  it('Verifies bidder_code', function () {
    expect(spec.code).to.equal('richaudience');
  });

  it('Verifies bidder aliases', function () {
    expect(spec.aliases).to.have.lengthOf(1);
    expect(spec.aliases[0]).to.equal('ra');
  });

  it('Verifies if bid request is valid', function () {
    expect(spec.isBidRequestValid(DEFAULT_PARAMS[0])).to.equal(true);
    expect(spec.isBidRequestValid(DEFAULT_PARAMS_WO_OPTIONAL[0])).to.equal(true);
    expect(spec.isBidRequestValid({})).to.equal(false);
    expect(spec.isBidRequestValid({
      params: {}
    })).to.equal(false);
    expect(spec.isBidRequestValid({
      params: {
        pid: 'ADb1f40rmi'
      }
    })).to.equal(false);
    expect(spec.isBidRequestValid({
      params: {
        supplyType: 'site'
      }
    })).to.equal(false);
    expect(spec.isBidRequestValid({
      params: {
        supplyType: 'app'
      }
    })).to.equal(false);
    expect(spec.isBidRequestValid({
      params: {
        pid: 'ADb1f40rmi',
        supplyType: 'site'
      }
    })).to.equal(true);
    expect(spec.isBidRequestValid({
      params: {
        pid: ['1gCB5ZC4XL', '1a40xk8qSV'],
        supplyType: 'site'
      }
    })).to.equal(true);
    expect(spec.isBidRequestValid({
      params: {
        pid: 'ADb1f40rmi',
        supplyType: 'site'
      }
    })).to.equal(true);
    expect(spec.isBidRequestValid({
      params: {
        pid: 'ADb1f40rmi',
        supplyType: 'app',
        ifa: 'AAAAAAAAA-BBBB-CCCC-1111-222222220000',
      }
    })).to.equal(true);
    expect(spec.isBidRequestValid({
      params: {
        pid: 'ADb1f40rmi',
        supplyType: 'site',
        bidfloor: 0.50,
      }
    })).to.equal(true);
    expect(spec.isBidRequestValid({
      params: {
        pid: 'ADb1f40rmi',
        supplyType: 'site',
        bidfloor: 0.50,
      }
    })).to.equal(true);
  });

  it('Verifies user sync', function () {
    var syncs = spec.getUserSyncs({
      iframeEnabled: true
    }, [BID_RESPONSE], {
      consentString: 'BOZcQl_ObPFjWAeABAESCD-AAAAjx7_______9______9uz_Ov_v_f__33e8__9v_l_7_-___u_-33d4-_1vf99yfm1-7ftr3tp_87ues2_Xur__59__3z3_NohBgA',
      gdprApplies: true
    });
    expect(syncs).to.have.lengthOf(1);
    expect(syncs[0].type).to.equal('iframe');
    syncs = spec.getUserSyncs({
      iframeEnabled: false
    }, [BID_RESPONSE], {
      consentString: 'BOZcQl_ObPFjWAeABAESCD-AAAAjx7_______9______9uz_Ov_v_f__33e8__9v_l_7_-___u_-33d4-_1vf99yfm1-7ftr3tp_87ues2_Xur__59__3z3_NohBgA',
      gdprApplies: true
    });
    expect(syncs).to.have.lengthOf(0);

    syncs = spec.getUserSyncs({
      iframeEnabled: true
    }, [], {consentString: '', gdprApplies: false});
    expect(syncs).to.have.lengthOf(1);
  });
});
