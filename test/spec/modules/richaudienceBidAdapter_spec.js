// import or require modules necessary for the test, e.g.:
import {expect} from 'chai'; // may prefer 'assert' in place of 'expect'
import {
  spec
} from 'modules/richaudienceBidAdapter.js';
import {config} from 'src/config.js';

describe('Richaudience adapter tests', function () {
  var DEFAULT_PARAMS_NEW_SIZES = [{
    adUnitCode: 'test-div',
    bidId: '2c7c8e9c900244',
    mediaTypes: {
      banner: {
        sizes: [
          [300, 250], [300, 600], [728, 90], [970, 250]]
      }
    },
    bidder: 'richaudience',
    params: {
      bidfloor: 0.5,
      pid: 'ADb1f40rmi',
      supplyType: 'site',
      keywords: 'key1=value1;key2=value2'
    },
    auctionId: '0cb3144c-d084-4686-b0d6-f5dbe917c563',
    bidRequestsCount: 1,
    bidderRequestId: '1858b7382993ca',
    transactionId: '29df2112-348b-4961-8863-1b33684d95e6',
    user: {}
  }];

  var DEFAULT_PARAMS_VIDEO_IN = [{
    adUnitCode: 'test-div',
    bidId: '2c7c8e9c900244',
    mediaTypes: {
      video: {
        context: 'instream',
        playerSize: [640, 480],
        mimes: ['video/mp4']
      }
    },
    bidder: 'richaudience',
    params: {
      bidfloor: 0.5,
      pid: 'ADb1f40rmi',
      supplyType: 'site'
    },
    auctionId: '0cb3144c-d084-4686-b0d6-f5dbe917c563',
    bidRequestsCount: 1,
    bidderRequestId: '1858b7382993ca',
    transactionId: '29df2112-348b-4961-8863-1b33684d95e6',
    user: {}
  }];

  var DEFAULT_PARAMS_VIDEO_OUT = [{
    adUnitCode: 'test-div',
    bidId: '2c7c8e9c900244',
    mediaTypes: {
      video: {
        context: 'outstream',
        playerSize: [640, 480],
        mimes: ['video/mp4']
      }
    },
    bidder: 'richaudience',
    params: {
      bidfloor: 0.5,
      pid: 'ADb1f40rmi',
      supplyType: 'site'
    },
    auctionId: '0cb3144c-d084-4686-b0d6-f5dbe917c563',
    bidRequestsCount: 1,
    bidderRequestId: '1858b7382993ca',
    transactionId: '29df2112-348b-4961-8863-1b33684d95e6',
    user: {}
  }];

  var DEFAULT_PARAMS_BANNER_OUTSTREAM = [{
    adUnitCode: 'test-div',
    bidId: '2c7c8e9c900244',
    mediaTypes: {
      banner: {
        sizes: [[300, 250], [600, 300]]
      }
    },
    bidder: 'richaudience',
    params: {
      bidfloor: 0.5,
      pid: 'ADb1f40rmi',
      supplyType: 'site'
    },
    auctionId: '0cb3144c-d084-4686-b0d6-f5dbe917c563',
    bidRequestsCount: 1,
    bidderRequestId: '1858b7382993ca',
    transactionId: '29df2112-348b-4961-8863-1b33684d95e6',
    user: {}
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
      ttl: 300,
      dealId: 'dealId',
      adomain: 'richaudience.com'
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
      vastXML: '<VAST></VAST>',
      dealId: 'dealId',
      adomain: 'richaudience.com'
    }
  };

  var DEFAULT_PARAMS_GDPR = {
    gdprConsent: {
      consentString: 'BOZcQl_ObPFjWAeABAESCD-AAAAjx7_______9______9uz_Ov_v_f__33e8__9v_l_7_-___u_-33d4-_1vf99yfm1-7ftr3tp_87ues2_Xur__59__3z3_NohBgA',
      gdprApplies: true
    },
    refererInfo: {
      page: 'http://domain.com',
      numIframes: 0
    }
  }

  it('Referer undefined', function() {
    config.setConfig({
      'currency': {'adServerCurrency': 'USD'}
    })

    const request = spec.buildRequests(DEFAULT_PARAMS_NEW_SIZES, {
      gdprConsent: {
        consentString: 'BOZcQl_ObPFjWAeABAESCD-AAAAjx7_______9______9uz_Ov_v_f__33e8__9v_l_7_-___u_-33d4-_1vf99yfm1-7ftr3tp_87ues2_Xur__59__3z3_NohBgA',
        gdprApplies: true
      },
      refererInfo: {}
    })
    const requestContent = JSON.parse(request[0].data);
    expect(requestContent).to.have.property('referer').and.to.equal(null);
    expect(requestContent).to.have.property('referer').and.to.equal(null);
  })

  it('Verify build request to prebid 3.0 display test', function() {
    const request = spec.buildRequests(DEFAULT_PARAMS_NEW_SIZES, {
      gdprConsent: {
        consentString: 'BOZcQl_ObPFjWAeABAESCD-AAAAjx7_______9______9uz_Ov_v_f__33e8__9v_l_7_-___u_-33d4-_1vf99yfm1-7ftr3tp_87ues2_Xur__59__3z3_NohBgA',
        gdprApplies: true
      },
      refererInfo: {
        page: 'https://domain.com',
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
    expect(requestContent).to.have.property('referer').and.to.equal('https%3A%2F%2Fdomain.com');
    expect(requestContent).to.have.property('sizes');
    expect(requestContent.sizes[0]).to.have.property('w').and.to.equal(300);
    expect(requestContent.sizes[0]).to.have.property('h').and.to.equal(250);
    expect(requestContent.sizes[1]).to.have.property('w').and.to.equal(300);
    expect(requestContent.sizes[1]).to.have.property('h').and.to.equal(600);
    expect(requestContent.sizes[2]).to.have.property('w').and.to.equal(728);
    expect(requestContent.sizes[2]).to.have.property('h').and.to.equal(90);
    expect(requestContent.sizes[3]).to.have.property('w').and.to.equal(970);
    expect(requestContent.sizes[3]).to.have.property('h').and.to.equal(250);
    expect(requestContent).to.have.property('transactionId').and.to.equal('29df2112-348b-4961-8863-1b33684d95e6');
    expect(requestContent).to.have.property('timeout').and.to.equal(3000);
    expect(requestContent).to.have.property('numIframes').and.to.equal(0);
    expect(typeof requestContent.scr_rsl === 'string')
    expect(typeof requestContent.cpuc === 'number')
    expect(requestContent).to.have.property('kws').and.to.equal('key1=value1;key2=value2');
  })

  it('Verify build request to prebid video inestream', function() {
    const request = spec.buildRequests(DEFAULT_PARAMS_VIDEO_IN, {
      gdprConsent: {
        consentString: 'BOZcQl_ObPFjWAeABAESCD-AAAAjx7_______9______9uz_Ov_v_f__33e8__9v_l_7_-___u_-33d4-_1vf99yfm1-7ftr3tp_87ues2_Xur__59__3z3_NohBgA',
        gdprApplies: true
      },
      refererInfo: {
        page: 'https://domain.com',
        numIframes: 0
      }
    });

    expect(request[0]).to.have.property('method').and.to.equal('POST');
    const requestContent = JSON.parse(request[0].data);

    expect(requestContent).to.have.property('demand').and.to.equal('video');
    expect(requestContent.videoData).to.have.property('format').and.to.equal('instream');
  })

  it('Verify build request to prebid video outstream', function() {
    const request = spec.buildRequests(DEFAULT_PARAMS_VIDEO_OUT, {
      gdprConsent: {
        consentString: 'BOZcQl_ObPFjWAeABAESCD-AAAAjx7_______9______9uz_Ov_v_f__33e8__9v_l_7_-___u_-33d4-_1vf99yfm1-7ftr3tp_87ues2_Xur__59__3z3_NohBgA',
        gdprApplies: true
      },
      refererInfo: {
        page: 'https://domain.com',
        numIframes: 0
      }
    });

    expect(request[0]).to.have.property('method').and.to.equal('POST');
    const requestContent = JSON.parse(request[0].data);

    expect(requestContent).to.have.property('demand').and.to.equal('video');
    expect(requestContent.videoData).to.have.property('format').and.to.equal('outstream');
  })

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
          page: 'https://domain.com',
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
          page: 'https://domain.com',
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
          page: 'https://domain.com',
          numIframes: 0
        }
      });
      const requestContent = JSON.parse(request[0].data);
      expect(requestContent).to.have.property('gdpr_consent').and.to.equal('BOZcQl_ObPFjWAeABAESCD-AAAAjx7_______9______9uz_Ov_v_f__33e8__9v_l_7_-___u_-33d4-_1vf99yfm1-7ftr3tp_87ues2_Xur__59__3z3_NohBgA');
    });
  });

  describe('UID test', function () {
    config.setConfig({
      consentManagement: {
        cmpApi: 'iab',
        timeout: 5000,
        allowAuctionWithoutConsent: true
      },
      userSync: {
        userIds: [{
          name: 'id5Id',
          params: {
            partner: 173, // change to the Partner Number you received from ID5
            pd: 'MT1iNTBjY...' // optional, see table below for a link to how to generate this
          },
          storage: {
            type: 'html5', // "html5" is the required storage type
            name: 'id5id', // "id5id" is the required storage name
            expires: 90, // storage lasts for 90 days
            refreshInSeconds: 8 * 3600 // refresh ID every 8 hours to ensure it's fresh
          }
        }],
        auctionDelay: 50 // 50ms maximum auction delay, applies to all userId modules
      }
    });
    it('Verify build id5', function () {
      var request;
      DEFAULT_PARAMS_WO_OPTIONAL[0].userId = {};
      DEFAULT_PARAMS_WO_OPTIONAL[0].userId.id5id = { uid: 1 };
      request = spec.buildRequests(DEFAULT_PARAMS_WO_OPTIONAL, DEFAULT_PARAMS_GDPR);
      var requestContent = JSON.parse(request[0].data);

      expect(requestContent.user.eids).to.equal(undefined);

      DEFAULT_PARAMS_WO_OPTIONAL[0].userId.id5id = { uid: [] };
      request = spec.buildRequests(DEFAULT_PARAMS_WO_OPTIONAL, DEFAULT_PARAMS_GDPR);
      requestContent = JSON.parse(request[0].data);
      expect(requestContent.user.eids).to.equal(undefined);

      DEFAULT_PARAMS_WO_OPTIONAL[0].userId.id5id = { uid: null };
      request = spec.buildRequests(DEFAULT_PARAMS_WO_OPTIONAL, DEFAULT_PARAMS_GDPR);
      requestContent = JSON.parse(request[0].data);
      expect(requestContent.user.eids).to.equal(undefined);

      DEFAULT_PARAMS_WO_OPTIONAL[0].userId.id5id = { uid: {} };
      request = spec.buildRequests(DEFAULT_PARAMS_WO_OPTIONAL, DEFAULT_PARAMS_GDPR);
      requestContent = JSON.parse(request[0].data);
      expect(requestContent.user.eids).to.equal(undefined);

      DEFAULT_PARAMS_WO_OPTIONAL[0].userId.id5id = null;
      request = spec.buildRequests(DEFAULT_PARAMS_WO_OPTIONAL, DEFAULT_PARAMS_GDPR);
      requestContent = JSON.parse(request[0].data);
      expect(requestContent.user.eids).to.equal(undefined);

      DEFAULT_PARAMS_WO_OPTIONAL[0].userId.id5id = {};
      request = spec.buildRequests(DEFAULT_PARAMS_WO_OPTIONAL, DEFAULT_PARAMS_GDPR);
      requestContent = JSON.parse(request[0].data);
      expect(requestContent.user.eids).to.equal(undefined);
    });

    it('Verify build pubCommonId', function () {
      DEFAULT_PARAMS_WO_OPTIONAL[0].userId = {};
      DEFAULT_PARAMS_WO_OPTIONAL[0].userId.pubcid = 'pub_common_user_id';

      var request = spec.buildRequests(DEFAULT_PARAMS_WO_OPTIONAL, DEFAULT_PARAMS_GDPR);
      var requestContent = JSON.parse(request[0].data);

      expect(requestContent.user).to.deep.equal([{
        'userId': 'pub_common_user_id',
        'source': 'pubcommon'
      }]);

      var request;
      DEFAULT_PARAMS_WO_OPTIONAL[0].userId = {};
      DEFAULT_PARAMS_WO_OPTIONAL[0].userId.pubcid = 1;
      request = spec.buildRequests(DEFAULT_PARAMS_WO_OPTIONAL, DEFAULT_PARAMS_GDPR);
      var requestContent = JSON.parse(request[0].data);
      expect(requestContent.user.eids).to.equal(undefined);

      DEFAULT_PARAMS_WO_OPTIONAL[0].userId.pubcid = [];
      request = spec.buildRequests(DEFAULT_PARAMS_WO_OPTIONAL, DEFAULT_PARAMS_GDPR);
      requestContent = JSON.parse(request[0].data);
      expect(requestContent.user.eids).to.equal(undefined);

      DEFAULT_PARAMS_WO_OPTIONAL[0].userId.pubcid = null;
      request = spec.buildRequests(DEFAULT_PARAMS_WO_OPTIONAL, DEFAULT_PARAMS_GDPR);
      requestContent = JSON.parse(request[0].data);
      expect(requestContent.user.eids).to.equal(undefined);

      DEFAULT_PARAMS_WO_OPTIONAL[0].userId.pubcid = {};
      request = spec.buildRequests(DEFAULT_PARAMS_WO_OPTIONAL, DEFAULT_PARAMS_GDPR);
      requestContent = JSON.parse(request[0].data);
      expect(requestContent.user.eids).to.equal(undefined);
    });

    it('Verify build criteoId', function () {
      DEFAULT_PARAMS_WO_OPTIONAL[0].userId = {};
      DEFAULT_PARAMS_WO_OPTIONAL[0].userId.criteoId = 'criteo-user-id';

      var request = spec.buildRequests(DEFAULT_PARAMS_WO_OPTIONAL, DEFAULT_PARAMS_GDPR);
      var requestContent = JSON.parse(request[0].data);

      expect(requestContent.user).to.deep.equal([{
        'userId': 'criteo-user-id',
        'source': 'criteo.com'
      }]);

      var request;
      DEFAULT_PARAMS_WO_OPTIONAL[0].userId = {};
      DEFAULT_PARAMS_WO_OPTIONAL[0].userId.criteoId = 1;
      request = spec.buildRequests(DEFAULT_PARAMS_WO_OPTIONAL, DEFAULT_PARAMS_GDPR);
      var requestContent = JSON.parse(request[0].data);
      expect(requestContent.user.eids).to.equal(undefined);

      DEFAULT_PARAMS_WO_OPTIONAL[0].userId.criteoId = [];
      request = spec.buildRequests(DEFAULT_PARAMS_WO_OPTIONAL, DEFAULT_PARAMS_GDPR);
      requestContent = JSON.parse(request[0].data);
      expect(requestContent.user.eids).to.equal(undefined);

      DEFAULT_PARAMS_WO_OPTIONAL[0].userId.criteoId = null;
      request = spec.buildRequests(DEFAULT_PARAMS_WO_OPTIONAL, DEFAULT_PARAMS_GDPR);
      requestContent = JSON.parse(request[0].data);
      expect(requestContent.user.eids).to.equal(undefined);

      DEFAULT_PARAMS_WO_OPTIONAL[0].userId.criteoId = {};
      request = spec.buildRequests(DEFAULT_PARAMS_WO_OPTIONAL, DEFAULT_PARAMS_GDPR);
      requestContent = JSON.parse(request[0].data);
      expect(requestContent.user.eids).to.equal(undefined);
    });

    it('Verify build identityLink', function () {
      DEFAULT_PARAMS_WO_OPTIONAL[0].userId = {};
      DEFAULT_PARAMS_WO_OPTIONAL[0].userId.idl_env = 'identity-link-user-id';

      var request = spec.buildRequests(DEFAULT_PARAMS_WO_OPTIONAL, DEFAULT_PARAMS_GDPR);
      var requestContent = JSON.parse(request[0].data);

      expect(requestContent.user).to.deep.equal([{
        'userId': 'identity-link-user-id',
        'source': 'liveramp.com'
      }]);

      var request;
      DEFAULT_PARAMS_WO_OPTIONAL[0].userId = {};
      DEFAULT_PARAMS_WO_OPTIONAL[0].userId.idl_env = 1;
      request = spec.buildRequests(DEFAULT_PARAMS_WO_OPTIONAL, DEFAULT_PARAMS_GDPR);
      var requestContent = JSON.parse(request[0].data);
      expect(requestContent.user.eids).to.equal(undefined);

      DEFAULT_PARAMS_WO_OPTIONAL[0].userId.criteoId = [];
      request = spec.buildRequests(DEFAULT_PARAMS_WO_OPTIONAL, DEFAULT_PARAMS_GDPR);
      requestContent = JSON.parse(request[0].data);
      expect(requestContent.user.eids).to.equal(undefined);

      DEFAULT_PARAMS_WO_OPTIONAL[0].userId.idl_env = null;
      request = spec.buildRequests(DEFAULT_PARAMS_WO_OPTIONAL, DEFAULT_PARAMS_GDPR);
      requestContent = JSON.parse(request[0].data);
      expect(requestContent.user.eids).to.equal(undefined);

      DEFAULT_PARAMS_WO_OPTIONAL[0].userId.idl_env = {};
      request = spec.buildRequests(DEFAULT_PARAMS_WO_OPTIONAL, DEFAULT_PARAMS_GDPR);
      requestContent = JSON.parse(request[0].data);
      expect(requestContent.user.eids).to.equal(undefined);
    });
    it('Verify build liveIntentId', function () {
      DEFAULT_PARAMS_WO_OPTIONAL[0].userId = {};
      DEFAULT_PARAMS_WO_OPTIONAL[0].userId.idl_env = 'identity-link-user-id';

      var request = spec.buildRequests(DEFAULT_PARAMS_WO_OPTIONAL, DEFAULT_PARAMS_GDPR);
      var requestContent = JSON.parse(request[0].data)

      expect(requestContent.user).to.deep.equal([{
        'userId': 'identity-link-user-id',
        'source': 'liveramp.com'
      }]);

      var request;
      DEFAULT_PARAMS_WO_OPTIONAL[0].userId = {};
      DEFAULT_PARAMS_WO_OPTIONAL[0].userId.idl_env = 1;
      request = spec.buildRequests(DEFAULT_PARAMS_WO_OPTIONAL, DEFAULT_PARAMS_GDPR);
      var requestContent = JSON.parse(request[0].data);
      expect(requestContent.user.eids).to.equal(undefined);

      DEFAULT_PARAMS_WO_OPTIONAL[0].userId.criteoId = [];
      request = spec.buildRequests(DEFAULT_PARAMS_WO_OPTIONAL, DEFAULT_PARAMS_GDPR);
      requestContent = JSON.parse(request[0].data);
      expect(requestContent.user.eids).to.equal(undefined);

      DEFAULT_PARAMS_WO_OPTIONAL[0].userId.idl_env = null;
      request = spec.buildRequests(DEFAULT_PARAMS_WO_OPTIONAL, DEFAULT_PARAMS_GDPR);
      requestContent = JSON.parse(request[0].data);
      expect(requestContent.user.eids).to.equal(undefined);

      DEFAULT_PARAMS_WO_OPTIONAL[0].userId.idl_env = {};
      request = spec.buildRequests(DEFAULT_PARAMS_WO_OPTIONAL, DEFAULT_PARAMS_GDPR);
      requestContent = JSON.parse(request[0].data);
      expect(requestContent.user.eids).to.equal(undefined);
    });
    it('Verify build TradeDesk', function () {
      DEFAULT_PARAMS_WO_OPTIONAL[0].userId = {};
      DEFAULT_PARAMS_WO_OPTIONAL[0].userId.tdid = 'tdid-user-id';

      var request = spec.buildRequests(DEFAULT_PARAMS_WO_OPTIONAL, DEFAULT_PARAMS_GDPR);
      var requestContent = JSON.parse(request[0].data)

      expect(requestContent.user).to.deep.equal([{
        'userId': 'tdid-user-id',
        'source': 'adserver.org'
      }]);

      request;
      DEFAULT_PARAMS_WO_OPTIONAL[0].userId = {};
      DEFAULT_PARAMS_WO_OPTIONAL[0].userId.idl_env = 1;
      request = spec.buildRequests(DEFAULT_PARAMS_WO_OPTIONAL, DEFAULT_PARAMS_GDPR);
      requestContent = JSON.parse(request[0].data);
      expect(requestContent.user.eids).to.equal(undefined);

      DEFAULT_PARAMS_WO_OPTIONAL[0].userId.criteoId = [];
      request = spec.buildRequests(DEFAULT_PARAMS_WO_OPTIONAL, DEFAULT_PARAMS_GDPR);
      requestContent = JSON.parse(request[0].data);
      expect(requestContent.user.eids).to.equal(undefined);

      DEFAULT_PARAMS_WO_OPTIONAL[0].userId.idl_env = null;
      request = spec.buildRequests(DEFAULT_PARAMS_WO_OPTIONAL, DEFAULT_PARAMS_GDPR);
      requestContent = JSON.parse(request[0].data);
      expect(requestContent.user.eids).to.equal(undefined);

      DEFAULT_PARAMS_WO_OPTIONAL[0].userId.idl_env = {};
      request = spec.buildRequests(DEFAULT_PARAMS_WO_OPTIONAL, DEFAULT_PARAMS_GDPR);
      requestContent = JSON.parse(request[0].data);
      expect(requestContent.user.eids).to.equal(undefined);
    });
  });

  it('Verify interprete response', function () {
    const request = spec.buildRequests(DEFAULT_PARAMS_NEW_SIZES, {
      gdprConsent: {
        consentString: 'BOZcQl_ObPFjWAeABAESCD-AAAAjx7_______9______9uz_Ov_v_f__33e8__9v_l_7_-___u_-33d4-_1vf99yfm1-7ftr3tp_87ues2_Xur__59__3z3_NohBgA',
        gdprApplies: true
      },
      refererInfo: {
        page: 'https://domain.com',
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
    expect(bid.dealId).to.equal('dealId');
    expect(bid.meta).to.equal('richaudience.com');
  });

  it('no banner media response inestream', function () {
    const request = spec.buildRequests(DEFAULT_PARAMS_VIDEO_IN, {
      gdprConsent: {
        consentString: 'BOZcQl_ObPFjWAeABAESCD-AAAAjx7_______9______9uz_Ov_v_f__33e8__9v_l_7_-___u_-33d4-_1vf99yfm1-7ftr3tp_87ues2_Xur__59__3z3_NohBgA',
        gdprApplies: true
      },
      refererInfo: {
        page: 'https://domain.com',
        numIframes: 0
      }
    });

    const bids = spec.interpretResponse(BID_RESPONSE_VIDEO, request[0]);
    expect(bids).to.have.lengthOf(1);
    const bid = bids[0];
    expect(bid.cpm).to.equal(1.50);
    expect(bid.mediaType).to.equal('video');
    expect(bid.vastXml).to.equal('<VAST></VAST>');
    expect(bid.cpm).to.equal(1.50);
    expect(bid.width).to.equal(1);
    expect(bid.height).to.equal(1);
    expect(bid.creativeId).to.equal('189198063');
    expect(bid.netRevenue).to.equal(true);
    expect(bid.currency).to.equal('USD');
    expect(bid.ttl).to.equal(300);
    expect(bid.dealId).to.equal('dealId');
    expect(bid.meta).to.equal('richaudience.com');
  });

  it('no banner media response outstream', function () {
    const request = spec.buildRequests(DEFAULT_PARAMS_VIDEO_OUT, {
      gdprConsent: {
        consentString: 'BOZcQl_ObPFjWAeABAESCD-AAAAjx7_______9______9uz_Ov_v_f__33e8__9v_l_7_-___u_-33d4-_1vf99yfm1-7ftr3tp_87ues2_Xur__59__3z3_NohBgA',
        gdprApplies: true
      },
      refererInfo: {
        page: 'https://domain.com',
        numIframes: 0
      }
    });

    const bids = spec.interpretResponse(BID_RESPONSE_VIDEO, request[0]);
    expect(bids).to.have.lengthOf(1);
    const bid = bids[0];
    expect(bid.cpm).to.equal(1.50);
    expect(bid.mediaType).to.equal('video');
    expect(bid.vastXml).to.equal('<VAST></VAST>');
    expect(bid.renderer.url).to.equal('https://cdn3.richaudience.com/prebidVideo/player.js');
    expect(bid.cpm).to.equal(1.50);
    expect(bid.width).to.equal(1);
    expect(bid.height).to.equal(1);
    expect(bid.creativeId).to.equal('189198063');
    expect(bid.netRevenue).to.equal(true);
    expect(bid.currency).to.equal('USD');
    expect(bid.ttl).to.equal(300);
    expect(bid.dealId).to.equal('dealId');
  });

  it('banner media and response VAST', function () {
    const request = spec.buildRequests(DEFAULT_PARAMS_BANNER_OUTSTREAM, {
      gdprConsent: {
        consentString: 'BOZcQl_ObPFjWAeABAESCD-AAAAjx7_______9______9uz_Ov_v_f__33e8__9v_l_7_-___u_-33d4-_1vf99yfm1-7ftr3tp_87ues2_Xur__59__3z3_NohBgA',
        gdprApplies: true
      },
      refererInfo: {
        page: 'https://domain.com',
        numIframes: 0
      }
    });

    const bids = spec.interpretResponse(BID_RESPONSE_VIDEO, request[0]);
    const bid = bids[0];
    expect(bid.mediaType).to.equal('video');
    expect(bid.vastXml).to.equal('<VAST></VAST>');
    expect(bid.renderer.url).to.equal('https://cdn3.richaudience.com/prebidVideo/player.js');
  });

  it('Verifies bidder_code', function () {
    expect(spec.code).to.equal('richaudience');
  });

  it('Verifies bidder aliases', function () {
    expect(spec.aliases).to.have.lengthOf(1);
    expect(spec.aliases[0]).to.equal('ra');
  });

  it('Verifies bidder gvlid', function () {
    expect(spec.gvlid).to.equal(108);
  });

  it('Verifies bidder supportedMediaTypes', function () {
    expect(spec.supportedMediaTypes).to.have.lengthOf(2);
    expect(spec.supportedMediaTypes[0]).to.equal('banner');
    expect(spec.supportedMediaTypes[1]).to.equal('video');
  });

  it('Verifies if bid request is valid', function () {
    expect(spec.isBidRequestValid(DEFAULT_PARAMS_NEW_SIZES[0])).to.equal(true);
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
    expect(spec.isBidRequestValid({
      params: {
        pid: ['1gCB5ZC4XL', '1a40xk8qSV'],
        bidfloor: 0.50,
      }
    })).to.equal(false);
    expect(spec.isBidRequestValid({
      params: {
        pid: ['1gCB5ZC4XL', '1a40xk8qSV'],
        supplyType: 'site',
        bidfloor: 0.50,
      }
    })).to.equal(true);
    expect(spec.isBidRequestValid({
      params: {
        supplyType: 'site',
        bidfloor: 0.50,
        ifa: 'AAAAAAAAA-BBBB-CCCC-1111-222222220000',
      }
    })).to.equal(false);
    expect(spec.isBidRequestValid({
      params: {
        pid: ['1gCB5ZC4XL', '1a40xk8qSV'],
        supplyType: 'site',
        bidfloor: 0.50,
        ifa: 'AAAAAAAAA-BBBB-CCCC-1111-222222220000',
      }
    })).to.equal(true);
  });

  it('should pass schain', function() {
    let schain = {
      'ver': '1.0',
      'complete': 1,
      'nodes': [{
        'asi': 'richaudience.com',
        'sid': '00001',
        'hp': 1
      }, {
        'asi': 'richaudience-2.com',
        'sid': '00002',
        'hp': 1
      }]
    }

    DEFAULT_PARAMS_NEW_SIZES[0].schain = {
      'ver': '1.0',
      'complete': 1,
      'nodes': [{
        'asi': 'richaudience.com',
        'sid': '00001',
        'hp': 1
      }, {
        'asi': 'richaudience-2.com',
        'sid': '00002',
        'hp': 1
      }]
    }

    const request = spec.buildRequests(DEFAULT_PARAMS_NEW_SIZES, {
      gdprConsent: {
        consentString: 'BOZcQl_ObPFjWAeABAESCD-AAAAjx7_______9______9uz_Ov_v_f__33e8__9v_l_7_-___u_-33d4-_1vf99yfm1-7ftr3tp_87ues2_Xur__59__3z3_NohBgA',
        gdprApplies: true
      },
      refererInfo: {}
    })
    const requestContent = JSON.parse(request[0].data);
    expect(requestContent).to.have.property('schain').to.deep.equal(schain);
  })

  describe('userSync', function () {
    it('Verifies user syncs iframe include', function () {
      config.setConfig({
        'userSync': {filterSettings: {iframe: {bidders: '*', filter: 'include'}}}
      })

      var syncs = spec.getUserSyncs({
        iframeEnabled: true
      }, [BID_RESPONSE], {
        consentString: 'BOZcQl_ObPFjWAeABAESCD-AAAAjx7_______9______9uz_Ov_v_f__33e8__9v_l_7_-___u_-33d4-_1vf99yfm1-7ftr3tp_87ues2_Xur__59__3z3_NohBgA',
        gdprApplies: true},
      );
      expect(syncs).to.have.lengthOf(1);
      expect(syncs[0].type).to.equal('iframe');

      syncs = spec.getUserSyncs({
        iframeEnabled: false,
      }, [BID_RESPONSE], {
        consentString: 'BOZcQl_ObPFjWAeABAESCD-AAAAjx7_______9______9uz_Ov_v_f__33e8__9v_l_7_-___u_-33d4-_1vf99yfm1-7ftr3tp_87ues2_Xur__59__3z3_NohBgA',
        gdprApplies: true,
      });
      expect(syncs).to.have.lengthOf(0);

      syncs = spec.getUserSyncs({
        iframeEnabled: false,
      }, [BID_RESPONSE], {
        consentString: 'BOZcQl_ObPFjWAeABAESCD-AAAAjx7_______9______9uz_Ov_v_f__33e8__9v_l_7_-___u_-33d4-_1vf99yfm1-7ftr3tp_87ues2_Xur__59__3z3_NohBgA',
        gdprApplies: true
      });
      expect(syncs).to.have.lengthOf(0);

      syncs = spec.getUserSyncs({
        iframeEnabled: true,
      }, [], {consentString: '', gdprApplies: false});
      expect(syncs).to.have.lengthOf(1);

      syncs = spec.getUserSyncs({
        iframeEnabled: false,
      }, [], {consentString: '', gdprApplies: true});
      expect(syncs).to.have.lengthOf(0);
    });
    it('Verifies user syncs iframe exclude', function () {
      config.setConfig({
        'userSync': {filterSettings: {iframe: {bidders: '*', filter: 'exclude'}}}
      })

      var syncs = spec.getUserSyncs({
        iframeEnabled: true
      }, [BID_RESPONSE], {
        consentString: 'BOZcQl_ObPFjWAeABAESCD-AAAAjx7_______9______9uz_Ov_v_f__33e8__9v_l_7_-___u_-33d4-_1vf99yfm1-7ftr3tp_87ues2_Xur__59__3z3_NohBgA',
        gdprApplies: true},
      );
      expect(syncs).to.have.lengthOf(0);

      syncs = spec.getUserSyncs({
        iframeEnabled: false,
      }, [BID_RESPONSE], {
        consentString: 'BOZcQl_ObPFjWAeABAESCD-AAAAjx7_______9______9uz_Ov_v_f__33e8__9v_l_7_-___u_-33d4-_1vf99yfm1-7ftr3tp_87ues2_Xur__59__3z3_NohBgA',
        gdprApplies: true,
      });
      expect(syncs).to.have.lengthOf(0);

      syncs = spec.getUserSyncs({
        iframeEnabled: false,
      }, [BID_RESPONSE], {
        consentString: 'BOZcQl_ObPFjWAeABAESCD-AAAAjx7_______9______9uz_Ov_v_f__33e8__9v_l_7_-___u_-33d4-_1vf99yfm1-7ftr3tp_87ues2_Xur__59__3z3_NohBgA',
        gdprApplies: true
      });
      expect(syncs).to.have.lengthOf(0);

      syncs = spec.getUserSyncs({
        iframeEnabled: true,
      }, [], {consentString: '', gdprApplies: false});
      expect(syncs).to.have.lengthOf(0);

      syncs = spec.getUserSyncs({
        iframeEnabled: false,
      }, [], {consentString: '', gdprApplies: true});
      expect(syncs).to.have.lengthOf(0);
    });

    it('Verifies user syncs image include', function () {
      config.setConfig({
        'userSync': {filterSettings: {image: {bidders: '*', filter: 'include'}}}
      })

      var syncs = spec.getUserSyncs({
        iframeEnabled: false,
        pixelEnabled: true
      }, [BID_RESPONSE], {
        consentString: 'BOZcQl_ObPFjWAeABAESCD-AAAAjx7_______9______9uz_Ov_v_f__33e8__9v_l_7_-___u_-33d4-_1vf99yfm1-7ftr3tp_87ues2_Xur__59__3z3_NohBgA',
        referer: 'http://domain.com',
        gdprApplies: true
      })
      expect(syncs).to.have.lengthOf(1);
      expect(syncs[0].type).to.equal('image');

      syncs = spec.getUserSyncs({
        iframeEnabled: false,
        pixelEnabled: true
      }, [BID_RESPONSE], {
        consentString: '',
        referer: 'http://domain.com',
        gdprApplies: true
      })
      expect(syncs).to.have.lengthOf(1);
      expect(syncs[0].type).to.equal('image');

      syncs = spec.getUserSyncs({
        iframeEnabled: false,
        pixelEnabled: true
      }, [], {
        consentString: null,
        referer: 'http://domain.com',
        gdprApplies: false
      })
      expect(syncs).to.have.lengthOf(1);
      expect(syncs[0].type).to.equal('image');
    });

    it('Verifies user syncs image exclude', function () {
      config.setConfig({
        'userSync': {filterSettings: {image: {bidders: '*', filter: 'exclude'}}}
      })

      var syncs = spec.getUserSyncs({
        iframeEnabled: false,
        pixelEnabled: true
      }, [BID_RESPONSE], {
        consentString: 'BOZcQl_ObPFjWAeABAESCD-AAAAjx7_______9______9uz_Ov_v_f__33e8__9v_l_7_-___u_-33d4-_1vf99yfm1-7ftr3tp_87ues2_Xur__59__3z3_NohBgA',
        referer: 'http://domain.com',
        gdprApplies: true
      })
      expect(syncs).to.have.lengthOf(0);

      syncs = spec.getUserSyncs({
        iframeEnabled: false,
        pixelEnabled: true
      }, [BID_RESPONSE], {
        consentString: '',
        referer: 'http://domain.com',
        gdprApplies: true
      })
      expect(syncs).to.have.lengthOf(0);

      syncs = spec.getUserSyncs({
        iframeEnabled: false,
        pixelEnabled: true
      }, [], {
        consentString: null,
        referer: 'http://domain.com',
        gdprApplies: false
      })
      expect(syncs).to.have.lengthOf(0);
    });

    it('Verifies user syncs iframe/image include', function () {
      config.setConfig({
        'userSync': {filterSettings: {iframe: {bidders: '*', filter: 'include'}, image: {bidders: '*', filter: 'include'}}}
      })

      var syncs = spec.getUserSyncs({
        iframeEnabled: true,
        pixelEnabled: true
      }, [BID_RESPONSE], {
        consentString: 'BOZcQl_ObPFjWAeABAESCD-AAAAjx7_______9______9uz_Ov_v_f__33e8__9v_l_7_-___u_-33d4-_1vf99yfm1-7ftr3tp_87ues2_Xur__59__3z3_NohBgA',
        gdprApplies: true},
      );
      expect(syncs).to.have.lengthOf(1);
      expect(syncs[0].type).to.equal('iframe');

      syncs = spec.getUserSyncs({
        iframeEnabled: false,
        pixelEnabled: false
      }, [BID_RESPONSE], {
        consentString: 'BOZcQl_ObPFjWAeABAESCD-AAAAjx7_______9______9uz_Ov_v_f__33e8__9v_l_7_-___u_-33d4-_1vf99yfm1-7ftr3tp_87ues2_Xur__59__3z3_NohBgA',
        gdprApplies: true,
      });
      expect(syncs).to.have.lengthOf(0);

      syncs = spec.getUserSyncs({
        iframeEnabled: false,
        pixelEnabled: false
      }, [BID_RESPONSE], {
        consentString: 'BOZcQl_ObPFjWAeABAESCD-AAAAjx7_______9______9uz_Ov_v_f__33e8__9v_l_7_-___u_-33d4-_1vf99yfm1-7ftr3tp_87ues2_Xur__59__3z3_NohBgA',
        gdprApplies: true
      });
      expect(syncs).to.have.lengthOf(0);

      syncs = spec.getUserSyncs({
        iframeEnabled: true,
        pixelEnabled: true
      }, [], {consentString: '', gdprApplies: false});
      expect(syncs).to.have.lengthOf(1);

      syncs = spec.getUserSyncs({
        iframeEnabled: false,
        pixelEnabled: false
      }, [], {consentString: '', gdprApplies: true});
      expect(syncs).to.have.lengthOf(0);
    });

    it('Verifies user syncs iframe/image exclude', function () {
      config.setConfig({
        'userSync': {filterSettings: {iframe: {bidders: '*', filter: 'exclude'}, image: {bidders: '*', filter: 'exclude'}}}
      })

      var syncs = spec.getUserSyncs({
        iframeEnabled: true,
        pixelEnabled: true
      }, [BID_RESPONSE], {
        consentString: 'BOZcQl_ObPFjWAeABAESCD-AAAAjx7_______9______9uz_Ov_v_f__33e8__9v_l_7_-___u_-33d4-_1vf99yfm1-7ftr3tp_87ues2_Xur__59__3z3_NohBgA',
        gdprApplies: true},
      );
      expect(syncs).to.have.lengthOf(0);

      syncs = spec.getUserSyncs({
        iframeEnabled: false,
        pixelEnabled: false
      }, [BID_RESPONSE], {
        consentString: 'BOZcQl_ObPFjWAeABAESCD-AAAAjx7_______9______9uz_Ov_v_f__33e8__9v_l_7_-___u_-33d4-_1vf99yfm1-7ftr3tp_87ues2_Xur__59__3z3_NohBgA',
        gdprApplies: true,
      });
      expect(syncs).to.have.lengthOf(0);

      syncs = spec.getUserSyncs({
        iframeEnabled: false,
        pixelEnabled: false
      }, [BID_RESPONSE], {
        consentString: 'BOZcQl_ObPFjWAeABAESCD-AAAAjx7_______9______9uz_Ov_v_f__33e8__9v_l_7_-___u_-33d4-_1vf99yfm1-7ftr3tp_87ues2_Xur__59__3z3_NohBgA',
        gdprApplies: true
      });
      expect(syncs).to.have.lengthOf(0);

      syncs = spec.getUserSyncs({
        iframeEnabled: true,
        pixelEnabled: true
      }, [], {consentString: '', gdprApplies: false});
      expect(syncs).to.have.lengthOf(0);

      syncs = spec.getUserSyncs({
        iframeEnabled: false,
        pixelEnabled: false
      }, [], {consentString: '', gdprApplies: true});
      expect(syncs).to.have.lengthOf(0);
    });

    it('Verifies user syncs iframe exclude / image include', function () {
      config.setConfig({
        'userSync': {filterSettings: {iframe: {bidders: '*', filter: 'exclude'}, image: {bidders: '*', filter: 'include'}}}
      })

      var syncs = spec.getUserSyncs({
        iframeEnabled: true,
        pixelEnabled: true
      }, [BID_RESPONSE], {
        consentString: 'BOZcQl_ObPFjWAeABAESCD-AAAAjx7_______9______9uz_Ov_v_f__33e8__9v_l_7_-___u_-33d4-_1vf99yfm1-7ftr3tp_87ues2_Xur__59__3z3_NohBgA',
        gdprApplies: true},
      );
      expect(syncs).to.have.lengthOf(1);
      expect(syncs[0].type).to.equal('image');

      syncs = spec.getUserSyncs({
        iframeEnabled: false,
        pixelEnabled: false
      }, [BID_RESPONSE], {
        consentString: 'BOZcQl_ObPFjWAeABAESCD-AAAAjx7_______9______9uz_Ov_v_f__33e8__9v_l_7_-___u_-33d4-_1vf99yfm1-7ftr3tp_87ues2_Xur__59__3z3_NohBgA',
        gdprApplies: true,
      });
      expect(syncs).to.have.lengthOf(0);

      syncs = spec.getUserSyncs({
        iframeEnabled: false,
        pixelEnabled: false
      }, [BID_RESPONSE], {
        consentString: 'BOZcQl_ObPFjWAeABAESCD-AAAAjx7_______9______9uz_Ov_v_f__33e8__9v_l_7_-___u_-33d4-_1vf99yfm1-7ftr3tp_87ues2_Xur__59__3z3_NohBgA',
        gdprApplies: true
      });
      expect(syncs).to.have.lengthOf(0);

      syncs = spec.getUserSyncs({
        iframeEnabled: true,
        pixelEnabled: true
      }, [], {consentString: '', gdprApplies: false});
      expect(syncs).to.have.lengthOf(1);

      syncs = spec.getUserSyncs({
        iframeEnabled: false,
        pixelEnabled: false
      }, [], {consentString: '', gdprApplies: true});
      expect(syncs).to.have.lengthOf(0);
    });

    it('Verifies user syncs iframe include / image exclude', function () {
      config.setConfig({
        'userSync': {filterSettings: {iframe: {bidders: '*', filter: 'include'}, image: {bidders: '*', filter: 'exclude'}}}
      })

      var syncs = spec.getUserSyncs({
        iframeEnabled: true,
        pixelEnabled: true
      }, [BID_RESPONSE], {
        consentString: 'BOZcQl_ObPFjWAeABAESCD-AAAAjx7_______9______9uz_Ov_v_f__33e8__9v_l_7_-___u_-33d4-_1vf99yfm1-7ftr3tp_87ues2_Xur__59__3z3_NohBgA',
        gdprApplies: true},
      );
      expect(syncs).to.have.lengthOf(1);
      expect(syncs[0].type).to.equal('iframe');

      syncs = spec.getUserSyncs({
        iframeEnabled: false,
        pixelEnabled: false
      }, [BID_RESPONSE], {
        consentString: 'BOZcQl_ObPFjWAeABAESCD-AAAAjx7_______9______9uz_Ov_v_f__33e8__9v_l_7_-___u_-33d4-_1vf99yfm1-7ftr3tp_87ues2_Xur__59__3z3_NohBgA',
        gdprApplies: true,
      });
      expect(syncs).to.have.lengthOf(0);

      syncs = spec.getUserSyncs({
        iframeEnabled: false,
        pixelEnabled: false
      }, [BID_RESPONSE], {
        consentString: 'BOZcQl_ObPFjWAeABAESCD-AAAAjx7_______9______9uz_Ov_v_f__33e8__9v_l_7_-___u_-33d4-_1vf99yfm1-7ftr3tp_87ues2_Xur__59__3z3_NohBgA',
        gdprApplies: true
      });
      expect(syncs).to.have.lengthOf(0);

      syncs = spec.getUserSyncs({
        iframeEnabled: true,
        pixelEnabled: true
      }, [], {consentString: '', gdprApplies: false});
      expect(syncs).to.have.lengthOf(1);

      syncs = spec.getUserSyncs({
        iframeEnabled: false,
        pixelEnabled: false
      }, [], {consentString: '', gdprApplies: true});
      expect(syncs).to.have.lengthOf(0);
    });
  })
});
