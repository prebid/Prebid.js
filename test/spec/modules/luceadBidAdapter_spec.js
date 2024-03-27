/* eslint-disable prebid/validate-imports,no-undef */
import { expect } from 'chai';
import { spec } from 'modules/luceadBidAdapter.js';
import sinon from 'sinon';
import { newBidder } from 'src/adapters/bidderFactory.js';
import {deepClone} from 'src/utils.js';
import * as ajax from 'src/ajax.js';

describe('Lucead Adapter', () => {
  describe('inherited functions', function () {
    it('exists and is a function', function () {
      // noinspection JSCheckFunctionSignatures
      const adapter = newBidder(spec);
      expect(adapter.callBids).to.exist.and.to.be.a('function');
    });
  });

  describe('utils functions', function () {
    it('returns false', function () {
      expect(spec.isDevEnv()).to.be.false;
    });
  });

  describe('isBidRequestValid', function () {
    let bid;
    beforeEach(function () {
      bid = {
        bidder: 'lucead',
        params: {
          placementId: '1',
        },
      };
    });

    it('should return true when required params found', function () {
      expect(spec.isBidRequestValid(bid)).to.equal(true);
    });
  });

  describe('onBidWon', function () {
    let sandbox;
    const bid = { foo: 'bar', creativeId: 'ssp:improve' };

    beforeEach(function () {
      sandbox = sinon.sandbox.create();
    });

    it('should trigger impression pixel', function () {
      sandbox.spy(ajax, 'fetch');
      spec.onBidWon(bid);
      expect(ajax.fetch.args[0][0]).to.match(/report\/impression$/);
    });

    afterEach(function () {
      sandbox.restore();
    });
  });

  describe('buildRequests', function () {
    const bidRequests = [
      {
        bidder: 'lucead',
        adUnitCode: 'lucead_code',
        bidId: 'abc1234',
        sizes: [[1800, 1000], [640, 300]],
        requestId: 'xyz654',
        params: {
          placementId: '123',
        }
      }
    ];

    const bidderRequest = {
      bidderRequestId: '13aaa3df18bfe4',
      bids: {}
    };

    it('should have a post method', function () {
      const request = spec.buildRequests(bidRequests, bidderRequest);
      expect(request[0].method).to.equal('POST');
    });

    it('should contains a request id equals to the bid id', function () {
      const request = spec.buildRequests(bidRequests, bidderRequest);
      expect(JSON.parse(request[0].data).bid_id).to.equal(bidRequests[0].bidId);
    });

    it('should have an url that contains sub keyword', function () {
      const request = spec.buildRequests(bidRequests, bidderRequest);
      expect(request[0].url).to.match(/sub/);
    });
  });

  describe('interpretResponse', function () {
    const serverResponse = {
      body: {
        'bid_id': '2daf899fbe4c52',
        'request_id': '13aaa3df18bfe4',
        'ad': 'Ad',
        'ad_id': '3890677904',
        'cpm': 3.02,
        'currency': 'USD',
        'time': 1707257712095,
        'size': {'width': 300, 'height': 250},
      }
    };

    const bidRequest = {data: JSON.stringify({
      'request_id': '13aaa3df18bfe4',
      'domain': '7cdb-2a02-8429-e4a0-1701-bc69-d51c-86e-b279.ngrok-free.app',
      'bid_id': '2daf899fbe4c52',
      'sizes': [[300, 250]],
      'media_types': {'banner': {'sizes': [[300, 250]]}},
      'fledge_enabled': true,
      'enable_contextual': true,
      'enable_pa': true,
      'params': {'placementId': '1'},
    })};

    it('should get correct bid response', function () {
      const result = spec.interpretResponse(serverResponse, bidRequest);

      expect(Object.keys(result.bids[0])).to.have.members([
        'requestId',
        'cpm',
        'width',
        'height',
        'currency',
        'ttl',
        'creativeId',
        'netRevenue',
        'ad',
        'meta',
      ]);
    });

    it('should return bid empty response', function () {
      const serverResponse = {body: {cpm: 0}};
      const bidRequest = {data: '{}'};
      const result = spec.interpretResponse(serverResponse, bidRequest);
      expect(result.bids[0].ad).to.be.equal('');
      expect(result.bids[0].cpm).to.be.equal(0);
    });

    it('should add advertiserDomains', function () {
      const bidRequest = {data: JSON.stringify({
        bidder: 'lucead',
        params: {
          placementId: '1',
        }
      })};

      const result = spec.interpretResponse(serverResponse, bidRequest);
      expect(Object.keys(result.bids[0].meta)).to.include.members(['advertiserDomains']);
    });

    it('should support disabled contextual bids', function () {
      const serverResponseWithDisabledContectual = deepClone(serverResponse);
      serverResponseWithDisabledContectual.body.enable_contextual = false;
      const result = spec.interpretResponse(serverResponseWithDisabledContectual, bidRequest);
      expect(result.bids).to.be.null;
    });

    it('should support disabled Protected Audience', function () {
      const serverResponseWithEnablePaFalse = deepClone(serverResponse);
      serverResponseWithEnablePaFalse.body.enable_pa = false;
      const result = spec.interpretResponse(serverResponseWithEnablePaFalse, bidRequest);
      expect(result.fledgeAuctionConfigs).to.be.undefined;
    });
  });
});
