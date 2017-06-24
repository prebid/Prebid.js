import userSync from '../../src/userSync';
import { expect } from 'chai';
var utils = require('../../src/utils');

describe.only('user sync', () => {
  let createImgObjectStub = sinon.stub(userSync, 'createImgObject');
  let logWarnStub = sinon.stub(utils, 'logWarn');
  let timeoutStub = sinon.stub(window, 'setTimeout', (callbackFunc) => { callbackFunc(); });

  beforeEach(() => {
    createImgObjectStub.reset();
    logWarnStub.reset();
    timeoutStub.reset();
  });

  it('registers and fires a pixel URL', () => {
    $$PREBID_GLOBAL$$.userSync.pixelEnabled = true;
    userSync.registerSync('image', 'testBidder', 'http://example.com');
    userSync.syncUsers();
    expect(createImgObjectStub.getCall(0).args[0]).to.exist.and.to.equal('http://example.com');
  });

  it('clears queue after sync', () => {
    userSync.syncUsers();
    expect(createImgObjectStub.callCount).to.equal(0);
  });

  it('delays firing a pixel by the expected amount', () => {
    userSync.registerSync('image', 'testBidder', 'http://example.com');
    userSync.syncUsers(999);
    expect(timeoutStub.getCall(0).args[1]).to.equal(999);
  });

  it('registers and fires multiple pixel URLs', () => {
    userSync.registerSync('image', 'testBidder', 'http://example.com/1');
    userSync.registerSync('image', 'testBidder', 'http://example.com/2');
    userSync.syncUsers();
    expect(createImgObjectStub.getCall(0).args[0]).to.exist.and.to.equal('http://example.com/1');
    expect(createImgObjectStub.getCall(1).args[0]).to.exist.and.to.equal('http://example.com/2');
  });

  it('pixel URL does not register since it is not supported', () => {
    $$PREBID_GLOBAL$$.userSync.pixelEnabled = false;
    userSync.registerSync('image', 'testBidder', 'http://example.com');
    userSync.syncUsers();
    expect(createImgObjectStub.getCall(0)).to.be.null;
  });

  it('prevents registering invalid type', () => {
    userSync.registerSync('invalid', 'testBidder', 'http://example.com');
    expect(logWarnStub.getCall(0).args[0]).to.exist;
  });

  it('exposes the syncUsers method for the publisher to manually trigger syncs', () => {
    expect(typeof $$PREBID_GLOBAL$$.userSync.syncAll).to.equal('undefined');
    $$PREBID_GLOBAL$$.userSync.enableOverride = true;
    userSync.overrideSync($$PREBID_GLOBAL$$.userSync.enableOverride);
    expect(typeof $$PREBID_GLOBAL$$.userSync.syncAll).to.equal('function');
  });
});
