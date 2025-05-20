import { expect } from 'chai';
import { spec } from '../../../modules/epomDspBidAdapter.js';

const VALID_BID_REQUEST = {
  bidder: 'epom_dsp',
  params: {
    endpoint: 'https://bidder.epommarket.com/bidder/v2_5/bid?key=d0b9fb9de9dfbba694dfe75294d8e45a'
  },
  adUnitCode: 'ad-unit-1',
  sizes: [[300, 250]],
  bidId: '12345'
};

const BIDDER_REQUEST = {
  refererInfo: { referer: 'https://example.com' },
  gdprConsent: { consentString: 'consent_string' },
  uspConsent: 'usp_string'
};

describe('epomDspBidAdapter', function () {
  it('should validate a correct bid request', function () {
    expect(spec.isBidRequestValid(VALID_BID_REQUEST)).to.be.true;
  });

  it('should reject a bid request with missing endpoint', function () {
    const invalidBid = { ...VALID_BID_REQUEST, params: { endpoint: '' } };
    expect(spec.isBidRequestValid(invalidBid)).to.be.false;
  });

  it('should reject a bid request with an invalid endpoint', function () {
    const invalidBid = { ...VALID_BID_REQUEST, params: { endpoint: 'http://invalid.com' } };
    expect(spec.isBidRequestValid(invalidBid)).to.be.false;
  });

  it('should build requests properly', function () {
    const requests = spec.buildRequests([VALID_BID_REQUEST], BIDDER_REQUEST);
    expect(requests).to.have.length(1);
    expect(requests[0]).to.include.keys(['method', 'url', 'data', 'options']);
    expect(requests[0].method).to.equal('POST');
    expect(requests[0].url).to.equal(VALID_BID_REQUEST.params.endpoint);
    expect(requests[0].data).to.include.keys(['referer', 'gdprConsent', 'uspConsent']);
  });

  it('should interpret response correctly', function () {
    const SERVER_RESPONSE = {
      body: {
        bids: [
          {
            requestId: '12345',
            cpm: 1.23,
            currency: 'USD',
            width: 300,
            height: 250,
            ad: '<div>Ad</div>',
            creativeId: 'abcd1234',
            ttl: 300,
            netRevenue: true
          }
        ]
      }
    };

    const result = spec.interpretResponse(SERVER_RESPONSE);
    expect(result).to.have.length(1);
    expect(result[0]).to.include.keys(['requestId', 'cpm', 'currency', 'width', 'height', 'ad', 'creativeId', 'ttl', 'netRevenue']);
    expect(result[0].cpm).to.equal(1.23);
  });

  it('should return empty array for empty response', function () {
    const result = spec.interpretResponse({ body: {} });
    expect(result).to.be.an('array').that.is.empty;
  });
});
