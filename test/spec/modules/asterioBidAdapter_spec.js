import { expect } from 'chai';
import sinon from 'sinon';
import * as ajaxModule from 'src/ajax.js';
import { ENDPOINT, spec } from 'modules/asterioBidAdapter.js';
import { newBidder } from 'src/adapters/bidderFactory.js';

const REQUEST = {
  bidId: '456',
  bidder: 'asterio',
  sizes: [[300, 250], [300, 600]],
  params: {
    adUnitToken: 'bbd6b4a6-66b8-479d-9527-e17899544693',
    pos: 1
  },
  ortb2: {
    source: {
      ext: {
        schain: {
          ver: '1.0',
          complete: 1,
          nodes: [{
            asi: 'asteriosoft.com',
            sid: 'publisher-1',
            hp: 1
          }]
        }
      }
    }
  }
};

const BIDDER_BANNER_RESPONSE = {
  bids: [{
    ad: '<div>test</div>',
    requestId: 'request-1',
    cpm: 1.23,
    currency: 'USD',
    width: 300,
    height: 250,
    ttl: 300,
    creativeId: 'creative-1',
    netRevenue: true,
    winUrl: 'http://tracker.test/win?price=${AUCTION_PRICE}',
    format: 'banner',
    mediaType: 'banner',
    adomain: ['example.com']
  }]
};

const BIDDER_VIDEO_RESPONSE = {
  bids: [{
    ad: '<VAST version="3.0"></VAST>',
    requestId: 'request-2',
    cpm: 2.34,
    currency: 'USD',
    width: 640,
    height: 360,
    ttl: 300,
    creativeId: 'creative-2',
    netRevenue: true,
    winUrl: 'http://tracker.test/win?price=${AUCTION_PRICE}',
    format: 'video',
    mediaType: 'video',
    adomain: ['video.example.com']
  }]
};

