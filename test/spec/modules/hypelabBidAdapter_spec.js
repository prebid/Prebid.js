import { expect } from 'chai';
import sinon from 'sinon';
import { server } from '../../mocks/xhr';

import {
  mediaSize,
  spec,
  BIDDER_CODE,
  ENDPOINT_URL,
  REQUEST_ROUTE,
} from 'modules/hypelabBidAdapter.js';

import { BANNER } from 'src/mediaTypes.js';

const mockValidBidRequest = {
  bidder: 'hypelab',
  params: {
    property_slug: 'prebid',
    placement_slug: 'test_placement',
    uuid: '',
    sdk_version: '0.1.0',
    provider_name: 'react',
    provider_version: '0.3.1',
  },
  userIds: [],
  mediaTypes: {
    banner: {
      sizes: [[728, 90]],
    },
  },
  adUnitCode: 'test-div',
  sizes: [[728, 90]],
  bidId: '24d2b2c86c5e19',
  bidderRequestId: '1d1f40b509f18',
  auctionId: '3bf3b1fb-cb0a-4ee8-90ef-69b8e6e56dbd',
  bidRequestsCount: 1,
  bidderRequestsCount: 1,
  bidderWinsCount: 0,
};

const mockValidBidRequests = [mockValidBidRequest];

const mockServerResponse = {
  body: {
    status: 'success',
    data: {
      currency: 'USD',
      campaign_slug: '9dbe230882',
      creative_set_slug: '842984f045',
      creative_set: {
        image: {
          url: 'https://cloudfront.net/up/asset/12345',
          height: 90,
          width: 728,
        },
      },
      cpm: 1.5,
      html: "<!DOCTYPE html>\n      <html lang=\"en\">\n          <head>\n              <meta charset=\"UTF-8\">\n              <title>Ad</title>\n              <style>\n                  html, body {\n                      margin: 0;\n                      padding: 0;\n                      overflow: hidden;\n                  }\n              </style>\n          </head>\n          <body>\n              <a\n            id=\"link\"\n            href=https://web.hypelab-staging.com/click?campaign_slug=9dbe230882&creative_set_slug=842984f045&placement_slug=test_placement \n            target=\"_blank\">\n            <img src=\"https://di30gnjrtlisb.cloudfront.net/up/asset/d1d1d65463/8eb7e9065e.jpg?tr=w-728,h-90\">\n        </a>\n        \n              <script>\n                  function track(type) {\n                      var request = new XMLHttpRequest();\n                      request.open('POST', 'https://api.hypelab-staging.com/v1/events');\n                      request.setRequestHeader('Content-Type', 'application/json');\n\n                      var event = {\n                          property_slug: 'prebid',\n                          placement_slug: 'test_placement',\n                          campaign_slug: '9dbe230882',\n                          creative_set_slug: '842984f045',\n                          type: type,\n                          uuid: '',\n                          wids: []\n                      };\n\n                      request.send(JSON.stringify(event));\n                  }\n\n                  document.getElementById('link').addEventListener('click', function() {\n                      track('click');\n                  });\n\n                  track('impression');\n              </script>\n          </body>\n      </html>\n    ",
      advertiser_domains: ['ogx.com'],
      media_type: 'banner',
      ttl: 360,
    },
  },
};

const mockBidderRequest = {
  bidderCode: 'hypelab',
  auctionId: '4462005b-ba06-49a9-a95d-0209c22f4606',
  bidderRequestId: '1bf399761210ad',
  bids: mockValidBidRequests,
  auctionStart: 1684983987435,
  timeout: 2000,
  refererInfo: {
    topmostLocation: 'https://example.com/hello_world.html',
    location: 'https://example.com/hello_world.html',
    canonicalUrl: null,
    page: 'https://example.com/hello_world.html',
    domain: null,
    ref: null,
  },
};

const mockBidRequest = {
  method: 'POST',
  url: 'https://api.hypelab.com/v1/prebid_requests',
  options: {
    contentType: 'application/json',
    withCredentials: false,
  },
  data: {
    property_slug: 'prebid',
    placement_slug: 'test_placement',
    provider_version: '0.0.1',
    provider_name: 'prebid',
    location: 'https://example.com',
    sdk_version: '7.51.0-pre',
    sizes: [[728, 90]],
    wids: [],
    uuid: 'tmp_c5abf809-47d6-40b9-8274-372c6d816dd8',
    bidRequestsCount: 1,
    bidderRequestsCount: 1,
    bidderWinsCount: 0,
  },
  bidId: '2e02b562f700ae',
};

