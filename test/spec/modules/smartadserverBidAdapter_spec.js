import {
  expect
} from 'chai';
import {
  spec
} from 'modules/smartadserverBidAdapter';
import {
  getTopWindowLocation
} from 'src/utils';
import {
  newBidder
} from 'src/adapters/bidderFactory';
import {
  config
} from 'src/config';
import * as utils from 'src/utils';

describe('Smart ad server bid adapter tests', () => {
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
      bidfloor: 0.420
    },
    requestId: 'efgh5678',
    transactionId: 'zsfgzzg'
  }];

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
      ad: '< --- awesome script --- >'
    }
  };

  it('Verify build request', () => {
    config.setConfig({
      'currency': {
        'adServerCurrency': 'EUR'
      }
    });
    const request = spec.buildRequests(DEFAULT_PARAMS);
    expect(request).to.have.property('url').and.to.equal('http://prg.smartadserver.com/prebid/v1');
    expect(request).to.have.property('method').and.to.equal('POST');
    const requestContent = JSON.parse(request.data);
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
  });

  it('Verify parse response', () => {
    const request = spec.buildRequests(DEFAULT_PARAMS);
    const bids = spec.interpretResponse(BID_RESPONSE, request);
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
  });

  it('Verifies bidder code', () => {
    expect(spec.code).to.equal('smartadserver');
  });

  it('Verifies bidder aliases', () => {
    expect(spec.aliases).to.have.lengthOf(1);
    expect(spec.aliases[0]).to.equal('smart');
  });

  it('Verifies if bid request valid', () => {
    expect(spec.isBidRequestValid(DEFAULT_PARAMS[0])).to.equal(true);
    expect(spec.isBidRequestValid(DEFAULT_PARAMS_WO_OPTIONAL[0])).to.equal(true);
    expect(spec.isBidRequestValid({})).to.equal(false);
    expect(spec.isBidRequestValid({
      params: {}
    })).to.equal(false);
    expect(spec.isBidRequestValid({
      params: {
        pageid: 123
      }
    })).to.equal(false);
    expect(spec.isBidRequestValid({
      params: {
        siteid: 123
      }
    })).to.equal(false);
    expect(spec.isBidRequestValid({
      params: {
        formatid: 123,
        pageid: 234
      }
    })).to.equal(false);
    expect(spec.isBidRequestValid({
      params: {
        domain: 'www.test.com',
        pageid: 234
      }
    })).to.equal(false);
  });

  it('Verifies sync options', () => {
    expect(spec.getUserSyncs).to.be.undefined;
  });
});
