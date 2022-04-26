import { expect } from 'chai';
import { config } from 'src/config.js';
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
    transactionId: 'zsfgzzg'
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
    userId: {
      britepoolid: '1111',
      criteoId: '1111',
      digitrustid: { data: { id: 'DTID', keyv: 4, privacy: { optout: false }, producer: 'ABC', version: 2 } },
      id5id: { uid: '1111' },
      idl_env: '1111',
      lipbid: '1111',
      parrableid: 'eidVersion.encryptionKeyReference.encryptedValue',
      pubcid: '1111',
      tdid: '1111',
      netId: 'fH5A3n2O8_CZZyPoJVD-eabc6ECb7jhxCicsds7qSg',
    }
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

  it('Verify build request', function () {
    config.setConfig({
      'currency': {
        'adServerCurrency': 'EUR'
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
      config.resetConfig();
      $$PREBID_GLOBAL$$.requestBids.removeAll();
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

  describe('ccpa/us privacy tests', function () {
    afterEach(function () {
      config.resetConfig();
      $$PREBID_GLOBAL$$.requestBids.removeAll();
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
      $$PREBID_GLOBAL$$.requestBids.removeAll();
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
      transactionId: 'zsfgzzg'
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
        expect(requestContent.videoData).to.have.property('videoProtocol').and.to.equal(null);
        expect(requestContent.videoData).to.have.property('adBreak').and.to.equal(2);
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
    });
  });

  describe('Outstream video tests', function () {
    afterEach(function () {
      config.resetConfig();
      $$PREBID_GLOBAL$$.requestBids.removeAll();
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
      requestId: 'efgh5679',
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
      expect(requestContent.videoData).to.have.property('videoProtocol').and.to.equal(null);
      expect(requestContent.videoData).to.have.property('adBreak').and.to.equal(2);
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
  });

  describe('Verify bid requests with multiple mediaTypes', function () {
    afterEach(function () {
      config.resetConfig();
      $$PREBID_GLOBAL$$.requestBids.removeAll();
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
});
