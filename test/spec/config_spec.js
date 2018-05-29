import { expect } from 'chai';
import { assert } from 'chai';
import { newConfig } from 'src/config';

const utils = require('src/utils');

let getConfig;
let setConfig;
let setDefaults;

describe('config API', () => {
  let logErrorSpy;
  let logWarnSpy;
  beforeEach(() => {
    const config = newConfig();
    getConfig = config.getConfig;
    setConfig = config.setConfig;
    setDefaults = config.setDefaults;
    logErrorSpy = sinon.spy(utils, 'logError');
    logWarnSpy = sinon.spy(utils, 'logWarn');
  });

  afterEach(() => {
    utils.logError.restore();
    utils.logWarn.restore();
  });

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

  it('only accepts objects', () => {
    setConfig('invalid');
    expect(getConfig('0')).to.not.equal('i');
  });

  it('sets multiple config properties', () => {
    setConfig({ foo: 'bar' });
    setConfig({ biz: 'buz' });
    var config = getConfig();
    expect(config.foo).to.equal('bar');
    expect(config.biz).to.equal('buz');
  });

  it('overwrites existing config properties', () => {
    setConfig({ foo: {biz: 'buz'} });
    setConfig({ foo: {baz: 'qux'} });
    expect(getConfig('foo')).to.eql({baz: 'qux'});
  });

  it('sets debugging', () => {
    setConfig({ debug: true });
    expect(getConfig('debug')).to.be.true;
  });

  it('sets bidderTimeout', () => {
    setConfig({ bidderTimeout: 1000 });
    expect(getConfig('bidderTimeout')).to.be.equal(1000);
  });

  it('gets user-defined publisherDomain', () => {
    setConfig({ publisherDomain: 'fc.kahuna' });
    expect(getConfig('publisherDomain')).to.equal('fc.kahuna');
  });

  it('gets default userSync config', () => {
    const DEFAULT_USERSYNC = {
      syncEnabled: true,
      pixelEnabled: true,
      syncsPerBidder: 5,
      syncDelay: 3000
    };
    setDefaults({'userSync': DEFAULT_USERSYNC});
    expect(getConfig('userSync')).to.eql(DEFAULT_USERSYNC);
  });

  it('has subscribe functionality for adding listeners to config updates', () => {
    const listener = sinon.spy();

    getConfig(listener);

    setConfig({ foo: 'bar' });

    sinon.assert.calledOnce(listener);
    sinon.assert.calledWith(listener, { foo: 'bar' });
  });

  it('subscribers can unsubscribe', () => {
    const listener = sinon.spy();

    const unsubscribe = getConfig(listener);

    unsubscribe();

    setConfig({ logging: true });

    sinon.assert.notCalled(listener);
  });

  it('subscribers can subscribe to topics', () => {
    const listener = sinon.spy();

    getConfig('logging', listener);

    setConfig({ logging: true, foo: 'bar' });

    sinon.assert.calledOnce(listener);
    sinon.assert.calledWithExactly(listener, { logging: true });
  });

  it('topic subscribers are only called when that topic is changed', () => {
    const listener = sinon.spy();
    const wildcard = sinon.spy();

    getConfig('subject', listener);
    getConfig(wildcard);

    setConfig({ foo: 'bar' });

    sinon.assert.notCalled(listener);
    sinon.assert.calledOnce(wildcard);
  });

  it('sets priceGranularity', () => {
    setConfig({ priceGranularity: 'low' });
    expect(getConfig('priceGranularity')).to.be.equal('low');
  });

  it('set mediaTypePriceGranularity', () => {
    const customPriceGranularity = {
      'buckets': [{
        'min': 0,
        'max': 3,
        'increment': 0.01,
        'cap': true
      }]
    };
    setConfig({
      'mediaTypePriceGranularity': {
        'banner': 'medium',
        'video': customPriceGranularity,
        'native': 'medium'
      }
    });

    const configResult = getConfig('mediaTypePriceGranularity');
    expect(configResult.banner).to.be.equal('medium');
    expect(configResult.video).to.be.equal(customPriceGranularity);
    expect(configResult.native).to.be.equal('medium');
  });

  it('sets priceGranularity and customPriceBucket', () => {
    const goodConfig = {
      'buckets': [{
        'min': 0,
        'max': 3,
        'increment': 0.01,
        'cap': true
      }]
    };
    setConfig({ priceGranularity: goodConfig });
    expect(getConfig('priceGranularity')).to.be.equal('custom');
    expect(getConfig('customPriceBucket')).to.equal(goodConfig);
  });

  it('should log error for invalid priceGranularity', () => {
    setConfig({ priceGranularity: '' });
    const error = 'Prebid Error: no value passed to `setPriceGranularity()`';
    assert.ok(logErrorSpy.calledWith(error), 'expected error was logged');
  });

  it('should log a warning on invalid values', () => {
    setConfig({ bidderSequence: 'unrecognized sequence' });
    expect(logWarnSpy.calledOnce).to.equal(true);
  });

  it('should not log warnings when given recognized values', () => {
    setConfig({ bidderSequence: 'fixed' });
    setConfig({ bidderSequence: 'random' });
    expect(logWarnSpy.called).to.equal(false);
  });
});
