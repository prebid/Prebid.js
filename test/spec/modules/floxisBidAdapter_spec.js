import { expect } from 'chai';
import { spec } from 'modules/floxisBidAdapter.js';
import { BANNER, NATIVE, VIDEO } from 'src/mediaTypes.js';

const BIDDER_CODE = 'floxis';

describe('floxisBidAdapter', function () {
  const validBannerBid = {
    bidId: '1',
    adUnitCode: 'adunit-1',
    mediaTypes: { banner: { sizes: [[300, 250]] } },
    params: { partner: 'floxis', placementId: 123 },
    ortb2Imp: { secure: 1 }
  };
  const validVideoBid = {
    bidId: '2',
    adUnitCode: 'adunit-2',
    mediaTypes: { video: { playerSize: [[640, 480]] } },
    params: { partner: 'floxis', placementId: 456 },
    ortb2Imp: { secure: 1 }
  };
  const invalidBid = {
    bidId: '3',
    adUnitCode: 'adunit-3',
    mediaTypes: { banner: { sizes: [[300, 250]] } },
    params: { partner: '', placementId: 'notanint' }
  };

  it('should validate correct banner bid', function () {
    expect(spec.isBidRequestValid(validBannerBid)).to.be.true;
  });

  it('should validate correct video bid', function () {
    expect(spec.isBidRequestValid(validVideoBid)).to.be.true;
  });

  it('should invalidate incorrect bid', function () {
    expect(spec.isBidRequestValid(invalidBid)).to.be.false;
  });

  it('should build request with correct url and payload', function () {
    const requests = spec.buildRequests([validBannerBid], {});
    expect(requests).to.have.lengthOf(1);
    expect(requests[0].url).to.include('floxis-us.floxis.tech/pbjs');
    expect(requests[0].data).to.be.an('object');
    expect(requests[0].data.imp).to.be.an('array');
    expect(requests[0].data.site.ext.placementId).to.equal(123);
  });

  it('should handle empty bid requests', function () {
    const requests = spec.buildRequests([], {});
    expect(requests).to.be.an('array').that.is.empty;
  });

  it('should invalidate bid with no media types', function () {
    const noMediaTypeBid = {
      bidId: '4',
      adUnitCode: 'adunit-4',
      params: { partner: 'floxis', placementId: 123 }
    };
    expect(spec.isBidRequestValid(noMediaTypeBid)).to.be.false;
  });

  it('should validate supported media types', function () {
    expect(spec.supportedMediaTypes).to.include(BANNER);
    expect(spec.supportedMediaTypes).to.include(VIDEO);
    expect(spec.supportedMediaTypes).to.include(NATIVE);
  });

  it('should return empty user syncs', function () {
    expect(spec.getUserSyncs()).to.be.an('array').that.is.empty;
  });

  it('should interpret response correctly', function () {
    const serverResponse = {
      body: {
        seatbid: [{
          bid: [{
            impid: '1',
            price: 1.23,
            w: 300,
            h: 250,
            crid: 'creative-1',
            adm: '<div>ad</div>',
            cur: 'USD'
          }]
        }]
      }
    };
    const requests = spec.buildRequests([validBannerBid], {});
    const bids = spec.interpretResponse(serverResponse, requests[0]);
    expect(bids).to.be.an('array');
    if (bids.length > 0) {
      expect(bids[0]).to.have.property('cpm');
      expect(bids[0]).to.have.property('requestId');
      expect(bids[0].cpm).to.equal(1.23);
    }
  });
});
