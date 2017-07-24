import { excpet } from 'chai';
import { getConfig, setConfig } from 'src/config';

describe('setConfig', () => {
  it('is a function', () => {
    expect(setConfig).to.be.a('function');
  });

  it('sets debugging', () => {
    setConfig({ debug: true });
    expect(getConfig('debug')).to.be.true;
  });

  it('recognizes legacy logging in deprecation window', () => {
    $$PREBID_GLOBAL$$.logging = false;
    expect(getConfig('debug')).to.equal(false);
  });

  it('sets bidderTimeout', () => {
    setConfig({ bidderTimeout: 1000 });
    expect(getConfig('bidderTimeout')).to.be.equal(1000);
  });

  it('gets legacy bidderTimeout in deprecation window', () => {
    $$PREBID_GLOBAL$$.bidderTimeout = 5000;
    expect(getConfig('bidderTimeout')).to.equal(5000);
  });
});
