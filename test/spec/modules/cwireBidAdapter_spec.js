import { expect } from 'chai';
import * as utils from '../../../src/utils.js';
import { config } from '../../../src/config.js';
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
  let sandbox;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
  });

  afterEach(() => {
    sandbox.restore();
    config.resetConfig();
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

    it('should fail if cwcreative of type number', function () {
      const bid01 = new BidRequestBuilder().withParams().build();
      delete bid01.params.cwcreative;
      bid01.params.cwcreative = 3320;
      expect(spec.isBidRequestValid(bid01)).to.equal(false);
    });

    it('should pass with valid cwcreative of type string', function () {
      const bid01 = new BidRequestBuilder().withParams().build();
      bid01.params.cwcreative = 'i-am-a-string';
      expect(spec.isBidRequestValid(bid01)).to.equal(true);
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
      }).withParams({
        cwcreative: '54321',
        cwapikey: 'xxx-xxx-yyy-zzz-uuid',
        refgroups: 'group_1',
      }).build();

      const bidderRequest01 = new BidderRequestBuilder().build();

      const requests = spec.buildRequests([bid01], bidderRequest01);

      expect(requests.data.slots.length).to.equal(1);
      expect(requests.data.cwid).to.be.null;
      expect(requests.data.cwid).to.be.null;
      expect(requests.data.slots[0].sizes[0]).to.equal('1x1');
      expect(requests.data.cwcreative).to.equal('54321');
      expect(requests.data.cwapikey).to.equal('xxx-xxx-yyy-zzz-uuid');
      expect(requests.data.refgroups[0]).to.equal('group_1');
    });

    it('creates a valid request - read debug params from second bid', function () {
      const bid01 = new BidRequestBuilder().withParams().build();

      const bid02 = new BidRequestBuilder({
        mediaTypes: {
          banner: {
            sizes: [[1, 1]],
          }
        }
      }).withParams({
        cwcreative: '1234',
        cwapikey: 'api_key_5',
        refgroups: 'group_5',
      }).build();

      const bidderRequest01 = new BidderRequestBuilder().build();

      const requests = spec.buildRequests([bid01, bid02], bidderRequest01);

      expect(requests.data.slots.length).to.equal(2);
      expect(requests.data.cwid).to.be.null;
      expect(requests.data.cwid).to.be.null;
      expect(requests.data.cwcreative).to.equal('1234');
      expect(requests.data.cwapikey).to.equal('api_key_5');
      expect(requests.data.refgroups[0]).to.equal('group_5');
    });

    it('creates a valid request - read debug params from first bid, ignore second', function () {
      const bid01 = new BidRequestBuilder()
        .withParams({
          cwcreative: '33',
          cwapikey: 'api_key_33',
          refgroups: 'group_33',
        }).build();

      const bid02 = new BidRequestBuilder()
        .withParams({
          cwcreative: '1234',
          cwapikey: 'api_key_5',
          refgroups: 'group_5',
        }).build();

      const bidderRequest01 = new BidderRequestBuilder().build();

      const requests = spec.buildRequests([bid01, bid02], bidderRequest01);

      expect(requests.data.slots.length).to.equal(2);
      expect(requests.data.cwid).to.be.null;
      expect(requests.data.cwid).to.be.null;
      expect(requests.data.cwcreative).to.equal('33');
      expect(requests.data.cwapikey).to.equal('api_key_33');
      expect(requests.data.refgroups[0]).to.equal('group_33');
    });

    it('creates a valid request - read debug params from 3 different slots', function () {
      const bid01 = new BidRequestBuilder()
        .withParams({
          cwcreative: '33',
        }).build();

      const bid02 = new BidRequestBuilder()
        .withParams({
          cwapikey: 'api_key_5',
        }).build();

      const bid03 = new BidRequestBuilder()
        .withParams({
          refgroups: 'group_5',
        }).build();
      const bidderRequest01 = new BidderRequestBuilder().build();

      const requests = spec.buildRequests([bid01, bid02, bid03], bidderRequest01);

      expect(requests.data.slots.length).to.equal(3);
      expect(requests.data.cwid).to.be.null;
      expect(requests.data.cwid).to.be.null;
      expect(requests.data.cwcreative).to.equal('33');
      expect(requests.data.cwapikey).to.equal('api_key_5');
      expect(requests.data.refgroups[0]).to.equal('group_5');
    });

    it('creates a valid request - config is overriden by URL params', function () {
      // for whatever reason stub for getWindowLocation does not work
      // so this was the closest way to test for get params
      const params = sandbox.stub(utils, 'getParameterByName');
      params.withArgs('cwgroups').returns('group_2');
      params.withArgs('cwcreative').returns('654321');

      const bid01 = new BidRequestBuilder({
        mediaTypes: {
          banner: {
            sizes: [[1, 1]],
          }
        }
      }).withParams({
        cwcreative: '54321',
        cwapikey: 'xxx-xxx-yyy-zzz',
        refgroups: 'group_1',
      }).build();

      const bidderRequest01 = new BidderRequestBuilder().build();

      const requests = spec.buildRequests([bid01], bidderRequest01);

      expect(requests.data.slots.length).to.equal(1);
      expect(requests.data.cwid).to.be.null;
      expect(requests.data.cwid).to.be.null;
      expect(requests.data.slots[0].sizes[0]).to.equal('1x1');
      expect(requests.data.cwcreative).to.equal('654321');
      expect(requests.data.cwapikey).to.equal('xxx-xxx-yyy-zzz');
      expect(requests.data.refgroups[0]).to.equal('group_2');
    });

    it('creates a valid request - if params are not set, null or empty array are sent to the API', function () {
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
      expect(requests.data.cwid).to.be.null;
      expect(requests.data.slots[0].sizes[0]).to.equal('1x1');
      expect(requests.data.cwcreative).to.equal(null);
      expect(requests.data.cwapikey).to.equal(null);
      expect(requests.data.refgroups.length).to.equal(0);
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