describe('asterioBidAdapter', function () {
  const adapter = newBidder(spec);

  describe('inherited functions', function () {
    it('exists and is a function', function () {
      expect(adapter.callBids).to.exist.and.to.be.a('function');
    });
  });

  describe('isBidRequestValid', function () {
    it('should return true when adUnitToken is present', function () {
      expect(spec.isBidRequestValid(REQUEST)).to.equal(true);
    });

    it('should return false when params are missing', function () {
      const bid = { ...REQUEST, params: { pos: 1 } };
      expect(spec.isBidRequestValid(bid)).to.equal(false);
      expect(spec.isBidRequestValid({ ...REQUEST, params: null })).to.equal(false);
    });
  });

  describe('buildRequests', function () {
    it('should create a POST request to the direct prebid endpoint', function () {
      const bidderRequest = spec.buildRequests([REQUEST], {
        bidderRequestId: '123',
        gdprConsent: {
          gdprApplies: true,
          consentString: 'BOJ8RZsOJ8RZsABAB8AAAAAZ+A=='
        },
        refererInfo: {
          page: 'http://test.com/path.html'
        }
      });

      expect(bidderRequest.method).to.equal('POST');
      expect(bidderRequest.url).to.equal(ENDPOINT);
      expect(bidderRequest.options.customHeaders).to.deep.equal({ 'Rtb-Direct': 'true' });
      expect(bidderRequest.options.contentType).to.equal('text/plain');
      expect(bidderRequest.data.requestId).to.equal('123');
      expect(bidderRequest.data.referer).to.equal('http://test.com/path.html');
      expect(bidderRequest.data.schain).to.deep.equal(REQUEST.ortb2.source.ext.schain);
      expect(bidderRequest.data.bids).to.deep.equal([{
        bidId: '456',
        adUnitToken: 'bbd6b4a6-66b8-479d-9527-e17899544693',
        pos: 1,
        sizes: [{ width: 300, height: 250 }, { width: 300, height: 600 }]
      }]);
      expect(bidderRequest.data.gdprConsent).to.deep.equal({
        consentRequired: true,
        consentString: 'BOJ8RZsOJ8RZsABAB8AAAAAZ+A=='
      });
    });

    it('should use banner mediaTypes pos when params pos is absent', function () {
      const bidderRequest = spec.buildRequests([{
        ...REQUEST,
        params: {
          adUnitToken: REQUEST.params.adUnitToken
        },
        mediaTypes: {
          banner: {
            pos: 0
          }
        }
      }], {
        bidderRequestId: '123'
      });

      expect(bidderRequest.data.bids[0].pos).to.equal(0);
    });

    it('should use video mediaTypes pos when params pos and banner pos are absent', function () {
      const bidderRequest = spec.buildRequests([{
        ...REQUEST,
        params: {
          adUnitToken: REQUEST.params.adUnitToken
        },
        mediaTypes: {
          video: {
            pos: 3
          }
        }
      }], {
        bidderRequestId: '123'
      });

      expect(bidderRequest.data.bids[0].pos).to.equal(3);
    });

    it('should use params pos as an override', function () {
      const bidderRequest = spec.buildRequests([{
        ...REQUEST,
        params: {
          ...REQUEST.params,
          pos: 2
        },
        mediaTypes: {
          banner: {
            pos: 1
          },
          video: {
            pos: 3
          }
        }
      }], {
        bidderRequestId: '123'
      });

      expect(bidderRequest.data.bids[0].pos).to.equal(2);
    });

    it('should support flat size tuples', function () {
      const bidderRequest = spec.buildRequests([{
        ...REQUEST,
        sizes: [640, 360]
      }], {
        bidderRequestId: '123'
      });

      expect(bidderRequest.data.bids[0].sizes).to.deep.equal([{ width: 640, height: 360 }]);
    });
  });

  describe('interpretResponse', function () {
    it('should map banner bids from direct response', function () {
      const result = spec.interpretResponse({ body: BIDDER_BANNER_RESPONSE }, {});

      expect(result).to.have.lengthOf(1);
      expect(result[0]).to.include({
        ad: '<div>test</div>',
        requestId: 'request-1',
        cpm: 1.23,
        currency: 'USD',
        width: 300,
        height: 250,
        ttl: 300,
        creativeId: 'creative-1',
        netRevenue: true,
        winUrl: 'http://tracker.test/win?price=${AUCTION_PRICE}',
        format: 'banner',
        mediaType: 'banner'
      });
      expect(result[0].meta.advertiserDomains).to.deep.equal(['example.com']);
    });

    it('should map video bids and expose vastXml', function () {
      const result = spec.interpretResponse({ body: BIDDER_VIDEO_RESPONSE }, {});

      expect(result).to.have.lengthOf(1);
      expect(result[0].mediaType).to.equal('video');
      expect(result[0].vastXml).to.equal('<VAST version="3.0"></VAST>');
      expect(result[0].meta.advertiserDomains).to.deep.equal(['video.example.com']);
    });

    it('should return empty array for invalid response body', function () {
      expect(spec.interpretResponse({ body: undefined }, {})).to.deep.equal([]);
      expect(spec.interpretResponse({ body: '' }, {})).to.deep.equal([]);
      expect(spec.interpretResponse({ body: {} }, {})).to.deep.equal([]);
    });
  });

  describe('onBidWon', function () {
    let ajaxStub;

    beforeEach(function () {
      ajaxStub = sinon.stub(ajaxModule, 'ajax');
    });

    afterEach(function () {
      ajaxStub.restore();
    });

    it('should fire win tracking request', function () {
      const bidWonResult = spec.onBidWon(BIDDER_BANNER_RESPONSE.bids[0]);

      expect(bidWonResult).to.equal(true);
      expect(ajaxStub.calledOnce).to.equal(true);
      expect(ajaxStub.firstCall.args[0]).to.equal('http://tracker.test/win?price=1.23');
      expect(ajaxStub.firstCall.args[1]).to.equal(null);
      expect(ajaxStub.firstCall.args[3]).to.deep.equal({ keepalive: true });
    });

    it('should return false when there is no winUrl', function () {
      expect(spec.onBidWon({ cpm: 1.23 })).to.equal(false);
      expect(ajaxStub.called).to.equal(false);
    });
  });
});
