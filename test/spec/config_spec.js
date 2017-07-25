import { excpet } from 'chai';
import { getConfig, setConfig, subscribe } from 'src/config';

describe('config API', () => {
  it('setConfig is a function', () => {
    expect(setConfig).to.be.a('function');
  });

  it('getConfig returns an object', () => {
    expect(getConfig()).to.be.a('object');
  });

  it('sets and gets arbitrary configuarion properties', () => {
    setConfig({ baz: 'qux' });
    expect(getConfig('baz')).to.equal('qux');
  });

  it('sets debugging', () => {
    setConfig({ debug: true });
    expect(getConfig('debug')).to.be.true;
  });

  // remove test when @deprecated $$PREBID_GLOBAL$$.logging removed
  it('gets legacy logging in deprecation window', () => {
    $$PREBID_GLOBAL$$.logging = false;
    expect(getConfig('debug')).to.equal(false);
  });

  it('sets bidderTimeout', () => {
    setConfig({ bidderTimeout: 1000 });
    expect(getConfig('bidderTimeout')).to.be.equal(1000);
  });

  // remove test when @deprecated $$PREBID_GLOBAL$$.bidderTimeout removed
  it('gets legacy bidderTimeout in deprecation window', () => {
    $$PREBID_GLOBAL$$.bidderTimeout = 5000;
    expect(getConfig('bidderTimeout')).to.equal(5000);
  });

  it('gets user-defined publisherDomain', () => {
    setConfig({ publisherDomain: 'fc.kahuna' });
    expect(getConfig('publisherDomain')).to.equal('fc.kahuna');
  });

  // remove test when @deprecated $$PREBID_GLOBAL$$.publisherDomain removed
  it('gets legacy publisherDomain in deprecation window', () => {
    $$PREBID_GLOBAL$$.publisherDomain = 'ad.example.com';
    expect(getConfig('publisherDomain')).to.equal('ad.example.com');
  });

  it('has a subscribe function for adding listeners to config updates', () => {
    const listener = sinon.spy();

    subscribe(listener);
    setConfig({ foo: 'bar' });

    sinon.assert.calledOnce(listener);
    sinon.assert.calledWith(listener, { foo: 'bar' });
  });
});
