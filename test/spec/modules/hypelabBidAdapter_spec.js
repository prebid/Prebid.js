import { expect } from 'chai';
import { spec, BIDDER_CODE, ENDPOINT_URL, REQUEST_ROUTE } from 'modules/hypelabBidAdapter.js';
import { BANNER } from '../../../src/mediaTypes.js';

const mockRequest = {
  bidder: '',
  params: {
    property_slug: 'mock',
    placement_slug: 'mock'
  },
  mediaTypes: {
    banner: {
      sizes: [[300, 250]]
    }
  }
};

const mockBids = {
  data: {},
  bids: [{ bidId: '0' }]
};

const mockResponse = {
  body: {
    data: {
      cpm: 0.50,
      width: 300,
      height: 250,
      creativeId: '0',
      currency: 'USD',
      netRevenue: true,
      referrer: 'referrer.com',
      ttl: 360,
      ad: '',
      mediaType: 'banner',
      meta: {
        advertiserDomains: []
      }
    }
  }
};

describe('HypeLab bid adapter', function() {
  describe('Bidder code valid', function() {
    expect(spec.code).to.equal(BIDDER_CODE);
  });

  describe('Media types valid', function() {
    expect(spec.supportedMediaTypes).to.contain(BANNER);
  });

  describe('Bid request valid', function() {
    expect(spec.isBidRequestValid(mockRequest)).to.equal(true);
  });

  describe('Builds valid request', function() {
    const result = spec.buildRequests([mockRequest], {});
    expect(result).to.be.an('array');

    const first = result[0] || {};
    expect(first).to.be.an('object');
    expect(first.method).to.equal('POST');
    expect(first.url).to.be.a('string');
    expect(first.url).to.equal(ENDPOINT_URL + REQUEST_ROUTE);

    const data = first.data || {};
    expect(data).to.be.an('object');
    expect(data.property_slug).to.be.a('string');
    expect(data.placement_slug).to.be.a('string');
  });

  describe('Interprets valid response', function() {
    const result = spec.interpretResponse(mockResponse, mockBids);
    expect(result).to.be.an('array');

    const data = result[0] || {};
    expect(data).to.be.an('object');
    expect(data.cpm).to.be.a('number');
    expect(data.width).to.be.a('number');
    expect(data.height).to.be.a('number');
    expect(data.creativeId).to.be.a('string');
    expect(data.currency).to.be.a('string');
    expect(data.ttl).to.be.a('number');
    expect(data.ad).to.be.a('string');
    expect(data.mediaType).to.be.a('string');
  });
});
