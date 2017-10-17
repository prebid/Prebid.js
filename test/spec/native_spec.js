import { expect } from 'chai';
import { fireNativeTrackers, getNativeTargeting } from 'src/native';
const utils = require('src/utils');

const bid = {
  native: {
    title: 'Native Creative',
    body: 'Cool description great stuff',
    cta: 'Do it',
    sponsoredBy: 'AppNexus',
    clickUrl: 'https://www.link.example',
    clickTrackers: ['https://tracker.example'],
    impressionTrackers: ['https://impression.example'],
  }
};

describe('native.js', () => {
  let triggerPixelStub;

  beforeEach(() => {
    triggerPixelStub = sinon.stub(utils, 'triggerPixel');
  });

  afterEach(() => {
    utils.triggerPixel.restore();
  });

  it('gets native targeting keys', () => {
    const targeting = getNativeTargeting(bid);
    expect(targeting.hb_native_title).to.equal(bid.native.title);
    expect(targeting.hb_native_body).to.equal(bid.native.body);
    expect(targeting.hb_native_linkurl).to.equal(bid.native.clickUrl);
  });

  it('fires impression trackers', () => {
    fireNativeTrackers({}, bid);
    sinon.assert.calledOnce(triggerPixelStub);
    sinon.assert.calledWith(triggerPixelStub, bid.native.impressionTrackers[0]);
  });

  it('fires click trackers', () => {
    fireNativeTrackers({ action: 'click' }, bid);
    sinon.assert.calledOnce(triggerPixelStub);
    sinon.assert.calledWith(triggerPixelStub, bid.native.clickTrackers[0]);
  });
});