describe('hypelabBidAdapter', function () {
  describe('mediaSize', function () {
    describe('when given an invalid media object', function () {
      expect(mediaSize({})).to.eql({ width: 0, height: 0 });
    });

    describe('when given a valid media object', function () {
      expect(
        mediaSize({ creative_set: { image: { width: 728, height: 90 } } })
      ).to.eql({ width: 728, height: 90 });
    });
  });

  describe('isBidRequestValid', function () {
    describe('when given an invalid bid request', function () {
      expect(spec.isBidRequestValid({})).to.equal(false);
    });

    describe('when given a valid bid request', function () {
      expect(spec.isBidRequestValid(mockValidBidRequest)).to.equal(true);
    });
  });

  describe('Bidder code valid', function () {
    expect(spec.code).to.equal(BIDDER_CODE);
  });

  describe('Media types valid', function () {
    expect(spec.supportedMediaTypes).to.contain(BANNER);
  });

  describe('Bid request valid', function () {
    expect(spec.isBidRequestValid(mockValidBidRequest)).to.equal(true);
  });

  describe('buildRequests', () => {
    describe('returns a valid request', function () {
      const result = spec.buildRequests(
        mockValidBidRequests,
        mockBidderRequest
      );
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
      expect(data.bidRequestsCount).to.be.a('number');
      expect(data.bidderRequestsCount).to.be.a('number');
      expect(data.bidderWinsCount).to.be.a('number');
      expect(data.dpr).to.be.a('number');
      expect(data.location).to.be.a('string');
      expect(data.floor).to.equal(null);
    });

    describe('should set uuid to the first id in userIdAsEids', () => {
      mockValidBidRequests[0].userIdAsEids = [
        {
          source: 'pubcid.org',
          uids: [
            {
              id: 'pubcid_id',
            },
          ],
        },
        {
          source: 'criteo.com',
          uids: [
            {
              id: 'criteo_id',
            },
          ],
        },
      ];

      const result = spec.buildRequests(
        mockValidBidRequests,
        mockBidderRequest
      );

      const data = result[0].data || {};
      expect(data.uuid).to.be.eq('pubcid_id');
    });
  });

  describe('interpretResponse', () => {
    describe('successfully interpret a valid response', function () {
      const result = spec.interpretResponse(mockServerResponse, mockBidRequest);

      expect(result).to.be.an('array');
      const data = result[0] || {};
      expect(data).to.be.an('object');
      expect(data.requestId).to.be.a('string');
      expect(data.cpm).to.be.a('number');
      expect(data.width).to.be.a('number');
      expect(data.height).to.be.a('number');
      expect(data.creativeId).to.be.a('string');
      expect(data.currency).to.be.a('string');
      expect(data.netRevenue).to.be.a('boolean');
      expect(data.referrer).to.be.a('string');
      expect(data.ttl).to.be.a('number');
      expect(data.ad).to.be.a('string');
      expect(data.mediaType).to.be.a('string');
      expect(data.meta.advertiserDomains).to.be.an('array');
      expect(data.meta.advertiserDomains[0]).to.be.a('string');
    });

    describe('should return a blank array if cpm is not set', () => {
      mockServerResponse.body.data.cpm = undefined;
      const result = spec.interpretResponse(mockServerResponse, mockBidRequest);
      expect(result).to.eql([]);
    });
  });

  describe('report', () => {
    it('returns if REPORTING_ROUTE is not set', () => {
      spec.REPORTING_ROUTE = '';
      expect(spec.report('test', {})).to.be.undefined;
    });

    it('makes a POST request if REPORTING_ROUTE is set', () => {
      spec.report('test', {}, '/v1/events');

      expect(server.requests[0].url).to.equals(
        'https://api.hypelab.com/v1/events'
      );
    });
  });

  describe('callbacks', () => {
    let bid = {};
    let reportStub;

    beforeEach(() => (reportStub = sinon.stub(spec, 'report')));
    afterEach(() => reportStub.restore());

    describe('onTimeout', () => {
      it('should call report with the correct data', () => {
        spec.onTimeout(bid);

        expect(reportStub.calledOnce).to.be.true;
        expect(reportStub.getCall(0).args).to.eql(['timeout', bid]);
      });
    });

    describe('onSetTargeting', () => {
      it('should call report with the correct data', () => {
        spec.onSetTargeting(bid);

        expect(reportStub.calledOnce).to.be.true;
        expect(reportStub.getCall(0).args).to.eql(['setTargeting', bid]);
      });
    });

    describe('onBidWon', () => {
      it('should call report with the correct data', () => {
        spec.onBidWon(bid);

        expect(reportStub.calledOnce).to.be.true;
        expect(reportStub.getCall(0).args).to.eql(['bidWon', bid]);
      });
    });

    describe('onBidderError', () => {
      it('should call report with the correct data', () => {
        spec.onBidderError(bid);

        expect(reportStub.calledOnce).to.be.true;
        expect(reportStub.getCall(0).args).to.eql(['bidderError', bid]);
      });
    });
  });
});
