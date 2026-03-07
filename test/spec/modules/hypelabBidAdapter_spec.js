import { expect } from 'chai';
import sinon from 'sinon';
import * as utils from 'src/utils.js';

import { spec, BIDDER_CODE, ENDPOINT_URL } from 'modules/hypelabBidAdapter.js';

import { BANNER } from 'src/mediaTypes.js';

import 'src/prebid.js';
import { hook } from '../../../src/hook.js';

const mockValidBidRequest = {
  bidder: 'hypelab',
  params: {
    property_slug: 'prebid',
    placement_slug: 'test_placement',
  },
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
};

const mockValidBidRequests = [mockValidBidRequest];

const mockBidderRequest = {
  bidderCode: 'hypelab',
  auctionId: '3bf3b1fb-cb0a-4ee8-90ef-69b8e6e56dbd',
  bidderRequestId: '1d1f40b509f18',
  bids: mockValidBidRequests,
  timeout: 2000,
  ortb2: {
    source: {
      tid: '3bf3b1fb-cb0a-4ee8-90ef-69b8e6e56dbd',
    },
  },
  refererInfo: {
    page: 'https://example.com/hello_world.html',
    domain: 'example.com',
    ref: null,
  },
};

const mockServerResponse = {
  body: {
    id: 'test-response-id',
    cur: 'USD',
    seatbid: [
      {
        bid: [
          {
            price: 1.5,
            adm: '<div>ad markup</div>',
            impid: '24d2b2c86c5e19',
            crid: '842984f045',
            w: 728,
            h: 90,
            adomain: ['ogx.com'],
            burl: 'https://api.hypelab.com/v1/events/burl?price=${AUCTION_PRICE}',
          },
        ],
      },
    ],
  },
};

