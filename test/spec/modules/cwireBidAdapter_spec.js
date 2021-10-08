import { expect } from 'chai';
import * as utils from '../../../src/utils.js';
import {
  spec,
  CW_PAGE_VIEW_ID,
  ENDPOINT_URL,
  RENDERER_URL,
} from '../../../modules/cwireBidAdapter.js';
import * as prebidGlobal from 'src/prebidGlobal.js';

// ------------------------------------
// Bid Request Builder
// ------------------------------------

const BID_DEFAULTS = {
  request: {
    bidder: 'cwire',
    auctionId: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
    transactionId: 'txaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
    bidId: 'bid123445',
    bidderRequestId: 'brid12345',
    code: 'original-div',
  },
  params: {
    placementId: 123456,
    pageId: 777,
    adUnitElementId: 'target-div'
  },
  sizes: [[300, 250], [1, 1]],
};

const BidderRequestBuilder = function BidderRequestBuilder(options) {
  const defaults = {
    bidderCode: 'cwire',
    auctionId: BID_DEFAULTS.request.auctionId,
    bidderRequestId: BID_DEFAULTS.request.bidderRequestId,
    transactionId: BID_DEFAULTS.request.transactionId,
    timeout: 3000,
    refererInfo: {
      numIframes: 0,
      reachedTop: true,
      referer: 'http://test.io/index.html?pbjs_debug=true'
    }
  };

  const request = {
    ...defaults,
    ...options
  };

  this.build = () => request;
};

const BidRequestBuilder = function BidRequestBuilder(options, deleteKeys) {
  const defaults = JSON.parse(JSON.stringify(BID_DEFAULTS));

  const request = {
    ...defaults.request,
    ...options
  };

  if (request && utils.isArray(deleteKeys)) {
    deleteKeys.forEach((k) => {
      delete request[k];
    })
  }

  this.withParams = (options, deleteKeys) => {
    request.params = {
      ...defaults.params,
      ...options
    };
    if (request && utils.isArray(deleteKeys)) {
      deleteKeys.forEach((k) => {
        delete request.params[k];
      })
    }
    return this;
  };

  this.build = () => request;
};

