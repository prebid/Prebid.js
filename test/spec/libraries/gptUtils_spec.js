import { expect } from 'chai';
import sinon from 'sinon';
import * as gptUtils from '../../../libraries/gptUtils/gptUtils.js';
import * as mockGpt from 'test/spec/integration/faker/googletag.js';

describe('gptUtils', () => {
  afterEach(() => {
    gptUtils.clearSlotInfoCache();
  });

  it('caches slot info for adUnitCode', () => {
    mockGpt.reset();
    mockGpt.makeSlot({ code: 'code', divId: 'div-id' });
    const first = gptUtils.getGptSlotInfoForAdUnitCode('code');
    const second = gptUtils.getGptSlotInfoForAdUnitCode('code');
    expect(first).to.deep.equal({ gptSlot: 'code', divId: 'div-id' });
    expect(second).to.deep.equal(first);
    const third = gptUtils.getGptSlotInfoForAdUnitCode('code1'); // not found
    expect(third).to.deep.equal({});
  });
});
