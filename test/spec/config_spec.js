import { expect } from 'chai';
import { assert } from 'chai';
import { newConfig } from 'src/config.js';

const utils = require('src/utils');

let getConfig;
let setConfig;
let getBidderConfig;
let setBidderConfig;
let setDefaults;

describe('config API', function () {
  let logErrorSpy;
  let logWarnSpy;
  beforeEach(function () {
    const config = newConfig();
    getConfig = config.getConfig;
    setConfig = config.setConfig;
    getBidderConfig = config.getBidderConfig;
    setBidderConfig = config.setBidderConfig;
    setDefaults = config.setDefaults;
    logErrorSpy = sinon.spy(utils, 'logError');
    logWarnSpy = sinon.spy(utils, 'logWarn');
  });

  afterEach(function () {
    utils.logError.restore();
    utils.logWarn.restore();
  });

  it('setConfig is a function', function () {
    expect(setConfig).to.be.a('function');
  });

  it('getConfig returns an object', function () {
    expect(getConfig()).to.be.a('object');
  });

  it('sets and gets arbitrary configuration properties', function () {
    setConfig({ baz: 'qux' });
    expect(getConfig('baz')).to.equal('qux');
  });

  it('only accepts objects', function () {
    setConfig('invalid');
    expect(getConfig('0')).to.not.equal('i');
  });

  it('sets multiple config properties', function () {
    setConfig({ foo: 'bar' });
    setConfig({ biz: 'buz' });
    var config = getConfig();
    expect(config.foo).to.equal('bar');
    expect(config.biz).to.equal('buz');
  });

  it('overwrites existing config properties', function () {
    setConfig({ foo: {biz: 'buz'} });
    setConfig({ foo: {baz: 'qux'} });
    expect(getConfig('foo')).to.eql({baz: 'qux'});
  });

  it('moves fpd config into ortb2 properties', function () {
    setConfig({fpd: {context: {keywords: 'foo,bar', data: {inventory: [1]}}}});
    expect(getConfig('ortb2')).to.eql({site: {keywords: 'foo,bar', ext: {data: {inventory: [1]}}}});
    expect(getConfig('fpd')).to.eql(undefined);
  });

  it('moves fpd bidderconfig into ortb2 properties', function () {
    setBidderConfig({bidders: ['bidderA'], config: {fpd: {context: {keywords: 'foo,bar', data: {inventory: [1]}}}}});
    expect(getBidderConfig()).to.eql({'bidderA': {ortb2: {site: {keywords: 'foo,bar', ext: {data: {inventory: [1]}}}}}});
  });

  it('sets debugging', function () {
    setConfig({ debug: true });
    expect(getConfig('debug')).to.be.true;
  });

  it('sets bidderTimeout', function () {
    setConfig({ bidderTimeout: 1000 });
    expect(getConfig('bidderTimeout')).to.be.equal(1000);
  });

  it('gets user-defined publisherDomain', function () {
    setConfig({ publisherDomain: 'fc.kahuna' });
    expect(getConfig('publisherDomain')).to.equal('fc.kahuna');
  });

  it('gets default userSync config', function () {
    const DEFAULT_USERSYNC = {
      syncEnabled: true,
      pixelEnabled: true,
      syncsPerBidder: 5,
      syncDelay: 3000,
      auctionDelay: 0
    };
    setDefaults({'userSync': DEFAULT_USERSYNC});
    expect(getConfig('userSync')).to.eql(DEFAULT_USERSYNC);
  });

  it('has subscribe functionality for adding listeners to config updates', function () {
    const listener = sinon.spy();

    getConfig(listener);

    setConfig({ foo: 'bar' });

    sinon.assert.calledOnce(listener);
    sinon.assert.calledWith(listener, { foo: 'bar' });
  });

  it('subscribers can unsubscribe', function () {
    const listener = sinon.spy();

    const unsubscribe = getConfig(listener);

    unsubscribe();

    setConfig({ logging: true });

    sinon.assert.notCalled(listener);
  });

  it('subscribers can subscribe to topics', function () {
    const listener = sinon.spy();

    getConfig('logging', listener);

    setConfig({ logging: true, foo: 'bar' });

    sinon.assert.calledOnce(listener);
    sinon.assert.calledWithExactly(listener, { logging: true });
  });

  it('topic subscribers are only called when that topic is changed', function () {
    const listener = sinon.spy();
    const wildcard = sinon.spy();

    getConfig('subject', listener);
    getConfig(wildcard);

    setConfig({ foo: 'bar' });

    sinon.assert.notCalled(listener);
    sinon.assert.calledOnce(wildcard);
  });

  it('sets priceGranularity', function () {
    setConfig({ priceGranularity: 'low' });
    expect(getConfig('priceGranularity')).to.be.equal('low');
  });

  it('set mediaTypePriceGranularity', function () {
    const customPriceGranularityVideo = {
      'buckets': [{
        'max': 3,
        'increment': 0.01,
        'cap': true
      }]
    };
    const customPriceGranularityInstream = utils.deepClone(customPriceGranularityVideo);
    const customPriceGranularityOutstream = utils.deepClone(customPriceGranularityVideo);

    setConfig({
      'mediaTypePriceGranularity': {
        'banner': 'medium',
        'video': customPriceGranularityVideo,
        'video-instream': customPriceGranularityInstream,
        'video-outstream': customPriceGranularityOutstream,
        'native': 'high'
      }
    });

    const configResult = getConfig('mediaTypePriceGranularity');
    expect(configResult.banner).to.be.equal('medium');
    expect(configResult.video).to.be.equal(customPriceGranularityVideo);
    expect(configResult['video-instream']).to.be.equal(customPriceGranularityInstream);
    expect(configResult['video-outstream']).to.be.equal(customPriceGranularityOutstream);
    expect(configResult.native).to.be.equal('high');
  });

  it('sets priceGranularity and customPriceBucket', function () {
    const goodConfig = {
      'buckets': [{
        'max': 3,
        'increment': 0.01,
        'cap': true
      }]
    };
    setConfig({ priceGranularity: goodConfig });
    expect(getConfig('priceGranularity')).to.be.equal('custom');
    expect(getConfig('customPriceBucket')).to.equal(goodConfig);
  });

  it('sets deviceAccess', function () {
    // When the deviceAccess flag config option is not set, cookies may be read and set
    expect(getConfig('deviceAccess')).to.be.equal(true);

    // When the deviceAccess flag config option is set to false, no cookies are read or set
    setConfig({
      'deviceAccess': false
    });
    expect(getConfig('deviceAccess')).to.be.equal(false);

    // When the deviceAccess flag config option is set to true, cookies may be read and set
    setConfig({
      'deviceAccess': true
    });
    expect(getConfig('deviceAccess')).to.be.equal(true);
  });

  it('sets maxNestedIframes', function () {
    expect(getConfig('maxNestedIframes')).to.be.equal(10);
    setConfig({ maxNestedIframes: 2 });
    expect(getConfig('maxNestedIframes')).to.be.equal(2);
  });

  it('should log error for invalid priceGranularity', function () {
    setConfig({ priceGranularity: '' });
    const error = 'Prebid Error: no value passed to `setPriceGranularity()`';
    assert.ok(logErrorSpy.calledWith(error), 'expected error was logged');
  });

  it('should log a warning on invalid values', function () {
    setConfig({ bidderSequence: 'unrecognized sequence' });
    expect(logWarnSpy.calledOnce).to.equal(true);
  });

  it('should not log warnings when given recognized values', function () {
    setConfig({ bidderSequence: 'fixed' });
    setConfig({ bidderSequence: 'random' });
    expect(logWarnSpy.called).to.equal(false);
  });

  it('sets auctionOptions secondaryBidders', function () {
    const auctionOptionsConfig = {
      'secondaryBidders': ['rubicon', 'appnexus']
    }
    setConfig({ auctionOptions: auctionOptionsConfig });
    expect(getConfig('auctionOptions')).to.eql(auctionOptionsConfig);
  });

  it('sets auctionOptions suppressStaleRender', function () {
    const auctionOptionsConfig = {
      'suppressStaleRender': true
    }
    setConfig({ auctionOptions: auctionOptionsConfig });
    expect(getConfig('auctionOptions')).to.eql(auctionOptionsConfig);
  });

  it('should log warning for the wrong value passed to auctionOptions', function () {
    setConfig({ auctionOptions: '' });
    expect(logWarnSpy.calledOnce).to.equal(true);
    const warning = 'Auction Options must be an object';
    assert.ok(logWarnSpy.calledWith(warning), 'expected warning was logged');
  });

  it('should log warning for invalid auctionOptions bidder values', function () {
    setConfig({ auctionOptions: {
      'secondaryBidders': 'appnexus, rubicon',
    }});
    expect(logWarnSpy.calledOnce).to.equal(true);
    const warning = 'Auction Options secondaryBidders must be of type Array';
    assert.ok(logWarnSpy.calledWith(warning), 'expected warning was logged');
  });

  it('should log warning for invalid auctionOptions suppress stale render', function () {
    setConfig({ auctionOptions: {
      'suppressStaleRender': 'test',
    }});
    expect(logWarnSpy.calledOnce).to.equal(true);
    const warning = 'Auction Options suppressStaleRender must be of type boolean';
    assert.ok(logWarnSpy.calledWith(warning), 'expected warning was logged');
  });

  it('should log warning for invalid properties to auctionOptions', function () {
    setConfig({ auctionOptions: {
      'testing': true
    }});
    expect(logWarnSpy.calledOnce).to.equal(true);
    const warning = 'Auction Options given an incorrect param: testing';
    assert.ok(logWarnSpy.calledWith(warning), 'expected warning was logged');
  });
});
