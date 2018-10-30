import { expect } from 'chai';
import { adapter } from 'modules/bidfluenceBidAdapter';
import { newBidder } from 'src/adapters/bidderFactory';

const BIDDER_CODE = 'bidfluence';
const spec = newBidder(adapter).getSpec();
const PLACEMENT_ID = '1000';
const PUB_ID = '1000';

const bidRequests = [{
  'bidder': BIDDER_CODE,
  'params': {
    'placementId': PLACEMENT_ID,
    'publisherId': PUB_ID
  },
  'adUnitCode': 'adunit-code',
  'sizes': [[300, 250], [300, 600]],
  'bidId': '2b1f23307fb8ef',
  'bidderRequestId': '10edf38ec1a719',
  'auctionId': '1025ba77-5463-4877-b0eb-14b205cb9304'
}];

describe('Bidfluence Adapter test', () => {
  describe('isBidRequestValid', function () {
    it('should return the right bidder code', function () {
      expect(spec.code).to.eql(BIDDER_CODE);
    });

    it('should return true when required params found', function () {
      expect(spec.isBidRequestValid(bidRequests[0])).to.equal(true);
    });
  });

  describe('buildRequests', function () {
    const request = spec.buildRequests(bidRequests);
    const payload = JSON.parse(request.data);

    it('sends bid request to our endpoint via POST', function () {
      expect(request.method).to.equal('POST');
    });

    expect(payload.bid).to.equal(bidRequests[0].bidId);
    expect(payload.azr).to.equal(true);
    expect(payload.ck).to.not.be.undefined;
    expect(payload.tid).to.equal(PLACEMENT_ID);
    expect(payload.pid).to.equal(PUB_ID);
    expect(payload.rp).to.not.be.undefined;
    expect(payload.re).to.not.be.undefined;
    expect(payload.st).to.not.be.undefined;
    expect(payload.tz).to.not.be.undefined;
    expect(payload.sr).to.not.be.undefined;
    expect(payload.vp).to.not.be.undefined;
    expect(payload.sdt).to.not.be.undefined;
    expect(payload.w).to.equal('300');
    expect(payload.h).to.equal('250');
    expect(payload.gdpr).to.not.be.undefined;
    expect(payload.gdprc).to.not.be.undefined;
    expect(payload.gdprvd).to.not.be.undefined;
  });

  it('sends gdpr info if exists', function () {
    let consentString = 'DUXDSDFSFWRRR8345F==';
    let bidderRequest = {
      'bidderCode': 'bidfluence',
      'auctionId': '1025ba77-5463-4877-b0eb-14b205cb9304',
      'bidderRequestId': '10edf38ec1a719',
      'timeout': 1000,
      'gdprConsent': {
        consentString: consentString,
        gdprApplies: true
      }
    };
    bidderRequest.bids = bidRequests;
    const request = spec.buildRequests(bidRequests, bidderRequest);
    const payload = JSON.parse(request.data);

    expect(payload.regs.ext.gdpr).to.exist.and.to.be.a('number');
    expect(payload.regs.ext.gdpr).to.equal(1);
    expect(payload.user.ext.consent).to.exist.and.to.be.a('string');
    expect(payload.user.ext.consent).to.equal(consentString);
  });

  describe('interpretResponse', function () {
    const response = {
      'creativeId': '1000',
      'cpm': 0.50,
      'ad': '<div></div>',
      'height': 250,
      'width': 300
    };

    it('should get correct bid response', function () {
      const expectedResponse = [{
        requestId: response.BidId,
        cpm: response.Cpm,
        width: response.Width,
        height: response.Height,
        creativeId: response.CreativeId,
        ad: response.Ad,
        currency: 'USD',
        netRevenue: true,
        ttl: 360
      }];

      let result = spec.interpretResponse(response, { 'bidderRequest': bidRequests[0] });
      expect(result).to.deep.equal(expectedResponse);
    });
  });
});
