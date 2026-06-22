import { expect } from 'chai';
import { spec, SSMAS_CODE, SSMAS_ENDPOINT, SSMAS_REQUEST_METHOD } from 'modules/ssmasBidAdapter.js';
import { newBidder } from 'src/adapters/bidderFactory.js';
import * as utils from 'src/utils.js';

describe('ssmasBidAdapter', function () {
  const bid = {
    bidder: SSMAS_CODE,
    adUnitCode: 'adunit-code',
    sizes: [[300, 250]],
    bidId: '30b31c1838de1e',
    bidderRequestId: '22edbae2733bf6',
    auctionId: '1d1a030790a475',
    params: {
      placementId: '1'
    }
  };

  const bidderRequest = {
    'bidderCode': SSMAS_CODE,
    'auctionId': 'd912faa2-174f-4636-b755-7396a0a964d8',
    'bidderRequestId': '109db5a5f5c6788',
    'bids': [
      bid
    ],
    'auctionStart': 1684799653734,
    'timeout': 20000,
    'metrics': {},
    'ortb2': {
      'site': {
        'domain': 'localhost:9999',
        'publisher': {
          'domain': 'localhost:9999'
        },
        'page': 'http://localhost:9999/integrationExamples/noadserver/basic_noadserver.html',
        'ref': 'http://localhost:9999/integrationExamples/noadserver/'
      },
      'device': {
        'w': 1536,
        'h': 711,
        'dnt': 0,
        'ua': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/113.0',
        'language': 'es'
      }
    },
    'start': 1684799653737
  };

  describe('Build Requests', () => {
    it('Check bid request', function () {
      const request = spec.buildRequests([bid], bidderRequest);
      expect(request[0].method).to.equal(SSMAS_REQUEST_METHOD);
      expect(request[0].url).to.equal(SSMAS_ENDPOINT);
    });
  });

  describe('register adapter functions', () => {
    const adapter = newBidder(spec);
    it('is registered', () => {
      expect(adapter.callBids).to.exist.and.to.be.a('function');
    });
  });

  describe('isBidRequestValid', function () {
    it('validate bid request building', function () {
      expect(spec.isBidRequestValid(bid)).to.be.true;
    });

    it('test bad bid request', function () {
      // empty bid
      expect(spec.isBidRequestValid({ bidId: '', params: {} })).to.be.false;

      // empty bidId
      bid.bidId = '';
      expect(spec.isBidRequestValid(bid)).to.be.false;

      // empty placementId
      bid.bidId = '1231';
      bid.params.placementId = '';
      expect(spec.isBidRequestValid(bid)).to.be.false;
    });

    it('check bid request bidder is Sem Seo & Mas', function() {
      const invalidBid = {
        ...bid, bidder: 'invalidBidder'
      };
      expect(spec.isBidRequestValid(invalidBid)).to.be.false;
    });
  });

  describe('interpretResponse', function () {

  });

  describe('test onBidWon function', function () {
    beforeEach(function() {
      sinon.stub(utils, 'triggerPixel');
    });
    afterEach(function() {
      utils.triggerPixel.restore();
    });
    it('exists and is a function', () => {
      expect(spec.onBidWon).to.exist.and.to.be.a('function');
    });
    it('should return nothing', function () {
      var response = spec.onBidWon({});
      expect(response).to.be.an('undefined');
      expect(utils.triggerPixel.called).to.equal(false);
    });
  });
});
