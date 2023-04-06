import {
  ACTIVITY_PARAM_ADAPTER_CODE,
  ACTIVITY_PARAM_COMPONENT, ACTIVITY_PARAM_COMPONENT_NAME,
  ACTIVITY_PARAM_COMPONENT_TYPE
} from '../../../src/activities/params.js';
import adapterManager from '../../../src/adapterManager.js';
import {MODULE_TYPE_BIDDER} from '../../../src/activities/modules.js';
import {activityParams} from '../../../src/activities/activityParams.js';

describe('activityParams', () => {
  it('fills out component params', () => {
    sinon.assert.match(activityParams('bidder', 'mockBidder', {foo: 'bar'}), {
      [ACTIVITY_PARAM_COMPONENT]: 'bidder.mockBidder',
      [ACTIVITY_PARAM_COMPONENT_TYPE]: 'bidder',
      [ACTIVITY_PARAM_COMPONENT_NAME]: 'mockBidder',
      foo: 'bar'
    })
  });

  it('fills out adapterCode', () => {
    adapterManager.registerBidAdapter({callBids: sinon.stub(), getSpec: sinon.stub().returns({})}, 'mockBidder')
    adapterManager.aliasBidAdapter('mockBidder', 'mockAlias');
    expect(activityParams(MODULE_TYPE_BIDDER, 'mockAlias')[ACTIVITY_PARAM_ADAPTER_CODE]).to.equal('mockBidder');
  });
});