describe('C-WIRE bid adapter', () => {
  let utilsMock;
  let sandbox;

  beforeEach(() => {
    utilsMock = sinon.mock(utils);
    sandbox = sinon.createSandbox();
  });

  afterEach(() => {
    utilsMock.restore();
    sandbox.restore();
  });

  // START TESTING
  describe('C-WIRE - isBidRequestValid', function () {
    it('should return true when required params found', function () {
      const bid01 = new BidRequestBuilder().withParams().build();
      expect(spec.isBidRequestValid(bid01)).to.equal(true);
    });

    it('should fail if there is no placementId', function () {
      const bid01 = new BidRequestBuilder().withParams().build();
      delete bid01.params.placementId
      expect(spec.isBidRequestValid(bid01)).to.equal(false);
    });

    it('should fail if invalid placementId type', function () {
      const bid01 = new BidRequestBuilder().withParams().build();
      delete bid01.params.placementId;
      bid01.placementId = '322';
      expect(spec.isBidRequestValid(bid01)).to.equal(false);
    });

    it('should fail if there is no pageId', function () {
      const bid01 = new BidRequestBuilder().withParams().build();
      delete bid01.params.pageId
      expect(spec.isBidRequestValid(bid01)).to.equal(false);
    });

    it('should fail if invalid pageId type', function () {
      const bid01 = new BidRequestBuilder().withParams().build();
      delete bid01.params.pageId;
      bid01.params.pageId = '3320';
      expect(spec.isBidRequestValid(bid01)).to.equal(false);
    });

    it('should use params.adUnitElementId if provided', function () {
      const bid01 = new BidRequestBuilder().withParams().build();

      expect(spec.isBidRequestValid(bid01)).to.equal(true);
      expect(bid01.params.adUnitElementId).to.exist;
      expect(bid01.params.adUnitElementId).to.equal('target-div');
    });

    it('should use default adUnitCode if no adUnitElementId provided', function () {
      const bid01 = new BidRequestBuilder().withParams({}, ['adUnitElementId']).build();
      expect(spec.isBidRequestValid(bid01)).to.equal(true);
      expect(bid01.params.adUnitElementId).to.exist;
      expect(bid01.params.adUnitElementId).to.equal('original-div');
    });
  });

  describe('C-WIRE - buildRequests()', function () {
    it('creates a valid request', function () {
      const bid01 = new BidRequestBuilder({
        mediaTypes: {
          banner: {
            sizes: [[1, 1]],
          }
        }
      }).withParams().build();
      const bidderRequest01 = new BidderRequestBuilder().build();

      const requests = spec.buildRequests([bid01], bidderRequest01);
      expect(requests.data.slots.length).to.equal(1);
      expect(requests.data.cwid).to.be.null;
      expect(requests.data.slots[0].sizes[0]).to.equal('1x1');
    });
  });

  describe('C-WIRE - interpretResponse()', function () {
    const serverResponse = {
      body: {
        bids: [{
          html: '<div><h2>AD CONTENT</h2></div>',
          currency: 'CHF',
          cpm: 43.37,
          dimensions: [1, 1],
          netRevenue: true,
          creativeId: '1337',
          requestId: BID_DEFAULTS.request.bidId,
          ttl: 3500,
        }],
      }
    };

    const expectedResponse = [{
      ad: JSON.parse(JSON.stringify(serverResponse.body.bids[0].html)),
      bidderCode: BID_DEFAULTS.request.bidder,
      cpm: JSON.parse(JSON.stringify(serverResponse.body.bids[0].cpm)),
      creativeId: JSON.parse(JSON.stringify(serverResponse.body.bids[0].creativeId)),
      currency: JSON.parse(JSON.stringify(serverResponse.body.bids[0].currency)),
      height: JSON.parse(JSON.stringify(serverResponse.body.bids[0].dimensions[0])),
      width: JSON.parse(JSON.stringify(serverResponse.body.bids[0].dimensions[1])),
      netRevenue: JSON.parse(JSON.stringify(serverResponse.body.bids[0].netRevenue)),
      requestId: JSON.parse(JSON.stringify(serverResponse.body.bids[0].requestId)),
      ttl: JSON.parse(JSON.stringify(serverResponse.body.bids[0].ttl)),
      meta: {
        advertiserDomains: [],
      },
      mediaType: 'banner',
    }]

    it('correctly parses response', function () {
      const bid01 = new BidRequestBuilder({
        mediaTypes: {
          banner: {
            sizes: [[1, 1]],
          }
        }
      }).withParams().build();

      const bidderRequest01 = new BidderRequestBuilder().build();
      const requests = spec.buildRequests([bid01], bidderRequest01);

      const response = spec.interpretResponse(serverResponse, requests);
      expect(response).to.deep.equal(expectedResponse);
    });

    it('attaches renderer', function () {
      const bid01 = new BidRequestBuilder({
        mediaTypes: {
          video: {
            playerSize: [[640, 480]],
            context: 'outstream',
          }
        }
      }).withParams().build();
      const bidderRequest01 = new BidderRequestBuilder().build();

      const _serverResponse = utils.deepClone(serverResponse);
      _serverResponse.body.bids[0].vastXml = '<xml></xml>';

      const _expectedResponse = utils.deepClone(expectedResponse);
      _expectedResponse[0].mediaType = 'video';
      _expectedResponse[0].videoScript = JSON.parse(JSON.stringify(_serverResponse.body.bids[0].html));
      _expectedResponse[0].vastXml = JSON.parse(JSON.stringify(_serverResponse.body.bids[0].vastXml));
      delete _expectedResponse[0].ad;

      const requests = spec.buildRequests([bid01], bidderRequest01);
      expect(requests.data.slots[0].sizes).to.deep.equal(['640x480']);

      const response = spec.interpretResponse(_serverResponse, requests);
      expect(response[0].renderer).to.exist;
      expect(response[0].renderer.url).to.equals(RENDERER_URL);
      expect(response[0].renderer.loaded).to.equals(false);

      delete response[0].renderer;
      expect(response).to.deep.equal(_expectedResponse);
    });
  });
});
