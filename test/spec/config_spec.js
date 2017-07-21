import { excpet } from 'chai';
import { config, setConfig } from 'src/config';

describe('setConfig', () => {
  it('is a function', () => {
    expect(setConfig).to.be.a('function');
  });

  it('sets debugging', () => {
    setConfig({ debug: true });
    expect(config.debug).to.be.true;
  });

  it('recognizes legacy logging in deprecation window', () => {
    $$PREBID_GLOBAL$$.logging = false;
    expect(config.debug).to.equal(false);
  });
});
