import { expect } from 'chai';
import { dep, politeInsertUserSyncIframe, politeTriggerPixel, sendBeacon } from '../../src/ajax.js'
import * as utils from '../../src/utils.js';

describe('test sendBeacon wrapper', () => {
  it('with legitimate behaviour', () => {
    sinon.stub(navigator, 'sendBeacon').returns(true);
    expect(sendBeacon('http://localhost:80/')).to.equal(true);
    expect(navigator.sendBeacon.callCount).to.equal(1);
    navigator.sendBeacon.restore();
  })
})

describe('politeTriggerPixel', () => {
  let triggerPixelStub;
  let originalScheduler;
  let originalRequestIdleCallback;

  beforeEach(() => {
    triggerPixelStub = sinon.stub(utils, 'triggerPixel');
    originalScheduler = window.scheduler;
    originalRequestIdleCallback = window.requestIdleCallback;
    window.scheduler = undefined;
    window.requestIdleCallback = undefined;
  });

  afterEach(() => {
    triggerPixelStub.restore();
    window.scheduler = originalScheduler;
    window.requestIdleCallback = originalRequestIdleCallback;
  });

  it('uses keepalive fetch when request creation works', () => {
    dep.makeRequest.resetHistory();
    dep.fetch.resetHistory();

    politeTriggerPixel('http://example.com/pixel');

    expect(dep.makeRequest.calledOnce).to.equal(true);
    expect(dep.makeRequest.getCall(0).args[1]).to.include({
      method: 'GET',
      mode: 'no-cors',
      credentials: 'include',
      keepalive: true
    });
    expect(dep.fetch.calledOnce).to.equal(true);
    expect(triggerPixelStub.called).to.equal(false);
  });

  it('uses background priority when Scheduler API is available', () => {
    window.scheduler = {
      postTask: sinon.stub().callsFake((task) => {
        task();
        return Promise.resolve();
      })
    };
    dep.makeRequest.resetHistory();
    dep.fetch.resetHistory();

    politeTriggerPixel('http://example.com/pixel');

    expect(window.scheduler.postTask.calledOnce).to.equal(true);
    expect(window.scheduler.postTask.getCall(0).args[1]).to.deep.equal({ priority: 'background' });
    expect(dep.fetch.calledOnce).to.equal(true);
    expect(triggerPixelStub.called).to.equal(false);
  });

  it('falls back to triggerPixel when Request is unavailable', () => {
    const originalRequest = window.Request;
    window.Request = undefined;

    politeTriggerPixel('http://example.com/pixel');

    expect(triggerPixelStub.calledOnce).to.equal(true);
    window.Request = originalRequest;
  });
});

describe('politeInsertUserSyncIframe', () => {
  let insertUserSyncIframeStub;
  let originalScheduler;
  let originalRequestIdleCallback;

  beforeEach(() => {
    insertUserSyncIframeStub = sinon.stub(utils, 'insertUserSyncIframe');
    originalScheduler = window.scheduler;
    originalRequestIdleCallback = window.requestIdleCallback;
    window.scheduler = undefined;
    window.requestIdleCallback = undefined;
  });

  afterEach(() => {
    insertUserSyncIframeStub.restore();
    window.scheduler = originalScheduler;
    window.requestIdleCallback = originalRequestIdleCallback;
  });

  it('inserts iframe directly without scheduler or requestIdleCallback', () => {
    politeInsertUserSyncIframe('http://example.com/iframe');
    expect(insertUserSyncIframeStub.calledOnce).to.equal(true);
    expect(insertUserSyncIframeStub.getCall(0).args[0]).to.equal('http://example.com/iframe');
  });

  it('uses requestIdleCallback when scheduler is unavailable', () => {
    window.requestIdleCallback = sinon.stub().callsFake((task) => task());

    politeInsertUserSyncIframe('http://example.com/iframe');

    expect(window.requestIdleCallback.calledOnce).to.equal(true);
    expect(insertUserSyncIframeStub.calledOnce).to.equal(true);
  });

  it('uses background priority when Scheduler API is available', () => {
    window.scheduler = {
      postTask: sinon.stub().callsFake((task) => {
        task();
        return Promise.resolve();
      })
    };

    politeInsertUserSyncIframe('http://example.com/iframe');

    expect(window.scheduler.postTask.calledOnce).to.equal(true);
    expect(window.scheduler.postTask.getCall(0).args[1]).to.deep.equal({ priority: 'background' });
    expect(insertUserSyncIframeStub.calledOnce).to.equal(true);
  });
});
