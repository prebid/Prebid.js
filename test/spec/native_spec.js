import { expect } from 'chai';
import { fireNativeTrackers, setNativeTargeting } from 'src/native';

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
  it('sets native targeting keys', () => {
    const targeting = setNativeTargeting(bid);
    expect(targeting.hb_native_title).to.equal(bid.native.title);
    expect(targeting.hb_native_body).to.equal(bid.native.body);
    expect(targeting.hb_native_linkurl).to.equal(bid.native.clickUrl);
  });

  it('fires impression trackers', () => {
    const fired = fireNativeTrackers({}, bid);
    expect(fired).to.deep.equal(bid.native.impressionTrackers);
  });

  it('fires click trackers', () => {
    const fired = fireNativeTrackers({ action: 'click' }, bid);
    expect(fired).to.deep.equal(bid.native.clickTrackers);
  });
});
