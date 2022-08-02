import { expect } from 'chai';
import { spec } from 'modules/beopBidAdapter.js';
import { newBidder } from 'src/adapters/bidderFactory.js';
import { config } from 'src/config.js';
const utils = require('src/utils');

const ENDPOINT = 'https://hb.beop.io/bid';

let validBid = {
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
      let bid = Object.assign({}, validBid);
      delete bid.params;
      bid.params = {
        'networkId': '5a8af500c9e77c00017e4aaa'
      };
      expect(spec.isBidRequestValid(bid)).to.equal(true);
    });

    it('should return false if neither account or network id param found', function () {
      let bid = Object.assign({}, validBid);
      delete bid.params;
      bid.params = {
        'someId': '5a8af500c9e77c00017e4aaa'
      };
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });

    it('should return false if account Id param is not an ObjectId', function () {
      let bid = Object.assign({}, validBid);
      delete bid.params;
      bid.params = {
        'someId': '12345'
      };
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });

    it('should return false if there is no banner media type', function () {
      let bid = Object.assign({}, validBid);
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
    let bidRequests = [];
    bidRequests.push(validBid);

    it('should build the request', function () {
      config.setConfig({'currency': {'adServerCurrency': 'USD'}});
      const request = spec.buildRequests(bidRequests, {});
      const payload = JSON.parse(request.data);
      const url = request.url;
      expect(url).to.equal(ENDPOINT);
      expect(payload.pid).to.exist;
      expect(payload.pid).to.equal('5a8af500c9e77c00017e4cad');
      expect(payload.slts[0].name).to.exist;
      expect(payload.slts[0].name).to.equal('bellow-article');
      expect(payload.slts[0].flr).to.equal(10);
    });

    it('should call the endpoint with GDPR consent and pageURL info if found', function () {
      let consentString = 'BOJ8RZsOJ8RZsABAB8AAAAAZ+A==';
      let bidderRequest =
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
      expect(payload.tc_string).to.exist;
      expect(payload.tc_string).to.equal('BOJ8RZsOJ8RZsABAB8AAAAAZ+A==');
      expect(payload.url).to.exist;
      // check that the protocol is added correctly
      expect(payload.url).to.equal('http://test.te');
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
    let serverResponse = {
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
      expect(triggerPixelStub.getCall(0)).to.be.null;
      spec.onTimeout({params: {accountId: '5a8af500c9e77c00017e4cad'}, timeout: 2000});
      expect(triggerPixelStub.getCall(0)).to.not.be.null;
      expect(triggerPixelStub.getCall(0).args[0]).to.exist.and.to.include('https://t.beop.io');
      expect(triggerPixelStub.getCall(0).args[0]).to.include('se_ca=bid');
      expect(triggerPixelStub.getCall(0).args[0]).to.include('se_ac=timeout');
      expect(triggerPixelStub.getCall(0).args[0]).to.include('pid=5a8af500c9e77c00017e4cad');
    });

    it('should call triggerPixel utils function on bid won', function () {
      spec.onBidWon({});
      spec.onBidWon();
      expect(triggerPixelStub.getCall(0)).to.be.null;
      spec.onBidWon({params: {accountId: '5a8af500c9e77c00017e4cad'}, cpm: 1.2});
      expect(triggerPixelStub.getCall(0)).to.not.be.null;
      expect(triggerPixelStub.getCall(0).args[0]).to.exist.and.to.include('https://t.beop.io');
      expect(triggerPixelStub.getCall(0).args[0]).to.include('se_ca=bid');
      expect(triggerPixelStub.getCall(0).args[0]).to.include('se_ac=won');
      expect(triggerPixelStub.getCall(0).args[0]).to.exist.and.to.include('pid=5a8af500c9e77c00017e4cad');
    });
  });
});
