import { expect } from 'chai';
import { dep, politeTriggerPixel, sendBeacon } from '../../src/ajax.js'
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

  beforeEach(() => {
    triggerPixelStub = sinon.stub(utils, 'triggerPixel');
    originalScheduler = window.scheduler;
    window.scheduler = undefined;
  });

  afterEach(() => {
    triggerPixelStub.restore();
    window.scheduler = originalScheduler;
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
