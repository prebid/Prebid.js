import userSync from '../../src/userSync';
import { expect } from 'chai';
var utils = require('../../src/utils');

describe.only('user sync', () => {
  let createImgObjectStub = sinon.stub(userSync, 'createImgObject');
  let logWarnStub = sinon.stub(utils, 'logWarn');
  let timeoutStub = sinon.stub(window, 'setTimeout', (cb) => { cb(); });

  beforeEach(() => {
    createImgObjectStub.reset();
    logWarnStub.reset();
  });

  it('registers and fires a pixel URL', () => {
    userSync.registerSync('image', 'testBidder', 'http://example.com');
    userSync.syncUsers();
    expect(createImgObjectStub.getCall(0).args[0]).to.exist.and.to.equal('http://example.com');
  });

  it('clears queue after sync', () => {
    userSync.syncUsers();
    expect(createImgObjectStub.callCount).to.equal(0);
  });

  it('registers and fires a pixel URL', () => {
    userSync.registerSync('image', 'testBidder', 'http://example.com/1');
    userSync.registerSync('image', 'testBidder', 'http://example.com/2');
    userSync.syncUsers();
    expect(createImgObjectStub.getCall(0).args[0]).to.exist.and.to.equal('http://example.com/1');
    expect(createImgObjectStub.getCall(1).args[0]).to.exist.and.to.equal('http://example.com/2');
  });

  it('prevents registering invalid type', () => {
    userSync.registerSync('invalid', 'testBidder', 'http://example.com');
    expect(logWarnStub.getCall(0).args[0]).to.exist;
  });
});
