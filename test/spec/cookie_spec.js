import cookie from '../../src/cookie';
import { expect } from 'chai';
var utils = require('../../src/utils');

describe('cookie.queueSync', () => {
  let insertCookieSyncIframeStub = sinon.stub(utils, 'insertCookieSyncIframe');
  let insertPixelStub = sinon.stub(utils, 'insertPixel');

  beforeEach(() => {
    insertCookieSyncIframeStub.reset();
    insertPixelStub.reset();
  });

  it('queues and fires a pixel URL', () => {
    cookie.queueSync({'bidder': 'testBidder', 'url': 'http://url.com'});
    cookie.syncCookies();
    expect(insertPixelStub.getCall(0).args[0]).to.exist.and.to.equal('http://url.com');
  });

  it('queues and fires a iframe URL', () => {
    cookie.queueSync({'url': 'http://url.com', 'type': 'iframe'});
    cookie.syncCookies();
    expect(insertCookieSyncIframeStub.getCall(0).args[0]).to.exist.and.to.equal('http://url.com');
  });

  it('clears queue after sync', () => {
    cookie.syncCookies();
    expect(insertCookieSyncIframeStub.callCount).to.equal(0);
    expect(insertPixelStub.callCount).to.equal(0);
  });
});
