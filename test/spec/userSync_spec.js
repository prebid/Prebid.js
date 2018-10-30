import { expect } from 'chai';
import { config } from 'src/config';
// Use require since we need to be able to write to these vars
const utils = require('../../src/utils');
let { newUserSync } = require('../../src/userSync');

describe('user sync', function () {
  let triggerPixelStub;
  let logWarnStub;
  let timeoutStub;
  let shuffleStub;
  let getUniqueIdentifierStrStub;
  let insertUserSyncIframeStub;
  let idPrefix = 'test-generated-id-';
  let lastId = 0;
  let defaultUserSyncConfig = config.getConfig('userSync');
  function getUserSyncConfig(userSyncConfig) {
    return Object.assign({}, defaultUserSyncConfig, userSyncConfig);
  }
  function newTestUserSync(configOverrides, disableBrowserCookies) {
    const thisConfig = Object.assign({}, defaultUserSyncConfig, configOverrides);
    return newUserSync({
      config: thisConfig,
      browserSupportsCookies: !disableBrowserCookies,
    })
  }
  let clock;
  before(function () {
    clock = sinon.useFakeTimers();
  });

  after(function () {
    clock.restore();
  });

  beforeEach(function () {
    triggerPixelStub = sinon.stub(utils, 'triggerPixel');
    logWarnStub = sinon.stub(utils, 'logWarn');
    shuffleStub = sinon.stub(utils, 'shuffle').callsFake((array) => array.reverse());
    getUniqueIdentifierStrStub = sinon.stub(utils, 'getUniqueIdentifierStr').callsFake(() => idPrefix + (lastId += 1));
    insertUserSyncIframeStub = sinon.stub(utils, 'insertUserSyncIframe');
  });

  afterEach(function () {
    triggerPixelStub.restore();
    logWarnStub.restore();
    shuffleStub.restore();
    getUniqueIdentifierStrStub.restore();
    insertUserSyncIframeStub.restore();
  });

  it('should register and fire a pixel URL', function () {
    const userSync = newTestUserSync();
    userSync.registerSync('image', 'testBidder', 'http://example.com');
    userSync.syncUsers();
    expect(triggerPixelStub.getCall(0)).to.not.be.null;
    expect(triggerPixelStub.getCall(0).args[0]).to.exist.and.to.equal('http://example.com');
  });

  it('should clear queue after sync', function () {
    const userSync = newTestUserSync();
    userSync.syncUsers();
    expect(triggerPixelStub.callCount).to.equal(0);
  });

  it('should delay firing a pixel by the expected amount', function () {
    const userSync = newTestUserSync();
    userSync.registerSync('image', 'testBidder', 'http://example.com');
    // This implicitly tests cookie and browser support
    userSync.syncUsers(999);
    clock.tick(1000);
    expect(triggerPixelStub.getCall(0)).to.not.be.null;
  });

  it('should register and fires multiple pixel URLs', function () {
    const userSync = newTestUserSync();
    userSync.registerSync('image', 'testBidder', 'http://example.com/1');
    userSync.registerSync('image', 'testBidder', 'http://example.com/2');
    userSync.syncUsers();
    expect(triggerPixelStub.getCall(0)).to.not.be.null;
    expect(triggerPixelStub.getCall(0).args[0]).to.exist.and.to.include('http://example.com/');
    expect(triggerPixelStub.getCall(1)).to.not.be.null;
    expect(triggerPixelStub.getCall(1).args[0]).to.exist.and.to.include('http://example.com/');
    expect(triggerPixelStub.getCall(2)).to.be.null;
  });

  it('should not register pixel URL since it is not supported', function () {
    const userSync = newTestUserSync({pixelEnabled: false});
    userSync.registerSync('image', 'testBidder', 'http://example.com');
    userSync.syncUsers();
    expect(triggerPixelStub.getCall(0)).to.be.null;
  });

  it('should register and load an iframe', function () {
    const userSync = newTestUserSync({iframeEnabled: true});
    userSync.registerSync('iframe', 'testBidder', 'http://example.com/iframe');
    userSync.syncUsers();
    expect(insertUserSyncIframeStub.getCall(0).args[0]).to.equal('http://example.com/iframe');
  });

  it('should only trigger syncs once per page', function () {
    const userSync = newTestUserSync({pixelEnabled: true});
    userSync.registerSync('image', 'testBidder', 'http://example.com/1');
    userSync.syncUsers();
    userSync.registerSync('image', 'testBidder', 'http://example.com/2');
    userSync.syncUsers();
    expect(triggerPixelStub.getCall(0)).to.not.be.null;
    expect(triggerPixelStub.getCall(0).args[0]).to.exist.and.to.equal('http://example.com/1');
    expect(triggerPixelStub.getCall(1)).to.be.null;
  });

  it('should not fire syncs if cookies are not supported', function () {
    const userSync = newTestUserSync({pixelEnabled: true}, true);
    userSync.registerSync('image', 'testBidder', 'http://example.com');
    userSync.syncUsers();
    expect(triggerPixelStub.getCall(0)).to.be.null;
  });

  it('should prevent registering invalid type', function () {
    const userSync = newTestUserSync();
    userSync.registerSync('invalid', 'testBidder', 'http://example.com');
    expect(logWarnStub.getCall(0).args[0]).to.exist;
  });

  it('should expose the syncUsers method for the publisher to manually trigger syncs', function () {
    // triggerUserSyncs should do nothing by default
    let userSync = newTestUserSync();
    let syncUsersSpy = sinon.spy(userSync, 'syncUsers');
    userSync.triggerUserSyncs();
    expect(syncUsersSpy.notCalled).to.be.true;
    // triggerUserSyncs should trigger syncUsers if enableOverride is on
    userSync = newTestUserSync({enableOverride: true});
    syncUsersSpy = sinon.spy(userSync, 'syncUsers');
    userSync.triggerUserSyncs();
    expect(syncUsersSpy.called).to.be.true;
  });

  it('should limit the sync per bidder', function () {
    const userSync = newTestUserSync({syncsPerBidder: 2});
    userSync.registerSync('image', 'testBidder', 'http://example.com/1');
    userSync.registerSync('image', 'testBidder', 'http://example.com/2');
    userSync.registerSync('image', 'testBidder', 'http://example.com/3');
    userSync.syncUsers();
    expect(triggerPixelStub.getCall(0)).to.not.be.null;
    expect(triggerPixelStub.getCall(0).args[0]).to.exist.and.to.match(/^http:\/\/example\.com\/[1|2]/);
    expect(triggerPixelStub.getCall(1)).to.not.be.null;
    expect(triggerPixelStub.getCall(1).args[0]).to.exist.and.to.match(/^http:\/\/example\.com\/[1|2]/);
    expect(triggerPixelStub.getCall(2)).to.be.null;
  });

  it('should balance out bidder requests', function () {
    const userSync = newTestUserSync();
    userSync.registerSync('image', 'atestBidder', 'http://example.com/1');
    userSync.registerSync('image', 'atestBidder', 'http://example.com/3');
    userSync.registerSync('image', 'btestBidder', 'http://example.com/2');
    userSync.syncUsers();
    // The stubbed shuffle function should just reverse the order
    expect(triggerPixelStub.getCall(0)).to.not.be.null;
    expect(triggerPixelStub.getCall(0).args[0]).to.exist.and.to.equal('http://example.com/2');
    expect(triggerPixelStub.getCall(1)).to.not.be.null;
    expect(triggerPixelStub.getCall(1).args[0]).to.exist.and.to.equal('http://example.com/3');
    expect(triggerPixelStub.getCall(2)).to.not.be.null;
    expect(triggerPixelStub.getCall(2).args[0]).to.exist.and.to.equal('http://example.com/1');
    expect(triggerPixelStub.getCall(3)).to.be.null;
  });

  it('should disable user sync', function () {
    const userSync = newTestUserSync({syncEnabled: false});
    userSync.registerSync('pixel', 'testBidder', 'http://example.com');
    expect(logWarnStub.getCall(0).args[0]).to.exist;
    userSync.syncUsers();
    expect(triggerPixelStub.getCall(0)).to.be.null;
  });

  it('should only sync enabled bidders', function () {
    const userSync = newTestUserSync({enabledBidders: ['testBidderA']});
    userSync.registerSync('image', 'testBidderA', 'http://example.com/1');
    userSync.registerSync('image', 'testBidderB', 'http://example.com/2');
    userSync.syncUsers();
    expect(triggerPixelStub.getCall(0)).to.not.be.null;
    expect(triggerPixelStub.getCall(0).args[0]).to.exist.and.to.include('http://example.com/');
    expect(triggerPixelStub.getCall(1)).to.be.null;
  });

  it('should register config set after instantiation', function () {
    // start with userSync off
    const userSync = newTestUserSync({syncEnabled: false});
    // turn it on with setConfig()
    config.setConfig({userSync: {syncEnabled: true}});
    userSync.registerSync('image', 'testBidder', 'http://example.com');
    userSync.syncUsers();
    expect(triggerPixelStub.getCall(0)).to.not.be.null;
    expect(triggerPixelStub.getCall(0).args[0]).to.exist.and.to.equal('http://example.com');
  });

  it('should register both image and iframe pixels with filterSettings.all config', function () {
    const userSync = newTestUserSync({
      filterSettings: {
        all: {
          bidders: ['atestBidder', 'testBidder'],
          filter: 'include'
        },
      }
    });
    userSync.registerSync('image', 'atestBidder', 'http://example.com/1');
    userSync.registerSync('iframe', 'testBidder', 'http://example.com/iframe');
    userSync.syncUsers();
    expect(triggerPixelStub.getCall(0)).to.not.be.null;
    expect(triggerPixelStub.getCall(0).args[0]).to.exist.and.to.equal('http://example.com/1');
    expect(insertUserSyncIframeStub.getCall(0)).to.not.be.null;
    expect(insertUserSyncIframeStub.getCall(0).args[0]).to.equal('http://example.com/iframe');
  });

  it('should register iframe and not register image pixels based on filterSettings config', function () {
    const userSync = newTestUserSync({
      filterSettings: {
        image: {
          bidders: '*',
          filter: 'exclude'
        },
        iframe: {
          bidders: ['testBidder']
        }
      }
    });
    userSync.registerSync('image', 'atestBidder', 'http://example.com/1');
    userSync.registerSync('iframe', 'testBidder', 'http://example.com/iframe');
    userSync.syncUsers();
    expect(triggerPixelStub.getCall(0)).to.be.null;
    expect(insertUserSyncIframeStub.getCall(0)).to.not.be.null;
    expect(insertUserSyncIframeStub.getCall(0).args[0]).to.equal('http://example.com/iframe');
  });

  it('should throw a warning and default to basic resgistration rules when filterSettings config is invalid', function () {
    // invalid config - passed invalid filter option
    const userSync1 = newTestUserSync({
      filterSettings: {
        iframe: {
          bidders: ['testBidder'],
          filter: 'includes'
        }
      }
    });
    userSync1.registerSync('image', 'atestBidder', 'http://example.com/1');
    userSync1.registerSync('iframe', 'testBidder', 'http://example.com/iframe');
    userSync1.syncUsers();
    expect(logWarnStub.getCall(0).args[0]).to.exist;
    expect(triggerPixelStub.getCall(0)).to.not.be.null;
    expect(triggerPixelStub.getCall(0).args[0]).to.exist.and.to.equal('http://example.com/1');
    expect(insertUserSyncIframeStub.getCall(0)).to.be.null;

    // invalid config - bidders is not an array of strings
    const userSync2 = newTestUserSync({
      filterSettings: {
        iframe: {
          bidders: ['testBidder', 0],
          filter: 'include'
        }
      }
    });
    userSync2.registerSync('image', 'atestBidder', 'http://example.com/1');
    userSync2.registerSync('iframe', 'testBidder', 'http://example.com/iframe');
    userSync2.syncUsers();
    expect(logWarnStub.getCall(1).args[0]).to.exist;
    expect(triggerPixelStub.getCall(1)).to.not.be.null;
    expect(triggerPixelStub.getCall(1).args[0]).to.exist.and.to.equal('http://example.com/1');
    expect(insertUserSyncIframeStub.getCall(0)).to.be.null;

    // invalid config - bidders list includes wildcard
    const userSync3 = newTestUserSync({
      filterSettings: {
        iframe: {
          bidders: ['testBidder', '*'],
          filter: 'include'
        }
      }
    });
    userSync3.registerSync('image', 'atestBidder', 'http://example.com/1');
    userSync3.registerSync('iframe', 'testBidder', 'http://example.com/iframe');
    userSync3.syncUsers();
    expect(logWarnStub.getCall(2).args[0]).to.exist;
    expect(triggerPixelStub.getCall(2)).to.not.be.null;
    expect(triggerPixelStub.getCall(2).args[0]).to.exist.and.to.equal('http://example.com/1');
    expect(insertUserSyncIframeStub.getCall(0)).to.be.null;

    // invalid config - incorrect wildcard
    const userSync4 = newTestUserSync({
      filterSettings: {
        iframe: {
          bidders: '***',
          filter: 'include'
        }
      }
    });
    userSync4.registerSync('image', 'atestBidder', 'http://example.com/1');
    userSync4.registerSync('iframe', 'testBidder', 'http://example.com/iframe');
    userSync4.syncUsers();
    expect(logWarnStub.getCall(3).args[0]).to.exist;
    expect(triggerPixelStub.getCall(3)).to.not.be.null;
    expect(triggerPixelStub.getCall(3).args[0]).to.exist.and.to.equal('http://example.com/1');
    expect(insertUserSyncIframeStub.getCall(0)).to.be.null;

    // invalid config - missing bidders field
    const userSync5 = newTestUserSync({
      filterSettings: {
        iframe: {
          filter: 'include'
        }
      }
    });
    userSync5.registerSync('image', 'atestBidder', 'http://example.com/1');
    userSync5.registerSync('iframe', 'testBidder', 'http://example.com/iframe');
    userSync5.syncUsers();
    expect(logWarnStub.getCall(4).args[0]).to.exist;
    expect(triggerPixelStub.getCall(4)).to.not.be.null;
    expect(triggerPixelStub.getCall(4).args[0]).to.exist.and.to.equal('http://example.com/1');
    expect(insertUserSyncIframeStub.getCall(0)).to.be.null;
  });

  it('should overwrite logic of deprecated fields when filterSettings is defined', function () {
    const userSync = newTestUserSync({
      pixelsEnabled: false,
      iframeEnabled: true,
      enabledBidders: ['ctestBidder'],
      filterSettings: {
        image: {
          bidders: '*',
          filter: 'include'
        },
        iframe: {
          bidders: ['testBidder'],
          filter: 'exclude'
        }
      }
    });
    userSync.registerSync('image', 'atestBidder', 'http://example.com/1');
    userSync.registerSync('iframe', 'testBidder', 'http://example.com/iframe');
    userSync.syncUsers();
    expect(logWarnStub.getCall(0).args[0]).to.exist;
    expect(triggerPixelStub.getCall(0)).to.not.be.null;
    expect(triggerPixelStub.getCall(0).args[0]).to.exist.and.to.equal('http://example.com/1');
    expect(insertUserSyncIframeStub.getCall(0)).to.be.null;
  });
});
