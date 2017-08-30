import { expect } from 'chai';
import { config } from 'src/config';
// Use require since we need to be able to write to these vars
const utils = require('../../src/utils');
let { userSync, newUserSync } = require('../../src/userSync');

describe('user sync', () => {
  let triggerPixelStub;
  let logWarnStub;
  let timeoutStub;
  let shuffleStub;
  let insertElementStub;
  let getUniqueIdentifierStrStub;
  let idPrefix = 'test-generated-id-';
  let lastId = 0;
  let defaultUserSyncConfig = config.getConfig('userSync');
  function getUserSyncConfig(userSyncConfig) {
    return Object.assign({}, defaultUserSyncConfig, userSyncConfig);
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
    userSync = newUserSync();
    userSync.registerSync('image', 'testBidder', 'http://example.com');
    userSync.syncUsers();
    expect(triggerPixelStub.getCall(0)).to.not.be.null;
    expect(triggerPixelStub.getCall(0).args[0]).to.exist.and.to.equal('http://example.com');
  });

  it('should clear queue after sync', () => {
    userSync = newUserSync();
    userSync.syncUsers();
    expect(triggerPixelStub.callCount).to.equal(0);
  });

  it('should delay firing a pixel by the expected amount', () => {
    userSync = newUserSync();
    userSync.registerSync('image', 'testBidder', 'http://example.com');
    // This implicitly tests cookie and browser support
    userSync.syncUsers(999);
    expect(timeoutStub.getCall(0).args[1]).to.equal(999);
  });

  it('should register and fires multiple pixel URLs', () => {
    userSync = newUserSync();
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
    userSync = newUserSync(getUserSyncConfig({pixelEnabled: false}));
    userSync.registerSync('image', 'testBidder', 'http://example.com');
    userSync.syncUsers();
    expect(triggerPixelStub.getCall(0)).to.be.null;
  });

  it('should register and load an iframe', () => {
    userSync = newUserSync(getUserSyncConfig({iframeEnabled: true}));
    userSync.registerSync('iframe', 'testBidder', 'http://example.com/iframe');
    userSync.syncUsers();
    let iframe = window.document.getElementById(idPrefix + lastId);
    expect(iframe).to.exist;
    expect(iframe.src).to.equal('http://example.com/iframe');
  });

  it('should only trigger syncs once per page', () => {
    userSync = newUserSync(getUserSyncConfig({pixelEnabled: true}));
    userSync.registerSync('image', 'testBidder', 'http://example.com/1');
    userSync.syncUsers();
    userSync.registerSync('image', 'testBidder', 'http://example.com/2');
    userSync.syncUsers();
    expect(triggerPixelStub.getCall(0)).to.not.be.null;
    expect(triggerPixelStub.getCall(0).args[0]).to.exist.and.to.equal('http://example.com/1');
    expect(triggerPixelStub.getCall(1)).to.be.null;
  });

  // Since cookie support is only checked when the module is loaded this test will not work, but a test that covers
  // this scenario is important and this should be revisited.
  // it('should not fire syncs since cookies are not supported', () => {
  //   let isSafariBrowserStub = sinon.stub(utils, 'isSafariBrowser', () => true);
  //   setUserSyncConfig({pixelEnabled: true});
  //   userSync = newUserSync(config.getConfig('userSync'));
  //   userSync.registerSync('image', 'testBidder', 'http://example.com');
  //   userSync.syncUsers();
  //   expect(triggerPixelStub.getCall(0)).to.be.null;
  //   isSafariBrowserStub.restore();
  //   let cookiesAreEnabledStub = sinon.stub(utils, 'cookiesAreEnabled', () => false);
  //   userSync.registerSync('image', 'testBidder', 'http://example.com');
  //   userSync.syncUsers();
  //   expect(triggerPixelStub.getCall(0)).to.be.null;
  // });

  it('should prevent registering invalid type', () => {
    userSync = newUserSync();
    userSync.registerSync('invalid', 'testBidder', 'http://example.com');
    expect(logWarnStub.getCall(0).args[0]).to.exist;
  });

  it('should expose the syncUsers method for the publisher to manually trigger syncs', () => {
    // syncUsersOverride should do nothing by default
    userSync = newUserSync();
    let syncUsersSpy = sinon.spy(userSync, 'syncUsers');
    userSync.syncUsersOverride();
    expect(syncUsersSpy.notCalled).to.be.true;
    // syncUsersOverride should trigger syncUsers if enableOverride is on
    userSync = newUserSync(getUserSyncConfig({enableOverride: true}));
    syncUsersSpy = sinon.spy(userSync, 'syncUsers');
    userSync.syncUsersOverride();
    expect(syncUsersSpy.called).to.be.true;
  });

  it('should limit the sync per bidder', () => {
    userSync = newUserSync(getUserSyncConfig({syncsPerBidder: 2}));
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
    userSync = newUserSync();
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
    userSync = newUserSync(getUserSyncConfig({syncEnabled: false}));
    userSync.registerSync('pixel', 'testBidder', 'http://example.com');
    expect(logWarnStub.getCall(0).args[0]).to.exist;
    userSync.syncUsers();
    expect(triggerPixelStub.getCall(0)).to.be.null;
  });

  it('should only sync enabled bidders', () => {
    userSync = newUserSync(getUserSyncConfig({enabledBidders: ['testBidderA']}));
    userSync.registerSync('image', 'testBidderA', 'http://example.com/1');
    userSync.registerSync('image', 'testBidderB', 'http://example.com/2');
    userSync.syncUsers();
    expect(triggerPixelStub.getCall(0)).to.not.be.null;
    expect(triggerPixelStub.getCall(0).args[0]).to.exist.and.to.include('http://example.com/');
    expect(triggerPixelStub.getCall(1)).to.be.null;
  });
});