describe('hypelabBidAdapter', function () {
  before(function () {
    hook.ready();
  });

  describe('isBidRequestValid', function () {
    it('should return false when given an invalid bid request', function () {
      expect(spec.isBidRequestValid({})).to.equal(false);
    });

    it('should return false when missing placement_slug', function () {
      expect(
        spec.isBidRequestValid({ params: { property_slug: 'test' } })
      ).to.equal(false);
    });

    it('should return true when given a valid bid request', function () {
      expect(spec.isBidRequestValid(mockValidBidRequest)).to.equal(true);
    });
  });

  describe('spec properties', function () {
    it('should have correct bidder code', function () {
      expect(spec.code).to.equal(BIDDER_CODE);
    });

    it('should support banner media type', function () {
      expect(spec.supportedMediaTypes).to.contain(BANNER);
    });
  });

  describe('buildRequests', function () {
    let requests;

    before(function () {
      requests = spec.buildRequests(mockValidBidRequests, mockBidderRequest);
    });

    it('should return an array of requests', function () {
      expect(requests).to.be.an('array');
      expect(requests).to.have.lengthOf(1);
    });

    it('should make a POST request to the correct endpoint', function () {
      const request = requests[0];
      expect(request.method).to.equal('POST');
      expect(request.url).to.equal(ENDPOINT_URL);
    });

    it('should set withCredentials', function () {
      expect(requests[0].options.withCredentials).to.equal(true);
    });

    it('should include imp.ext.bidder with property_slug and placement_slug', function () {
      const bidder = requests[0].data.imp[0].ext.bidder;
      expect(bidder.property_slug).to.equal('prebid');
      expect(bidder.placement_slug).to.equal('test_placement');
    });

    it('should include imp.ext.bidder.pp', function () {
      expect(requests[0].data.imp[0].ext.bidder).to.have.property('pp');
    });

    it('should set ext.source to prebid', function () {
      expect(requests[0].data.ext.source).to.equal('prebid');
    });

    it('should include ext.dpr and ext.vp', function () {
      const ext = requests[0].data.ext;
      expect(ext.dpr).to.be.a('number');
      expect(ext.vp).to.be.an('array');
      expect(ext.vp).to.have.lengthOf(2);
    });

    it('should include ext.sdk_version', function () {
      expect(requests[0].data.ext.sdk_version).to.be.a('string');
    });

    it('should include ext.provider_version', function () {
      expect(requests[0].data.ext.provider_version).to.equal('0.0.4');
    });

    it('should set at to 1', function () {
      expect(requests[0].data.at).to.equal(1);
    });

    it('should include USD in cur', function () {
      expect(requests[0].data.cur).to.include('USD');
    });

    it('should include user.ext.wp and user.ext.wpfs', function () {
      const user = requests[0].data.user;
      expect(user.ext.wp).to.be.an('object');
      expect(user.ext.wpfs).to.be.an('object');
    });

    it('should include user.ext.wids as empty array', function () {
      expect(requests[0].data.user.ext.wids).to.deep.equal([]);
    });

    it('should set user.buyeruid from userIdAsEids', function () {
      const bidRequestWithEids = {
        ...mockValidBidRequest,
        userIdAsEids: [
          {
            source: 'pubcid.org',
            uids: [{ id: 'pubcid_id' }],
          },
        ],
      };

      const result = spec.buildRequests(
        [bidRequestWithEids],
        mockBidderRequest
      );
      expect(result[0].data.user.buyeruid).to.equal('pubcid_id');
      expect(result[0].data.user.id).to.equal('pubcid_id');
    });

    it('should generate a temporary uuid when no userIdAsEids', function () {
      const result = spec.buildRequests(
        [mockValidBidRequest],
        mockBidderRequest
      );
      expect(result[0].data.user.buyeruid).to.be.a('string');
      expect(result[0].data.user.buyeruid).to.match(/^tmp_/);
    });

    it('should include banner format in imp', function () {
      const imp = requests[0].data.imp[0];
      expect(imp.banner).to.exist;
      expect(imp.banner.format).to.be.an('array');
      expect(imp.banner.format[0].w).to.equal(728);
      expect(imp.banner.format[0].h).to.equal(90);
    });
  });

  describe('interpretResponse', function () {
    let request;

    before(function () {
      const requests = spec.buildRequests(
        mockValidBidRequests,
        mockBidderRequest
      );
      request = requests[0];
    });

    it('should return a valid bid from a valid response', function () {
      const result = spec.interpretResponse(mockServerResponse, request);

      expect(result).to.be.an('array');
      expect(result).to.have.lengthOf(1);

      const bid = result[0];
      expect(bid.cpm).to.equal(1.5);
      expect(bid.width).to.equal(728);
      expect(bid.height).to.equal(90);
      expect(bid.creativeId).to.equal('842984f045');
      expect(bid.currency).to.equal('USD');
      expect(bid.ad).to.equal('<div>ad markup</div>');
      expect(bid.mediaType).to.equal(BANNER);
      expect(bid.meta.advertiserDomains).to.deep.equal(['ogx.com']);
    });

    it('should return an empty array for empty response', function () {
      expect(spec.interpretResponse({}, request)).to.deep.equal([]);
    });

    it('should return an empty array for missing body', function () {
      expect(spec.interpretResponse({ body: null }, request)).to.deep.equal([]);
    });

    it('should return an empty array for response with no seatbid', function () {
      const result = spec.interpretResponse(
        { body: { id: '1', seatbid: [] } },
        request
      );
      expect(result).to.be.an('array');
      expect(result).to.have.lengthOf(0);
    });
  });

  describe('onBidWon', function () {
    let triggerPixelStub;

    beforeEach(function () {
      triggerPixelStub = sinon.stub(utils, 'triggerPixel');
    });

    afterEach(function () {
      triggerPixelStub.restore();
    });

    it('should fire burl pixel with auction price', function () {
      const bid = {
        cpm: 1.5,
        burl: 'https://api.hypelab.com/v1/events/burl?price=${AUCTION_PRICE}',
      };
      spec.onBidWon(bid);
      expect(triggerPixelStub.calledOnce).to.be.true;
      expect(triggerPixelStub.getCall(0).args[0]).to.equal(
        'https://api.hypelab.com/v1/events/burl?price=1.5'
      );
    });

    it('should use originalCpm when available', function () {
      const bid = {
        cpm: 1.2,
        originalCpm: 1.5,
        burl: 'https://api.hypelab.com/v1/events/burl?price=${AUCTION_PRICE}',
      };
      spec.onBidWon(bid);
      expect(triggerPixelStub.calledOnce).to.be.true;
      expect(triggerPixelStub.getCall(0).args[0]).to.equal(
        'https://api.hypelab.com/v1/events/burl?price=1.5'
      );
    });

    it('should not fire pixel when burl is missing', function () {
      spec.onBidWon({ cpm: 1.5 });
      expect(triggerPixelStub.called).to.be.false;
    });
  });
});
