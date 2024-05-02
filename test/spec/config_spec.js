import { expect } from 'chai';
import { assert } from 'chai';
import { newConfig } from 'src/config.js';

const utils = require('src/utils');

let getConfig;
let setConfig;
let readConfig;
let mergeConfig;
let getBidderConfig;
let setBidderConfig;
let mergeBidderConfig;
let setDefaults;

describe('config API', function () {
  let logErrorSpy;
  let logWarnSpy;
  let config;

  beforeEach(function () {
    config = newConfig();
    getConfig = config.getAnyConfig;
    setConfig = config.setConfig;
    readConfig = config.readAnyConfig;
    mergeConfig = config.mergeConfig;
    getBidderConfig = config.getBidderConfig;
    setBidderConfig = config.setBidderConfig;
    mergeBidderConfig = config.mergeBidderConfig;
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

  it('readConfig returns deepCopy of the internal config object', function () {
    setConfig({ foo: {biz: 'bar'} });
    const config1 = readConfig('foo');
    config1.biz = 'buz';
    const config2 = readConfig('foo');
    expect(readConfig()).to.be.a('object');
    expect(config1.biz).to.not.equal(config2.biz);
  });

  it('readConfig retrieves arbitrary configuration properties', function () {
    setConfig({ baz: 'qux' });
    expect(readConfig('baz')).to.equal('qux');
  });

  it('readConfig has subscribe functionality for adding listeners to config updates', function () {
    const listener = sinon.spy();

    readConfig(listener);

    setConfig({ foo: 'bar' });

    sinon.assert.calledOnce(listener);
    sinon.assert.calledWith(listener, { foo: 'bar' });
  });

  it('readConfig subscribers can unsubscribe', function () {
    const listener = sinon.spy();

    const unsubscribe = getConfig(listener);

    unsubscribe();

    readConfig({ logging: true });

    sinon.assert.notCalled(listener);
  });

  it('readConfig subscribers can subscribe to topics', function () {
    const listener = sinon.spy();

    readConfig('logging', listener);

    setConfig({ logging: true, foo: 'bar' });

    sinon.assert.calledOnce(listener);
    sinon.assert.calledWithExactly(listener, { logging: true });
  });

  it('readConfig topic subscribers are only called when that topic is changed', function () {
    const listener = sinon.spy();
    const wildcard = sinon.spy();

    readConfig('subject', listener);
    readConfig(wildcard);

    setConfig({ foo: 'bar' });

    sinon.assert.notCalled(listener);
    sinon.assert.calledOnce(wildcard);
  });

  it('getConfig subscribers are called immediately if passed {init: true}', () => {
    const listener = sinon.spy();
    setConfig({foo: 'bar'});
    getConfig('foo', listener, {init: true});
    sinon.assert.calledWith(listener, {foo: 'bar'});
  });

  it('getConfig subscribers with no topic are called immediately if passed {init: true}', () => {
    const listener = sinon.spy();
    setConfig({foo: 'bar'});
    getConfig(listener, {init: true});
    sinon.assert.calledWith(listener, sinon.match({foo: 'bar'}));
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

  it('should merge input with existing global config', function () {
    const obj = {
      ortb2: {
        site: {
          name: 'example',
          domain: 'page.example.com',
          cat: ['IAB2'],
          sectioncat: ['IAB2-2'],
          pagecat: ['IAB2-2']
        }
      }
    };
    setConfig({ ortb2: {
      user: {
        ext: {
          data: {
            registered: true,
            interests: ['cars']
          }
        }
      }
    }
    });
    mergeConfig(obj);
    const expected = {
      site: {
        name: 'example',
        domain: 'page.example.com',
        cat: ['IAB2'],
        sectioncat: ['IAB2-2'],
        pagecat: ['IAB2-2']
      },
      user: {
        ext: {
          data: {
            registered: true,
            interests: ['cars']
          }
        }
      }
    }
    expect(getConfig('ortb2')).to.deep.equal(expected);
  });

  it('input should take precedence over existing config if keys are the same', function() {
    const input = {
      ortb2: {
        user: {
          ext: {
            data: {
              registered: true,
              interests: ['cars']
            }
          }
        }
      }
    }
    setConfig({ ortb2: {
      user: {
        ext: {
          data: {
            registered: false
          }
        }
      }
    }});
    mergeConfig(input);
    const expected = {
      user: {
        ext: {
          data: {
            registered: true,
            interests: ['cars']
          }
        }
      }
    }
    expect(getConfig('ortb2')).to.deep.equal(expected);
  });

  it('should log error for a non-object value passed in', function () {
    mergeConfig('invalid object');
    expect(logErrorSpy.calledOnce).to.equal(true);
    const error = 'mergeConfig input must be an object';
    assert.ok(logErrorSpy.calledWith(error), 'expected error was logged');
  });

  it('should merge input with existing bidder config', function () {
    const input = {
      bidders: ['rubicon', 'appnexus'],
      config: {
        ortb2: {
          site: {
            name: 'example',
            domain: 'page.example.com',
            cat: ['IAB2'],
            sectioncat: ['IAB2-2'],
            pagecat: ['IAB2-2']
          },
          user: {
            ext: {
              ssp: 'magnite',
              data: {
                registered: false,
                interests: ['sports']
              }
            }
          }
        }
      }
    };
    setBidderConfig({
      bidders: ['rubicon'],
      config: {
        ortb2: {
          user: {
            ext: {
              data: {
                registered: true,
                interests: ['cars']
              }
            }
          }
        }
      }
    });
    mergeBidderConfig(input);
    const expected = {
      rubicon: {
        ortb2: {
          site: {
            name: 'example',
            domain: 'page.example.com',
            cat: ['IAB2'],
            sectioncat: ['IAB2-2'],
            pagecat: ['IAB2-2']
          },
          user: {
            ext: {
              ssp: 'magnite',
              data: {
                registered: false,
                interests: ['cars', 'sports']
              }
            }
          }
        }
      },
      appnexus: {
        ortb2: {
          site: {
            name: 'example',
            domain: 'page.example.com',
            cat: ['IAB2'],
            sectioncat: ['IAB2-2'],
            pagecat: ['IAB2-2']
          },
          user: {
            ext: {
              ssp: 'magnite',
              data: {
                registered: false,
                interests: ['sports']
              }
            }
          }
        }
      }
    }
    expect(getBidderConfig()).to.deep.equal(expected);
  });

  it('should log error for a non-object value passed in', function () {
    mergeBidderConfig('invalid object');
    expect(logErrorSpy.calledOnce).to.equal(true);
    const error = 'setBidderConfig bidder options must be an object';
    assert.ok(logErrorSpy.calledWith(error), 'expected error was logged');
  });

  it('should log error for empty bidders array', function () {
    mergeBidderConfig({
      bidders: [],
      config: {
        ortb2: {
          site: {
            name: 'example',
            domain: 'page.example.com',
            cat: ['IAB2'],
            sectioncat: ['IAB2-2'],
            pagecat: ['IAB2-2']
          }
        }
      }
    });
    expect(logErrorSpy.calledOnce).to.equal(true);
    const error = 'setBidderConfig bidder options must contain a bidders list with at least 1 bidder';
    assert.ok(logErrorSpy.calledWith(error), 'expected error was logged');
  });

  it('should log error for nonexistent config object', function () {
    mergeBidderConfig({
      bidders: ['appnexus']
    });
    expect(logErrorSpy.calledOnce).to.equal(true);
    const error = 'setBidderConfig bidder options must contain a config object';
    assert.ok(logErrorSpy.calledWith(error), 'expected error was logged');
  });

  it('should merge without array duplication', function() {
    const userObj1 = {
      name: 'www.dataprovider1.com',
      ext: { taxonomyname: 'iab_audience_taxonomy' },
      segment: [{
        id: '1776'
      }]
    };

    const userObj2 = {
      name: 'www.dataprovider2.com',
      ext: { taxonomyname: 'iab_audience_taxonomy' },
      segment: [{
        id: '1914'
      }]
    };

    const siteObj1 = {
      name: 'www.dataprovider3.com',
      ext: {
        taxonomyname: 'iab_audience_taxonomy'
      },
      segment: [
        {
          id: '1812'
        },
        {
          id: '1955'
        }
      ]
    }

    setConfig({
      bidderTimeout: 2000,
      ortb2: {
        user: {
          data: [userObj1, userObj2]
        },
        site: {
          content: {
            data: [siteObj1]
          }
        }
      }
    });

    const rtd = {
      bidderTimeout: 3000,
      ortb2: {
        user: {
          data: [userObj1]
        },
        site: {
          content: {
            data: [siteObj1]
          }
        }
      }
    };
    mergeConfig(rtd);

    let ortb2Config = getConfig('ortb2');
    let bidderTimeout = getConfig('bidderTimeout');

    expect(ortb2Config.user.data).to.deep.include.members([userObj1, userObj2]);
    expect(ortb2Config.site.content.data).to.deep.include.members([siteObj1]);
    expect(ortb2Config.user.data).to.have.lengthOf(2);
    expect(ortb2Config.site.content.data).to.have.lengthOf(1);
    expect(bidderTimeout).to.equal(3000);
  });

  it('should not corrupt global configuration with bidder configuration', () => {
    // https://github.com/prebid/Prebid.js/issues/7956
    config.setConfig({
      outer: {
        inner: ['global']
      }
    });
    config.setBidderConfig({
      bidders: ['bidder'],
      config: {
        outer: {
          inner: ['bidder']
        }
      }
    });
    config.runWithBidder('bidder', () => config.getConfig())
    expect(config.getConfig('outer')).to.eql({
      inner: ['global']
    });
  });
});
