import { expect } from 'chai';
import { config } from 'src/config';
import { StorageManager, pbjsSyncsKey } from 'src/storagemanager';
// Use require since we need to be able to write to these vars
const utils = require('../../src/utils');
let { newUserSync } = require('../../src/userSync');

describe('user sync', () => {
  let triggerPixelStub;
  let logWarnStub;
  let timeoutStub;
  let shuffleStub;
  let getUniqueIdentifierStrStub;
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

  beforeEach(() => {
    triggerPixelStub = sinon.stub(utils, 'triggerPixel');
    logWarnStub = sinon.stub(utils, 'logWarn');
    shuffleStub = sinon.stub(utils, 'shuffle', (array) => array.reverse());
    getUniqueIdentifierStrStub = sinon.stub(utils, 'getUniqueIdentifierStr', () => idPrefix + (lastId += 1));
    timeoutStub = sinon.stub(window, 'setTimeout', (callbackFunc) => { callbackFunc(); });
  });

  afterEach(() => {
    triggerPixelStub.restore();
    logWarnStub.restore();
    shuffleStub.restore();
    getUniqueIdentifierStrStub.restore();
    timeoutStub.restore();
  });

  it('should register and fire a pixel URL', () => {
    const userSync = newTestUserSync();
    userSync.registerSync('image', 'testBidder', 'http://example.com');
    userSync.syncUsers();
    expect(triggerPixelStub.getCall(0)).to.not.be.null;
    expect(triggerPixelStub.getCall(0).args[0]).to.exist.and.to.equal('http://example.com');
  });

  it('should clear queue after sync', () => {
    const userSync = newTestUserSync();
    userSync.syncUsers();
    expect(triggerPixelStub.callCount).to.equal(0);
  });

  it('should delay firing a pixel by the expected amount', () => {
    const userSync = newTestUserSync();
    userSync.registerSync('image', 'testBidder', 'http://example.com');
    // This implicitly tests cookie and browser support
    userSync.syncUsers(999);
    expect(timeoutStub.getCall(0).args[1]).to.equal(999);
  });

  it('should register and fires multiple pixel URLs', () => {
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

  it('should not register pixel URL since it is not supported', () => {
    const userSync = newTestUserSync({pixelEnabled: false});
    userSync.registerSync('image', 'testBidder', 'http://example.com');
    userSync.syncUsers();
    expect(triggerPixelStub.getCall(0)).to.be.null;
  });

  it('should register and load an iframe', () => {
    const userSync = newTestUserSync({iframeEnabled: true});
    userSync.registerSync('iframe', 'testBidder', 'http://example.com/iframe');
    userSync.syncUsers();
    let iframe = window.document.getElementById(idPrefix + lastId);
    expect(iframe).to.exist;
    expect(iframe.src).to.equal('http://example.com/iframe');
  });

  it('should only trigger syncs once per page', () => {
    const userSync = newTestUserSync({pixelEnabled: true});
    userSync.registerSync('image', 'testBidder', 'http://example.com/1');
    userSync.syncUsers();
    userSync.registerSync('image', 'testBidder', 'http://example.com/2');
    userSync.syncUsers();
    expect(triggerPixelStub.getCall(0)).to.not.be.null;
    expect(triggerPixelStub.getCall(0).args[0]).to.exist.and.to.equal('http://example.com/1');
    expect(triggerPixelStub.getCall(1)).to.be.null;
  });

  it('should not fire syncs if cookies are not supported', () => {
    const userSync = newTestUserSync({pixelEnabled: true}, true);
    userSync.registerSync('image', 'testBidder', 'http://example.com');
    userSync.syncUsers();
    expect(triggerPixelStub.getCall(0)).to.be.null;
  });

  it('should prevent registering invalid type', () => {
    const userSync = newTestUserSync();
    userSync.registerSync('invalid', 'testBidder', 'http://example.com');
    expect(logWarnStub.getCall(0).args[0]).to.exist;
  });

  it('should expose the syncUsers method for the publisher to manually trigger syncs', () => {
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

  it('should limit the sync per bidder', () => {
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

  it('should balance out bidder requests', () => {
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

  it('should disable user sync', () => {
    const userSync = newTestUserSync({syncEnabled: false});
    userSync.registerSync('pixel', 'testBidder', 'http://example.com');
    expect(logWarnStub.getCall(0).args[0]).to.exist;
    userSync.syncUsers();
    expect(triggerPixelStub.getCall(0)).to.be.null;
  });

  it('should only sync enabled bidders', () => {
    const userSync = newTestUserSync({enabledBidders: ['testBidderA']});
    userSync.registerSync('image', 'testBidderA', 'http://example.com/1');
    userSync.registerSync('image', 'testBidderB', 'http://example.com/2');
    userSync.syncUsers();
    expect(triggerPixelStub.getCall(0)).to.not.be.null;
    expect(triggerPixelStub.getCall(0).args[0]).to.exist.and.to.include('http://example.com/');
    expect(triggerPixelStub.getCall(1)).to.be.null;
  });

  it('should register config set after instantiation', () => {
    // start with userSync off
    const userSync = newTestUserSync({syncEnabled: false});
    // turn it on with setConfig()
    config.setConfig({userSync: {syncEnabled: true}});
    userSync.registerSync('image', 'testBidder', 'http://example.com');
    userSync.syncUsers();
    expect(triggerPixelStub.getCall(0)).to.not.be.null;
    expect(triggerPixelStub.getCall(0).args[0]).to.exist.and.to.equal('http://example.com');
  });
});
