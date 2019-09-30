import {
  expect
} from 'chai';
import {
  spec
} from 'modules/smartadserverBidAdapter';
import {
  newBidder
} from 'src/adapters/bidderFactory';
import {
  config
} from 'src/config';
import * as utils from 'src/utils';
import { requestBidsHook } from 'modules/consentManagement';

// Default params with optional ones
describe('Smart bid adapter tests', function () {
  var DEFAULT_PARAMS = [{
    adUnitCode: 'sas_42',
    bidId: 'abcd1234',
    sizes: [
      [300, 250],
      [300, 200]
    ],
    bidder: 'smartadserver',
    params: {
      domain: 'http://prg.smartadserver.com',
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

  // Default params without optional ones
  var DEFAULT_PARAMS_WO_OPTIONAL = [{
    adUnitCode: 'sas_42',
    bidId: 'abcd1234',
    sizes: [
      [300, 250],
      [300, 200]
    ],
    bidder: 'smartadserver',
    params: {
      domain: 'http://prg.smartadserver.com',
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
      cSyncUrl: 'http://awesome.fake.csync.url'
    }
  };

  it('Verify build request', function () {
    config.setConfig({
      'currency': {
        'adServerCurrency': 'EUR'
      }
    });
    const request = spec.buildRequests(DEFAULT_PARAMS);
    expect(request[0]).to.have.property('url').and.to.equal('http://prg.smartadserver.com/prebid/v1');
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
    expect(requestContent).to.have.property('pageDomain').and.to.equal(utils.getTopWindowUrl());
    expect(requestContent).to.have.property('transactionId').and.to.not.equal(null).and.to.not.be.undefined;
    expect(requestContent).to.have.property('buid').and.to.equal('7569');
    expect(requestContent).to.have.property('appname').and.to.equal('Mozilla');
    expect(requestContent).to.have.property('ckid').and.to.equal(42);
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
    expect(bid.referrer).to.equal(utils.getTopWindowUrl());

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
  });
});
