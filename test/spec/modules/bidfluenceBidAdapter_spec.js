import { expect } from 'chai';
import { spec } from 'modules/bidfluenceBidAdapter.js';

const BIDDER_CODE = 'bidfluence';
const PLACEMENT_ID = '1000';
const PUB_ID = '1000';
const CONSENT_STRING = 'DUXDSDFSFWRRR8345F==';

const validBidRequests = [{
  'bidder': BIDDER_CODE,
  'params': {
    'placementId': PLACEMENT_ID,
    'publisherId': PUB_ID,
    'reservePrice': 0
  },
  'adUnitCode': 'adunit-code',
  'sizes': [[300, 250]],
  'bidId': '2b1f23307fb8ef',
  'bidderRequestId': '10edf38ec1a719',
  'auctionId': '1025ba77-5463-4877-b0eb-14b205cb9304'
}];

const bidderRequest = {
  'bidderCode': 'bidfluence',
  'auctionId': '1025ba77-5463-4877-b0eb-14b205cb9304',
  'bidderRequestId': '10edf38ec1a719',
  'refererInfo': {
    'numIframes': 0,
    'reachedTop': true,
    'referer': 'test',
    'stack': ['test']
  },
  'timeout': 1000,
  'gdprConsent': {
    'gdprApplies': true,
    'consentString': CONSENT_STRING,
    'vendorData': ''
  }
};

bidderRequest.bids = validBidRequests;

describe('Bidfluence Adapter test', () => {
  describe('isBidRequestValid', function () {
    it('should return true when required params found', function () {
      expect(spec.isBidRequestValid(validBidRequests[0])).to.equal(true);
    });
    it('should return the right bidder code', function () {
      expect(spec.code).to.eql(BIDDER_CODE);
    });
  });

  describe('buildRequests', function () {
    it('sends bid request to our endpoint via POST', function () {
      const request = spec.buildRequests(validBidRequests, bidderRequest);
      expect(request.method).to.equal('POST');
      const payload = JSON.parse(request.data);

      expect(payload.bids[0].bid).to.equal(validBidRequests[0].bidId);
      expect(payload.azr).to.equal(true);
      expect(payload.ck).to.not.be.undefined;
      expect(payload.bids[0].tid).to.equal(PLACEMENT_ID);
      expect(payload.bids[0].pid).to.equal(PUB_ID);
      expect(payload.bids[0].rp).to.be.a('number');
      expect(payload.re).to.not.be.undefined;
      expect(payload.st).to.not.be.undefined;
      expect(payload.tz).to.not.be.undefined;
      expect(payload.sr).to.not.be.undefined;
      expect(payload.vp).to.not.be.undefined;
      expect(payload.sdt).to.not.be.undefined;
      expect(payload.bids[0].w).to.equal('300');
      expect(payload.bids[0].h).to.equal('250');
    });

    it('sends gdpr info if exists', function () {
      const request = spec.buildRequests(validBidRequests, bidderRequest);
      const payload = JSON.parse(request.data);
      expect(payload.gdpr).to.equal(true);
      expect(payload.gdprc).to.equal(CONSENT_STRING);
    });
  });

  describe('interpretResponse', function () {
    const response = {
      body: {
        Bids:
          [{
            'CreativeId': '1000',
            'Cpm': 0.50,
            'Ad': '<div></div>',
            'Height': 250,
            'Width': 300
          }]
      }
    };

    it('should get correct bid response', function () {
      const expectedResponse = [{
        requestId: response.body.Bids[0].BidId,
        cpm: response.body.Bids[0].Cpm,
        width: response.body.Bids[0].Width,
        height: response.body.Bids[0].Height,
        creativeId: response.body.Bids[0].CreativeId,
        ad: response.body.Bids[0].Ad,
        currency: 'USD',
        netRevenue: true,
        ttl: 360
      }];

      let result = spec.interpretResponse(response, { 'bidderRequest': validBidRequests[0] });
      expect(result).to.deep.equal(expectedResponse);
    });
  });
});
