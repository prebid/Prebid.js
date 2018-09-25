import { expect } from 'chai';
import { spec } from 'modules/fyberBidAdapter';
import { newBidder } from 'src/adapters/bidderFactory';
import bidRequest from '../../fixtures/video/bidRequest.json';

const bidId = '21b2499bf34cf8';
const mock = {
  bid: {
    bidder: 'fyber',
    params: {
      appId: 'MyCompany_MyApp',
      spotType: 'rectangle',
      gdprPrivacyConsent: true,
      qa: {
        //    url: 'http://ia-test08.inner-active.mobi:8080/simpleM2M/requestJsonAd',
        cpm: 10
      },
      customParams: {
        //                        referrer: 'referrer',
        //                        page: 'aaaa',
        portal: 7002
        //                        KEYWORDS: 'bbb'
      }
    }
  },
  bidsRequest: [
    {
      adUnitCode: '/19968336/header-bid-tag-1',
      auctionId: 'f270d8dd-29c6-4aca-8648-7d722590b899',
      bidId,
      bidder: 'fyber',
      bidderRequestId: '1bcd667e09f48e',
      params: {
        spotType: 'rectangle',
        gdprPrivacyConsent: true,
        qa: {cpm: 10},
        customParams: {portal: 7002},
        appId: 'MyCompany_MyApp'
      },
      sizes: [[300, 250], [300, 600]],
      transactionId: 'a0253346-df4e-4f1a-b004-1f50e8e6af69'
    }
  ],
  validResponse: {
    body: {
      ad: {
        html: '<h1>Fyber Ad</h1>'
      },
      config: {
        tracking: {
          clicks: ['c1'],
          impressions: ['i1']
        }
      }
    },
    headers: {
      get(headerName) {
        if (headerName === 'X-IA-Pricing-Value') {
          return 10;
        }
        return headerName;
      }
    }
  },
  invalidResponse: {
    body: {},
    headers: {
      get(headerName) {
        return headerName;
      }
    }
  }
};

describe('FyberAdapter', function () {
  const adapter = newBidder(spec);

  describe('inherited functions', function () {
    it('callBids exists and is a function', function () {
      expect(adapter.callBids).to.exist.and.to.be.a('function');
    });
  });

  describe('Verifies bidder code', function () {
    it('Verifies bidder code', function () {
      expect(spec.code).to.equal('fyber');
    });
  });

  describe('isBidRequestValid', function () {
    it('should return true when required params found', function () {
      const bid = Object.assign({}, mock.bid);
      expect(spec.isBidRequestValid(bid)).to.equal(true);
    });

    it('should return false when required params{spotType} not found', function () {
      const bid = Object.assign({}, mock.bid);
      delete bid.params.spotType;
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });

    it('should return false when required{appId} params not found', function () {
      const bid = Object.assign({}, mock.bid);
      delete bid.params.appId;
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });
  });

  describe('buildRequests', function () {
    const bidsRequest = Object.assign([], mock.bidsRequest);
    const requests = spec.buildRequests(bidsRequest);

    it('Verify only one build request', function () {
      expect(requests.length).to.equal(1);
    });

    const request = requests[0];

    it('Verify build request http method', function () {
      expect(request.method).to.equal('GET');
    });

    it('Verify build request bidId', function () {
      expect(request.bidId).to.equal(bidId);
    });
  });

  describe('interpretResponse', function () {
    const request = Object.assign([], mock.bidsRequest)[0];
    const validResponse = Object.assign({}, mock.validResponse);
    const validResult = spec.interpretResponse(validResponse, request);

    it('Verify only one bid response', function () {
      expect(validResult.length).to.equal(1);
    });

    const bidResponse = validResult[0];

    it('Verify CPM', function () {
      expect(bidResponse.cpm).to.equal(10000);
    });

    it('Verify requestId', function () {
      expect(bidResponse.requestId).to.equal(bidId);
    });

    const invalidResponse = Object.assign({}, mock.invalidResponse);
    const invalidResult = spec.interpretResponse(invalidResponse, request);

    it('Verify empty bid response', function () {
      expect(invalidResult.length).to.equal(0);
    });
  });
});
