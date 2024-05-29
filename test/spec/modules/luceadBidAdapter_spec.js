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
          region: 'eu',
        },
      };
    });

    it('should return true when required params found', function () {
      expect(spec.isBidRequestValid(bid)).to.equal(true);
    });
  });

  describe('onBidWon', function () {
    let sandbox;
    const bids = [
      { foo: 'bar', creativeId: 'ssp:improve' },
      { foo: 'bar', creativeId: '123:456' },
    ];

    beforeEach(function () {
      sandbox = sinon.sandbox.create();
    });

    it('should trigger impression pixel', function () {
      sandbox.spy(ajax, 'fetch');

      for (const bid of bids) {
        spec.onBidWon(bid);
        expect(ajax?.fetch?.args[0][0]).to.match(/report\/impression$/);
      }
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
      expect(request.method).to.equal('POST');
    });

    it('should contains a request id equals to the bid id', function () {
      const request = spec.buildRequests(bidRequests, bidderRequest);
      expect(JSON.parse(request.data).bid_requests[0].bid_id).to.equal(bidRequests[0].bidId);
    });

    it('should have an url that contains sra keyword', function () {
      const request = spec.buildRequests(bidRequests, bidderRequest);
      expect(request.url).to.contain('/prebid/sra');
    });
  });

  describe('interpretResponse', function () {
    const serverResponseBody = {
      'request_id': '17548f887fb722',
      'bids': [
        {
          'bid_id': '2d663fdd390b49',
          'ad': '\u003chtml lang="en"\u003e\u003cbody style="margin:0;background-color:#FFF"\u003e\u003ciframe src="urn:uuid:fb81a0f9-b83a-4f27-8676-26760d090f1c" style="width:300px;height:250px;border:none" seamless \u003e\u003c/iframe\u003e\u003c/body\u003e\u003c/html\u003e',
          'size': {
            'width': 300,
            'height': 250
          },
          'ad_id': '1',
          'ig_id': '1',
          'cpm': 1,
          'currency': 'EUR',
          'time': 0,
          'ssp': '',
          'placement_id': '1',
          'is_pa': true
        }
      ]
    };

    const serverResponse = {body: serverResponseBody};

    const bidRequest = {
      data: JSON.stringify({
        'request_id': '17548f887fb722',
        'domain': 'lucead.com',
        'bid_requests': [{
          'bid_id': '2d663fdd390b49',
          'sizes': [[300, 250], [300, 150]],
          'media_types': {'banner': {'sizes': [[300, 250], [300, 150]]}},
          'placement_id': '1'
        }],
      }),
    };

    it('should get correct bid response', function () {
      const result = spec.interpretResponse(serverResponse, bidRequest);

      // noinspection JSCheckFunctionSignatures
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
      const serverResponse = {body: {bids: [{cpm: 0}]}};
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

    it('should support enable_pa = false', function () {
      serverResponse.body.enable_pa = false;
      const result = spec.interpretResponse(serverResponse, bidRequest);
      expect(result).to.be.an('array');
      expect(result[0].cpm).to.be.greaterThan(0);
    });
  });
});
