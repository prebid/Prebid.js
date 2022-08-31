import { getBannerSizes, createAnalyticsEvent } from '../../../modules/liveintentAnalyticsAdapter';
import { expect } from 'chai';

describe('LiveIntent Analytics Adapter ', () => {
  it('extract sizes', function () {
    let expectedResult = [{
      w: 100,
      h: 50
    }];
    let banner = {
      sizes: [
        [100, 50]
      ]
    };
    expect(getBannerSizes(banner)).to.deep.equal(expectedResult);
  });

  it('creates analytics event from args and winning bids', () => {
    let args = {};
    let winningBids = [];
    let expectedResult = {};
    expect(createAnalyticsEvent(args, winningBids)).to.deep.equal(expectedResult);
  });
});
