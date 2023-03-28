import {
  ACTIVITY_PARAM_COMPONENT, ACTIVITY_PARAM_COMPONENT_NAME,
  ACTIVITY_PARAM_COMPONENT_TYPE,
  activityParams
} from '../../../src/activities/params.js';

describe('activityParams', () => {
  it('fills out component params', () => {
    expect(activityParams('bidder', 'mockBidder', {foo: 'bar'})).to.eql({
      [ACTIVITY_PARAM_COMPONENT]: 'bidder.mockBidder',
      [ACTIVITY_PARAM_COMPONENT_TYPE]: 'bidder',
      [ACTIVITY_PARAM_COMPONENT_NAME]: 'mockBidder',
      foo: 'bar'
    });
  });
});
