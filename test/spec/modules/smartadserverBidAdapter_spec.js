import { expect } from 'chai';
import { BANNER, VIDEO } from 'src/mediaTypes.js';
import { config } from 'src/config.js';
import { deepClone } from 'src/utils.js';
import { spec } from 'modules/smartadserverBidAdapter.js';

// Default params with optional ones
describe('Smart bid adapter tests', function () {
  var DEFAULT_PARAMS = [{
    adUnitCode: 'sas_42',
    bidId: 'abcd1234',
    mediaTypes: {
      banner: {
        sizes: [
          [300, 250],
          [300, 200]
        ]
      }
    },
    bidder: 'smartadserver',
    params: {
      domain: 'https://prg.smartadserver.com',
      siteId: '1234',
      pageId: '5678',
      formatId: '90',
      target: 'test=prebid',
      bidfloor: 0.420,
      buId: '7569',
      appName: 'Mozilla',
      ckId: 42
    },
    requestId: 'efgh5678',
    ortb2Imp: {
      ext: {
        tid: 'zsfgzzg'
      }
    },
  }];

  var DEFAULT_PARAMS_WITH_EIDS = [{
    adUnitCode: 'sas_42',
    bidId: 'abcd1234',
    mediaTypes: {
      banner: {
        sizes: [
          [300, 250],
          [300, 200]
        ]
      }
    },
    bidder: 'smartadserver',
    params: {
      domain: 'https://prg.smartadserver.com',
      siteId: '1234',
      pageId: '5678',
      formatId: '90',
      target: 'test=prebid',
      bidfloor: 0.420,
      buId: '7569',
      appName: 'Mozilla',
      ckId: 42
    },
    requestId: 'efgh5678',
    transactionId: 'zsfgzzg',
    userIdAsEids: [
      {
        'source': 'pubcid.org',
        'uids': [
          {
            'atype': 1,
            'id': '1111'
          }
        ]
      },
      {
        'source': 'britepoolid',
        'uids': [
          {
            'atype': 1,
            'id': '1111'
          }
        ]
      },
      {
        'source': 'id5id',
        'uids': [
          {
            'atype': 1,
            'id': '1111'
          }
        ]
      },
      {
        'source': 'idl_env',
        'uids': [
          {
            'atype': 1,
            'id': '1111'
          }
        ]
      },
      {
        'source': 'lipbid',
        'uids': [
          {
            'atype': 1,
            'id': '1111'
          }
        ]
      },
      {
        'source': 'parrableid',
        'uids': [
          {
            'atype': 1,
            'id': 'eidVersion.encryptionKeyReference.encryptedValue'
          }
        ]
      },
      {
        'source': 'tdid',
        'uids': [
          {
            'atype': 1,
            'id': '1111'
          }
        ]
      },
      {
        'source': 'netId',
        'uids': [
          {
            'atype': 1,
            'id': 'fH5A3n2O8_CZZyPoJVD-eabc6ECb7jhxCicsds7qSg'
          }
        ]
      }
    ]
  }];

  // Default params without optional ones
  var DEFAULT_PARAMS_WO_OPTIONAL = [{
    adUnitCode: 'sas_42',
    bidId: 'abcd1234',
    mediaTypes: {
      banner: {
        sizes: [
          [300, 250],
          [300, 200]
        ],
      }
    },

    bidder: 'smartadserver',
    params: {
      domain: 'https://prg.smartadserver.com',
      siteId: '1234',
      pageId: '5678',
      formatId: '90'
    },
    requestId: 'efgh5678'
  }];

  var BID_RESPONSE = {
    body: {
      cpm: 12,
      width: 300,
      height: 250,
      creativeId: 'zioeufg',
      currency: 'GBP',
      isNetCpm: true,
      ttl: 300,
      adUrl: 'http://awesome.fake.url',
      ad: '< --- awesome script --- >',
      cSyncUrl: 'http://awesome.fake.csync.url',
      isNoAd: false
    }
  };

  var BID_RESPONSE_IS_NO_AD = {
    body: {
      cpm: 12,
      width: 300,
      height: 250,
      creativeId: 'zioeufg',
      currency: 'GBP',
      isNetCpm: true,
      ttl: 300,
      adUrl: 'http://awesome.fake.url',
      ad: '< --- awesome script --- >',
      cSyncUrl: 'http://awesome.fake.csync.url',
      isNoAd: true
    }
  };

  var BID_RESPONSE_IMAGE_SYNC = {
    body: {
      cpm: 12,
      width: 300,
      height: 250,
      creativeId: 'zioeufg',
      currency: 'GBP',
      isNetCpm: true,
      ttl: 300,
      adUrl: 'http://awesome.fake.url',
      ad: '< --- awesome script --- >',
      cSyncUrl: 'http://awesome.fake.csync.url',
      isNoAd: false,
      dspPixels: ['pixelOne', 'pixelTwo', 'pixelThree']
    }
  };

  var BID_RESPONSE_IFRAME_SYNC_MISSING_CSYNC = {
    body: {
      cpm: 12,
      width: 300,
      height: 250,
      creativeId: 'zioeufg',
      currency: 'GBP',
      isNetCpm: true,
      ttl: 300,
      adUrl: 'http://awesome.fake.url',
      ad: '< --- awesome script --- >',
      cSyncUrl: null,
      isNoAd: false
    }
  };

  var sellerDefinedAudience = [
    {
      'name': 'hearst.com',
      'ext': { 'segtax': 1 },
      'segment': [
        { 'id': '1001' },
        { 'id': '1002' }
      ]
    }
  ];

  var sellerDefinedContext = [
    {
      'name': 'cnn.com',
      'ext': { 'segtax': 2 },
      'segment': [
        { 'id': '2002' }
      ]
    }
  ];

  it('Verify build request', function () {
    config.setConfig({
      'currency': {
        'adServerCurrency': 'EUR'
      },
      ortb2: {
        'user': {
          'data': sellerDefinedAudience
        },
        'site': {
          'content': {
            'data': sellerDefinedContext
          }
        }
      }
    });

    const request = spec.buildRequests(DEFAULT_PARAMS);
    expect(request[0]).to.have.property('url').and.to.equal('https://prg.smartadserver.com/prebid/v1');
    expect(request[0]).to.have.property('method').and.to.equal('POST');
    const requestContent = JSON.parse(request[0].data);

    expect(requestContent).to.have.property('siteid').and.to.equal('1234');
    expect(requestContent).to.have.property('pageid').and.to.equal('5678');
    expect(requestContent).to.have.property('formatid').and.to.equal('90');
    expect(requestContent).to.have.property('currencyCode').and.to.equal('EUR');
    expect(requestContent).to.have.property('bidfloor').and.to.equal(0.42);
    expect(requestContent).to.have.property('targeting').and.to.equal('test=prebid');
    expect(requestContent).to.have.property('tagId').and.to.equal('sas_42');
    expect(requestContent).to.have.property('sizes');
    expect(requestContent.sizes[0]).to.have.property('w').and.to.equal(300);
    expect(requestContent.sizes[0]).to.have.property('h').and.to.equal(250);
    expect(requestContent.sizes[1]).to.have.property('w').and.to.equal(300);
    expect(requestContent.sizes[1]).to.have.property('h').and.to.equal(200);
    expect(requestContent).to.not.have.property('pageDomain');
    expect(requestContent).to.have.property('transactionId').and.to.not.equal(null).and.to.not.be.undefined;
    expect(requestContent).to.have.property('buid').and.to.equal('7569');
    expect(requestContent).to.have.property('appname').and.to.equal('Mozilla');
    expect(requestContent).to.have.property('ckid').and.to.equal(42);
    expect(requestContent).to.have.property('sda').and.to.deep.equal(sellerDefinedAudience);
    expect(requestContent).to.have.property('sdc').and.to.deep.equal(sellerDefinedContext);
  });

  it('Verify parse response with no ad', function () {
    const request = spec.buildRequests(DEFAULT_PARAMS);
    const bids = spec.interpretResponse(BID_RESPONSE_IS_NO_AD, request[0]);
    expect(bids).to.have.lengthOf(0);

    expect(function () {
      spec.interpretResponse(BID_RESPONSE_IS_NO_AD, {
        data: 'invalid Json'
      })
    }).to.not.throw();
  });

  it('Should not nest response if ad and adUrl empty', () => {
    const BID_RESPONSE_EMPTY = {
      body: {
        ad: null,
        adUrl: null,
        cpm: 0.92,
        isNoAd: false
      }
    };

    const request = spec.buildRequests(DEFAULT_PARAMS);
    const bids = spec.interpretResponse(BID_RESPONSE_EMPTY, request[0]);

    expect(bids).to.have.lengthOf(0);
    expect(() => {
      spec.interpretResponse(BID_RESPONSE_EMPTY, {
        data: 'invalid Json'
      });
    }).to.not.throw();
  });

  it('Verify parse response', function () {
    const request = spec.buildRequests(DEFAULT_PARAMS);
    const bids = spec.interpretResponse(BID_RESPONSE, request[0]);
    expect(bids).to.have.lengthOf(1);
    const bid = bids[0];
    expect(bid.cpm).to.equal(12);
    expect(bid.adUrl).to.equal('http://awesome.fake.url');
    expect(bid.ad).to.equal('< --- awesome script --- >');
    expect(bid.width).to.equal(300);
    expect(bid.height).to.equal(250);
    expect(bid.creativeId).to.equal('zioeufg');
    expect(bid.currency).to.equal('GBP');
    expect(bid.netRevenue).to.equal(true);
    expect(bid.ttl).to.equal(300);
    expect(bid.requestId).to.equal(DEFAULT_PARAMS[0].bidId);

    expect(function () {
      spec.interpretResponse(BID_RESPONSE, {
        data: 'invalid Json'
      })
    }).to.not.throw();
  });

  it('Verifies bidder code', function () {
    expect(spec.code).to.equal('smartadserver');
  });

  it('Verifies bidder aliases', function () {
    expect(spec.aliases).to.have.lengthOf(1);
    expect(spec.aliases[0]).to.equal('smart');
  });

  it('Verifies if bid request valid', function () {
    expect(spec.isBidRequestValid(DEFAULT_PARAMS[0])).to.equal(true);
    expect(spec.isBidRequestValid(DEFAULT_PARAMS_WO_OPTIONAL[0])).to.equal(true);
    expect(spec.isBidRequestValid({})).to.equal(false);
    expect(spec.isBidRequestValid({
      params: {}
    })).to.equal(false);
    expect(spec.isBidRequestValid({
      params: {
        pageId: 123
      }
    })).to.equal(false);
    expect(spec.isBidRequestValid({
      params: {
        siteId: 123
      }
    })).to.equal(false);
    expect(spec.isBidRequestValid({
      params: {
        formatId: 123,
        pageId: 234
      }
    })).to.equal(false);
    expect(spec.isBidRequestValid({
      params: {
        domain: 'www.test.com',
        pageId: 234
      }
    })).to.equal(false);
    expect(spec.isBidRequestValid({
      params: {
        domain: 'www.test.com',
        formatId: 123,
        siteId: 456,
        pageId: 234
      }
    })).to.equal(true);
    expect(spec.isBidRequestValid({
      params: {
        domain: 'www.test.com',
        formatId: 123,
        siteId: 456,
        pageId: 234,
        buId: 789,
        appName: 'Mozilla'
      }
    })).to.equal(true);
    expect(spec.isBidRequestValid({
      params: {
        domain: 'www.test.com',
        formatId: 123,
        pageId: 234,
        buId: 789,
        appName: 'Mozilla'
      }
    })).to.equal(false);
  });

  it('Verifies user sync', function () {
    var syncs = spec.getUserSyncs({
      iframeEnabled: true
    }, [BID_RESPONSE]);
    expect(syncs).to.have.lengthOf(1);
    expect(syncs[0].type).to.equal('iframe');
    expect(syncs[0].url).to.equal('http://awesome.fake.csync.url');

    syncs = spec.getUserSyncs({
      iframeEnabled: false
    }, [BID_RESPONSE]);
    expect(syncs).to.have.lengthOf(0);

    syncs = spec.getUserSyncs({
      iframeEnabled: true
    }, []);
    expect(syncs).to.have.lengthOf(0);

    syncs = spec.getUserSyncs({
      iframeEnabled: true
    }, [BID_RESPONSE_IFRAME_SYNC_MISSING_CSYNC]);
    expect(syncs).to.have.lengthOf(0);
  });

  it('Verifies user sync using dspPixels', function () {
    var syncs = spec.getUserSyncs({
      iframeEnabled: false,
      pixelEnabled: true
    }, [BID_RESPONSE_IMAGE_SYNC]);
    expect(syncs).to.have.lengthOf(3);
    expect(syncs[0].type).to.equal('image');

    syncs = spec.getUserSyncs({
      iframeEnabled: false,
      pixelEnabled: false
    }, [BID_RESPONSE_IMAGE_SYNC]);
    expect(syncs).to.have.lengthOf(0);

    syncs = spec.getUserSyncs({
      iframeEnabled: false,
      pixelEnabled: true
    }, []);
    expect(syncs).to.have.lengthOf(0);
  });

  describe('gdpr tests', function () {
    afterEach(function () {
      config.setConfig({ ortb2: undefined });
      config.resetConfig();
    });

    it('Verify build request with GDPR', function () {
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
      const request = spec.buildRequests(DEFAULT_PARAMS_WO_OPTIONAL, {
        gdprConsent: {
          consentString: 'BOKAVy4OKAVy4ABAB8AAAAAZ+A==',
          gdprApplies: true
        }
      });
      const requestContent = JSON.parse(request[0].data);
      expect(requestContent).to.have.property('gdpr').and.to.equal(true);
      expect(requestContent).to.have.property('gdpr_consent').and.to.equal('BOKAVy4OKAVy4ABAB8AAAAAZ+A==');
    });

    it('Verify build request with GDPR without gdprApplies', function () {
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
      const request = spec.buildRequests(DEFAULT_PARAMS_WO_OPTIONAL, {
        gdprConsent: {
          consentString: 'BOKAVy4OKAVy4ABAB8AAAAAZ+A=='
        }
      });
      const requestContent = JSON.parse(request[0].data);
      expect(requestContent).to.not.have.property('gdpr');
      expect(requestContent).to.have.property('gdpr_consent').and.to.equal('BOKAVy4OKAVy4ABAB8AAAAAZ+A==');
    });
  });

  describe('GPP', function () {
    it('should be added to payload when gppConsent available in bidder request', function () {
      const options = {
        gppConsent: {
          gppString: 'some-gpp-string',
          applicableSections: [3, 5]
        }
      };
      const request = spec.buildRequests(DEFAULT_PARAMS_WO_OPTIONAL, options);
      const payload = JSON.parse(request[0].data);

      expect(payload).to.have.property('gpp').and.to.equal(options.gppConsent.gppString);
      expect(payload).to.have.property('gpp_sid').and.to.be.an('array');
      expect(payload.gpp_sid).to.have.lengthOf(2).and.to.deep.equal(options.gppConsent.applicableSections);
    });

    it('should be undefined on payload when gppConsent unavailable in bidder request', function () {
      const request = spec.buildRequests(DEFAULT_PARAMS_WO_OPTIONAL, {});
      const payload = JSON.parse(request[0].data);

      expect(payload.gpp).to.be.undefined;
    });
  });

  describe('ccpa/us privacy tests', function () {
    afterEach(function () {
      config.resetConfig();
    });

    it('Verify build request with us privacy', function () {
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

      const uspConsentValue = '1YNN'
      const request = spec.buildRequests(DEFAULT_PARAMS_WO_OPTIONAL, {
        uspConsent: uspConsentValue
      });
      const requestContent = JSON.parse(request[0].data);

      expect(requestContent).to.have.property('us_privacy').and.to.equal(uspConsentValue);
    });
  });

  describe('Instream video tests', function () {
    afterEach(function () {
      config.resetConfig();
    });

    const INSTREAM_DEFAULT_PARAMS = [{
      adUnitCode: 'sas_42',
      bidId: 'abcd1234',
      bidder: 'smartadserver',
      mediaTypes: {
        video: {
          context: 'instream',
          playerSize: [[640, 480]] // It seems prebid.js transforms the player size array into an array of array...
        }
      },
      params: {
        siteId: '1234',
        pageId: '5678',
        formatId: '90',
        target: 'test=prebid',
        bidfloor: 0.420,
        buId: '7569',
        appName: 'Mozilla',
        ckId: 42,
        video: {
          protocol: 6
        }
      },
      requestId: 'efgh5678',
      ortb2Imp: {
        ext: {
          tid: 'zsfgzzg',
        }
      },
    }];

    var INSTREAM_BID_RESPONSE = {
      body: {
        cpm: 12,
        width: 640,
        height: 480,
        creativeId: 'zioeufg',
        currency: 'GBP',
        isNetCpm: true,
        ttl: 300,
        adUrl: 'http://awesome.fake-vast.url',
        ad: '<VAST version="4.0"></VAST>',
        cSyncUrl: 'http://awesome.fake.csync.url'
      }
    };

    it('Verify instream video build request', function () {
      config.setConfig({
        'currency': {
          'adServerCurrency': 'EUR'
        },
        ortb2: {
          'user': {
            'data': sellerDefinedAudience
          },
          'site': {
            'content': {
              'data': sellerDefinedContext
            }
          }
        }
      });
      const request = spec.buildRequests(INSTREAM_DEFAULT_PARAMS);
      expect(request[0]).to.have.property('url').and.to.equal('https://prg.smartadserver.com/prebid/v1');
      expect(request[0]).to.have.property('method').and.to.equal('POST');
      const requestContent = JSON.parse(request[0].data);
      expect(requestContent).to.have.property('siteid').and.to.equal('1234');
      expect(requestContent).to.have.property('pageid').and.to.equal('5678');
      expect(requestContent).to.have.property('formatid').and.to.equal('90');
      expect(requestContent).to.have.property('currencyCode').and.to.equal('EUR');
      expect(requestContent).to.have.property('bidfloor').and.to.equal(0.42);
      expect(requestContent).to.have.property('targeting').and.to.equal('test=prebid');
      expect(requestContent).to.have.property('tagId').and.to.equal('sas_42');
      expect(requestContent).to.not.have.property('pageDomain');
      expect(requestContent).to.have.property('transactionId').and.to.not.equal(null).and.to.not.be.undefined;
      expect(requestContent).to.have.property('buid').and.to.equal('7569');
      expect(requestContent).to.have.property('appname').and.to.equal('Mozilla');
      expect(requestContent).to.have.property('ckid').and.to.equal(42);
      expect(requestContent).to.have.property('sda').and.to.deep.equal(sellerDefinedAudience);
      expect(requestContent).to.have.property('sdc').and.to.deep.equal(sellerDefinedContext);
      expect(requestContent).to.have.property('isVideo').and.to.equal(true);
      expect(requestContent).to.have.property('videoData');
      expect(requestContent.videoData).to.have.property('videoProtocol').and.to.equal(6);
      expect(requestContent.videoData).to.have.property('playerWidth').and.to.equal(640);
      expect(requestContent.videoData).to.have.property('playerHeight').and.to.equal(480);
    });

    it('Verify instream parse response', function () {
      const request = spec.buildRequests(INSTREAM_DEFAULT_PARAMS);
      const bids = spec.interpretResponse(INSTREAM_BID_RESPONSE, request[0]);
      expect(bids).to.have.lengthOf(1);
      const bid = bids[0];
      expect(bid.cpm).to.equal(12);
      expect(bid.mediaType).to.equal('video');
      expect(bid.vastUrl).to.equal('http://awesome.fake-vast.url');
      expect(bid.vastXml).to.equal('<VAST version="4.0"></VAST>');
      expect(bid.content).to.equal('<VAST version="4.0"></VAST>');
      expect(bid.width).to.equal(640);
      expect(bid.height).to.equal(480);
      expect(bid.creativeId).to.equal('zioeufg');
      expect(bid.currency).to.equal('GBP');
      expect(bid.netRevenue).to.equal(true);
      expect(bid.ttl).to.equal(300);
      expect(bid.requestId).to.equal(INSTREAM_DEFAULT_PARAMS[0].bidId);

      expect(function () {
        spec.interpretResponse(INSTREAM_BID_RESPONSE, {
          data: 'invalid Json'
        })
      }).to.not.throw();
    });

    it('Verify not handled media type return empty request', function () {
      config.setConfig({
        'currency': {
          'adServerCurrency': 'EUR'
        }
      });
      const request = spec.buildRequests([{
        adUnitCode: 'sas_42',
        bidder: 'smartadserver',
        mediaTypes: {
          video: {
            context: 'badcontext'
          }
        },
        params: {
          domain: 'https://prg.smartadserver.com',
          siteId: '1234',
          pageId: '5678',
          formatId: '90',
          target: 'test=prebid',
          bidfloor: 0.420,
          buId: '7569',
          appName: 'Mozilla',
          ckId: 42
        },
        requestId: 'efgh5678',
        transactionId: 'zsfgzzg'
      }, INSTREAM_DEFAULT_PARAMS[0]]);
      expect(request[0]).to.be.empty;
      expect(request[1]).to.not.be.empty;
    });

    describe('Instream videoData meta & params tests', function () {
      it('Verify videoData assigns values from meta', function () {
        config.setConfig({
          'currency': {
            'adServerCurrency': 'EUR'
          }
        });
        const request = spec.buildRequests([{
          adUnitCode: 'sas_42',
          bidId: 'abcd1234',
          bidder: 'smartadserver',
          mediaTypes: {
            video: {
              context: 'instream',
              playerSize: [[640, 480]], // It seems prebid.js transforms the player size array into an array of array...
              protocols: [8, 2],
              startdelay: 0
            }
          },
          params: {
            siteId: '1234',
            pageId: '5678',
            formatId: '90',
            target: 'test=prebid',
            bidfloor: 0.420,
            buId: '7569',
            appName: 'Mozilla',
            ckId: 42,
          },
          requestId: 'efgh5678',
          transactionId: 'zsfgzzg'
        }]);

        expect(request[0]).to.have.property('url').and.to.equal('https://prg.smartadserver.com/prebid/v1');
        expect(request[0]).to.have.property('method').and.to.equal('POST');
        const requestContent = JSON.parse(request[0].data);
        expect(requestContent).to.have.property('videoData');
        expect(requestContent.videoData).to.have.property('videoProtocol').and.to.equal(8);
        expect(requestContent.videoData).to.have.property('adBreak').and.to.equal(1);
      });

      it('Verify videoData default values assigned', function () {
        config.setConfig({
          'currency': {
            'adServerCurrency': 'EUR'
          }
        });
        const request = spec.buildRequests([{
          adUnitCode: 'sas_42',
          bidId: 'abcd1234',
          bidder: 'smartadserver',
          mediaTypes: {
            video: {
              context: 'instream',
              playerSize: [[640, 480]] // It seems prebid.js transforms the player size array into an array of array...
            }
          },
          params: {
            siteId: '1234',
            pageId: '5678',
            formatId: '90',
            target: 'test=prebid',
            bidfloor: 0.420,
            buId: '7569',
            appName: 'Mozilla',
            ckId: 42,
          },
          requestId: 'efgh5678',
          transactionId: 'zsfgzzg'
        }]);

        expect(request[0]).to.have.property('url').and.to.equal('https://prg.smartadserver.com/prebid/v1');
        expect(request[0]).to.have.property('method').and.to.equal('POST');
        const requestContent = JSON.parse(request[0].data);
        expect(requestContent).to.have.property('videoData');
        expect(requestContent.videoData).not.to.have.property('videoProtocol').eq(true);
        expect(requestContent.videoData).to.have.property('adBreak').and.to.equal(1);
      });

      it('Verify videoData params override meta values', function () {
        config.setConfig({
          'currency': {
            'adServerCurrency': 'EUR'
          }
        });
        const request = spec.buildRequests([{
          adUnitCode: 'sas_42',
          bidId: 'abcd1234',
          bidder: 'smartadserver',
          mediaTypes: {
            video: {
              context: 'instream',
              playerSize: [[640, 480]], // It seems prebid.js transforms the player size array into an array of array...
              protocols: [8, 2],
              startdelay: 0
            }
          },
          params: {
            siteId: '1234',
            pageId: '5678',
            formatId: '90',
            target: 'test=prebid',
            bidfloor: 0.420,
            buId: '7569',
            appName: 'Mozilla',
            ckId: 42,
            video: {
              protocol: 6,
              startDelay: 3
            }
          },
          requestId: 'efgh5678',
          transactionId: 'zsfgzzg'
        }]);

        expect(request[0]).to.have.property('url').and.to.equal('https://prg.smartadserver.com/prebid/v1');
        expect(request[0]).to.have.property('method').and.to.equal('POST');
        const requestContent = JSON.parse(request[0].data);
        expect(requestContent).to.have.property('videoData');
        expect(requestContent.videoData).to.have.property('videoProtocol').and.to.equal(6);
        expect(requestContent.videoData).to.have.property('adBreak').and.to.equal(3);
      });

      it('should pass additional parameters', function () {
        const request = spec.buildRequests([{
          bidder: 'smartadserver',
          mediaTypes: {
            video: {
              context: 'instream',
              api: [1, 2, 3],
              maxbitrate: 50,
              minbitrate: 20,
              maxduration: 30,
              minduration: 5,
              placement: 3,
              playbackmethod: [2, 4],
              playerSize: [[640, 480]],
              plcmt: 1,
              skip: 0
            }
          },
          params: {
            siteId: '123'
          }
        }]);
        const requestContent = JSON.parse(request[0].data);

        expect(requestContent.videoData).to.have.property('iabframeworks').and.to.equal('1,2,3');
        expect(requestContent.videoData).not.to.have.property('skip');
        expect(requestContent.videoData).to.have.property('vbrmax').and.to.equal(50);
        expect(requestContent.videoData).to.have.property('vbrmin').and.to.equal(20);
        expect(requestContent.videoData).to.have.property('vdmax').and.to.equal(30);
        expect(requestContent.videoData).to.have.property('vdmin').and.to.equal(5);
        expect(requestContent.videoData).to.have.property('vplcmt').and.to.equal(1);
        expect(requestContent.videoData).to.have.property('vpmt').and.to.have.lengthOf(2);
        expect(requestContent.videoData.vpmt[0]).to.equal(2);
        expect(requestContent.videoData.vpmt[1]).to.equal(4);
        expect(requestContent.videoData).to.have.property('vpt').and.to.equal(3);
      });

      it('should not pass not valuable parameters', function () {
        const request = spec.buildRequests([{
          bidder: 'smartadserver',
          mediaTypes: {
            video: {
              context: 'instream',
              maxbitrate: 20,
              minbitrate: null,
              maxduration: 0,
              playbackmethod: [],
              playerSize: [[640, 480]],
              plcmt: 1
            }
          },
          params: {
            siteId: '123'
          }
        }]);
        const requestContent = JSON.parse(request[0].data);

        expect(requestContent.videoData).not.to.have.property('iabframeworks');
        expect(requestContent.videoData).to.have.property('vbrmax').and.to.equal(20);
        expect(requestContent.videoData).not.to.have.property('vbrmin');
        expect(requestContent.videoData).not.to.have.property('vdmax');
        expect(requestContent.videoData).not.to.have.property('vdmin');
        expect(requestContent.videoData).to.have.property('vplcmt').and.to.equal(1);
        expect(requestContent.videoData).not.to.have.property('vpmt');
        expect(requestContent.videoData).not.to.have.property('vpt');
      });
    });
  });

  describe('Outstream video tests', function () {
    afterEach(function () {
      config.resetConfig();
    });

    const OUTSTREAM_DEFAULT_PARAMS = [{
      adUnitCode: 'sas_43',
      bidId: 'abcd1234',
      bidder: 'smartadserver',
      mediaTypes: {
        video: {
          context: 'outstream',
          playerSize: [[800, 600]] // It seems prebid.js transforms the player size array into an array of array...
        }
      },
      params: {
        siteId: '1234',
        pageId: '5678',
        formatId: '91',
        target: 'test=prebid-outstream',
        bidfloor: 0.430,
        buId: '7579',
        appName: 'Mozilla',
        ckId: 43,
        video: {
          protocol: 7
        }
      },
      ortb2Imp: {
        ext: {
          tid: 'efgh5679',
        }
      },
      transactionId: 'zsfgzzga'
    }];

    var OUTSTREAM_BID_RESPONSE = {
      body: {
        cpm: 14,
        width: 800,
        height: 600,
        creativeId: 'zioeufga',
        currency: 'USD',
        isNetCpm: true,
        ttl: 300,
        adUrl: 'http://awesome.fake-vast2.url',
        ad: '<VAST version="4.0"><!--Outstream--></VAST>',
        cSyncUrl: 'http://awesome.fake2.csync.url'
      }
    };

    it('Verify outstream video build request', function () {
      config.setConfig({
        'currency': {
          'adServerCurrency': 'EUR'
        },
        ortb2: {
          'user': {
            'data': sellerDefinedAudience
          },
          'site': {
            'content': {
              'data': sellerDefinedContext
            }
          }
        }
      });
      const request = spec.buildRequests(OUTSTREAM_DEFAULT_PARAMS);
      expect(request[0]).to.have.property('url').and.to.equal('https://prg.smartadserver.com/prebid/v1');
      expect(request[0]).to.have.property('method').and.to.equal('POST');
      const requestContent = JSON.parse(request[0].data);
      expect(requestContent).to.have.property('siteid').and.to.equal('1234');
      expect(requestContent).to.have.property('pageid').and.to.equal('5678');
      expect(requestContent).to.have.property('formatid').and.to.equal('91');
      expect(requestContent).to.have.property('currencyCode').and.to.equal('EUR');
      expect(requestContent).to.have.property('bidfloor').and.to.equal(0.43);
      expect(requestContent).to.have.property('targeting').and.to.equal('test=prebid-outstream');
      expect(requestContent).to.have.property('tagId').and.to.equal('sas_43');
      expect(requestContent).to.not.have.property('pageDomain');
      expect(requestContent).to.have.property('transactionId').and.to.not.equal(null).and.to.not.be.undefined;
      expect(requestContent).to.have.property('buid').and.to.equal('7579');
      expect(requestContent).to.have.property('appname').and.to.equal('Mozilla');
      expect(requestContent).to.have.property('ckid').and.to.equal(43);
      expect(requestContent).to.have.property('sda').and.to.deep.equal(sellerDefinedAudience);
      expect(requestContent).to.have.property('sdc').and.to.deep.equal(sellerDefinedContext);
      expect(requestContent).to.have.property('isVideo').and.to.equal(false);
      expect(requestContent).to.have.property('videoData');
      expect(requestContent.videoData).to.have.property('videoProtocol').and.to.equal(7);
      expect(requestContent.videoData).to.have.property('playerWidth').and.to.equal(800);
      expect(requestContent.videoData).to.have.property('playerHeight').and.to.equal(600);
    });

    it('Verify outstream parse response', function () {
      const request = spec.buildRequests(OUTSTREAM_DEFAULT_PARAMS);
      const bids = spec.interpretResponse(OUTSTREAM_BID_RESPONSE, request[0]);
      expect(bids).to.have.lengthOf(1);
      const bid = bids[0];
      expect(bid.cpm).to.equal(14);
      expect(bid.mediaType).to.equal('video');
      expect(bid.vastUrl).to.equal('http://awesome.fake-vast2.url');
      expect(bid.vastXml).to.equal('<VAST version="4.0"><!--Outstream--></VAST>');
      expect(bid.content).to.equal('<VAST version="4.0"><!--Outstream--></VAST>');
      expect(bid.width).to.equal(800);
      expect(bid.height).to.equal(600);
      expect(bid.creativeId).to.equal('zioeufga');
      expect(bid.currency).to.equal('USD');
      expect(bid.netRevenue).to.equal(true);
      expect(bid.ttl).to.equal(300);
      expect(bid.requestId).to.equal(OUTSTREAM_DEFAULT_PARAMS[0].bidId);

      expect(function () {
        spec.interpretResponse(OUTSTREAM_BID_RESPONSE, {
          data: 'invalid Json'
        })
      }).to.not.throw();
    });
  });

  describe('Outstream videoData meta & params tests', function () {
    it('Verify videoData assigns values from meta', function () {
      config.setConfig({
        'currency': {
          'adServerCurrency': 'EUR'
        }
      });
      const request = spec.buildRequests([{
        adUnitCode: 'sas_42',
        bidId: 'abcd1234',
        bidder: 'smartadserver',
        mediaTypes: {
          video: {
            context: 'outstream',
            playerSize: [[640, 480]], // It seems prebid.js transforms the player size array into an array of array...
            protocols: [8, 2],
            startdelay: 0
          }
        },
        params: {
          siteId: '1234',
          pageId: '5678',
          formatId: '90',
          target: 'test=prebid-outstream',
          bidfloor: 0.420,
          buId: '7569',
          appName: 'Mozilla',
          ckId: 42,
        },
        requestId: 'efgh5678',
        transactionId: 'zsfgzzg'
      }]);

      expect(request[0]).to.have.property('url').and.to.equal('https://prg.smartadserver.com/prebid/v1');
      expect(request[0]).to.have.property('method').and.to.equal('POST');
      const requestContent = JSON.parse(request[0].data);
      expect(requestContent).to.have.property('videoData');
      expect(requestContent.videoData).to.have.property('videoProtocol').and.to.equal(8);
      expect(requestContent.videoData).to.have.property('adBreak').and.to.equal(1);
    });

    it('Verify videoData default values assigned', function () {
      config.setConfig({
        'currency': {
          'adServerCurrency': 'EUR'
        }
      });
      const request = spec.buildRequests([{
        adUnitCode: 'sas_42',
        bidId: 'abcd1234',
        bidder: 'smartadserver',
        mediaTypes: {
          video: {
            context: 'outstream',
            playerSize: [[640, 480]] // It seems prebid.js transforms the player size array into an array of array...
          }
        },
        params: {
          siteId: '1234',
          pageId: '5678',
          formatId: '90',
          target: 'test=prebid-outstream',
          bidfloor: 0.420,
          buId: '7569',
          appName: 'Mozilla',
          ckId: 42,
        },
        requestId: 'efgh5678',
        transactionId: 'zsfgzzg'
      }]);

      expect(request[0]).to.have.property('url').and.to.equal('https://prg.smartadserver.com/prebid/v1');
      expect(request[0]).to.have.property('method').and.to.equal('POST');
      const requestContent = JSON.parse(request[0].data);
      expect(requestContent).to.have.property('videoData');
      expect(requestContent.videoData).not.to.have.property('videoProtocol').eq(true);
      expect(requestContent.videoData).to.have.property('adBreak').and.to.equal(1);
    });

    it('Verify videoData params override meta values', function () {
      config.setConfig({
        'currency': {
          'adServerCurrency': 'EUR'
        }
      });
      const request = spec.buildRequests([{
        adUnitCode: 'sas_42',
        bidId: 'abcd1234',
        bidder: 'smartadserver',
        mediaTypes: {
          video: {
            context: 'outstream',
            playerSize: [[640, 480]], // It seems prebid.js transforms the player size array into an array of array...
            protocols: [8, 2],
            startdelay: 0
          }
        },
        params: {
          siteId: '1234',
          pageId: '5678',
          formatId: '90',
          target: 'test=prebid-outstream',
          bidfloor: 0.420,
          buId: '7569',
          appName: 'Mozilla',
          ckId: 42,
          video: {
            protocol: 6,
            startDelay: 3
          }
        },
        requestId: 'efgh5678',
        transactionId: 'zsfgzzg'
      }]);

      expect(request[0]).to.have.property('url').and.to.equal('https://prg.smartadserver.com/prebid/v1');
      expect(request[0]).to.have.property('method').and.to.equal('POST');
      const requestContent = JSON.parse(request[0].data);
      expect(requestContent).to.have.property('videoData');
      expect(requestContent.videoData).to.have.property('videoProtocol').and.to.equal(6);
      expect(requestContent.videoData).to.have.property('adBreak').and.to.equal(3);
    });

    it('should handle value of videoMediaType.startdelay', function () {
      const request = spec.buildRequests([{
        bidder: 'smartadserver',
        mediaTypes: {
          video: {
            context: 'outstream',
            playerSize: [[640, 480]],
            startdelay: -2
          }
        },
        params: {
          siteId: 123,
          pageId: 456,
          formatId: 78
        }
      }]);

      const requestContent = JSON.parse(request[0].data);
      expect(requestContent).to.have.property('videoData');
      expect(requestContent.videoData).to.have.property('adBreak').and.to.equal(3);
    });

    it('should return specified value of videoMediaType.startdelay', function () {
      const request = spec.buildRequests([{
        bidder: 'smartadserver',
        mediaTypes: {
          video: {
            context: 'outstream',
            playerSize: [[640, 480]],
            startdelay: 60
          }
        },
        params: {
          siteId: 123,
          pageId: 456,
          formatId: 78
        }
      }]);

      const requestContent = JSON.parse(request[0].data);
      expect(requestContent).to.have.property('videoData');
      expect(requestContent.videoData).to.have.property('adBreak').and.to.equal(2);
    });
  });

  describe('External ids tests', function () {
    it('Verify external ids in request and ids found', function () {
      config.setConfig({
        'currency': {
          'adServerCurrency': 'EUR'
        }
      });
      const request = spec.buildRequests(DEFAULT_PARAMS_WITH_EIDS);
      expect(request[0]).to.have.property('url').and.to.equal('https://prg.smartadserver.com/prebid/v1');
      expect(request[0]).to.have.property('method').and.to.equal('POST');
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
  });

  describe('Supply Chain Serializer tests', function () {
    it('Verify a multi node supply chain serialization matches iab example', function() {
      let schain = {
        'ver': '1.0',
        'complete': 1,
        'nodes': [
          {
            'asi': 'exchange1.com',
            'sid': '1234',
            'hp': 1,
            'rid': 'bid-request-1',
            'name': 'publisher',
            'domain': 'publisher.com'
          },
          {
            'asi': 'exchange2.com',
            'sid': 'abcd',
            'hp': 1,
            'rid': 'bid-request-2',
            'name': 'intermediary',
            'domain': 'intermediary.com'
          }
        ]
      };

      let serializedSchain = spec.serializeSupplyChain(schain);
      expect(serializedSchain).to.equal('1.0,1!exchange1.com,1234,1,bid-request-1,publisher,publisher.com!exchange2.com,abcd,1,bid-request-2,intermediary,intermediary.com');
    });

    it('Verifiy that null schain produce null result', function () {
      let actual = spec.serializeSupplyChain(null);
      expect(null, actual);
    });

    it('Verifiy that schain with null nodes produce null result', function () {
      let schain = {
        'ver': '1.0',
        'complete': 1

      };
      let actual = spec.serializeSupplyChain(null);
      expect(null, actual);
    });
  });

  describe('Floors module', function () {
    const getFloor = (bid) => {
      switch (bid.mediaType) {
        case BANNER:
          return { currency: 'USD', floor: 1.93 };
        case VIDEO:
          return { currency: 'USD', floor: 2.72 };
        default:
          return {};
      }
    };

    it('should include floor from bid params', function() {
      const bidRequest = JSON.parse((spec.buildRequests(DEFAULT_PARAMS))[0].data);
      expect(bidRequest.bidfloor).to.deep.equal(DEFAULT_PARAMS[0].params.bidfloor);
    });

    it('should return floor from module', function() {
      const moduleFloor = 1.5;
      const bidRequest = JSON.parse((spec.buildRequests(DEFAULT_PARAMS_WO_OPTIONAL))[0].data);
      bidRequest.getFloor = function () {
        return { floor: moduleFloor };
      };

      const floor = spec.getBidFloor(bidRequest, 'EUR');
      expect(floor).to.deep.equal(moduleFloor);
    });

    it('should return default floor when module not activated', function() {
      const bidRequest = JSON.parse((spec.buildRequests(DEFAULT_PARAMS_WO_OPTIONAL))[0].data);

      const floor = spec.getBidFloor(bidRequest, 'EUR');
      expect(floor).to.deep.equal(0);
    });

    it('should return default floor when getFloor returns not proper object', function() {
      const bidRequest = JSON.parse((spec.buildRequests(DEFAULT_PARAMS_WO_OPTIONAL))[0].data);
      bidRequest.getFloor = function () {
        return { floor: 'one' };
      };

      const floor = spec.getBidFloor(bidRequest, 'EUR');
      expect(floor).to.deep.equal(0.0);
    });

    it('should return default floor when currency unknown', function() {
      const bidRequest = JSON.parse((spec.buildRequests(DEFAULT_PARAMS_WO_OPTIONAL))[0].data);

      const floor = spec.getBidFloor(bidRequest, null);
      expect(floor).to.deep.equal(0);
    });

    it('should take floor from bidder params over ad unit', function() {
      const bidRequest = [{
        mediaTypes: {
          banner: {
            sizes: [[300, 250]]
          }
        },
        getFloor,
        params: { siteId: 1234, pageId: 678, formatId: 73, bidfloor: 1.25 }
      }];

      const request = spec.buildRequests(bidRequest);
      const requestContent = JSON.parse(request[0].data);

      expect(requestContent).to.have.property('bidfloor').and.to.equal(1.25);
    });

    it('should take floor from banner ad unit', function() {
      const bidRequest = [{
        mediaTypes: {
          banner: {
            sizes: [[300, 250], [300, 600]]
          }
        },
        getFloor,
        params: { siteId: 1234, pageId: 678, formatId: 73 }
      }];

      const request = spec.buildRequests(bidRequest);
      const requestContent = JSON.parse(request[0].data);

      expect(requestContent).to.have.property('bidfloor').and.to.equal(1.93);
    });

    it('should take floor from video ad unit', function() {
      const bidRequest = [{
        mediaTypes: {
          video: {
            context: 'outstream',
            playerSize: [[640, 480]]
          }
        },
        getFloor,
        params: { siteId: 1234, pageId: 678, formatId: 73 }
      }];

      const request = spec.buildRequests(bidRequest);
      const requestContent = JSON.parse(request[0].data);

      expect(requestContent).to.have.property('bidfloor').and.to.equal(2.72);
    });

    it('should take floor from multiple media type ad unit', function() {
      const bidRequest = [{
        mediaTypes: {
          banner: {
            sizes: [[300, 600]]
          },
          video: {
            context: 'outstream',
            playerSize: [[640, 480]]
          }
        },
        getFloor,
        params: { siteId: 1234, pageId: 678, formatId: 73 }
      }];

      const requests = spec.buildRequests(bidRequest);
      expect(requests).to.have.lengthOf(2);

      const requestContents = requests.map(r => JSON.parse(r.data));
      const videoRequest = requestContents.filter(r => r.videoData)[0];
      expect(videoRequest).to.not.equal(null).and.to.not.be.undefined;
      expect(videoRequest).to.have.property('bidfloor').and.to.equal(2.72);

      const bannerRequest = requestContents.filter(r => !r.videoData)[0];
      expect(bannerRequest).to.not.equal(null).and.to.not.be.undefined;
      expect(bannerRequest).to.have.property('bidfloor').and.to.equal(1.93);
    });
  });

  describe('Verify bid requests with multiple mediaTypes', function () {
    afterEach(function () {
      config.resetConfig();
    });

    var DEFAULT_PARAMS_MULTIPLE_MEDIA_TYPES = [{
      adUnitCode: 'sas_42',
      bidId: 'abcd1234',
      mediaTypes: {
        banner: {
          sizes: [
            [300, 250],
            [300, 200]
          ]
        },
        video: {
          context: 'outstream',
          playerSize: [[640, 480]] // It seems prebid.js transforms the player size array into an array of array...
        }
      },
      bidder: 'smartadserver',
      params: {
        domain: 'https://prg.smartadserver.com',
        siteId: '1234',
        pageId: '5678',
        formatId: '90',
        target: 'test=prebid',
        bidfloor: 0.420,
        buId: '7569',
        appName: 'Mozilla',
        ckId: 42,
        video: {
          protocol: 6,
          startDelay: 1
        }
      },
      requestId: 'efgh5678',
      transactionId: 'zsfgzzg'
    }];

    it('Verify build request with banner and outstream', function () {
      config.setConfig({
        'currency': {
          'adServerCurrency': 'EUR'
        }
      });
      const requests = spec.buildRequests(DEFAULT_PARAMS_MULTIPLE_MEDIA_TYPES);
      expect(requests).to.have.lengthOf(2);

      const requestContents = requests.map(r => JSON.parse(r.data));
      const videoRequest = requestContents.filter(r => r.videoData)[0];
      expect(videoRequest).to.not.equal(null).and.to.not.be.undefined;

      const bannerRequest = requestContents.filter(r => !r.videoData)[0];
      expect(bannerRequest).to.not.equal(null).and.to.not.be.undefined;

      expect(videoRequest).to.not.equal(bannerRequest);
      expect(videoRequest.videoData).to.have.property('videoProtocol').and.to.equal(6);
      expect(videoRequest.videoData).to.have.property('playerWidth').and.to.equal(640);
      expect(videoRequest.videoData).to.have.property('playerHeight').and.to.equal(480);
      expect(videoRequest).to.have.property('siteid').and.to.equal('1234');
      expect(videoRequest).to.have.property('pageid').and.to.equal('5678');
      expect(videoRequest).to.have.property('formatid').and.to.equal('90');

      expect(bannerRequest).to.have.property('siteid').and.to.equal('1234');
      expect(bannerRequest).to.have.property('pageid').and.to.equal('5678');
      expect(bannerRequest).to.have.property('formatid').and.to.equal('90');
    });
  });

  describe('Global Placement ID (GPID)', function () {
    it('should not include gpid by default', () => {
      const request = spec.buildRequests(DEFAULT_PARAMS_WO_OPTIONAL);
      const requestContent = JSON.parse(request[0].data);

      expect(requestContent).to.not.have.property('gdid');
    });

    it('should include gpid if pbadslot in ortb2Imp', () => {
      const gpid = '/19968336/header-bid-tag-1';
      const bidRequests = deepClone(DEFAULT_PARAMS_WO_OPTIONAL);

      bidRequests[0].ortb2Imp = {
        ext: {
          data: {
            pbadslot: gpid
          }
        }
      };

      const request = spec.buildRequests(bidRequests);
      const requestContent = JSON.parse(request[0].data);

      expect(requestContent).to.have.property('gpid').and.to.equal(gpid);
    });

    it('should include gpid if imp[].ext.gpid exists', () => {
      const gpid = '/1111/homepage#div-leftnav';
      const bidRequests = deepClone(DEFAULT_PARAMS_WO_OPTIONAL);

      bidRequests[0].ortb2Imp = {
        ext: { gpid }
      };

      const request = spec.buildRequests(bidRequests);
      const requestContent = JSON.parse(request[0].data);

      expect(requestContent).to.have.property('gpid').and.to.equal(gpid);
    });
  });

  describe('#getValuableProperty method', function () {
    it('should return an object when calling with a number value', () => {
      const obj = spec.getValuableProperty('prop', 3);
      expect(obj).to.deep.equal({ prop: 3 });
    });

    it('should return an empty object when calling with a string value', () => {
      const obj = spec.getValuableProperty('prop', 'str');
      expect(obj).to.deep.equal({});
    });

    it('should return an empty object when calling with a number property', () => {
      const obj = spec.getValuableProperty(7, 'str');
      expect(obj).to.deep.equal({});
    });

    it('should return an empty object when calling with a null value', () => {
      const obj = spec.getValuableProperty('prop', null);
      expect(obj).to.deep.equal({});
    });

    it('should return an empty object when calling with an object value', () => {
      const obj = spec.getValuableProperty('prop', {});
      expect(obj).to.deep.equal({});
    });

    it('should return an empty object when calling with a 0 value', () => {
      const obj = spec.getValuableProperty('prop', 0);
      expect(obj).to.deep.equal({});
    });

    it('should return an empty object when calling without the value argument', () => {
      const obj = spec.getValuableProperty('prop');
      expect(obj).to.deep.equal({});
    });
  });
});
