import { expect } from 'chai';
import userSync from '../../src/userSync';
// Use require since we need to be able to write to these vars
let utils = require('../../src/utils');

describe('user sync', () => {
  let createImgObjectStub;
  let logWarnStub;
  let timeoutStub;

  beforeEach(() => {
    createImgObjectStub = sinon.stub(userSync, 'createImgObject');
    logWarnStub = sinon.stub(utils, 'logWarn');
    timeoutStub = sinon.stub(window, 'setTimeout', (callbackFunc, to) => { callbackFunc(); });
  });

  afterEach(() => {
    createImgObjectStub.restore();
    logWarnStub.restore();
    timeoutStub.restore();
    userSync.resetQueue();
  });

  it('should register and fires a pixel URL', () => {
    $$PREBID_GLOBAL$$.userSync.pixelEnabled = true;
    userSync.registerSync('image', 'testBidder', 'http://example.com');
    userSync.syncUsers();
    expect(createImgObjectStub.getCall(0)).to.not.be.null;
    expect(createImgObjectStub.getCall(0).args[0]).to.exist.and.to.equal('http://example.com');
  });

  it('should clear queue after sync', () => {
    userSync.syncUsers();
    expect(createImgObjectStub.callCount).to.equal(0);
  });

  it('should delay firing a pixel by the expected amount', () => {
    userSync.registerSync('image', 'testBidder', 'http://example.com');
    // This implicitly tests cookie and browser support
    userSync.syncUsers(999);
    expect(timeoutStub.getCall(0).args[1]).to.equal(999);
  });

  it('should register and fires multiple pixel URLs', () => {
    userSync.registerSync('image', 'testBidder', 'http://example.com/1');
    userSync.registerSync('image', 'testBidder', 'http://example.com/2');
    userSync.syncUsers();
    expect(createImgObjectStub.getCall(0)).to.not.be.null;
    expect(createImgObjectStub.getCall(0).args[0]).to.exist.and.to.equal('http://example.com/1');
    expect(createImgObjectStub.getCall(1)).to.not.be.null;
    expect(createImgObjectStub.getCall(1).args[0]).to.exist.and.to.equal('http://example.com/2');
  });

  it('should not register pixel URL since it is not supported', () => {
    $$PREBID_GLOBAL$$.userSync.pixelEnabled = false;
    userSync.registerSync('image', 'testBidder', 'http://example.com');
    userSync.syncUsers();
    expect(createImgObjectStub.getCall(0)).to.be.null;
  });

  it('should only trigger syncs once per page', () => {
    $$PREBID_GLOBAL$$.userSync.pixelEnabled = true;
    userSync.registerSync('image', 'testBidder', 'http://example.com/1');
    userSync.syncUsers();
    userSync.registerSync('image', 'testBidder', 'http://example.com/2');
    userSync.syncUsers();
    expect(createImgObjectStub.getCall(0)).to.not.be.null;
    expect(createImgObjectStub.getCall(0).args[0]).to.exist.and.to.equal('http://example.com/1');
    expect(createImgObjectStub.getCall(1)).to.be.null;
  });

  // Since cookie support is only checked when the module is loaded this test will not work, but a test that covers
  // this scenario is important and this should be revisited.
  // it('should not fire syncs since cookies are not supported', () => {
  //   let isSafariBrowserStub = sinon.stub(utils, 'isSafariBrowser', () => true);
  //   $$PREBID_GLOBAL$$.userSync.pixelEnabled = true;
  //   userSync.registerSync('image', 'testBidder', 'http://example.com');
  //   userSync.syncUsers();
  //   expect(createImgObjectStub.getCall(0)).to.be.null;
  //   isSafariBrowserStub.restore();
  //   let cookiesAreEnabledStub = sinon.stub(utils, 'cookiesAreEnabled', () => false);
  //   userSync.registerSync('image', 'testBidder', 'http://example.com');
  //   userSync.syncUsers();
  //   expect(createImgObjectStub.getCall(0)).to.be.null;
  // });

  it('should prevent registering invalid type', () => {
    userSync.registerSync('invalid', 'testBidder', 'http://example.com');
    expect(logWarnStub.getCall(0).args[0]).to.exist;
  });

  it('should expose the syncUsers method for the publisher to manually trigger syncs', () => {
    expect(typeof $$PREBID_GLOBAL$$.userSync.syncAll).to.equal('undefined');
    $$PREBID_GLOBAL$$.userSync.enableOverride = true;
    userSync.overrideSync($$PREBID_GLOBAL$$.userSync.enableOverride);
    expect(typeof $$PREBID_GLOBAL$$.userSync.syncAll).to.equal('function');
  });

  it('should limit the sync per bidder', () => {
    $$PREBID_GLOBAL$$.userSync.syncsPerBidder = 2;
    userSync.registerSync('image', 'testBidder', 'http://example.com/1');
    userSync.registerSync('image', 'testBidder', 'http://example.com/2');
    userSync.registerSync('image', 'testBidder', 'http://example.com/3');
    userSync.syncUsers();
    expect(createImgObjectStub.getCall(0)).to.not.be.null;
    expect(createImgObjectStub.getCall(0).args[0]).to.exist.and.to.equal('http://example.com/1');
    expect(createImgObjectStub.getCall(1)).to.not.be.null;
    expect(createImgObjectStub.getCall(1).args[0]).to.exist.and.to.equal('http://example.com/2');
    expect(createImgObjectStub.getCall(2)).to.be.null;
  });
});
