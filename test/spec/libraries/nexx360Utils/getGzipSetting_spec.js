import { expect } from 'chai';
import sinon from 'sinon';
import { getGzipSetting } from '../../../../libraries/nexx360Utils/index.js';
import { config } from 'src/config.js';
import * as utils from 'src/utils.js';

const sandbox = sinon.createSandbox();

describe('nexx360Utils getGzipSetting', () => {
  let getParamStub;

  beforeEach(() => {
    config.resetConfig();
    getParamStub = sandbox.stub(utils, 'getParameterByName').returns('');
  });

  afterEach(() => {
    sandbox.restore();
  });

  it('returns defaultEnabled when no config and no URL override', () => {
    expect(getGzipSetting('nexx360', true)).to.equal(true);
    expect(getGzipSetting('insurads', false)).to.equal(false);
  });

  it('returns false when bidder config gzipEnabled is the string "false"', () => {
    config.setBidderConfig({ bidders: ['nexx360'], config: { gzipEnabled: 'false' } });
    expect(getGzipSetting('nexx360', true)).to.equal(false);
  });

  it('returns true when bidder config gzipEnabled is the string "true"', () => {
    config.setBidderConfig({ bidders: ['nexx360'], config: { gzipEnabled: 'true' } });
    expect(getGzipSetting('nexx360', true)).to.equal(true);
  });

  it('returns true when bidder config gzipEnabled is the boolean true', () => {
    config.setBidderConfig({ bidders: ['insurads'], config: { gzipEnabled: true } });
    expect(getGzipSetting('insurads', false)).to.equal(true);
  });

  it('returns false when bidder config gzipEnabled is the boolean false', () => {
    config.setBidderConfig({ bidders: ['nexx360'], config: { gzipEnabled: false } });
    expect(getGzipSetting('nexx360', true)).to.equal(false);
  });

  it('returns false when URL nexx360_debug=1, overriding enabled config', () => {
    getParamStub.withArgs('nexx360_debug').returns('1');
    config.setBidderConfig({ bidders: ['nexx360'], config: { gzipEnabled: 'true' } });
    expect(getGzipSetting('nexx360', true)).to.equal(false);
  });

  it('ignores URL nexx360_debug when its value is not "1"', () => {
    getParamStub.withArgs('nexx360_debug').returns('0');
    expect(getGzipSetting('nexx360', true)).to.equal(true);
  });

  it('applies nexx360_debug=1 across all aliases regardless of defaultEnabled', () => {
    getParamStub.withArgs('nexx360_debug').returns('1');
    expect(getGzipSetting('mtc', true)).to.equal(false);
    expect(getGzipSetting('adgrid', true)).to.equal(false);
    expect(getGzipSetting('revnew', true)).to.equal(false);
    expect(getGzipSetting('insurads', false)).to.equal(false);
  });

  it('reads config keyed by the bidderCode argument', () => {
    config.setBidderConfig({ bidders: ['mtc'], config: { gzipEnabled: 'false' } });
    expect(getGzipSetting('mtc', true)).to.equal(false);
    expect(getGzipSetting('nexx360', true)).to.equal(true);
  });
});
