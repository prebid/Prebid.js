import { expect } from 'chai';

import { spec } from 'modules/adyoulikeBidAdapter.js';
import { newBidder } from 'src/adapters/bidderFactory.js';

describe('Adyoulike Adapter', function () {
  const canonicalUrl = 'https://canonical.url/?t=%26';
  const referrerUrl = 'http://referrer.url/?param=value';
  const defaultDC = 'hb-api';
  const consentString = 'BOJ8RZsOJ8RZsABAB8AAAAAZ+A==';
  const bidderRequest = {
    'auctionId': '1d1a030790a475',
    'bidderRequestId': '22edbae2733bf6',
    'timeout': 3000,
    'gdprConsent': {
      consentString: consentString,
      gdprApplies: true
    },
    refererInfo: {referer: referrerUrl}
  };
  const bidRequestWithEmptyPlacement = [
    {
      'bidId': 'bid_id_0',
      'bidder': 'adyoulike',
      'placementCode': 'adunit/hb-0',
      'params': {},
      'sizes': '300x250',
      'mediaTypes':
        { 'banner':
          {'sizes': ['300x250', '300x600']
          }
        }
    }
  ];
  const bidRequestWithEmptySizes = {
    'bids': [
      {
        'bidId': 'bid_id_0',
        'bidder': 'adyoulike',
        'placementCode': 'adunit/hb-0',
        'params': {
          'placement': 'placement_0'
        },
        'transactionId': 'bid_id_0_transaction_id'
      }
    ],
  };

  const bidRequestWithSinglePlacement = [
    {
      'bidId': 'bid_id_0',
      'bidder': 'adyoulike',
      'placementCode': 'adunit/hb-0',
      'params': {
        'placement': 'placement_0'
      },
      'sizes': '300x250',
      'mediaTypes':
        { 'banner':
          {'sizes': ['300x250']
          }
        },
      'transactionId': 'bid_id_0_transaction_id'
    }
  ];

  const bidRequestWithDCPlacement = [
    {
      'bidId': 'bid_id_0',
      'bidder': 'adyoulike',
      'placementCode': 'adunit/hb-0',
      'params': {
        'placement': 'placement_0',
        'DC': 'fra01'
      },
      'sizes': '300x250',
      'mediaTypes':
        { 'banner':
          {'sizes': ['300x250']
          }
        },
      'transactionId': 'bid_id_0_transaction_id'
    }
  ];

  const bidRequestMultiPlacements = [
    {
      'bidId': 'bid_id_0',
      'bidder': 'adyoulike',
      'placementCode': 'adunit/hb-0',
      'params': {
        'placement': 'placement_0'
      },
      'sizes': '300x250',
      'mediaTypes':
        { 'banner':
          {'sizes': ['300x250']
          }
        },
      'transactionId': 'bid_id_0_transaction_id'
    },
    {
      'bidId': 'bid_id_1',
      'bidder': 'adyoulike',
      'placementCode': 'adunit/hb-1',
      'params': {
        'placement': 'placement_1'
      },
      'sizes': [[300, 600]],
      'mediaTypes':
        { 'banner':
          {'sizes': ['300x600']
          }
        },
      'transactionId': 'bid_id_1_transaction_id'
    },
    {
      'bidId': 'bid_id_2',
      'bidder': 'adyoulike',
      'placementCode': 'adunit/hb-2',
      'params': {},
      'sizes': '300x400',
      'transactionId': 'bid_id_2_transaction_id'
    },
    {
      'bidId': 'bid_id_3',
      'bidder': 'adyoulike',
      'placementCode': 'adunit/hb-3',
      'params': {
        'placement': 'placement_3'
      },
      'transactionId': 'bid_id_3_transaction_id'
    }
  ];

  const requestDataOnePlacement = {
    'bid_id_0':
    { 'PlacementID': 'e622af275681965d3095808561a1e510',
      'TransactionID': '1bca18cc-c0fe-439b-88c2-8247d3448f22',
      'Width': 300,
      'Height': 600,
      'AvailableSizes': '300x600'
    }
  }

  const requestDataMultiPlacement = {
    'bid_id_0':
    { 'PlacementID': 'e622af275681965d3095808561a1e510',
      'TransactionID': '1bca18cc-c0fe-439b-88c2-8247d3448f22',
      'Width': 300,
      'Height': 600,
      'AvailableSizes': '300x600'
    },
    'bid_id_1':
    { 'PlacementID': 'e622af275681965d3095808561a1e510',
      'TransactionID': 'e63b2d86-ca60-4167-9cf1-497607079634',
      'Width': 400,
      'Height': 250,
      'AvailableSizes': '300x250'
    }
  }

  const responseWithEmptyPlacement = [
    {
      'Placement': 'placement_0'
    }
  ];
  const responseWithSinglePlacement = [
    {
      'BidID': 'bid_id_0',
      'Placement': 'placement_0',
      'Ad': 'placement_0',
      'Price': 0.5,
      'Height': 600,
    }
  ];
  const responseWithMultiplePlacements = [
    {
      'BidID': 'bid_id_0',
      'Placement': 'placement_0',
      'Ad': 'placement_0',
      'Price': 0.5,
      'Height': 0, // test with wrong value
      'Width': 300
    },
    {
      'BidID': 'bid_id_1',
      'Placement': 'placement_1',
      'Ad': 'placement_1',
      'Price': 0.6,
      'Height': 250
      // 'Width'  test with missing value
    }
  ];
  const adapter = newBidder(spec);

  let getEndpoint = (dc = defaultDC) => `https://${dc}.omnitagjs.com/hb-api/prebid`;

  describe('inherited functions', function () {
    it('exists and is a function', function () {
      expect(adapter.callBids).to.exist.and.to.be.a('function');
    });
  });

  describe('isBidRequestValid', function () {
    let bid = {
      'bidId': 'bid_id_1',
      'bidder': 'adyoulike',
      'placementCode': 'adunit/hb-1',
      'params': {
        'placement': 'placement_1'
      },
      'sizes': [[300, 600]],
      'transactionId': 'bid_id_1_transaction_id'
    };

    it('should return true when required params found', function () {
      expect(spec.isBidRequestValid(bid)).to.equal(true);
    });

    it('should return false when required params are not passed', function () {
      let bid = Object.assign({}, bid);
      delete bid.size;

      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });

    it('should return false when required params are not passed', function () {
      let bid = Object.assign({}, bid);
      delete bid.params;
      bid.params = {
        'placement': 0
      };
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });
  });

  describe('buildRequests', function () {
    let canonicalQuery;

    beforeEach(function () {
      let canonical = document.createElement('link');
      canonical.rel = 'canonical';
      canonical.href = canonicalUrl;
      canonicalQuery = sinon.stub(window.top.document.head, 'querySelector');
      canonicalQuery.withArgs('link[rel="canonical"][href]').returns(canonical);
    });

    afterEach(function () {
      canonicalQuery.restore();
    });

    it('should add gdpr/usp consent information to the request', function () {
      let consentString = 'BOJ8RZsOJ8RZsABAB8AAAAAZ+A==';
      let uspConsentData = '1YCC';
      let bidderRequest = {
        'auctionId': '1d1a030790a475',
        'bidderRequestId': '22edbae2733bf6',
        'timeout': 3000,
        'gdprConsent': {
          consentString: consentString,
          gdprApplies: true
        },
        'uspConsent': uspConsentData
      };

      bidderRequest.bids = bidRequestWithSinglePlacement;

      const request = spec.buildRequests(bidRequestWithSinglePlacement, bidderRequest);
      const payload = JSON.parse(request.data);

      expect(payload.gdprConsent).to.exist;
      expect(payload.gdprConsent.consentString).to.exist.and.to.equal(consentString);
      expect(payload.gdprConsent.consentRequired).to.exist.and.to.be.true;
      expect(payload.uspConsent).to.exist.and.to.equal(uspConsentData);
    });

    it('should not set a default value for gdpr consentRequired', function () {
      let consentString = 'BOJ8RZsOJ8RZsABAB8AAAAAZ+A==';
      let uspConsentData = '1YCC';
      let bidderRequest = {
        'auctionId': '1d1a030790a475',
        'bidderRequestId': '22edbae2733bf6',
        'timeout': 3000,
        'gdprConsent': {
          consentString: consentString
        },
        'uspConsent': uspConsentData
      };

      bidderRequest.bids = bidRequestWithSinglePlacement;

      const request = spec.buildRequests(bidRequestWithSinglePlacement, bidderRequest);
      const payload = JSON.parse(request.data);

      expect(payload.gdprConsent).to.exist;
      expect(payload.gdprConsent.consentString).to.exist.and.to.equal(consentString);
      expect(payload.gdprConsent.consentRequired).to.be.null;
    });

    it('sends bid request to endpoint with single placement', function () {
      const request = spec.buildRequests(bidRequestWithSinglePlacement, bidderRequest);
      const payload = JSON.parse(request.data);

      expect(request.url).to.contain(getEndpoint());
      expect(request.method).to.equal('POST');
      expect(request.url).to.contains('CanonicalUrl=' + encodeURIComponent(canonicalUrl));
      expect(request.url).to.contains('RefererUrl=' + encodeURIComponent(referrerUrl));

      expect(payload.Version).to.equal('1.0');
      expect(payload.Bids['bid_id_0'].PlacementID).to.be.equal('placement_0');
      expect(payload.PageRefreshed).to.equal(false);
      expect(payload.Bids['bid_id_0'].TransactionID).to.be.equal('bid_id_0_transaction_id');
    });

    it('sends bid request to endpoint with single placement without canonical', function () {
      canonicalQuery.restore();
      const request = spec.buildRequests(bidRequestWithSinglePlacement, bidderRequest);
      const payload = JSON.parse(request.data);

      expect(request.url).to.contain(getEndpoint());
      expect(request.method).to.equal('POST');

      expect(request.url).to.not.contains('CanonicalUrl=' + encodeURIComponent(canonicalUrl));
      expect(payload.Version).to.equal('1.0');
      expect(payload.Bids['bid_id_0'].PlacementID).to.be.equal('placement_0');
      expect(payload.PageRefreshed).to.equal(false);
      expect(payload.Bids['bid_id_0'].TransactionID).to.be.equal('bid_id_0_transaction_id');
    });

    it('sends bid request to endpoint with multiple placements', function () {
      const request = spec.buildRequests(bidRequestMultiPlacements, bidderRequest);
      const payload = JSON.parse(request.data);
      expect(request.url).to.contain(getEndpoint());
      expect(request.method).to.equal('POST');

      expect(request.url).to.contains('CanonicalUrl=' + encodeURIComponent(canonicalUrl));
      expect(request.url).to.contains('RefererUrl=' + encodeURIComponent(referrerUrl));

      expect(payload.Version).to.equal('1.0');

      expect(payload.Bids['bid_id_0'].PlacementID).to.be.equal('placement_0');
      expect(payload.Bids['bid_id_1'].PlacementID).to.be.equal('placement_1');
      expect(payload.Bids['bid_id_3'].PlacementID).to.be.equal('placement_3');

      expect(payload.Bids['bid_id_0'].TransactionID).to.be.equal('bid_id_0_transaction_id');
      expect(payload.Bids['bid_id_1'].TransactionID).to.be.equal('bid_id_1_transaction_id');
      expect(payload.Bids['bid_id_3'].TransactionID).to.be.equal('bid_id_3_transaction_id');
      expect(payload.PageRefreshed).to.equal(false);
    });

    it('sends bid request to endpoint setted by parameters', function () {
      const request = spec.buildRequests(bidRequestWithDCPlacement, bidderRequest);
      const payload = JSON.parse(request.data);

      expect(request.url).to.contain(getEndpoint(`${defaultDC}-fra01`));
    });
  });
  //
  describe('interpretResponse', function () {
    let serverResponse;

    beforeEach(function () {
      serverResponse = {
        body: {}
      }
    });

    it('handles nobid responses', function () {
      let response = [{
        BidID: '123dfsdf',
        Attempt: '32344fdse1',
        Placement: '12df1'
      }];
      serverResponse.body = response;
      let result = spec.interpretResponse(serverResponse, []);
      expect(result).deep.equal([]);
    });

    it('receive reponse with single placement', function () {
      serverResponse.body = responseWithSinglePlacement;
      let result = spec.interpretResponse(serverResponse, {data: '{"Bids":' + JSON.stringify(requestDataOnePlacement) + '}'});

      expect(result.length).to.equal(1);
      expect(result[0].cpm).to.equal(0.5);
      expect(result[0].ad).to.equal('placement_0');
      expect(result[0].width).to.equal(300);
      expect(result[0].height).to.equal(600);
    });

    it('receive reponse with multiple placement', function () {
      serverResponse.body = responseWithMultiplePlacements;
      let result = spec.interpretResponse(serverResponse, {data: '{"Bids":' + JSON.stringify(requestDataMultiPlacement) + '}'});

      expect(result.length).to.equal(2);

      expect(result[0].cpm).to.equal(0.5);
      expect(result[0].ad).to.equal('placement_0');
      expect(result[0].width).to.equal(300);
      expect(result[0].height).to.equal(600);

      expect(result[1].cpm).to.equal(0.6);
      expect(result[1].ad).to.equal('placement_1');
      expect(result[1].width).to.equal(400);
      expect(result[1].height).to.equal(250);
    });
  });
});
