import { expect } from 'chai';
import { spec } from 'modules/beopBidAdapter.js';
import { newBidder } from 'src/adapters/bidderFactory.js';
import { config } from 'src/config.js';
import { setConfig as setCurrencyConfig } from '../../../modules/currency.js';
import { addFPDToBidderRequest } from '../../helpers/fpd.js';
const utils = require('src/utils');

const ENDPOINT = 'https://hb.collectiveaudience.co/bid';

const validBid = {
  'bidder': 'beop',
  'params': {
    'accountId': '5a8af500c9e77c00017e4cad'
  },
  'adUnitCode': 'bellow-article',
  'mediaTypes': {
    'banner': {
      'sizes': [[1, 1]]
    }
  },
  'getFloor': () => {
    return {
      currency: 'USD',
      floor: 10,
    }
  },
  'bidId': '30b31c1838de1e',
  'bidderRequestId': '22edbae2733bf6',
  'auctionId': '1d1a030790a475',
  'transactionId': '04f2659e-c005-4eb1-a57c-fa93145e3843',
  'creativeId': 'er2ee'
};

describe('BeOp Bid Adapter tests', () => {
  afterEach(function () {
    config.setConfig({});
  });

  const adapter = newBidder(spec);

  describe('inherited functions', () => {
    it('exists and is a function', () => {
      expect(adapter.callBids).to.exist.and.to.be.a('function');
    });
  });

  describe('isBidRequestValid', function() {
    it('should return true when accountId params found', function () {
      expect(spec.isBidRequestValid(validBid)).to.equal(true);
    });

    it('should return true if no accountId but networkId', function () {
      const bid = Object.assign({}, validBid);
      delete bid.params;
      bid.params = {
        'networkId': '5a8af500c9e77c00017e4aaa'
      };
      expect(spec.isBidRequestValid(bid)).to.equal(true);
    });

    it('should return false if neither account or network id param found', function () {
      const bid = Object.assign({}, validBid);
      delete bid.params;
      bid.params = {
        'someId': '5a8af500c9e77c00017e4aaa'
      };
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });

    it('should return false if account Id param is not an ObjectId', function () {
      const bid = Object.assign({}, validBid);
      delete bid.params;
      bid.params = {
        'someId': '12345'
      };
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });

    it('should return false if there is no banner media type', function () {
      const bid = Object.assign({}, validBid);
      delete bid.mediaTypes;
      bid.mediaTypes = {
        'native': {
          'sizes': [[1, 1]]
        }
      };
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });
  });

  describe('buildRequests', function () {
    const bidRequests = [];
    bidRequests.push(validBid);

    it('should build the request', function () {
      const bidderRequest = {
        refererInfo: {
          page: 'https://example.com'
        }
      };
      setCurrencyConfig({ adServerCurrency: 'USD' })

      return addFPDToBidderRequest(bidderRequest).then(res => {
        const request = spec.buildRequests(bidRequests, res);
        const payload = JSON.parse(request.data);
        const url = request.url;
        expect(url).to.equal(ENDPOINT);
        expect(payload.pid).to.exist;
        expect(payload.pid).to.equal('5a8af500c9e77c00017e4cad');
        expect(payload.gdpr_applies).to.exist;
        expect(payload.gdpr_applies).to.equals(false);
        expect(payload.slts[0].name).to.exist;
        expect(payload.slts[0].name).to.equal('bellow-article');
        expect(payload.slts[0].flr).to.equal(10);
        setCurrencyConfig({});
      });
    });

    it('should call the endpoint with GDPR consent and pageURL info if found', function () {
      const consentString = 'BOJ8RZsOJ8RZsABAB8AAAAAZ+A==';
      const bidderRequest =
      {
        'gdprConsent':
        {
          'gdprApplies': true,
          'consentString': consentString
        },
        'refererInfo':
        {
          'canonicalUrl': 'test.te'
        }
      };

      const request = spec.buildRequests(bidRequests, bidderRequest);
      const payload = JSON.parse(request.data);
      expect(payload.gdpr_applies).to.exist;
      expect(payload.gdpr_applies).to.equals(true);
      expect(payload.tc_string).to.exist;
      expect(payload.tc_string).to.equal('BOJ8RZsOJ8RZsABAB8AAAAAZ+A==');
      expect(payload.url).to.exist;
      // check that the protocol is added correctly
      expect(payload.url).to.equal('http://test.te');
    });

    it('should call the endpoint with bpsegs (stringified) data if any or [] if none', function () {
      const bidderRequest =
      {
        'ortb2': {
          'user': {
            'ext': {
              'bpsegs': ['axed', 'axec', 1234],
              'data': {
                'permutive': [1234, 5678, 910]
              }
            }
          }
        }
      };

      const request = spec.buildRequests(bidRequests, bidderRequest);
      const payload = JSON.parse(request.data);
      expect(payload.bpsegs).to.exist;
      expect(payload.bpsegs).to.include('axed');
      expect(payload.bpsegs).to.include('axec');
      expect(payload.bpsegs).to.include('1234');
      expect(payload.bpsegs).to.include('1234');
      expect(payload.bpsegs).to.include('5678');
      expect(payload.bpsegs).to.include('910');
      expect(payload.bpsegs).to.not.include('1');

      const bidderRequest2 =
      {
        'ortb2': {}
      };

      const request2 = spec.buildRequests(bidRequests, bidderRequest2);
      const payload2 = JSON.parse(request2.data);
      expect(payload2.bpsegs).to.exist;
      expect(payload2.bpsegs).to.be.empty;
    });

    it('should not prepend the protocol in page url if already present', function () {
      const bidderRequest = {
        'refererInfo': {
          'canonicalUrl': 'https://test.te'
        }
      };
      const request = spec.buildRequests(bidRequests, bidderRequest);
      const payload = JSON.parse(request.data);
      expect(payload.url).to.exist;
      expect(payload.url).to.equal('https://test.te');
    });
  });

  describe('interpretResponse', function() {
    const serverResponse = {
      'body': {
        'bids': [
          {
            'requestId': 'aaaa',
            'cpm': 1.0,
            'currency': 'EUR',
            'creativeId': '60f691be1515670a2a09aea2',
            'netRevenue': true,
            'width': 1,
            'height': 1,
            'ad': '<div class="BeOpWidget" data-content-id="60f691be1515670a2a09aea2" data-campaign-id="60f691bf1515670a2a09aea6" data-display-account-id="60f691be1515670a2a09aea1"></div>',
            'meta': {
              'advertiserId': '60f691be1515670a2a09aea1'
            }
          }
        ]
      }
    }
    it('should interpret the response by pushing it in the bids elem', function () {
      const response = spec.interpretResponse(serverResponse, validBid);

      expect(response[0].ad).to.exist;
      expect(response[0].requestId).to.exist;
      expect(response[0].requestId).to.equal('aaaa');
    });
  });

  describe('timeout and bid won pixel trigger', function () {
    let triggerPixelStub;

    beforeEach(function () {
      triggerPixelStub = sinon.stub(utils, 'triggerPixel');
    });

    afterEach(function () {
      utils.triggerPixel.restore();
    });

    it('should call triggerPixel utils function when timed out is filled', function () {
      spec.onTimeout({});
      spec.onTimeout();
      spec.onTimeout(null);
      spec.onTimeout([]);
      expect(triggerPixelStub.getCall(0)).to.be.null;
      spec.onTimeout([{
        bidder: 'beop',
        bidId: 'abc123',
        params: { accountId: '5a8af500c9e77c00017e4cad' },
        adUnitCode: 'div-1',
        timeout: 2000,
        auctionId: 'some-auction-id'
      }]);
      expect(triggerPixelStub.getCall(0)).to.not.be.null;
      expect(triggerPixelStub.getCall(0).args[0]).to.exist.and.to.include('https://t.collectiveaudience.co');
      expect(triggerPixelStub.getCall(0).args[0]).to.include('se_ca=bid');
      expect(triggerPixelStub.getCall(0).args[0]).to.include('se_ac=timeout');
      expect(triggerPixelStub.getCall(0).args[0]).to.include('pid=5a8af500c9e77c00017e4cad');
    });

    it('should call triggerPixel for each entry in the timeout array', function () {
      const timeoutData = [
        {
          bidder: 'beop',
          bidId: 'abc123',
          params: { accountId: '5a8af500c9e77c00017e4cad' },
          adUnitCode: 'div-1',
          timeout: 3000,
          auctionId: 'auction-1'
        },
        {
          bidder: 'beop',
          bidId: 'def456',
          params: { accountId: '5a8af500c9e77c00017e4cad' },
          adUnitCode: 'div-2',
          timeout: 3000,
          auctionId: 'auction-2'
        }
      ];

      spec.onTimeout(timeoutData);

      expect(triggerPixelStub.callCount).to.equal(2);
      const firstCall = triggerPixelStub.getCall(0).args[0];
      const secondCall = triggerPixelStub.getCall(1).args[0];

      expect(firstCall).to.include('se_ac=timeout');
      expect(firstCall).to.include('bid=abc123');
      expect(secondCall).to.include('bid=def456');
    });
    it('should call triggerPixel utils function on bid won', function () {
      spec.onBidWon({});
      spec.onBidWon();
      expect(triggerPixelStub.getCall(0)).to.be.null;
      spec.onBidWon({params: {accountId: '5a8af500c9e77c00017e4cad'}, cpm: 1.2});
      expect(triggerPixelStub.getCall(0)).to.not.be.null;
      expect(triggerPixelStub.getCall(0).args[0]).to.exist.and.to.include('https://t.collectiveaudience.co');
      expect(triggerPixelStub.getCall(0).args[0]).to.include('se_ca=bid');
      expect(triggerPixelStub.getCall(0).args[0]).to.include('se_ac=won');
      expect(triggerPixelStub.getCall(0).args[0]).to.exist.and.to.include('pid=5a8af500c9e77c00017e4cad');
    });
    it('should call triggerPixel utils function on bid won and work even if params is an array', function () {
      spec.onBidWon({});
      spec.onBidWon();
      expect(triggerPixelStub.getCall(0)).to.be.null;
      spec.onBidWon({params: [{accountId: '5a8af500c9e77c00017e4cad'}], cpm: 1.2});
      expect(triggerPixelStub.getCall(0)).to.not.be.null;
      expect(triggerPixelStub.getCall(0).args[0]).to.exist.and.to.include('https://t.collectiveaudience.co');
      expect(triggerPixelStub.getCall(0).args[0]).to.include('se_ca=bid');
      expect(triggerPixelStub.getCall(0).args[0]).to.include('se_ac=won');
      expect(triggerPixelStub.getCall(0).args[0]).to.exist.and.to.include('pid=5a8af500c9e77c00017e4cad');
    });
  });

  describe('Ensure keywords is always array of string', function () {
    let bidRequests = [];
    afterEach(function () {
      bidRequests = [];
    });

    it('should work with keywords as an array', function () {
      const bid = Object.assign({}, validBid);
      bid.params.keywords = ['a', 'b'];
      bidRequests.push(bid);
      config.setConfig({
        currency: { adServerCurrency: 'USD' }
      });
      const request = spec.buildRequests(bidRequests, {});
      const payload = JSON.parse(request.data);
      const url = request.url;
      expect(payload.kwds).to.exist;
      expect(payload.kwds).to.include('a');
      expect(payload.kwds).to.include('b');
    });

    it('should work with keywords as a string', function () {
      const bid = Object.assign({}, validBid);
      bid.params.keywords = 'list of keywords';
      bidRequests.push(bid);
      config.setConfig({
        currency: { adServerCurrency: 'USD' }
      });
      const request = spec.buildRequests(bidRequests, {});
      const payload = JSON.parse(request.data);
      const url = request.url;
      expect(payload.kwds).to.exist;
      expect(payload.kwds).to.include('list of keywords');
    });

    it('should work with keywords as a string containing a comma', function () {
      const bid = Object.assign({}, validBid);
      bid.params.keywords = 'list, of, keywords';
      bidRequests.push(bid);
      config.setConfig({
        currency: { adServerCurrency: 'USD' }
      });
      const request = spec.buildRequests(bidRequests, {});
      const payload = JSON.parse(request.data);
      const url = request.url;
      expect(payload.kwds).to.exist;
      expect(payload.kwds).to.include('list');
      expect(payload.kwds).to.include('of');
      expect(payload.kwds).to.include('keywords');
    })
  })

  describe('Ensure eids are get', function() {
    let bidRequests = [];
    afterEach(function () {
      bidRequests = [];
    });

    it(`should get eids from bid`, function () {
      const bid = Object.assign({}, validBid);
      bid.userIdAsEids = [{source: 'provider.com', uids: [{id: 'someid', atype: 1, ext: {whatever: true}}]}];
      bidRequests.push(bid);

      const request = spec.buildRequests(bidRequests, {});
      const payload = JSON.parse(request.data);
      expect(payload.eids).to.exist;
      expect(payload.eids[0].source).to.equal('provider.com');
    });
  })

  describe('Ensure first party cookie is well managed', function () {
    const bidRequests = [];

    it(`should generate a new uuid`, function () {
      const bid = Object.assign({}, validBid);
      bidRequests.push(bid);
      const request = spec.buildRequests(bidRequests, {});
      const payload = JSON.parse(request.data);
      expect(payload.fg).to.exist;
    })
  })
  describe('getUserSyncs', function () {
    it('should return iframe sync when iframeEnabled and syncFrame provided', function () {
      const syncOptions = { iframeEnabled: true, pixelEnabled: false };
      const serverResponses = [{ body: { sync_frames: ['https://example.com/sync_frame', 'https://example2.com/sync_second'] } }];

      const syncs = spec.getUserSyncs(syncOptions, serverResponses);

      expect(syncs).to.have.length(2);
      expect(syncs[0].type).to.equal('iframe');
      expect(syncs[0].url).to.equal('https://example.com/sync_frame');
    });

    it('should return pixel syncs when pixelEnabled and syncPixels provided', function () {
      const syncOptions = { iframeEnabled: false, pixelEnabled: true };
      const serverResponses = [{
        body: {
          sync_pixels: [
            'https://example.com/pixel1',
            'https://example.com/pixel2'
          ]
        }
      }];

      const syncs = spec.getUserSyncs(syncOptions, serverResponses);

      expect(syncs).to.have.length(2);
      expect(syncs[0].type).to.equal('image');
      expect(syncs[0].url).to.equal('https://example.com/pixel1');
      expect(syncs[1].url).to.equal('https://example.com/pixel2');
    });

    it('should return both iframe and pixel syncs when both options are enabled', function () {
      const syncOptions = { iframeEnabled: true, pixelEnabled: true };
      const serverResponses = [{
        body: {
          sync_frames: ['https://example.com/sync_frame'],
          sync_pixels: ['https://example.com/pixel1']
        }
      }];

      const syncs = spec.getUserSyncs(syncOptions, serverResponses);

      expect(syncs).to.have.length(2);
      expect(syncs[0].type).to.equal('iframe');
      expect(syncs[1].type).to.equal('image');
    });

    it('should return empty array when no serverResponses', function () {
      const syncOptions = { iframeEnabled: true, pixelEnabled: true };
      const syncs = spec.getUserSyncs(syncOptions, []);
      expect(syncs).to.be.an('array').that.is.empty;
    });

    it('should return empty array when no syncFrame or syncPixels provided', function () {
      const syncOptions = { iframeEnabled: true, pixelEnabled: true };
      const serverResponses = [{ body: {} }];
      const syncs = spec.getUserSyncs(syncOptions, serverResponses);
      expect(syncs).to.be.an('array').that.is.empty;
    });
  });
});
