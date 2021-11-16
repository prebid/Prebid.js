import { spec } from '../../../modules/targetVideoBidAdapter.js'

describe('TargetVideo Bid Adapter', function() {
  const bannerRequest = [{
    bidder: 'targetVideo',
    mediaTypes: {
      banner: {
        sizes: [[300, 250]],
      }
    },
    params: {
      placementId: 12345,
    }
  }];

  it('Test the bid validation function', function() {
    const validBid = spec.isBidRequestValid(bannerRequest[0]);
    const invalidBid = spec.isBidRequestValid(null);

    expect(validBid).to.be.true;
    expect(invalidBid).to.be.false;
  });

  it('Test the request processing function', function () {
    const request = spec.buildRequests(bannerRequest, bannerRequest[0]);
    expect(request).to.not.be.empty;

    const payload = request.data;
    expect(payload).to.not.be.empty;
  });
});
