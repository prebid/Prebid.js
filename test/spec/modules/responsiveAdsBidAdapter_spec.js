import { expect } from 'chai';
import { spec } from 'modules/responsiveAdsBidAdapter.js';
import * as utils from 'src/utils.js';

describe('responsiveAdsBidAdapter', function() {
  let bidRequests;
  let bidderRequest;
  let sandbox;

  beforeEach(function () {
    sandbox = sinon.sandbox.create();
    sandbox.stub(utils, 'isSafeFrameWindow').returns(false);
    sandbox.stub(utils, 'canAccessWindowTop').returns(true);
    bidRequests = [{
      bidder: 'responsiveads',
      params: {
        placementId: '1',
      },
      adUnitCode: '/3434399/header-bid-tag-1',
      mediaTypes: {
        banner: {
          sizes: [[300, 250], [300, 600]],
        }
      },
      bidId: '123',
      auctionId: '456',
      bidderRequestId: '789',
      transactionId: '123'
    }];

    bidderRequest = {
      timeout: 3000,
    }
  });

  afterEach(function () {
    sandbox.restore();
  });

  describe('Check if bid is valid', function() {
    it('Should accept valid bid', function() {
      const validBid = {
        bidder: 'responsiveads',
        params: {},
      };

      const isValid = spec.isBidRequestValid(validBid);
      expect(isValid).to.equal(true);
    });

    it('Should not reject bid if missing placementId', function() {
      const validBid = {
        bidder: 'responsiveads',
        params: {}
      };

      const isValid = spec.isBidRequestValid(validBid);
      expect(isValid).to.equal(true);
    });
  });

  describe('Build requests', function () {
    it('Should not bit on safeframe', function() {
      utils.isSafeFrameWindow.restore();
      sandbox.stub(utils, 'isSafeFrameWindow').returns(true);

      const requests = spec.buildRequests(bidRequests, bidderRequest);
      expect(requests).to.be.null;
    });

    it('Should not bit if cant access window top', function () {
      utils.canAccessWindowTop.restore();
      sandbox.stub(utils, 'canAccessWindowTop').returns(false);

      const requests = spec.buildRequests(bidRequests, bidderRequest);
      expect(requests).to.be.null;
    });

    it('Should use POST and have URL', function() {
      const request = spec.buildRequests(bidRequests, bidderRequest);

      expect(request.method).to.exist;
      expect(request.method).to.equal('POST');
      expect(request.url).to.exist;
    });

    it('Should add adapter version', function() {
      const request = spec.buildRequests(bidRequests, bidderRequest);
      expect(request.data.ext.prebid.adapterVersion).to.exist;
    });
  });

  describe('Handling responses', function() {
    it('Should return complete bid response', function() {
      const serverResponse = {
        body: {
          id: 'response-id',
          cur: 'USD',
          seatbid: [
            {
              bid: [
                {
                  id: '123',
                  impid: '123',
                  price: 0.5,
                  adm: `<creative></creative>`,
                  nurl: 'https://example.com/win',
                  crid: '662d13e12e0c567af92d0918',
                  w: 300,
                  h: 250,
                  mediaType: 'banner',
                  adomain: ['responsiveads.com'],
                  attr: [1],
                  cat: ['IAB1']
                }
              ]
            }
          ]
        }
      };

      const request = spec.buildRequests(bidRequests, bidderRequest);
      const bids = spec.interpretResponse(serverResponse, request);

      expect(bids).to.be.lengthOf(1);
      expect(bids[0].requestId).to.equal('123');
      expect(bids[0].cpm).to.equal(0.5);
      expect(bids[0].width).to.equal(300);
      expect(bids[0].height).to.equal(250);
      expect(bids[0].ad).to.have.length.above(1);
      expect(bids[0].meta.advertiserDomains).to.deep.equal(['responsiveads.com']);
    });

    it('should return empty bid response', function () {
      const emptyServerResponse = {
        body: []
      };

      const request = spec.buildRequests(bidRequests, bidderRequest);
      const bids = spec.interpretResponse(emptyServerResponse, request);

      expect(bids).to.be.lengthOf(0);
    });
  });
});
