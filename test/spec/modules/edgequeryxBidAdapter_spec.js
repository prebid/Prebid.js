import {
  expect
} from 'chai';
import {
  spec
} from 'modules/edgequeryxBidAdapter.js';
import {
  newBidder
} from 'src/adapters/bidderFactory.js';
import {
  config
} from 'src/config.js';
import * as utils from 'src/utils.js';
import { requestBidsHook } from 'modules/consentManagement.js';

// Default params with optional ones
describe('Edge Query X bid adapter tests', function () {
  var DEFAULT_PARAMS = [{
    bidId: 'abcd1234',
    mediaTypes: {
      banner: {
        sizes: [
          [1, 1]
        ]
      }
    },
    bidder: 'edgequeryx',
    params: {
      accountId: 'test',
      widgetId: 'test'
    },
    requestId: 'efgh5678',
    transactionId: 'zsfgzzg'
  }];
  var BID_RESPONSE = {
    body: {
      requestId: 'abcd1234',
      cpm: 22,
      width: 1,
      height: 1,
      creativeId: 'EQXTest',
      currency: 'EUR',
      netRevenue: true,
      ttl: 360,
      ad: '< --- awesome script --- >'
    }
  };

  it('Verify build request', function () {
    config.setConfig({
      'currency': {
        'adServerCurrency': 'EUR'
      }
    });
    const request = spec.buildRequests(DEFAULT_PARAMS);
    expect(request[0]).to.have.property('url').and.to.equal('https://deep.edgequery.io/prebid/x');
    expect(request[0]).to.have.property('method').and.to.equal('POST');
    const requestContent = JSON.parse(request[0].data);

    expect(requestContent).to.have.property('accountId').and.to.equal('test');
    expect(requestContent).to.have.property('widgetId').and.to.equal('test');
    expect(requestContent).to.have.property('sizes');
    expect(requestContent.sizes[0]).to.have.property('w').and.to.equal(1);
    expect(requestContent.sizes[0]).to.have.property('h').and.to.equal(1);
  });

  it('Verify parse response', function () {
    const request = spec.buildRequests(DEFAULT_PARAMS);
    const bids = spec.interpretResponse(BID_RESPONSE, request[0]);
    expect(bids).to.have.lengthOf(1);
    const bid = bids[0];
    expect(bid.cpm).to.equal(22);
    expect(bid.ad).to.equal('< --- awesome script --- >');
    expect(bid.width).to.equal(1);
    expect(bid.height).to.equal(1);
    expect(bid.creativeId).to.equal('EQXTest');
    expect(bid.currency).to.equal('EUR');
    expect(bid.netRevenue).to.equal(true);
    expect(bid.ttl).to.equal(360);
    expect(bid.requestId).to.equal(DEFAULT_PARAMS[0].bidId);

    expect(function () {
      spec.interpretResponse(BID_RESPONSE, {
        data: 'invalid Json'
      })
    }).to.not.throw();
  });

  it('Verifies bidder code', function () {
    expect(spec.code).to.equal('edgequeryx');
  });

  it('Verifies bidder aliases', function () {
    expect(spec.aliases).to.have.lengthOf(1);
    expect(spec.aliases[0]).to.equal('eqx');
  });

  it('Verifies if bid request valid', function () {
    expect(spec.isBidRequestValid(DEFAULT_PARAMS[0])).to.equal(true);
    expect(spec.isBidRequestValid({})).to.equal(false);
    expect(spec.isBidRequestValid({
      params: {}
    })).to.equal(false);
    expect(spec.isBidRequestValid({
      params: {
        widgetyId: 'abcdef'
      }
    })).to.equal(false);
    expect(spec.isBidRequestValid({
      params: {
        widgetId: 'test',
        accountId: 'test'
      }
    })).to.equal(true);
  });
});
